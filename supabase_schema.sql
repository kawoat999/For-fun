-- Run this SQL in your Supabase Project -> SQL Editor

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  doc_type TEXT NOT NULL, -- 'expense' หรือ 'income'
  receipt_data JSONB NOT NULL,
  image_url TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for demo/anon usage (can be restricted with Auth later)
CREATE POLICY "Allow anon read and write on receipts"
  ON receipts
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
