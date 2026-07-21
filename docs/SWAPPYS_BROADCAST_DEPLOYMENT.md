# Swappys Studio → Broadcast Deployment

## Implemented flow

1. A Virelle user creates a consented Swappys Studio job inside a project scene.
2. The resulting Swappys job ID, source plate, actor reference, enhanced output, transform goal, target age and creative mode are loaded server-side by ownership-checked handoff.
3. Studio Render or Broadcast uses the user's configured BYOK video provider.
4. Broadcast output credentials are validated, encrypted before database storage and never returned by the API.
5. The broadcast worker decrypts provider/output credentials only for the duration of a bridge submission.
6. The bridge receives the exact Swappys job/media and sends the transformed feed to up to five configured outputs.

## Required production environment

```text
BROADCAST_BRIDGE_URL=https://your-controlled-broadcast-bridge.example/v1/sessions
BROADCAST_BRIDGE_TOKEN=<random secret of at least 24 characters>
API_KEY_ENCRYPTION_SECRET=<existing strong encryption secret used by Virelle securityEngine>
```

`BROADCAST_BRIDGE_URL` must use HTTPS and must not contain embedded credentials. `BROADCAST_BRIDGE_TOKEN` is sent as a bearer token from the Virelle worker to the controlled bridge.

## Bridge request contract

The Virelle worker sends an authenticated JSON `POST` containing:

- Virelle job, user, project, scene and source Swappys job identifiers
- selected BYOK provider and the decrypted provider key
- source/reference video URLs and image URLs
- transform goal, target age/presentation and creative mode
- director notes and watermark/provenance mode
- one to five validated output objects containing destination, ingest URL and stream key

The bridge must return JSON with at least:

```json
{
  "sessionId": "bridge-session-id",
  "status": "processing",
  "outputUrl": null,
  "previewUrl": null
}
```

## Security requirements for the bridge

- Accept requests only over HTTPS.
- Validate the Virelle bearer token with constant-time comparison.
- Never log provider keys or stream keys.
- Keep secrets in memory only for the active session.
- Restrict outbound connections to the validated destination selected by Virelle.
- Enforce session duration, cancellation and connection timeouts.
- Return opaque errors; do not expose provider credentials or output keys.
- Maintain audit events using identifiers and masked destinations only.

## Creative-mode boundary

Open Adult Creative mode is available only to age-verified users who confirm that every depicted or referenced person is an adult and that all likeness/media rights are held. It allows lawful mature, provocative, glamour, body-positive and adult-industry styling without unnecessary modesty filtering.

The server continues to block:

- minors or minor-coded subjects
- child/age-crossing transforms in Open Adult Creative mode
- explicit sexualised likeness transformations
- non-consensual content, coercion, blackmail or revenge content
- deceptive impersonation, fraud, fake evidence and verification bypass

## Operational status

When bridge variables are absent, Virelle stores output configuration securely and reports `waiting_for_provider`; it does not falsely report that a live stream has started. Once the bridge variables are configured, the worker submits eligible sessions automatically.
