/**
 * Director's Assistant Tool Definitions
 *
 * LLM function-calling schemas for the Virelle AI Director.
 * Each tool maps to a real backend action the AI can execute on behalf of the user.
 */

import type { Tool } from "./_core/llm";

// ─── Project Tools ───────────────────────────────────────────────────

const listProjects: Tool = {
  type: "function",
  function: {
    name: "list_projects",
    description:
      "List all of the user's film projects. Returns project titles, genres, statuses, and scene counts. Use this to understand what projects exist before taking action.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

const getProject: Tool = {
  type: "function",
  function: {
    name: "get_project",
    description:
      "Get full details of a specific project including all scenes, characters, and metadata.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The ID of the project to retrieve" },
      },
      required: ["projectId"],
    },
  },
};

const createProject: Tool = {
  type: "function",
  function: {
    name: "create_project",
    description:
      "Create a new film project for the user. Use this when the user asks to start a new film, project, or story.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "The title of the film project" },
        description: { type: "string", description: "A brief description of the project" },
        genre: { type: "string", description: "Film genre (e.g. Drama, Thriller, Comedy, Sci-Fi, Horror, Romance, Action, Documentary)" },
        tone: { type: "string", description: "Tone of the film (e.g. dark, comedic, suspenseful, romantic, action-packed)" },
        rating: { type: "string", enum: ["G", "PG", "PG-13", "R"], description: "Content rating" },
        plotSummary: { type: "string", description: "A short summary of the plot" },
        setting: { type: "string", description: "World-building details, time period, universe" },
        targetAudience: { type: "string", description: "Who the film is for" },
      },
      required: ["title"],
    },
  },
};

const updateProject: Tool = {
  type: "function",
  function: {
    name: "update_project",
    description:
      "Update an existing project's details such as title, description, genre, plot, or settings.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The ID of the project to update" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        genre: { type: "string", description: "New genre" },
        tone: { type: "string", description: "New tone" },
        plotSummary: { type: "string", description: "Updated plot summary" },
        mainPlot: { type: "string", description: "Detailed main storyline" },
        themes: { type: "string", description: "Central themes and messages" },
        setting: { type: "string", description: "World-building details" },
        targetAudience: { type: "string", description: "Target audience" },
      },
      required: ["projectId"],
    },
  },
};

// ─── Scene Tools ─────────────────────────────────────────────────────

const listScenes: Tool = {
  type: "function",
  function: {
    name: "list_scenes",
    description:
      "List all scenes in a project in order. Returns scene titles, descriptions, status, and key parameters.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project ID to list scenes for" },
      },
      required: ["projectId"],
    },
  },
};

const createScene: Tool = {
  type: "function",
  function: {
    name: "create_scene",
    description:
      "Create a new scene in a project. Use this to add scenes to a film. Provide as much cinematic detail as possible.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project to add the scene to" },
        title: { type: "string", description: "Scene title" },
        description: { type: "string", description: "Detailed scene description — what happens, who is in it, the action" },
        timeOfDay: { type: "string", enum: ["dawn", "morning", "afternoon", "evening", "night", "golden-hour"], description: "Time of day" },
        weather: { type: "string", enum: ["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"], description: "Weather conditions" },
        lighting: { type: "string", enum: ["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"], description: "Lighting style" },
        cameraAngle: { type: "string", enum: ["wide", "medium", "close-up", "extreme-close-up", "birds-eye", "low-angle", "dutch-angle", "over-shoulder", "pov"], description: "Primary camera angle" },
        mood: { type: "string", description: "Scene mood (e.g. tense, romantic, melancholic, triumphant)" },
        locationType: { type: "string", description: "Location type (e.g. city street, forest, beach, interior office)" },
        duration: { type: "number", description: "Scene duration in seconds (default 30)" },
        dialogueText: { type: "string", description: "Key dialogue in this scene" },
        productionNotes: { type: "string", description: "Director notes for the crew" },
        cameraMovement: { type: "string", description: "Camera movement (e.g. static, dolly, crane, handheld, steadicam, drone)" },
        colorPalette: { type: "string", description: "Color palette description (e.g. warm amber and deep shadow)" },
      },
      required: ["projectId", "title", "description"],
    },
  },
};

