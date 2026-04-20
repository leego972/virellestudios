import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { NextStageCTA } from "@/components/NextStageCTA";
import CinematicEmptyState from "@/components/CinematicEmptyState";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  Clapperboard,
  CircleAlert,
  CircleCheck,
  Loader2,
  Sparkles,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

type CastingState = {
  // per-character state, keyed by character id
  [charId: number]: {
    actorName: string;
    actorAgency: string;
    actorEmail: string;
    headshotUrl: string;
    rate: string;
    notes: string;
    consent: {
      likenessRelease: boolean;
      voiceRelease: boolean;
      aiTrainingDisclosure: boolean;
      socialUseAck: boolean;
      onSetMinorOk: boolean;
      signedAt: string;
    };
  };
};

const CONSENT_FIELDS: { key: keyof CastingState[number]["consent"]; label: string; help: string }[] = [
  { key: "likenessRelease", label: "Likeness release", help: "Actor consents to use of their image in the production." },
  { key: "voiceRelease", label: "Voice release", help: "Actor consents to use of their recorded voice." },
  { key: "aiTrainingDisclosure", label: "AI/synthesis disclosure", help: "Actor has been told whether AI-generated likeness will be used." },
  { key: "socialUseAck", label: "Social/marketing use ack.", help: "Actor agrees to footage use in trailers, social cuts, and ads." },
  { key: "onSetMinorOk", label: "Minor / on-set rules confirmed", help: "Working hours, guardian, and welfare rules acknowledged (if applicable)." },
];

function emptyCharState(): CastingState[number] {
  return {
    actorName: "",
    actorAgency: "",
    actorEmail: "",
    headshotUrl: "",
    rate: "",
    notes: "",
    consent: {
      likenessRelease: false,
      voiceRelease: false,
      aiTrainingDisclosure: false,
      socialUseAck: false,
      onSetMinorOk: false,
      signedAt: "",
    },
  };
}

