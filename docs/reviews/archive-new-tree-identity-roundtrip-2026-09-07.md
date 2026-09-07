# Archive New-Tree Identity and Roundtrip Review

Date: 2026-09-07
Status: local frontend + authorized hosted archive roundtrip passed after checkpoint relationship corrections; hosted checkpoint migration applied and verified.
Frontend commit/push/deployment verification pending at this report revision; no owner visual approval.
Synthetic hosted test resources were created and removed; original resources were verified unchanged.
Pre-existing Kindi diagnostic changes remain separate and untouched.

## Reproduced Findings

1. New-tree imports remapped people and spouse links but retained old person keys
   in `partnerDetails`. Marriage/divorce dates and places could become detached
   from the imported spouses. The defect affected Jozor, JSON, and GEDCOM paths.
2. Person selections in `ownerPersonId` and `highlightedBranchRootId` retained
   source-tree identities, both in nested and legacy flat settings.
3. A missing person ID was manufactured by `validatePerson` before the import's
   identity guard. Null roots/entries could throw TypeError instead of a
   controlled validation error. Invalid files must not allocate cloud resources.

Regression tests reproduced seven failures before the first correction and
three additional settings failures before the settings correction. Earlier
failures are retained in the ignored command logs, not described as passes.

## Scoped Runtime Correction

`src/features/tree-manager/services/importTreeService.ts` now:

- Validates root/people containers and supplied person identities before defaults
  can create an identity, and rejects malformed partner-detail containers.
- Remaps partner-detail keys with the same ID map as spouse/parent/child links.
  Detail records are copied; source records are not mutated.
- Rejects dangling archive partner references before creating the destination,
  consistent with the existing strict archive relationship policy.
- Drops dangling partner references in permissive JSON/GEDCOM imports, matching
  the existing treatment of unresolved relationship links in those formats.
- Remaps the two known optional person selections in flat/nested settings.
  Missing optional selections become null; unrelated settings are retained.

In the initial local pass, no archive format, schema migration, renderer, storage authorization policy,
cleanup behavior, or existing hosted tree was changed. This is not an exhaustive
validator for every possible malformed Person field.

## Real File Logic Coverage

`archiveCloudRoundtrip.test.ts` builds an actual ZIP/`.jozor` archive using
`buildBlueprintArchive`, then invokes the real file reader, archive extractor,
new-tree import service, import RPC payload mapper, and tree-read mapper.

The fixture contains four Arabic people, two spouse relationships (married and
divorced), two parent-child relationships, privacy/life-status flags, sources,
events, a selected focal child, and distinct profile/gallery PNG bytes with
gallery caption/date. Two independent imports receive disjoint person/asset
identities. Re-exported archives preserve the exact image bytes and omit
provider-bound media references. The original fixture stays unchanged.

External persistence and upload endpoints are mocked. The test checks the real
`import_tree_content` payload but models its returned column shape; it does not
execute PostgreSQL, RLS, live Storage, or the application's import UI. A second
real-ZIP test removes an image and verifies rejection before cloud allocation.

## Native Browser File Evidence

A separate Chromium session used production archive functions in an isolated
local harness. External HTTP/API requests and WebSockets were blocked. It did
not log in, seed an owner tree, or operate the user's browser.

- Clicked download, saved the real `.jozor`, and chose that downloaded file via
  the native file input.
- Two Arabic people, marriage details and selected focus survived extraction.
- Two distinct embedded PNG images passed `Image.decode()` (1 x 1 pixel each),
  and both SHA-256 values matched before/after extraction.
- Downloaded file: 1,654 bytes, SHA-256
  `0ac36477e1c51d8b7c673b90d16471dcb5fc803df4cc92606cbc14c32c0cfbef`.
  Independently checked on disk using `Get-FileHash`.
- Original browser-generated archive hash matched the downloaded file hash.
- Extraction warnings: zero. The test browser was closed afterward.

Harness startup needed two corrections (CLI's missing outer URL global and
Vite React preamble). Those were test harness issues, not successful runs. A
Vite HMR connection error is expected because WebSockets were intentionally
blocked; this is not a claim of a silent application-wide browser run.

Ignored evidence:

- `output/playwright/archive-native-file-check.js`
- `output/playwright/archive-native-roundtrip.jozor`
- `output/playwright/archive-native-result.json`
- `output/archive-import-regression-before.log`
- `output/archive-settings-regression-before.log`
- `output/archive-roundtrip-targeted.log`
- `output/archive-roundtrip-regression.log`
- `output/archive-roundtrip-typecheck.log`
- `output/archive-roundtrip-eslint.log`
- `output/archive-roundtrip-build.log`

