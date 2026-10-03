-- ==============================================================================
-- HUNTER'S KITCHEN — MIGRATION 002: USER DELETION FOREIGN KEY ADJUSTMENTS
-- Allows clean, permanent deletion of Staff Members, Delivery Partners, and Customers
-- ==============================================================================

-- 1. Orders Table: Allow customer_id to be nullable so user deletion does not corrupt order history
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL;

-- 2. Delivery Batches Table: Allow delivery_partner_id to be nullable on partner deletion
ALTER TABLE delivery_batches DROP CONSTRAINT IF EXISTS delivery_batches_delivery_partner_id_fkey;
ALTER TABLE delivery_batches ALTER COLUMN delivery_partner_id DROP NOT NULL;
ALTER TABLE delivery_batches ADD CONSTRAINT delivery_batches_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. COD Transactions Table: Allow delivery_partner_id to be nullable on partner deletion
ALTER TABLE cod_transactions DROP CONSTRAINT IF EXISTS cod_transactions_delivery_partner_id_fkey;
ALTER TABLE cod_transactions ALTER COLUMN delivery_partner_id DROP NOT NULL;
ALTER TABLE cod_transactions ADD CONSTRAINT cod_transactions_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. Reviews Table: Allow customer_id to be nullable on customer deletion
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_customer_id_fkey;
ALTER TABLE reviews ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE reviews ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL;
