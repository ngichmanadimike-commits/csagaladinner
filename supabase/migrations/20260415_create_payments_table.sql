-- Migration to create payments table

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    phone_number TEXT,
    amount INTEGER NOT NULL,
    transaction_code TEXT,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    callback_data JSONB
);

-- Creating indexes
CREATE INDEX idx_user_id ON payments(user_id);
CREATE INDEX idx_transaction_code ON payments(transaction_code);

-- Row Level Security (RLS) Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Example policy to allow users to insert their own payments
CREATE POLICY "Insert own payments" ON payments
    FOR INSERT
    USING (user_id = current_user);

-- Example policy to allow users to select their own payments
CREATE POLICY "Select own payments" ON payments
    FOR SELECT
    USING (user_id = current_user);