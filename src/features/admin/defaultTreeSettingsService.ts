import { DEFAULT_TREE_SETTINGS } from '../../constants';
import type { TreeSettings, UserProfile } from '../../types';
import { getSupabaseFull } from '../../services/supabaseClient';

export type AdminDefaultTreeSettings = Pick<
  TreeSettings,
  | 'chartType'
  | 'showPhotos'
  | 'privacyMode'
  | 'nodeSpacingX'
  | 'nodeSpacingY'
  | 'nodeWidth'
  | 'textSize'
  | 'generationLimit'
>;

export const ADMIN_DEFAULT_TREE_SETTING_KEYS: Array<keyof AdminDefaultTreeSettings> = [
  'chartType',
  'showPhotos',
  'privacyMode',
  'nodeSpacingX',
  'nodeSpacingY',
  'nodeWidth',
  'textSize',
  'generationLimit',
];

const DEFAULT_ROW_KEY = 'global';

const getClient = (user: UserProfile) =>
  getSupabaseFull(user.uid, user.email || '', user.supabaseToken);

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const pickBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

export const sanitizeDefaultTreeSettings = (
  value: unknown
): AdminDefaultTreeSettings => {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<Record<keyof AdminDefaultTreeSettings, unknown>>
    : {};

  return {
    chartType: record.chartType === 'radial' || record.chartType === 'focus'
      ? record.chartType
      : DEFAULT_TREE_SETTINGS.chartType,
    showPhotos: pickBoolean(record.showPhotos, DEFAULT_TREE_SETTINGS.showPhotos),
    privacyMode: pickBoolean(record.privacyMode, Boolean(DEFAULT_TREE_SETTINGS.privacyMode)),
    nodeSpacingX: clampNumber(record.nodeSpacingX, DEFAULT_TREE_SETTINGS.nodeSpacingX, 40, 400),
    nodeSpacingY: clampNumber(record.nodeSpacingY, DEFAULT_TREE_SETTINGS.nodeSpacingY, 80, 800),
    nodeWidth: clampNumber(record.nodeWidth, DEFAULT_TREE_SETTINGS.nodeWidth, 120, 260),
    textSize: clampNumber(record.textSize, DEFAULT_TREE_SETTINGS.textSize, 10, 18),
    generationLimit: clampNumber(record.generationLimit, DEFAULT_TREE_SETTINGS.generationLimit, 2, 12),
  };
};

export const buildTreeSettingsWithAdminDefaults = (
  defaults: AdminDefaultTreeSettings
): TreeSettings => ({
  ...DEFAULT_TREE_SETTINGS,
  ...defaults,
});

export const fetchAdminDefaultTreeSettings = async (
  user: UserProfile
): Promise<AdminDefaultTreeSettings> => {
  const client = getClient(user);
  const { data, error } = await client
    .from('app_default_tree_settings')
    .select('settings')
    .eq('key', DEFAULT_ROW_KEY)
    .maybeSingle();

  if (error) throw error;
  return sanitizeDefaultTreeSettings(data?.settings);
};

export const saveAdminDefaultTreeSettings = async (
  user: UserProfile,
  settings: AdminDefaultTreeSettings
): Promise<AdminDefaultTreeSettings> => {
  const sanitized = sanitizeDefaultTreeSettings(settings);
  const client = getClient(user);
  const { data, error } = await client
    .from('app_default_tree_settings')
    .upsert({
      key: DEFAULT_ROW_KEY,
      settings: sanitized,
      updated_at: new Date().toISOString(),
      updated_by: user.uid,
    }, { onConflict: 'key' })
    .select('settings')
    .single();

  if (error) throw error;
  return sanitizeDefaultTreeSettings(data?.settings);
};
