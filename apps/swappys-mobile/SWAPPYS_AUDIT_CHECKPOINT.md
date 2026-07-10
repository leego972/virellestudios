# Swappys Functional Audit Checkpoint — 2026-07-11

## Completed on repair branch

- Replaced the upload-only shell with a functional mobile UI baseline.
- Added live camera preview using `getUserMedia`.
- Added local recording controls with supported MIME detection.
- Added delete/reset handling and media-track cleanup.
- Added source and target image previews.
- Restricted uploads to JPEG, PNG, and WebP.
- Added a 10 MB per-image client limit.
- Added explicit likeness/media consent before submission.
- Added anti-impersonation and misuse declaration.
- Added request timeout and structured API error handling.
- Added result display, retry, delete, save bridge event, and upgrade flow.
- Kept a small visible AI-altered watermark in the camera preview.
- Kept preview watermark handling for generated results.

## Required before production release

- Enforce `consentConfirmed` in `vfxSfx.swappysMobileSwap` server input and reject false/missing consent.
- Validate image data-URL MIME type and decoded byte length server-side.
- Add endpoint-specific anonymous rate limiting and abuse telemetry.
- Add server-side content moderation before and after transformation.
- Confirm the selected image provider performs an actual identity-preserving face-and-body transformation rather than generic image regeneration.
- Implement native save-to-photo-library handling for the `saveResult` bridge event.
- Verify camera, microphone, recording, upload, and output on a physical iPhone and Android device.
- Run TypeScript check, Expo export/build, and EAS submission validation.

## Product truth

The current production main branch was not a complete webcam transformation product. It was a two-image upload UI calling a generic image-generation route. This repair branch establishes a safer functional baseline but must not be represented as fully production-verified until the server and physical-device checks above pass.
