-- WarehouseCore installs the complete product-master-v2 schema idempotently
-- during startup so upgraded and clean umbrella deployments follow the same
-- path. This marker records the cross-service schema level in the root stack.
CREATE TABLE IF NOT EXISTS warehouse_schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO warehouse_schema_migrations(version)
VALUES ('043_product_master_v2')
ON CONFLICT(version) DO NOTHING;