export default function CastingBoard() {
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const hasProject = !!projectId;
  const storageKey = `virelle.castingBoard.${projectId}`;

  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: hasProject });
  const { data: characters } = trpc.character.listByProject.useQuery(
    { projectId },
    { enabled: hasProject }
  );
  const { data: scenes } = trpc.scene.listByProject.useQuery(
    { projectId },
    { enabled: hasProject }
  );

  const [state, setState] = useState<CastingState>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  }, [storageKey, state]);

  function ensure(charId: number): CastingState[number] {
    return state[charId] || emptyCharState();
  }
  function update(charId: number, patch: Partial<CastingState[number]>) {
    setState((prev) => ({ ...prev, [charId]: { ...ensure(charId), ...patch } }));
  }
  function updateConsent(charId: number, patch: Partial<CastingState[number]["consent"]>) {
    setState((prev) => ({
      ...prev,
      [charId]: {
        ...ensure(charId),
        consent: { ...ensure(charId).consent, ...patch },
      },
    }));
  }

  // continuity: for each character, list scene order indices they appear in
  const continuity = useMemo(() => {
    const out: Record<number, number[]> = {};
    if (!characters || !scenes) return out;
    for (const c of characters) {
      out[c.id] = scenes
        .filter((s: any) => Array.isArray(s.characterIds) && s.characterIds.includes(c.id))
        .map((s: any) => s.orderIndex ?? 0)
        .sort((a: number, b: number) => a - b);
    }
    return out;
  }, [characters, scenes]);

  function continuityLevel(scs: number[]): { color: string; label: string } {
    if (scs.length === 0) return { color: "bg-muted text-muted-foreground", label: "No scenes" };
    if (scs.length >= 8) return { color: "bg-amber-500/20 text-amber-700 dark:text-amber-300", label: `${scs.length} scenes — strict` };
    if (scs.length >= 3) return { color: "bg-blue-500/20 text-blue-700 dark:text-blue-300", label: `${scs.length} scenes` };
    return { color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300", label: `${scs.length} scene${scs.length === 1 ? "" : "s"}` };
  }

  function consentScore(charId: number): { done: number; total: number } {
    const c = ensure(charId).consent;
    const total = CONSENT_FIELDS.length;
    let done = 0;
    for (const f of CONSENT_FIELDS) if (c[f.key]) done++;
    return { done, total };
  }

  function signNow(charId: number) {
    const allChecked = CONSENT_FIELDS.every((f) => ensure(charId).consent[f.key]);
    if (!allChecked) {
      toast.error("Tick every consent box before signing.");
      return;
    }
    updateConsent(charId, { signedAt: new Date().toISOString() });
    toast.success("Consent recorded.");
  }

  // AI sides generator
  const sendMessage = trpc.directorChat.send.useMutation();
  const [generatingFor, setGeneratingFor] = useState<number | null>(null);
  const [sides, setSides] = useState<Record<number, string>>({});

  async function generateSides(charId: number) {
    if (!hasProject) return;
    const ch = characters?.find((c: any) => c.id === charId);
    if (!ch) return;
    setGeneratingFor(charId);
    try {
      const res = await sendMessage.mutateAsync({
        projectId,
        message: `[CastingSides:${charId}]\n\nWrite a 1-page audition "sides" for the role of ${ch.name}${ch.role ? ` (${ch.role})` : ""} from "${project?.title || "Untitled"}".

Character notes: ${ch.description || "—"}
Backstory: ${(ch as any).backstory || "—"}
Motivations: ${(ch as any).motivations || "—"}

Output: a self-contained scene with 1 scene-partner, ~12-18 lines of dialogue, an action heading, parentheticals where needed. End with one stage direction that reveals subtext. The scene should let the reader showcase a clear emotional turn.`,
      });
      // pick the AI text out of the response
      const text = (res as any)?.assistant?.content || (res as any)?.content || "(generated — check Director Chat)";
      setSides((p) => ({ ...p, [charId]: typeof text === "string" ? text : JSON.stringify(text) }));
      toast.success(`Sides drafted for ${ch.name}.`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to draft sides.");
    } finally {
      setGeneratingFor(null);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied.");
  }

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to project
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clapperboard className="h-4 w-4" /> Casting Board
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Casting Board</h1>
        <p className="text-muted-foreground mt-1">
          {characters?.length ?? 0} role{characters?.length === 1 ? "" : "s"} · attach actors, draft sides, and lock consent.
        </p>
      </div>

      {!characters || characters.length === 0 ? (
        <CinematicEmptyState
          quoteSeed="casting-board"
          title="No cast to call yet"
          description="The Casting Board is where roles meet performers — once you've built characters, you'll attach actors, draft sides, and lock consent here. Build your cast first."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {characters.map((c: any) => {
            const s = ensure(c.id);
            const cs = consentScore(c.id);
            const cont = continuityLevel(continuity[c.id] || []);
            const signed = !!s.consent.signedAt;
            return (
              <Card key={c.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    {c.photoUrl ? (
                      <img
                        src={c.photoUrl}
                        alt={c.name}
                        className="h-14 w-14 rounded-md object-cover border"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                        <Users className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="truncate">{c.name}</span>
                        {c.role && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {c.role}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">{c.description || "No bio yet."}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge className={`text-[10px] ${cont.color}`} variant="secondary">
                      {cont.label}
                    </Badge>
                    <Badge
                      className={`text-[10px] ${
                        signed
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : cs.done === cs.total
                          ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      }`}
                      variant="secondary"
                    >
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Consent {cs.done}/{cs.total}{signed ? " · signed" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Actor attach */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Actor name</Label>
                      <Input value={s.actorName} onChange={(e) => update(c.id, { actorName: e.target.value })} placeholder="(unattached)" />
                    </div>
                    <div>
                      <Label className="text-xs">Agency</Label>
                      <Input value={s.actorAgency} onChange={(e) => update(c.id, { actorAgency: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Contact email</Label>
                      <Input value={s.actorEmail} onChange={(e) => update(c.id, { actorEmail: e.target.value })} type="email" />
                    </div>
                    <div>
                      <Label className="text-xs">Rate / fee</Label>
                      <Input value={s.rate} onChange={(e) => update(c.id, { rate: e.target.value })} placeholder="$ / day" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Headshot URL</Label>
                      <Input value={s.headshotUrl} onChange={(e) => update(c.id, { headshotUrl: e.target.value })} placeholder="https://…" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Casting notes</Label>
                      <Textarea rows={2} value={s.notes} onChange={(e) => update(c.id, { notes: e.target.value })} />
                    </div>
                  </div>

                  {/* Consent vault */}
                  <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Consent vault
                      </div>
                      {signed ? (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          <CircleCheck className="h-3 w-3 mr-1" />
                          Signed {new Date(s.consent.signedAt).toLocaleDateString()}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          <CircleAlert className="h-3 w-3 mr-1" />
                          Unsigned
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {CONSENT_FIELDS.map((f) => (
                        <label key={f.key} className="flex items-start gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={s.consent[f.key] as boolean}
                            onCheckedChange={(v) => updateConsent(c.id, { [f.key]: !!v } as any)}
                          />
                          <span>
                            <span className="font-medium">{f.label}</span>
                            <span className="text-muted-foreground"> — {f.help}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant={signed ? "secondary" : "default"}
                      onClick={() => signNow(c.id)}
                      className="w-full mt-2"
                      disabled={signed}
                    >
                      {signed ? "Consent already on file" : "Lock & timestamp consent"}
                    </Button>
                  </div>

                  {/* AI sides */}
                  <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Audition sides
                      </div>
                      <div className="flex gap-1">
                        {sides[c.id] && (
                          <Button size="sm" variant="ghost" onClick={() => copy(sides[c.id])} className="h-7 gap-1 text-xs">
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => generateSides(c.id)}
                          disabled={generatingFor === c.id}
                          className="h-7 gap-1 text-xs"
                        >
                          {generatingFor === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {sides[c.id] ? "Regenerate" : "Draft sides"}
                        </Button>
                      </div>
                    </div>
                    {sides[c.id] && (
                      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-48 overflow-y-auto p-2 bg-background border rounded">
                        {sides[c.id]}
                      </pre>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
  {!!projectId && <NextStageCTA projectId={projectId} currentStage={2} />}
    </div>
  );
}
