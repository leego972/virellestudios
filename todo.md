# VIBA Studios - Project TODO

## Database & Schema
- [x] Projects table (title, description, rating, duration, mode, status, thumbnail)
- [x] Characters table (name, description, photoUrl, attributes, projectId)
- [x] Scenes table (projectId, orderIndex, title, description, all scene parameters)
- [x] GenerationJobs table (projectId, status, progress, estimatedTime)

## Backend API
- [x] Project CRUD (create, list, get, update, delete)
- [x] Character CRUD with S3 photo upload
- [x] Scene CRUD with ordering and batch operations
- [x] Quick Generate endpoint (accepts plot, rating, duration, characters)
- [x] Manual scene generation endpoint (per-scene AI generation)
- [x] Generation progress tracking endpoint
- [x] Project export endpoint
- [x] File upload endpoint for character photos

## Frontend - Theme & Layout
- [x] Dark cinematic theme with gold accents
- [x] Dashboard layout with sidebar navigation
- [x] Responsive design for mobile and desktop

## Frontend - Dashboard
- [x] Project listing with grid/list view
- [x] Project cards with thumbnails and status
- [x] Create new project flow
- [x] Project search and filtering

## Frontend - Quick Generate Mode
- [x] Step-by-step wizard UI
- [x] Character photo upload with preview
- [x] Plot description input (rich text)
- [x] Rating selector (G/PG/PG-13/R)
- [x] Duration selector
- [x] Generation preview and confirmation
- [x] Progress tracking during generation

## Frontend - Character Library
- [x] Character grid with photo thumbnails
- [x] Add/edit character modal with photo upload
- [x] Character attributes editor
- [x] Reuse characters across scenes

## Frontend - Manual Scene Editor
- [x] Scene list with drag-and-drop reordering
- [x] Scene detail editor with all parameters:
  - [x] Time of day selector
  - [x] Location/setting type
  - [x] Real estate style
  - [x] Vehicle selection
  - [x] Weather conditions
  - [x] Lighting setup
  - [x] Camera angle
  - [x] Character positioning
- [x] Scene description text input
- [x] Scene preview generation
- [x] Batch scene editing (via scene list with reorder and inline controls)

## Frontend - Timeline View
- [x] Visual timeline with scene thumbnails
- [x] Drag-and-drop scene reordering
- [x] Scene duration indicators
- [x] Quick edit from timeline

## Frontend - Generation & Export
- [x] Real-time progress tracking UI
- [x] Status updates and estimated completion
- [x] Pause/resume generation controls
- [x] Export with resolution/quality options (format, resolution, quality, frame rate, aspect ratio, include toggles)
- [x] Download completed films (export full film, trailer only, individual scenes)

## GitHub
- [x] Push code to GitHub repository (leego972/vibastudios)

## Design Direction
- [x] Clean, minimal, uncluttered design with lots of whitespace
- [x] Subtle typography, refined cinematic feel
- [x] No visual noise — focus on functionality and clarity

## Scene Preview
- [x] Generate AI preview of individual scenes before final production
- [x] Preview button on each scene card in the editor
- [x] Preview modal showing generated scene image with scene parameters
- [x] Option to regenerate preview with adjusted parameters

## AI Trailer Generation
- [x] Backend endpoint for AI trailer generation (analyzes plot, key scenes, characters)
- [x] Trailer generation button on project detail page
- [x] AI selects most impactful scenes and creates a compelling trailer sequence
- [x] Trailer preview player with download option
- [x] Trailer progress tracking during generation

## Trailer Content Rules
- [x] Trailers must NEVER spoil key plot twists, endings, or major reveals
- [x] ALL trailers must be G-rated regardless of film classification
- [x] Trailers should build intrigue and excitement while respecting film context
- [x] AI prompt must explicitly instruct no violence, no mature content, no spoilers

## Comprehensive Input Fields
- [x] Character form: name, age, gender, ethnicity, build, hair color, role type, full description, photo upload
- [x] Project form: title, description, genre, rating, duration, plot summary, resolution, quality
- [x] Scene form: all parameters with clear labels and helpful defaults

## Script Writer Feature
- [x] Scripts table in database (projectId, title, content, version, format metadata)
- [x] Backend CRUD for scripts (create, read, update, delete, list by project)
- [x] AI script generation endpoint (generate full script from plot/scenes)
- [x] AI script assist endpoint (continue writing, rewrite selection, add dialogue)
- [x] Script Writer page with industry-standard screenplay formatting
- [x] Scene headings (INT./EXT., location, time of day)
- [x] Action lines, character cues, dialogue blocks, parentheticals, transitions
- [x] Auto-formatting as director types (smart detection of element types)
- [x] AI-assisted writing (generate next scene, rewrite selection, suggest dialogue)
- [x] Script export/download
- [x] Integration with project detail page and navigation

## Day/Night Mode
- [x] Enable switchable theme in ThemeProvider
- [x] Add light theme CSS variables with proper contrast
- [x] Add theme toggle button in sidebar/header
- [x] Ensure all pages look good in both light and dark modes

