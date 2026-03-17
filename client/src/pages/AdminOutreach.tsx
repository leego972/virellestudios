import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Mail, Users, Upload, Send, Trash2, Plus, Search,
  FileText, RefreshCw, CheckCircle2, XCircle, Clock,
  Download, Eye, Loader2, Image as ImageIcon, List,
  BarChart3, AlertTriangle,
} from "lucide-react";

type Contact = {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  role: string | null;
  tags: string | null;
  status: string;
  createdAt: string;
};

type Campaign = {
  id: number;
  name: string;
  subject: string;
  status: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
  sentAt: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: any }> = {
    active:      { label: "Active",      className: "bg-green-500/10 text-green-400 border-green-500/30",   icon: CheckCircle2 },
    unsubscribed:{ label: "Unsub",       className: "bg-muted text-muted-foreground border-border",          icon: XCircle },
    bounced:     { label: "Bounced",     className: "bg-red-500/10 text-red-400 border-red-500/30",          icon: AlertTriangle },
    draft:       { label: "Draft",       className: "bg-muted text-muted-foreground border-border",          icon: Clock },
    sending:     { label: "Sending",     className: "bg-blue-500/10 text-blue-400 border-blue-500/30",       icon: RefreshCw },
    sent:        { label: "Sent",        className: "bg-green-500/10 text-green-400 border-green-500/30",    icon: CheckCircle2 },
    failed:      { label: "Failed",      className: "bg-red-500/10 text-red-400 border-red-500/30",          icon: XCircle },
  };
  const cfg = map[status] ?? map.draft;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}

