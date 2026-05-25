update public.app_default_tree_settings
set
  settings = settings - 'layoutMode',
  updated_at = now()
where key = 'global'
  and settings ? 'layoutMode';
