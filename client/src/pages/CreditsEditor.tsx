import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Loader2, ArrowLeft, Plus, Trash2, GripVertical, Film, Award } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const COMMON_ROLES = [
  "Director", "Producer", "Executive Producer", "Writer", "Cinematographer",
  "Editor", "Composer", "Production Designer", "Costume Designer", "Makeup Artist",
  "Sound Designer", "Visual Effects Supervisor", "Casting Director", "Stunt Coordinator",
  "Lead Actor", "Supporting Actor", "Featured Extra",
];

export default function CreditsEditor() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const projectId = Number(params.projectId);
  const utils = trpc.useUtils();

  const [showAdd, setShowAdd] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [newName, setNewName] = useState("");
  const [newCharName, setNewCharName] = useState("");
  const [newSection, setNewSection] = useState<"opening" | "closing">("closing");

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!user && !!projectId }
  );
  const { data: allCredits, isLoading: creditsLoading } = trpc.credit.listByProject.useQuery(
    { projectId },
    { enabled: !!user && !!projectId }
  );

  const createCredit = trpc.credit.create.useMutation({
    onSuccess: () => {
      utils.credit.listByProject.invalidate({ projectId });
      setShowAdd(false);
      setNewRole("");
      setNewName("");
      setNewCharName("");
      toast.success("Credit added");
    },
  });

  const deleteCredit = trpc.credit.delete.useMutation({
    onSuccess: () => {
      utils.credit.listByProject.invalidate({ projectId });
      toast.success("Credit removed");
    },
  });

  if (authLoading || projectLoading || creditsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  const openingCredits = allCredits?.filter(c => c.section === "opening") || [];
  const closingCredits = allCredits?.filter(c => c.section === "closing") || [];

  const handleAdd = () => {
    if (!newRole.trim() || !newName.trim()) return;
    createCredit.mutate({
      projectId,
      role: newRole.trim(),
      name: newName.trim(),
      characterName: newCharName.trim() || undefined,
      section: newSection,
      orderIndex: (allCredits?.length || 0),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/project/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{project?.title} — Credits</h1>
              <p className="text-xs text-muted-foreground">{allCredits?.length || 0} credits</p>
            </div>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Credit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Credit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue placeholder="Select or type a role" /></SelectTrigger>
                    <SelectContent>
                      {COMMON_ROLES.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="mt-2"
                    placeholder="Or type a custom role..."
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input placeholder="Person's name" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div>
                  <Label>Character Name (optional, for cast)</Label>
                  <Input placeholder="Character name" value={newCharName} onChange={e => setNewCharName(e.target.value)} />
                </div>
                <div>
                  <Label>Section</Label>
                  <Select value={newSection} onValueChange={v => setNewSection(v as "opening" | "closing")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening">Opening Credits</SelectItem>
                      <SelectItem value="closing">Closing Credits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={!newRole.trim() || !newName.trim() || createCredit.isPending}>
                  {createCredit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Opening Credits */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" />
              Opening Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openingCredits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No opening credits yet</p>
            ) : (
              <div className="space-y-2">
                {openingCredits.map(credit => (
                  <div key={credit.id} className="flex items-center gap-3 p-2 rounded-md border bg-card/50">
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] shrink-0">{credit.role}</Badge>
                        <span className="text-sm font-medium truncate">{credit.name}</span>
                      </div>
                      {credit.characterName && (
                        <p className="text-xs text-muted-foreground mt-0.5">as {credit.characterName}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive"
                      onClick={() => deleteCredit.mutate({ id: credit.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Closing Credits */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Closing Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {closingCredits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No closing credits yet</p>
            ) : (
              <div className="space-y-2">
                {closingCredits.map(credit => (
                  <div key={credit.id} className="flex items-center gap-3 p-2 rounded-md border bg-card/50">
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] shrink-0">{credit.role}</Badge>
                        <span className="text-sm font-medium truncate">{credit.name}</span>
                      </div>
                      {credit.characterName && (
                        <p className="text-xs text-muted-foreground mt-0.5">as {credit.characterName}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive"
                      onClick={() => deleteCredit.mutate({ id: credit.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {(allCredits?.length || 0) > 0 && (
          <Card className="bg-black text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-center text-white/80">Credits Preview</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6 py-8">
              {openingCredits.length > 0 && (
                <div className="space-y-4">
                  {openingCredits.map(c => (
                    <div key={c.id} className="space-y-0.5">
                      <p className="text-xs uppercase tracking-widest text-white/50">{c.role}</p>
                      <p className="text-lg font-light">{c.name}</p>
                    </div>
                  ))}
                </div>
              )}
              {openingCredits.length > 0 && closingCredits.length > 0 && (
                <Separator className="bg-white/10 my-8" />
              )}
              {closingCredits.length > 0 && (
                <div className="space-y-3">
                  {closingCredits.map(c => (
                    <div key={c.id} className="flex justify-center gap-8 text-sm">
                      <span className="text-white/50 text-right w-40">{c.role}</span>
                      <span className="text-left w-40">{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
