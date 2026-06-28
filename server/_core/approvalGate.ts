/**
   * approvalGate.ts — Virelle Studios production approval gate.
   *
   * Determines whether a film production action (publish, distribute, delete
   * assets, bulk render) requires explicit human approval before proceeding.
   * Never bypasses approval for high-risk categories. Mirrors the VIBA
   * approval gate pattern, adapted for film production operations.
   */

  export type ProductionApprovalCategory =
    | "asset_deletion"
    | "distribution_release"
    | "billing_change"
    | "provider_key_change"
    | "export_to_platform"
    | "bulk_render"
    | "project_archive"
    | "out_of_scope";

  export interface ProductionApprovalContext {
    userId?: number;
    projectId?: number;
    estimatedCost?: number;
    affectedAssets?: number;
    targetPlatform?: string;
  }

  export interface ProductionApprovalDecision {
    required: boolean;
    categories: ProductionApprovalCategory[];
    reasons: string[];
  }

  export interface ProductionApprovalRequest {
    approvalRequired: boolean;
    reason: string;
    requiredPhrase?: string;
    risk: "low" | "medium" | "high";
  }

  const HIGH_RISK: ProductionApprovalCategory[] = [
    "asset_deletion",
    "distribution_release",
    "billing_change",
    "provider_key_change",
    "project_archive",
  ];

  export function requiresProductionApproval(
    action: string,
    context: ProductionApprovalContext = {},
  ): ProductionApprovalDecision {
    const categories: ProductionApprovalCategory[] = [];
    const reasons: string[] = [];

    if (/delete|remove|purge|destroy/i.test(action)) {
      categories.push("asset_deletion");
      reasons.push("Destructive asset operation — cannot be undone");
    }
    if (/distribut|publish|release|launch|submit/i.test(action)) {
      categories.push("distribution_release");
      reasons.push("Distribution or public release — review before proceeding");
    }
    if (/billing|credit|subscription|payment|charge/i.test(action)) {
      categories.push("billing_change");
      reasons.push("Billing impact — requires confirmation");
    }
    if (/api.?key|provider.?key|byok|credential/i.test(action)) {
      categories.push("provider_key_change");
      reasons.push("Provider credential change — affects active renders");
    }
    if (/export|youtube|vimeo|festival|theatr|platform/i.test(action)) {
      categories.push("export_to_platform");
      reasons.push("External platform export — verify output before submission");
    }
    if (/bulk.?render|batch|all.?scenes/i.test(action)) {
      categories.push("bulk_render");
      const cost = context.estimatedCost ?? 0;
      reasons.push(cost > 10
        ? `High-cost bulk render (~$${cost.toFixed(2)}) — confirm budget`
        : "Bulk render — verify scene list before starting");
    }
    if (/archive|close.?project|end.?project/i.test(action)) {
      categories.push("project_archive");
      reasons.push("Project archival — assets will become read-only");
    }

    return { required: categories.length > 0, categories, reasons };
  }

  export function assertProductionApproval(
    action: string,
    context: ProductionApprovalContext = {},
  ): void {
    const decision = requiresProductionApproval(action, context);
    if (decision.required) {
      throw new Error(
        `[approvalGate] Action requires approval: ${action}. ` +
        `Reasons: ${decision.reasons.join("; ")}. ` +
        `Use buildProductionApprovalRequest() to surface this to the user.`
      );
    }
  }

  export function buildProductionApprovalRequest(
    action: string,
    context: ProductionApprovalContext = {},
  ): ProductionApprovalRequest {
    const decision = requiresProductionApproval(action, context);
    const isHigh = decision.categories.some(c => HIGH_RISK.includes(c));
    const isMed = !isHigh && decision.required;
    return {
      approvalRequired: decision.required,
      reason: decision.reasons[0] ?? "Approval required for this production action",
      requiredPhrase: isHigh ? "I approve this Virelle action" : undefined,
      risk: isHigh ? "high" : isMed ? "medium" : "low",
    };
  }
  