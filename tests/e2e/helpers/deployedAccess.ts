import { BrowserContext } from '@playwright/test';

export interface DeployedAccessConfig {
  url: string;
  bypassToken: string | null;
}

/**
 * Retrieves the deployed smoke test configuration from environment variables.
 * Returns null if the required DEPLOYED_SMOKE_URL is not set.
 */
export function getDeployedAccessConfig(): DeployedAccessConfig | null {
  const url = process.env.DEPLOYED_SMOKE_URL;
  const bypassToken = process.env.VERCEL_BYPASS_TOKEN || null;

  if (!url) {
    return null;
  }
  const parsedUrl = new URL(url);
  if (parsedUrl.searchParams.has('x-vercel-protection-bypass')) {
    throw new Error('DEPLOYED_SMOKE_URL must not include bypass tokens in query parameters.');
  }
  return { url, bypassToken };
}

/**
 * Safely injects the Vercel bypass token as a cookie in the Playwright context
 * to authenticate past the Vercel Deployment Protection gateway.
 */
export async function configureDeployedContext(
  context: BrowserContext,
  config: DeployedAccessConfig
): Promise<void> {
  if (config.bypassToken) {
    try {
      const parsedUrl = new URL(config.url);
      await context.addCookies([
        {
          name: '_vercel_jwt',
          value: config.bypassToken,
          domain: parsedUrl.hostname,
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        },
      ]);
    } catch {
      console.error('[Deployed Access] Failed to configure context cookies.');
    }
  }
}
