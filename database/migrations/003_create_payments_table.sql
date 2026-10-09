-- ==============================================================================
-- Migration 003: Enterprise Payments Table for Payment Gateway & Webhook Audit
-- ==============================================================================

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    gateway VARCHAR(32) NOT NULL DEFAULT 'RAZORPAY',
    gateway_order_id VARCHAR(128),
    gateway_payment_id VARCHAR(128) UNIQUE,
    amount_paise BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'CAPTURED', 'FAILED', 'REFUNDED'
    raw_event_id VARCHAR(128) UNIQUE,
    signature VARCHAR(256),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id ON payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_raw_event_id ON payments(raw_event_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
