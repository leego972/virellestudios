/**
 * Feature Timeline ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Persistent versioned cut editor for feature-length films
 *
 * Capabilities:
 * - Create / duplicate / delete versioned cuts
 * - AI-generate act structure (3-act, 5-act, hero's journey, etc.)
 * - Drag-and-drop scene reordering within acts
 * - Include / exclude individual scenes
 * - Trim in/out per scene
 * - Lock / unlock cuts
 * - One-click compile to full film
 * - Continuity record viewer per scene
 * - Audio plan panel
 * - Character arc overview
 */
import { useState, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Lock, Unlock, Plus, Copy, Trash2, Play, Film, Layers,
  CheckCircle2, XCircle, ChevronUp, ChevronDown, GripVertical, Info,
  Wand2, Download, Clock, Loader2, RefreshCw, Settings2, Music,
  Users, BookOpen, Clapperboard, AlertTriangle, Zap, ChevronRight,
  Save, Eye, BarChart3,
} from "lucide-react";

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Types ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ

interface CutScene {
  id: number;
  sceneId: number;
  orderIndex: number;
  actNumber: number;
  actLabel: string | null;
  isIncluded: boolean;
  trimIn: number;
  trimOut: number;
  transitionType: string;
  directorNote: string | null;
  scene: {
    id: number;
    title: string | null;
    description: string | null;
    duration: number;
    thumbnailUrl: string | null;
    videoUrl: string | null;
    status: string;
    orderIndex: number;
    location: string | null;
    timeOfDay: string | null;
  } | null;
}