const updateScene: Tool = {
  type: "function",
  function: {
    name: "update_scene",
    description:
      "Update an existing scene's details, description, camera settings, or production notes.",
    parameters: {
      type: "object",
      properties: {
        sceneId: { type: "number", description: "The scene ID to update" },
        title: { type: "string" },
        description: { type: "string" },
        timeOfDay: { type: "string", enum: ["dawn", "morning", "afternoon", "evening", "night", "golden-hour"] },
        weather: { type: "string", enum: ["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"] },
        lighting: { type: "string", enum: ["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"] },
        cameraAngle: { type: "string", enum: ["wide", "medium", "close-up", "extreme-close-up", "birds-eye", "low-angle", "dutch-angle", "over-shoulder", "pov"] },
        mood: { type: "string" },
        locationType: { type: "string" },
        duration: { type: "number" },
        dialogueText: { type: "string" },
        productionNotes: { type: "string" },
        cameraMovement: { type: "string" },
        colorPalette: { type: "string" },
      },
      required: ["sceneId"],
    },
  },
};

const deleteScene: Tool = {
  type: "function",
  function: {
    name: "delete_scene",
    description: "Delete a scene from a project. Only use when the user explicitly asks to remove or delete a scene.",
    parameters: {
      type: "object",
      properties: {
        sceneId: { type: "number", description: "The scene ID to delete" },
      },
      required: ["sceneId"],
    },
  },
};

// ─── Character Tools ──────────────────────────────────────────────────

const listCharacters: Tool = {
  type: "function",
  function: {
    name: "list_characters",
    description: "List all characters in a project or the user's global character library.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Project ID to list characters for. Omit to list the global library." },
      },
      required: [],
    },
  },
};

const createCharacter: Tool = {
  type: "function",
  function: {
    name: "create_character",
    description:
      "Create a new character for a project. Provide rich character details for best results.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Project to add the character to. Omit to add to global library." },
        name: { type: "string", description: "Character's full name" },
        description: { type: "string", description: "Physical description and visual appearance" },
        role: { type: "string", description: "Role in the story (e.g. hero, villain, mentor, comic relief, love interest)" },
        storyImportance: { type: "string", enum: ["lead", "supporting", "minor", "cameo"], description: "How important this character is" },
        occupation: { type: "string", description: "Character's occupation or role in the world" },
        nationality: { type: "string", description: "Character's nationality" },
        arcType: { type: "string", description: "Character arc type (e.g. hero, anti-hero, tragic, redemption, flat)" },
        moralAlignment: { type: "string", description: "Moral alignment (e.g. lawful-good, chaotic-neutral, true-neutral)" },
      },
      required: ["name"],
    },
  },
};

const updateCharacter: Tool = {
  type: "function",
  function: {
    name: "update_character",
    description: "Update an existing character's details.",
    parameters: {
      type: "object",
      properties: {
        characterId: { type: "number", description: "The character ID to update" },
        name: { type: "string" },
        description: { type: "string" },
        role: { type: "string" },
        storyImportance: { type: "string", enum: ["lead", "supporting", "minor", "cameo"] },
        occupation: { type: "string" },
        nationality: { type: "string" },
        arcType: { type: "string" },
      },
      required: ["characterId"],
    },
  },
};

// ─── Script Tools ─────────────────────────────────────────────────────

const listScripts: Tool = {
  type: "function",
  function: {
    name: "list_scripts",
    description: "List all scripts for a project.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project ID" },
      },
      required: ["projectId"],
    },
  },
};

const getScript: Tool = {
  type: "function",
  function: {
    name: "get_script",
    description: "Get the full content of a specific script.",
    parameters: {
      type: "object",
      properties: {
        scriptId: { type: "number", description: "The script ID to retrieve" },
      },
      required: ["scriptId"],
    },
  },
};

const generateScript: Tool = {
  type: "function",
  function: {
    name: "generate_script",
    description:
      "Generate a full AI screenplay/script for a project based on its scenes and characters. This uses AI to write the complete script.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project to generate a script for" },
        style: { type: "string", description: "Script style or format notes (e.g. 'feature film format', 'short film', 'TV pilot')" },
      },
      required: ["projectId"],
    },
  },
};

