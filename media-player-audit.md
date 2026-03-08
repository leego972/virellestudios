# MediaPlayer Audit — Pages That Need It

## Already has MediaPlayer:
1. **SceneEditor.tsx** — Has MediaPlayer with playlist, triggered by play buttons on scenes
2. **Movies.tsx** — Has MediaPlayer with full playlist support

## Needs MediaPlayer added:
3. **ProjectDetail.tsx** — Overview page shows project thumbnail but NO play button, NO MediaPlayer. This is what the user sees on mobile. Needs: play button on project hero card + MediaPlayer integration
4. **DirectorCut.tsx** — Uses raw `<video>` tag (line 614), should use MediaPlayer instead
5. **Showcase.tsx** — Uses raw `<video>` tag (line 205), should use MediaPlayer instead

## Doesn't need MediaPlayer:
6. **AdPosterMaker.tsx** — Video ad URL, but it's a different workflow (ad generation)
7. **ProjectDetail.tsx audio** — Audio tracks use `<audio>` which is fine

## Mobile issues in SceneEditor:
- Thumbnail container `hidden sm:block` (line 854) — play button invisible on mobile
- Play overlay `opacity-0 hover:opacity-100` — doesn't work on touch
- Timeline play overlay same issue
