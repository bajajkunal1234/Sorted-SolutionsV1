-- =====================================================
-- CLEANUP SCRIPT - Remove Existing Admin App Tables
-- =====================================================
-- Run this FIRST before running admin_app_schema.sql
-- This removes any tables from previous migration attempts
-- =====================================================

-- Drop all admin app tables in reverse dependency order
-- (child tables first, then parent tables)

-- Drop transaction tables
DROP TABLE IF EXISTS receipt_vouchers CASCADE;
DROP TABLE IF EXISTS payment_vouchers CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS purchase_invoices CASCADE;
DROP TABLE IF EXISTS sales_invoices CASCADE;

-- Drop supporting tables
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS brands CASCADE;

-- Drop core tables
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS technicians CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Drop any properties table if it exists
DROP TABLE IF EXISTS properties CASCADE;

-- Drop any AMC/Rental tables if they exist
DROP TABLE IF EXISTS amc_plans CASCADE;
DROP TABLE IF EXISTS rental_plans CASCADE;

-- =====================================================
-- CLEANUP COMPLETE
-- =====================================================
-- All admin app tables have been removed
-- You can now run admin_app_schema.sql
-- =====================================================
