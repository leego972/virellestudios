import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Film, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Camera, Clock, Zap, Play, ArrowLeft, Layers, Eye, Settings2, Loader2,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  CAMERA_MOVEMENT_OPTIONS, CAMERA_MOVEMENT_LABELS,
  SPEED_RAMP_OPTIONS, SPEED_RAMP_LABELS,
  GENRE_MOTION_OPTIONS, GENRE_MOTION_LABELS,
  CAMERA_BODY_OPTIONS, CAMERA_BODY_LABELS,
  LENS_BRAND_OPTIONS, LENS_BRAND_LABELS,
  APERTURE_OPTIONS, APERTURE_LABELS,
} from "@shared/types";
import { trpc } from "@/lib/trpc";

type ShotData = {
  id: string;
  shotIndex: number;
  duration: number; // seconds, 1-12
  cameraMovement: string;
  speedRamp: string;
  description: string;
  startFrameUrl?: string;
  endFrameUrl?: string;
};

function ShotCard({
  shot,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  shot: ShotData;
  index: number;
  total: number;
  onUpdate: (id: string, data: Partial<ShotData>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  return (
    <Card className="border border-amber-500/20 bg-black/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            <Badge variant="outline" className="text-amber-400 border-amber-500/40 text-xs">
              Shot {index + 1}
            </Badge>
            <span className="text-xs text-muted-foreground">{shot.duration}s</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              onClick={() => onMoveUp(shot.id)} disabled={index === 0}
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              onClick={() => onMoveDown(shot.id)} disabled={index === total - 1}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300"
              onClick={() => onDelete(shot.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Duration</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[shot.duration]}
                onValueChange={([v]) => onUpdate(shot.id, { duration: v })}
                min={1} max={12} step={1}
                className="flex-1"
              />
              <span className="text-xs text-amber-400 w-8 text-right">{shot.duration}s</span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Speed Ramp</Label>
            <Select value={shot.speedRamp} onValueChange={(v) => onUpdate(shot.id, { speedRamp: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPEED_RAMP_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">
                    {SPEED_RAMP_LABELS[opt] || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Camera Movement</Label>
          <Select value={shot.cameraMovement} onValueChange={(v) => onUpdate(shot.id, { cameraMovement: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMERA_MOVEMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-xs">
                  {CAMERA_MOVEMENT_LABELS[opt] || opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Shot Description</Label>
          <Textarea
            value={shot.description}
            onChange={(e) => onUpdate(shot.id, { description: e.target.value })}
            placeholder="Describe what happens in this shot..."
            className="text-xs min-h-[60px] resize-none" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Start Frame URL</Label>
            <Input
              value={shot.startFrameUrl || ""}
              onChange={(e) => onUpdate(shot.id, { startFrameUrl: e.target.value })}
              placeholder="https://..."
              className="h-7 text-xs" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">End Frame URL</Label>
            <Input
              value={shot.endFrameUrl || ""}
              onChange={(e) => onUpdate(shot.id, { endFrameUrl: e.target.value })}
              placeholder="https://..."
              className="h-7 text-xs" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MultiShotSequencer() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string; sceneId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const sceneId = parseInt(params.sceneId || "0");

  const [shots, setShots] = useState<ShotData[]>([
    { id: "shot-1", shotIndex: 0, duration: 4, cameraMovement: "slow-push-in", speedRamp: "normal", description: "" },
    { id: "shot-2", shotIndex: 1, duration: 3, cameraMovement: "static", speedRamp: "normal", description: "" },
  ]);
  const [genreMotion, setGenreMotion] = useState("auto");
  const [cameraBody, setCameraBody] = useState("arri-alexa-mini-lf");
  const [lensBrand, setLensBrand] = useState("zeiss-supreme-prime");
  const [aperture, setAperture] = useState("t2.8");
  const [sequenceMode, setSequenceMode] = useState<"auto" | "manual">("manual");

  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
  const maxShots = 12;

  const addShot = () => {
    if (shots.length >= maxShots) {
      toast.error(`Maximum ${maxShots} shots per sequence`);
      return;
    }
    const newShot: ShotData = {
      id: `shot-${Date.now()}`,
      shotIndex: shots.length,
      duration: 3,
      cameraMovement: "static",
      speedRamp: "normal",
      description: "",
    };
    setShots([...shots, newShot]);
  };

  const updateShot = (id: string, data: Partial<ShotData>) => {
    setShots(shots.map((s) => (s.id === id ? { ...s, ...data } : s)));
  };

  const deleteShot = (id: string) => {
    if (shots.length <= 1) {
      toast.error("A sequence must have at least one shot");
      return;
    }
    setShots(shots.filter((s) => s.id !== id));
  };

  const moveUp = (id: string) => {
    const idx = shots.findIndex((s) => s.id === id);
    if (idx <= 0) return;
    const newShots = [...shots];
    [newShots[idx - 1], newShots[idx]] = [newShots[idx], newShots[idx - 1]];
    setShots(newShots);
  };

  const moveDown = (id: string) => {
    const idx = shots.findIndex((s) => s.id === id);
    if (idx >= shots.length - 1) return;
    const newShots = [...shots];
    [newShots[idx], newShots[idx + 1]] = [newShots[idx + 1], newShots[idx]];
    setShots(newShots);
  };

  const updateSceneMutation = trpc.scene.update.useMutation({
    onSuccess: () => toast.success(`Multi-shot sequence saved — ${shots.length} shots, ${totalDuration}s total`),
    onError: (err) => toast.error(err.message || "Failed to save sequence"),
  });

  const handleSave = () => {
    if (!sceneId) { toast.error("No scene selected"); return; }
    updateSceneMutation.mutate({
      id: sceneId,
      multiShotEnabled: true,
      multiShotCount: shots.length,
      multiShotData: shots,
      genreMotion,
      cameraBody,
      lensBrand,
      aperture,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-black/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                Multi-Shot Sequencer
              </h1>
              <p className="text-xs text-muted-foreground">
                {shots.length} shots · {totalDuration}s total · {sequenceMode} mode
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSequenceMode(sequenceMode === "auto" ? "manual" : "auto")}>
              <Settings2 className="w-4 h-4 mr-1" />
              {sequenceMode === "auto" ? "Switch to Manual" : "Switch to Auto"}
            </Button>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black" onClick={handleSave} disabled={updateSceneMutation.isPending}>
              {updateSceneMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
              {updateSceneMutation.isPending ? "Saving..." : "Generate Sequence"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 md:p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Camera Rig Setup */}
        <div className="col-span-1 space-y-4">
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                Camera Rig Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Camera Body / Sensor</Label>
                <Select value={cameraBody} onValueChange={setCameraBody}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMERA_BODY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {CAMERA_BODY_LABELS[opt] || opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Lens Glass</Label>
                <Select value={lensBrand} onValueChange={setLensBrand}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENS_BRAND_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {LENS_BRAND_LABELS[opt] || opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Aperture / T-Stop</Label>
                <Select value={aperture} onValueChange={setAperture}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APERTURE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {APERTURE_LABELS[opt] || opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Genre Motion Logic</Label>
                <Select value={genreMotion} onValueChange={setGenreMotion}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRE_MOTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {GENRE_MOTION_LABELS[opt] || opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Sequence Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Shots</span>
                <span className="text-amber-400 font-medium">{shots.length} / {maxShots}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Duration</span>
                <span className="text-amber-400 font-medium">{totalDuration}s</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Mode</span>
                <Badge variant="outline" className="text-xs h-4 border-amber-500/40 text-amber-400">
                  {sequenceMode}
                </Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Output Resolution</span>
                <span className="text-amber-400 font-medium">1080p</span>
              </div>
              <Separator />
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min((shots.length / maxShots) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {maxShots - shots.length} shot slots remaining
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Shot List */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Shot Sequence</h2>
            <Button
              variant="outline" size="sm"
              onClick={addShot}
              disabled={shots.length >= maxShots}
              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Shot
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-3 pr-2">
              {shots.map((shot, index) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  index={index}
                  total={shots.length}
                  onUpdate={updateShot}
                  onDelete={deleteShot}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                />
              ))}
              {shots.length < maxShots && (
                <button
                  onClick={addShot}
                  className="w-full border border-dashed border-amber-500/20 rounded-lg p-4 text-sm text-muted-foreground hover:border-amber-500/40 hover:text-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add another shot
                </button>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
