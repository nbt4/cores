-- Link Procurement goods receipts to the Warehouse inventory mutation that
-- was applied in the same database transaction.
ALTER TABLE proc_receipts ADD COLUMN IF NOT EXISTS warehouse_product_id BIGINT;
ALTER TABLE proc_receipts ADD COLUMN IF NOT EXISTS warehouse_tracking_mode VARCHAR(20);
ALTER TABLE proc_receipts ADD COLUMN IF NOT EXISTS warehouse_quantity_applied DOUBLE PRECISION NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_proc_receipts_warehouse_product_id ON proc_receipts(warehouse_product_id);
