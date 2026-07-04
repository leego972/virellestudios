# Director Assistant — Tier-Gated Feature Access

## Requirement

The Virelle Director's Assistant should be able to use any available Virelle website/app feature that the logged-in user is allowed to use under their membership tier, credit balance, ownership, and role.

The Assistant should not be limited to only film-production chat tools. It should act as the user's operational assistant across the whole Virelle app.

## Core rule

```text
Assistant access = user membership tier + user ownership + available credits + existing Virelle permissions
```

The Assistant must never bypass Virelle's existing subscription, role, credit, account, or ownership checks.

## Required behaviour

When a user asks the Assistant to do something inside Virelle, the Assistant should:

1. Identify the matching app feature.
2. Check whether the logged-in user's tier allows that feature.
3. Check whether the user owns or is allowed to manage the target resource.
4. Check whether the action needs credits or provider budget.
5. Run the matching backend action when allowed.
6. Return a clear success, failure, or upgrade-required message.

## Capability registry requirement

Every user-facing Virelle feature should be registered as a Director capability with metadata:

```ts
export type DirectorCapability = {
  id: string;
  toolName: string;
  title: string;
  description: string;
  area: string;
  minTier: string;
  creditCostKey?: string;
  requiresOwnership: boolean;
  requiresExplicitUserIntent: boolean;
  actionType: "read" | "create" | "update" | "generate" | "publish" | "remove" | "navigate" | "status";
};
```

## Tier gate examples

```text
Free / basic users:
- read allowed pages
- create limited projects
- use limited AI generations
- check available account/tier status
- run only features included in the basic tier

Creator / paid users:
- larger project limits
- more generation tools
- standard scene/script/asset workflows

Studio / production users:
- larger generation limits
- campaign tools
- publishing workflows
- more automation access

Industry / enterprise users:
- full production suite
- team/collaboration features
- advanced publishing/growth tools
- high-volume workflows
```

Use the real Virelle tier names and limits from the existing subscription system. Do not invent different tier names in production code.

## Assistant response rules

If allowed:

```text
Run the action directly and report the result.
```

If not allowed:

```text
Explain that this feature is not included in the user's current membership tier and identify the required tier if the app exposes that information.
```

If credits are insufficient:

```text
Explain that the user needs more credits or a higher tier before the action can run.
```

If ownership is missing:

```text
Explain that the Assistant cannot modify a resource the user does not own or manage.
```

## Important safety/stability rules

- The Assistant may use any available feature only within the user's entitlement.
- The Assistant must use existing Virelle backend validation rather than bypassing it.
- The Assistant must not expose secrets, passwords, OAuth tokens, API keys, or private credentials.
- Write, generate, publish, and remove actions should be audit logged.
- Destructive actions require explicit user wording.
- Paid provider actions must respect existing credit and budget systems.

## Growth Autopilot

Growth Autopilot access should also be tier-gated.

At minimum:

- status checks can be available to the owner/admin.
- start/run/publish actions should require the tier or role that includes advertising/publishing automation.
- YouTube publishing requires OAuth configuration.
- Snapchat and TikTok remain excluded at launch unless explicitly enabled later.

## Expected result

The user should be able to tell the Assistant:

```text
Create a project.
Generate the first scenes.
Start the advertising content.
Check failed jobs.
Publish the YouTube content.
Update this scene.
Show me my credit status.
```

The Assistant should perform those actions when the user's membership tier and permissions allow it.
