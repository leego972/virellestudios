# Quality and Security Pass — 21 July 2026

This checkpoint branch starts from current `main` and follows a read-only-first audit.

## Verification scope

- frozen-lockfile dependency installation
- TypeScript, unit/integration tests and production build
- unsuppressed full and production dependency audits
- expanded tracked-secret scan
- static inventory of dynamic execution, process execution, raw HTML sinks, permissive security settings, environment fallbacks and server-side URL-fetch surfaces
- CodeQL security-and-quality analysis
- full remote-branch and pull-request inventory

## Repairs applied for verification

- removed dependency-advisory suppressions and upgraded vulnerable low/moderate transitive packages
- changed CI to verify the committed lockfile rather than rewrite it
- strengthened secret-pattern scanning and the audit severity gate
- added fixed-window atomic Redis rate limiting
- added OAuth initiation, password-login and callback rate limits
- made OAuth callback origin canonical and production-configured
- required a verified GitHub email before account linking
- added exact provider-host checks instead of substring URL checks
- added bounded public HTTPS media download validation for transcription
- disabled production debug-log access by default and removed secrets from query strings
- validated service-worker control messages
- removed production `unsafe-eval` from CSP
- parameterised the remaining raw project-thumbnail SQL update
- repaired verified chart, series-bible and unreachable-code defects

Existing product features were not deleted or replaced based solely on static reachability assumptions. Stale feature branches are being connected through recovery PRs rather than blindly merged.
