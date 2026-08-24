-- Semantic branding assets.
--
-- Keys in assets_json are service ids (cores, rental, warehouse, planner,
-- procurement) plus the reserved "company" key. Each value is an object with
-- context-oriented fields such as markOnDark, horizontalOnLight, appIcon and
-- print. Legacy sidebar/login/favicon columns remain available as fallbacks.
ALTER TABLE branding_config
    ADD COLUMN IF NOT EXISTS assets_json JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN branding_config.assets_json IS
    'Semantic logo assets grouped by service id; company holds corporate document branding';
