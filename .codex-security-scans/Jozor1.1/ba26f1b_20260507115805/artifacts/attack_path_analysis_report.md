# Attack Path Analysis

## CAND-001

Attack path:

1. Attacker creates or modifies a Jozor backup/Drive JSON payload containing a person source URL like `javascript:fetch('/...')` or other script payload suitable for an anchor navigation context.
2. Victim loads that Drive file/backup into Jozor.
3. The app preserves the malicious `sources` array and displays the person biography sources.
4. Victim clicks the source icon.
5. Browser executes the URL in the application origin.

Security impact:

- Read browser-accessible app state and local/session storage.
- Potentially steal Supabase/Google-related tokens present in browser-accessible storage.
- Act as the victim within the app UI/session.
- Exfiltrate private family-tree data visible to the victim.

Severity calibration: Medium. User interaction is required and the source is imported/shared data, but the sink executes in a token-bearing web app context.
