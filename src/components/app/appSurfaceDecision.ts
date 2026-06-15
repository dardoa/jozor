export type AppSurface =
  | 'auth-bootstrap'
  | 'landing'
  | 'tree-selector'
  | 'not-found'
  | 'app-layout';

interface ResolveAppSurfaceInput {
  authLoading: boolean;
  hasOAuthCallback: boolean;
  hasUser: boolean;
  showWelcome: boolean;
  hasCurrentTree: boolean;
  hasRouteTree: boolean;
  hasRoutePerson: boolean;
  routePersonExists: boolean;
}

export const resolveAppSurface = ({
  authLoading,
  hasOAuthCallback,
  hasUser,
  showWelcome,
  hasCurrentTree,
  hasRouteTree,
  hasRoutePerson,
  routePersonExists,
}: ResolveAppSurfaceInput): AppSurface => {
  if (authLoading || (hasOAuthCallback && !hasUser)) {
    return 'auth-bootstrap';
  }

  if (showWelcome) {
    return 'landing';
  }

  if (hasUser && !hasCurrentTree) {
    return hasRouteTree ? 'not-found' : 'tree-selector';
  }

  if (hasRoutePerson && hasCurrentTree && !routePersonExists) {
    return 'not-found';
  }

  return 'app-layout';
};

export const hasOAuthCallbackParams = (search: string, hash: string): boolean =>
  hash.includes('access_token') ||
  search.includes('code=') ||
  search.includes('error=');

export const getRouteReturnTo = (
  pathname: string,
  search: string,
  hash: string
): string | undefined =>
  pathname === '/' && !search && !hash
    ? undefined
    : `${pathname}${search}${hash}`;
