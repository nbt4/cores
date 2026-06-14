-- 010_branding_config.sql
-- Centralized branding configuration for all cores services.
-- Single-row singleton table. Read by all services via shared PostgreSQL.
-- Written by cores-dashboard admin UI (BrandingTab).
--
-- Each service has its own built-in logo fallback; this table only stores
-- CUSTOM overrides. When a logo_path column is NULL, the service uses its
-- compiled-in default logo.

CREATE TABLE IF NOT EXISTS branding_config (
    id              SERIAL PRIMARY KEY,

    -- Company identity
    company_name    VARCHAR(255) NOT NULL DEFAULT '',
    brand_name      VARCHAR(255) NOT NULL DEFAULT '',

    -- Logo overrides per service + position
    -- NULL = use built-in default logo
    logo_cores_sidebar      VARCHAR(512) DEFAULT NULL,
    logo_cores_login        VARCHAR(512) DEFAULT NULL,
    logo_rental_sidebar     VARCHAR(512) DEFAULT NULL,
    logo_rental_login       VARCHAR(512) DEFAULT NULL,
    logo_warehouse_sidebar  VARCHAR(512) DEFAULT NULL,
    logo_warehouse_login    VARCHAR(512) DEFAULT NULL,
    logo_planner_sidebar    VARCHAR(512) DEFAULT NULL,
    logo_planner_login      VARCHAR(512) DEFAULT NULL,

    -- Global favicon (browser tab icon)
    favicon_path            VARCHAR(512) DEFAULT NULL,

    -- Logo size as percentage (50 = half size, 200 = double size)
    logo_size_sidebar       SMALLINT NOT NULL DEFAULT 100
                             CHECK (logo_size_sidebar BETWEEN 50 AND 200),
    logo_size_login         SMALLINT NOT NULL DEFAULT 100
                             CHECK (logo_size_login BETWEEN 50 AND 200),

    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed the singleton row. All columns default to NULL/empty,
-- so services fall back to their built-in logos and hardcoded names
-- until the admin configures branding via the dashboard.
INSERT INTO branding_config (id, company_name, brand_name)
VALUES (1, '', '')
ON CONFLICT (id) DO NOTHING;
