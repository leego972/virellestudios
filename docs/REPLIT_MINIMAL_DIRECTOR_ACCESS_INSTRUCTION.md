# Minimal Replit Instruction

Use branch:

```text
director-growth-autopilot-chat-tools
```

Implement this exactly:

```text
Make the Virelle Director's Assistant able to use any Virelle website/app feature that the logged-in user is entitled to use under their membership tier, credits, ownership, and role.

Do not bypass existing Virelle permissions, ownership checks, credit checks, subscription checks, or backend validation.

Wire the staged Growth Autopilot chat tools into the Director's Assistant:
- start_growth_autopilot
- stop_growth_autopilot
- check_growth_autopilot_status
- run_growth_autopilot_now

Then create a tier-gated Director capability registry so every user-facing Virelle feature can be exposed to the Assistant as an approved callable tool.

The Assistant should execute actions directly when the user asks, not just explain where to click.

Read/status/navigation actions can run when needed.
Create/edit/generate/publish actions can run when the user's tier, credits, role, and ownership allow it.
Remove/cancel/destructive actions require explicit user wording.
Billing/security/credential actions require clear user wording and must never expose secrets.

Run:
pnpm check
pnpm build

Do not merge unless both pass.
```

Expected result:

```text
The Director's Assistant can operate Virelle for the user across the whole app, limited by that user's membership tier and permissions.
```
