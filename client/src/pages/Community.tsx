import { useState } from "react";
  import { useLocation } from "wouter";
  import { MessageSquare, Users, Star, Calendar, TrendingUp, Plus, Heart, Share2, BookOpen, ArrowRight, ExternalLink, Lightbulb, Film, Award, Megaphone, X } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Avatar, AvatarFallback } from "@/components/ui/avatar";
  import { Separator } from "@/components/ui/separator";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { toast } from "sonner";
  import { useAuth } from "@/_core/hooks/useAuth";

  const INITIAL_POSTS = [
    { id: 1, author: "Sofia R.", avatar: "SR", role: "Director", title: "What's your current script-to-screen workflow?", body: "I've been experimenting with going directly from script coverage to storyboard without a full breakdown. Curious what process others are following. Do you breakdown first or storyboard first?", category: "Craft", likes: 47, replies: 23, time: "2h ago", pinned: true },
    { id: 2, author: "Marcus T.", avatar: "MT", role: "DP", title: "Mirrorless cameras for low-budget features in 2025 — which one wins?", body: "Running a test on Sony FX3, Canon R5C, and Blackmagic 6K. Happy to share footage stills if anyone wants to compare. The low-light difference is massive.", category: "Gear", likes: 31, replies: 18, time: "5h ago", pinned: false },
    { id: 3, author: "Anya K.", avatar: "AK", role: "Writer/Director", title: "I got into Sundance on my 3rd feature — here's what changed", body: "Not gear. Not budget. The one thing that made the difference was having a complete story before starting to shoot. Detailed write-up in the comments.", category: "Festivals", likes: 203, replies: 67, time: "1d ago", pinned: false },
    { id: 4, author: "James O.", avatar: "JO", role: "Producer", title: "Tax incentive comparison: Georgia vs. New Mexico — which is easier to qualify?", body: "Just came off a production in Georgia (28% credit) and considering NM for next project. The paperwork in Georgia was intense. Anyone done both?", category: "Finance", likes: 29, replies: 14, time: "1d ago", pinned: false },
    { id: 5, author: "Priya M.", avatar: "PM", role: "Composer", title: "AI-assisted scoring: legitimate tool or crutch?", body: "I've been using AI to generate first-pass sketches for scenes and then recomposing from there. Directors love the turnaround speed. Thoughts from the community?", category: "Music", likes: 88, replies: 44, time: "2d ago", pinned: false },
    { id: 6, author: "Diego F.", avatar: "DF", role: "Editor", title: "Request: feedback on my short film trailer cut (2 min)", body: "Finished my first narrative short — a 12-minute thriller. Would love eyes on the trailer cut before I submit to festivals. Link in comments.", category: "Feedback", likes: 12, replies: 9, time: "3d ago", pinned: false },
  ];

  const EVENTS = [
    { title: "Sundance Film Festival", date: "Jan 23–Feb 2, 2026", location: "Park City, Utah", type: "Festival", url: "https://sundance.org" },
    { title: "Berlin International Film Festival", date: "Feb 13–23, 2026", location: "Berlin, Germany", type: "Festival", url: "https://berlinale.de" },
    { title: "Hot Docs International Documentary Festival", date: "May 1–11, 2026", location: "Toronto, Canada", type: "Festival", url: "https://hotdocs.ca" },
    { title: "Cannes Film Market (Marché du Film)", date: "May 13–24, 2026", location: "Cannes, France", type: "Market", url: "https://marchedufilm.com" },
    { title: "AFM — American Film Market", date: "Nov 5–10, 2025", location: "Las Vegas, NV", type: "Market", url: "https://americanfilmmarket.com" },
    { title: "SXSW Film & TV Festival", date: "Mar 6–15, 2026", location: "Austin, Texas", type: "Festival", url: "https://sxsw.com/film" },
  ];

  const RESOURCES = [
    { title: "No Film School", description: "Daily filmmaking news, tutorials, and gear reviews from working professionals.", url: "https://nofilmschool.com", category: "Education" },
    { title: "Stage 32", description: "The world's largest social network for film, TV, and theatre creatives.", url: "https://stage32.com", category: "Networking" },
    { title: "FilmFreeway", description: "Submit to film festivals, screenplay competitions, and grants worldwide.", url: "https://filmfreeway.com", category: "Festivals" },
    { title: "The Black List", description: "Script hosting, evaluations, and connections to the industry's top executives.", url: "https://blcklst.com", category: "Screenwriting" },
    { title: "Coverfly", description: "Screenwriting competitions and fellowships aggregator with ranking system.", url: "https://coverfly.com", category: "Screenwriting" },
    { title: "Wrapbook", description: "Payroll, insurance, and finance tools built for film and TV productions.", url: "https://wrapbook.com", category: "Production" },
    { title: "Backstage", description: "Casting platform where real actors search for roles and submit self-tapes.", url: "https://backstage.com", category: "Casting" },
    { title: "Actors Access", description: "Breakdown Services platform for submitting castings to talent agents.", url: "https://actorsaccess.com", category: "Casting" },
    { title: "Music Bed", description: "Premium licensed music for film and commercial sync use.", url: "https://musicbed.com", category: "Music" },
    { title: "Artlist", description: "Unlimited annual music licence for online, film, and social distribution.", url: "https://artlist.io", category: "Music" },
    { title: "Soundly", description: "Professional sound effects library used by major studios.", url: "https://getsoundly.com", category: "Sound" },
    { title: "Incentify", description: "Film production tax incentive calculator and incentive comparison tool.", url: "https://incentify.io", category: "Finance" },
  ];

  const POST_CATEGORIES = ["Craft", "Gear", "Festivals", "Finance", "Music", "Feedback", "General"];

  const CATEGORY_COLORS: Record<string, string> = {
    Craft: "bg-violet-500/15 text-violet-500", Gear: "bg-blue-500/15 text-blue-500", Festivals: "bg-amber-500/15 text-amber-500",
    Finance: "bg-green-500/15 text-green-500", Music: "bg-pink-500/15 text-pink-500", Feedback: "bg-primary/15 text-primary",
    General: "bg-muted text-muted-foreground",
  };

  export default function Community() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const [posts, setPosts] = useState(INITIAL_POSTS);
    const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
    const [catFilter, setCatFilter] = useState("all");
    const [resourceFilter, setResourceFilter] = useState("all");
    const [newPostOpen, setNewPostOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newBody, setNewBody] = useState("");
    const [newCategory, setNewCategory] = useState("General");
    const [submitting, setSubmitting] = useState(false);

    const toggleLike = (id: number) => {
      setLikedPosts(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    };

    const handleNewPost = () => {
      if (!newTitle.trim()) { toast.error("Add a title for your post"); return; }
      if (!newBody.trim() || newBody.trim().length < 20) { toast.error("Add at least 20 characters of content"); return; }
      setSubmitting(true);
      setTimeout(() => {
        const displayName = user?.displayName || user?.email?.split("@")[0] || "You";
        const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0,2);
        setPosts(prev => [{
          id: Date.now(), author: displayName, avatar: initials, role: "Filmmaker",
          title: newTitle.trim(), body: newBody.trim(), category: newCategory,
          likes: 0, replies: 0, time: "just now", pinned: false,
        }, ...prev]);
        setNewTitle(""); setNewBody(""); setNewCategory("General");
        setSubmitting(false); setNewPostOpen(false);
        toast.success("Post shared with the community");
      }, 600);
    };

    const resourceCategories = Array.from(new Set(RESOURCES.map(r => r.category)));
    const filteredPosts = posts.filter(p => catFilter === "all" || p.category === catFilter);
    const filteredResources = RESOURCES.filter(r => resourceFilter === "all" || r.category === resourceFilter);
    const postCategories = Array.from(new Set(posts.map(p => p.category)));

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />Filmmaker Community</h1>
            <p className="text-sm text-muted-foreground mt-1">Connect, learn, and collaborate with independent filmmakers worldwide</p>
          </div>
          <Button onClick={() => setNewPostOpen(true)}><Plus className="h-4 w-4 mr-2" />New Post</Button>
        </div>

        {/* New Post Dialog */}
        <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Share with the Community</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input placeholder="What's on your mind?" value={newTitle} onChange={e => setNewTitle(e.target.value)} maxLength={120} />
                <p className="text-[10px] text-muted-foreground text-right">{newTitle.length}/120</p>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Content *</Label>
                <Textarea className="h-32" placeholder="Share your experience, ask a question, or start a discussion…" value={newBody} onChange={e => setNewBody(e.target.value)} />
                <p className="text-[10px] text-muted-foreground">{newBody.length} characters (min 20)</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewPostOpen(false)}>Cancel</Button>
              <Button onClick={handleNewPost} disabled={submitting}>
                {submitting ? "Posting…" : "Post to Community"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="discussions">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="resources">Directory</TabsTrigger>
          </TabsList>

          {/* ── Discussions ── */}
          <TabsContent value="discussions" className="space-y-4 mt-4">
            <div className="flex gap-2 flex-wrap">
              <Button variant={catFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setCatFilter("all")}>All</Button>
              {postCategories.map(c => <Button key={c} variant={catFilter === c ? "default" : "outline"} size="sm" onClick={() => setCatFilter(c)}>{c}</Button>)}
            </div>

            <div className="space-y-3">
              {filteredPosts.map(post => (
                <Card key={post.id} className={`hover:border-primary/40 transition-colors cursor-pointer ${post.pinned ? "border-primary/20" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{post.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {post.pinned && <Badge className="text-[10px] h-4">📌 Pinned</Badge>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[post.category] ?? "bg-muted text-muted-foreground"}`}>{post.category}</span>
                        </div>
                        <h3 className="font-semibold text-sm leading-snug mb-1">{post.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{post.body}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">{post.author} · {post.role} · {post.time}</span>
                          <div className="flex items-center gap-3 ml-auto">
                            <button className={`flex items-center gap-1 text-xs transition-colors ${likedPosts.has(post.id) ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`} onClick={() => toggleLike(post.id)}>
                              <Heart className={`h-3.5 w-3.5 ${likedPosts.has(post.id) ? "fill-current" : ""}`} />
                              {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                            </button>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" />{post.replies}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredPosts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No posts in this category yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setNewPostOpen(true)}>Be the first to post</Button>
                </div>
              )}
            </div>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">Connect with the global Virelle filmmaker network. Post questions, share projects, give feedback, and grow together.</p>
              <Button variant="outline" onClick={() => setLocation("/settings")}><ArrowRight className="h-4 w-4 mr-2" />Manage Community Settings</Button>
            </div>
          </TabsContent>

          {/* ── Events ── */}
          <TabsContent value="events" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">Upcoming industry events, film markets, and festivals.</p>
            {EVENTS.map(ev => (
              <Card key={ev.title} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {ev.type === "Festival" ? <Film className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium text-sm">{ev.title}</span><Badge variant="outline" className="text-[10px]">{ev.type}</Badge></div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{ev.date}</span>
                      <span>{ev.location}</span>
                    </div>
                  </div>
                  <a href={ev.url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0"><ExternalLink className="h-3 w-3" />Visit</Button></a>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Resources Directory ── */}
          <TabsContent value="resources" className="space-y-4 mt-4">
            <div className="flex gap-2 flex-wrap">
              <Button variant={resourceFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setResourceFilter("all")}>All</Button>
              {resourceCategories.map(c => <Button key={c} variant={resourceFilter === c ? "default" : "outline"} size="sm" onClick={() => setResourceFilter(c)}>{c}</Button>)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredResources.map(r => (
                <Card key={r.title} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{r.title}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{r.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" />{r.url.replace("https://","")}</a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }