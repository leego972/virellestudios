import { useState } from "react";
  import { useLocation } from "wouter";
  import { FileText, Download, Copy, ChevronRight, Shield, Users, MapPin, Briefcase, Music, Film, Handshake, Loader2 } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Badge } from "@/components/ui/badge";
  import { toast } from "sonner";

  interface DocTemplate {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    category: string;
    fields: Array<{ key: string; label: string; placeholder: string; type?: "text" | "textarea" | "date" }>;
    template: (data: Record<string, string>) => string;
  }

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const TEMPLATES: DocTemplate[] = [
    {
      id: "nda",
      title: "Non-Disclosure Agreement (NDA)",
      description: "Protect confidential project details when sharing with cast, crew, and collaborators.",
      icon: <Shield className="h-5 w-5" />,
      category: "Development",
      fields: [
        { key: "disclosingParty", label: "Disclosing Party (Company/Your Name)", placeholder: "Virelle Productions LLC" },
        { key: "receivingParty", label: "Receiving Party", placeholder: "Jane Smith" },
        { key: "projectTitle", label: "Project / Production Title", placeholder: "Untitled Feature Film" },
        { key: "duration", label: "Confidentiality Duration", placeholder: "2 years" },
        { key: "state", label: "Governing State/Country", placeholder: "California, USA" },
      ],
      template: (d) => `NON-DISCLOSURE AGREEMENT

  This Non-Disclosure Agreement ("Agreement") is entered into as of ${today} between ${d.disclosingParty || "[DISCLOSING PARTY]"} ("Disclosing Party") and ${d.receivingParty || "[RECEIVING PARTY]"} ("Receiving Party") in connection with the motion picture project currently titled "${d.projectTitle || "[PROJECT TITLE]"}" (the "Project").

  1. CONFIDENTIAL INFORMATION
  "Confidential Information" means any and all information disclosed by the Disclosing Party relating to the Project, including but not limited to: scripts, treatments, synopses, financial data, cast and crew information, business plans, production schedules, and any creative materials.

  2. OBLIGATIONS
  The Receiving Party agrees to: (a) keep all Confidential Information strictly confidential; (b) not disclose any Confidential Information to third parties without prior written consent; (c) use Confidential Information solely for the purpose of evaluating potential participation in the Project.

  3. EXCLUSIONS
  This Agreement does not apply to information that: (a) is or becomes publicly available through no fault of the Receiving Party; (b) was already known to the Receiving Party; (c) is required to be disclosed by law or court order.

  4. TERM
  This Agreement shall remain in effect for ${d.duration || "[DURATION]"} from the date of signing, or until the Project is released publicly, whichever occurs first.

  5. GOVERNING LAW
  This Agreement shall be governed by the laws of ${d.state || "[STATE/COUNTRY]"}.

  6. REMEDIES
  The Receiving Party acknowledges that breach of this Agreement may cause irreparable harm for which monetary damages would be insufficient, and that the Disclosing Party shall be entitled to seek equitable relief.

  IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

  DISCLOSING PARTY:
  Signature: _________________________
  Name: ${d.disclosingParty || "[NAME]"}
  Date: _____________________________

  RECEIVING PARTY:
  Signature: _________________________
  Name: ${d.receivingParty || "[NAME]"}
  Date: _____________________________
  `,
    },
    {
      id: "location",
      title: "Location Release Form",
      description: "Permission to film on private property with liability and rights provisions.",
      icon: <MapPin className="h-5 w-5 text-amber-400/70" />,
      category: "Production",
      fields: [
        { key: "productionCompany", label: "Production Company", placeholder: "Virelle Productions LLC" },
        { key: "projectTitle", label: "Project Title", placeholder: "Untitled Feature Film" },
        { key: "ownerName", label: "Property Owner / Manager Name", placeholder: "John Doe" },
        { key: "propertyAddress", label: "Property Address", placeholder: "123 Main St, Los Angeles, CA 90001" },
        { key: "shootDates", label: "Scheduled Shoot Date(s)", placeholder: "June 15–16, 2025" },
        { key: "compensation", label: "Compensation (if any)", placeholder: "$500 per day / No compensation" },
      ],
      template: (d) => `LOCATION RELEASE AGREEMENT

  Date: ${today}

  PRODUCTION COMPANY: ${d.productionCompany || "[PRODUCTION COMPANY]"}
  PROJECT TITLE: "${d.projectTitle || "[PROJECT TITLE]"}"
  PROPERTY OWNER: ${d.ownerName || "[OWNER NAME]"}
  PROPERTY ADDRESS: ${d.propertyAddress || "[ADDRESS]"}

  1. GRANT OF PERMISSION
  The Property Owner ("Grantor") hereby grants permission to ${d.productionCompany || "[PRODUCTION COMPANY]"} ("Production") to enter and use the above-described property for the purposes of filming, photography, and recording audio in connection with the production of "${d.projectTitle || "[PROJECT TITLE]"}".

  2. SHOOT DATES
  The filming shall take place on or about ${d.shootDates || "[SHOOT DATES]"}, subject to weather and production requirements.

  3. COMPENSATION
  In consideration for this licence, Production shall pay Grantor: ${d.compensation || "[COMPENSATION]"}.

  4. RIGHTS GRANTED
  Grantor grants Production the right to use all photographs, film footage, and audio recordings made at the property in any and all media, worldwide, in perpetuity.

  5. CONDITION OF PROPERTY
  Production agrees to return the property to its original condition upon completion of filming and to be responsible for any damage caused directly by the Production.

  6. INDEMNIFICATION
  Production shall indemnify and hold harmless Grantor from any claims arising out of Production's use of the property, except those arising from Grantor's own negligence.

  AGREED AND ACCEPTED:

  PRODUCTION COMPANY:
  Signature: _________________________
  Name: ${d.productionCompany || "[NAME]"}
  Date: _____________________________

  PROPERTY OWNER:
  Signature: _________________________
  Name: ${d.ownerName || "[NAME]"}
  Date: _____________________________
  `,
    },
    {
      id: "cast-deal",
      title: "Cast Deal Memo",
      description: "Short-form agreement for actor engagement covering role, fees, and rights.",
      icon: <Users className="h-5 w-5" />,
      category: "Production",
      fields: [
        { key: "productionCompany", label: "Production Company", placeholder: "Virelle Productions LLC" },
        { key: "projectTitle", label: "Project Title", placeholder: "Untitled Feature Film" },
        { key: "actorName", label: "Actor Name", placeholder: "Jane Smith" },
        { key: "roleName", label: "Character / Role", placeholder: "Detective Sarah Cole" },
        { key: "shootDates", label: "Shoot Date(s)", placeholder: "June 10–20, 2025" },
        { key: "compensation", label: "Compensation", placeholder: "$500/day SAG Ultra Low Budget" },
        { key: "creditPosition", label: "Screen Credit", placeholder: 'Starring / "Jane Smith as Detective Sarah Cole"' },
      ],
      template: (d) => `CAST DEAL MEMORANDUM

  Date: ${today}
  Project: "${d.projectTitle || "[PROJECT TITLE]"}"
  Production Company: ${d.productionCompany || "[PRODUCTION COMPANY]"}

  PERFORMER: ${d.actorName || "[ACTOR NAME]"}
  ROLE: ${d.roleName || "[ROLE]"}
  SHOOT DATES: ${d.shootDates || "[DATES]"}
  COMPENSATION: ${d.compensation || "[FEE]"}
  SCREEN CREDIT: ${d.creditPosition || "[CREDIT]"}

  TERMS:
  1. Performer agrees to render exclusive acting services for the Role during the shoot dates listed above.
  2. Performer grants Production all rights to use their performance in all media, worldwide, in perpetuity.
  3. Performer grants Production the right to use their name, likeness, and biography for promotional purposes related to the Project.
  4. This engagement is subject to the terms of a long-form agreement to follow.
  5. Performer warrants they are free to enter into this agreement and have no conflicting commitments.
  6. Any changes to shoot dates shall be mutually agreed in writing.

  AGREED:

  PRODUCTION COMPANY:
  Signature: _________________________
  Name / Title: ${d.productionCompany || "[NAME]"}
  Date: _____________________________

  PERFORMER:
  Signature: _________________________
  Name: ${d.actorName || "[NAME]"}
  Date: _____________________________
  `,
    },
    {
      id: "crew-deal",
      title: "Crew Deal Memo",
      description: "Short-form agreement for crew members covering role, rate, and work-for-hire.",
      icon: <Briefcase className="h-5 w-5" />,
      category: "Production",
      fields: [
        { key: "productionCompany", label: "Production Company", placeholder: "Virelle Productions LLC" },
        { key: "projectTitle", label: "Project Title", placeholder: "Untitled Feature Film" },
        { key: "crewName", label: "Crew Member Name", placeholder: "Alex Johnson" },
        { key: "position", label: "Position / Role", placeholder: "Director of Photography" },
        { key: "startDate", label: "Start Date", placeholder: "June 1, 2025" },
        { key: "rate", label: "Compensation Rate", placeholder: "$800/day" },
        { key: "equipment", label: "Equipment Provided (if any)", placeholder: "Camera package included / None" },
      ],
      template: (d) => `CREW DEAL MEMORANDUM

  Date: ${today}
  Project: "${d.projectTitle || "[PROJECT TITLE]"}"
  Production Company: ${d.productionCompany || "[PRODUCTION COMPANY]"}

  CREW MEMBER: ${d.crewName || "[NAME]"}
  POSITION: ${d.position || "[POSITION]"}
  START DATE: ${d.startDate || "[DATE]"}
  RATE: ${d.rate || "[RATE]"}
  EQUIPMENT: ${d.equipment || "None"}

  WORK-FOR-HIRE:
  All work product, materials, and deliverables created by ${d.crewName || "Crew Member"} in the course of employment on this project are works made for hire under the Copyright Act and are the sole property of ${d.productionCompany || "Production Company"}.

  TERMS:
  1. ${d.crewName || "Crew Member"} will serve as ${d.position || "[POSITION]"} commencing on ${d.startDate || "[DATE]"}.
  2. Compensation shall be ${d.rate || "[RATE]"}, payable per the Production's standard payroll schedule.
  3. ${d.crewName || "Crew Member"} represents they are an independent contractor, responsible for their own taxes unless otherwise agreed.
  4. Either party may terminate this engagement with 48 hours' written notice.
  5. ${d.crewName || "Crew Member"} agrees to maintain confidentiality regarding all aspects of the production.

  AGREED:

  PRODUCTION COMPANY:
  Signature: _________________________
  Name / Title: ${d.productionCompany || "[NAME]"}
  Date: _____________________________

  CREW MEMBER:
  Signature: _________________________
  Name: ${d.crewName || "[NAME]"}
  Date: _____________________________
  `,
    },
    {
      id: "sync",
      title: "Sync Licence Request Template",
      description: "Letter to a music publisher requesting sync rights for a specific track.",
      icon: <Music className="h-5 w-5 text-amber-400/70" />,
      category: "Post-Production",
      fields: [
        { key: "yourName", label: "Your Name / Company", placeholder: "Virelle Productions LLC" },
        { key: "trackTitle", label: "Track Title", placeholder: "Eye of the Tiger" },
        { key: "artist", label: "Artist / Band", placeholder: "Survivor" },
        { key: "publisher", label: "Publisher / Rights Holder", placeholder: "Sony Music Publishing" },
        { key: "projectTitle", label: "Film / Project Title", placeholder: "Untitled Feature Film" },
        { key: "usageDescription", label: "How the track will be used", placeholder: "Background instrumental, 45-second excerpt, training montage scene" },
        { key: "distribution", label: "Distribution / Release Plan", placeholder: "Film festivals, then streaming (Netflix/Amazon)" },
      ],
      template: (d) => `SYNC LICENCE REQUEST

  Date: ${today}
  From: ${d.yourName || "[YOUR NAME/COMPANY]"}
  To: Licensing Department, ${d.publisher || "[PUBLISHER]"}

  RE: Sync Licence Request — "${d.trackTitle || "[TRACK]"}" by ${d.artist || "[ARTIST]"}

  Dear Licensing Team,

  I am writing on behalf of ${d.yourName || "[PRODUCTION]"} to request a synchronisation licence for the following:

  TRACK: "${d.trackTitle || "[TRACK TITLE]"}" by ${d.artist || "[ARTIST]"}
  PRODUCTION: "${d.projectTitle || "[PROJECT TITLE]"}"
  USAGE: ${d.usageDescription || "[USAGE DESCRIPTION]"}
  DISTRIBUTION: ${d.distribution || "[DISTRIBUTION PLAN]"}

  We are an independent production and would be grateful to discuss licence terms that reflect our project's scale. We are prepared to provide full production details, a rough cut of the scene, and any additional information required to evaluate this request.

  Please advise on the appropriate licence fee and any restrictions. We are committed to full compliance with all rights obligations.

  Thank you for your consideration.

  Sincerely,

  ${d.yourName || "[YOUR NAME]"}
  ${d.yourName || "[PRODUCTION COMPANY]"}
  `,
    },
    {
      id: "option",
      title: "Option Agreement (Short Form)",
      description: "Option to acquire rights to source material (book, article, life rights).",
      icon: <Handshake className="h-5 w-5" />,
      category: "Development",
      fields: [
        { key: "optionee", label: "Optionee (Production Company)", placeholder: "Virelle Productions LLC" },
        { key: "optionor", label: "Optionor (Rights Owner)", placeholder: "Author Jane Smith" },
        { key: "material", label: "Source Material Title", placeholder: "The Novel 'Broken Silence'" },
        { key: "optionFee", label: "Option Fee", placeholder: "$1,000 for 12 months" },
        { key: "purchasePrice", label: "Purchase Price (if option exercised)", placeholder: "$50,000 against 2.5% of net profits" },
        { key: "optionPeriod", label: "Option Period", placeholder: "12 months with one 12-month renewal" },
        { key: "state", label: "Governing State/Country", placeholder: "California, USA" },
      ],
      template: (d) => `SHORT FORM OPTION AGREEMENT

  Date: ${today}
  Optionee: ${d.optionee || "[PRODUCTION COMPANY]"}
  Optionor: ${d.optionor || "[RIGHTS OWNER]"}
  Material: "${d.material || "[SOURCE MATERIAL]"}"

  1. GRANT OF OPTION
  ${d.optionor || "Optionor"} hereby grants ${d.optionee || "Optionee"} an exclusive option to acquire all motion picture, television, and ancillary rights in and to "${d.material || "[MATERIAL]"}" (the "Material").

  2. OPTION FEE
  In consideration for this option, Optionee shall pay Optionor: ${d.optionFee || "[OPTION FEE]"}.

  3. OPTION PERIOD
  This option shall be exercisable during the period commencing on the date hereof and expiring ${d.optionPeriod || "[OPTION PERIOD]"}.

  4. PURCHASE PRICE
  If Optionee elects to exercise this option, Optionee shall pay Optionor: ${d.purchasePrice || "[PURCHASE PRICE]"}.

  5. RIGHTS GRANTED
  Upon exercise, Optionor grants Optionee all rights to develop, produce, exhibit, and exploit the Material in all media, worldwide, in perpetuity.

  6. CREDIT
  ${d.optionor || "Optionor"} shall receive "Based on the [work type] by ${d.optionor || "[NAME]"}" credit in all prints and paid advertising.

  7. GOVERNING LAW
  This Agreement is governed by the laws of ${d.state || "[STATE]"}.

  AGREED:
  ${d.optionee || "[OPTIONEE]"}: _________________________ Date: __________
  ${d.optionor || "[OPTIONOR]"}: _________________________ Date: __________
  `,
    },
  ];

  export default function LegalDocs() {
    const [, setLocation] = useLocation();
    const [selected, setSelected] = useState<DocTemplate | null>(null);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [preview, setPreview] = useState(false);
    const [generating, setGenerating] = useState(false);

    const handleSelect = (t: DocTemplate) => {
      setSelected(t);
      setFormData({});
      setPreview(false);
    };

    const handleGenerate = async () => {
      setGenerating(true);
      await new Promise(r => setTimeout(r, 800));
      setGenerating(false);
      setPreview(true);
    };

    const handleCopy = () => {
      if (!selected) return;
      navigator.clipboard?.writeText(selected.template(formData));
      toast.success("Document copied to clipboard");
    };

    const handleDownload = () => {
      if (!selected) return;
      const text = selected.template(formData);
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected.id}-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Document downloaded");
    };

    const categories = Array.from(new Set(TEMPLATES.map(t => t.category)));

    return (
      <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div className="max-w-5xl mx-auto space-y-6 py-6 px-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 gradient-text-gold"><FileText className="h-6 w-6 text-primary" /> Legal Document Generator</h1>
          <p className="text-sm text-muted-foreground mt-1">Production-ready legal templates. Fill in the fields, then copy or download. Always have a qualified attorney review before signing.</p>
        </div>

        {!selected ? (
          <div className="space-y-6">
            {categories.map(cat => (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 gradient-text-gold">{cat}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TEMPLATES.filter(t => t.category === cat).map(t => (
                    <Card key={t.id} className="cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => handleSelect(t)}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">{t.icon}</div>
                          <span className="font-medium text-sm">{t.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setPreview(false); }}><ChevronRight className="h-4 w-4 rotate-180 mr-1" />Back to templates</Button>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2 gradient-text-gold">{selected.icon}{selected.title}</CardTitle><CardDescription>{selected.description}</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    {selected.fields.map(f => (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs">{f.label}</Label>
                        {f.type === "textarea" ? (
                          <Textarea placeholder={f.placeholder} value={formData[f.key] ?? ""} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))} className="text-sm h-20" />
                        ) : (
                          <Input placeholder={f.placeholder} value={formData[f.key] ?? ""} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))} className="text-sm" />
                        )}
                      </div>
                    ))}
                    <Button className="w-full" onClick={handleGenerate} disabled={generating}>
                      {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : "Generate Document"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
              {preview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Preview</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopy}><Copy className="h-3.5 w-3.5 mr-1" />Copy</Button>
                      <Button size="sm" onClick={handleDownload}><Download className="h-3.5 w-3.5 mr-1" />Download</Button>
                    </div>
                  </div>
                  <Card><CardContent className="p-4"><pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90 max-h-[60vh] overflow-y-auto">{selected.template(formData)}</pre></CardContent></Card>
                  <p className="text-[10px] text-muted-foreground">⚠️ This template is provided for general informational purposes only and does not constitute legal advice. Have a licensed attorney review all documents before execution.</p>
                </div>
              )}
            </div>
          </div>
        )}
          </div>
  );
}
