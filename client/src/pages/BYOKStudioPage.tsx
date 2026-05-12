import { useState } from "react";
  import { useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
  import SiteHead from "@/components/SiteHead";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { toast } from "sonner";
  import { Download, FileText, Film, Key, Layers, Play, DollarSign, CheckCircle2, Clock, AlertCircle } from "lucide-react";

  function dlText(filename: string, content: string) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" })); a.download = filename; a.click();
  }
  function dlJson(filename: string, data: unknown) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = filename; a.click();
  }
  const STATUS_COLORS: Record<string, string> = {
    queued: "bg-zinc-700 text-zinc-200", submitted: "bg-blue-900/60 text-blue-300",
    processing: "bg-amber-900/60 text-amber-300", completed: "bg-green-900/60 text-green-300",
    failed: "bg-red-900/60 text-red-300",
  };

  export default function BYOKStudioPage() {
    const [, setLocation] = useLocation();
    const [selectedProject, setSelectedProject] = useState<number | null>(null);
    const projectsQ = trpc.project.list.useQuery(undefined, { refetchOnWindowFocus: false });
    const projects = (projectsQ.data ?? []) as Array<{ id: number; title: string; genre?: string }>;
    const renderJobsQ = trpc.byokWorkflow.listRenderJobs.useQuery({ projectId: selectedProject! }, { enabled: !!selectedProject, refetchOnWindowFocus: false });
    const createJobMut = trpc.byokWorkflow.createRenderJob.useMutation({
      onSuccess: () => { toast.success("Render job created — ready to submit."); renderJobsQ.refetch(); },
    });
    const promptPackQ = trpc.byokWorkflow.exportPromptPack.useQuery({ projectId: selectedProject! }, { enabled: false });
    const screenplayQ = trpc.byokWorkflow.exportScreenplay.useQuery({ projectId: selectedProject! }, { enabled: false });
    const shotListQ = trpc.byokWorkflow.exportShotList.useQuery({ projectId: selectedProject! }, { enabled: false });

    const handleExport = async (type: "prompt" | "screenplay" | "shotlist") => {
      if (!selectedProject) return toast.error("Select a project first");
      if (type === "prompt") { const r = await promptPackQ.refetch(); if (r.data) { dlJson(`prompt-pack-${selectedProject}.json`, r.data); toast.success("Prompt pack exported"); } }
      else if (type === "screenplay") { const r = await screenplayQ.refetch(); if (r.data) { dlText(r.data.filename, r.data.text); toast.success("Screenplay exported"); } }
      else { const r = await shotListQ.refetch(); if (r.data) { dlText(r.data.filename, r.data.csv); toast.success("Shot list exported as CSV"); } }
    };

    const renderJobs = (renderJobsQ.data ?? []) as Array<{ id: number; provider: string; taskType: string; status: string; estimatedCostStr?: string | null; createdAt: string }>;

    return (
      <div className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-8 py-8">
        <SiteHead title="BYOK Studio — Virelle" />
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-400/80 mb-1">Production Cockpit</div>
              <h1 className="text-3xl font-black tracking-tighter">BYOK Studio</h1>
              <p className="text-zinc-400 text-sm mt-1">Render jobs, exports, and cost estimates for your connected providers.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocation("/settings?tab=api-keys")} className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              <Key className="h-3.5 w-3.5" /> Providers
            </Button>
          </div>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-bold text-zinc-300 flex items-center gap-2"><Film className="h-4 w-4 text-amber-400" /> Select Project</CardTitle></CardHeader>
            <CardContent>
              {projects.length === 0 ? <p className="text-sm text-zinc-500">No projects. <button onClick={() => setLocation("/projects/new")} className="text-amber-400 underline">Create one</button>.</p>
                : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{projects.map(p => (
                  <button key={p.id} onClick={() => setSelectedProject(p.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${selectedProject === p.id ? "border-amber-500/50 bg-amber-500/10" : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-600"}`}>
                    <p className="text-sm font-bold text-white truncate">{p.title}</p>
                    {p.genre && <p className="text-xs text-zinc-500 mt-0.5">{p.genre}</p>}
                  </button>))}</div>}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-bold text-zinc-300 flex items-center gap-2"><Download className="h-4 w-4 text-amber-400" /> Export Tools</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: "prompt" as const, icon: <FileText className="h-5 w-5 text-amber-400" />, label: "Export Prompt Pack", sub: "JSON — all prompts + routing" },
                { type: "screenplay" as const, icon: <FileText className="h-5 w-5 text-amber-400" />, label: "Export Screenplay", sub: "TXT — formatted draft" },
                { type: "shotlist" as const, icon: <Layers className="h-5 w-5 text-amber-400" />, label: "Export Shot List", sub: "CSV — scenes + camera data" },
              ].map(e => (
                <Button key={e.type} variant="outline" className="h-auto flex-col gap-2 py-4 border-zinc-700 hover:bg-zinc-800 hover:border-amber-500/40"
                  onClick={() => handleExport(e.type)} disabled={!selectedProject}>
                  {e.icon}<div className="text-sm font-bold">{e.label}</div><div className="text-xs text-zinc-500">{e.sub}</div>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-300 flex items-center gap-2"><Play className="h-4 w-4 text-amber-400" /> Render Jobs</CardTitle>
                {selectedProject && <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
                  onClick={() => createJobMut.mutate({ projectId: selectedProject, provider: "custom", taskType: "video" })} disabled={createJobMut.isPending}>
                  + Prepare Render Job
                </Button>}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedProject ? <p className="text-sm text-zinc-500">Select a project to view render jobs.</p>
                : renderJobs.length === 0 ? <div className="text-center py-8"><Play className="h-8 w-8 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">No render jobs yet. Use the button above to prepare one.</p></div>
                : <div className="space-y-2">{renderJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between py-3 border-b border-zinc-800/60 last:border-b-0">
                    <div className="flex items-center gap-3">
                      {job.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : job.status === "failed" ? <AlertCircle className="h-4 w-4 text-red-400" /> : <Clock className="h-4 w-4 text-zinc-500" />}
                      <div><p className="text-sm font-bold text-white">{job.taskType} — {job.provider}</p><p className="text-xs text-zinc-500">{new Date(job.createdAt).toLocaleString()}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      {job.estimatedCostStr && <span className="text-xs text-zinc-400 flex items-center gap-1"><DollarSign className="h-3 w-3" />{job.estimatedCostStr}</span>}
                      <Badge className={`text-xs ${STATUS_COLORS[job.status] ?? STATUS_COLORS.queued}`}>{job.status}</Badge>
                    </div>
                  </div>))}</div>}
              <p className="text-xs text-zinc-600 mt-4">Jobs are prepared locally and do not trigger paid API calls until you submit through your provider.</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-bold text-zinc-300 flex items-center gap-2"><DollarSign className="h-4 w-4 text-amber-400" /> Cost Estimates</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {["llm", "image", "video", "voice", "music"].map(type => {
                  const jobs = renderJobs.filter(j => j.taskType === type);
                  const total = jobs.reduce((s, j) => s + parseFloat(j.estimatedCostStr ?? "0"), 0);
                  return <div key={type} className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 text-center">
                    <p className="text-xs text-zinc-400 mb-1 capitalize">{type}</p>
                    <p className="text-lg font-black text-amber-400">{total > 0 ? `$${total.toFixed(4)}` : "—"}</p>
                  </div>;
                })}
              </div>
              <p className="text-xs text-zinc-600 mt-3">Manual estimates. Actual charges depend on your provider's pricing.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  