## Bug Fixes
- [x] Ensure no login loop exists in auth flow
- [x] Unauthenticated users should see login screen without redirect loops
- [x] ScriptWriter page auth guard added (was outside DashboardLayout)

## Soundtrack / Background Music
- [x] Soundtracks database table (projectId, sceneId nullable, title, artist, genre, mood, fileUrl, duration)
- [x] Backend CRUD for soundtracks (create, list by project, list by scene, update, delete)
- [x] S3 upload support for audio files
- [x] Project-level soundtrack manager in ProjectDetail page
- [x] Per-scene soundtrack selector in SceneEditor
- [x] Audio preview/playback controls
- [x] Mood and genre tagging for easy selection

## AI Character Generator
- [x] Backend route to generate AI character portrait from feature selections
- [x] Feature selection UI: age range, gender, ethnicity, build, hair color/style, eye color, facial features, skin tone, clothing style
- [x] AI generates Hollywood-grade photorealistic character portrait from selections
- [x] Generated character saved to character library with AI badge
- [x] AI character generator accessible from Characters page and ProjectDetail character tab
- [x] Hollywood-grade prompt: ARRI ALEXA 65, Zeiss Master Prime, Rembrandt lighting, 16K, cinematic color grading

## Storyboard View
- [x] Storyboard page with visual grid of all scene preview images
- [x] Scene cards showing thumbnail, title, duration, and key parameters
- [x] Click to expand scene details or edit
- [x] Print-friendly storyboard layout
- [x] Navigation link from project detail

## Project Duplication
- [x] Duplicate project backend route (clones project, characters, scenes, soundtracks)
- [x] Duplicate button in project detail Tools tab
- [x] Duplicated project opens in draft status with "(Copy)" suffix

## Color Grading Presets
- [x] 12 color grading presets (Natural, Warm Vintage, Cold Thriller, Neon Cyberpunk, Golden Hour, Noir, Bleach Bypass, Tropical, Horror, Romantic, Sci-Fi, Western)
- [x] Color grading page with preset selector and visual gradient swatches
- [x] Fine-tune sliders: temperature, tint, contrast, saturation, highlights, shadows, vibrance, clarity
- [x] Live preview strip with CSS filter visualization
- [x] Saves to project via colorGrading field

## Shot List / Production Notes
- [x] AI shot list generator from scenes (auto-generates professional shot list)
- [x] Shot table: shot number, scene, shot type, camera, lens, framing, action, dialogue, props, wardrobe, VFX, notes
- [x] Print button for shot list export

## Continuity Tracker
- [x] AI continuity checker analyzes all scenes for errors
- [x] Severity-based issue display (high/medium/low)
- [x] Categories: wardrobe, time, weather, character, prop continuity
- [x] Suggestions for fixing each issue

## Scene Transition Effects
- [x] Transition type field added to scenes schema
- [x] Transition types: cut, fade, dissolve, wipe, iris, cross-dissolve

## Film Credits Editor
- [x] Credits editor page with opening and closing credits sections
- [x] Role-based credit entries with common role presets
- [x] Character name field for cast credits
- [x] Live credits preview in cinematic black style
- [x] Add/delete credits with section selection

## Location Scout
- [x] Locations table in database (projectId, sceneId, name, address, type, description, referenceImages, notes, tags)
- [x] Backend CRUD for locations + AI location suggestion endpoint
- [x] Location Scout page with search, browse by type, and save reference images
- [x] Location cards with image gallery, type badges, and scene assignment
- [x] AI-powered location suggestions based on scene descriptions
- [x] AI reference image generation for locations

## Mood Board
- [x] MoodBoard items table in database (projectId, type, imageUrl, text, color, category)
- [x] Backend CRUD for mood board items + AI image generation
- [x] Mood Board page with Pinterest-style masonry grid
- [x] Pin reference images, color palettes, style notes, and text cards
- [x] AI image generation from text descriptions
- [x] Category filtering (Colors, Images, Typography, Textures, References, Notes)

## Multi-Language Subtitles
- [x] Subtitles table in database (projectId, language, languageName, entries JSON, isGenerated, isTranslation)
- [x] Backend CRUD for subtitles + AI generation + AI translation endpoints
- [x] Subtitles page with language sidebar and inline entry editor
- [x] AI auto-generate subtitles from project scenes/dialogue
- [x] AI translate subtitles to 24 languages
- [x] SRT and VTT export for each language
- [x] Inline text editing for individual subtitle entries

