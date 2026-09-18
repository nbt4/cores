-- WarehouseCore installs the complete product-master-v2 schema idempotently
-- during startup so upgraded and clean umbrella deployments follow the same
-- path. The base relation belongs in the umbrella migration too so every clean
-- database already satisfies WarehouseCore's startup contract.
CREATE TABLE IF NOT EXISTS product_dependencies (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(productid) ON DELETE CASCADE,
    dependency_product_id INTEGER NOT NULL REFERENCES products(productid) ON DELETE CASCADE,
    is_optional BOOLEAN DEFAULT TRUE,
    default_quantity NUMERIC(10,2) DEFAULT 1.0,
    notes VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_dependency UNIQUE (product_id, dependency_product_id)
);
CREATE INDEX IF NOT EXISTS idx_product_dependencies_product_id ON product_dependencies(product_id);
CREATE INDEX IF NOT EXISTS idx_product_dependencies_dep_product_id ON product_dependencies(dependency_product_id);

CREATE TABLE IF NOT EXISTS warehouse_schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO warehouse_schema_migrations(version)
VALUES ('043_product_master_v2')
ON CONFLICT(version) DO NOTHING;