// ─── Shot List Tools ──────────────────────────────────────────────────

const generateShotList: Tool = {
  type: "function",
  function: {
    name: "generate_shot_list",
    description:
      "Generate a professional industry-standard shot list for a project. Includes shot numbers, types, camera movements, lens choices, and production notes.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project to generate a shot list for" },
      },
      required: ["projectId"],
    },
  },
};

// ─── Location Tools ───────────────────────────────────────────────────

const listLocations: Tool = {
  type: "function",
  function: {
    name: "list_locations",
    description: "List all scouted locations for a project.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project ID" },
      },
      required: ["projectId"],
    },
  },
};

const suggestLocations: Tool = {
  type: "function",
  function: {
    name: "suggest_locations",
    description:
      "Use AI to suggest filming locations for a project based on its genre, tone, and scenes. Returns real-world location suggestions with descriptions.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project to suggest locations for" },
      },
      required: ["projectId"],
    },
  },
};

// ─── Budget Tools ─────────────────────────────────────────────────────

const listBudgets: Tool = {
  type: "function",
  function: {
    name: "list_budgets",
    description: "List all budget estimates for a project.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project ID" },
      },
      required: ["projectId"],
    },
  },
};

// ─── Subtitle Tools ───────────────────────────────────────────────────

const generateSubtitles: Tool = {
  type: "function",
  function: {
    name: "generate_subtitles",
    description:
      "Generate AI subtitles for a scene based on its dialogue and description.",
    parameters: {
      type: "object",
      properties: {
        sceneId: { type: "number", description: "The scene to generate subtitles for" },
        language: { type: "string", description: "Language code (e.g. 'en', 'fr', 'es', 'de', 'zh'). Defaults to 'en'." },
      },
      required: ["sceneId"],
    },
  },
};

// ─── Mood Board Tools ─────────────────────────────────────────────────

const listMoodBoard: Tool = {
  type: "function",
  function: {
    name: "list_mood_board",
    description: "List all mood board items for a project.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project ID" },
      },
      required: ["projectId"],
    },
  },
};

// ─── Generation / Production Tools ───────────────────────────────────

const listGenerationJobs: Tool = {
  type: "function",
  function: {
    name: "list_generation_jobs",
    description:
      "List recent AI generation jobs for a project. Shows status, progress, and results.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project ID to check jobs for" },
      },
      required: ["projectId"],
    },
  },
};

// ─── Navigation Tool ──────────────────────────────────────────────────

const navigateTo: Tool = {
  type: "function",
  function: {
    name: "navigate_to",
    description:
      "Navigate the user to a specific page or section of the Virelle Studios app. Use this to direct the user to the right place after completing a task.",
    parameters: {
      type: "object",
      properties: {
        page: {
          type: "string",
          enum: [
            "dashboard",
            "projects",
            "project_detail",
            "scene_editor",
            "script_editor",
            "character_library",
            "shot_list",
            "mood_board",
            "location_scout",
            "budget",
            "subtitles",
            "generation",
            "settings",
            "pricing",
          ],
          description: "The page to navigate to",
        },
        projectId: { type: "number", description: "Project ID (required for project-specific pages)" },
        sceneId: { type: "number", description: "Scene ID (required for scene_editor)" },
        scriptId: { type: "number", description: "Script ID (required for script_editor)" },
      },
      required: ["page"],
    },
  },
};

// ─── Dialogue Tools ───────────────────────────────────────────────────

const generateDialogue: Tool = {
  type: "function",
  function: {
    name: "generate_dialogue",
    description:
      "Generate AI dialogue for a scene. Returns character lines with emotion and stage directions.",
    parameters: {
      type: "object",
      properties: {
        sceneId: { type: "number", description: "The scene to generate dialogue for" },
        context: { type: "string", description: "Additional context or direction for the dialogue (e.g. 'make it tense', 'they are arguing about money')" },
      },
      required: ["sceneId"],
    },
  },
};

// ─── Continuity Check Tool ────────────────────────────────────────────

