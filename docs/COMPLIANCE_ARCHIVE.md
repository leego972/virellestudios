# Adult Studio Compliance & Retention Operations

## Architecture

Virelle uses three deliberately separate surfaces:

1. **Standard Studio** — non-explicit film production, standard Swappys effects and general broadcasting.
2. **Adult Studio** — a separate verified workspace for lawful adult-only generation, transformations and recorded broadcasting.
3. **Compliance & Evidence Vault** — administrator-only access to private retention copies, legal holds, incident review, confirmed blacklisted users and evidence-access logs.

Adult access is attached to the individual operating the account, not a company. Access requires:

- Active paid Virelle membership.
- Complete legal identity and residential-address profile.
- Confirmed age of 18 or older and an explicit 18+ declaration.
- Phone two-factor verification.
- Government ID and matching selfie through Stripe Identity.
- Matching cardholder name.
- Account-responsibility declaration.
- Real-person likeness and consent policy acceptance.
- Private retention acknowledgement.

## Content policy state machine

A classifier result or user request never deactivates an account automatically.

- **Allowed** — request proceeds.
- **Blocked pending review** — generation or broadcasting does not begin; an incident record is created. The user account remains active.
- **Dismissed** — an administrator determines the request was lawful or misclassified. No account action is taken.
- **Confirmed violation** — an authorised administrator records reviewed evidence and types the explicit permanent-deactivation confirmation. The account is frozen, Adult Studio access is revoked, related archive records are placed on legal hold, and an organised Blacklisted Users record is created.

A tasteful, non-sexual teenage film scene may be produced in Standard Studio. Explicit or sexualised depictions involving minors or ambiguous-age subjects are prohibited everywhere. Minors, teenage characters, minor-looking characters and age regression below 18 are prohibited in Adult Studio regardless of sexual context.

## Media retention

Every completed Virelle video and completed broadcast recording is registered by the site-wide archive scanner. The scanner currently covers:

- `movies.fileUrl`
- `scenes.videoUrl`
- completed `generationJobs.resultUrl`
- completed `virelle_video_transform_jobs.outputVideoUrl`

Each archive record contains:

- Account ID and account name.
- Workspace (`standard` or `adult`).
- Media type (`video` or `broadcast`).
- Source table and source ID.
- Broadcast/render commencement timestamp.
- Completion timestamp.
- User-download URL.
- Private archive object key and status.
- Retain-until timestamp.
- Legal-hold status and reason.

The user's output URL remains available to the account owner. The private archive copy is separate and is accessible only through an administrator procedure that creates a short-lived signed URL and records the access event.

The default retention period is 90 days. `COMPLIANCE_RETENTION_DAYS` may be set higher but cannot reduce retention below 90 days. Legal hold prevents deletion regardless of the ordinary expiry date.

## Required environment variables

```env
# Existing primary object storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=
AWS_S3_ENDPOINT=
AWS_S3_PUBLIC_URL=

# Strongly recommended: separate private bucket with no public read policy
COMPLIANCE_ARCHIVE_BUCKET=

# Minimum accepted value is 90
COMPLIANCE_RETENTION_DAYS=90
COMPLIANCE_ARCHIVE_ENABLED=true
COMPLIANCE_ARCHIVE_SCAN_INTERVAL_MS=300000
COMPLIANCE_ARCHIVE_BATCH_SIZE=3
COMPLIANCE_ARCHIVE_MAX_BYTES=2147483648
COMPLIANCE_SIGNED_URL_SECONDS=300

# Canonical HTTPS application origin used in broadcast completion callbacks
PUBLIC_APP_URL=https://virelle.life

# Broadcast service
BROADCAST_BRIDGE_URL=
BROADCAST_BRIDGE_TOKEN=
```

The archive bucket must be private, encrypted at rest and excluded from public CDN policies. Do not configure a blanket bucket lifecycle rule that deletes retained objects without checking Virelle legal holds. Application-managed expiry is the source of truth.

## Broadcast bridge version 2 contract

The bridge request includes a mandatory `recording` object:

```json
{
  "required": true,
  "format": "mp4",
  "userDownloadRequired": true,
  "privateComplianceCopyRequired": true,
  "minimumRetentionDays": 90,
  "completionCallback": {
    "url": "https://virelle.life/api/trpc/virelleBroadcastRender.recordBroadcastCompletion",
    "protocol": "trpc-json-v1",
    "authorization": "Bearer <BROADCAST_BRIDGE_TOKEN>"
  }
}
```

When the broadcast ends, the bridge must invoke the callback with:

```json
{
  "jobId": 123,
  "sessionId": "bridge-session-id",
  "status": "completed",
  "recordingUrl": "https://secure-provider.example/recording.mp4",
  "previewUrl": "https://secure-provider.example/preview.jpg"
}
```

For failure, use `status: "failed"` and include `errorMessage`. The callback validates the bearer token using a timing-safe comparison and verifies that `sessionId` matches the stored provider session before updating the job.

## Administrative procedures

The Compliance & Evidence Vault supports:

- Run archive scan manually.
- List and filter retained media.
- Create a short-lived administrator download URL.
- Apply or remove a legal hold.
- Review blocked incidents.
- Dismiss a false positive without account action.
- Confirm a proven serious violation with an explicit confirmation phrase.
- View organised Blacklisted Users records.
- Review every evidence-access event.

Private archive URLs must not be copied into user-visible records, logs or support messages. Signed URLs expire within 15 minutes and default to five minutes.

## Deployment verification

Before enabling Adult Studio in production:

1. Run the database migration.
2. Configure a private compliance bucket and confirm public access is disabled.
3. Configure Twilio Verify, Stripe Identity and Stripe card setup.
4. Configure the broadcast bridge version 2 callback.
5. Complete `pnpm check`, `pnpm test`, `pnpm build` and dependency audit.
6. Generate one Standard Studio video and one Adult Studio test video using consenting adult test media.
7. Complete one recorded test broadcast and confirm it becomes downloadable automatically.
8. Confirm all three outputs appear in the private archive with correct account name and commencement time.
9. Confirm an ordinary account cannot access the admin vault or signed archive URLs.
10. Test a benign teen-romance prompt in Standard Studio and confirm it is allowed.
11. Test an explicit-minor prompt and confirm it is blocked pending review without freezing the account.
12. Dismiss the test incident and confirm no blacklist record is created.