## Verification

| Gate | Result |
| --- | --- |
| Import validation/remapping + real-file roundtrip | 27 passed, 2 files |
| Import, archives, restore, cleanup queue, GEDCOM lifecycle, person/RPC mappers | 71 passed, 9 files |
| Native Chromium download/File/ZIP/image decode | Passed, exact file/image hashes |
| Application TypeScript | Exit 0 |
| Scoped ESLint on the three changed source/test files | Exit 0, no warnings |
| Production build | Exit 0, 35.20 seconds; existing Browserslist notice |
| Git whitespace check | Passed; Git LF/CRLF conversion notices only |

The targeted 27 cases are included in the 71, not added to it. The full
application Vitest/E2E suites were not rerun in this scoped pass.

## Hosted Browser Follow-Up

The current frontend ran on `http://127.0.0.1:3310` against the approved prelaunch
Supabase project. Private media reads used the existing same-app proxy to
`https://jozor.vercel.app/api/person-media`. No personal account/browser was used.
This is real hosted persistence with the local corrected frontend, not a claim
that the corrections are deployed to Vercel.

The native UI path was Vault -> Publishing and Backup -> Portable Data -> full
owner archive download, followed by Trees -> Import as New Tree -> choosing
that exact downloaded file. The final download used `waitForEvent('download')`;
the Playwright CLI's native file-chooser `upload` completed the import.

### Additional Findings and Corrections

1. The first real import stored exactly four correct relationship rows, yet the
   person panel displayed three parents. The SQL checkpoint generator's
   `derived_parents_from_spouses` and `derived_children_from_spouses` introduced
   the father's former spouse as another parent. The test tree had no delta
   operations: the malformed checkpoint was the direct cause, not delta replay.
2. Separately, delta replay reused interactive linking rules and could infer
   marriages/co-parents or silently drop existing explicit links. Six negative
   tests failed before that correction, including former-spouse inference.
3. The first fixture hash changed because first-open settings hydration flattened
   nested settings and filled defaults. That attempt was not counted as source
   preservation. Subsequent runs captured a baseline after initial hydration and
   before export; that exact source snapshot remained unchanged.

`supabaseTreeReadService.ts` now reconstructs checkpoint relationship arrays
from persisted relationship rows after replaying property updates. Reads are
paginated at 1,000 edges, and failures reject the load instead of returning an
inferred or incomplete graph. Person fields, images, partner details, focus,
settings and the original checkpoint object remain intact. No checkpoint is
rewritten remotely.

`FamilyDomainReducer.ts` applies remote `ADD_RELATION` as a single recorded,
reciprocal edge, without interactive inference. Tests cover all 24 orders of
the four-edge fixture, repeated delivery, one-sided links, self/missing endpoints
and preservation of explicit relationships beyond interactive entry limits.
The interactive local action behavior was preserved and tested separately.

Migration `20260907000100_preserve_explicit_checkpoint_relationships.sql` removes
spouse-derived parenthood from future checkpoints, preserves the complete person
projection/private photo reference and existing execution privileges, and leaves
historical checkpoints untouched. It was initially tested locally, then applied
to hosted Supabase in the checkpoint preparation below.
PGlite executed the old function to reproduce three parents, then the real new
migration to verify two parents, unchanged media/fields, repeatability, no
historical rewrite and denied `anon`/`authenticated` execution.

### Measured Results

- Final archive: 2,711 bytes; SHA-256
  `64c56592c8b434e4234e7d84c6c20dc18970e76fc1ec10207672319f2b9dd817`.
- Four newly identified Arabic people, four explicit relationships, three
  remapped partner-detail maps, selected focus and both person-selection settings
  matched the source after independent SQL inspection.
- Privacy/life-status flags, sources, events, gallery caption/date were retained.
- Both newly allocated private images matched the original PNG byte hashes.
  Profile and gallery images were also loaded as real Blob-backed `IMG` elements
  with `naturalWidth=1` in the browser, not fallback placeholders. These tiny
  synthetic PNGs verify binary integrity, not visual photo quality.
- An already-created malformed-checkpoint import loaded correctly after the
  read correction. An additional import made with the corrected frontend also
  displayed the two actual parents, not the former spouse, before and after
  the explicit reload assertions. A screenshot was inspected.
