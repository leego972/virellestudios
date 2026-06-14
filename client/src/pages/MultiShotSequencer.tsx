import { useState } from "react";
import { SubscriptionGate } from "@/components/SubscriptionGate";
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
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
  import {
    Film, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
    Camera, Clock, Zap, Play, ArrowLeft, Layers, Eye, Settings2, Loader2,
    Users, Image as ImageIcon, CheckCircle2,
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
  import { NextStageCTA } from "@/components/NextStageCTA";

  type ShotData = {
    id: string;
    shotIndex: number;
    duration: number; // seconds, 1-12
    cameraMovement: string;
    speedRamp: string;
    description: string;
    startFrameUrl?: string;
    endFrameUrl?: string;
    /** Character IDs appearing in this specific shot */
    characterIds?: number[];
  };

  type Character = {
    id: number;
    name: string;
    photoUrl?: string | null;
    thumbnailUrl?: string | null;
    description?: string | null;
    role?: string | null;
  };

  function CharacterBadge({ char, selected, onToggle }: { char: Character; selected: boolean; onToggle: () => void }) {
    return (
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-colors
          ${selected
            ? "border-amber-500 bg-amber-500/10 text-amber-400"
            : "border-border/40 bg-black/20 text-muted-foreground hover:border-amber-500/40"}`}
      >
        <Avatar className="w-6 h-6 flex-shrink-0">
          <AvatarImage src={char.photoUrl || char.thumbnailUrl || undefined} alt={char.name} />
          <AvatarFallback className="text-[9px] bg-amber-900/30">{char.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="text-xs truncate max-w-[80px]">{char.name}</span>
        {selected && <CheckCircle2 className="w-3 h-3 text-amber-400 flex-shrink-0" />}
      </button>
    );
  }

  function ShotCard({
    shot,
    index,
    total,
    characters,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
  }: {
    shot: ShotData;
    index: number;
    total: number;
    characters: Character[];
    onUpdate: (id: string, data: Partial<ShotData>) => void;
    onDelete: (id: string) => void;
    onMoveUp: (id: string) => void;
    onMoveDown: (id: string) => void;
  }) {
    const shotCharIds = shot.characterIds ?? [];

    const toggleShotChar = (charId: number) => {
      const next = shotCharIds.includes(charId)
        ? shotCharIds.filter(id => id !== charId)
        : [...shotCharIds, charId];
      onUpdate(shot.id, { characterIds: next });
    };

    return (
      <Card className="border border-amber-500/20 bg-black/40 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow gold-glow">
        <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Shot {index + 1}</span>
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                {shot.duration}s
              </Badge>
              {shotCharIds.length > 0 && (
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                  {shotCharIds.length} cast
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMoveUp(shot.id)} disabled={index === 0} aria-label="Move shot up">
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMoveDown(shot.id)} disabled={index === total - 1} aria-label="Move shot down">
                <ChevronDown className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={() => onDelete(shot.id)} aria-label="Delete shot">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Duration (seconds)</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[shot.duration]}
                min={1} max={12} step={1}
                onValueChange={([v]) => onUpdate(shot.id, { duration: v })}
                className="flex-1"
              />
              <span className="text-xs font-mono text-amber-400 w-6 text-right">{shot.duration}s</span>
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

          {/* Per-shot character assignment */}
          {characters.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                <Users className="w-3 h-3" /> Characters in this shot
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {characters.map(char => (
                  <CharacterBadge
                    key={char.id}
                    char={char}
                    selected={shotCharIds.includes(char.id)}
                    onToggle={() => toggleShotChar(char.id)}
                  />
                ))}
              </div>
              {shotCharIds.length === 0 && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Tap characters to assign them Ã¢ÂÂ their costumes &amp; likeness will be locked in.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function MultiShotSequencerInner() {
    const [, navigate] = useLocation();
    const params = useParams<{ projectId: string; sceneId: string }>();
    const projectId = parseInt(params.projectId || "0");
    const sceneId = parseInt(params.sceneId || "0");

    const [shots, setShots] = useState<ShotData[]>([
      { id: "shot-1", shotIndex: 0, duration: 4, cameraMovement: "slow-push-in", speedRamp: "normal", description: "", characterIds: [] },
      { id: "shot-2", shotIndex: 1, duration: 3, cameraMovement: "static", speedRamp: "normal", description: "", characterIds: [] },
    ]);
    const [genreMotion, setGenreMotion] = useState("auto");
    const [cameraBody, setCameraBody] = useState("arri-alexa-mini-lf");
    const [lensBrand, setLensBrand] = useState("zeiss-supreme-prime");
    const [aperture, setAperture] = useState("t2.8");
    const [sequenceMode, setSequenceMode] = useState<"auto" | "manual">("manual");
    /** Scene-level character roster Ã¢ÂÂ union of all per-shot selections */
    const [sceneCharacterIds, setSceneCharacterIds] = useState<number[]>([]);

    const { data: characters = [] } = trpc.character.listByProject.useQuery(
      { projectId },
      { enabled: projectId > 0 }
    );

    const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
    const maxShots = 12;

    // Keep scene-level characterIds in sync with per-shot selections
    const syncSceneCharacters = (updatedShots: ShotData[]) => {
      const allIds = Array.from(
        new Set(updatedShots.flatMap(s => s.characterIds ?? []))
      );
      setSceneCharacterIds(allIds);
      return allIds;
    };

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
        characterIds: [],
      };
      setShots([...shots, newShot]);
    };

    const updateShot = (id: string, data: Partial<ShotData>) => {
      const next = shots.map((s) => (s.id === id ? { ...s, ...data } : s));
      setShots(next);
      if (data.characterIds !== undefined) syncSceneCharacters(next);
    };

    const deleteShot = (id: string) => {
      if (shots.length <= 1) {
        toast.error("A sequence must have at least one shot");
        return;
      }
      const next = shots.filter((s) => s.id !== id);
      setShots(next);
      syncSceneCharacters(next);
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

    // Toggle a character for ALL shots at the scene level
    const toggleSceneCharacter = (charId: number) => {
      const isSelected = sceneCharacterIds.includes(charId);
      const nextSceneIds = isSelected
        ? sceneCharacterIds.filter(id => id !== charId)
        : [...sceneCharacterIds, charId];
      setSceneCharacterIds(nextSceneIds);
      // Propagate removal to per-shot arrays so they stay consistent
      if (isSelected) {
        setShots(prev => prev.map(s => ({
          ...s,
          characterIds: (s.characterIds ?? []).filter(id => id !== charId),
        })));
      }
    };

    const updateSceneMutation = trpc.scene.update.useMutation({
      onSuccess: () => toast.success(`Multi-shot sequence saved Ã¢ÂÂ ${shots.length} shots, ${totalDuration}s total`),
      onError: (err) => toast.error(err.message || "Failed to save sequence"),
    });

    const generatePreviewMutation = trpc.scene.generatePreview.useMutation({
      onSuccess: (data) => {
        toast.success("Scene preview generated Ã¢ÂÂ costume & character consistency applied");
      },
      onError: (err) => toast.error(err.message || "Preview generation failed"),
    });

    const handleSave = () => {
      if (!sceneId) { toast.error("No scene selected"); return; }
      // Derive the full scene-level character list from per-shot selections
      const allCharIds = Array.from(new Set(shots.flatMap(s => s.characterIds ?? [])));
      updateSceneMutation.mutate({
        id: sceneId,
        multiShotEnabled: true,
        multiShotCount: shots.length,
        multiShotData: shots,
        genreMotion,
        cameraBody,
        lensBrand,
        aperture,
        // Scene-level character roster: every character that appears in any shot.
        // The server uses this to inject character DNA + wardrobe/costume into the
        // generation prompt and to lock reference photos for consistency.
        characterIds: allCharIds,
      });
    };

    const handleGeneratePreview = async () => {
      if (!sceneId) { toast.error("No scene selected"); return; }
      if (!updateSceneMutation.isSuccess && !sceneId) {
        toast.error("Save the sequence first");
        return;
      }
      // Save first, then generate
      const allCharIds = Array.from(new Set(shots.flatMap(s => s.characterIds ?? [])));
      updateSceneMutation.mutate(
        {
          id: sceneId,
          multiShotEnabled: true,
          multiShotCount: shots.length,
          multiShotData: shots,
          genreMotion,
          cameraBody,
          lensBrand,
          aperture,
          characterIds: allCharIds,
        },
        {
          onSuccess: () => generatePreviewMutation.mutate({ sceneId }),
        }
      );
    };

    const isBusy = updateSceneMutation.isPending || generatePreviewMutation.isPending;

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div className="border-b sticky top-0 z-20 px-4 py-3" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)} aria-label="Back to project">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2 text-gold-shimmer">
                  <Layers className="w-5 h-5 text-amber-400" />
                  Multi-Shot Sequencer
                </h1>
                <p className="text-xs text-muted-foreground">
                  {shots.length} shots ÃÂ· {totalDuration}s total ÃÂ· {sequenceMode} mode
                  {sceneCharacterIds.length > 0 && ` ÃÂ· ${sceneCharacterIds.length} characters cast`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSequenceMode(sequenceMode === "auto" ? "manual" : "auto")}>
                <Settings2 className="w-4 h-4 mr-1" />
                {sequenceMode === "auto" ? "Switch to Manual" : "Switch to Auto"}
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={handleSave}
                disabled={isBusy}
                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
              >
                {updateSceneMutation.isPending && !generatePreviewMutation.isPending
                  ? <Loader2 className="w-4 h-4 mr-1 animate-spin text-amber-400" />
                  : <Zap className="w-4 h-4 mr-1" />}
                Save Sequence
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black"
                onClick={handleGeneratePreview}
                disabled={isBusy}
              >
                {generatePreviewMutation.isPending
                  ? <Loader2 className="w-4 h-4 mr-1 animate-spin text-amber-400" />
                  : <ImageIcon className="w-4 h-4 mr-1" />}
                {generatePreviewMutation.isPending ? "Generating..." : "Generate Preview"}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-3 md:p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left: Camera Rig + Cast Setup */}
          <div className="col-span-1 space-y-4">
            <Card className="border-amber-500/20 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <Camera className="w-4 h-4 text-amber-400" />
                  Camera Rig Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
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

            {/* Scene Cast Ã¢ÂÂ select characters that appear anywhere in this scene */}
            {characters.length > 0 && (
              <Card className="border-amber-500/20 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                    <Users className="w-4 h-4 text-amber-400" />
                    Scene Cast
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Select characters in this scene. Their likeness &amp; wardrobe will be locked into every generated frame.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {(characters as Character[]).map((char) => (
                      <CharacterBadge
                        key={char.id}
                        char={char}
                        selected={sceneCharacterIds.includes(char.id)}
                        onToggle={() => toggleSceneCharacter(char.id)}
                      />
                    ))}
                  </div>
                  {sceneCharacterIds.length > 0 && (
                    <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {sceneCharacterIds.length} character{sceneCharacterIds.length > 1 ? "s" : ""} locked in Ã¢ÂÂ costumes auto-applied per shot
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border-amber-500/20 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Sequence Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Shots</span>
                  <span className="text-amber-400 font-medium">{shots.length} / {maxShots}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Duration</span>
                  <span className="text-amber-400 font-medium">{totalDuration}s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Characters Cast</span>
                  <span className="text-amber-400 font-medium">{sceneCharacterIds.length}</span>
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
              <h2 className="text-sm font-medium text-muted-foreground gradient-text-gold">Shot Sequence</h2>
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
                    characters={sceneCharacterIds.length > 0
                      ? (characters as Character[]).filter(c => sceneCharacterIds.includes(c.id))
                      : (characters as Character[])}
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
        {!!projectId && <NextStageCTA projectId={projectId} currentStage={6} />}
      </div>
    );
  }

export default function MultiShotSequencer() {
  return (
    <SubscriptionGate
      feature="Multi-Shot Sequencer"
      featureKey="canUseMultiShotSequencer"
      requiredTier="independent"
    >
      <MultiShotSequencerInner />
    </SubscriptionGate>
  );
}
