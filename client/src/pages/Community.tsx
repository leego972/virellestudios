import { useState, useEffect } from "react";
  import { useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { useAuth } from "@/_core/hooks/useAuth";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Textarea } from "@/components/ui/textarea";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Avatar, AvatarFallback } from "@/components/ui/avatar";
  import { Separator } from "@/components/ui/separator";
  import {
    MessageSquare, Users, Heart, Plus, ArrowLeft, Crown, Lock,
    Send, Pin, ChevronRight, TrendingUp, Globe, BookOpen,
    Star, Calendar, ExternalLink, Film, Loader2, RefreshCw,
  } from "lucide-react";
  import { toast } from "sonner";

  // ─── Static data (Events + Resources kept from v1) ───────────────────────────
  const EVENTS = [
    { title: "Sundance Film Festival", date: "Jan 23–Feb 2, 2026", location: "Park City, Utah", type: "Festival", url: "https://sundance.org" },
    { title: "Berlin International Film Festival", date: "Feb 13–23, 2026", location: "Berlin, Germany", type: "Festival", url: "https://berlinale.de" },
    { title: "Hot Docs International Documentary Festival", date: "May 1–11, 2026", location: "Toronto, Canada", type: "Festival", url: "https://hotdocs.ca" },
    { title: "Cannes Film Market", date: "May 13–24, 2026", location: "Cannes, France", type: "Market", url: "https://marchedufilm.com" },
    { title: "AFM — American Film Market", date: "Nov 5–10, 2025", location: "Las Vegas, NV", type: "Market", url: "https://americanfilmmarket.com" },
    { title: "SXSW Film & TV Festival", date: "Mar 6–15, 2026", location: "Austin, Texas", type: "Festival", url: "https://sxsw.com/film" },
  ];
  const RESOURCES = [
    { title: "No Film School", description: "Daily filmmaking news, tutorials, and gear reviews.", url: "https://nofilmschool.com", category: "Education" },
    { title: "Stage 32", description: "The world's largest social network for film, TV, and theatre.", url: "https://stage32.com", category: "Networking" },
    { title: "FilmFreeway", description: "Submit to festivals, screenplay competitions, and grants.", url: "https://filmfreeway.com", category: "Festivals" },
    { title: "The Black List", description: "Script hosting, evaluations, and industry connections.", url: "https://blcklst.com", category: "Screenwriting" },
    { title: "Coverfly", description: "Screenwriting competitions and fellowships aggregator.", url: "https://coverfly.com", category: "Screenwriting" },
    { title: "Wrapbook", description: "Payroll, insurance, and finance for film & TV.", url: "https://wrapbook.com", category: "Production" },
    { title: "Backstage", description: "Casting platform where actors search for roles.", url: "https://backstage.com", category: "Casting" },
    { title: "MusicBed", description: "Premium licensed music for film and commercial sync.", url: "https://musicbed.com", category: "Music" },
    { title: "Artlist", description: "Unlimited annual music licence for film and social.", url: "https://artlist.io", category: "Music" },
    { title: "Soundly", description: "Professional SFX library used by major studios.", url: "https://getsoundly.com", category: "Sound" },
    { title: "Incentify", description: "Film production tax incentive calculator.", url: "https://incentify.io", category: "Finance" },
  ];

  const POST_CATEGORIES = ["General","Craft","Gear","Festivals","Finance","Music","VFX","Writing","Feedback","Casting"];
  const CAT_COLORS: Record<string, string> = {
    General: "bg-zinc-500/20 text-zinc-400",
    Craft: "bg-violet-500/20 text-violet-400",
    Gear: "bg-blue-500/20 text-blue-400",
    Festivals: "bg-amber-500/20 text-amber-400",
    Finance: "bg-green-500/20 text-green-400",
    Music: "bg-pink-500/20 text-pink-400",
    VFX: "bg-cyan-500/20 text-cyan-400",
    Writing: "bg-indigo-500/20 text-indigo-400",
    Feedback: "bg-orange-500/20 text-orange-400",
    Casting: "bg-rose-500/20 text-rose-400",
  };

  function initials(name: string) {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  }
  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  // ─── Paywall wall ─────────────────────────────────────────────────────────────
  function MembersOnlyWall() {
    const [, setLocation] = useLocation();
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-2xl shadow-amber-500/30">
            <Lock className="w-10 h-10 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Members Only</h1>
            <p className="text-white/50 text-sm leading-relaxed">
              The <span className="text-amber-400 font-bold">Virelle Community</span> is exclusive to paying members.<br />
              Join to connect with filmmakers, get advice, share your work, and grow your craft.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 text-left">
            {[
              { icon: MessageSquare, text: "Ask questions & get real advice from working filmmakers" },
              { icon: Users, text: "Connect with directors, DPs, composers, and editors" },
              { icon: Film, text: "Share your projects and get constructive feedback" },
              { icon: Star, text: "Access curated industry events and resources" },
            ].map(item => (
              <div key={item.text} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-amber-500/10">
                <item.icon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-white/60">{item.text}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => setLocation("/settings/billing")}
            className="w-full h-12 font-black text-base bg-amber-500 hover:bg-amber-400 text-black rounded-xl">
            <Crown className="w-5 h-5 mr-2" /> Upgrade to Join
          </Button>
          <button onClick={() => setLocation("/")} className="text-xs text-white/30 hover:text-white/60">
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Thread view ──────────────────────────────────────────────────────────────
  function ThreadView({ postId, onBack, likedPostIds }: { postId: number; onBack: () => void; likedPostIds: Set<number> }) {
    const [replyBody, setReplyBody] = useState("");
    const utils = trpc.useUtils();

    const { data, isLoading, refetch } = trpc.communityForum.listReplies.useQuery({ postId });
    const toggleLike = trpc.communityForum.toggleLike.useMutation({
      onSuccess: () => { utils.communityForum.listPosts.invalidate(); utils.communityForum.myLikes.invalidate(); },
    });
    const createReply = trpc.communityForum.createReply.useMutation({
      onSuccess: () => { setReplyBody(""); refetch(); utils.communityForum.listPosts.invalidate(); toast.success("Reply posted"); },
      onError: err => toast.error(err.message),
    });

    if (isLoading) return (
      <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>
    );

    const post = data?.post;
    const replies = data?.replies ?? [];

    return (
      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-amber-400/70 hover:text-amber-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to discussions
        </button>

        {post && (
          <div className="rounded-2xl border border-amber-500/20 bg-white/[0.02] p-6">
            <div className="flex items-start gap-3 mb-4">
              <Avatar className="w-10 h-10 border border-amber-500/20 shrink-0">
                <AvatarFallback className="bg-amber-500/10 text-amber-400 font-bold text-sm">{initials(post.authorName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-white">{post.authorName}</span>
                  <span className="text-xs text-white/30">{post.authorRole}</span>
                  {post.pinned ? <Badge className="bg-amber-500 text-black text-[9px] border-none px-1.5"><Pin className="w-2.5 h-2.5 mr-0.5 inline" />Pinned</Badge> : null}
                  <Badge variant="outline" className={`text-[9px] border-none ${CAT_COLORS[post.category] || CAT_COLORS.General}`}>{post.category}</Badge>
                </div>
                <span className="text-[10px] text-white/25">{timeAgo(post.createdAt)}</span>
              </div>
            </div>
            <h2 className="text-lg font-black text-white mb-3">{post.title}</h2>
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{post.body}</p>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
              <button onClick={() => toggleLike.mutate({ postId: post.id })}
                className={`flex items-center gap-1.5 text-xs transition-colors ${likedPostIds.has(post.id) ? "text-red-400" : "text-white/40 hover:text-red-400"}`}>
                <Heart className={`w-4 h-4 ${likedPostIds.has(post.id) ? "fill-red-400" : ""}`} /> {post.likes}
              </button>
              <span className="text-xs text-white/30 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {replies.length} replies</span>
            </div>
          </div>
        )}

        {/* Replies */}
        <div className="space-y-3">
          {replies.map((reply: any) => (
            <div key={reply.id} className="rounded-xl border border-amber-500/10 bg-white/[0.015] p-4 ml-6">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-7 h-7 border border-amber-500/10 shrink-0">
                  <AvatarFallback className="bg-amber-500/10 text-amber-400 text-xs font-bold">{initials(reply.authorName)}</AvatarFallback>
                </Avatar>
                <span className="font-bold text-xs text-white">{reply.authorName}</span>
                <span className="text-[10px] text-white/30">{reply.authorRole}</span>
                <span className="text-[10px] text-white/20 ml-auto">{timeAgo(reply.createdAt)}</span>
              </div>
              <p className="text-sm text-white/65 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
            </div>
          ))}
        </div>

        {/* Reply box */}
        <div className="rounded-xl border border-amber-500/20 bg-white/[0.02] p-4 space-y-3">
          <p className="text-xs font-bold text-amber-400">Add your reply</p>
          <Textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Share your thoughts, advice, or experience…"
            className="min-h-[100px] bg-white/5 border-amber-500/20 text-white placeholder:text-white/25 text-sm resize-none focus:border-amber-500"
            maxLength={3000}
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/25">{replyBody.length}/3000</span>
            <Button onClick={() => createReply.mutate({ postId, body: replyBody.trim() })}
              disabled={replyBody.trim().length < 5 || createReply.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold h-9 px-5">
              {createReply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Post Reply</>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main component ───────────────────────────────────────────────────────────
  export default function Community() {
    const { user } = useAuth();
    const [activeThread, setActiveThread] = useState<number | null>(null);
    const [catFilter, setCatFilter] = useState("all");
    const [newPostOpen, setNewPostOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newBody, setNewBody] = useState("");
    const [newCategory, setNewCategory] = useState("General");
    const utils = trpc.useUtils();

    // Paywall check
    const isPaid = (user as any)?.subscriptionStatus === "active" || (user as any)?.subscriptionStatus === "trialing";

    // Init DB tables on mount (for paid members only)
    const init = trpc.communityForum.init.useMutation();
    useEffect(() => {
      if (isPaid && user) init.mutate();
    }, [isPaid, user?.id]);

    const { data: postsData, isLoading, refetch } = trpc.communityForum.listPosts.useQuery(
      { category: catFilter === "all" ? undefined : catFilter, limit: 30 },
      { enabled: isPaid && !!user, refetchInterval: 30000 }
    );
    const { data: likesData } = trpc.communityForum.myLikes.useQuery(
      undefined,
      { enabled: isPaid && !!user }
    );

    const createPost = trpc.communityForum.createPost.useMutation({
      onSuccess: () => {
        setNewPostOpen(false); setNewTitle(""); setNewBody(""); setNewCategory("General");
        utils.communityForum.listPosts.invalidate();
        toast.success("Post shared with the community!");
      },
      onError: err => toast.error(err.message),
    });
    const toggleLike = trpc.communityForum.toggleLike.useMutation({
      onSuccess: () => { utils.communityForum.listPosts.invalidate(); utils.communityForum.myLikes.invalidate(); },
    });

    if (!user || (!isPaid && user)) return <MembersOnlyWall />;

    const posts = postsData?.posts ?? [];
    const likedPostIds = new Set<number>(likesData?.likedPostIds ?? []);

    if (activeThread !== null) {
      return (
        <div className="min-h-screen pb-20" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
          <div className="max-w-3xl mx-auto px-4 py-8">
            <ThreadView postId={activeThread} onBack={() => setActiveThread(null)} likedPostIds={likedPostIds} />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen pb-24" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b border-amber-500/20 bg-black/60 backdrop-blur-xl sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Users className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight uppercase italic gradient-text-gold">Virelle Community</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Members · Filmmakers · Collaborators</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Button size="sm" onClick={() => refetch()} variant="ghost" className="text-white/40 hover:text-white h-8 w-8 p-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 hidden sm:flex shrink-0">
                <Crown className="w-3 h-3 mr-1.5" /> Members
              </Badge>
              <Button onClick={() => setNewPostOpen(true)} size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black font-black h-9">
                <Plus className="w-4 h-4 mr-1.5" /> New Post
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <Tabs defaultValue="discussions">
            <TabsList className="bg-black/40 border border-amber-500/20 mb-6 p-1 rounded-xl">
              <TabsTrigger value="discussions" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold rounded-lg px-5 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Discussions
              </TabsTrigger>
              <TabsTrigger value="events" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold rounded-lg px-5 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Events
              </TabsTrigger>
              <TabsTrigger value="resources" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold rounded-lg px-5 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Resources
              </TabsTrigger>
            </TabsList>

            {/* ─── Discussions tab ─── */}
            <TabsContent value="discussions" className="space-y-4">
              {/* Category filter */}
              <div className="flex gap-2 flex-wrap">
                {["all", ...POST_CATEGORIES].map(cat => (
                  <button key={cat} onClick={() => setCatFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${catFilter === cat ? "bg-amber-500 text-black" : "bg-white/[0.03] border border-amber-500/10 text-white/50 hover:border-amber-500/30 hover:text-white/80"}`}>
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>

              {/* Posts */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>
              ) : posts.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <MessageSquare className="w-12 h-12 mx-auto text-amber-500/20" />
                  <p className="text-white/40 text-sm">No posts yet in this category.</p>
                  <Button onClick={() => setNewPostOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-bold">
                    <Plus className="w-4 h-4 mr-2" /> Start the conversation
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post: any) => (
                    <div key={post.id}
                      onClick={() => setActiveThread(post.id)}
                      className="flex gap-4 p-4 rounded-xl border border-amber-500/10 bg-white/[0.02] hover:border-amber-500/30 hover:bg-white/[0.04] transition-all cursor-pointer group">
                      <Avatar className="w-10 h-10 border border-amber-500/15 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-amber-500/10 text-amber-400 font-bold text-sm">{initials(post.authorName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              {post.pinned ? <Badge className="bg-amber-500 text-black text-[9px] border-none px-1.5 shrink-0"><Pin className="w-2.5 h-2.5 mr-0.5 inline" />Pinned</Badge> : null}
                              <Badge variant="outline" className={`text-[9px] border-none shrink-0 ${CAT_COLORS[post.category] || CAT_COLORS.General}`}>{post.category}</Badge>
                            </div>
                            <h3 className="font-black text-sm text-white group-hover:text-amber-400 transition-colors truncate">{post.title}</h3>
                            <p className="text-xs text-white/40 truncate mt-0.5">{post.body}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-amber-400/60 shrink-0 mt-1 transition-colors" />
                        </div>
                        <div className="flex items-center gap-4 mt-2.5">
                          <span className="text-[10px] text-white/30 font-medium">{post.authorName} · {post.authorRole}</span>
                          <span className="text-[10px] text-white/20">{timeAgo(post.createdAt)}</span>
                          <button onClick={e => { e.stopPropagation(); toggleLike.mutate({ postId: post.id }); }}
                            className={`flex items-center gap-1 text-[10px] ml-auto transition-colors ${likedPostIds.has(post.id) ? "text-red-400" : "text-white/30 hover:text-red-400"}`}>
                            <Heart className={`w-3.5 h-3.5 ${likedPostIds.has(post.id) ? "fill-red-400" : ""}`} /> {post.likes}
                          </button>
                          <span className="text-[10px] text-white/30 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {post.replyCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── Events tab ─── */}
            <TabsContent value="events" className="space-y-3">
              {EVENTS.map(e => (
                <a key={e.title} href={e.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start justify-between gap-4 p-4 rounded-xl border border-amber-500/10 bg-white/[0.02] hover:border-amber-500/30 hover:bg-white/[0.04] transition-all group">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">{e.title}</span>
                      <Badge variant="outline" className={`text-[9px] border-none ${e.type === "Festival" ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"}`}>{e.type}</Badge>
                    </div>
                    <p className="text-xs text-white/40">{e.date} · {e.location}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-amber-400 shrink-0 mt-0.5 transition-colors" />
                </a>
              ))}
            </TabsContent>

            {/* ─── Resources tab ─── */}
            <TabsContent value="resources">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {RESOURCES.map(r => (
                  <a key={r.title} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-amber-500/10 bg-white/[0.02] hover:border-amber-500/30 hover:bg-white/[0.04] transition-all group space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">{r.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-amber-400 shrink-0 transition-colors" />
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed">{r.description}</p>
                    <Badge variant="outline" className="text-[9px] border-none bg-amber-500/10 text-amber-400/70">{r.category}</Badge>
                  </a>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* New Post Dialog */}
        <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
          <DialogContent className="sm:max-w-lg glass-dark">
            <DialogHeader>
              <DialogTitle className="gradient-text-gold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" /> Share with the Community
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/60">Title <span className="text-red-400">*</span></Label>
                <Input placeholder="e.g. How do you approach colour grading for night scenes?" value={newTitle}
                  onChange={e => setNewTitle(e.target.value)} maxLength={200}
                  className="bg-white/5 border-amber-500/20 focus:border-amber-500 text-white placeholder:text-white/25" />
                <p className="text-[10px] text-white/25 text-right">{newTitle.length}/200</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/60">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="bg-white/5 border-amber-500/20 text-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/60">Content <span className="text-red-400">*</span></Label>
                <Textarea className="min-h-[140px] bg-white/5 border-amber-500/20 focus:border-amber-500 text-white placeholder:text-white/25 resize-none"
                  placeholder="Ask a question, share a tip, start a discussion — be specific and detailed for the best responses…"
                  value={newBody} onChange={e => setNewBody(e.target.value)} maxLength={5000} />
                <p className="text-[10px] text-white/25">{newBody.length}/5000 (min 20 chars)</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewPostOpen(false)} className="border-white/10 text-white/60">Cancel</Button>
              <Button onClick={() => {
                if (!newTitle.trim()) { toast.error("Title is required"); return; }
                if (newBody.trim().length < 20) { toast.error("Content needs at least 20 characters"); return; }
                createPost.mutate({ title: newTitle.trim(), body: newBody.trim(), category: newCategory as any });
              }} disabled={createPost.isPending} className="bg-amber-500 hover:bg-amber-400 text-black font-black">
                {createPost.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting…</> : "Post to Community"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  