- The final source snapshot was unchanged. All synthetic trees (including the
  initial unsuccessful trial), people, private media and test accounts were
  removed. The temporary auth file and fixture manifest were removed. The test
  browser and review server were closed, not the user's browser/server.
- Original business snapshot matched: 184 trees, 134 people, 180 relationships,
  34 collaborators and 11 auth users. This uses the existing normalized business
  snapshot comparison, not a claim of byte-identical whole-database state.
- All 54 original Storage objects matched their SHA-256 and total size of
  2,924,648 bytes; avatar inventory was unchanged. Mutation opt-in was restored.

### Final Follow-Up Gates

| Gate | Result |
| --- | --- |
| Domain, store, sync, commands, archive/import and read services | 219 passed, 40 files; one pre-existing skipped visual test |
| Real checkpoint SQL on isolated PGlite | 3 passed |
| Native UI export/import + hosted SQL/Storage inspection | Passed with local corrected frontend |
| Application TypeScript | Exit 0 |
| Scoped ESLint on current archive/checkpoint source and tests | Exit 0, zero warnings |
| Production build | Exit 0, 21.41 seconds; existing Browserslist notice |

Earlier targeted totals overlap this follow-up and must not be added to it.
The broader suites include expected error logging from deliberate failure tests;
this is not a claim of zero console messages across all tests. Diagnostic browser
module inspection briefly instantiated a duplicate development store, so the
entire investigative session is not represented as a console-clean E2E suite.
Full application and cross-browser E2E suites were not rerun in this follow-up.

Additional ignored evidence is in
`output/playwright/archive-hosted-review-2026-09-07/` (`verification.json`,
`owner-export.jozor`, `imported-parents.png`), with native CLI snapshots in
`.playwright-cli/`. These contain synthetic data only.

## Hosted Migration and Checkpoint Preparation

On 2026-09-07, the linked migration history and `db push --dry-run` identified
exactly one pending migration: `20260907000100`. The existing logical backup was
independently hash-verified again (62 files, including seven SQL dumps and 54
Storage objects). Backup restore was not rehearsed on a second hosted project.

The exact migration was applied using the linked Supabase CLI. A subsequent
read-only SQL inspection confirmed all six checks:

- Both spouse-derived relation CTEs are absent from the deployed function.
- The private photo reference remains projected.
- Explicit edge aggregation is deterministically ordered.
- `anon` cannot execute the function.
- `authenticated` cannot execute the function.
- Migration version `20260907000100` is recorded remotely.

A real hosted execution against the dedicated four-person synthetic tree also
verified the exact two parent identities, no children for the former spouse,
and exact JSON equality for the private photo, gallery and marriage details
against their persisted person fields. These checks ran inside `BEGIN`/`ROLLBACK`,
leaving no durable generated checkpoint.

The original normalized business snapshot matched before and after the migration:
184 trees, 134 people, 180 relationships, 34 collaborators and 11 auth users.
No historical checkpoint rebuild was requested. The complete local PostgreSQL
suite passed 95 tests across four files, including the three checkpoint cases.
Application/API typechecks, full-project ESLint and the production build passed.
The build retained the existing stale Browserslist-data notice.

The final unit gate covered both configured shards: 1,311 passed with one
pre-existing skipped visual test in shard 1, and 1,212 passed in shard 2
(2,523 distinct passing tests; 369 passing files and one skipped file).
The first shard-2 attempt had three 5-second timeouts in unchanged architecture,
statistics and tree-control tests. Its complete rerun passed with the original
timeouts and assertions, after other heavy checks finished. No runtime or test
code was changed to obtain that rerun result.

The final Chromium smoke run passed 16 tests with the authenticated two-account
collaboration scenario intentionally skipped (`E2E_AUTH_ROLE_HARNESS=false`).
An earlier attempt failed to render the viewer's tree within the existing wait;
that case passed three isolated repetitions, followed by the complete clean
smoke run (1.4 minutes). No assertions were relaxed and no application/test
code changed between attempts. These are local seeded browser checks, not the
post-deployment archive check.

## Remaining Gate

Create the approved checkpoint commits/push, verify GitHub Actions and Vercel,
and rerun on the deployed frontend. The shared database function is corrected;
the frontend read correction also protects relationships in old checkpoints.
The separate account-deletion lifecycle, private audio and legacy migration/
automatic cleanup activation items remain outside this round. No release or
owner visual approval is implied.
