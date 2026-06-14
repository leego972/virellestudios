import { useState, useMemo } from "react";
  import { useAuth } from "@/_core/hooks/useAuth";
  import { trpc } from "@/lib/trpc";
  import { useLocation } from "wouter";
  import { Input } from "@/components/ui/input";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent } from "@/components/ui/card";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import {
    Search,
    Users,
    ArrowLeft,
    Loader2,
    UserCircle2,
    Clapperboard,
    Filter,
  } from "lucide-react";
  import { getLoginUrl } from "@/const";

  const ROLE_OPTIONS = [
    "All roles",
    "hero",
    "villain",
    "mentor",
    "sidekick",
    "love interest",
    "antagonist",
    "supporting",
  ];

  export default function TalentSearch() {
    const { user, loading: authLoading } = useAuth();
    const [, navigate] = useLocation();
    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("All roles");

    const { data: characters, isLoading } = trpc.character.list.useQuery(
      undefined,
      { enabled: !!user }
    );

    const filtered = useMemo(() => {
      if (!characters) return [];
      const q = query.toLowerCase().trim();
      return characters.filter((c: any) => {
        const matchesQuery =
          !q ||
          c.name?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.role?.toLowerCase().includes(q) ||
          c.castingNotes?.toLowerCase().includes(q);
        const matchesRole =
          roleFilter === "All roles" || c.role?.toLowerCase() === roleFilter;
        return matchesQuery && matchesRole;
      });
    }, [characters, query, roleFilter]);

    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070e" }}>
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      );
    }
    if (!user) { window.location.href = getLoginUrl(); return null; }

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(7,7,14,0.97)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 text-xs text-zinc-400 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <div className="h-5 w-px bg-border/40" />
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)" }}>
                <Users className="text-black" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <div className="font-bold text-sm">Talent Search</div>
                <div className="text-[10px] text-muted-foreground">
                  {characters ? `${characters.length} character${characters.length !== 1 ? "s" : ""} in your library` : "Your character library"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, role, or casting notes…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 bg-zinc-900/60 border-zinc-700/50 focus:border-amber-500/40"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-44 bg-zinc-900/60 border-zinc-700/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <UserCircle2 className="h-12 w-12 text-zinc-600" />
              <p className="text-muted-foreground text-sm">
                {query || roleFilter !== "All roles"
                  ? "No characters match your search."
                  : "Your character library is empty. Create characters inside a project to see them here."}
              </p>
              {!query && roleFilter === "All roles" && (
                <Button size="sm" onClick={() => navigate("/projects")} className="mt-1 gap-1.5 text-xs" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)", color: "#000" }}>
                  <Clapperboard className="h-3.5 w-3.5" />
                  Go to Projects
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                {(query || roleFilter !== "All roles") && " · filtered"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((char: any) => (
                  <Card
                    key={char.id}
                    className="group cursor-pointer transition-all hover:border-amber-500/30"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}
                    onClick={() => char.projectId && navigate(`/projects/${char.projectId}/casting-board`)}
                  >
                    <CardContent className="p-4 flex flex-col gap-3">
                      {/* Photo */}
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800/60 flex items-center justify-center">
                        {char.photoUrl ? (
                          <img src={char.photoUrl} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle2 className="h-12 w-12 text-zinc-600" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-zinc-100 truncate">{char.name}</p>
                        {char.role && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 capitalize">
                            {char.role}
                          </Badge>
                        )}
                        {char.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{char.description}</p>
                        )}
                      </div>
                      {/* Meta */}
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        {char.nationality && (
                          <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full">{char.nationality}</span>
                        )}
                        {char.isAiActor && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">AI Actor</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  