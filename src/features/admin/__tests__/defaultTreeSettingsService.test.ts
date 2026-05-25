import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTreeSettingsWithAdminDefaults,
  fetchAdminDefaultTreeSettings,
  sanitizeDefaultTreeSettings,
  saveAdminDefaultTreeSettings,
} from '../defaultTreeSettingsService';

const { getSupabaseFullMock, fromMock } = vi.hoisted(() => ({
  getSupabaseFullMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('../../../services/supabaseClient', () => ({
  getSupabaseFull: getSupabaseFullMock,
}));

const user = {
  uid: 'admin-1',
  email: 'admin@example.com',
  displayName: 'Admin',
  photoURL: '',
  supabaseToken: 'token-1',
};

describe('defaultTreeSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseFullMock.mockReturnValue({ from: fromMock });
  });

  it('sanitizes unsupported keys and clamps numeric values', () => {
    expect(sanitizeDefaultTreeSettings({
      chartType: 'bad',
      layoutMode: 'horizontal',
      showPhotos: false,
      privacyMode: true,
      nodeSpacingX: 9999,
      nodeSpacingY: -1,
      nodeWidth: 180,
      textSize: 22,
      generationLimit: 1,
      unsafe: 'ignored',
    })).toEqual({
      chartType: 'focus',
      showPhotos: false,
      privacyMode: true,
      nodeSpacingX: 400,
      nodeSpacingY: 80,
      nodeWidth: 180,
      textSize: 18,
      generationLimit: 2,
    });
  });

  it('builds full tree settings from admin defaults', () => {
    const defaults = sanitizeDefaultTreeSettings({ chartType: 'radial', showPhotos: false });
    const settings = buildTreeSettingsWithAdminDefaults(defaults);

    expect(settings.chartType).toBe('radial');
    expect(settings.showPhotos).toBe(false);
    expect(settings.showFirstName).toBe(true);
  });

  it('fetches the global defaults row', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { settings: { chartType: 'radial', showPhotos: false } },
      error: null,
    });
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ select: selectMock });

    const result = await fetchAdminDefaultTreeSettings(user);

    expect(fromMock).toHaveBeenCalledWith('app_default_tree_settings');
    expect(eqMock).toHaveBeenCalledWith('key', 'global');
    expect(result.chartType).toBe('radial');
    expect(result.showPhotos).toBe(false);
  });

  it('saves sanitized defaults through an upsert', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { settings: { chartType: 'radial', generationLimit: 12 } },
      error: null,
    });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const upsertMock = vi.fn(() => ({ select: selectMock }));
    fromMock.mockReturnValue({ upsert: upsertMock });

    const result = await saveAdminDefaultTreeSettings(user, sanitizeDefaultTreeSettings({
      chartType: 'radial',
      generationLimit: 99,
    }));

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'global',
        settings: expect.objectContaining({ chartType: 'radial', generationLimit: 12 }),
        updated_by: 'admin-1',
      }),
      { onConflict: 'key' }
    );
    expect(result.generationLimit).toBe(12);
  });
});
