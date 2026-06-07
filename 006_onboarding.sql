-- 006_onboarding.sql
-- Run this in the Supabase SQL Editor to support the onboarding system

-- Add onboarding/profile completion fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT 0;
