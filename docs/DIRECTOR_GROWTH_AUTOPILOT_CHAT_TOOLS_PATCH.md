# Director Chat Tools — Growth Autopilot Patch

## Goal

Allow the Virelle Director's Assistant chat to control Growth Autopilot directly from natural language commands, for example:

```text
Start the growth autopilot and post weekly YouTube content for Virelle, Swappys, and VIBA.
```

```text
Kickstart the advertising content now.
```

```text
Check growth autopilot status.
```

```text
Pause growth autopilot.
```

## Branch

This patch is intentionally left on branch:

```text
director-growth-autopilot-chat-tools
```

Replit can wire and test it before merge.

## New file added

```text
server/director-growth-autopilot-chat-tools.ts
```

It exports:

```ts
GROWTH_AUTOPILOT_DIRECTOR_TOOLS
getGrowthAutopilotToolDescription(toolName)
executeGrowthAutopilotDirectorTool(toolName, args)
```

## Required wiring

### 1. Update `server/director-tools.ts`

Add import near the top:

```ts
import {
  GROWTH_AUTOPILOT_DIRECTOR_TOOLS,
  getGrowthAutopilotToolDescription,
} from "./director-growth-autopilot-chat-tools";
```

Add the tools to the exported array:

```ts
export const DIRECTOR_TOOLS: Tool[] = [
  // existing tools...
  regenerateScene,
  ...GROWTH_AUTOPILOT_DIRECTOR_TOOLS,
];
```

Add this before the existing default in `getDirectorToolDescription`:

```ts
const growthDescription = getGrowthAutopilotToolDescription(toolName);
if (growthDescription) return growthDescription;
```

### 2. Update `server/director-executor.ts`

Add import near the top:

```ts
import { executeGrowthAutopilotDirectorTool } from "./director-growth-autopilot-chat-tools";
```

At the start of `executeDirectorTool`, inside the `try` block and before the switch, add:

```ts
const growthTool = await executeGrowthAutopilotDirectorTool(toolName, args);
if (growthTool.handled) {
  return growthTool.success
    ? { success: true, data: growthTool.data }
    : { success: false, error: growthTool.error || "Growth Autopilot tool failed." };
}
```

## Expected chat behaviour

After wiring and deploy, the Director's Assistant should be able to execute these tools:

```text
start_growth_autopilot
stop_growth_autopilot
check_growth_autopilot_status
run_growth_autopilot_now
```

User commands should map naturally:

| User says | Tool |
|---|---|
| “Start the advertising content” | `start_growth_autopilot` |
| “Kickstart the YouTube content now” | `start_growth_autopilot` with `runNow: true` or `run_growth_autopilot_now` |
| “Check if the content engine is running” | `check_growth_autopilot_status` |
| “Pause growth autopilot” | `stop_growth_autopilot` |

## Safety

- Still uses YouTube OAuth only.
- Does not use email/password login.
- Does not add Snapchat or TikTok.
- Does not change public Virelle user flows.
- Does not merge to main from this branch.

## Verification

After Replit applies the wiring, run:

```bash
pnpm check
pnpm build
```

Then test in Director chat:

```text
Check growth autopilot status.
```

Then:

```text
Kickstart the advertising content now for Virelle, Swappys, and VIBA.
```
