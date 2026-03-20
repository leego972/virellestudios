/**
 * Director's Assistant Tool Executor
 *
 * Maps each tool name to real backend actions (DB reads/writes, LLM calls).
 * Called by the SSE director stream handler after the LLM decides to use a tool.
 */

import * as db from "./db";
import { invokeLLM } from "./_core/llm";

export interface ExecutorContext {
  userId: number;
  user: {
    id: number;
    subscriptionTier?: string | null;
    creditBalance?: number | null;
    email?: string | null;
    name?: string | null;
  };
}

export type ToolResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

export async function executeDirectorTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ExecutorContext
): Promise<ToolResult> {
  try {
    switch (toolName) {

      // ─── Project Tools ──────────────────────────────────────────────

      case "list_projects": {
        const projects = await db.getUserProjects(ctx.userId, 50);
        const summary = projects.map((p) => ({
          id: p.id,
          title: p.title,
          genre: p.genre,
          status: p.status,
          progress: p.progress,
          description: p.description,
          updatedAt: p.updatedAt,
        }));
        return { success: true, data: { projects: summary, total: summary.length } };
      }

      case "get_project": {
        const projectId = Number(args.projectId);
        const project = await db.getProjectById(projectId, ctx.userId);
        if (!project) return { success: false, error: "Project not found or you don't have access." };
        const scenes = await db.getProjectScenes(projectId);
        const characters = await db.getProjectCharacters(projectId);
        return {
          success: true,
          data: {
            project: {
              id: project.id,
              title: project.title,
              genre: project.genre,
              tone: project.tone,
              status: project.status,
              progress: project.progress,
              description: project.description,
              plotSummary: project.plotSummary,
              mainPlot: project.mainPlot,
              themes: project.themes,
              setting: project.setting,
              rating: project.rating,
              targetAudience: project.targetAudience,
              sceneCount: scenes.length,
              characterCount: characters.length,
            },
            scenes: scenes.map((s) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              orderIndex: s.orderIndex,
              status: s.status,
              timeOfDay: s.timeOfDay,
              mood: s.mood,
              locationType: s.locationType,
            })),
            characters: characters.map((c) => ({
              id: c.id,
              name: c.name,
              role: c.role,
              description: c.description,
            })),
          },
        };
      }

      case "create_project": {
        const project = await db.createProject({
          userId: ctx.userId,
          title: String(args.title || "Untitled Film"),
          description: args.description ? String(args.description) : null,
          genre: args.genre ? String(args.genre) : null,
          tone: args.tone ? String(args.tone) : null,
          rating: (args.rating as any) || "PG-13",
          plotSummary: args.plotSummary ? String(args.plotSummary) : null,
          setting: args.setting ? String(args.setting) : null,
          targetAudience: args.targetAudience ? String(args.targetAudience) : null,
          status: "draft",
          mode: "manual",
        });
        return {
          success: true,
          data: {
            project: { id: project.id, title: project.title, genre: project.genre },
            message: `Project "${project.title}" created successfully.`,
            action: { type: "navigate", page: "project_detail", projectId: project.id },
          },
        };
      }

      case "update_project": {
        const projectId = Number(args.projectId);
        const { projectId: _pid, ...updates } = args;
        const project = await db.updateProject(projectId, ctx.userId, updates as any);
        return {
          success: true,
          data: {
            project: { id: project.id, title: project.title },
            message: `Project "${project.title}" updated.`,
          },
        };
      }

      // ─── Scene Tools ────────────────────────────────────────────────

      case "list_scenes": {
        const projectId = Number(args.projectId);
        const scenes = await db.getProjectScenes(projectId);
        return {
          success: true,
          data: {
            scenes: scenes.map((s) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              orderIndex: s.orderIndex,
              status: s.status,
              timeOfDay: s.timeOfDay,
              weather: s.weather,
              lighting: s.lighting,
              cameraAngle: s.cameraAngle,
              mood: s.mood,
              locationType: s.locationType,
              duration: s.duration,
            })),
            total: scenes.length,
          },
        };
      }

      case "create_scene": {
        const projectId = Number(args.projectId);
        const project = await db.getProjectById(projectId, ctx.userId);
        if (!project) return { success: false, error: "Project not found." };
        const existingScenes = await db.getProjectScenes(projectId);
        const scene = await db.createScene({
          projectId,
          title: String(args.title || "New Scene"),
          description: args.description ? String(args.description) : null,
          orderIndex: existingScenes.length,
          timeOfDay: (args.timeOfDay as any) || "afternoon",
          weather: (args.weather as any) || "clear",
          lighting: (args.lighting as any) || "natural",
          cameraAngle: (args.cameraAngle as any) || "medium",
          mood: args.mood ? String(args.mood) : null,
          locationType: args.locationType ? String(args.locationType) : null,
          duration: args.duration ? Number(args.duration) : 30,
          dialogueText: args.dialogueText ? String(args.dialogueText) : null,
          productionNotes: args.productionNotes ? String(args.productionNotes) : null,
          cameraMovement: args.cameraMovement ? String(args.cameraMovement) : null,
          colorPalette: args.colorPalette ? String(args.colorPalette) : null,
          status: "draft",
        } as any);
        return {
          success: true,
          data: {
            scene: { id: scene.id, title: scene.title, orderIndex: scene.orderIndex },
            message: `Scene "${scene.title}" created as Scene ${scene.orderIndex + 1} in "${project.title}".`,
            action: { type: "navigate", page: "scene_editor", projectId, sceneId: scene.id },
          },
        };
      }

      case "update_scene": {
        const sceneId = Number(args.sceneId);
        const { sceneId: _sid, ...updates } = args;
        const scene = await db.updateScene(sceneId, updates as any);
        return {
          success: true,
          data: {
            scene: { id: scene.id, title: scene.title },
            message: `Scene "${scene.title}" updated.`,
          },
        };
      }

      case "delete_scene": {
        const sceneId = Number(args.sceneId);
        const scene = await db.getSceneById(sceneId);
        if (!scene) return { success: false, error: "Scene not found." };
        await db.deleteScene(sceneId);
        return {
          success: true,
          data: { message: `Scene "${scene.title}" deleted.` },
        };
      }

      // ─── Character Tools ─────────────────────────────────────────────

      case "list_characters": {
        let characters;
        if (args.projectId) {
          characters = await db.getProjectCharacters(Number(args.projectId));
        } else {
          characters = await db.getUserLibraryCharacters(ctx.userId);
        }
        return {
          success: true,
          data: {
            characters: characters.map((c) => ({
              id: c.id,
              name: c.name,
              role: c.role,
              description: c.description,
              storyImportance: c.storyImportance,
              occupation: c.occupation,
              nationality: c.nationality,
            })),
            total: characters.length,
          },
        };
      }

      case "create_character": {
        const character = await db.createCharacter({
          userId: ctx.userId,
          projectId: args.projectId ? Number(args.projectId) : null,
          name: String(args.name || "New Character"),
          description: args.description ? String(args.description) : null,
          role: args.role ? String(args.role) : null,
          storyImportance: args.storyImportance ? String(args.storyImportance) : null,
          occupation: args.occupation ? String(args.occupation) : null,
          nationality: args.nationality ? String(args.nationality) : null,
          arcType: args.arcType ? String(args.arcType) : null,
          moralAlignment: args.moralAlignment ? String(args.moralAlignment) : null,
        } as any);
        return {
          success: true,
          data: {
            character: { id: character.id, name: character.name, role: character.role },
            message: `Character "${character.name}" created.`,
          },
        };
      }

      case "update_character": {
        const characterId = Number(args.characterId);
        const { characterId: _cid, ...updates } = args;
        const character = await db.updateCharacter(characterId, updates as any);
        return {
          success: true,
          data: {
            character: { id: character.id, name: character.name },
            message: `Character "${character.name}" updated.`,
          },
        };
      }

      // ─── Script Tools ────────────────────────────────────────────────

      case "list_scripts": {
        const scripts = await db.getProjectScripts(Number(args.projectId));
        return {
          success: true,
          data: {
            scripts: scripts.map((s) => ({
              id: s.id,
              title: s.title,
              version: s.version,
              pageCount: s.pageCount,
              updatedAt: s.updatedAt,
            })),
            total: scripts.length,
          },
        };
      }

      case "get_script": {
        const script = await db.getScriptById(Number(args.scriptId));
        if (!script) return { success: false, error: "Script not found." };
        return {
          success: true,
          data: {
            id: script.id,
            title: script.title,
            version: script.version,
            pageCount: script.pageCount,
            content: script.content ? script.content.substring(0, 3000) + (script.content.length > 3000 ? "\n\n[...script continues...]" : "") : null,
          },
        };
      }

      case "generate_script": {
        const projectId = Number(args.projectId);
        const project = await db.getProjectById(projectId, ctx.userId);
        if (!project) return { success: false, error: "Project not found." };
        const scenes = await db.getProjectScenes(projectId);
        const characters = await db.getProjectCharacters(projectId);
        if (scenes.length === 0) {
          return { success: false, error: "This project has no scenes yet. Create some scenes first, then I can generate the screenplay." };
        }
        const sceneBlock = scenes.map((s, i) =>
          `Scene ${i + 1}: "${s.title}" — ${s.description || ""} (${s.locationType || ""}, ${s.timeOfDay || ""}, ${s.mood || ""})`
        ).join("\n");
        const charBlock = characters.map((c) =>
          `${c.name}: ${c.role || ""} — ${c.description || ""}`
        ).join("\n");
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an award-winning Hollywood screenwriter. Write a production-ready screenplay in proper industry format (INT./EXT. sluglines, action lines, dialogue) based on the director's project. Keep it faithful to the scenes and characters provided.`,
            },
            {
              role: "user",
              content: `Film: "${project.title}" — ${project.genre || "Drama"}, ${project.rating || "PG-13"}\n${project.plotSummary ? `Plot: ${project.plotSummary}\n` : ""}${project.tone ? `Tone: ${project.tone}\n` : ""}\nCharacters:\n${charBlock || "No characters defined yet."}\n\nScenes:\n${sceneBlock}\n\n${args.style ? `Style notes: ${args.style}\n` : ""}Write the complete screenplay.`,
            },
          ],
          maxTokens: 4000,
        });
        const content = result.choices[0]?.message?.content;
        const scriptText = typeof content === "string" ? content : "";
        // Save the script to the database
        const script = await db.createScript({
          projectId,
          userId: ctx.userId,
          title: `${project.title} — Screenplay`,
          content: scriptText,
          version: 1,
          pageCount: Math.ceil(scriptText.length / 1500),
        });
        return {
          success: true,
          data: {
            script: { id: script.id, title: script.title, pageCount: script.pageCount },
            preview: scriptText.substring(0, 500) + "...",
            message: `Screenplay "${script.title}" generated and saved (${script.pageCount} pages).`,
            action: { type: "navigate", page: "script_editor", projectId, scriptId: script.id },
          },
        };
      }

      // ─── Shot List ───────────────────────────────────────────────────

      case "generate_shot_list": {
        const projectId = Number(args.projectId);
        const project = await db.getProjectById(projectId, ctx.userId);
        if (!project) return { success: false, error: "Project not found." };
        const scenes = await db.getProjectScenes(projectId);
        const characters = await db.getProjectCharacters(projectId);
        if (scenes.length === 0) {
          return { success: false, error: "No scenes found. Add scenes to the project first." };
        }
        const sceneDescriptions = scenes.map((s, i) =>
          `Scene ${i + 1} "${s.title}": ${s.description} | Time: ${s.timeOfDay} | Location: ${s.locationType} | Camera: ${s.cameraAngle} | Lighting: ${s.lighting} | Mood: ${s.mood}`
        ).join("\n");
        const charList = characters.map((c) => `${c.name}: ${c.description || ""}`).join("\n");
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional film production assistant. Generate a detailed, industry-standard shot list. Include shot number, scene, shot type, camera movement, lens, framing, action, and notes. Return as JSON.",
            },
            {
              role: "user",
              content: `Film: ${project.title} (${project.genre || "Drama"})\n\nScenes:\n${sceneDescriptions}\n\nCharacters:\n${charList}\n\nGenerate a professional shot list with 2-4 shots per scene.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "shot_list",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  shots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        shotNumber: { type: "string" },
                        sceneTitle: { type: "string" },
                        shotType: { type: "string" },
                        cameraMovement: { type: "string" },
                        lens: { type: "string" },
                        framing: { type: "string" },
                        action: { type: "string" },
                        dialogue: { type: "string" },
                        notes: { type: "string" },
                      },
                      required: ["shotNumber", "sceneTitle", "shotType", "cameraMovement", "lens", "framing", "action", "dialogue", "notes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["shots"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = result.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");
        return {
          success: true,
          data: {
            shots: parsed.shots || [],
            total: (parsed.shots || []).length,
            message: `Shot list generated with ${(parsed.shots || []).length} shots across ${scenes.length} scenes.`,
            action: { type: "navigate", page: "shot_list", projectId },
          },
        };
      }

      // ─── Location Tools ──────────────────────────────────────────────

      case "list_locations": {
        const locations = await db.getProjectLocations(Number(args.projectId));
        return {
          success: true,
          data: {
            locations: locations.map((l) => ({
              id: l.id,
              name: l.name,
              locationType: l.locationType,
              description: l.description,
              address: l.address,
            })),
            total: locations.length,
          },
        };
      }

      case "suggest_locations": {
        const projectId = Number(args.projectId);
        const project = await db.getProjectById(projectId, ctx.userId);
        if (!project) return { success: false, error: "Project not found." };
        const scenes = await db.getProjectScenes(projectId);
        const locationTypes = [...new Set(scenes.map((s) => s.locationType).filter(Boolean))];
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional film location scout. Suggest real-world filming locations based on the project details. Return JSON with an array of location suggestions.",
            },
            {
              role: "user",
              content: `Film: "${project.title}" — ${project.genre || "Drama"}, Tone: ${project.tone || "cinematic"}\n${project.setting ? `Setting: ${project.setting}\n` : ""}Location types needed: ${locationTypes.join(", ") || "various"}\n\nSuggest 5 ideal filming locations with names, descriptions, and practical notes.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "location_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  locations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        locationType: { type: "string" },
                        description: { type: "string" },
                        visualStyle: { type: "string" },
                        practicalNotes: { type: "string" },
                        tags: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "locationType", "description", "visualStyle", "practicalNotes", "tags"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["locations"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = result.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");
        // Save the suggestions to the database
        const saved = [];
        for (const loc of (parsed.locations || []).slice(0, 5)) {
          const saved_loc = await db.createLocation({
            projectId,
            userId: ctx.userId,
            name: loc.name,
            locationType: loc.locationType,
            description: `${loc.description}\n\nVisual Style: ${loc.visualStyle}\n\nPractical Notes: ${loc.practicalNotes}`,
            tags: loc.tags || [],
            referenceImages: [],
            sceneId: null,
          } as any);
          saved.push({ id: saved_loc.id, name: saved_loc.name, locationType: saved_loc.locationType });
        }
        return {
          success: true,
          data: {
            locations: saved,
            message: `${saved.length} location suggestions added to your Location Scout.`,
            action: { type: "navigate", page: "location_scout", projectId },
          },
        };
      }

      // ─── Budget Tools ────────────────────────────────────────────────

      case "list_budgets": {
        const budgets = await db.getProjectBudgets(Number(args.projectId));
        return {
          success: true,
          data: {
            budgets: budgets.map((b) => ({
              id: b.id,
              totalEstimate: b.totalEstimate,
              currency: b.currency,
              aiAnalysis: b.aiAnalysis ? b.aiAnalysis.substring(0, 200) : null,
              generatedAt: b.generatedAt,
            })),
            total: budgets.length,
          },
        };
      }

      // ─── Subtitle Tools ──────────────────────────────────────────────

      case "generate_subtitles": {
        const sceneId = Number(args.sceneId);
        const scene = await db.getSceneById(sceneId);
        if (!scene) return { success: false, error: "Scene not found." };
        const language = String(args.language || "en");
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional subtitle writer. Generate timed subtitle entries for the scene. Return JSON.",
            },
            {
              role: "user",
              content: `Scene: "${scene.title}"\nDescription: ${scene.description || ""}\nDialogue: ${scene.dialogueText || "No dialogue specified."}\nDuration: ${scene.duration || 30}s\nLanguage: ${language}\n\nGenerate subtitle entries with start time, end time, and text.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "subtitles",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  subtitles: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        startTime: { type: "number" },
                        endTime: { type: "number" },
                        text: { type: "string" },
                      },
                      required: ["startTime", "endTime", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["subtitles"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = result.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");
        // Save subtitles as a single subtitle document with entries
        const langNames: Record<string, string> = { en: "English", fr: "French", es: "Spanish", de: "German", zh: "Chinese", ja: "Japanese", ko: "Korean", pt: "Portuguese", it: "Italian", ar: "Arabic" };
        const entries = (parsed.subtitles || []).map((sub: any) => ({ sceneId, startTime: sub.startTime, endTime: sub.endTime, text: sub.text }));
        await db.createSubtitle({
          projectId: scene.projectId,
          userId: ctx.userId,
          language,
          languageName: langNames[language] || language,
          entries,
          isGenerated: 1,
          isTranslation: 0,
        } as any);
        return {
          success: true,
          data: {
            count: entries.length,
            message: `${entries.length} subtitle entries generated for "${scene.title}" in ${langNames[language] || language}.`,
          },
        };
      }

      // ─── Mood Board ──────────────────────────────────────────────────

      case "list_mood_board": {
        const items = await db.getProjectMoodBoard(Number(args.projectId));
        return {
          success: true,
          data: {
            items: items.map((m) => ({
              id: m.id,
              type: m.type,
              text: m.text,
              imageUrl: m.imageUrl,
              color: m.color,
              category: m.category,
            })),
            total: items.length,
          },
        };
      }

      // ─── Generation Jobs ─────────────────────────────────────────────

      case "list_generation_jobs": {
        const jobs = await db.getProjectJobs(Number(args.projectId));
        return {
          success: true,
          data: {
            jobs: jobs.slice(0, 10).map((j) => ({
              id: j.id,
              type: j.type,
              status: j.status,
              progress: j.progress,
              createdAt: j.createdAt,
              resultUrl: j.resultUrl,
            })),
            total: jobs.length,
          },
        };
      }

      // ─── Dialogue ────────────────────────────────────────────────────

      case "generate_dialogue": {
        const sceneId = Number(args.sceneId);
        const scene = await db.getSceneById(sceneId);
        if (!scene) return { success: false, error: "Scene not found." };
        const characters = await db.getProjectCharacters(scene.projectId);
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional screenplay dialogue writer. Write authentic, character-driven dialogue for the scene. Return JSON with an array of dialogue lines.",
            },
            {
              role: "user",
              content: `Scene: "${scene.title}"\nDescription: ${scene.description || ""}\nMood: ${scene.mood || ""}\nTime: ${scene.timeOfDay || ""}\nLocation: ${scene.locationType || ""}\nCharacters: ${characters.map((c) => `${c.name} (${c.role || ""})`).join(", ")}\n${args.context ? `Direction: ${args.context}\n` : ""}Existing dialogue: ${scene.dialogueText || "None"}\n\nWrite dialogue for this scene.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "dialogue",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  lines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        characterName: { type: "string" },
                        line: { type: "string" },
                        emotion: { type: "string" },
                        direction: { type: "string" },
                      },
                      required: ["characterName", "line", "emotion", "direction"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["lines"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = result.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");
        // Save dialogue lines
        for (let i = 0; i < (parsed.lines || []).length; i++) {
          const line = parsed.lines[i];
          await db.createDialogue({
            projectId: scene.projectId,
            sceneId,
            userId: ctx.userId,
            characterName: line.characterName,
            line: line.line,
            emotion: line.emotion,
            direction: line.direction,
            orderIndex: i,
          } as any);
        }
        return {
          success: true,
          data: {
            lines: parsed.lines || [],
            message: `${(parsed.lines || []).length} dialogue lines written for "${scene.title}".`,
          },
        };
      }

      // ─── Continuity Check ────────────────────────────────────────────

      case "check_continuity": {
        const projectId = Number(args.projectId);
        const project = await db.getProjectById(projectId, ctx.userId);
        if (!project) return { success: false, error: "Project not found." };
        const scenes = await db.getProjectScenes(projectId);
        const characters = await db.getProjectCharacters(projectId);
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional script supervisor. Analyze the film project for continuity errors. Check character consistency, location logic, timeline coherence, and prop/wardrobe continuity. Return JSON.",
            },
            {
              role: "user",
              content: `Film: "${project.title}"\n\nScenes:\n${scenes.map((s, i) => `${i + 1}. "${s.title}": ${s.description || ""} (${s.timeOfDay}, ${s.weather}, ${s.locationType})`).join("\n")}\n\nCharacters:\n${characters.map((c) => `${c.name}: ${c.description || ""}`).join("\n")}\n\nFind continuity issues.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "continuity_check",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string" },
                        category: { type: "string" },
                        description: { type: "string" },
                        suggestion: { type: "string" },
                      },
                      required: ["severity", "category", "description", "suggestion"],
                      additionalProperties: false,
                    },
                  },
                  overallScore: { type: "number" },
                  summary: { type: "string" },
                },
                required: ["issues", "overallScore", "summary"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = result.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");
        return {
          success: true,
          data: {
            issues: parsed.issues || [],
            overallScore: parsed.overallScore || 100,
            summary: parsed.summary || "No issues found.",
            message: `Continuity check complete. Found ${(parsed.issues || []).length} issues. Score: ${parsed.overallScore || 100}/100.`,
          },
        };
      }

      // ─── User Context ────────────────────────────────────────────────

      case "get_user_context": {
        const user = await db.getUserById(ctx.userId);
        if (!user) return { success: false, error: "User not found." };
        const tierNames: Record<string, string> = {
          amateur: "Creator",
          independent: "Studio",
          studio: "Production",
          industry: "Enterprise",
        };
        const tier = (user as any).subscriptionTier || "amateur";
        return {
          success: true,
          data: {
            tier: tierNames[tier] || tier,
            credits: (user as any).creditBalance ?? 0,
            name: user.name,
            email: user.email,
          },
        };
      }

      // ─── Navigation ──────────────────────────────────────────────────

      case "navigate_to": {
        // This is handled client-side via the SSE event
        return {
          success: true,
          data: {
            page: args.page,
            projectId: args.projectId,
            sceneId: args.sceneId,
            scriptId: args.scriptId,
            message: `Navigating to ${args.page}...`,
            action: { type: "navigate", page: args.page, projectId: args.projectId, sceneId: args.sceneId, scriptId: args.scriptId },
          },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Tool execution failed." };
  }
}
