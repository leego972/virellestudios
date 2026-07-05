/**
   * Director's Assistant Capability Registry
   *
   * Single source of truth for every tool the Director's Assistant can call.
   * Defines: action class, credit cost, minimum subscription tier, admin-only flag.
   *
   * Rules enforced by processDirectorMessage / executeDirectorTool:
   *  - read         → 0 credits, any authenticated user
   *  - create/edit  → 1 credit, any authenticated user
   *  - destructive  → 1 credit, explicit user wording required (enforced by LLM system prompt)
   *  - generate_ai  → varies by tool complexity, Creator+ tier for heavy tools
   *  - admin        → 0 credits, adminOnly=true (server enforces role check)
   *  - billing      → never automated (blocked by system prompt)
   *
   * Plain chat (no tool calls) = 0 credits charged.
   */

  export type ActionClass =
    | "read"
    | "create"
    | "edit"
    | "destructive"
    | "generate_ai"
    | "admin";

  export interface CapabilityEntry {
    /** Credits deducted when this tool executes. 0 = free. */
    creditCost: number;
    /** Broad category of the action — determines LLM guidance and UI affordances. */
    actionClass: ActionClass;
    /**
     * Minimum subscription tier required.
     * null  = any authenticated user
     * "creator" = Creator tier or above
     * "studio"  = Studio tier or above
     */
    minTier: string | null;
    /**
     * If true, the calling user's role must be "admin".
     * Non-admins receive a polite refusal — the tool never executes.
     */
    adminOnly: boolean;
    /** Human-readable description surfaced in the UI credit tooltip. */
    description: string;
  }

  /**
   * Full registry of Director's Assistant callable tools.
   * Any tool not listed here is treated as unknown and will not execute.
   */
  export const DIRECTOR_CAPABILITY_REGISTRY: Record<string, CapabilityEntry> = {

    // ── READ (always free, no credits) ──────────────────────────────────────
    get_project_summary:          { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "Read project summary" },
    get_project_script:           { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "Read project screenplay" },
    list_projects:                { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "List your film projects" },
    get_project:                  { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "Get project details" },
    list_scenes:                  { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "List scenes" },
    list_characters:              { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "List characters" },
    list_scripts:                 { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "List scripts" },
    get_script:                   { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "Get script content" },
    list_locations:               { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "List scouted locations" },
    list_budgets:                 { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "List budget estimates" },
    list_mood_board:              { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "List mood board images" },
    list_generation_jobs:         { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "List generation jobs" },
    get_user_context:             { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "Read account & tier info" },
    navigate_to:                  { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "Navigate to a page" },
    suggest_improvements:         { creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: false, description: "Analyse project & suggest improvements" },
    check_growth_autopilot_status:{ creditCost: 0, actionClass: "read",  minTier: null,      adminOnly: true,  description: "Check Growth Autopilot status" },

    // ── SIMPLE CREATE / EDIT (1 credit each) ────────────────────────────────
    create_project:               { creditCost: 1, actionClass: "create", minTier: null,     adminOnly: false, description: "Create a new film project (1 cr)" },
    update_project:               { creditCost: 1, actionClass: "edit",   minTier: null,     adminOnly: false, description: "Update project details (1 cr)" },
    create_scene:                 { creditCost: 1, actionClass: "create", minTier: null,     adminOnly: false, description: "Add a scene (1 cr)" },
    update_scene:                 { creditCost: 1, actionClass: "edit",   minTier: null,     adminOnly: false, description: "Edit a scene (1 cr)" },
    add_scene:                    { creditCost: 1, actionClass: "create", minTier: null,     adminOnly: false, description: "Add a scene (1 cr)" },
    modify_scene:                 { creditCost: 1, actionClass: "edit",   minTier: null,     adminOnly: false, description: "Modify a scene (1 cr)" },
    reorder_scenes:               { creditCost: 1, actionClass: "edit",   minTier: null,     adminOnly: false, description: "Reorder scenes (1 cr)" },
    add_sound_effect:             { creditCost: 1, actionClass: "edit",   minTier: null,     adminOnly: false, description: "Add sound effect (1 cr)" },
    add_visual_effect:            { creditCost: 1, actionClass: "edit",   minTier: null,     adminOnly: false, description: "Add visual effect (1 cr)" },
    add_dialogue:                 { creditCost: 1, actionClass: "edit",   minTier: null,     adminOnly: false, description: "Add dialogue (1 cr)" },
    create_character:             { creditCost: 1, actionClass: "create", minTier: null,     adminOnly: false, description: "Create a character (1 cr)" },
    update_character:             { creditCost: 1, actionClass: "edit",   minTier: null,     adminOnly: false, description: "Update a character (1 cr)" },

    // ── DESTRUCTIVE (1 credit — requires explicit user wording) ─────────────
    delete_scene:                 { creditCost: 1, actionClass: "destructive", minTier: null, adminOnly: false, description: "Delete a scene (1 cr)" },
    cut_scene:                    { creditCost: 1, actionClass: "destructive", minTier: null, adminOnly: false, description: "Cut/remove a scene (1 cr)" },

    // ── AI GENERATION (varies — heavy compute) ───────────────────────────────
    create_scene_from_vision:     { creditCost: 3,  actionClass: "generate_ai", minTier: null,      adminOnly: false, description: "Create scene from vision (3 cr)" },
    generate_full_film:           { creditCost: 10, actionClass: "generate_ai", minTier: "creator", adminOnly: false, description: "Generate full film (10 cr)" },
    // These tools handle their own deduction internally (matching subscription.ts CREDIT_COSTS):
    generate_script:              { creditCost: 0,  actionClass: "generate_ai", minTier: "creator", adminOnly: false, description: "Generate screenplay — 8 cr deducted internally" },
    generate_shot_list:           { creditCost: 0,  actionClass: "generate_ai", minTier: "creator", adminOnly: false, description: "Generate shot list — 5 cr deducted internally" },
    generate_subtitles:           { creditCost: 0,  actionClass: "generate_ai", minTier: "creator", adminOnly: false, description: "Generate subtitles — 8 cr deducted internally" },
    suggest_locations:            { creditCost: 0,  actionClass: "generate_ai", minTier: null,      adminOnly: false, description: "AI location suggestions — 3 cr deducted internally" },
    generate_dialogue:            { creditCost: 5,  actionClass: "generate_ai", minTier: null,      adminOnly: false, description: "Write dialogue (5 cr)" },
    check_continuity:             { creditCost: 5,  actionClass: "generate_ai", minTier: "creator", adminOnly: false, description: "Run continuity check (5 cr)" },
    regenerate_scene:             { creditCost: 0,  actionClass: "generate_ai", minTier: null,      adminOnly: false, description: "Regenerate scene video — cost varies by duration" },

    // ── ADMIN-ONLY: Growth Autopilot (0 credits, admin perk) ────────────────
    start_growth_autopilot:       { creditCost: 0, actionClass: "admin", minTier: null, adminOnly: true, description: "Start Growth Autopilot scheduler (admin)" },
    stop_growth_autopilot:        { creditCost: 0, actionClass: "admin", minTier: null, adminOnly: true, description: "Stop Growth Autopilot scheduler (admin)" },
    run_growth_autopilot_now:     { creditCost: 0, actionClass: "admin", minTier: null, adminOnly: true, description: "Run Growth Autopilot immediately (admin)" },
  };

  /**
   * Resolve the effective credit cost for a tool execution.
   * Falls back to 0 for unknown tools (belt-and-suspenders: the executor
   * should reject unknown tools before reaching here).
   */
  export function getToolCreditCost(toolName: string): number {
    return DIRECTOR_CAPABILITY_REGISTRY[toolName]?.creditCost ?? 0;
  }

  /**
   * Return true if the tool requires admin role.
   */
  export function isAdminOnlyTool(toolName: string): boolean {
    return DIRECTOR_CAPABILITY_REGISTRY[toolName]?.adminOnly ?? false;
  }

  /**
   * Return true if the tool is a plain read — 0 credits, always allowed.
   */
  export function isReadTool(toolName: string): boolean {
    return (DIRECTOR_CAPABILITY_REGISTRY[toolName]?.actionClass ?? "") === "read";
  }

  /**
   * Return the minimum tier required for this tool, or null if any tier is fine.
   */
  export function getToolMinTier(toolName: string): string | null {
    return DIRECTOR_CAPABILITY_REGISTRY[toolName]?.minTier ?? null;
  }

  /**
   * Ordered tier hierarchy for comparison.
   */
  const TIER_ORDER: string[] = ["free", "creator", "studio", "enterprise"];

  /**
   * Return true if the user's current tier satisfies the tool's minTier requirement.
   */
  export function tierSatisfies(userTier: string | null | undefined, minTier: string | null): boolean {
    if (!minTier) return true;  // no requirement
    const userIdx = TIER_ORDER.indexOf((userTier || "free").toLowerCase());
    const reqIdx  = TIER_ORDER.indexOf(minTier.toLowerCase());
    if (reqIdx === -1) return true; // unknown minTier — allow
    return userIdx >= reqIdx;
  }
  