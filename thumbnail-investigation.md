# Project Thumbnail Investigation

## Current Behavior
- Both Home.tsx and Projects.tsx check `project.thumbnailUrl`
- If it exists, they show it as an `<img>` tag
- If not, they show a generic Film icon placeholder

## Root Cause
- The `project.thumbnailUrl` field is likely NULL for most projects
- Projects don't auto-set a thumbnail from their scenes
- Need to check: does the project.list query return thumbnailUrl?
- Need to check: does the backend auto-populate thumbnailUrl from scenes?

## Solution Options
1. Backend: Auto-set project.thumbnailUrl when a scene gets a thumbnail/video
2. Frontend: Fallback to first scene's thumbnailUrl when project.thumbnailUrl is null
3. Both: Backend auto-sets + frontend fallback for immediate display
