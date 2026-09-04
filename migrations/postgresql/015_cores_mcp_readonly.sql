-- Least-privilege group for Cores MCP. The deployment creates a separate
-- LOGIN role and grants this group to it because passwords never belong in Git.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cores_mcp_readonly') THEN
        CREATE ROLE cores_mcp_readonly NOLOGIN;
    END IF;
END $$;

DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO cores_mcp_readonly', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO cores_mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cores_mcp_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO cores_mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO cores_mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO cores_mcp_readonly;
