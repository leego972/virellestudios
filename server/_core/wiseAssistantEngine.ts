/**
 * Wise Assistant Engine
 * 
 * Enhances the Director's Assistant to be proactive about catching errors,
 * suggesting improvements, and recommending better workflowsâwithout being pushy.
 * 
 * The assistant remains task-focused but gently flags issues and offers alternatives.
 */

import * as db from "../db";
import { logger } from "./logger";

export interface AssistantRecommendation {
  type: "warning" | "suggestion" | "optimization";
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  actionLabel?: string;
  actionType?: "navigate" | "execute" | "none";
  actionData?: Record<string, unknown>;
}

/**
 * Analyze a project for potential issues and improvements
 */
export async function analyzeProjectHealth(projectId: number, userId: number): Promise<AssistantRecommendation[]> {
  const recommendations: AssistantRecommendation[] = [];

  try {
    const project = await db.getProjectById(projectId, userId);
    if (!project) return [];

    const scenes = await db.getProjectScenes(projectId);
    const characters = await db.getProjectCharacters(projectId);
    const soundEffects = await db.listSoundEffectsByProject(projectId);

    // ââ Warning: No scenes yet ââââââââââââââââââââââââââââââââââââââââââââââ
    if (scenes.length === 0) {
      recommendations.push({
        type: "warning",
        severity: "high",
        title: "No Scenes Created",
        message: "Your project has no scenes yet. Start by describing your first scene to the assistant, or use 'Create a scene' to get started.",
        actionLabel: "Create First Scene",
        actionType: "navigate",
        actionData: { route: "/projects/" + projectId + "/scenes" },
      });
    }

    // ââ Warning: Inconsistent character descriptions ââââââââââââââââââââââ
    if (characters.length > 1) {
      const characterAppearances = new Map<number, Set<string>>();
      for (const scene of scenes) {
        const sceneChars = await db.getSceneCharacters(scene.id);
        for (const char of sceneChars) {
          if (!characterAppearances.has(char.id)) {
            characterAppearances.set(char.id, new Set());
          }
          if ((char as any).physicalDescription ?? char.description) {
            characterAppearances.get(char.id)!.add(((char as any).physicalDescription || char.description) ?? "");
          }
        }
      }

      for (const [charId, descriptions] of characterAppearances.entries()) {
        if (descriptions.size > 1) {
          const char = characters.find((c) => c.id === charId);
          recommendations.push({
            type: "warning",
            severity: "medium",
            title: `Inconsistent Appearance: ${char?.name}`,
            message: `"${char?.name}" appears with different physical descriptions across scenes. For photorealism, keep character appearances consistent. Would you like me to standardize this?`,
            actionLabel: "Standardize Appearance",
            actionType: "execute",
            actionData: { characterId: charId, action: "standardize_appearance" },
          });
        }
      }
    }

    // ââ Suggestion: Scene duration optimization âââââââââââââââââââââââââ
    const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 60), 0);
    const avgDuration = totalDuration / scenes.length;
    const outliers = scenes.filter((s) => (s.duration || 60) > avgDuration * 1.5 || (s.duration || 60) < avgDuration * 0.5);

    if (outliers.length > 0) {
      recommendations.push({
        type: "suggestion",
        severity: "low",
        title: "Scene Duration Variance",
        message: `${outliers.length} scene(s) have unusual durations compared to the average (${Math.round(avgDuration)}s). This might be intentional, but check if they're realistic for their content.`,
        actionLabel: "Review Durations",
        actionType: "navigate",
        actionData: { route: "/projects/" + projectId + "/scenes" },
      });
    }

    // ââ Optimization: Missing sound design ââââââââââââââââââââââââââââââ
    const scenesWithoutSFX = scenes.filter((s) => !soundEffects.some((sfx) => sfx.sceneId === s.id));
    if (scenesWithoutSFX.length > 0 && scenes.length > 0) {
      const percentage = Math.round((scenesWithoutSFX.length / scenes.length) * 100);
      if (percentage > 50) {
        recommendations.push({
          type: "suggestion",
          severity: "low",
          title: "Minimal Sound Design",
          message: `${percentage}% of your scenes don't have sound effects. Adding ambient sounds, foley, or music can significantly enhance the production quality.`,
          actionLabel: "Add Sound Effects",
          actionType: "navigate",
          actionData: { route: "/projects/" + projectId + "/sound" },
        });
      }
    }

    // ââ Optimization: Project metadata ââââââââââââââââââââââââââââââââââ
    if (!project.genre || !project.rating || !project.description?.length) {
      recommendations.push({
        type: "suggestion",
        severity: "low",
        title: "Complete Project Metadata",
        message: "Your project is missing some details (genre, rating, or description). Filling these in helps with funding, distribution, and AI generation quality.",
        actionLabel: "Edit Project",
        actionType: "navigate",
        actionData: { route: "/projects/" + projectId + "/settings" },
      });
    }

    // ââ Optimization: Dialogue timing âââââââââââââââââââââââââââââââââââ
    for (const scene of scenes) {
      const dialogueLines = await db.getSceneDialogues(scene.id);
      if (dialogueLines.length > 0) {
        const estimatedDialogueDuration = dialogueLines.length * 3; // ~3 seconds per line average
        if (scene.duration && scene.duration < estimatedDialogueDuration) {
          recommendations.push({
            type: "suggestion",
            severity: "medium",
            title: `Tight Dialogue Timing: ${scene.title}`,
            message: `"${scene.title}" has ${dialogueLines.length} dialogue lines but only ${scene.duration}s duration. Characters may speak too fast. Consider increasing the duration to ${estimatedDialogueDuration}s or more.`,
            actionLabel: "Adjust Duration",
            actionType: "execute",
            actionData: { sceneId: scene.id, newDuration: estimatedDialogueDuration },
          });
        }
      }
    }

    // ââ Warning: Photorealism compliance ââââââââââââââââââââââââââââââââ
    for (const scene of scenes) {
      const sceneChars = await db.getSceneCharacters(scene.id);
      for (const char of sceneChars) {
        const _pd = (char as any).physicalDescription || char.description || "";
        if (!_pd || _pd.length < 50) {
          recommendations.push({
            type: "warning",
            severity: "medium",
            title: `Incomplete Character Details: ${char.name}`,
            message: `"${char.name}" in "${scene.title}" lacks detailed physical description. For photorealistic AI generation, include: age, ethnicity, skin tone, build, hair (color/length/style), eye color, and facial features.`,
            actionLabel: "Add Details",
            actionType: "execute",
            actionData: { characterId: char.id, sceneId: scene.id, action: "expand_description" },
          });
        }
      }
    }
  } catch (error) {
    logger.error("Error analyzing project health:", error);
  }

  return recommendations;
}

