import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Badge } from "@/components/ui/badge";
  import { Search } from "lucide-react";
  import { useState } from "react";

  export default function TalentSearch() {
    const [query, setQuery] = useState("");

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold gradient-text-gold">Talent Search</h1>
            <p className="text-muted-foreground text-sm mt-1">Find and discover talent for your projects.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search talent by name, role, or skills..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm gradient-text-gold">Results</CardTitle>
            </CardHeader>
            <CardContent>
              {query.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Enter a search term to find talent.</p>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">No results found for &ldquo;{query}&rdquo;.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  