## Comprehensive Story/Narrative Inputs
- [x] Add story fields to database: mainPlot, sidePlots, twists, characterArcs, themes, setting, actStructure, targetAudience, tone, openingScene, climax, storyResolution
- [x] Expand NewProject form with dedicated Story & Narrative section (3 tabs: Basics, Story & Plot, Narrative Details)
- [x] Main Plot textarea (detailed main storyline)
- [x] Side Plots textarea (secondary storylines)
- [x] Plot Twists textarea (key twists and surprises)
- [x] Character Arcs textarea (how characters develop)
- [x] Themes input (central themes and messages)
- [x] Setting/World textarea (world-building details)
- [x] Act Structure selector (7 options: three-act, five-act, hero's journey, nonlinear, episodic, circular, in-medias-res)
- [x] Tone/Style selector (16 options)
- [x] Opening Scene description
- [x] Climax description
- [x] Resolution/Ending description
- [x] Target Audience selector (7 options)
- [x] Story tab added to ProjectDetail with full StoryEditor component (editable, save-on-change)

## Dialogue Editor
- [x] Dialogues table in database (projectId, sceneId, characterId, characterName, line, emotion, direction, orderIndex)
- [x] Backend CRUD for dialogues + AI dialogue suggestion endpoint
- [x] Dialogue Editor page with character-based conversation view
- [x] AI suggestions for natural speech patterns matching character personality
- [x] Emotion and direction tags per line
- [x] Scene-based dialogue organization
- [x] Link to project detail Tools tab

## Production Budget Estimator
- [x] Budgets table in database (projectId, totalEstimate, breakdown JSON, generatedAt)
- [x] Backend AI budget analysis endpoint (analyzes scenes, locations, effects)
- [x] Budget Estimator page with category breakdown (cast, locations, VFX, props, crew, post-production)
- [x] Visual budget distribution bar chart and expandable categories
- [x] AI analysis summary with recommendations
- [x] Link to project detail Tools tab

## Sound Effects Library
- [x] SoundEffects table in database (projectId, sceneId, name, category, fileUrl, duration, isCustom, isPreset, volume, startTime, tags)
- [x] Backend CRUD for sound effects + S3 upload for custom sounds
- [x] Standard preset sound effects library (footsteps, rain, thunder, wind, traffic, explosions, doors, glass, crowd, birds, ocean, fire, etc.)
- [x] Sound Effects page with category browsing and search
- [x] Custom sound upload with audio preview
- [x] Assign sound effects to specific scenes
- [x] Volume and timing controls per effect
- [x] Audio preview/playback for all sounds
- [x] Link to project detail Tools tab

## Project Collaboration
- [x] Collaborators table in database (projectId, userId, role, invitedBy, inviteToken, status)
- [x] Backend routes: invite collaborator, accept invite, list collaborators, remove collaborator, update role
- [x] Collaboration page with team member list and role management
- [x] Invite link generation with unique tokens
- [x] Collaborator roles: viewer, editor, producer, director
- [x] Accept invite flow for new collaborators
- [x] Link to project detail Tools tab

## Production Workflow Audit
- [x] Audit full user journey: project creation → story → characters → scenes → generation → export
- [x] Ensure logical flow between Quick Generate and Manual modes
- [x] Verify all tools are accessible at the right stage of production
- [x] Scene editor has comprehensive parameters (time, weather, lighting, camera, location, real estate, vehicles, mood)
- [x] Story inputs are thorough (main plot, side plots, twists, arcs, themes, setting, opening, climax, resolution)
- [x] All tools accessible from project detail Tools tab

## Rename to Virelle Studios
- [x] Rename all occurrences of "VIBA Studios" to "Virelle Studios" in codebase
- [x] Rename all occurrences of "VIBA" to "Virelle" in codebase
- [x] Rename GitHub repo from vibastudios to virellestudios
- [x] Update title in index.html and DashboardLayout

## Railway Deployment Config
- [x] Add Dockerfile for production build
- [x] Add railway.toml configuration
- [x] Add .dockerignore
- [x] Ensure build works for Railway deployment

## Domain Setup
- [x] Add DEPLOYMENT.md with Railway + GoDaddy DNS instructions for Virelle.life

## Logo Integration
- [x] Download user's logo from Dropbox
- [x] Upload logo to S3 CDN
- [x] Replace logo in sidebar/DashboardLayout
- [x] Replace logo on login/landing page
- [x] Update favicon
- [x] Update logo in index.html (favicon + apple-touch-icon)

## GitHub Repo Rename
- [x] Rename GitHub repo from vibastudios to virellestudios
- [x] Update local git remote URL

## Railway Deployment (Live)
- [x] Install Railway CLI and authenticate
- [x] Create Railway project
- [x] Add MySQL database
- [x] Deploy service from GitHub repo
- [x] Configure environment variables
- [x] Add virelle.life custom domain
- [ ] Provide exact GoDaddy DNS settings

## Access Restriction
- [x] Restrict app access to leego972@gmail.com only
- [x] Block login for all other emails with clear error message
- [x] Add email whitelist check in backend protectedProcedure

## My Movies Library
- [x] Create movies table in database (title, type: scene/trailer/film, fileUrl, thumbnailUrl, projectId, duration, fileSize, description)
- [x] Backend CRUD for movies (list, upload, delete, download)
- [x] My Movies page with grid/list view
- [x] Filter by type (scenes, trailers, full films)
- [x] Video preview/playback
- [x] Download button for each movie
- [x] Add My Movies to sidebar navigation

## UX Fix: Access Denied Screen
- [x] Remove confusing "Access Denied + Sign out" dead-end screen
- [x] Non-whitelisted users should be auto-logged out and redirected to login with a toast message
