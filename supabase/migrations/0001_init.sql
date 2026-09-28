-- FIADO — migration initiale
-- A executer dans l'editeur SQL Supabase, ou via `supabase db push`.

create extension if not exists pgcrypto;

create table markets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null
);

create table merchants (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) not null,
  business_name text not null,
  phone text not null unique,
  filiere text default 'tissu',
  market_id uuid references markets(id),
  plan text default 'free',
  onboarding_survey jsonb,
  created_at timestamptz default now()
);

create table debtors (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  full_name text,
  created_at timestamptz default now()
);

create table credit_sales (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) not null,
  debtor_id uuid references debtors(id) not null,
  amount numeric not null check (amount > 0),
  due_date date not null,
  status text default 'pending' check (status in ('pending','partial','paid','overdue','disputed')),
  local_uuid uuid unique,
  created_at timestamptz default now(),
  synced_at timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  credit_sale_id uuid references credit_sales(id) not null,
  amount numeric not null check (amount > 0),
  method text check (method in ('especes','orange_money','wave','moov_money')),
  paid_at timestamptz default now(),
  local_uuid uuid unique
);

create table reminders_log (
  id uuid primary key default gen_random_uuid(),
  credit_sale_id uuid references credit_sales(id) not null,
  channel text check (channel in ('whatsapp','sms')),
  template text,
  status text,
  sent_at timestamptz default now()
);

create table risk_reports (
  id uuid primary key default gen_random_uuid(),
  debtor_id uuid references debtors(id) not null,
  reported_by uuid references merchants(id) not null,
  market_id uuid references markets(id) not null,
  credit_sale_id uuid references credit_sales(id),
  reason text,
  debtor_response text,
  status text default 'open' check (status in ('open','contested','resolved','confirmed')),
  created_at timestamptz default now()
);

create table otp_codes (
  phone text primary key,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Index utiles pour le cron des relances et la recherche de fiabilite
create index on credit_sales (due_date) where status not in ('paid');
create index on risk_reports (debtor_id, status);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table merchants enable row level security;
create policy "own_merchant_row" on merchants
  for all using (auth_user_id = auth.uid());

alter table credit_sales enable row level security;
create policy "own_sales" on credit_sales
  for all using (merchant_id in (select id from merchants where auth_user_id = auth.uid()));

alter table payments enable row level security;
create policy "own_payments" on payments
  for all using (
    credit_sale_id in (
      select cs.id from credit_sales cs
      join merchants m on m.id = cs.merchant_id
      where m.auth_user_id = auth.uid()
    )
  );

alter table risk_reports enable row level security;
-- Insertion seulement : la LECTURE ne passe jamais par une policy select
-- large. Elle passe uniquement par la fonction get_reliability() ci-dessous,
-- qui ne renvoie qu'un score agrege — jamais le detail des transactions
-- d'un autre commercant (voir spec V1, section 4).
create policy "insert_own_reports" on risk_reports
  for insert with check (reported_by in (select id from merchants where auth_user_id = auth.uid()));

alter table debtors enable row level security;
create policy "read_debtors" on debtors for select using (true);
create policy "insert_debtors" on debtors for insert with check (true);

-- Les marches sont une reference partagee, non sensible (juste un nom de
-- marche et une ville) — lecture libre, creation reservee aux comptes
-- authentifies (via l'onboarding).
alter table markets enable row level security;
create policy "read_markets" on markets for select using (true);
create policy "insert_markets" on markets for insert to authenticated with check (true);

alter table reminders_log enable row level security;
create policy "own_reminders" on reminders_log
  for select using (
    credit_sale_id in (
      select cs.id from credit_sales cs
      join merchants m on m.id = cs.merchant_id
      where m.auth_user_id = auth.uid()
    )
  );

-- otp_codes n'est accessible qu'aux Edge Functions (service_role) — pas de RLS
-- permissive necessaire cote client, la table n'est jamais interrogee depuis le navigateur.
alter table otp_codes enable row level security;

-- ---------------------------------------------------------------------
-- Fonction : score de fiabilite agrege (voir lib/score.ts pour la logique
-- miroir cote client utilisee en mode hors-ligne/demo)
-- ---------------------------------------------------------------------

create or replace function get_reliability(p_phone text)
returns table (badge text, label text, detail text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_debtor_id uuid;
  v_confirmed_count int;
  v_open_count int;
  v_sales_count int;
  v_on_time_count int;
begin
  select id into v_debtor_id from debtors where phone = p_phone;

  if v_debtor_id is null then
    return query select 'inconnu', 'Aucune donnee', 'Nouveau numero';
    return;
  end if;

  select count(*) into v_confirmed_count from risk_reports
    where debtor_id = v_debtor_id and status = 'confirmed';

  if v_confirmed_count >= 2 then
    return query select 'risque', 'Risque', v_confirmed_count || ' signalements confirmes';
    return;
  end if;

  select count(*) into v_open_count from risk_reports
    where debtor_id = v_debtor_id and status in ('open','confirmed');

  if v_open_count >= 1 then
    return query select 'a_verifier', 'A verifier', 'Signalement isole, pas encore confirme';
    return;
  end if;

  select count(*) into v_sales_count from credit_sales where debtor_id = v_debtor_id;

  if v_sales_count = 0 then
    return query select 'inconnu', 'Aucune donnee', 'Nouveau numero';
    return;
  end if;

  select count(*) into v_on_time_count
  from credit_sales cs
  where cs.debtor_id = v_debtor_id
    and cs.status = 'paid'
    and exists (
      select 1 from payments p
      where p.credit_sale_id = cs.id
      order by p.paid_at desc limit 1
      having (max(p.paid_at)::date - cs.due_date) <= 7
    );

  if v_on_time_count::float / v_sales_count >= 0.7 then
    return query select 'fiable', 'Fiable', v_on_time_count || '/' || v_sales_count || ' creances payees a temps';
  else
    return query select 'a_verifier', 'A verifier', v_on_time_count || '/' || v_sales_count || ' creances payees a temps';
  end if;
end;
$$;

grant execute on function get_reliability(text) to authenticated;
