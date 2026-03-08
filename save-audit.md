# Save/Download Video Audit

## What exists:
1. **ProjectDetail Export tab** — Has "Export Full Film", "Export Trailer", "Export Scenes" buttons that export to My Movies library
2. **Movies page** — Has download button per movie (a.href = movie.fileUrl, a.download)
3. **MediaPlayer** — Has download button in top bar (line 386-399)
4. **DirectorCut** — Has a download icon in toolbar

## What's missing:
1. **SceneEditor** — No "Save to My Movies" / "Export to My Movies" button. Users generate videos but can't save them to their library from here
2. **SceneEditor scene cards** — No download button per scene video
3. **Storyboard** — No download/save option for scene videos
4. **ProjectDetail Overview** — No quick "Save All Videos" button
5. **ProjectDetail Scenes tab** — No download per scene

## Plan:
- Add "Save to My Movies" button in SceneEditor header (next to Play All)
- Add download button per scene in SceneEditor scene cards (for scenes with videoUrl)
- Add download button per scene in ProjectDetail Scenes tab
- The MediaPlayer already has download — that's good
