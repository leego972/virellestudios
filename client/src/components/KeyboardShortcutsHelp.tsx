import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutRow { keys: string[]; label: string; }
interface ShortcutGroup { title: string; rows: ShortcutRow[]; }

const GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    rows: [
      { keys: ["⌘", "K"], label: "Open command palette / search" },
      { keys: ["?"], label: "Show this keyboard help" },
      { keys: ["g", "h"], label: "Go to Home dashboard" },
      { keys: ["g", "p"], label: "Go to Projects" },
      { keys: ["g", "s"], label: "Go to Settings" },
      { keys: ["Esc"], label: "Close any dialog or overlay" },
    ],
  },
  {
    title: "Project workspace",
    rows: [
      { keys: ["1"], label: "Overview tab" },
      { keys: ["2"], label: "Scenes tab" },
      { keys: ["3"], label: "Storyboard tab" },
      { keys: ["4"], label: "Characters tab" },
      { keys: ["5"], label: "Production tab" },
      { keys: ["6"], label: "Cuts tab" },
      { keys: ["7"], label: "Distribute tab" },
      { keys: ["8"], label: "Press Kit" },
      { keys: ["9"], label: "Settings" },
    ],
  },
  {
    title: "Scene editor",
    rows: [
      { keys: ["⌘", "S"], label: "Save scene now" },
      { keys: ["Esc"], label: "Close editor without saving" },
    ],
  },
];

function Key({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1.5 text-[11px] font-mono rounded border border-border/70 bg-muted/40 text-foreground/90 shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]">
      {k}
    </kbd>
  );
}

export default function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const editable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;
      if (editable) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-amber-500" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Move through Virelle Studios faster. Press <Key k="?" /> any time to reopen this panel.
          </DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-6 mt-2 max-h-[60vh] overflow-y-auto pr-2">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{g.title}</div>
              <ul className="space-y-1.5">
                {g.rows.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground/85">{r.label}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {r.keys.map((k, j) => (
                        <span key={j} className="flex items-center gap-1">
                          <Key k={k} />
                          {j < r.keys.length - 1 && <span className="text-muted-foreground text-xs">+</span>}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