/**
 * Validate a scene before generation
 */
export async function validateSceneBeforeGeneration(sceneId: number): Promise<AssistantRecommendation[]> {
  const recommendations: AssistantRecommendation[] = [];

  try {
    const scene = await db.getSceneById(sceneId);
    if (!scene) return [];

    // Check description length
    if (!scene.description || scene.description.length < 50) {
      recommendations.push({
        type: "warning",
        severity: "high",
        title: "Vague Scene Description",
        message: "The scene description is too brief. Add more detail about the setting, action, and mood to get better AI generation results.",
        actionLabel: "Expand Description",
        actionType: "execute",
        actionData: { sceneId, action: "expand_description" },
      });
    }

    // Check for character consistency
    const characters = await db.getSceneCharacters(sceneId);
    for (const char of characters) {
      const _pd = (char as any).physicalDescription || char.description || "";
      if (!_pd || _pd.length < 50) {
        recommendations.push({
          type: "warning",
          severity: "high",
          title: `Incomplete Character: ${char.name}`,
          message: `"${char.name}" needs more detailed physical description for consistent AI generation across scenes.`,
        });
      }
    }

    // Check lighting setup
    if (!scene.lighting || scene.lighting === "natural") {
      if (scene.timeOfDay === "night") {
        recommendations.push({
          type: "suggestion",
          severity: "medium",
          title: "Night Scene Lighting",
          message: `This is a night scene. Consider specifying lighting (e.g., "neon", "candlelight", "dramatic") for better atmosphere.`,
          actionLabel: "Set Lighting",
          actionType: "execute",
          actionData: { sceneId, action: "set_lighting" },
        });
      }
    }

    // Check for dialogue sync requirements
    const dialogueLines = await db.getSceneDialogue(sceneId);
    if (dialogueLines.length > 0 && !scene.productionNotes?.includes("LIP SYNC")) {
      recommendations.push({
        type: "suggestion",
        severity: "medium",
        title: "Dialogue Lip-Sync Note",
        message: "This scene has dialogue. Make sure the production notes include 'LIP SYNC REQUIRED' so the AI generation maintains accurate mouth movements.",
        actionLabel: "Add Lip-Sync Note",
        actionType: "execute",
        actionData: { sceneId, action: "add_lip_sync_note" },
      });
    }
  } catch (error) {
    logger.error("Error validating scene:", error);
  }

  return recommendations;
}

/**
 * Suggest workflow improvements based on user actions
 */
export function suggestWorkflowImprovement(action: string, context: Record<string, unknown>): AssistantRecommendation | null {
  // If user just created a scene without a detailed description
  if (action === "create_scene" && (context.description as string)?.length < 50) {
    return {
      type: "suggestion",
      severity: "low",
      title: "Expand Your Scene Description",
      message: "Your scene description is brief. Adding more detail about the setting, characters, and action will help the AI generate better results.",
      actionLabel: "Edit Description",
      actionType: "execute",
      actionData: { sceneId: context.sceneId, action: "expand_description" },
    };
  }

  // If user is adding a character without appearance details
  if (action === "create_character" && !context.physicalDescription) {
    return {
      type: "suggestion",
      severity: "medium",
      title: "Add Character Appearance",
      message: "For photorealistic AI generation, describe the character's appearance: age, ethnicity, build, hair, eyes, and distinctive features.",
      actionLabel: "Add Appearance",
      actionType: "execute",
      actionData: { characterId: context.characterId, action: "add_appearance" },
    };
  }

  // If user is generating a scene with minimal sound design
  if (action === "generate_scene" && !(context.soundEffects as any[])?.length) {
    return {
      type: "suggestion",
      severity: "low",
      title: "Consider Adding Sound Design",
      message: "Sound effects and ambient audio can significantly enhance your scene. Would you like to add some after generation?",
      actionLabel: "Add Sound Later",
      actionType: "none",
    };
  }

  return null;
}

/**
 * Format recommendations for display in the assistant UI
 */
export function formatRecommendationForDisplay(rec: AssistantRecommendation): string {
  const icon = {
    warning: "â ï¸",
    suggestion: "ð¡",
    optimization: "â¨",
  }[rec.type];

  return `${icon} **${rec.title}**\n${rec.message}`;
}

/**
 * Batch recommendations by severity for prioritized display
 */
export function prioritizeRecommendations(recs: AssistantRecommendation[]): {
  critical: AssistantRecommendation[];
  important: AssistantRecommendation[];
  nice_to_have: AssistantRecommendation[];
} {
  return {
    critical: recs.filter((r) => r.severity === "high" && r.type === "warning"),
    important: recs.filter((r) => (r.severity === "medium" || r.type === "suggestion") && r.type !== "warning"),
    nice_to_have: recs.filter((r) => r.severity === "low"),
  };
}
