-- One-time setup of a PG database, run as the postgres superuser:
--
--   sudo -u postgres psql -v ON_ERROR_STOP=1 -p 49154 -d postgres -v db=project-gamer < database/scripts/bootstrap.sql
--
-- (db=project-gamer-dev for dev.) PG uses PE's users, which already exist on the
-- installation: awesome_vd_user (rollout), bot_user (bot) and analytics_user.
--
-- - postgres owns the database, so no other role can drop it.
-- - awesome_vd_user gets CREATE on the database only. It creates each schema
--   (migrate / fresh-install) and so owns it.
-- - bot_user and analytics_user get nothing here: their grants live in each
--   table's schema file.

CREATE DATABASE :"db" OWNER postgres ENCODING 'UTF8';

GRANT CREATE ON DATABASE :"db" TO awesome_vd_user;

\c :"db"

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit;
