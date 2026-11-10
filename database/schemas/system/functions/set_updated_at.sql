-- Keeps updated_at current on every table. The application never sets it.
CREATE OR REPLACE FUNCTION "system"."set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION "system"."set_updated_at"() IS 'Trigger function: sets updated_at to now() on every UPDATE. Attached in each table''s source file.';
