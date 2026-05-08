-- Migration: Add type column to products table
-- Run this in Supabase SQL Editor

-- Add type column with default value 'product'
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'product';

-- Add check constraint
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_type_check;

ALTER TABLE products
  ADD CONSTRAINT products_type_check CHECK (type IN ('product', 'service'));

-- Set existing rows to 'product'
UPDATE products SET type = 'product' WHERE type IS NULL OR type = '';
