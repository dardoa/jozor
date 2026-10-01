import { readFile } from 'node:fs/promises';
import { inspectAccountBillingReadiness } from './accountBillingReadiness.mjs';

try {
  const linkedProject = (await readFile(new URL('../../supabase/.temp/project-ref', import.meta.url), 'utf8')).trim();
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !['--provider-only', '--reconciliation-preview'].includes(args[0]))) throw new Error('Unsupported argument');
  const report = await inspectAccountBillingReadiness(process.env, linkedProject, fetch, {
    providerOnly: args.includes('--provider-only'), reconciliationPreview: args.includes('--reconciliation-preview'),
  });
  console.log(JSON.stringify(report, null, 2));
  if (!report.inventoryComplete) process.exitCode = 1;
} catch {
  console.error('Read-only billing inventory unavailable. No provider or database mutations were requested.');
  process.exitCode = 1;
}
