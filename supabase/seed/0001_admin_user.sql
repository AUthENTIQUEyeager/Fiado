-- FIADO — cree un utilisateur directement dans auth.users, deja confirme
-- (aucune verification par email/SMS necessaire, contrairement a un
-- signup normal). A executer dans l'editeur SQL Supabase.
--
-- Utile pour provisionner ton propre compte (ex. acces admin, ou pour
-- pouvoir referencer cet auth_user_id depuis un merchant cree a la
-- main) sans passer par le parcours d'inscription de l'app.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'e93be135-0266-4714-b3ce-22b5bd1501c9',
  'authenticated',
  'authenticated',
  'emma@gmail.com',
  crypt('CHANGE_MOI_ENSUITE', gen_salt('bf')), -- mot de passe temporaire, a changer si tu comptes t'en servir
  now(),                                         -- confirme immediatement, pas d'email/SMS envoye
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

-- Necessaire pour que Supabase Auth reconnaisse completement l'identite
-- (evite des comportements etranges si tu utilises un jour la connexion
-- par email de Supabase pour ce compte, en plus du flux WhatsApp de l'app).
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  gen_random_uuid(),
  'e93be135-0266-4714-b3ce-22b5bd1501c9',
  'e93be135-0266-4714-b3ce-22b5bd1501c9',
  jsonb_build_object('sub', 'e93be135-0266-4714-b3ce-22b5bd1501c9', 'email', 'emma@gmail.com'),
  'email',
  now(),
  now(),
  now()
);

-- Verification :
select id, email, email_confirmed_at from auth.users where id = 'e93be135-0266-4714-b3ce-22b5bd1501c9';
