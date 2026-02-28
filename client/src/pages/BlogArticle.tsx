import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Calendar, Eye, Tag, Share2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LeegoFooter from "@/components/LeegoFooter";
import { useEffect } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  "ai-filmmaking": "AI Filmmaking",
  "cinematography": "Cinematography & Visuals",
  "industry-trends": "Industry Trends",
  "tutorials": "Tutorials & How-To",
  "behind-the-scenes": "Behind the Scenes",
};

export default function BlogArticle() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";

  const { data: article, isLoading, error } = trpc.blog.bySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  // Update page title and meta for SEO
  useEffect(() => {
    if (article) {
      document.title = `${article.metaTitle || article.title} | VirÉlle Studios Blog`;
      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", article.metaDescription || article.excerpt || "");
    }
    return () => {
      document.title = "VirÉlle Studios";
    };
  }, [article]);

  const formatDate = (date: string | Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article?.title || "VirÉlle Studios Blog",
        text: article?.excerpt || "",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Simple Markdown to HTML renderer
  const renderMarkdown = (md: string) => {
    let html = md
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-8 mb-3 text-white">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-10 mb-4 text-white">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-10 mb-4 text-white">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Unordered lists
      .replace(/^\- (.*$)/gm, '<li class="ml-4 mb-1">$1</li>')
      .replace(/^\* (.*$)/gm, '<li class="ml-4 mb-1">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>')
      // Blockquotes
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-amber-500 pl-4 py-2 my-4 text-white/70 italic">$1</blockquote>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-white/5 rounded-lg p-4 my-4 overflow-x-auto text-sm text-white/80"><code>$1</code></pre>')
      // Inline code
      .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-amber-400 text-sm">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-amber-400 hover:text-amber-300 underline" target="_blank" rel="noopener">$1</a>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="border-white/10 my-8" />')
      // Paragraphs (double newlines)
      .replace(/\n\n/g, '</p><p class="text-white/70 leading-relaxed mb-4">');

    return `<p class="text-white/70 leading-relaxed mb-4">${html}</p>`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-white/40">Loading article...</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <BookOpen className="h-12 w-12 text-white/20" />
        <h2 className="text-xl font-semibold">Article not found</h2>
        <Link href="/blog">
          <Button variant="ghost" className="text-amber-400">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Button>
        </Link>
      </div>
    );
  }

  const tags = Array.isArray(article.tags) ? article.tags as string[] : [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/blog">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Blog
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare} className="text-white/60 hover:text-white">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Link href="/register">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Category + Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Badge variant="secondary" className="bg-amber-600/20 text-amber-400 border-0">
            {CATEGORY_LABELS[article.category] || article.category}
          </Badge>
          <span className="flex items-center gap-1 text-sm text-white/40">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(article.publishedAt)}
          </span>
          <span className="flex items-center gap-1 text-sm text-white/40">
            <Eye className="h-3.5 w-3.5" />
            {(article.viewCount || 0) + 1} views
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
          {article.title}
        </h1>

        {/* Subtitle */}
        {article.subtitle && (
          <p className="text-xl text-white/60 mb-8 leading-relaxed">
            {article.subtitle}
          </p>
        )}

        <hr className="border-white/10 mb-8" />

        {/* Content */}
        <div
          className="prose prose-invert max-w-none article-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
        />

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-white/40" />
              {tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="border-white/20 text-white/50 text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-600/10 to-orange-600/5 border border-amber-500/20 text-center">
          <h3 className="text-xl font-bold mb-2">Create Your Own AI Film</h3>
          <p className="text-white/60 mb-4">
            Turn your ideas into Hollywood-quality films with VirÉlle Studios' AI engine.
          </p>
          <Link href="/register">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white px-6">
              Start Creating — It's Free
            </Button>
          </Link>
        </div>
      </article>

      <LeegoFooter />
    </div>
  );
}
