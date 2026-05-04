-- =============================================================================
-- RentalCore & WarehouseCore - Combined PostgreSQL Schema
-- =============================================================================
-- This script initializes a fresh database for both applications.
-- It is automatically executed on first Docker Compose startup.
-- 
-- Default Admin User: admin / admin (forced to change password on first login)
-- =============================================================================

-- =============================================================================
-- PART 1: CORE TABLES (Shared by both applications)
-- =============================================================================

-- RBAC Roles table (must be created before users for FK reference)
CREATE TABLE IF NOT EXISTS roles (
    roleid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150),
    description TEXT,
    scope VARCHAR(50) DEFAULT 'global',  -- 'global', 'rentalcore', 'warehousecore'
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (for auth) - shared between both systems
CREATE TABLE IF NOT EXISTS users (
    userid SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    force_password_change BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- User Roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    userid INT NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    roleid INT NOT NULL REFERENCES roles(roleid) ON DELETE CASCADE,
    assigned_by INT REFERENCES users(userid) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(userid, roleid)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(userid);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(roleid);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    data TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 2FA table
CREATE TABLE IF NOT EXISTS user_2fa (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(userid) ON DELETE CASCADE,
    secret VARCHAR(255),
    backup_codes TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_2fa_user ON user_2fa(user_id);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(userid) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);

-- App Settings table (for system configuration)
CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    scope VARCHAR(50) NOT NULL DEFAULT 'global',  -- 'global', 'rentalcore', 'warehousecore'
    k VARCHAR(100) NOT NULL,
    v TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scope, k)
);

-- =============================================================================
-- PART 2: RENTALCORE TABLES
-- =============================================================================

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    customerid SERIAL PRIMARY KEY,
    name VARCHAR(255),
    companyname VARCHAR(255),
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    street VARCHAR(255),
    housenumber VARCHAR(20),
    zip VARCHAR(20),
    city VARCHAR(100),
    federalstate VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Deutschland',
    phonenumber VARCHAR(50),
    email VARCHAR(255),
    customertype VARCHAR(50),
    is_customer BOOLEAN NOT NULL DEFAULT TRUE,
    is_supplier BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_companyname ON customers(companyname);
CREATE INDEX IF NOT EXISTS idx_customers_lastname ON customers(lastname);

-- Status table (for job statuses)
CREATE TABLE IF NOT EXISTS status (
    statusid SERIAL PRIMARY KEY,
    status VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007bff',
    sort_order INT DEFAULT 0
);

-- Job categories table
CREATE TABLE IF NOT EXISTS jobcategory (
    jobcategoryid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10)
);

-- Categories for products
CREATE TABLE IF NOT EXISTS categories (
    categoryid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10)
);

-- Subcategories for products
CREATE TABLE IF NOT EXISTS subcategories (
    subcategoryid VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10),
    categoryid INT REFERENCES categories(categoryid) ON DELETE SET NULL
);

-- Subbiercategories for products (third level)
CREATE TABLE IF NOT EXISTS subbiercategories (
    subbiercategoryid VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10),
    subcategoryid VARCHAR(50) REFERENCES subcategories(subcategoryid) ON DELETE SET NULL
);

-- Manufacturers table
CREATE TABLE IF NOT EXISTS manufacturer (
    manufacturerid SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255)
);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
    brandid SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manufacturerid INT REFERENCES manufacturer(manufacturerid) ON DELETE SET NULL
);

-- Count types for accessories/consumables
CREATE TABLE IF NOT EXISTS count_types (
    count_type_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    abbreviation VARCHAR(10),
    is_decimal BOOLEAN DEFAULT FALSE
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    productid SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    categoryid INT REFERENCES categories(categoryid) ON DELETE SET NULL,
    subcategoryid VARCHAR(50) REFERENCES subcategories(subcategoryid) ON DELETE SET NULL,
    subbiercategoryid VARCHAR(50) REFERENCES subbiercategories(subbiercategoryid) ON DELETE SET NULL,
    manufacturerid INT REFERENCES manufacturer(manufacturerid) ON DELETE SET NULL,
    brandid INT REFERENCES brands(brandid) ON DELETE SET NULL,
    description TEXT,
    maintenanceinterval INT,
    itemcostperday DECIMAL(10,2) DEFAULT 0.00,
    weight DECIMAL(10,3),
    height DECIMAL(10,3),
    width DECIMAL(10,3),
    depth DECIMAL(10,3),
    powerconsumption DECIMAL(10,2),
    pos_in_category INT,
    is_accessory BOOLEAN DEFAULT FALSE,
    is_consumable BOOLEAN DEFAULT FALSE,
    count_type_id INT REFERENCES count_types(count_type_id) ON DELETE SET NULL,
    stock_quantity DECIMAL(10,3),
    min_stock_level DECIMAL(10,3),
    generic_barcode VARCHAR(100),
    price_per_unit DECIMAL(10,2),
    website_visible BOOLEAN DEFAULT FALSE,
    website_thumbnail VARCHAR(512),
    website_images_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoryid);