interface ActGroup {
  id: number;
  actNumber: number;
  label: string;
  description: string | null;
  targetDuration: number | null;
  colorCode: string | null;
  orderIndex: number;
}

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Helpers ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTimecode(seconds: number): string {
  if (!seconds || seconds <= 0) return "00:00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 24);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

const ACT_STRUCTURE_OPTIONS = [
  { value: "three-act", label: "Three-Act Structure" },
  { value: "five-act", label: "Five-Act Structure" },
  { value: "heros-journey", label: "Hero's Journey (12 stages)" },
  { value: "nonlinear", label: "Non-Linear / Anthology" },
  { value: "episodic", label: "Episodic" },
  { value: "two-act", label: "Two-Act Structure" },
];

const ACT_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Scene Card ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ

function SceneCard({
  cs,
  index,
  isFirst,
  isLast,
  isLocked,
  onToggle,
  onMoveUp,
  onMoveDown,
  onNoteChange,
}: {
  cs: CutScene;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isLocked: boolean;
  onToggle: (id: number, included: boolean) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onNoteChange: (id: number, note: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(cs.directorNote || "");
  const scene = cs.scene;
  const isExcluded = !cs.isIncluded;
  const effectiveDuration = Math.max(0, (scene?.duration || 0) - cs.trimIn - cs.trimOut);

  return (
    <div className={`group border rounded-lg transition-all duration-200 ${
      isExcluded
        ? "border-zinc-800 bg-zinc-900/30 opacity-60"
        : "border-amber-500/20 bg-zinc-900/60 hover:border-zinc-600"
    }`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Position / reorder */}
        <div className="flex flex-col items-center gap-0.5 w-7 shrink-0">
          <span className="font-mono text-[10px] text-zinc-500 leading-none">
            {isExcluded ? "ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ" : String(index + 1).padStart(2, "0")}
          </span>
          {!isLocked && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              <button
                onClick={() => onMoveUp(cs.id)}
                disabled={isFirst}
                className="text-zinc-600 hover:text-blue-400 disabled:opacity-20 transition-colors"
              >
                <ChevronUp size={11} />
              </button>
              <button
                onClick={() => onMoveDown(cs.id)}
                disabled={isLast}
                className="text-zinc-600 hover:text-blue-400 disabled:opacity-20 transition-colors"
              >
                <ChevronDown size={11} />
              </button>
            </div>
          )}
          {isLocked && <GripVertical size={12} className="text-zinc-700 mt-0.5" />}
        </div>

        {/* Thumbnail */}
        <div className="w-14 h-9 rounded bg-zinc-800 shrink-0 overflow-hidden">
          {scene?.thumbnailUrl ? (
            <img src={scene.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film size={14} className="text-zinc-600" />
            </div>
          )}
        </div>

        {/* Scene info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium truncate max-w-[180px] ${isExcluded ? "text-zinc-600 line-through" : "text-zinc-200"}`}>
              {scene?.title || `Scene ${cs.sceneId}`}
            </span>
            {scene?.status === "completed" && scene?.videoUrl && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-green-950/40 text-green-400 border border-green-800/40">
                <CheckCircle2 size={8} /> VIDEO
              </span>
            )}
            {scene?.status === "generating" && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-blue-950/40 text-blue-400 border border-blue-800/40">
                <Loader2 size={8} className="animate-spin" /> GEN
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {scene?.timeOfDay && <span className="text-[10px] text-zinc-600">{scene.timeOfDay}</span>}
            {scene?.location && <span className="text-[10px] text-zinc-600 truncate max-w-[120px]">{scene.location}</span>}
          </div>
        </div>

        {/* Duration */}
        <div className="shrink-0 text-right">
          <span className={`font-mono text-xs font-medium ${isExcluded ? "text-zinc-600" : "text-blue-400"}`}>
            {formatDuration(effectiveDuration)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setExpanded(!expanded)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                <Info size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Notes & trim</p></TooltipContent>
          </Tooltip>
          {!isLocked && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggle(cs.id, !cs.isIncluded)}
                  className={`transition-colors ${isExcluded ? "text-zinc-600 hover:text-green-400" : "text-green-500 hover:text-red-400"}`}
                >
                  {isExcluded ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                </button>
              </TooltipTrigger>
              <TooltipContent><p>{isExcluded ? "Include" : "Exclude"}</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Expanded notes */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-zinc-800/50 pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-zinc-500">Trim In (s)</Label>
              <Input
                type="number"
                min={0}
                value={cs.trimIn}
                readOnly={isLocked}
                className="h-6 text-xs bg-zinc-800 border-amber-500/20"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-500">Trim Out (s)</Label>
              <Input
                type="number"
                min={0}
                value={cs.trimOut}
                readOnly={isLocked}
                className="h-6 text-xs bg-zinc-800 border-amber-500/20"
              />
            </div>
          </div>
          {!isLocked && (
            <div>
              <Label className="text-[10px] text-zinc-500">Director Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => onNoteChange(cs.id, note)}
                rows={2}
                className="text-xs bg-zinc-800 border-amber-500/20 resize-none"
                placeholder="Add a note for this scene..."
              />
            </div>
          )}
          {cs.directorNote && isLocked && (
            <p className="text-xs text-zinc-400 italic">{cs.directorNote}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Act Group Panel ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ

function ActGroupPanel({
  actGroups,
  cutScenes,
  isLocked,
  onMoveUp,
  onMoveDown,
  onToggle,
  onNoteChange,
}: {
  actGroups: ActGroup[];
  cutScenes: CutScene[];
  isLocked: boolean;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onToggle: (id: number, included: boolean) => void;
  onNoteChange: (id: number, note: string) => void;
}) {
  const includedScenes = cutScenes.filter((cs) => cs.isIncluded);

  if (actGroups.length === 0) {
    // No act groups ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ render flat list
    return (
      <div className="space-y-2">
        {cutScenes.map((cs, idx) => {
          const includedIdx = includedScenes.findIndex((s) => s.id === cs.id);
          return (
            <SceneCard
              key={cs.id}
              cs={cs}
              index={includedIdx >= 0 ? includedIdx : idx}
              isFirst={cs.isIncluded && includedIdx === 0}
              isLast={cs.isIncluded && includedIdx === includedScenes.length - 1}
              isLocked={isLocked}
              onToggle={onToggle}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onNoteChange={onNoteChange}
            />
          );
        })}
      </div>
    );
  }

  // Group scenes by act
  return (
    <div className="space-y-4">
      {actGroups.map((act) => {
        const actScenes = cutScenes.filter((cs) => cs.actNumber === act.actNumber);
        const actIncluded = actScenes.filter((cs) => cs.isIncluded);
        const actDuration = actIncluded.reduce((sum, cs) => {
          const raw = cs.scene?.duration || 0;
          return sum + Math.max(0, raw - cs.trimIn - cs.trimOut);
        }, 0);

        return (
          <div key={act.id} className="rounded-lg border border-zinc-800 overflow-hidden">
            {/* Act header */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderLeft: `3px solid ${act.colorCode || "#3b82f6"}` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-200">{act.label}</span>
                <Badge variant="outline" className="text-[10px] font-mono border-amber-500/20 text-zinc-400">
                  {actIncluded.length} scenes
                </Badge>
                {act.targetDuration && (
                  <span className="text-[10px] text-zinc-500">
                    target: {formatDuration(act.targetDuration)}
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-blue-400">{formatDuration(actDuration)}</span>
            </div>

            {/* Act scenes */}
            <div className="p-2 space-y-1.5 bg-zinc-950/30">
              {actScenes.length === 0 ? (
                <p className="text-[10px] text-zinc-600 text-center py-2">No scenes in this act</p>
              ) : (
                actScenes.map((cs) => {
                  const includedIdx = includedScenes.findIndex((s) => s.id === cs.id);
                  const actIncludedIdx = actIncluded.findIndex((s) => s.id === cs.id);
                  return (
                    <SceneCard
                      key={cs.id}
                      cs={cs}
                      index={includedIdx >= 0 ? includedIdx : 0}
                      isFirst={cs.isIncluded && actIncludedIdx === 0}
                      isLast={cs.isIncluded && actIncludedIdx === actIncluded.length - 1}
                      isLocked={isLocked}
                      onToggle={onToggle}
                      onMoveUp={onMoveUp}
                      onMoveDown={onMoveDown}
                      onNoteChange={onNoteChange}
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      {/* Unassigned scenes */}
      {(() => {
        const assignedActNums = new Set(actGroups.map((a) => a.actNumber));
        const unassigned = cutScenes.filter((cs) => !assignedActNums.has(cs.actNumber));
        if (unassigned.length === 0) return null;
        return (
          <div className="rounded-lg border border-zinc-800/50 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-l-2 border-amber-500/20">
              <span className="text-xs font-semibold text-zinc-500">Unassigned</span>
              <Badge variant="outline" className="text-[10px] border-amber-500/20 text-zinc-500">{unassigned.length}</Badge>
            </div>
            <div className="p-2 space-y-1.5 bg-zinc-950/20">
              {unassigned.map((cs, idx) => (
                <SceneCard
                  key={cs.id}
                  cs={cs}
                  index={idx}
                  isFirst={idx === 0}
                  isLast={idx === unassigned.length - 1}
                  isLocked={isLocked}
                  onToggle={onToggle}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onNoteChange={onNoteChange}
                />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Main Page ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ

export default function FeatureTimeline() {
  const { projectId } = useParams<{ projectId: string }>();
  const projId = parseInt(projectId || "0");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // UI state
  const [selectedCutId, setSelectedCutId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [newCutDialogOpen, setNewCutDialogOpen] = useState(false);
  const [newCutForm, setNewCutForm] = useState({
    name: "", description: "", actStructure: "three-act", version: "v1.0",
    populateFromProject: true,
  });
  const [generateActsDialogOpen, setGenerateActsDialogOpen] = useState(false);
  const [generateActsStructure, setGenerateActsStructure] = useState("three-act");
  const [compileDialogOpen, setCompileDialogOpen] = useState(false);
  const [compileOptions, setCompileOptions] = useState({
    includeOpener: true, includeCredits: true, burnSubtitles: false,
    resolution: "1080p" as "720p" | "1080p" | "4k", frameRate: 24,
  });
  const [activeCompileJobId, setActiveCompileJobId] = useState<number | null>(null);

  // Queries
  const { data: summary, isLoading: summaryLoading } = trpc.featureFilm.getFeatureFilmSummary.useQuery(
    { projectId: projId },
    { refetchInterval: 5000 }
  );

  const { data: cutData, isLoading: cutLoading, refetch: refetchCut } = trpc.featureFilm.getCut.useQuery(
    { cutId: selectedCutId! },
    {
      enabled: !!selectedCutId,
      refetchInterval: 3000,
    }
  );

  const { data: compileJob } = trpc.featureFilm.getCompileJob.useQuery(
    { jobId: activeCompileJobId! },
    {
      enabled: !!activeCompileJobId,
      refetchInterval: (query) => {
        const job = query.state.data as any;
        return job?.status === "processing" || job?.status === "queued" ? 2000 : false;
      },
    }
  );

  // Auto-select first cut
  const cuts = summary?.cuts || [];
  const effectiveCutId = selectedCutId || cuts[0]?.id || null;

  // Mutations
  const createCutMutation = trpc.featureFilm.createCut.useMutation({
    onSuccess: (cut) => {
      utils.featureFilm.getFeatureFilmSummary.invalidate({ projectId: projId });
      setSelectedCutId(cut.id);
      setNewCutDialogOpen(false);
      toast.success(`Cut "${cut.name}" created`);
    },
    onError: (err) => toast.error(err.message),
  });

  const lockCutMutation = trpc.featureFilm.lockCut.useMutation({
    onSuccess: (result) => {
      utils.featureFilm.getCut.invalidate({ cutId: effectiveCutId! });
      utils.featureFilm.getFeatureFilmSummary.invalidate({ projectId: projId });
      toast.success(result.isLocked ? "Cut locked" : "Cut unlocked");
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateCutMutation = trpc.featureFilm.duplicateCut.useMutation({
    onSuccess: (cut) => {
      utils.featureFilm.getFeatureFilmSummary.invalidate({ projectId: projId });
      setSelectedCutId(cut.id);
      toast.success(`Duplicate cut "${cut.name}" created`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteCutMutation = trpc.featureFilm.deleteCut.useMutation({
    onSuccess: () => {
      utils.featureFilm.getFeatureFilmSummary.invalidate({ projectId: projId });
      setSelectedCutId(null);
      toast.success("Cut deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateCutSceneMutation = trpc.featureFilm.updateCutScene.useMutation({
    onSuccess: () => {
      utils.featureFilm.getCut.invalidate({ cutId: effectiveCutId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const reorderCutScenesMutation = trpc.featureFilm.reorderCutScenes.useMutation({
    onSuccess: () => {
      utils.featureFilm.getCut.invalidate({ cutId: effectiveCutId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const generateActsMutation = trpc.featureFilm.generateActStructure.useMutation({
    onSuccess: (result) => {
      utils.featureFilm.getCut.invalidate({ cutId: effectiveCutId! });
      setGenerateActsDialogOpen(false);
      toast.success(`Act structure generated: ${result.acts?.length || 0} acts`);
    },
    onError: (err) => toast.error(err.message),
  });

  const compileFilmMutation = trpc.featureFilm.compileFilm.useMutation({
    onSuccess: (result) => {
      setActiveCompileJobId(result.jobId);
      setCompileDialogOpen(false);
      toast.success("Film compilation started. Tracking progress...");
    },
    onError: (err) => toast.error(err.message),
  });

  const generateContinuityMutation = trpc.featureFilm.generateContinuityRecords.useMutation({
    onSuccess: (result) => {
      toast.success(`Continuity records generated for ${result.count} scenes`);
    },
    onError: (err) => toast.error(err.message),
  });

  const generateArcsMutation = trpc.featureFilm.generateCharacterArcs.useMutation({
    onSuccess: (result) => {
      toast.success(`Character arcs generated for ${result.count} characters`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Handlers
  const handleToggleScene = useCallback((cutSceneId: number, included: boolean) => {
    if (!effectiveCutId) return;
    updateCutSceneMutation.mutate({ cutSceneId, isIncluded: included });
  }, [effectiveCutId, updateCutSceneMutation]);

  const handleMoveUp = useCallback((cutSceneId: number) => {
    if (!cutData || !effectiveCutId) return;
    const scenes = [...cutData.scenes].sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = scenes.findIndex((cs) => cs.id === cutSceneId);
    if (idx <= 0) return;
    const newOrder = [...scenes];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    reorderCutScenesMutation.mutate({
      cutId: effectiveCutId,
      orderedCutSceneIds: newOrder.map((cs) => cs.id),
    });
  }, [cutData, effectiveCutId, reorderCutScenesMutation]);

  const handleMoveDown = useCallback((cutSceneId: number) => {
    if (!cutData || !effectiveCutId) return;
    const scenes = [...cutData.scenes].sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = scenes.findIndex((cs) => cs.id === cutSceneId);
    if (idx >= scenes.length - 1) return;
    const newOrder = [...scenes];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    reorderCutScenesMutation.mutate({
      cutId: effectiveCutId,
      orderedCutSceneIds: newOrder.map((cs) => cs.id),
    });
  }, [cutData, effectiveCutId, reorderCutScenesMutation]);

  const handleNoteChange = useCallback((cutSceneId: number, note: string) => {
    updateCutSceneMutation.mutate({ cutSceneId, directorNote: note });
  }, [updateCutSceneMutation]);

  // Derived data
  const activeCut = cutData?.cut;
  const cutScenes = useMemo(() => {
    if (!cutData?.scenes) return [];
    return [...cutData.scenes].sort((a, b) => a.orderIndex - b.orderIndex) as CutScene[];
  }, [cutData]);
  const actGroupsList = (cutData?.actGroups || []) as ActGroup[];
  const includedScenes = cutScenes.filter((cs) => cs.isIncluded);
  const totalDuration = includedScenes.reduce((sum, cs) => {
    const raw = cs.scene?.duration || 0;
    return sum + Math.max(0, raw - cs.trimIn - cs.trimOut);
  }, 0);
  const scenesWithVideo = includedScenes.filter((cs) => cs.scene?.videoUrl).length;

  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-400 text-amber-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur sticky top-0 z-20">
        <div className="container py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projId}`)}>
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
            <Separator orientation="vertical" className="h-5 bg-zinc-700" />
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-amber-500" />
              <span className="font-semibold text-sm text-zinc-100">Feature Timeline</span>
              {summary?.project?.title && (
                <span className="text-xs text-zinc-500">ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ {summary.project.title}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Compile status */}
            {compileJob && (compileJob.status === "queued" || compileJob.status === "processing") && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/40 border border-blue-800/40">
                <Loader2 size={12} className="animate-spin text-blue-400" />
                <span className="text-xs text-blue-400">{compileJob.currentStep || "Compiling..."}</span>
                <span className="font-mono text-xs text-amber-300">{compileJob.progress}%</span>
              </div>
            )}
            {compileJob?.status === "completed" && (
              <a
                href={compileJob.resultUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-950/40 border border-green-800/40 text-green-400 text-xs hover:bg-green-900/40 transition-colors"
              >
                <Download size={12} /> Download Film
              </a>
            )}

            {/* Compile button */}
            {summary?.readyToCompile && (
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
                onClick={() => setCompileDialogOpen(true)}
              >
                <Film size={14} /> Compile Film
              </Button>
            )}

            {/* New cut */}
            <Button size="sm" variant="outline" className="gap-1.5 border-amber-500/20" onClick={() => setNewCutDialogOpen(true)}>
              <Plus size={14} /> New Cut
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ cut list */}
        <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
          <div className="p-3 border-b border-zinc-800">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">Cuts</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {cuts.length === 0 ? (
                <div className="text-center py-6">
                  <Layers size={24} className="text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs font-medium text-zinc-400">No cuts yet</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug px-2">A cut is a saved version of your edit ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ name your first one to start.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs border-amber-500/20"
                    onClick={() => setNewCutDialogOpen(true)}
                  >
                    <Plus size={12} className="mr-1" /> Create First Cut
                  </Button>
                </div>
              ) : (
                cuts.map((cut) => (
                  <button
                    key={cut.id}
                    onClick={() => setSelectedCutId(cut.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                      (selectedCutId || cuts[0]?.id) === cut.id
                        ? "bg-amber-500/10 border border-amber-500/30"
                        : "hover:bg-amber-500/10/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-200 truncate">{cut.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {cut.isDefault && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">DEFAULT</span>
                        )}
                        {cut.isLocked && <Lock size={10} className="text-green-400" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[10px] text-zinc-500">{cut.version}</span>
                      <span className="text-[10px] text-zinc-600">{cut.sceneCount} scenes</span>
                      <span className="font-mono text-[10px] text-blue-500">{formatDuration(cut.totalDuration)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Project stats */}
          <div className="p-3 border-t border-zinc-800 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Project</p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-600">Total Scenes</span>
                <span className="text-zinc-400 font-mono">{summary?.sceneStats.totalScenes || 0}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-600">With Video</span>
                <span className="text-zinc-400 font-mono">{summary?.sceneStats.scenesWithVideo || 0}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-600">Total Duration</span>
                <span className="text-blue-400 font-mono">{formatDuration(summary?.sceneStats.totalDurationSeconds || 0)}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!effectiveCutId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Layers size={48} className="text-zinc-700 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2 gradient-text-gold">No Cut Selected</h2>
                <p className="text-sm text-zinc-600 mb-4">Create a new cut to start building your feature timeline.</p>
                <Button onClick={() => setNewCutDialogOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-500">
                  <Plus size={16} /> Create First Cut
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Cut toolbar */}
              <div className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-sm font-semibold text-zinc-100">{activeCut?.name || "Loading..."}</span>
                    <span className="ml-2 font-mono text-xs text-zinc-500">{activeCut?.version}</span>
                  </div>
                  {activeCut?.isLocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-950/40 text-green-400 border border-green-800/40">
                      <Lock size={9} /> LOCKED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/30 text-amber-400 border border-amber-800/40">
                      <Unlock size={9} /> EDITING
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Runtime counter */}
                  <div className="font-mono text-sm text-blue-400 bg-zinc-900 px-3 py-1 rounded border border-zinc-800">
                    {formatTimecode(totalDuration)}
                  </div>
                  <span className="text-xs text-zinc-500">{includedScenes.length} scenes</span>
                  {activeCut?.targetRuntime && (
                    <span className="text-xs text-zinc-600">/ target {formatDuration(activeCut.targetRuntime)}</span>
                  )}

                  <Separator orientation="vertical" className="h-5 bg-zinc-700" />

                  {/* Generate acts */}
                  {!activeCut?.isLocked && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-amber-500/20 text-xs"
                      onClick={() => setGenerateActsDialogOpen(true)}
                      disabled={generateActsMutation.isPending}
                    >
                      {generateActsMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      AI Acts
                    </Button>
                  )}

                  {/* Lock / Unlock */}
                  <Button
                    size="sm"
                    variant="outline"
                    className={`gap-1.5 text-xs ${activeCut?.isLocked ? "border-green-800/50 text-green-400 hover:bg-green-950/30" : "border-amber-800/50 text-amber-400 hover:bg-amber-950/30"}`}
                    onClick={() => activeCut && lockCutMutation.mutate({ cutId: activeCut.id, lock: !activeCut.isLocked })}
                    disabled={lockCutMutation.isPending}
                  >
                    {activeCut?.isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                    {activeCut?.isLocked ? "Unlock" : "Lock"}
                  </Button>

                  {/* Duplicate */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-amber-500/20 text-xs"
                    onClick={() => activeCut && duplicateCutMutation.mutate({ cutId: activeCut.id, newName: `${activeCut.name} (copy)` })}
                    disabled={duplicateCutMutation.isPending}
                  >
                    <Copy size={12} /> Dupe
                  </Button>

                  {/* Delete */}
                  {!activeCut?.isLocked && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-red-800/50 text-red-400 hover:bg-red-950/30 text-xs"
                      onClick={() => activeCut && deleteCutMutation.mutate({ cutId: activeCut.id })}
                      disabled={deleteCutMutation.isPending}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-zinc-800 px-4">
                  <TabsList className="bg-transparent border-0 h-9 gap-1">
                    <TabsTrigger value="timeline" className="text-xs data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-100">
                      <Clapperboard size={12} className="mr-1" /> Timeline
                    </TabsTrigger>
                    <TabsTrigger value="acts" className="text-xs data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-100">
                      <BarChart3 size={12} className="mr-1" /> Act Structure
                    </TabsTrigger>
                    <TabsTrigger value="continuity" className="text-xs data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-100">
                      <Eye size={12} className="mr-1" /> Continuity
                    </TabsTrigger>
                    <TabsTrigger value="audio" className="text-xs data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-100">
                      <Music size={12} className="mr-1" /> Audio Plan
                    </TabsTrigger>
                    <TabsTrigger value="arcs" className="text-xs data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-100">
                      <Users size={12} className="mr-1" /> Character Arcs
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Timeline tab */}
                <TabsContent value="timeline" className="flex-1 overflow-hidden m-0">
                  {cutLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="animate-spin text-zinc-400 text-amber-400" size={24} />
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        <ActGroupPanel
                          actGroups={actGroupsList}
                          cutScenes={cutScenes}
                          isLocked={activeCut?.isLocked || false}
                          onToggle={handleToggleScene}
                          onMoveUp={handleMoveUp}
                          onMoveDown={handleMoveDown}
                          onNoteChange={handleNoteChange}
                        />
                        {cutScenes.length === 0 && (
                          <div className="text-center py-12">
                            <Film size={32} className="text-zinc-700 mx-auto mb-3" />
                            <p className="text-sm text-zinc-500">No scenes in this cut</p>
                            <p className="text-xs text-zinc-600 mt-1">Scenes are loaded from your project automatically when creating a cut.</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>

                {/* Act Structure tab */}
                <TabsContent value="acts" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold gradient-text-gold">Act Structure</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {activeCut?.actStructure ? ACT_STRUCTURE_OPTIONS.find(o => o.value === activeCut.actStructure)?.label : "Not set"}
                          </p>
                        </div>
                        {!activeCut?.isLocked && (
                          <Button
                            size="sm"
                            className="gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs"
                            onClick={() => setGenerateActsDialogOpen(true)}
                          >
                            <Wand2 size={12} /> Generate Acts
                          </Button>
                        )}
                      </div>

                      {actGroupsList.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                          <BarChart3 size={24} className="text-zinc-700 mx-auto mb-2" />
                          <p className="text-sm text-zinc-500">No act structure defined</p>
                          <p className="text-xs text-zinc-600 mt-1">Use AI to generate an act structure based on your scenes.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {actGroupsList.map((act) => {
                            const actScenes = cutScenes.filter((cs) => cs.actNumber === act.actNumber && cs.isIncluded);
                            const actDuration = actScenes.reduce((sum, cs) => sum + Math.max(0, (cs.scene?.duration || 0) - cs.trimIn - cs.trimOut), 0);
                            const pct = totalDuration > 0 ? (actDuration / totalDuration) * 100 : 0;
                            return (
                              <div key={act.id} className="rounded-lg border border-zinc-800 p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: act.colorCode || "#3b82f6" }} />
                                    <span className="text-sm font-medium text-zinc-200">{act.label}</span>
                                    <Badge variant="outline" className="text-[10px] border-amber-500/20 text-zinc-400">{actScenes.length} scenes</Badge>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-xs text-blue-400">{formatDuration(actDuration)}</span>
                                    <span className="text-[10px] text-zinc-600 ml-2">{pct.toFixed(0)}%</span>
                                  </div>
                                </div>
                                <Progress value={pct} className="h-1.5 bg-amber-500/20" />
                                {act.description && (
                                  <p className="text-xs text-zinc-500 mt-2">{act.description}</p>
                                )}
                                {act.targetDuration && (
                                  <p className="text-[10px] text-zinc-600 mt-1">
                                    Target: {formatDuration(act.targetDuration)} ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ {actDuration > act.targetDuration ? "over" : "under"} by {formatDuration(Math.abs(actDuration - act.targetDuration))}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Continuity tab */}
                <TabsContent value="continuity" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold gradient-text-gold">Continuity Records</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {summary?.continuityRecordsCount || 0} records for this project
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs"
                          onClick={() => generateContinuityMutation.mutate({ projectId: projId })}
                          disabled={generateContinuityMutation.isPending}
                        >
                          {generateContinuityMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                          AI Generate
                        </Button>
                      </div>
                      {summary?.continuityRecordsCount === 0 ? (
                        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                          <Eye size={24} className="text-zinc-700 mx-auto mb-2" />
                          <p className="text-sm text-zinc-500">No continuity records</p>
                          <p className="text-xs text-zinc-600 mt-1">Generate AI continuity records for wardrobe, props, and character states.</p>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
                          <p className="text-sm text-zinc-300">{summary?.continuityRecordsCount} continuity records generated</p>
                          <p className="text-xs text-zinc-500 mt-1">Per-scene continuity data is available in the Scene Editor.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Audio Plan tab */}
                <TabsContent value="audio" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold gradient-text-gold">Audio Plan</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Status: {summary?.audioPlan?.mixStatus || "Not started"}
                          </p>
                        </div>
                      </div>
                      {summary?.audioPlan ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: "Dialogue", value: summary.audioPlan.dialogueBus },
                              { label: "Music", value: summary.audioPlan.musicBus },
                              { label: "Effects", value: summary.audioPlan.effectsBus },
                            ].map((bus) => (
                              <div key={bus.label} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                <p className="text-[10px] text-zinc-500 mb-1">{bus.label}</p>
                                <Progress value={(bus.value || 0) * 100} className="h-1.5 bg-amber-500/20" />
                                <p className="font-mono text-xs text-zinc-400 mt-1">{((bus.value || 0) * 100).toFixed(0)}%</p>
                              </div>
                            ))}
                          </div>
                          {summary.audioPlan.audioPassNotes && (
                            <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                              <p className="text-[10px] text-zinc-500 mb-1">Notes</p>
                              <p className="text-xs text-zinc-300">{summary.audioPlan.audioPassNotes}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                          <Music size={24} className="text-zinc-700 mx-auto mb-2" />
                          <p className="text-sm text-zinc-500">No audio plan yet</p>
                          <p className="text-xs text-zinc-600 mt-1">Configure voice assignments, music cues, and mix settings in the Audio Plan.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Character Arcs tab */}
                <TabsContent value="arcs" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold gradient-text-gold">Character Arcs</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {summary?.characterArcs?.length || 0} arcs tracked
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs"
                          onClick={() => generateArcsMutation.mutate({ projectId: projId })}
                          disabled={generateArcsMutation.isPending}
                        >
                          {generateArcsMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                          AI Generate
                        </Button>
                      </div>
                      {!summary?.characterArcs?.length ? (
                        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                          <Users size={24} className="text-zinc-700 mx-auto mb-2" />
                          <p className="text-sm text-zinc-500">No character arcs</p>
                          <p className="text-xs text-zinc-600 mt-1">Generate AI character arc analyses for all characters in this project.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {summary.characterArcs.map((arc: any) => (
                            <div key={arc.id} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-zinc-200">Character #{arc.characterId}</span>
                                <Badge variant="outline" className="text-[10px] border-amber-500/20 text-zinc-400">{arc.arcType}</Badge>
                              </div>
                              {arc.arcSummary && <p className="text-xs text-zinc-400">{arc.arcSummary}</p>}
                              {arc.startingState && arc.endingState && (
                                <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
                                  <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{arc.startingState}</span>
                                  <ChevronRight size={10} />
                                  <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{arc.endingState}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>

      {/* New Cut Dialog */}
      <Dialog open={newCutDialogOpen} onOpenChange={setNewCutDialogOpen}>
        <DialogContent className="bg-zinc-900 border-amber-500/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">Create New Cut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-zinc-400">Cut Name</Label>
              <Input
                value={newCutForm.name}
                onChange={(e) => setNewCutForm({ ...newCutForm, name: e.target.value })}
                placeholder="e.g. Director's Cut v2"
                className="bg-zinc-800 border-amber-500/20 text-zinc-100 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Version</Label>
              <Input
                value={newCutForm.version}
                onChange={(e) => setNewCutForm({ ...newCutForm, version: e.target.value })}
                placeholder="v1.0"
                className="bg-zinc-800 border-amber-500/20 text-zinc-100 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Act Structure</Label>
              <Select value={newCutForm.actStructure} onValueChange={(v) => setNewCutForm({ ...newCutForm, actStructure: v })}>
                <SelectTrigger className="bg-zinc-800 border-amber-500/20 text-zinc-100 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-amber-500/20">
                  {ACT_STRUCTURE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-zinc-200">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Description (optional)</Label>
              <Textarea
                value={newCutForm.description}
                onChange={(e) => setNewCutForm({ ...newCutForm, description: e.target.value })}
                rows={2}
                className="bg-zinc-800 border-amber-500/20 text-zinc-100 mt-1 resize-none"
                placeholder="Notes about this cut..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="populate"
                checked={newCutForm.populateFromProject}
                onChange={(e) => setNewCutForm({ ...newCutForm, populateFromProject: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="populate" className="text-xs text-zinc-400 cursor-pointer">
                Populate with all project scenes
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-amber-500/20 text-zinc-300" onClick={() => setNewCutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-500 text-white"
              disabled={!newCutForm.name || createCutMutation.isPending}
              onClick={() => createCutMutation.mutate({
                projectId: projId,
                name: newCutForm.name,
                description: newCutForm.description || undefined,
                actStructure: newCutForm.actStructure as any,
                version: newCutForm.version,
                populateFromProject: newCutForm.populateFromProject,
              })}
            >
              {createCutMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />}
              Create Cut
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Act Structure Dialog */}
      <Dialog open={generateActsDialogOpen} onOpenChange={setGenerateActsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-amber-500/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">Generate Act Structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-zinc-400">
              AI will analyze your scenes and assign them to acts based on the selected structure.
            </p>
            <div>
              <Label className="text-xs text-zinc-400">Act Structure</Label>
              <Select value={generateActsStructure} onValueChange={setGenerateActsStructure}>
                <SelectTrigger className="bg-zinc-800 border-amber-500/20 text-zinc-100 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-amber-500/20">
                  {ACT_STRUCTURE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-zinc-200">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-amber-500/20 text-zinc-300" onClick={() => setGenerateActsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-500 text-white"
              disabled={generateActsMutation.isPending}
              onClick={() => effectiveCutId && generateActsMutation.mutate({
                projectId: projId,
                cutId: effectiveCutId,
                actStructure: generateActsStructure as any,
              })}
            >
              {generateActsMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Wand2 size={14} className="mr-1" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compile Film Dialog */}
      <Dialog open={compileDialogOpen} onOpenChange={setCompileDialogOpen}>
        <DialogContent className="bg-zinc-900 border-amber-500/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 gradient-text-gold">
              <Film size={16} className="text-amber-500" /> Compile Full Film
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-amber-500/20">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">Scenes with video</span>
                <span className="text-zinc-200 font-mono">{scenesWithVideo} / {includedScenes.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Estimated runtime</span>
                <span className="text-blue-400 font-mono">{formatTimecode(totalDuration)}</span>
              </div>
            </div>

            {scenesWithVideo < includedScenes.length && (
              <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-800/40 rounded-lg p-3">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  {includedScenes.length - scenesWithVideo} scene(s) don't have video yet. Only scenes with video will be included.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-400">Resolution</Label>
                <Select value={compileOptions.resolution} onValueChange={(v) => setCompileOptions({ ...compileOptions, resolution: v as any })}>
                  <SelectTrigger className="w-28 h-7 bg-zinc-800 border-amber-500/20 text-zinc-100 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-amber-500/20">
                    <SelectItem value="720p" className="text-zinc-200 text-xs">720p</SelectItem>
                    <SelectItem value="1080p" className="text-zinc-200 text-xs">1080p</SelectItem>
                    <SelectItem value="4k" className="text-zinc-200 text-xs">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {[
                { key: "includeOpener", label: "Include Virelle Studios opener" },
                { key: "includeCredits", label: "Include closing credits" },
                { key: "burnSubtitles", label: "Burn subtitles into video" },
              ].map((opt) => (
                <div key={opt.key} className="flex items-center justify-between">
                  <Label className="text-xs text-zinc-400 cursor-pointer" htmlFor={opt.key}>{opt.label}</Label>
                  <input
                    id={opt.key}
                    type="checkbox"
                    checked={(compileOptions as any)[opt.key]}
                    onChange={(e) => setCompileOptions({ ...compileOptions, [opt.key]: e.target.checked })}
                    className="rounded"
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-amber-500/20 text-zinc-300" onClick={() => setCompileDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
              disabled={compileFilmMutation.isPending || scenesWithVideo === 0}
              onClick={() => compileFilmMutation.mutate({
                projectId: projId,
                cutId: effectiveCutId || undefined,
                ...compileOptions,
              })}
            >
              {compileFilmMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Compile Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