const checkContinuity: Tool = {
  type: "function",
  function: {
    name: "check_continuity",
    description:
      "Run an AI continuity check on a project to find inconsistencies in character appearances, locations, props, and timeline.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "The project to check" },
      },
      required: ["projectId"],
    },
  },
};

// ─── User Context Tool ────────────────────────────────────────────────

const getUserContext: Tool = {
  type: "function",
  function: {
    name: "get_user_context",
    description:
      "Get the user's current subscription tier, credit balance, and account summary. Use this to understand what features are available before suggesting actions.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

// ─── Export ───────────────────────────────────────────────────────────

export const DIRECTOR_TOOLS: Tool[] = [
  // Project management
  listProjects,
  getProject,
  createProject,
  updateProject,
  // Scene management
  listScenes,
  createScene,
  updateScene,
  deleteScene,
  // Character management
  listCharacters,
  createCharacter,
  updateCharacter,
  // Script
  listScripts,
  getScript,
  generateScript,
  // Shot list
  generateShotList,
  // Locations
  listLocations,
  suggestLocations,
  // Budget
  listBudgets,
  // Subtitles
  generateSubtitles,
  // Mood board
  listMoodBoard,
  // Production
  listGenerationJobs,
  // Dialogue
  generateDialogue,
  // Continuity
  checkContinuity,
  // User context
  getUserContext,
  // Navigation
  navigateTo,
];

/** Human-readable description of what a tool is doing (for streaming UI) */
export function getDirectorToolDescription(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "list_projects": return "Checking your projects...";
    case "get_project": return `Loading project details...`;
    case "create_project": return `Creating project "${args.title || 'New Film'}"...`;
    case "update_project": return `Updating project...`;
    case "list_scenes": return "Loading scenes...";
    case "create_scene": return `Creating scene "${args.title || 'New Scene'}"...`;
    case "update_scene": return `Updating scene...`;
    case "delete_scene": return `Removing scene...`;
    case "list_characters": return "Loading characters...";
    case "create_character": return `Creating character "${args.name || 'New Character'}"...`;
    case "update_character": return `Updating character...`;
    case "list_scripts": return "Loading scripts...";
    case "get_script": return "Loading script...";
    case "generate_script": return "Writing your screenplay — this may take a moment...";
    case "generate_shot_list": return "Generating professional shot list...";
    case "list_locations": return "Loading locations...";
    case "suggest_locations": return "Scouting locations with AI...";
    case "list_budgets": return "Loading budget estimates...";
    case "generate_subtitles": return "Generating subtitles...";
    case "list_mood_board": return "Loading mood board...";
    case "list_generation_jobs": return "Checking production jobs...";
    case "generate_dialogue": return "Writing dialogue...";
    case "check_continuity": return "Running continuity check...";
    case "get_user_context": return "Checking your account...";
    case "navigate_to": return `Navigating to ${args.page || 'page'}...`;
    default: return "Working on it...";
  }
}

// ─── Director System Prompt ──────────────────────────────────────────────────
export function buildDirectorSystemPrompt(projectContext: string, directorInstructions: string): string {
  const lines: string[] = [
    "You are the Virelle AI Director — a world-class cinematic AI assistant and production partner built into Virelle Studios. You are the user's right hand in every stage of film and media production.",
    "",
    "## YOUR ROLE",
    "You are not just a chatbot. You are a fully capable production assistant who can take real actions inside the Virelle Studios platform on behalf of the user. You think, plan, and execute like a seasoned Head of Development at a major film studio.",
    "",
    "## OBEDIENCE AND CREATIVE DIRECTION",
    "CRITICAL: You must comply with the user's direction at all times. The user is the Director. You are their assistant. You do not override, second-guess, or deviate from their creative vision unless they explicitly grant you artistic leeway (e.g. 'go wild', 'surprise me', 'use your artistic judgment', 'be creative'). If they say write a scene in a specific way — write it exactly that way. If they specify a tone, genre, or style — follow it precisely. Your personal aesthetic preferences are irrelevant unless invited.",
    "",
    "## TOOL USE",
    "- When the user asks you to DO something (create, generate, write, add, update, delete, navigate) — USE THE APPROPRIATE TOOL immediately. Do not describe what you would do — just do it.",
    "- When the user asks a question, wants advice, or is brainstorming — answer conversationally without using tools.",
    "- After using a tool, always confirm what was done and offer the next logical production step.",
    "- Chain multiple tools in sequence when a task requires it (e.g. create project then create scene then generate script).",
    "",
    "## FILM AND CINEMA EXPERTISE",
    "You have deep encyclopaedic knowledge across all phases of production.",
    "",
    "Pre-Production: Screenplay structure (three-act, five-act, hero's journey, Save the Cat, story circle, non-linear), scene construction (INT/EXT, action lines, dialogue, parentheticals, transitions), character development (arc, motivation, backstory, Jungian archetypes), shot lists (coverage strategy, master shots, close-ups, inserts, cutaways, B-roll), storyboarding (panel composition, camera movement notation, continuity), production design (colour palette, art direction, set dressing, costume design), casting (character breakdowns, audition sides, ensemble dynamics), budgeting (above-the-line vs below-the-line, SAG rates, location fees), location scouting (permits, practical vs stage, natural light), mood boards (visual references, tone, atmosphere, colour story).",
    "",
    "Production: Camera (lens choices — wide, normal, telephoto, anamorphic; aspect ratios 1.33/1.78/1.85/2.39; sensor formats), cinematography (exposure triangle, depth of field, lighting ratios, three-point lighting, natural light, motivated light), camera movement (static, pan, tilt, dolly, crane, Steadicam, handheld, drone, oner), blocking (actor positioning, sight lines, eyeline matching, 180-degree rule, 30-degree rule), sound (production sound, boom vs lav, room tone, wild lines, ADR), directing (working with actors, Stanislavski, Meisner, emotional memory, action/objective).",
    "",
    "Post-Production: Editing (continuity editing, montage, J-cut, L-cut, match cut, jump cut, cross-cutting, parallel editing), colour grading (LUTs, colour temperature, saturation, contrast, skin tones, look development), visual effects (compositing, green screen, rotoscoping, CGI integration, motion tracking), sound design (Foley, SFX, music spotting, temp track, score vs licensed music), subtitles and localisation (SDH, forced narratives, burn-in vs sidecar, Netflix/broadcast specs), NLE workflows (Premiere Pro, DaVinci Resolve, Final Cut Pro, AVID, XML/EDL export), deliverables (DCP, broadcast masters, streaming specs for Netflix/Amazon/Apple TV+).",
    "",
    "Film History and Theory: French New Wave, Italian Neorealism, German Expressionism, Soviet Montage, Hong Kong action cinema, Dogme 95, mumblecore, Nollywood. Auteur theory, mise-en-scene analysis, semiotics, narrative theory. Key directors: Kubrick, Kurosawa, Hitchcock, Welles, Scorsese, Coppola, Lynch, Tarantino, Wong Kar-wai, Park Chan-wook, Agnes Varda, Chantal Akerman. Genre conventions: noir, horror, thriller, romantic comedy, action, drama, documentary, experimental.",
    "",
    "Business and Distribution: Film financing (co-productions, tax incentives, pre-sales, gap financing, equity investment), film funds (Sundance, IFFR, Tribeca, Screen Australia, BFI, CNC, SABC, NFVF), distribution (theatrical, streaming, VOD, festival strategy, P&A), film markets (Cannes Marche, AFM, Berlin EFM, MIPCOM), intellectual property (chain of title, E&O insurance, music clearances, fair use).",
    "",
    "## COMMUNICATION STYLE",
    "- Use proper film terminology naturally and accurately",
    "- Be direct, confident, and collaborative — this is a creative partnership",
    "- Never ask more than 2 clarifying questions at a time",
    "- Keep responses focused and actionable",
    "- When giving creative suggestions, always frame them as options, not mandates",
  ];
  if (projectContext) {
    lines.push("", "## CURRENT PROJECT", projectContext);
  }
  if (directorInstructions) {
    lines.push("", "## DIRECTOR'S STANDING ORDERS (always follow these without exception)", directorInstructions);
  }
  return lines.join("\n");
}
