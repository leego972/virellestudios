# Script System Full Audit

## What Already Exists (DO NOT REBUILD)

### Script Writer (ScriptWriter.tsx)
- ✅ Element-based screenplay editor (scene-heading, action, character, dialogue, parenthetical, transition)
- ✅ Auto-save (3s debounce)
- ✅ Export: .txt, .fountain, screenplay-formatted .txt
- ✅ AI Generate Full Script (calls script.aiGenerate)
- ✅ AI Assist: continue, rewrite, dialogue (3 buttons)
- ✅ Script list sidebar
- ✅ Tab key cycles element types
- ✅ Enter key smart next element
- ✅ Backspace on empty removes element
- ✅ Page count estimate in footer

### Script AI (server/routers.ts - script router)
- ✅ aiGenerate: full screenplay from project details (UPGRADED - new system prompt applied)
- ✅ aiAssist: continue, rewrite, dialogue, action-line, transition (UPGRADED - new prompts)
- ✅ NEW: scene-expand, polish, character-voice, scene-beat (added in Phase 2)
- ✅ Character block passed to aiGenerate (name, description, age, gender, role)
- ✅ Scene block passed to aiGenerate

### Character System (Characters.tsx + DeepCharacterProfile.tsx)
- ✅ Full character profile: name, age, gender, ethnicity, build, height, hair, eyes, etc.
- ✅ AI generate from scratch (full form)
- ✅ AI generate from photo upload
- ✅ DeepCharacterProfile: Identity, Appearance, Personality, Speech, Environment, Wardrobe, Relationships
- ✅ voiceType, voiceDescription, speechPattern, accent fields in DB schema
- ✅ voiceId field in DB schema (for ElevenLabs)

### Voice Acting Engine
- ✅ ElevenLabs, OpenAI TTS, Pollinations providers
- ✅ "narrator" preset voice in ElevenLabs presets
- ✅ Gender/age auto-assignment for unnamed characters
- ✅ CharacterVoice interface with voiceId, gender, age, accent

### Scene System
- ✅ External footage upload per scene (externalFootageUrl, externalFootageType)
- ✅ Scene ordering (orderIndex)
- ✅ DirectorCut page: drag-drop scene reordering, trim, split, merge

## GAPS — What Needs Building

### ScriptWriter UI Gaps
- ❌ NO template picker (7 genre templates with beat sheets)
- ❌ Only 3 AI assist buttons shown (continue, rewrite, dialogue) — 4 new ones not wired to UI
- ❌ NO import external scenes (paste text, upload .fountain/.txt file)
- ❌ NO scene connector panel (link imported scenes into screenplay flow)
- ❌ NO instructions input before AI generate
- ❌ NO word count (only page count)
- ❌ NO screen time estimate (only page count)

### Character System Gaps
- ❌ Photo upload guidance is minimal ("Best results with clear, well-lit face photos")
- ❌ No explicit guidance: face vs full body, what angle, lighting requirements
- ❌ voiceDescription not shown in the character form UI (only in DeepCharacterProfile)
- ❌ Character arc/motivation not prominently surfaced in the script context

### Voice-to-Character Matching Gaps
- ❌ voiceId, voiceType, voiceDescription NOT passed from character DB to filmPipeline
- ❌ characterVoices map NOT built from character profiles before calling generateSceneDialogue
- ❌ Narrator/V.O./god voice/off-screen speakers NOT handled as special cases
- ❌ Script AI charBlock only passes name, description, age, gender, role — missing voice info

### Script AI Generation Gaps
- ❌ charBlock missing: voiceType, speechPattern, accent, motivation, backstory, arc
- ❌ No templateId/genre template scaffold passed to AI generation

## Build Order (Phase 3 onwards)
1. Script template data file (shared/scriptTemplates.ts)
2. ScriptWriter UI overhaul (template picker, all 7 AI buttons, import, scene connector, word count)
3. Character photo guidance upgrade + wire voice fields into script AI charBlock
4. Voice-to-character matching in filmPipeline (pass voiceId/voiceType/voiceDescription)
5. Push to GitHub