CREATE INDEX IF NOT EXISTS idx_products_is_accessory ON products(is_accessory);
CREATE INDEX IF NOT EXISTS idx_products_is_consumable ON products(is_consumable);
CREATE INDEX IF NOT EXISTS idx_products_generic_barcode ON products(generic_barcode);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    deviceid VARCHAR(50) PRIMARY KEY,
    productid INT REFERENCES products(productid) ON DELETE SET NULL,
    serialnumber VARCHAR(255),
    purchasedate DATE,
    lastmaintenance DATE,
    nextmaintenance DATE,
    insurancenumber VARCHAR(100),
    status VARCHAR(50) DEFAULT 'free',
    insuranceid INT,
    qr_code VARCHAR(255),
    current_location VARCHAR(255),
    gps_latitude DECIMAL(10,7),
    gps_longitude DECIMAL(10,7),
    condition_rating DECIMAL(3,1) DEFAULT 5.0,
    usage_hours DECIMAL(10,2) DEFAULT 0.00,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    last_maintenance_cost DECIMAL(10,2),
    notes TEXT,
    barcode VARCHAR(255),
    zone_id INT,
    current_case_id INT,
    label_path VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_devices_productid ON devices(productid);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_barcode ON devices(barcode);
CREATE INDEX IF NOT EXISTS idx_devices_serialnumber ON devices(serialnumber);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    jobid SERIAL PRIMARY KEY,
    job_code VARCHAR(50),
    customerid INT NOT NULL REFERENCES customers(customerid) ON DELETE CASCADE,
    statusid INT NOT NULL REFERENCES status(statusid) ON DELETE RESTRICT,
    jobcategoryid INT REFERENCES jobcategory(jobcategoryid) ON DELETE SET NULL,
    description TEXT,
    discount DECIMAL(10,2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'amount',
    revenue DECIMAL(12,2) DEFAULT 0.00,
    final_revenue DECIMAL(12,2),
    startdate DATE,
    enddate DATE,
    created_by INT REFERENCES users(userid) ON DELETE SET NULL,
    updated_by INT REFERENCES users(userid) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_customerid ON jobs(customerid);
CREATE INDEX IF NOT EXISTS idx_jobs_statusid ON jobs(statusid);
CREATE INDEX IF NOT EXISTS idx_jobs_dates ON jobs(startdate, enddate);
CREATE INDEX IF NOT EXISTS idx_jobs_job_code ON jobs(job_code);
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs(deleted_at);

-- Job-Device relationship table
CREATE TABLE IF NOT EXISTS job_devices (
    jobid INT NOT NULL REFERENCES jobs(jobid) ON DELETE CASCADE,
    deviceid VARCHAR(50) NOT NULL REFERENCES devices(deviceid) ON DELETE CASCADE,
    custom_price DECIMAL(10,2),
    package_id INT,
    is_package_item BOOLEAN DEFAULT FALSE,
    pack_status VARCHAR(20) DEFAULT 'pending',
    pack_ts TIMESTAMP,
    PRIMARY KEY (jobid, deviceid)
);
CREATE INDEX IF NOT EXISTS idx_job_devices_jobid ON job_devices(jobid);
CREATE INDEX IF NOT EXISTS idx_job_devices_deviceid ON job_devices(deviceid);
CREATE INDEX IF NOT EXISTS idx_job_devices_pack_status ON job_devices(pack_status);

-- Cases table (for equipment cases)
CREATE TABLE IF NOT EXISTS cases (
    caseid SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    weight DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    depth DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'free',
    barcode VARCHAR(255),
    zone_id INT,
    label_path VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_barcode ON cases(barcode);

-- Devices in Cases junction table
CREATE TABLE IF NOT EXISTS devicescases (
    caseid INT NOT NULL REFERENCES cases(caseid) ON DELETE CASCADE,
    deviceid VARCHAR(50) NOT NULL REFERENCES devices(deviceid) ON DELETE CASCADE,
    PRIMARY KEY (caseid, deviceid)
);

-- Cable connectors
CREATE TABLE IF NOT EXISTS cable_connectors (
    cable_connectorsid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(20),
    gender VARCHAR(10)
);

-- Cable types
CREATE TABLE IF NOT EXISTS cable_types (
    cable_typesid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Cables table
CREATE TABLE IF NOT EXISTS cables (
    cableid SERIAL PRIMARY KEY,
    connector1 INT NOT NULL REFERENCES cable_connectors(cable_connectorsid) ON DELETE RESTRICT,
    connector2 INT NOT NULL REFERENCES cable_connectors(cable_connectorsid) ON DELETE RESTRICT,
    typ INT NOT NULL REFERENCES cable_types(cable_typesid) ON DELETE RESTRICT,
    length DECIMAL(10,2) NOT NULL,
    mm2 DECIMAL(10,2),
    name VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_cables_connector1 ON cables(connector1);
CREATE INDEX IF NOT EXISTS idx_cables_connector2 ON cables(connector2);
CREATE INDEX IF NOT EXISTS idx_cables_type ON cables(typ);

-- Company settings table
CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Deutschland',
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    tax_id VARCHAR(100),
    vat_id VARCHAR(100),
    logo_path VARCHAR(512),
    terms_and_conditions TEXT,
    invoice_prefix VARCHAR(50) DEFAULT 'INV',
    invoice_footer TEXT,
    default_tax_rate DECIMAL(5,2) DEFAULT 19.00,
    currency VARCHAR(10) DEFAULT 'EUR',
    bank_name VARCHAR(255),
    bank_iban VARCHAR(50),
    bank_bic VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(userid) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'de',
    theme VARCHAR(20) DEFAULT 'dark',
    time_zone VARCHAR(50) DEFAULT 'Europe/Berlin',
    date_format VARCHAR(20) DEFAULT 'DD.MM.YYYY',
    time_format VARCHAR(10) DEFAULT '24h',
    email_notifications BOOLEAN DEFAULT TRUE,
    system_notifications BOOLEAN DEFAULT TRUE,
    job_status_notifications BOOLEAN DEFAULT TRUE,
    device_alert_notifications BOOLEAN DEFAULT TRUE,
    items_per_page INT DEFAULT 25,
    default_view VARCHAR(20) DEFAULT 'list',
    show_advanced_options BOOLEAN DEFAULT FALSE,
    auto_save_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(userid) ON DELETE CASCADE,
    display_name VARCHAR(150),
    avatar_url VARCHAR(512),
    prefs JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);

-- User Dashboard Widgets table
CREATE TABLE IF NOT EXISTS user_dashboard_widgets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(userid) ON DELETE CASCADE,
    widgets JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_widgets_user ON user_dashboard_widgets(user_id);

-- =============================================================================
-- PART 3: WAREHOUSECORE TABLES
-- =============================================================================

-- Storage zone types (simulating ENUM)
DO $$ BEGIN
    CREATE TYPE zone_type AS ENUM ('shelf', 'rack', 'case', 'vehicle', 'stage', 'warehouse', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Storage Zones table
CREATE TABLE IF NOT EXISTS storage_zones (
    zone_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type zone_type NOT NULL DEFAULT 'other',
    description TEXT,
    parent_zone_id INT NULL REFERENCES storage_zones(zone_id) ON DELETE SET NULL,
    capacity INT NULL,
    location VARCHAR(255) NULL,
    barcode VARCHAR(255),
    metadata JSONB NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    label_url VARCHAR(512),
    led_strip_id INT,
    led_start INT,
    led_end INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_zone_type ON storage_zones(type);
CREATE INDEX IF NOT EXISTS idx_zone_active ON storage_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_zone_parent ON storage_zones(parent_zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_barcode ON storage_zones(barcode);

-- Add zone reference to devices and cases
ALTER TABLE cases ADD COLUMN IF NOT EXISTS zone_id INT REFERENCES storage_zones(zone_id) ON DELETE SET NULL;

-- Device movements table
CREATE TABLE IF NOT EXISTS device_movements (
    movement_id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(deviceid) ON DELETE CASCADE,
    from_zone_id INT NULL REFERENCES storage_zones(zone_id) ON DELETE SET NULL,
    to_zone_id INT NULL REFERENCES storage_zones(zone_id) ON DELETE SET NULL,
    from_case_id INT NULL REFERENCES cases(caseid) ON DELETE SET NULL,
    to_case_id INT NULL REFERENCES cases(caseid) ON DELETE SET NULL,
    from_job_id INT NULL REFERENCES jobs(jobid) ON DELETE SET NULL,
    to_job_id INT NULL REFERENCES jobs(jobid) ON DELETE SET NULL,
    moved_by INT NULL REFERENCES users(userid) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL DEFAULT 'transfer',
    reason TEXT,
    metadata JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_movement_device ON device_movements(device_id);
CREATE INDEX IF NOT EXISTS idx_movement_from_zone ON device_movements(from_zone_id);
CREATE INDEX IF NOT EXISTS idx_movement_to_zone ON device_movements(to_zone_id);
CREATE INDEX IF NOT EXISTS idx_movement_type ON device_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movement_created ON device_movements(created_at);

-- Scan events table
CREATE TABLE IF NOT EXISTS scan_events (
    scan_id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NULL REFERENCES devices(deviceid) ON DELETE SET NULL,
    zone_id INT NULL REFERENCES storage_zones(zone_id) ON DELETE SET NULL,
    case_id INT NULL REFERENCES cases(caseid) ON DELETE SET NULL,
    scanner_id VARCHAR(100),
    scanned_by INT NULL REFERENCES users(userid) ON DELETE SET NULL,
    scan_type VARCHAR(50) NOT NULL DEFAULT 'identify',
    barcode_value VARCHAR(255) NOT NULL,
    scan_result VARCHAR(50) NOT NULL DEFAULT 'success',
    metadata JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scan_device ON scan_events(device_id);
CREATE INDEX IF NOT EXISTS idx_scan_zone ON scan_events(zone_id);
CREATE INDEX IF NOT EXISTS idx_scan_type ON scan_events(scan_type);
CREATE INDEX IF NOT EXISTS idx_scan_created ON scan_events(created_at);
CREATE INDEX IF NOT EXISTS idx_scan_barcode ON scan_events(barcode_value);

-- Defect reports table
CREATE TABLE IF NOT EXISTS defect_reports (
    defect_id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(deviceid) ON DELETE CASCADE,
    reported_by INT NULL REFERENCES users(userid) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'minor',
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    description TEXT NOT NULL,
    resolution TEXT,
    resolved_by INT NULL REFERENCES users(userid) ON DELETE SET NULL,
    resolved_at TIMESTAMP NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_defect_device ON defect_reports(device_id);
CREATE INDEX IF NOT EXISTS idx_defect_status ON defect_reports(status);
CREATE INDEX IF NOT EXISTS idx_defect_severity ON defect_reports(severity);
CREATE INDEX IF NOT EXISTS idx_defect_created ON defect_reports(created_at);

-- Zone type definitions (LED defaults, labels)
CREATE TABLE IF NOT EXISTS zone_types (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    default_led_pattern VARCHAR(20) DEFAULT 'solid',
    default_led_color VARCHAR(20) DEFAULT '#ffffff',
    default_intensity SMALLINT DEFAULT 128,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LED Controllers table
CREATE TABLE IF NOT EXISTS led_controllers (
    id SERIAL PRIMARY KEY,
    controller_id VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    topic_suffix VARCHAR(100),
    zone_types TEXT[],
    status_data JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_led_controller_id ON led_controllers(controller_id);
CREATE INDEX IF NOT EXISTS idx_led_active ON led_controllers(is_active);

-- LED controller ↔ zone type many-to-many
CREATE TABLE IF NOT EXISTS led_controller_zone_types (
    controller_id INTEGER NOT NULL REFERENCES led_controllers(id) ON DELETE CASCADE,
    zone_type_id INTEGER NOT NULL REFERENCES zone_types(id) ON DELETE CASCADE,
    PRIMARY KEY (controller_id, zone_type_id)
);

-- Label templates table
CREATE TABLE IF NOT EXISTS label_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    width DECIMAL(10,2) NOT NULL DEFAULT 62,
    height DECIMAL(10,2) NOT NULL DEFAULT 29,
    template_json TEXT NOT NULL DEFAULT '[]',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product packages table (for rental bundles)
CREATE TABLE IF NOT EXISTS product_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    price DECIMAL(10,2) DEFAULT 0.00,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    website_visible BOOLEAN DEFAULT FALSE,
    website_description TEXT,
    website_image_url VARCHAR(512),
    website_sort_order INT DEFAULT 0,
    alias_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_package_code ON product_packages(code);
CREATE INDEX IF NOT EXISTS idx_package_category ON product_packages(category);
CREATE INDEX IF NOT EXISTS idx_package_active ON product_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_package_website ON product_packages(website_visible);

-- Product package items junction table
CREATE TABLE IF NOT EXISTS product_package_items (
    id SERIAL PRIMARY KEY,
    package_id INT NOT NULL REFERENCES product_packages(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(productid) ON DELETE CASCADE,
    quantity INT DEFAULT 1,
    is_optional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pkg_item_package ON product_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_pkg_item_product ON product_package_items(product_id);

-- Rental equipment (external rentals from suppliers)
CREATE TABLE IF NOT EXISTS rental_equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    supplier VARCHAR(255),
    supplier_id  INT REFERENCES customers(customerid) ON DELETE SET NULL,
    category VARCHAR(100),
    description TEXT,
    rental_price DECIMAL(10,2) DEFAULT 0.00,
    customer_price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rental_equipment_supplier ON rental_equipment(supplier);
CREATE INDEX IF NOT EXISTS idx_rental_equipment_active ON rental_equipment(is_active);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    user_id INT REFERENCES users(userid) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_key_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_key_user ON api_keys(user_id);

-- Service items (non-physical cost positions: Fahrtkosten, Personal, etc.)
CREATE TABLE IF NOT EXISTS service_items (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    default_price   DECIMAL(12,2) DEFAULT 0,
    category        VARCHAR(100),
    unit            VARCHAR(50) DEFAULT 'pauschal',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- PART 3b: PDF TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS pdf_uploads (
    upload_id               BIGSERIAL PRIMARY KEY,
    job_id                  BIGINT REFERENCES jobs(jobid) ON DELETE SET NULL,
    document_id             BIGINT DEFAULT NULL,
    original_filename       VARCHAR(500) NOT NULL DEFAULT '',
    stored_filename         VARCHAR(500) NOT NULL DEFAULT '',
    file_path               VARCHAR(1000),
    file_size               BIGINT,
    mime_type               VARCHAR(100),
    file_hash               VARCHAR(64) DEFAULT NULL,
    uploaded_by             BIGINT REFERENCES users(userid) ON DELETE SET NULL,
    uploaded_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status       VARCHAR(50) DEFAULT 'pending',
    processing_started_at   TIMESTAMP DEFAULT NULL,
    processing_completed_at TIMESTAMP DEFAULT NULL,
    error_message           TEXT DEFAULT NULL,
    is_active               BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_job    ON pdf_uploads(job_id);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_status ON pdf_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_hash   ON pdf_uploads(file_hash);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user   ON pdf_uploads(uploaded_by);

CREATE TABLE IF NOT EXISTS pdf_extractions (
    extraction_id     BIGSERIAL PRIMARY KEY,
    upload_id         BIGINT NOT NULL REFERENCES pdf_uploads(upload_id) ON DELETE CASCADE,
    raw_text          TEXT,
    extracted_data    JSONB,
    confidence_score  DECIMAL(5,2),
    page_count        INT DEFAULT 1,
    extraction_method VARCHAR(50) DEFAULT 'python_parser',
    extracted_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_name     VARCHAR(255),
    customer_id       BIGINT REFERENCES customers(customerid) ON DELETE SET NULL,
    document_date     DATE,
    document_number   VARCHAR(100),
    parsed_total      DECIMAL(12,2),
    discount_amount   DECIMAL(12,2),
    discount_percent  DECIMAL(5,2),
    total_amount      DECIMAL(12,2),
    metadata          JSONB
);
CREATE UNIQUE INDEX IF NOT EXISTS unique_upload_extraction ON pdf_extractions(upload_id);

CREATE TABLE IF NOT EXISTS pdf_extraction_items (
    item_id             BIGSERIAL PRIMARY KEY,
    extraction_id       BIGINT NOT NULL REFERENCES pdf_extractions(extraction_id) ON DELETE CASCADE,
    line_number         INT,
    raw_product_text    TEXT,
    quantity            DECIMAL(10,3) DEFAULT 1,
    unit_price          DECIMAL(12,2) DEFAULT 0,
    line_total          DECIMAL(12,2) DEFAULT 0,
    mapped_product_id   BIGINT REFERENCES products(productid) ON DELETE SET NULL,
    mapped_package_id   BIGINT REFERENCES product_packages(package_id) ON DELETE SET NULL,
    mapped_rental_equipment_id BIGINT REFERENCES rental_equipment(id) ON DELETE SET NULL,
    mapped_service_item_id BIGINT REFERENCES service_items(id) ON DELETE SET NULL,
    mapping_confidence  DECIMAL(5,2) DEFAULT 0,
    mapping_status      VARCHAR(50) DEFAULT 'pending',
    user_notes          TEXT
);
CREATE INDEX IF NOT EXISTS idx_pdf_items_extraction ON pdf_extraction_items(extraction_id);
CREATE INDEX IF NOT EXISTS idx_pdf_items_product    ON pdf_extraction_items(mapped_product_id);
CREATE INDEX IF NOT EXISTS idx_pdf_items_package    ON pdf_extraction_items(mapped_package_id);
CREATE INDEX IF NOT EXISTS idx_pdf_items_status     ON pdf_extraction_items(mapping_status);

CREATE TABLE IF NOT EXISTS pdf_product_mappings (
    mapping_id      BIGSERIAL PRIMARY KEY,
    pdf_product_text TEXT NOT NULL UNIQUE,
    normalized_text  TEXT,
    product_id       BIGINT REFERENCES products(productid) ON DELETE CASCADE,
    mapping_type     VARCHAR(20) DEFAULT 'fuzzy',
    confidence_score DECIMAL(5,2) DEFAULT 0,
    usage_count      INT DEFAULT 0,
    last_used_at     TIMESTAMP,
    created_by       BIGINT REFERENCES users(userid) ON DELETE SET NULL,
    is_active        BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_pdf_prod_map_text    ON pdf_product_mappings(normalized_text);
CREATE INDEX IF NOT EXISTS idx_pdf_prod_map_product ON pdf_product_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_pdf_prod_map_type    ON pdf_product_mappings(mapping_type);

CREATE TABLE IF NOT EXISTS pdf_package_mappings (
    mapping_id       BIGSERIAL PRIMARY KEY,
    pdf_package_text TEXT NOT NULL UNIQUE,
    normalized_text  TEXT,
    package_id       BIGINT REFERENCES product_packages(package_id) ON DELETE CASCADE,
    mapping_type     VARCHAR(20) DEFAULT 'fuzzy',
    confidence_score DECIMAL(5,2) DEFAULT 0,
    usage_count      INT DEFAULT 0,
    last_used_at     TIMESTAMP,
    created_by       BIGINT REFERENCES users(userid) ON DELETE SET NULL,
    is_active        BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_pdf_pkg_map_text    ON pdf_package_mappings(normalized_text);
CREATE INDEX IF NOT EXISTS idx_pdf_pkg_map_package ON pdf_package_mappings(package_id);

CREATE TABLE IF NOT EXISTS pdf_rental_mappings (
    mapping_id            BIGSERIAL PRIMARY KEY,
    pdf_rental_text       TEXT NOT NULL UNIQUE,
    normalized_text       TEXT,
    rental_equipment_id   BIGINT REFERENCES rental_equipment(id) ON DELETE CASCADE,
    mapping_type          VARCHAR(20) DEFAULT 'manual',
    confidence_score      DECIMAL(5,2) DEFAULT 100,
    usage_count           INT DEFAULT 0,
    last_used_at          TIMESTAMP,
    created_by            BIGINT REFERENCES users(userid) ON DELETE SET NULL,
    is_active             BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pdf_rental_map_text ON pdf_rental_mappings(normalized_text);

CREATE TABLE IF NOT EXISTS pdf_service_mappings (
    mapping_id          BIGSERIAL PRIMARY KEY,
    pdf_service_text    TEXT NOT NULL UNIQUE,
    normalized_text     TEXT,
    service_item_id     BIGINT REFERENCES service_items(id) ON DELETE CASCADE,
    mapping_type        VARCHAR(20) DEFAULT 'manual',
    confidence_score    DECIMAL(5,2) DEFAULT 100,
    usage_count         INT DEFAULT 0,
    last_used_at        TIMESTAMP,
    created_by          BIGINT REFERENCES users(userid) ON DELETE SET NULL,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pdf_service_map_text ON pdf_service_mappings(normalized_text);

CREATE TABLE IF NOT EXISTS pdf_customer_mappings (
    mapping_id        BIGSERIAL PRIMARY KEY,
    pdf_customer_text TEXT NOT NULL,
    normalized_text   TEXT,
    customer_id       BIGINT REFERENCES customers(customerid) ON DELETE CASCADE,
    mapping_type      VARCHAR(20) DEFAULT 'fuzzy',
    confidence_score  DECIMAL(5,2) DEFAULT 0,
    usage_count       INT DEFAULT 0,
    last_used_at      TIMESTAMP,
    created_by        BIGINT REFERENCES users(userid) ON DELETE SET NULL,
    is_active         BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_pdf_cust_map_text     ON pdf_customer_mappings(normalized_text);
CREATE INDEX IF NOT EXISTS idx_pdf_cust_map_customer ON pdf_customer_mappings(customer_id);

CREATE TABLE IF NOT EXISTS pdf_mapping_events (
    event_id         BIGSERIAL PRIMARY KEY,
    extraction_id    BIGINT REFERENCES pdf_extractions(extraction_id) ON DELETE CASCADE,
    item_id          BIGINT REFERENCES pdf_extraction_items(item_id) ON DELETE CASCADE,
    pdf_product_text VARCHAR(1000) NOT NULL DEFAULT '',
    normalized_text  VARCHAR(1000),
    product_id       BIGINT DEFAULT 0,
    package_id       BIGINT DEFAULT 0,
    mapped_by        BIGINT REFERENCES users(userid) ON DELETE SET NULL,
    event_type       VARCHAR(50),
    created_by       BIGINT REFERENCES users(userid) ON DELETE SET NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- PART 4: DEFAULT DATA
-- =============================================================================

-- Default job statuses
INSERT INTO status (status, description, color, sort_order) VALUES
('Planung', 'Job ist in der Planungsphase', '#6c757d', 1),
('Vorbereitung', 'Job wird vorbereitet', '#17a2b8', 2),
('Aktiv', 'Job ist aktuell aktiv', '#28a745', 3),
('Abgeschlossen', 'Job wurde abgeschlossen', '#007bff', 4),
('Abgerechnet', 'Job wurde abgerechnet', '#6610f2', 5),
('Storniert', 'Job wurde storniert', '#dc3545', 6),
('Pausiert', 'Job ist temporär pausiert', '#ffc107', 7)
ON CONFLICT (status) DO NOTHING;

-- Default RBAC roles
INSERT INTO roles (name, display_name, description, scope, is_system_role, permissions) VALUES
-- Global roles
('super_admin', 'Super Administrator', 'Full access across all systems', 'global', TRUE, '["*"]'),
-- RentalCore roles
('admin', 'Rental Key User', 'RentalCore full administration', 'rentalcore', TRUE, '["rentalcore.*"]'),
('manager', 'Rental Manager', 'Jobs, customers, devices management', 'rentalcore', TRUE, '["rentalcore.jobs.*", "rentalcore.customers.*", "rentalcore.devices.read"]'),
('operator', 'Rental Operator', 'Operational flows including scanning', 'rentalcore', TRUE, '["rentalcore.jobs.read", "rentalcore.jobs.scan", "rentalcore.devices.read"]'),
('viewer', 'Rental See-Only', 'Read-only access to RentalCore', 'rentalcore', TRUE, '["rentalcore.*.read"]'),
-- WarehouseCore roles
('warehouse_admin', 'Warehouse Admin', 'WarehouseCore full administration', 'warehousecore', TRUE, '["warehousecore.*"]'),
('warehouse_manager', 'Warehouse Manager', 'Warehouse operations and reporting', 'warehousecore', TRUE, '["warehousecore.zones.*", "warehousecore.devices.*", "warehousecore.reports.*"]'),
('warehouse_worker', 'Warehouse Worker', 'Daily warehouse tasks and scans', 'warehousecore', TRUE, '["warehousecore.devices.read", "warehousecore.devices.scan", "warehousecore.zones.read"]'),
('warehouse_viewer', 'Warehouse Viewer', 'Read-only warehouse access', 'warehousecore', TRUE, '["warehousecore.*.read"]')
ON CONFLICT (name) DO NOTHING;

-- Default admin user
-- Password: 'admin' (bcrypt hash)
-- IMPORTANT: force_password_change is TRUE - user MUST change password on first login!
INSERT INTO users (username, email, password_hash, first_name, last_name, is_admin, is_active, force_password_change)
VALUES ('admin', 'admin@example.com', '$2a$10$AlHJcEvCFEXXAoxQ/S4XXeVy3coR0yHtTv0Pn3bHEH/z3t3jdGVru', 'System', 'Administrator', TRUE, TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;

-- Assign all administrative roles to the default admin user
DO $$
DECLARE
    admin_user_id INT;
BEGIN
    SELECT userid INTO admin_user_id FROM users WHERE username = 'admin';
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO user_roles (userid, roleid)
        SELECT admin_user_id, roleid FROM roles WHERE name IN ('super_admin', 'admin', 'warehouse_admin')
        ON CONFLICT (userid, roleid) DO NOTHING;
    END IF;
END $$;

-- Default storage zones
INSERT INTO storage_zones (code, name, type, description, is_active) VALUES
('MAIN-WH', 'Hauptlager', 'warehouse', 'Primärer Lagerstandort', TRUE),
('STAGE', 'Staging-Bereich', 'stage', 'Bereich für Job-Vorbereitung', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Default label template
INSERT INTO label_templates (name, description, width, height, template_json, is_default) VALUES
('Standard Geräte-Label', 'Standard Geräteetikett 62x29mm', 62, 29, '[]', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Default count types for accessories/consumables
INSERT INTO count_types (name, abbreviation, is_decimal) VALUES
('Stück', 'Stk', FALSE),
('Kilogramm', 'kg', TRUE),
('Liter', 'L', TRUE),
('Meter', 'm', TRUE),
('Quadratmeter', 'm²', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Default cable connectors
INSERT INTO cable_connectors (name, abbreviation, gender) VALUES
('Schuko', 'SCH', 'male'),
('Schuko Kupplung', 'SCH', 'female'),
('CEE 16A blau', 'CEE16', 'male'),
('CEE 16A blau Kupplung', 'CEE16', 'female'),
('CEE 32A rot', 'CEE32', 'male'),
('CEE 32A rot Kupplung', 'CEE32', 'female'),
('CEE 63A rot', 'CEE63', 'male'),
('CEE 63A rot Kupplung', 'CEE63', 'female'),
('CEE 125A rot', 'CEE125', 'male'),
('CEE 125A rot Kupplung', 'CEE125', 'female'),
('XLR 3-pol', 'XLR3', 'male'),
('XLR 3-pol Kupplung', 'XLR3', 'female'),
('XLR 5-pol', 'XLR5', 'male'),
('XLR 5-pol Kupplung', 'XLR5', 'female'),
('Powercon', 'PWC', 'male'),
('Powercon TRUE1', 'PWC1', 'male'),
('Socapex', 'SOC', 'male'),
('Socapex Kupplung', 'SOC', 'female'),
('HAN 16E', 'HAN16', 'male'),
('HAN 16E Kupplung', 'HAN16', 'female'),
('speakON 2-pol', 'NL2', 'male'),
('speakON 4-pol', 'NL4', 'male'),
('speakON 8-pol', 'NL8', 'male'),
('Klinke 6.3mm mono', 'TS', 'male'),
('Klinke 6.3mm stereo', 'TRS', 'male'),
('RJ45', 'RJ45', 'male'),
('etherCON', 'eCON', 'male')
ON CONFLICT DO NOTHING;

-- Default cable types
INSERT INTO cable_types (name) VALUES
('Strom'),
('Audio'),
('DMX'),
('Netzwerk'),
('Video'),
('Multicore'),
('Hybrid')
ON CONFLICT DO NOTHING;

-- Default company settings (empty template)
INSERT INTO company_settings (company_name, country, currency, default_tax_rate) 
VALUES ('Meine Firma', 'Deutschland', 'EUR', 19.00)
ON CONFLICT DO NOTHING;

-- Default LED settings
INSERT INTO app_settings (scope, k, v, description) VALUES
('warehousecore', 'led.single_bin.default', '{"color": "#FF7A00", "pattern": "breathe", "intensity": 180}', 'Default LED highlighting settings for single bins')
ON CONFLICT (scope, k) DO NOTHING;

-- =============================================================================
-- PART 4b: JOB FEATURE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_packages (
    job_package_id BIGSERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    package_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    custom_price DECIMAL(12,2) DEFAULT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER DEFAULT NULL,
    notes TEXT,
    CONSTRAINT fk_job_packages_job FOREIGN KEY (job_id) REFERENCES jobs(jobid) ON DELETE CASCADE,
    CONSTRAINT fk_job_packages_package FOREIGN KEY (package_id) REFERENCES product_packages(id) ON DELETE RESTRICT,
    CONSTRAINT fk_job_packages_user FOREIGN KEY (added_by) REFERENCES users(userid) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job_package_reservations (
    reservation_id BIGSERIAL PRIMARY KEY,
    job_package_id BIGINT NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    reservation_status VARCHAR(20) NOT NULL DEFAULT 'reserved' CHECK (reservation_status IN ('reserved','assigned','released')),
    reserved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP DEFAULT NULL,
    released_at TIMESTAMP DEFAULT NULL,
    CONSTRAINT fk_job_pkg_res_job_package FOREIGN KEY (job_package_id) REFERENCES job_packages(job_package_id) ON DELETE CASCADE,
    CONSTRAINT fk_job_pkg_res_device FOREIGN KEY (device_id) REFERENCES devices(deviceid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_attachments (
    attachment_id BIGSERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INTEGER DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_job_attachments_job FOREIGN KEY (job_id) REFERENCES jobs(jobid) ON DELETE CASCADE,
    CONSTRAINT fk_job_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users(userid) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job_edit_sessions (
    session_id BIGSERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_edit_sessions_job FOREIGN KEY (job_id) REFERENCES jobs(jobid) ON DELETE CASCADE,
    CONSTRAINT fk_job_edit_sessions_user FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE CASCADE,
    CONSTRAINT uk_job_edit_sessions_job_user UNIQUE (job_id, user_id)
);

CREATE TABLE IF NOT EXISTS job_history (
    history_id BIGSERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_type VARCHAR(30) NOT NULL CHECK (change_type IN ('created','updated','status_changed','device_added','device_removed','deleted','file_added','file_removed')),
    field_name VARCHAR(100) DEFAULT NULL,
    old_value TEXT DEFAULT NULL,
    new_value TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    CONSTRAINT fk_job_history_job FOREIGN KEY (job_id) REFERENCES jobs(jobid) ON DELETE CASCADE,
    CONSTRAINT fk_job_history_user FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE SET NULL
);

-- job_product_requirements: stores what products a job needs (stage 1 of two-stage availability)
CREATE TABLE IF NOT EXISTS job_product_requirements (
    id BIGSERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(jobid) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(productid) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT job_product_requirements_job_product_unique UNIQUE (job_id, product_id)
);

-- =============================================================================
-- PART 5: INDEXES AND CONSTRAINTS
-- =============================================================================

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(statusid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_devices_available ON devices(status) WHERE status = 'free';
CREATE INDEX IF NOT EXISTS idx_job_packages_job ON job_packages(job_id);
CREATE INDEX IF NOT EXISTS idx_job_packages_package ON job_packages(package_id);
CREATE INDEX IF NOT EXISTS idx_job_pkg_res_job_package ON job_package_reservations(job_package_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_job ON job_attachments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_uploaded_at ON job_attachments(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_job_edit_sessions_job ON job_edit_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_edit_sessions_user ON job_edit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_job_edit_sessions_last_seen ON job_edit_sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_job_history_job ON job_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_history_user ON job_history(user_id);
CREATE INDEX IF NOT EXISTS idx_job_history_changed_at ON job_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_job_product_req_job ON job_product_requirements(job_id);
CREATE INDEX IF NOT EXISTS idx_job_product_req_product ON job_product_requirements(product_id);

-- =============================================================================
-- INITIALIZATION COMPLETE
-- =============================================================================
-- Default login: admin / admin
-- User will be forced to change password on first login
-- =============================================================================
