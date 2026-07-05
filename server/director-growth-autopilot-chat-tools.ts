import type { Tool } from "./_core/llm";
import {
  getVirelleGrowthAutopilotState,
  runWeeklyGrowthAutopilot,
  startVirelleGrowthAutopilot,
  stopVirelleGrowthAutopilot,
} from "./virelle-growth-autopilot";

export const startGrowthAutopilotTool: Tool = {
  type: "function",
  function: {
    name: "start_growth_autopilot",
    description:
      "Start the Virelle Director's Assistant Growth Autopilot. Use this when the user asks to start, kickstart, turn on, activate, or begin autonomous advertising/content/YouTube posting for Virelle, Swappys, and VIBA.",
    parameters: {
      type: "object",
      properties: {
        runNow: {
          type: "boolean",
          description: "When true, immediately run one content/SEO/YouTube cycle instead of only enabling the scheduler.",
        },
      },
      required: [],
    },
  },
};

export const stopGrowthAutopilotTool: Tool = {
  type: "function",
  function: {
    name: "stop_growth_autopilot",
    description:
      "Stop or pause the Virelle Growth Autopilot scheduler. Use this when the user asks to stop, pause, disable, or turn off autonomous advertising/content/YouTube posting.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

export const checkGrowthAutopilotStatusTool: Tool = {
  type: "function",
  function: {
    name: "check_growth_autopilot_status",
    description:
      "Check whether the Virelle Growth Autopilot is enabled, running, YouTube-configured, when it last ran, and the latest publish results.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

export const runGrowthAutopilotNowTool: Tool = {
  type: "function",
  function: {
    name: "run_growth_autopilot_now",
    description:
      "Immediately run one Growth Autopilot content cycle now: generate relevant Virelle, Swappys, and VIBA content, SEO metadata, video/thumbnail assets, and submit to YouTube if OAuth and video generation are configured.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

export const GROWTH_AUTOPILOT_DIRECTOR_TOOLS: Tool[] = [
  startGrowthAutopilotTool,
  stopGrowthAutopilotTool,
  checkGrowthAutopilotStatusTool,
  runGrowthAutopilotNowTool,
];

export function getGrowthAutopilotToolDescription(toolName: string): string | null {
  switch (toolName) {
    case "start_growth_autopilot":
      return "Starting Growth Autopilot for Virelle, Swappys, VIBA, and YouTube...";
    case "stop_growth_autopilot":
      return "Stopping Growth Autopilot...";
    case "check_growth_autopilot_status":
      return "Checking Growth Autopilot status...";
    case "run_growth_autopilot_now":
      return "Running Growth Autopilot content, SEO, and YouTube cycle now...";
    default:
      return null;
  }
}

function publicState() {
  const state = getVirelleGrowthAutopilotState();
  return {
    enabled: state.enabled,
    isRunning: state.isRunning,
    lastRunAt: state.lastRunAt,
    lastStatus: state.lastStatus,
    lastError: state.lastError,
    totalRuns: state.totalRuns,
    nextCheckAt: state.nextCheckAt,
    youtubeConfigured: state.youtubeConfigured,
    youtubeAccount: state.youtubeAccount,
    excludedChannels: state.excludedChannels,
    latestPublishResults: state.latestPublishResults,
  };
}

export async function executeGrowthAutopilotDirectorTool(
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<{ handled: boolean; success?: boolean; data?: unknown; error?: string }> {
  try {
    switch (toolName) {
      case "start_growth_autopilot": {
        startVirelleGrowthAutopilot();
        let runResult: unknown = null;
        if (args.runNow === true) {
          runResult = await runWeeklyGrowthAutopilot({ force: true, reason: "manual" });
        }
        return {
          handled: true,
          success: true,
          data: {
            message: args.runNow === true
              ? "Growth Autopilot started and an immediate content/SEO/YouTube cycle was triggered."
              : "Growth Autopilot scheduler started. It will manage weekly Virelle, Swappys, and VIBA content automatically.",
            state: publicState(),
            runResult,
          },
        };
      }

      case "stop_growth_autopilot": {
        stopVirelleGrowthAutopilot();
        return {
          handled: true,
          success: true,
          data: {
            message: "Growth Autopilot stopped. No new scheduled YouTube content cycles will run until restarted.",
            state: publicState(),
          },
        };
      }

      case "check_growth_autopilot_status": {
        return {
          handled: true,
          success: true,
          data: {
            message: "Growth Autopilot status loaded.",
            state: publicState(),
          },
        };
      }

      case "run_growth_autopilot_now": {
        const result = await runWeeklyGrowthAutopilot({ force: true, reason: "manual" });
        return {
          handled: true,
          success: true,
          data: {
            message: "Growth Autopilot content/SEO/YouTube cycle triggered now.",
            result,
            state: publicState(),
          },
        };
      }

      default:
        return { handled: false };
    }
  } catch (err: any) {
    return {
      handled: true,
      success: false,
      error: err?.message || "Growth Autopilot tool failed.",
    };
  }
}