export default function AdminOutreach() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // ─── Contacts ───────────────────────────────────────────────────────────────
  const [contactSearch, setContactSearch] = useState("");
  const contactsQuery = trpc.mailingList.listContacts.useQuery({ search: contactSearch }, { retry: false });
  const contacts: Contact[] = (contactsQuery.data as any) ?? [];

  const addContactMutation = trpc.mailingList.addContact.useMutation({
    onSuccess: () => { utils.mailingList.listContacts.invalidate(); toast.success("Contact added"); setAddOpen(false); resetAddForm(); },
    onError: (err) => toast.error(err.message || "Failed to add contact"),
  });

  const bulkImportMutation = trpc.mailingList.bulkImport.useMutation({
    onSuccess: (data: any) => {
      utils.mailingList.listContacts.invalidate();
      toast.success(`Imported ${data.imported} contacts${data.skipped > 0 ? `, skipped ${data.skipped} duplicates` : ""}`);
      setBulkOpen(false);
      setBulkText("");
    },
    onError: (err) => toast.error(err.message || "Failed to import contacts"),
  });

  const deleteContactMutation = trpc.mailingList.deleteContact.useMutation({
    onSuccess: () => { utils.mailingList.listContacts.invalidate(); toast.success("Contact removed"); },
    onError: (err) => toast.error(err.message || "Failed to delete contact"),
  });

  // ─── Add contact form ────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addTags, setAddTags] = useState("");
  const resetAddForm = () => { setAddEmail(""); setAddName(""); setAddCompany(""); setAddRole(""); setAddTags(""); };

  // ─── Bulk import ─────────────────────────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const csvInputRef = useRef<HTMLInputElement>(null);

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setBulkText(text);
      setBulkOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleBulkImport() {
    if (!bulkText.trim()) { toast.error("No data to import"); return; }
    bulkImportMutation.mutate({ data: bulkText });
  }

  // ─── Campaigns ───────────────────────────────────────────────────────────────
  const campaignsQuery = trpc.mailingList.listCampaigns.useQuery(undefined, { retry: false });
  const campaigns: Campaign[] = (campaignsQuery.data as any) ?? [];

  const createCampaignMutation = trpc.mailingList.createCampaign.useMutation({
    onSuccess: () => { utils.mailingList.listCampaigns.invalidate(); toast.success("Campaign created"); setCampaignOpen(false); resetCampaignForm(); },
    onError: (err) => toast.error(err.message || "Failed to create campaign"),
  });

  const sendCampaignMutation = trpc.mailingList.sendCampaign.useMutation({
    onSuccess: (data: any) => {
      utils.mailingList.listCampaigns.invalidate();
      toast.success(`Campaign sent to ${data.sent} contacts`);
      setConfirmSendId(null);
    },
    onError: (err) => toast.error(err.message || "Failed to send campaign"),
  });

  // ─── Campaign form ────────────────────────────────────────────────────────────
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignTemplate, setCampaignTemplate] = useState("intro");
  const [campaignAdUrl, setCampaignAdUrl] = useState("");
  const [campaignCustomHtml, setCampaignCustomHtml] = useState("");
  const [campaignAdFile, setCampaignAdFile] = useState<File | null>(null);
  const [campaignAdPreview, setCampaignAdPreview] = useState("");
  const [uploadingAd, setUploadingAd] = useState(false);
  const adInputRef = useRef<HTMLInputElement>(null);
  const resetCampaignForm = () => {
    setCampaignName(""); setCampaignSubject(""); setCampaignTemplate("intro");
    setCampaignAdUrl(""); setCampaignCustomHtml(""); setCampaignAdFile(null); setCampaignAdPreview("");
  };

  const [confirmSendId, setConfirmSendId] = useState<number | null>(null);
  const [previewCampaignId, setPreviewCampaignId] = useState<number | null>(null);

  // ─── Ad upload ────────────────────────────────────────────────────────────────
  const uploadAdMutation = trpc.mailingList.uploadAdImage.useMutation({
    onSuccess: (data: any) => {
      setCampaignAdUrl(data.url);
      setCampaignAdPreview(data.url);
      setUploadingAd(false);
      toast.success("Ad image uploaded");
    },
    onError: (err) => { setUploadingAd(false); toast.error(err.message || "Failed to upload ad"); },
  });

  async function handleAdFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCampaignAdFile(file);
    const preview = URL.createObjectURL(file);
    setCampaignAdPreview(preview);
    setUploadingAd(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadAdMutation.mutate({ base64, filename: file.name, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  const activeContacts = contacts.filter(c => c.status === "active").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-amber-400" />
            Outreach &amp; Email Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your contact list, build campaigns, and push to the full list in one click.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-sm px-3 py-1">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            {activeContacts} active contacts
          </Badge>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Contacts", value: contacts.length, icon: Users, color: "text-indigo-400" },
          { label: "Active", value: activeContacts, icon: CheckCircle2, color: "text-green-400" },
          { label: "Campaigns Sent", value: campaigns.filter(c => c.status === "sent").length, icon: Send, color: "text-amber-400" },
          { label: "Emails Delivered", value: campaigns.reduce((a, c) => a + (c.sentCount || 0), 0), icon: Mail, color: "text-purple-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stat.value.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="contacts">
        <TabsList className="bg-card border border-border/50">
          <TabsTrigger value="contacts" className="flex items-center gap-1.5">
            <List className="h-3.5 w-3.5" /> Contacts
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" /> Campaigns
          </TabsTrigger>
        </TabsList>

        {/* ── CONTACTS TAB ── */}
        <TabsContent value="contacts" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, company, or tag…"
                className="pl-9"
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Contact
              </Button>
              <Button variant="outline" onClick={() => csvInputRef.current?.click()} className="gap-1.5">
                <Upload className="h-4 w-4" /> Import CSV
              </Button>
              <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-1.5">
                <FileText className="h-4 w-4" /> Bulk Paste
              </Button>
              <input ref={csvInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvUpload} />
            </div>
          </div>

          {/* CSV format hint */}
          <p className="text-[11px] text-muted-foreground">
            CSV format: <code className="bg-muted px-1 rounded">email, name, company, role, tags</code> — only email is required. One per line for bulk paste.
          </p>

          {/* Contacts table */}
          <Card className="bg-card/50 border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Company</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Tags</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Added</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {contactsQuery.isLoading ? (
                    <tr><td colSpan={8} className="text-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading contacts…</td></tr>
                  ) : contacts.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No contacts yet. Add one or import a CSV.</td></tr>
                  ) : contacts.map(c => (
                    <tr key={c.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-foreground/80">{c.email}</td>
                      <td className="px-4 py-3 text-foreground/80">{c.name ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground/60">{c.company ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground/60">{c.role ?? "—"}</td>
                      <td className="px-4 py-3">
                        {c.tags ? c.tags.split(",").map(t => (
                          <Badge key={t} variant="outline" className="text-[10px] mr-1 mb-0.5">{t.trim()}</Badge>
                        )) : "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400"
                          onClick={() => deleteContactMutation.mutate({ id: c.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── CAMPAIGNS TAB ── */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Create a campaign, attach an ad image, and push to your full active list in one click.
            </p>
            <Button onClick={() => setCampaignOpen(true)} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-medium">
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </div>

          {/* Campaigns list */}
          <div className="space-y-3">
            {campaignsQuery.isLoading ? (
              <div className="text-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading campaigns…</div>
            ) : campaigns.length === 0 ? (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No campaigns yet. Create one and push to your list.
                </CardContent>
              </Card>
            ) : campaigns.map(camp => (
              <Card key={camp.id} className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground truncate">{camp.name}</p>
                      <StatusBadge status={camp.status} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">Subject: {camp.subject}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Send className="h-3 w-3" /> {camp.sentCount} sent</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {camp.openCount} opens</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {camp.clickCount} clicks</span>
                      <span>{new Date(camp.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {camp.status === "draft" && (
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-black font-medium gap-1.5"
                        onClick={() => setConfirmSendId(camp.id)}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Push to List
                      </Button>
                    )}
                    {camp.status === "sending" && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sending…
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── ADD CONTACT DIALOG ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Add a single contact to your outreach list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="add-email">Email *</Label>
              <Input id="add-email" type="email" placeholder="director@studio.com" value={addEmail} onChange={e => setAddEmail(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-name">Name</Label>
                <Input id="add-name" placeholder="James Cameron" value={addName} onChange={e => setAddName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="add-company">Company / Studio</Label>
                <Input id="add-company" placeholder="Lightstorm Entertainment" value={addCompany} onChange={e => setAddCompany(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-role">Role</Label>
                <Input id="add-role" placeholder="Director, Producer…" value={addRole} onChange={e => setAddRole(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="add-tags">Tags</Label>
                <Input id="add-tags" placeholder="indie, hollywood, vfx" value={addTags} onChange={e => setAddTags(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addContactMutation.mutate({ email: addEmail, name: addName || undefined, company: addCompany || undefined, role: addRole || undefined, tags: addTags || undefined })}
              disabled={!addEmail || addContactMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {addContactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── BULK IMPORT DIALOG ── */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import Contacts</DialogTitle>
            <DialogDescription>
              Paste emails or CSV data below. Format: <code className="bg-muted px-1 rounded text-xs">email, name, company, role, tags</code> — one per line. Only email is required.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={"director@studio.com, James Cameron, Lightstorm, Director, hollywood\nproducer@indie.com"}
            className="h-48 font-mono text-xs"
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
          />
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBulkImport}
              disabled={!bulkText.trim() || bulkImportMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {bulkImportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CREATE CAMPAIGN DIALOG ── */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
            <DialogDescription>
              Build your email campaign. Choose a template, optionally upload an ad image, then save as draft and push to your full list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign Name (internal)</Label>
              <Input placeholder="Founder Outreach — March 2026" value={campaignName} onChange={e => setCampaignName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Email Subject Line</Label>
              <Input placeholder="The Future of Film Production is Here" value={campaignSubject} onChange={e => setCampaignSubject(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Template</Label>
              <Select value={campaignTemplate} onValueChange={setCampaignTemplate}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intro">Hollywood Intro Package (default)</SelectItem>
                  <SelectItem value="custom">Custom HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {campaignTemplate === "custom" && (
              <div>
                <Label>Custom HTML</Label>
                <Textarea
                  placeholder="Paste your full HTML email here…"
                  className="h-32 font-mono text-xs mt-1"
                  value={campaignCustomHtml}
                  onChange={e => setCampaignCustomHtml(e.target.value)}
                />
              </div>
            )}

            {/* Ad image upload */}
            <div>
              <Label>Ad Image (optional)</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                Upload a promotional image or banner to embed in the email. Recommended: 600px wide, JPG or PNG.
              </p>
              <div
                className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
                onClick={() => adInputRef.current?.click()}
              >
                {campaignAdPreview ? (
                  <div className="space-y-2">
                    <img src={campaignAdPreview} alt="Ad preview" className="max-h-32 mx-auto rounded-lg object-contain" />
                    {uploadingAd && <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
                    {!uploadingAd && campaignAdUrl && <p className="text-xs text-green-400 flex items-center justify-center gap-1"><CheckCircle2 className="h-3 w-3" /> Uploaded</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">Click to upload ad image</p>
                    <p className="text-[11px] text-muted-foreground">JPG, PNG, GIF — max 5MB</p>
                  </div>
                )}
              </div>
              <input ref={adInputRef} type="file" accept="image/*" className="hidden" onChange={handleAdFileChange} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCampaignOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createCampaignMutation.mutate({
                name: campaignName,
                subject: campaignSubject,
                template: campaignTemplate,
                adImageUrl: campaignAdUrl || undefined,
                customHtml: campaignTemplate === "custom" ? campaignCustomHtml : undefined,
              })}
              disabled={!campaignName || !campaignSubject || createCampaignMutation.isPending || uploadingAd}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {createCampaignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save as Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRM SEND DIALOG ── */}
      <Dialog open={confirmSendId !== null} onOpenChange={() => setConfirmSendId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-amber-400" />
              Push to Full List
            </DialogTitle>
            <DialogDescription>
              This will send the campaign to all <strong>{activeContacts} active contacts</strong> on your list. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmSendId(null)}>Cancel</Button>
            <Button
              onClick={() => confirmSendId !== null && sendCampaignMutation.mutate({ campaignId: confirmSendId })}
              disabled={sendCampaignMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {sendCampaignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send to {activeContacts} Contacts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
