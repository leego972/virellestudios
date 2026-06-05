export type SceneFootageUsageMode = "replace" | "overlay" | "reference" | "clip";

export const SCENE_FOOTAGE_USAGE_LABELS: Record<SceneFootageUsageMode, string> = {
  replace: "Use uploaded footage as the final scene clip",
  overlay: "Overlay / composite AI elements over uploaded footage",
  reference: "Use uploaded footage as an AI reference only",
  clip: "Insert uploaded footage as a project timeline clip",
};

export const SCENE_FOOTAGE_UPLOAD_REQUIREMENTS = {
  maxBytes: 150 * 1024 * 1024,
  acceptedMimeTypes: [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/webm",
  ],
};
