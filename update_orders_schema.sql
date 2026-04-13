-- Migration: Add payment tracking fields to existing orders table
-- Run this if you already have an orders table

ALTER TABLE orders 
ADD COLUMN paid TINYINT(1) NOT NULL DEFAULT 0 AFTER stripe_session_id,
ADD COLUMN paid_at TIMESTAMP NULL AFTER paid;
