-- A executer APRES avoir deploye la fonction Edge `send-reminders`
-- (voir README.md). Remplace <PROJECT_REF> et <ANON_KEY> par les tiennes.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'fiado-relances-quotidiennes',
  '0 7 * * *', -- 07h00 UTC chaque jour — ajuste selon le fuseau vise
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <ANON_KEY>')
  );
  $$
);
