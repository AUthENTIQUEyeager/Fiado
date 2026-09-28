-- FIADO — ajoute l'email marchand.
-- Remplace l'ancienne verification par code WhatsApp (send-otp/verify-otp,
-- supprimes) : la connexion verifie desormais juste que le couple
-- telephone + email correspond a une ligne existante dans `merchants`
-- (voir supabase/functions/login). A executer apres 0001_init.sql.

alter table merchants add column if not exists email text;

-- Unique uniquement quand renseigne, pour ne pas casser d'eventuelles
-- lignes existantes creees avant cette migration (email null).
create unique index if not exists merchants_email_key on merchants (email) where email is not null;

-- Plus aucune fonction Edge n'ecrit ni ne lit cette table (elle servait
-- au code de confirmation WhatsApp de l'ancien flux).
drop table if exists otp_codes;
