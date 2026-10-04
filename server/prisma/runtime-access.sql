-- Run as the migration owner after selecting the intended application database/schema.
-- This grants a NOLOGIN permission group, never creates or prints a password.
-- Keep DIRECT_URL on the migration owner; attach this group to a separate runtime login.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='sanad_app_access') THEN
    CREATE ROLE sanad_app_access NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
DO $$ DECLARE target text; BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO sanad_app_access', current_database());
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO sanad_app_access', current_schema());
  FOR target IN SELECT tablename FROM pg_tables WHERE schemaname=current_schema() AND tablename<>'_prisma_migrations' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO sanad_app_access',current_schema(),target);
  END LOOP;
  -- New model tables need the same DML permissions after each deployment.
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sanad_app_access',current_schema());
END $$;
-- In Neon: create a separate role, ensure NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOBYPASSRLS,
-- grant sanad_app_access to that role, and use its verified-TLS URL as Render DATABASE_URL.
-- Verify it cannot CREATE TABLE or read _prisma_migrations before switching production.
