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
- [ ] Batch scene editing

## Frontend - Timeline View
- [x] Visual timeline with scene thumbnails
- [x] Drag-and-drop scene reordering
- [x] Scene duration indicators
- [x] Quick edit from timeline

## Frontend - Generation & Export
- [x] Real-time progress tracking UI
- [x] Status updates and estimated completion
- [x] Pause/resume generation controls
- [ ] Export with resolution/quality options
- [ ] Download completed films

## GitHub
- [ ] Push code to new GitHub repository

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
