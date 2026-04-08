# Virelle Talent Search: Feature Spec & UX Design

## 1. Feature Overview
**Feature Name:** Virelle Casting
**Location:** Integrated directly into the Virelle Studios project workspace.
**Core Value:** Allows creators to browse, filter, shortlist, and cast premium AI-born digital talent (The Virelle Signature Cast) into their projects, ensuring high realism, consistency, and commercial safety.

## 2. Core User Journey
1. **Open Project:** User opens an existing or new Virelle project.
2. **Navigate to Casting:** User clicks the "Casting" tab in the project sidebar.
3. **Browse & Filter:** User views the Signature Cast roster, filtering by phenotype, age, genre fit, or role intent (e.g., "charismatic villain").
4. **View Actor Profile:** User clicks an actor card to view their full profile, including hero portraits, sample scenes, voice clips, and chemistry pairings.
5. **Shortlist & Compare:** User adds multiple actors to a "Shortlist" for side-by-side comparison.
6. **Cast Role:** User clicks "Cast as [Character Name]" to assign the actor to a project role.
7. **Integration:** The selected actor's visual and voice anchors are automatically applied to all character generation, scene generation, and dialogue generation for that role across the project.

## 3. Filtering & Matching System
The filtering system is designed to match traditional casting director workflows, avoiding superficial or stereotypical categorizations.

### Explicit Filters
- **Gender Presentation:** Male, Female, Androgynous/Fluid
- **Screen Age Band:** Child (7-12), Teen (13-17), Young Adult (18-25), Adult (26-45), Mature (46-60), Senior (60+)
- **Visual Phenotype:** Broad categories (e.g., East Asian, Mediterranean, African Diaspora) used only as visual descriptors, not locked identities.
- **Body Architecture:** Petite, Athletic, Curvy, Broad, Heavy-set, Lanky
- **Height Impression:** Short, Average, Tall, Imposing

### Vibe & Energy Filters (Semantic Tags)
- **Glamour Level:** High Fashion, Everyday, Gritty/Raw
- **Energy/Vibe:** Rugged, Comedic, Romantic Lead, Villainous, Prestige Drama, Action-ready, Warm/Maternal/Paternal
- **Voice/Accent Capability:** British RP, General American, London MLE, specific regional accents.

### Role Intent Search (AI Matching)
Users can type a natural language role description (e.g., "A slick con artist who hides a vulnerable side"). The system uses the Actor Bibles to return a "Best Matches" list, scoring actors based on their archetype, emotional strengths, and genre fit.

## 4. Actor Profile Pages
Each actor in the Signature Cast has a dedicated, highly polished profile page.

### Page Layout
- **Hero Header:** A stunning, cinematic portrait of the actor in their primary archetype look.
- **Quick Stats Bar:** Screen Age, Height Impression, Primary Accents, Cast Tier (Standard/Premium/Flagship).
- **Short Bio / Casting Hook:** A one-paragraph description of their screen presence (e.g., "Julian Vance brings a sharp, dangerous charisma to the screen, perfect for sophisticated thrillers and high-stakes romance.")
- **Best-For Tags:** Quick visual tags (e.g., `Neo-Noir`, `Action Lead`, `Sardonic Humor`).
- **Media Gallery:** 
  - *Sample Stills:* 4-6 high-quality images showing the actor in different lighting, wardrobes, and emotional states.
  - *Screen Tests:* Short video clips showing facial mobility, micro-expressions, and voice samples.
- **Chemistry Suggestions:** "Plays well opposite [Actor B] or [Actor C]."
- **Action Bar:** "Cast in Project", "Add to Shortlist", "Compare".

## 5. Integration with Project Generation
Once an actor is cast, their internal "Consistency Anchors" (a hidden set of highly specific prompt modifiers, LoRA weights, and voice cloning IDs) are seamlessly injected into the user's generation pipeline.
- **Image/Video Generation:** The prompt automatically appends the actor's visual anchors to ensure facial consistency across different shots and angles.
- **Audio Generation:** The dialogue system automatically selects the actor's assigned voice model and applies the chosen accent.
