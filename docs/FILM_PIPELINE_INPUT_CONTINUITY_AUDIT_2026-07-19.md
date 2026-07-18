# Virelle Studios — Film Pipeline Input Fidelity & Continuity Audit

Date: 2026-07-19

## Executive finding

The pipeline contains strong continuity components, but it does **not yet guarantee that every user-entered scene variable is carried into every generated clip**. Several fields exist in the scene model but are not explicitly forwarded into the extended-scene request. This creates a real risk that camera, location, action, colour, blocking, VFX, makeup, stunt and other user specifications are ignored unless they happen to be repeated inside `visualDescription`.

The current implementation must therefore be treated as **partially wired**, not fully production-safe for high-fidelity film generation.

## Confirmed strengths

- Scenes are sorted by `orderIndex` before generation.
- Scene generation becomes sequential when scene continuity is enabled.
- The previous scene's last frame is used as the next scene's visual reference.
- Character DNA, wardrobe, props, locations, character state and project visual DNA are loaded for coherence.
- Character voice assignment is built from project character profiles.
- Genre-aware shot grammar is used rather than purely random camera selection.
- Generated sub-clips are chained through previous-frame references.

## Confirmed input-wiring gaps

The scene input type contains these fields:

- country
- city
- locationDetail
- season
- cameraAngle
- cameraMovement
- lensType
- focalLength
- depthOfField
- shotType
- frameRate
- aspectRatio
- colorGrading
- colorPalette
- colorTemperature
- emotionalBeat
- foregroundElements
- backgroundElements
- characterBlocking
- actionDescription
- vfxElements
- vfxNotes
- makeupNotes
- stuntNotes
- wardrobeOverrides

However, the full-film call to `generateExtendedScene()` explicitly forwards only a narrower subset such as mood, lighting, time of day, weather, genre, character descriptions, a basic location type, negative prompt, previous frame, prompt override, wardrobe context, scene type, sound notes and seed.

### Consequences

1. A user can set a specific lens, focal length or camera movement and the generated shot grammar can override or ignore it.
2. A detailed location can be reduced to only `locationType`, losing country, city and location detail.
3. Blocking, physical actions and foreground/background requirements may disappear if not duplicated in the free-text description.
4. Colour palette and grading choices are not guaranteed to reach the video provider.
5. VFX, makeup and stunt specifications are not guaranteed to reach every sub-shot.
6. `aiPromptOverride` currently applies only to the first sub-shot, so later clips can drift away from the director's exact instruction.
7. The final provider request hard-codes `16:9`, `1080p` and generated shot grammar, which may conflict with user-selected aspect ratio, resolution or camera choices.

## Required production-grade correction

### 1. Create one canonical scene specification

Before any generation call, compile every user input into an immutable `CanonicalSceneSpec` containing:

- narrative objective
- action beat
- emotional beat
- cast present
- exact character state
- blocking and eyelines
- wardrobe
- props
- location and geography
- time, season and weather
- foreground and background
- camera, lens, focal length and movement
- frame rate and aspect ratio
- lighting, colour palette and grade
- VFX, makeup and stunt requirements
- dialogue intent
- sound and music intent
- prohibited changes
- continuity entry state
- continuity exit state

No provider should receive raw form fields directly. Every provider should receive the same compiled specification.

### 2. Separate locked constraints from creative guidance

Each prompt should contain two blocks:

- `LOCKED REQUIREMENTS` — must be followed exactly
- `CREATIVE DIRECTION` — model may interpret cinematically

Character identity, wardrobe, props, geography, time, blocking, continuity state, dialogue facts and user camera overrides belong in locked requirements.

### 3. Apply user overrides to every sub-shot

A director override must either:

- replace the base creative description for **all** sub-shots, while continuity and safety anchors remain appended; or
- be explicitly labelled as first-shot-only in the UI.

The current first-sub-shot-only behaviour is ambiguous and unsafe.

### 4. Respect explicit camera settings

When the user specifies camera angle, movement, lens, focal length, shot type or depth of field, those values must take precedence over automatic shot grammar. Automatic grammar should fill only unspecified fields.

### 5. Preserve scene geography and screen direction

Continuity state must track:

- character positions
- facing direction
- eyelines
- entry and exit points
- held props
- injuries and dirt
- wardrobe condition
- time elapsed
- weather progression
- lighting direction
- camera side of the 180-degree line

A scene should not generate until its entry state matches the previous scene's exit state, unless the script explicitly establishes a transition.

### 6. Add pre-generation validation

Block generation when:

- no usable scene description exists
- referenced characters are missing
- character IDs do not resolve
- required location data is absent
- contradictory wardrobe or state assignments overlap
- duration is invalid
- aspect ratio or frame-rate values are unsupported
- dialogue names do not map to project characters

### 7. Add post-generation quality gates

Do not automatically accept a clip merely because the provider returned a URL. Each clip should be checked for:

- character identity consistency
- correct wardrobe
- correct props
- correct number of visible characters
- scene/location match
- action completion
- continuity with previous frame
- visual artefacts
- text/logos/watermarks
- anatomy defects
- camera and aspect-ratio compliance
- dialogue/audio duration alignment

Failed clips should be regenerated before final assembly.

### 8. Do not silently assemble incomplete films

The current final assembly can proceed using only successful scenes. Production behaviour should instead require either:

- all required scenes pass quality gates; or
- the user explicitly approves assembly with missing/failed scenes.

## Priority defects

### P0

- Wire every scene field into a canonical specification.
- Apply exact user overrides across all relevant sub-shots.
- Prevent incomplete films from being silently marked complete.
- Add provider-output quality validation.

### P1

- Track blocking, eyeline and screen direction.
- Honour explicit camera/lens/aspect-ratio values.
- Validate dialogue speaker mapping and timing.
- Add scene entry/exit continuity state.

### P2

- Add continuity scoring and automatic regeneration thresholds.
- Add shot-level audit logs showing which user variables reached each provider request.
- Add a preview of the exact compiled prompt before spending credits.

## Acceptance criteria

A pipeline release is acceptable only when:

1. Every user-entered field is either mapped to the canonical scene spec or explicitly marked unsupported in the UI.
2. The exact compiled prompt and locked constraints are visible before generation.
3. Every provider request can be traced back to user inputs.
4. Explicit user settings override defaults.
5. Character, wardrobe, props, geography and scene state remain consistent across clips and scenes.
6. Failed continuity or quality checks trigger regeneration rather than silent acceptance.
7. Final assembly cannot report success while required scenes are missing.
8. An end-to-end test film demonstrates logical scene order, stable characters, consistent wardrobe and locations, coherent action, correct dialogue and no unexplained visual resets.
