import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Calendar, Eye, Tag, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LeegoFooter from "@/components/LeegoFooter";

const CATEGORIES = [
  { key: "all", label: "All Articles" },
  { key: "ai-filmmaking", label: "AI Filmmaking" },
  { key: "cinematography", label: "Cinematography" },
  { key: "industry-trends", label: "Industry Trends" },
  { key: "tutorials", label: "Tutorials" },
  { key: "behind-the-scenes", label: "Behind the Scenes" },
];

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: articles, isLoading } = trpc.blog.list.useQuery(
    selectedCategory === "all" ? { limit: 50 } : { limit: 50, category: selectedCategory }
  );

  const formatDate = (date: string | Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Home
              </Button>
            </Link>
            <div className="h-6 w-px bg-white/20" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              VirÉlle Studios Blog
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 text-center max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <BookOpen className="h-6 w-6 text-amber-400" />
          <span className="text-amber-400 font-medium text-sm uppercase tracking-wider">The AI Filmmaking Journal</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold mb-4">
          Insights on <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">AI Cinema</span>
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Explore the latest in AI filmmaking — from cinematic techniques and prompt engineering to industry trends and behind-the-scenes deep dives.
        </p>
      </section>

      {/* Category Filter */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.key
                  ? "bg-amber-600 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-xl h-72 animate-pulse" />
            ))}
          </div>
        ) : !articles || articles.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white/60 mb-2">No articles yet</h3>
            <p className="text-white/40">Check back soon — new articles are published automatically every day.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link key={article.id} href={`/blog/${article.slug}`}>
                <article className="group bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-amber-500/30 transition-all hover:bg-white/[0.07] cursor-pointer h-full flex flex-col">
                  {/* Cover Image or Gradient */}
                  <div className="h-40 bg-gradient-to-br from-amber-600/20 to-orange-600/10 flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-amber-400/40 group-hover:text-amber-400/60 transition-colors" />
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    {/* Category Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="bg-amber-600/20 text-amber-400 border-0 text-xs">
                        {CATEGORIES.find(c => c.key === article.category)?.label || article.category}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors mb-2 line-clamp-2">
                      {article.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-white/50 text-sm line-clamp-3 flex-1 mb-4">
                      {article.excerpt}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(article.publishedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {article.viewCount || 0}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-400/0 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* CTA Section */}
      <section className="border-t border-white/10 py-16 px-4 sm:px-6 text-center bg-gradient-to-b from-transparent to-amber-950/10">
        <h3 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Create Your Own AI Film?</h3>
        <p className="text-white/60 mb-6 max-w-lg mx-auto">
          Join thousands of filmmakers using VirÉlle Studios to produce Hollywood-quality content with AI.
        </p>
        <Link href="/register">
          <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-8">
            Start Creating — It's Free
          </Button>
        </Link>
      </section>

      <LeegoFooter />
    </div>
  );
}
