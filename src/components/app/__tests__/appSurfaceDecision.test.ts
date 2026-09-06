import { describe, expect, it } from 'vitest';
import {
  getRouteReturnTo,
  hasOAuthCallbackParams,
  resolveAppSurface,
} from '../appSurfaceDecision';

const defaultInput = {
  authLoading: false,
  hasOAuthCallback: false,
  hasUser: true,
  showWelcome: false,
  hasCurrentTree: true,
  hasRouteTree: false,
  hasRoutePerson: false,
  routePersonExists: true,
};

describe('resolveAppSurface', () => {
  it('keeps authentication bootstrap ahead of every other surface', () => {
    expect(resolveAppSurface({
      ...defaultInput,
      authLoading: true,
      showWelcome: true,
    })).toBe('auth-bootstrap');

    expect(resolveAppSurface({
      ...defaultInput,
      hasOAuthCallback: true,
      hasUser: false,
    })).toBe('auth-bootstrap');
  });

  it('shows the landing surface when the welcome flow is active', () => {
    expect(resolveAppSurface({
      ...defaultInput,
      showWelcome: true,
    })).toBe('landing');
  });

  it('routes authenticated users without an active tree to tree selection', () => {
    expect(resolveAppSurface({
      ...defaultInput,
      hasCurrentTree: false,
    })).toBe('tree-selector');
  });

  it('rejects unresolved canonical tree and person routes', () => {
    expect(resolveAppSurface({
      ...defaultInput,
      hasCurrentTree: false,
      hasRoutePerson: true,
      routePersonExists: false,
    })).toBe('not-found');

    expect(resolveAppSurface({
      ...defaultInput,
      hasCurrentTree: false,
      hasRouteTree: true,
    })).toBe('not-found');

    expect(resolveAppSurface({
      ...defaultInput,
      hasRoutePerson: true,
      routePersonExists: false,
    })).toBe('not-found');
  });

  it('renders the application after route prerequisites are satisfied', () => {
    expect(resolveAppSurface(defaultInput)).toBe('app-layout');
  });
});

describe('app route helpers', () => {
  it('recognizes supported OAuth callback parameters', () => {
    expect(hasOAuthCallbackParams('', '#access_token=token')).toBe(true);
    expect(hasOAuthCallbackParams('?code=code', '')).toBe(true);
    expect(hasOAuthCallbackParams('?error=denied', '')).toBe(true);
    expect(hasOAuthCallbackParams('?tab=trees', '#section')).toBe(false);
  });

  it('stores only non-root return locations', () => {
    expect(getRouteReturnTo('/', '', '')).toBeUndefined();
    expect(getRouteReturnTo('/person/123', '?tab=bio', '#events'))
      .toBe('/person/123?tab=bio#events');
  });
});
