-- Semantic branding assets.
--
-- Keys in assets_json are service ids (cores, rental, warehouse, planner,
-- procurement) plus the reserved "company" key. Each value is an object with
-- context-oriented fields such as markOnDark, horizontalOnLight, appIcon and
-- print. Legacy sidebar/login/favicon columns remain available as fallbacks.
ALTER TABLE branding_config
    ADD COLUMN IF NOT EXISTS assets_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- AutoMigrate may have created the column before this migration ran. Normalize
-- that valid intermediate state as well, so existing installations receive the
-- same invariant as clean databases.
UPDATE branding_config
SET assets_json = '{}'::jsonb
WHERE assets_json IS NULL;

ALTER TABLE branding_config
    ALTER COLUMN assets_json SET DEFAULT '{}'::jsonb,
    ALTER COLUMN assets_json SET NOT NULL;

COMMENT ON COLUMN branding_config.assets_json IS
    'Semantic logo assets grouped by service id; company holds corporate document branding';
