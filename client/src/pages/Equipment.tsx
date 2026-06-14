import { useState, useMemo } from "react";
  import { useParams, useLocation } from "wouter";
  import { ArrowLeft, Package, Plus, Trash2, Edit2, Save, X, Search, Filter, CheckSquare, Square, Download, Camera, Mic, Zap, Truck, Shirt, Box } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Checkbox } from "@/components/ui/checkbox";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Separator } from "@/components/ui/separator";
  import { toast } from "sonner";

  type OwnershipType = "owned" | "rented" | "borrowed" | "needed";
  type ItemStatus = "available" | "checked-out" | "returned" | "damaged";

  interface EquipmentItem {
    id: string;
    category: string;
    name: string;
    description: string;
    quantity: number;
    ownership: OwnershipType;
    status: ItemStatus;
    vendor: string;
    dailyRate: string;
    notes: string;
    checkedOut: boolean;
  }

  const CATEGORIES = [
    { key: "camera", label: "Camera", icon: "📷" },
    { key: "lens", label: "Lenses", icon: "🔭" },
    { key: "lighting", label: "Lighting", icon: "💡" },
    { key: "audio", label: "Audio", icon: "🎙️" },
    { key: "grip", label: "Grip & Electric", icon: "🎬" },
    { key: "props", label: "Props", icon: "🎭" },
    { key: "costume", label: "Costume & Hair/MU", icon: "👗" },
    { key: "transport", label: "Transport", icon: "🚐" },
    { key: "set", label: "Set Dressing", icon: "🛋️" },
    { key: "other", label: "Other", icon: "📦" },
  ];

  const OWNERSHIP_COLORS: Record<OwnershipType, string> = {
    owned: "bg-green-500/15 text-green-600 border-green-500/20",
    rented: "bg-primary/15 text-primary border-primary/20",
    borrowed: "bg-blue-500/15 text-blue-500 border-blue-500/20",
    needed: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  };

  const STATUS_COLORS: Record<ItemStatus, string> = {
    available: "text-green-500",
    "checked-out": "text-amber-500",
    returned: "text-muted-foreground",
    damaged: "text-destructive",
  };

  const STORAGE_KEY = (id: string) => `virelle_equipment_${id}`;

  export default function Equipment() {
    const params = useParams<{ id: string }>();
    const projectId = params.id;
    const [, setLocation] = useLocation();

    const [items, setItems] = useState<EquipmentItem[]>(() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY(projectId)) ?? "[]"); } catch { return []; }
    });
    const [editing, setEditing] = useState<Partial<EquipmentItem> | null>(null);
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("all");
    const [ownerFilter, setOwnerFilter] = useState("all");

    const persist = (next: EquipmentItem[]) => {
      setItems(next);
      localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(next));
    };

    const save = () => {
      if (!editing?.name?.trim()) { toast.error("Item name is required"); return; }
      const item = editing as EquipmentItem;
      const isNew = !items.find(i => i.id === item.id);
      const next = isNew ? [...items, { ...item, id: Date.now().toString() }] : items.map(i => i.id === item.id ? item : i);
      persist(next);
      setEditing(null);
      toast.success(isNew ? "Item added" : "Item updated");
    };

    const del = (id: string) => { persist(items.filter(i => i.id !== id)); toast.success("Removed"); };

    const toggle = (id: string) => persist(items.map(i => i.id === id ? { ...i, checkedOut: !i.checkedOut, status: !i.checkedOut ? "checked-out" : "available" } : i));

    const filtered = useMemo(() => items.filter(i =>
      (catFilter === "all" || i.category === catFilter) &&
      (ownerFilter === "all" || i.ownership === ownerFilter) &&
      (i.name.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase()) || i.vendor?.toLowerCase().includes(search.toLowerCase()))
    ), [items, catFilter, ownerFilter, search]);

    const byCategory = useMemo(() => CATEGORIES.map(cat => ({ ...cat, items: filtered.filter(i => i.category === cat.key) })).filter(c => c.items.length > 0), [filtered]);

    const summary = useMemo(() => ({
      total: items.length,
      owned: items.filter(i => i.ownership === "owned").length,
      rented: items.filter(i => i.ownership === "rented").length,
      needed: items.filter(i => i.ownership === "needed").length,
      checkedOut: items.filter(i => i.checkedOut).length,
    }), [items]);

    const exportList = () => {
      const lines = ["EQUIPMENT LIST","=============","","Category | Item | Qty | Ownership | Status | Vendor | Daily Rate | Notes","",
        ...items.map(i => `${CATEGORIES.find(c => c.key === i.category)?.label ?? i.category} | ${i.name} | ${i.quantity} | ${i.ownership} | ${i.status} | ${i.vendor || "—"} | ${i.dailyRate || "—"} | ${i.notes || "—"}`)
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "equipment-list.txt"; a.click();
      toast.success("Equipment list downloaded");
    };

    const newItem = (): Partial<EquipmentItem> => ({ id: "", category: "camera", name: "", description: "", quantity: 1, ownership: "rented", status: "available", vendor: "", dailyRate: "", notes: "", checkedOut: false });

    return (
      <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div className="max-w-5xl mx-auto space-y-6 py-6 px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/projects/${projectId}`)}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2 gradient-text-gold"><Package className="h-6 w-6 text-primary" />Equipment & Props</h1>
            <p className="text-sm text-muted-foreground">Track all gear, props, and costumes for this production</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={exportList}><Download className="h-3.5 w-3.5 mr-1" />Export</Button>
            <Button size="sm" onClick={() => setEditing(newItem())}><Plus className="h-3.5 w-3.5 mr-1" />Add Item</Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[["Total Items", summary.total],["Owned", summary.owned],["Rented", summary.rented],["Still Needed", summary.needed],["Checked Out", summary.checkedOut]].map(([l, v]) => (
            <Card key={l as string}><CardContent className="p-3 text-center"><p className="text-xl font-bold">{v}</p><p className="text-[10px] text-muted-foreground">{l}</p></CardContent></Card>
          ))}
        </div>

        {/* Add / Edit form */}
        {editing && (
          <Card className="border-primary/30">
            <CardHeader><CardTitle className="text-base gradient-text-gold">{editing.id && items.find(i => i.id === editing.id) ? "Edit Item" : "Add Equipment"}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1"><Label>Item Name *</Label><Input placeholder="Sony FX3 Camera Body" value={editing.name ?? ""} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Category</Label><Select value={editing.category ?? "other"} onValueChange={v => setEditing(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.icon} {c.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Ownership</Label><Select value={editing.ownership ?? "rented"} onValueChange={v => setEditing(p => ({ ...p, ownership: v as OwnershipType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="owned">Owned</SelectItem><SelectItem value="rented">Rented</SelectItem><SelectItem value="borrowed">Borrowed</SelectItem><SelectItem value="needed">Still Needed</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" min="1" value={editing.quantity ?? 1} onChange={e => setEditing(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} /></div>
              <div className="space-y-1.5"><Label>Vendor / Owner</Label><Input placeholder="LensRentals, John Doe…" value={editing.vendor ?? ""} onChange={e => setEditing(p => ({ ...p, vendor: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Daily Rate</Label><Input placeholder="$150/day" value={editing.dailyRate ?? ""} onChange={e => setEditing(p => ({ ...p, dailyRate: e.target.value }))} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Textarea className="h-16 text-sm" placeholder="Serial number, pickup instructions, special requirements…" value={editing.notes ?? ""} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} /></div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button onClick={save}><Save className="h-4 w-4 mr-1" />Save</Button>
                <Button variant="outline" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" />Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Input placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.icon} {c.label}</SelectItem>)}</SelectContent></Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All ownership</SelectItem><SelectItem value="owned">Owned</SelectItem><SelectItem value="rented">Rented</SelectItem><SelectItem value="borrowed">Borrowed</SelectItem><SelectItem value="needed">Needed</SelectItem></SelectContent></Select>
        </div>

        {/* Items by category */}
        {byCategory.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">No equipment added yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first item to start tracking gear, props, and costumes.</p>
            <Button className="mt-4" onClick={() => setEditing(newItem())}><Plus className="h-4 w-4 mr-2" />Add First Item</Button>
          </div>
        ) : byCategory.map(cat => (
          <div key={cat.key}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat.icon} {cat.label} ({cat.items.length})</h3>
            <div className="space-y-2">
              {cat.items.map(item => (
                <Card key={item.id} className={`transition-colors ${item.checkedOut ? "opacity-60" : "hover:border-primary/30"}`}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <button onClick={() => toggle(item.id)} className="mt-0.5 shrink-0">{item.checkedOut ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}</button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${item.checkedOut ? "line-through text-muted-foreground" : ""}`}>{item.name}</span>
                        {item.quantity > 1 && <span className="text-xs text-muted-foreground">×{item.quantity}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${OWNERSHIP_COLORS[item.ownership]}`}>{item.ownership}</span>
                        <span className={`text-[10px] capitalize ${STATUS_COLORS[item.status]}`}>{item.checkedOut ? "checked out" : item.status}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {item.vendor && <span>{item.vendor}</span>}
                        {item.dailyRate && <span>{item.dailyRate}</span>}
                        {item.notes && <span className="truncate max-w-[200px]">{item.notes}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing({ ...item })}><Edit2 className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => del(item.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
          </div>
  );
}
