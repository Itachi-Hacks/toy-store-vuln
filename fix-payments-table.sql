-- Migration: Add missing columns to payments table if they don't exist

-- Add expiry_date column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='payments' AND column_name='expiry_date'
    ) THEN
        ALTER TABLE payments ADD COLUMN expiry_date VARCHAR(5);
        RAISE NOTICE 'Added expiry_date column to payments table';
    ELSE
        RAISE NOTICE 'expiry_date column already exists';
    END IF;
END $$;

-- Add billing_zip column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='payments' AND column_name='billing_zip'
    ) THEN
        ALTER TABLE payments ADD COLUMN billing_zip VARCHAR(10);
        RAISE NOTICE 'Added billing_zip column to payments table';
    ELSE
        RAISE NOTICE 'billing_zip column already exists';
    END IF;
END $$;

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;
