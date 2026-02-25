-- Add settings JSONB column to trees table for per-tree settings persistence
ALTER TABLE trees ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN trees.settings IS 'Per-tree settings (TreeSettings) - stores layout, visual, and display preferences as JSONB';
