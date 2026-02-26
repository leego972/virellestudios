import { invokeLLM, type Tool, type Message } from "./_core/llm";
import * as db from "./db";

// Define all tools the Director's Assistant can use
const DIRECTOR_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "add_sound_effect",
      description: "Add a sound effect to a scene in the project. Can add preset sounds (rain, thunder, footsteps, etc.) or reference custom uploaded sounds.",
      parameters: {
        type: "object",
        properties: {
          sceneName: { type: "string", description: "The scene title or number to add the sound to (e.g. 'Scene 3' or 'The Chase')" },
          soundName: { type: "string", description: "Name of the sound effect (e.g. 'Thunder', 'Rain (Heavy)', 'Footsteps (Wood)')" },
          category: { type: "string", description: "Sound category: Nature, Urban, Indoor, Action, Emotional, Sci-Fi, Transition" },
          volume: { type: "number", description: "Volume level from 0.0 to 1.0, default 0.8" },
          startTime: { type: "number", description: "When to start playing in the scene (seconds from scene start)" },
        },
        required: ["sceneName", "soundName", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "modify_scene",
      description: "Modify properties of an existing scene. Can change transition, lighting, camera angle, mood, weather, time of day, duration, description, production notes, or dialogue.",
      parameters: {
        type: "object",
        properties: {
          sceneName: { type: "string", description: "The scene title or number (e.g. 'Scene 3', 'The Chase', or just '3')" },
          transitionType: { type: "string", enum: ["cut", "fade", "dissolve", "wipe", "iris", "cross-dissolve"], description: "Scene transition type" },
          transitionDuration: { type: "number", description: "Transition duration in seconds" },
          lighting: { type: "string", enum: ["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"], description: "Lighting setup" },
          cameraAngle: { type: "string", enum: ["wide", "medium", "close-up", "extreme-close-up", "birds-eye", "low-angle", "dutch-angle", "over-shoulder", "pov"], description: "Camera angle" },
          mood: { type: "string", description: "Scene mood (e.g. tense, romantic, action)" },
          weather: { type: "string", enum: ["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"], description: "Weather conditions" },
          timeOfDay: { type: "string", enum: ["dawn", "morning", "afternoon", "evening", "night", "golden-hour"], description: "Time of day" },
          duration: { type: "number", description: "Scene duration in seconds" },
          description: { type: "string", description: "Updated scene description" },
          productionNotes: { type: "string", description: "Director's production notes for the scene" },
          dialogueText: { type: "string", description: "Dialogue text for the scene" },
          colorGrading: { type: "string", description: "Color grading preset name" },
        },
        required: ["sceneName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cut_scene",
      description: "Delete/remove a scene from the project entirely.",
      parameters: {
        type: "object",
        properties: {
          sceneName: { type: "string", description: "The scene title or number to cut/remove" },
        },
        required: ["sceneName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_scene",
      description: "Add a new scene to the project at a specific position.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the new scene" },
          description: { type: "string", description: "Scene description" },
          afterScene: { type: "string", description: "Insert after this scene (title or number). Use 'start' for beginning, 'end' for end." },
          timeOfDay: { type: "string", enum: ["dawn", "morning", "afternoon", "evening", "night", "golden-hour"] },
          weather: { type: "string", enum: ["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"] },
          lighting: { type: "string", enum: ["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"] },
          cameraAngle: { type: "string", enum: ["wide", "medium", "close-up", "extreme-close-up", "birds-eye", "low-angle", "dutch-angle", "over-shoulder", "pov"] },
          mood: { type: "string", description: "Scene mood" },
          duration: { type: "number", description: "Duration in seconds" },
          transitionType: { type: "string", enum: ["cut", "fade", "dissolve", "wipe", "iris", "cross-dissolve"] },
        },
        required: ["title", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reorder_scenes",
      description: "Move a scene to a different position in the timeline.",
      parameters: {
        type: "object",
        properties: {
          sceneName: { type: "string", description: "The scene to move (title or number)" },
          newPosition: { type: "number", description: "New position number (1-based)" },
        },
        required: ["sceneName", "newPosition"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_dialogue",
      description: "Add a dialogue line to a scene for a specific character.",
      parameters: {
        type: "object",
        properties: {
          sceneName: { type: "string", description: "The scene title or number" },
          characterName: { type: "string", description: "Name of the character speaking" },
          line: { type: "string", description: "The dialogue line" },
          emotion: { type: "string", description: "Emotion/delivery (e.g. angry, whispered, sarcastic)" },
          direction: { type: "string", description: "Stage direction (e.g. turns to face camera)" },
        },
        required: ["sceneName", "characterName", "line"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_scene_from_vision",
      description: "Create a complete, detailed scene from the director's vision description. The director describes what they see in their mind — the AI fills in ALL missing production details (lighting, camera angles, weather, mood, transitions, dialogue, sound effects, duration, color grading, production notes) to create a fully realized, realistic scene. Use this when the director describes a scene they want to create.",
      parameters: {
        type: "object",
        properties: {
          vision: { type: "string", description: "The director's raw vision description — what they see in their mind for this scene" },
          afterScene: { type: "string", description: "Insert after this scene (title or number). Use 'start' for beginning, 'end' for end. Defaults to 'end'." },
        },
        required: ["vision"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_visual_effect",
      description: "Add a visual effect (VFX) to a scene. Can add preset effects (explosions, weather, magic, particles, etc.) or custom effects.",
      parameters: {
        type: "object",
        properties: {
          sceneName: { type: "string", description: "The scene title or number to add the VFX to" },
          effectName: { type: "string", description: "Name of the visual effect (e.g. 'Fireball Explosion', 'Lightning Storm', 'Magic Portal')" },
          category: { type: "string", description: "VFX category: Explosions, Weather, Magic, Particles, Light, Smoke, Water, Sci-Fi" },
          intensity: { type: "number", description: "Effect intensity from 0.0 to 1.0, default 0.7" },
          duration: { type: "number", description: "Effect duration in seconds" },
          startTime: { type: "number", description: "When to start the effect (seconds from scene start)" },
          colorTint: { type: "string", description: "Optional color tint hex code (e.g. '#ff4400')" },
        },
        required: ["sceneName", "effectName", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_summary",
      description: "Get a summary of the current project state including all scenes, characters, sound effects, and visual effects. Use this to understand the project before making suggestions.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_improvements",
      description: "Analyze the project and provide proactive suggestions for improving the film's quality, pacing, continuity, or production value.",
      parameters: {
        type: "object",
        properties: {
          focusArea: { type: "string", enum: ["pacing", "continuity", "cinematography", "sound_design", "dialogue", "transitions", "overall"], description: "Area to focus suggestions on" },
        },
        required: ["focusArea"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_full_film",
      description: "Generate a complete multi-scene film from the director's concept. The director describes the overall film idea, optionally with uploaded photos as character/location references, and a target duration. The AI creates ALL scenes with full production details, dialogue, sound effects, transitions, and pacing to fill the requested duration. Use this when the director wants to generate an entire film or sequence of scenes at once (e.g. 'make me a 2 minute film of X and Y doing Z').",
      parameters: {
        type: "object",
        properties: {
          concept: { type: "string", description: "The full film concept including what happens, who is involved, and any details the director mentioned. Include references to any uploaded photos/images." },
          durationMinutes: { type: "number", description: "Target film duration in minutes. Default 2 if not specified." },
          imageReferences: {
            type: "array",
            items: { type: "string" },
            description: "URLs of uploaded photos/images that serve as visual references for characters or locations"
          },
        },
        required: ["concept"],
      },
    },
  },
];

// Find a scene by name or number
async function findScene(projectId: number, sceneName: string) {
  const scenes = await db.getProjectScenes(projectId);
  if (!scenes.length) return null;

  // Try matching by number
  const num = parseInt(sceneName.replace(/[^0-9]/g, ""));
  if (!isNaN(num)) {
    // Match by orderIndex+1 or by the number in the title
    const byIndex = scenes.find((s) => s.orderIndex + 1 === num);
    if (byIndex) return byIndex;
    const byNum = scenes.find((s) => s.title?.includes(String(num)));
    if (byNum) return byNum;
  }

  // Try matching by title (case-insensitive partial match)
  const lower = sceneName.toLowerCase();
  const byTitle = scenes.find(
    (s) => s.title?.toLowerCase().includes(lower) || lower.includes(s.title?.toLowerCase() || "")
  );
  if (byTitle) return byTitle;

  // Fuzzy: return first scene if only one
  return null;
}

// Execute a tool call and return the result
async function executeAction(
  toolName: string,
  args: Record<string, unknown>,
  projectId: number,
  userId: number
): Promise<{ success: boolean; message: string; actionType: string; actionData: Record<string, unknown> }> {
  try {
    switch (toolName) {
      case "add_sound_effect": {
        const scene = await findScene(projectId, args.sceneName as string);
        if (!scene) return { success: false, message: `Could not find scene "${args.sceneName}". Please check the scene name or number.`, actionType: toolName, actionData: args };
        await db.createSoundEffect({
          projectId,
          sceneId: scene.id,
          userId,
          name: args.soundName as string,
          category: (args.category as string) || "Custom",
          volume: (args.volume as number) || 0.8,
          startTime: (args.startTime as number) || 0,
          isCustom: 0,
          tags: [],
        });
        return {
          success: true,
          message: `Added "${args.soundName}" sound effect to "${scene.title || `Scene ${scene.orderIndex + 1}`}" at ${args.startTime || 0}s with volume ${args.volume || 0.8}.`,
          actionType: toolName,
          actionData: { ...args, sceneId: scene.id, sceneTitle: scene.title },
        };
      }

      case "modify_scene": {
        const scene = await findScene(projectId, args.sceneName as string);
        if (!scene) return { success: false, message: `Could not find scene "${args.sceneName}".`, actionType: toolName, actionData: args };
        const updates: Record<string, unknown> = {};
        const changes: string[] = [];
        if (args.transitionType) { updates.transitionType = args.transitionType; changes.push(`transition → ${args.transitionType}`); }
        if (args.transitionDuration) { updates.transitionDuration = args.transitionDuration; changes.push(`transition duration → ${args.transitionDuration}s`); }
        if (args.lighting) { updates.lighting = args.lighting; changes.push(`lighting → ${args.lighting}`); }
        if (args.cameraAngle) { updates.cameraAngle = args.cameraAngle; changes.push(`camera → ${args.cameraAngle}`); }
        if (args.mood) { updates.mood = args.mood; changes.push(`mood → ${args.mood}`); }
        if (args.weather) { updates.weather = args.weather; changes.push(`weather → ${args.weather}`); }
        if (args.timeOfDay) { updates.timeOfDay = args.timeOfDay; changes.push(`time → ${args.timeOfDay}`); }
        if (args.duration) { updates.duration = args.duration; changes.push(`duration → ${args.duration}s`); }
        if (args.description) { updates.description = args.description; changes.push(`description updated`); }
        if (args.productionNotes) { updates.productionNotes = args.productionNotes; changes.push(`production notes updated`); }
        if (args.dialogueText) { updates.dialogueText = args.dialogueText; changes.push(`dialogue updated`); }
        if (args.colorGrading) { updates.colorGrading = args.colorGrading; changes.push(`color grading → ${args.colorGrading}`); }
        if (Object.keys(updates).length === 0) return { success: false, message: "No changes specified.", actionType: toolName, actionData: args };
        await db.updateScene(scene.id, updates as any);
        return {
          success: true,
          message: `Modified "${scene.title || `Scene ${scene.orderIndex + 1}`}": ${changes.join(", ")}.`,
          actionType: toolName,
          actionData: { ...args, sceneId: scene.id, changes },
        };
      }

      case "cut_scene": {
        const scene = await findScene(projectId, args.sceneName as string);
        if (!scene) return { success: false, message: `Could not find scene "${args.sceneName}".`, actionType: toolName, actionData: args };
        const sceneTitle = scene.title || `Scene ${scene.orderIndex + 1}`;
        await db.deleteScene(scene.id);
        return {
          success: true,
          message: `Cut (removed) "${sceneTitle}" from the project.`,
          actionType: toolName,
          actionData: { ...args, sceneId: scene.id, sceneTitle },
        };
      }

      case "add_scene": {
        const scenes = await db.getProjectScenes(projectId);
        let orderIndex = scenes.length;
        if (args.afterScene === "start") {
          orderIndex = 0;
        } else if (args.afterScene && args.afterScene !== "end") {
          const afterScene = await findScene(projectId, args.afterScene as string);
          if (afterScene) orderIndex = afterScene.orderIndex + 1;
        }
        const newScene = await db.createScene({
          projectId,
          orderIndex,
          title: args.title as string,
          description: args.description as string,
          timeOfDay: (args.timeOfDay as any) || "afternoon",
          weather: (args.weather as any) || "clear",
          lighting: (args.lighting as any) || "natural",
          cameraAngle: (args.cameraAngle as any) || "medium",
          mood: (args.mood as string) || undefined,
          duration: (args.duration as number) || 30,
          transitionType: (args.transitionType as string) || "cut",
          status: "draft",
        });
        return {
          success: true,
          message: `Added new scene "${args.title}" at position ${orderIndex + 1} with ${args.lighting || "natural"} lighting, ${args.weather || "clear"} weather.`,
          actionType: toolName,
          actionData: { ...args, sceneId: newScene.id, orderIndex },
        };
      }

      case "reorder_scenes": {
        const scene = await findScene(projectId, args.sceneName as string);
        if (!scene) return { success: false, message: `Could not find scene "${args.sceneName}".`, actionType: toolName, actionData: args };
        const allScenes = await db.getProjectScenes(projectId);
        const newPos = Math.max(1, Math.min(allScenes.length, args.newPosition as number));
        const sceneIds = allScenes.map((s) => s.id);
        const currentIdx = sceneIds.indexOf(scene.id);
        sceneIds.splice(currentIdx, 1);
        sceneIds.splice(newPos - 1, 0, scene.id);
        await db.reorderScenes(projectId, sceneIds);
        return {
          success: true,
          message: `Moved "${scene.title || `Scene ${scene.orderIndex + 1}`}" to position ${newPos}.`,
          actionType: toolName,
          actionData: { ...args, sceneId: scene.id },
        };
      }

      case "add_dialogue": {
        const scene = await findScene(projectId, args.sceneName as string);
        if (!scene) return { success: false, message: `Could not find scene "${args.sceneName}".`, actionType: toolName, actionData: args };
        const existingDialogues = await db.getSceneDialogues(scene.id);
        await db.createDialogue({
          projectId,
          userId,
          sceneId: scene.id,
          characterName: args.characterName as string,
          line: args.line as string,
          emotion: (args.emotion as string) || undefined,
          direction: (args.direction as string) || undefined,
          orderIndex: existingDialogues.length,
        });
        return {
          success: true,
          message: `Added dialogue for ${args.characterName} in "${scene.title || `Scene ${scene.orderIndex + 1}`}": "${args.line}"`,
          actionType: toolName,
          actionData: { ...args, sceneId: scene.id },
        };
      }

      case "create_scene_from_vision": {
        // Use LLM to expand the director's vision into a complete scene spec
        const visionPrompt = `You are a film production AI. The director has described a scene vision. Your job is to create a COMPLETE, DETAILED scene specification, filling in every production detail they didn't mention to make it as realistic and cinematic as possible.

Director's vision: "${args.vision}"

Return a JSON object with these exact fields (fill in EVERYTHING, even if the director didn't mention it — use your film expertise to make creative choices):
{
  "title": "Short scene title (2-5 words)",
  "description": "Detailed scene description (3-5 sentences, vivid and specific)",
  "timeOfDay": "dawn|morning|afternoon|evening|night|golden-hour",
  "weather": "clear|cloudy|rainy|stormy|snowy|foggy|windy",
  "lighting": "natural|dramatic|soft|neon|candlelight|studio|backlit|silhouette",
  "cameraAngle": "wide|medium|close-up|extreme-close-up|birds-eye|low-angle|dutch-angle|over-shoulder|pov",
  "mood": "one or two words describing the mood",
  "duration": number (seconds, realistic for the scene),
  "transitionType": "cut|fade|dissolve|wipe|iris|cross-dissolve",
  "transitionDuration": number (seconds),
  "colorGrading": "color grading style description",
  "productionNotes": "Detailed production notes for crew (blocking, props, practical effects, etc.)",
  "dialogueLines": [
    { "character": "name", "line": "dialogue text", "emotion": "delivery style", "direction": "stage direction" }
  ],
  "soundEffects": [
    { "name": "sound name", "category": "Nature|Urban|Indoor|Action|Emotional|Sci-Fi|Transition", "startTime": number, "volume": number }
  ]
}

Be creative and specific. If the director mentions characters, write realistic dialogue. If they mention a location, add appropriate ambient sounds. Make every detail count for a high-quality production.`;

        const visionResult = await invokeLLM({
          messages: [
            { role: "system", content: "You are a film production expert. Return ONLY valid JSON, no markdown or explanation." },
            { role: "user", content: visionPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "scene_spec",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  timeOfDay: { type: "string" },
                  weather: { type: "string" },
                  lighting: { type: "string" },
                  cameraAngle: { type: "string" },
                  mood: { type: "string" },
                  duration: { type: "number" },
                  transitionType: { type: "string" },
                  transitionDuration: { type: "number" },
                  colorGrading: { type: "string" },
                  productionNotes: { type: "string" },
                  dialogueLines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        character: { type: "string" },
                        line: { type: "string" },
                        emotion: { type: "string" },
                        direction: { type: "string" },
                      },
                      required: ["character", "line", "emotion", "direction"],
                      additionalProperties: false,
                    },
                  },
                  soundEffects: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        category: { type: "string" },
                        startTime: { type: "number" },
                        volume: { type: "number" },
                      },
                      required: ["name", "category", "startTime", "volume"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "description", "timeOfDay", "weather", "lighting", "cameraAngle", "mood", "duration", "transitionType", "transitionDuration", "colorGrading", "productionNotes", "dialogueLines", "soundEffects"],
                additionalProperties: false,
              },
            },
          },
        });

        const spec = JSON.parse(visionResult.choices[0].message.content as string);

        // Determine position
        const allScenes = await db.getProjectScenes(projectId);
        let orderIdx = allScenes.length;
        if (args.afterScene === "start") {
          orderIdx = 0;
        } else if (args.afterScene && args.afterScene !== "end") {
          const afterSc = await findScene(projectId, args.afterScene as string);
          if (afterSc) orderIdx = afterSc.orderIndex + 1;
        }

        // Create the scene
        const newScene = await db.createScene({
          projectId,
          orderIndex: orderIdx,
          title: spec.title,
          description: spec.description,
          timeOfDay: spec.timeOfDay as any,
          weather: spec.weather as any,
          lighting: spec.lighting as any,
          cameraAngle: spec.cameraAngle as any,
          mood: spec.mood,
          duration: spec.duration,
          transitionType: spec.transitionType,
          transitionDuration: spec.transitionDuration,
          colorGrading: spec.colorGrading,
          productionNotes: spec.productionNotes,
          status: "draft",
        });

        // Add dialogue lines
        for (let i = 0; i < (spec.dialogueLines || []).length; i++) {
          const dl = spec.dialogueLines[i];
          await db.createDialogue({
            projectId,
            userId,
            sceneId: newScene.id,
            characterName: dl.character,
            line: dl.line,
            emotion: dl.emotion,
            direction: dl.direction,
            orderIndex: i,
          });
        }

        // Add sound effects
        for (const sfx of (spec.soundEffects || [])) {
          await db.createSoundEffect({
            projectId,
            sceneId: newScene.id,
            userId,
            name: sfx.name,
            category: sfx.category,
            volume: sfx.volume,
            startTime: sfx.startTime,
            isCustom: 0,
            tags: [],
          });
        }

        const detailsSummary = [
          `**${spec.title}** — Position ${orderIdx + 1}`,
          `${spec.description}`,
          `Time: ${spec.timeOfDay} | Weather: ${spec.weather} | Lighting: ${spec.lighting}`,
          `Camera: ${spec.cameraAngle} | Mood: ${spec.mood} | Duration: ${spec.duration}s`,
          `Transition: ${spec.transitionType} (${spec.transitionDuration}s)`,
          `Color: ${spec.colorGrading}`,
          spec.dialogueLines?.length ? `Dialogue: ${spec.dialogueLines.length} lines` : "",
          spec.soundEffects?.length ? `Sound FX: ${spec.soundEffects.map((s: any) => s.name).join(", ")}` : "",
          `Notes: ${spec.productionNotes}`,
        ].filter(Boolean).join("\n");

        return {
          success: true,
          message: detailsSummary,
          actionType: toolName,
          actionData: { sceneId: newScene.id, spec },
        };
      }

      case "add_visual_effect": {
        const scene = await findScene(projectId, args.sceneName as string);
        if (!scene) return { success: false, message: `Could not find scene "${args.sceneName}". Please check the scene name or number.`, actionType: toolName, actionData: args };
        await db.createVisualEffect({
          projectId,
          sceneId: scene.id,
          userId,
          name: args.effectName as string,
          category: (args.category as string) || "Custom",
          intensity: (args.intensity as number) || 0.7,
          duration: (args.duration as number) || 3,
          startTime: (args.startTime as number) || 0,
          colorTint: (args.colorTint as string) || null,
          isCustom: 0,
          tags: [],
        });
        return {
          success: true,
          message: `Added VFX "${args.effectName}" to "${scene.title || `Scene ${scene.orderIndex + 1}`}" — intensity ${args.intensity || 0.7}, duration ${args.duration || 3}s, starts at ${args.startTime || 0}s.`,
          actionType: toolName,
          actionData: { ...args, sceneId: scene.id, sceneTitle: scene.title },
        };
      }

      case "get_project_summary": {
        const project = await db.getProjectById(projectId, userId);
        const scenes = await db.getProjectScenes(projectId);
        const characters = await db.getProjectCharacters(projectId);
        const soundEffects = await db.listSoundEffectsByProject(projectId);
        const visualEffects = await db.listVisualEffectsByProject(projectId);
        const summary = {
          title: project?.title,
          description: project?.description,
          genre: project?.genre,
          rating: project?.rating,
          duration: project?.duration,
          status: project?.status,
          sceneCount: scenes.length,
          characterCount: characters.length,
          soundEffectCount: soundEffects.length,
          visualEffectCount: visualEffects.length,
          scenes: scenes.map((s, i) => ({
            number: i + 1,
            title: s.title,
            description: s.description?.substring(0, 100),
            duration: s.duration,
            timeOfDay: s.timeOfDay,
            weather: s.weather,
            lighting: s.lighting,
            cameraAngle: s.cameraAngle,
            mood: s.mood,
            transition: s.transitionType,
          })),
          characters: characters.map((c) => ({
            name: c.name,
            description: c.description?.substring(0, 80),
          })),
        };
        return {
          success: true,
          message: JSON.stringify(summary),
          actionType: toolName,
          actionData: summary,
        };
      }

      case "generate_full_film": {
        const targetMinutes = (args.durationMinutes as number) || 2;
        const targetSeconds = targetMinutes * 60;
        // Estimate ~15-30 seconds per scene for a realistic film
        const estimatedSceneCount = Math.max(3, Math.min(20, Math.round(targetSeconds / 20)));
        const imageRefs = (args.imageReferences as string[]) || [];

        const imageContext = imageRefs.length > 0
          ? `\n\nThe director has uploaded ${imageRefs.length} photo(s) as visual references. Use these to inform character appearances, clothing, and location details. Photo URLs: ${imageRefs.join(", ")}`
          : "";

        const filmPrompt = `You are a film production AI creating a COMPLETE FILM with multiple scenes.

Director's concept: "${args.concept}"${imageContext}

Target duration: ${targetMinutes} minute(s) (${targetSeconds} seconds total)
Create exactly ${estimatedSceneCount} scenes that together tell a complete story within this duration.

For EACH scene, provide ALL production details. The scenes should flow naturally with proper pacing, building tension or emotion as appropriate.

Return a JSON object:
{
  "filmTitle": "Title for the overall film",
  "filmDescription": "Brief 1-2 sentence film synopsis",
  "scenes": [
    {
      "title": "Short scene title",
      "description": "Vivid, detailed scene description (3-5 sentences)",
      "timeOfDay": "dawn|morning|afternoon|evening|night|golden-hour",
      "weather": "clear|cloudy|rainy|stormy|snowy|foggy|windy",
      "lighting": "natural|dramatic|soft|neon|candlelight|studio|backlit|silhouette",
      "cameraAngle": "wide|medium|close-up|extreme-close-up|birds-eye|low-angle|dutch-angle|over-shoulder|pov",
      "mood": "mood description",
      "duration": number_in_seconds,
      "transitionType": "cut|fade|dissolve|wipe|iris|cross-dissolve",
      "transitionDuration": number_in_seconds,
      "colorGrading": "color grading style",
      "productionNotes": "Detailed crew notes (blocking, props, wardrobe, practical effects)",
      "dialogueLines": [
        { "character": "name", "line": "text", "emotion": "delivery", "direction": "stage direction" }
      ],
      "soundEffects": [
        { "name": "sound", "category": "Nature|Urban|Indoor|Action|Emotional|Sci-Fi|Transition", "startTime": number, "volume": number }
      ]
    }
  ]
}

RULES:
- Scene durations MUST add up to approximately ${targetSeconds} seconds
- Include realistic dialogue where appropriate
- Add ambient and action sound effects to every scene
- Vary camera angles and transitions for visual interest
- Build a narrative arc: setup, rising action, climax, resolution
- If photos were referenced, describe characters matching those photos (clothing, appearance, etc.)
- Fill in ALL details the director didn't specify — be creative and make it cinematic
- Production notes should include specific wardrobe, props, and blocking directions`;

        const filmResult = await invokeLLM({
          messages: [
            { role: "system", content: "You are a film production expert. Return ONLY valid JSON, no markdown." },
            ...(imageRefs.length > 0 ? [{
              role: "user" as const,
              content: [
                { type: "text" as const, text: filmPrompt },
                ...imageRefs.map(url => ({ type: "image_url" as const, image_url: { url, detail: "high" as const } })),
              ],
            }] : [{
              role: "user" as const,
              content: filmPrompt,
            }]),
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "film_spec",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  filmTitle: { type: "string" },
                  filmDescription: { type: "string" },
                  scenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        timeOfDay: { type: "string" },
                        weather: { type: "string" },
                        lighting: { type: "string" },
                        cameraAngle: { type: "string" },
                        mood: { type: "string" },
                        duration: { type: "number" },
                        transitionType: { type: "string" },
                        transitionDuration: { type: "number" },
                        colorGrading: { type: "string" },
                        productionNotes: { type: "string" },
                        dialogueLines: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              character: { type: "string" },
                              line: { type: "string" },
                              emotion: { type: "string" },
                              direction: { type: "string" },
                            },
                            required: ["character", "line", "emotion", "direction"],
                            additionalProperties: false,
                          },
                        },
                        soundEffects: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              category: { type: "string" },
                              startTime: { type: "number" },
                              volume: { type: "number" },
                            },
                            required: ["name", "category", "startTime", "volume"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["title", "description", "timeOfDay", "weather", "lighting", "cameraAngle", "mood", "duration", "transitionType", "transitionDuration", "colorGrading", "productionNotes", "dialogueLines", "soundEffects"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["filmTitle", "filmDescription", "scenes"],
                additionalProperties: false,
              },
            },
          },
        });

        const filmSpec = JSON.parse(filmResult.choices[0].message.content as string);

        // Update project title if it's a generic name
        const project = await db.getProjectById(projectId, userId);
        if (project && (project.title === "Untitled Project" || project.title === "New Project")) {
          await db.updateProject(projectId, userId, { title: filmSpec.filmTitle, description: filmSpec.filmDescription });
        }

        // Create all scenes
        const existingScenes = await db.getProjectScenes(projectId);
        let startIndex = existingScenes.length;
        const createdScenes: string[] = [];

        for (let i = 0; i < filmSpec.scenes.length; i++) {
          const sceneSpec = filmSpec.scenes[i];
          const newScene = await db.createScene({
            projectId,
            orderIndex: startIndex + i,
            title: sceneSpec.title,
            description: sceneSpec.description,
            timeOfDay: sceneSpec.timeOfDay as any,
            weather: sceneSpec.weather as any,
            lighting: sceneSpec.lighting as any,
            cameraAngle: sceneSpec.cameraAngle as any,
            mood: sceneSpec.mood,
            duration: sceneSpec.duration,
            transitionType: sceneSpec.transitionType,
            transitionDuration: sceneSpec.transitionDuration,
            colorGrading: sceneSpec.colorGrading,
            productionNotes: sceneSpec.productionNotes,
            status: "draft",
          });

          // Add dialogue
          for (let d = 0; d < (sceneSpec.dialogueLines || []).length; d++) {
            const dl = sceneSpec.dialogueLines[d];
            await db.createDialogue({
              projectId,
              userId,
              sceneId: newScene.id,
              characterName: dl.character,
              line: dl.line,
              emotion: dl.emotion,
              direction: dl.direction,
              orderIndex: d,
            });
          }

          // Add sound effects
          for (const sfx of (sceneSpec.soundEffects || [])) {
            await db.createSoundEffect({
              projectId,
              sceneId: newScene.id,
              userId,
              name: sfx.name,
              category: sfx.category,
              volume: sfx.volume,
              startTime: sfx.startTime,
              isCustom: 0,
              tags: [],
            });
          }

          createdScenes.push(`${i + 1}. **${sceneSpec.title}** (${sceneSpec.duration}s) — ${sceneSpec.mood}, ${sceneSpec.lighting} lighting, ${sceneSpec.cameraAngle}`);
        }

        const totalDuration = filmSpec.scenes.reduce((sum: number, s: any) => sum + s.duration, 0);
        const summary = [
          `**${filmSpec.filmTitle}**`,
          filmSpec.filmDescription,
          ``,
          `${filmSpec.scenes.length} scenes created | Total duration: ${Math.floor(totalDuration / 60)}:${String(totalDuration % 60).padStart(2, "0")}`,
          ``,
          ...createdScenes,
        ].join("\n");

        return {
          success: true,
          message: summary,
          actionType: toolName,
          actionData: { filmTitle: filmSpec.filmTitle, sceneCount: filmSpec.scenes.length, totalDuration },
        };
      }

      case "suggest_improvements": {
        const project = await db.getProjectById(projectId, userId);
        const scenes = await db.getProjectScenes(projectId);
        const characters = await db.getProjectCharacters(projectId);
        return {
          success: true,
          message: JSON.stringify({
            focusArea: args.focusArea,
            projectTitle: project?.title,
            sceneCount: scenes.length,
            characterCount: characters.length,
            scenes: scenes.map((s, i) => ({
              number: i + 1,
              title: s.title,
              description: s.description?.substring(0, 150),
              duration: s.duration,
              lighting: s.lighting,
              cameraAngle: s.cameraAngle,
              transition: s.transitionType,
              mood: s.mood,
              weather: s.weather,
            })),
          }),
          actionType: toolName,
          actionData: { focusArea: args.focusArea },
        };
      }

      default:
        return { success: false, message: `Unknown action: ${toolName}`, actionType: toolName, actionData: args };
    }
  } catch (error: any) {
    return { success: false, message: `Action failed: ${error.message}`, actionType: toolName, actionData: args };
  }
}

const SYSTEM_PROMPT = `You are the Director's Assistant for Virelle Studios — an AI co-director that helps filmmakers build high-quality films. You work inside a film production platform and can execute real actions on the project.

YOUR CAPABILITIES:
- CREATE SCENES FROM VISION: When the director describes what they see in their mind, create a complete scene with ALL production details filled in (lighting, camera, weather, mood, transitions, dialogue, sound effects, duration, color grading, production notes). Use create_scene_from_vision for this — it's your most powerful tool.
- Add, modify, cut (delete), and reorder scenes
- Add sound effects to specific scenes with timing and volume control
- Add visual effects (VFX) to scenes: explosions, weather, magic, particles, light, smoke, water, sci-fi effects with intensity, duration, and color tint controls
- Add dialogue lines for characters
- Change scene properties: transitions (cut, fade, dissolve, wipe, iris, cross-dissolve), lighting, camera angles, mood, weather, time of day, duration, color grading
- Get a full project summary to understand the current state
- Analyze the project and suggest improvements

BEHAVIOR RULES:
1. When the director gives a command, execute it immediately using the appropriate tool. Don't ask for confirmation on simple commands.
2. When the director describes a scene they want (e.g., "I want a scene where...", "Picture this...", "There's a moment where..."), ALWAYS use create_scene_from_vision. Pass their EXACT words as the vision — the tool will expand it into a full scene with all details.
3. After executing an action, confirm what you did in a concise, professional way. For created scenes, briefly highlight the key creative choices you made.
4. Proactively suggest improvements when you notice issues — but keep suggestions brief and actionable.
5. Use film industry terminology naturally (e.g., "coverage", "blocking", "motivated lighting").
6. When referencing timestamps, convert between MM:SS format and seconds as needed.
7. If a scene reference is ambiguous, use get_project_summary first to identify the correct scene.
8. You can chain multiple actions in one response if the director's request requires it.
9. When creating scenes, be bold with creative choices — the director wants a co-director, not a yes-man. Add realistic details that elevate the scene.

TONE: Professional but creative. Think of yourself as an experienced AD (Assistant Director) who knows the craft inside out. Be concise — directors don't want long explanations.`;

export async function processDirectorMessage(
  projectId: number,
  userId: number,
  userMessage: string,
  chatHistory: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  imageUrls?: string[]
): Promise<{ response: string; actions: Array<{ type: string; data: Record<string, unknown>; success: boolean; message: string }> }> {
  // Build messages array with system prompt and history
  // If images are provided, build multimodal content for the user message
  const userContent: Message["content"] = imageUrls && imageUrls.length > 0
    ? [
        { type: "text" as const, text: userMessage },
        ...imageUrls.map((url) => ({
          type: "image_url" as const,
          image_url: { url, detail: "auto" as const },
        })),
      ]
    : userMessage;

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatHistory.slice(-20).map((m) => ({ role: m.role as any, content: m.content })),
    { role: "user", content: userContent },
  ];

  const actions: Array<{ type: string; data: Record<string, unknown>; success: boolean; message: string }> = [];
  let finalResponse = "";
  let iterations = 0;
  const maxIterations = 5; // Prevent infinite loops

  while (iterations < maxIterations) {
    iterations++;
    const result = await invokeLLM({
      messages,
      tools: DIRECTOR_TOOLS,
      tool_choice: "auto",
    });

    const choice = result.choices[0];
    if (!choice) break;

    const assistantMessage = choice.message;

    // If there are tool calls, execute them
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant message with tool calls to conversation
      messages.push({
        role: "assistant",
        content: assistantMessage.content || "",
      });

      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const actionResult = await executeAction(toolCall.function.name, args, projectId, userId);
        actions.push({
          type: actionResult.actionType,
          data: actionResult.actionData,
          success: actionResult.success,
          message: actionResult.message,
        });

        // Add tool result to messages for the next iteration
        messages.push({
          role: "tool" as any,
          content: JSON.stringify({ success: actionResult.success, result: actionResult.message }),
        });
      }

      // Continue the loop so the LLM can process tool results and potentially make more calls
      continue;
    }

    // No tool calls — this is the final text response
    finalResponse = typeof assistantMessage.content === "string"
      ? assistantMessage.content
      : Array.isArray(assistantMessage.content)
        ? assistantMessage.content.map((c: any) => (typeof c === "string" ? c : c.text || "")).join("")
        : "";
    break;
  }

  // If we exhausted iterations without a text response, generate a summary
  if (!finalResponse && actions.length > 0) {
    finalResponse = actions.map((a) => `${a.success ? "✓" : "✗"} ${a.message}`).join("\n");
  }

  return { response: finalResponse, actions };
}
