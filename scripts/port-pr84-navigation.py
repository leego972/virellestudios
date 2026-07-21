from pathlib import Path


def patch(path: str, old: str, new: str) -> None:
    file = Path(path)
    content = file.read_text()
    if new in content:
        return
    if old not in content:
        raise RuntimeError(f"Expected navigation anchor missing in {path}")
    file.write_text(content.replace(old, new, 1))


patch(
    "client/src/components/DashboardLayout.tsx",
    """  BarChart3,
  Camera,
  ChevronDown,""",
    """  BarChart3,
  Camera,
  Clapperboard,
  ChevronDown,""",
)
patch(
    "client/src/components/DashboardLayout.tsx",
    """  TrendingUp,
  Users,
  Wand2,""",
    """  TrendingUp,
  Users,
  Users2,
  Wand2,""",
)
patch(
    "client/src/components/DashboardLayout.tsx",
    """      { icon: Globe, label: "Film Showcase", path: "/showcase" },
      { icon: DollarSign, label: "Funding", path: "/funding" },""",
    """      { icon: Globe, label: "Film Showcase", path: "/showcase" },
      { icon: Clapperboard, label: "Project Samples", path: "/samples" },
      { icon: DollarSign, label: "Funding", path: "/funding" },""",
)
patch(
    "client/src/components/DashboardLayout.tsx",
    """      { icon: Wand2, label: "Campaigns", path: "/campaigns" },
    ],""",
    """      { icon: Wand2, label: "Campaigns", path: "/campaigns" },
      { icon: Users2, label: "Community", path: "/community" },
    ],""",
)

patch(
    "client/src/components/ProjectToolHub.tsx",
    """        { title: "Production Office", description: "Central operating room for the project.", href: `/projects/${projectId}/production-office`, icon: Briefcase },
        { title: "Pre-Production Panel",""",
    """        { title: "Production Office", description: "Central operating room for the project.", href: `/projects/${projectId}/production-office`, icon: Briefcase },
        { title: "Command Center", description: "Cross-department status, blockers and progress at a glance.", href: `/projects/${projectId}/command-center`, icon: SlidersHorizontal },
        { title: "Pre-Production Panel",""",
)

patch(
    "client/src/pages/Budget.tsx",
    """              <Button size="sm" variant="ghost" onClick={exportCSV} className="gap-1.5 h-8 text-xs text-muted-foreground"><Download className="h-3.5 w-3.5" />CSV</Button>""",
    """              <Button size="sm" variant="ghost" onClick={() => navigate("/film-comps")} className="gap-1.5 h-8 text-xs text-muted-foreground">Film Comps</Button>
              <Button size="sm" variant="ghost" onClick={() => navigate("/tax-incentives")} className="gap-1.5 h-8 text-xs text-muted-foreground">Tax Incentives</Button>
              <Button size="sm" variant="ghost" onClick={exportCSV} className="gap-1.5 h-8 text-xs text-muted-foreground"><Download className="h-3.5 w-3.5" />CSV</Button>""",
)

patch(
    "client/src/pages/WardrobeMarketplacePage.tsx",
    """            <Button
              variant="outline"
              onClick={() => setCustomOrderOpen(true)}
              className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-12 px-6 shrink-0 w-full sm:w-auto"
            >
              <Wand2 className="h-4 w-4 mr-2" /> Order Custom Item — A$4.99
            </Button>""",
    """            <Button
              variant="outline"
              onClick={() => setCustomOrderOpen(true)}
              className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-12 px-6 shrink-0 w-full sm:w-auto"
            >
              <Wand2 className="h-4 w-4 mr-2" /> Order Custom Item — A$4.99
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/wardrobe-inventory")}
              className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-12 px-6 shrink-0 w-full sm:w-auto"
            >
              My Wardrobe Inventory
            </Button>""",
)
