import { readFile } from 'node:fs/promises';
import { runBillingOperatorSession } from './accountBillingTargetConnection.mjs';

try {
  if (process.argv.length !== 2) throw new Error();
  const linkedProjectRef = (await readFile(new URL('../../supabase/.temp/project-ref', import.meta.url), 'utf8')).trim();
  const ca = process.env.BILLING_OPERATOR_CA_FILE ? await readFile(process.env.BILLING_OPERATOR_CA_FILE, 'utf8') : undefined;
  const report = await runBillingOperatorSession({ env: process.env, linkedProjectRef, ca,
    connectionString: process.env.BILLING_OPERATOR_DATABASE_URL, mode: 'inspect' });
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'inspected' || !report.schemaVerified || !report.connectionClosed) process.exitCode = 1;
} catch {
  console.error('Read-only billing target verification unavailable. No billing or account mutations requested.');
  process.exitCode = 1;
}
