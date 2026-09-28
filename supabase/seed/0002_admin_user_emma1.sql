-- FIADO — cree un utilisateur directement dans auth.users, deja confirme.
-- L'UID est genere automatiquement (pas besoin d'en choisir un a l'avance) ;
-- la derniere ligne te l'affiche pour que tu puisses t'en servir ensuite
-- (ex. pour creer un merchant relie a ce compte).

with new_user as (
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
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'emma1@gmail.com',
    crypt('CHANGE_MOI_ENSUITE', gen_salt('bf')), -- mot de passe temporaire, ignorable si tu ne l'utilises pas
    now(),                                         -- confirme immediatement, pas d'email envoye
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
  returning id
)
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  new_user.id,
  new_user.id::text,
  jsonb_build_object('sub', new_user.id::text, 'email', 'emma1@gmail.com'),
  'email',
  now(),
  now(),
  now()
from new_user
returning user_id as nouvel_auth_user_id;
