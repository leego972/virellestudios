import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRoute, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  Clapperboard, MapPin, Car, CloudSun, Sparkles, Plus, Trash2,
  ArrowLeft, Loader2, Globe, Camera, Palette, Film, Wand2,
  ChevronDown, ChevronUp, Zap, CalendarDays, Sun, Eye, Star, Save,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Constants = {
  eras: string[]; countries: string[]; cameras: string[]; lenses: string[];
  aspectRatios: string[]; frameRates: string[]; shootingFormats: string[];
  colorGradeStyles: string[]; movementStyles: string[]; lightingStyles: string[];
  soundDesignDirections: string[]; musicGenres: string[]; architecturalStyles: string[];
  vehicleRoles: string[]; vehicleConditions: string[];
  timeOfDayOptions: string[]; weatherOptions: string[];
};

const SEASONS = ["spring", "summer", "autumn", "winter"];
const VISIBILITY_OPTIONS = ["crystal-clear", "normal", "reduced", "low", "near-zero"];
const WIND_OPTIONS = ["still", "gentle-breeze", "moderate-wind", "strong-wind", "gale"];
const PERMIT_STATUSES = ["not_required", "pending", "obtained", "denied"];
const SOCIAL_CLASSES = [
  "destitute", "working class", "lower-middle class", "middle class",
  "upper-middle class", "upper class", "aristocracy", "corporate elite",
  "criminal underworld", "bohemian/artist", "military",
];
const GENRES = [
  "thriller", "crime noir", "horror", "action", "drama", "romance", "comedy",
  "sci-fi", "fantasy", "war", "western", "period drama", "documentary-style",
  "surrealist", "coming-of-age", "psychological", "political", "biographical",
];
const LIGHTING_INTENTS = [
  "low-key moody", "high-key energetic", "naturalistic", "dramatic chiaroscuro",
  "soft and intimate", "harsh and confrontational", "dreamlike and ethereal",
  "oppressive and claustrophobic", "open and liberating", "clinical and cold",
  "warm and nostalgic", "tense and unsettling",
];
const VEHICLE_TYPES = [
  "sedan", "coupe", "convertible", "estate/wagon", "SUV", "pickup truck", "van",
  "minibus", "bus", "lorry/truck", "motorcycle", "bicycle", "rickshaw",
  "horse-drawn carriage", "tram", "boat", "speedboat", "yacht", "submarine",
  "helicopter", "small aircraft", "jet", "spaceship", "tank", "armoured vehicle", "custom",
];
const GROUPED_LOCATION_TYPES = [
  { group: "Residential", items: ["apartment-building-exterior", "apartment-interior", "apartment-lobby", "apartment-corridor", "house-single-storey", "house-double-storey", "house-interior-lounge", "house-interior-kitchen", "house-interior-bedroom", "house-interior-bathroom", "house-backyard", "penthouse-interior", "penthouse-terrace", "townhouse", "villa-exterior", "villa-interior", "mansion-exterior", "mansion-interior", "loft-apartment", "studio-apartment", "basement-apartment", "gated-community", "housing-estate"] },
  { group: "Hospitality", items: ["hotel-exterior", "hotel-lobby", "hotel-room", "hotel-suite", "hotel-corridor", "hotel-rooftop-bar", "hotel-restaurant", "hotel-conference-room", "boutique-hotel-interior", "resort-exterior", "resort-pool", "motel", "airbnb-property"] },
  { group: "Commercial / Business", items: ["office-building-exterior", "office-interior-open-plan", "office-interior-private", "office-lobby", "office-conference-room", "coworking-space", "retail-store", "shopping-mall-interior", "shopping-mall-exterior", "bank-interior", "bank-exterior", "law-firm", "medical-clinic", "pharmacy"] },
  { group: "Dining & Nightlife", items: ["restaurant-fine-dining", "restaurant-casual", "restaurant-exterior", "cafe", "bar", "nightclub", "rooftop-bar"] },
  { group: "Urban Exterior", items: ["city-street", "alley", "rooftop-urban", "carpark-multi-level", "carpark-basement", "carpark-surface", "bridge", "tunnel", "underpass", "urban-plaza", "bus-stop", "sidewalk"] },
  { group: "Transport", items: ["airport-terminal-interior", "airport-exterior", "train-station-interior", "train-station-exterior", "subway-station", "subway-train-interior", "highway", "dockyard-marina", "helipad"] },
  { group: "Natural / Landscape", items: ["forest", "beach", "desert", "mountain", "countryside", "lake", "river", "cliff", "field", "swamp"] },
  { group: "Rural / Farm", items: ["farmhouse-exterior", "farmhouse-interior", "barn", "silo"] },
  { group: "Industrial", items: ["warehouse", "factory-floor", "shipping-container-yard", "power-station", "construction-site", "abandoned-building"] },
  { group: "Institutional", items: ["school-exterior", "school-classroom", "school-corridor", "university-campus", "hospital-exterior", "hospital-interior", "police-station", "courthouse", "government-building", "church-exterior", "church-interior", "cemetery"] },
  { group: "Entertainment", items: ["stadium-exterior", "stadium-interior", "cinema-interior", "theatre-stage", "gym-fitness", "swimming-pool-indoor", "swimming-pool-outdoor", "casino-floor", "art-gallery", "museum"] },
  { group: "Custom", items: ["custom"] },
];

// ─── Reusable micro-components ────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm" variant="ghost" className="h-7 px-2 text-xs"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </Button>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function ResultBlock({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
  if (!value) return null;
  return (
    <div className="rounded-md bg-muted/40 p-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {copyable && <CopyButton text={value} />}
      </div>
      <p className="text-sm leading-relaxed">{value}</p>
    </div>
  );
}

function SelectField({ value, onValueChange, placeholder, options }: {
  value: string; onValueChange: (v: string) => void; placeholder: string; options: string[];
}) {
  return (
    <Select value={value || ""} onValueChange={onValueChange}>
      <SelectTrigger className="text-sm"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map(o => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ─── TAB 1: Director's Vision ─────────────────────────────────────────────────
function VisionTab({ projectId, constants }: { projectId: number; constants: Constants | null }) {
  const utils = trpc.useUtils();
  const { data: vision, isLoading } = trpc.productionAssets.vision.get.useQuery(
    { projectId }, { enabled: !!projectId }
  );

  const [era, setEra] = useState("");
  const [country, setCountry] = useState("");
  const [setting, setSetting] = useState("");
  const [camera, setCamera] = useState("");
  const [lenses, setLenses] = useState("");
  const [aspectRatio, setAspectRatio] = useState("");
  const [frameRate, setFrameRate] = useState("");
  const [format, setFormat] = useState("");
  const [grade, setGrade] = useState("");
  const [refFilms, setRefFilms] = useState("");
  const [palette, setPalette] = useState("");
  const [lut, setLut] = useState("");
  const [movement, setMovement] = useState("");
  const [coverage, setCoverage] = useState("");
  const [lighting, setLighting] = useState("");
  const [sound, setSound] = useState("");
  const [music, setMusic] = useState("");
  const [dnaResult, setDnaResult] = useState<{ visualDnaPrompt: string; summary: string; eraSignature: string } | null>(null);

  useEffect(() => {
    if (!vision) return;
    const v = vision as any;
    setEra(v.productionEra || ""); setCountry(v.productionCountry || ""); setSetting(v.productionSetting || "");
    setCamera(v.cameraSystem || ""); setLenses(v.lensSet || ""); setAspectRatio(v.aspectRatio || "");
    setFrameRate(v.frameRate || ""); setFormat(v.shootingFormat || ""); setGrade(v.colorGradeStyle || "");
    setRefFilms(Array.isArray(v.referenceFilms) ? v.referenceFilms.join(", ") : "");
    setPalette(Array.isArray(v.colorPalette) ? v.colorPalette.join(", ") : "");
    setLut(v.lutName || ""); setMovement(v.movementStyle || ""); setCoverage(v.coverageNotes || "");
    setLighting(v.lightingStyle || ""); setSound(v.soundDesignDirection || ""); setMusic(v.musicGenre || "");
    if (v.visualDnaPrompt) {
      setDnaResult({ visualDnaPrompt: v.visualDnaPrompt, summary: "", eraSignature: "" });
    }
  }, [vision]);

  const setMutation = trpc.productionAssets.vision.set.useMutation({
    onSuccess: () => {
      utils.productionAssets.vision.get.invalidate({ projectId });
      toast.success("Director's Vision saved");
    },
    onError: e => toast.error(e.message),
  });

  const dnaMutation = trpc.productionAssets.vision.generateDNA.useMutation({
    onSuccess: data => {
      setDnaResult(data);
      utils.productionAssets.vision.get.invalidate({ projectId });
      toast.success("Visual DNA generated");
    },
    onError: e => toast.error(e.message),
  });

  function handleSave() {
    setMutation.mutate({
      projectId,
      productionEra: era || undefined,
      productionCountry: country || undefined,
      productionSetting: setting || undefined,
      cameraSystem: camera || undefined,
      lensSet: lenses || undefined,
      aspectRatio: aspectRatio || undefined,
      frameRate: frameRate || undefined,
      shootingFormat: format || undefined,
      colorGradeStyle: grade || undefined,
      referenceFilms: refFilms ? refFilms.split(",").map(s => s.trim()).filter(Boolean) : undefined,
      colorPalette: palette ? palette.split(",").map(s => s.trim()).filter(Boolean) : undefined,
      lutName: lut || undefined,
      movementStyle: movement || undefined,
      coverageNotes: coverage || undefined,
      lightingStyle: lighting || undefined,
      soundDesignDirection: sound || undefined,
      musicGenre: music || undefined,
    });
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Production World */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-500" />Production World
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Era / Time Period">
            <SelectField value={era} onValueChange={setEra} placeholder="Select era..." options={constants?.eras || []} />
          </FieldGroup>
          <FieldGroup label="Country / Region">
            <SelectField value={country} onValueChange={setCountry} placeholder="Select country..." options={constants?.countries || []} />
          </FieldGroup>
          <div className="sm:col-span-2">
            <FieldGroup label="Production World Description">
              <Textarea
                value={setting} onChange={e => setSetting(e.target.value)} rows={2}
                className="text-sm resize-none"
                placeholder='e.g. "1940s occupied Paris — mostly exterior streets, Haussmann apartment interiors, wartime offices"'
              />
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      {/* Camera Package */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-500" />Camera Package
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Camera System">
            <SelectField value={camera} onValueChange={setCamera} placeholder="Select camera..." options={constants?.cameras || []} />
          </FieldGroup>
          <FieldGroup label="Lens Set">
            <SelectField value={lenses} onValueChange={setLenses} placeholder="Select lenses..." options={constants?.lenses || []} />
          </FieldGroup>
          <FieldGroup label="Aspect Ratio">
            <SelectField value={aspectRatio} onValueChange={setAspectRatio} placeholder="Select ratio..." options={constants?.aspectRatios || []} />
          </FieldGroup>
          <FieldGroup label="Frame Rate">
            <SelectField value={frameRate} onValueChange={setFrameRate} placeholder="Select frame rate..." options={constants?.frameRates || []} />
          </FieldGroup>
          <div className="sm:col-span-2">
            <FieldGroup label="Shooting Format">
              <SelectField value={format} onValueChange={setFormat} placeholder="Select format..." options={constants?.shootingFormats || []} />
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      {/* Colour & Look */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-purple-500" />Colour & Look
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FieldGroup label="Colour Grade Style">
              <SelectField value={grade} onValueChange={setGrade} placeholder="Select grade style..." options={constants?.colorGradeStyles || []} />
            </FieldGroup>
          </div>
          <FieldGroup label="Reference Films (comma-separated)">
            <Input value={refFilms} onChange={e => setRefFilms(e.target.value)} placeholder="Blade Runner 2049, Se7en, Mad Max: Fury Road" className="text-sm" />
          </FieldGroup>
          <FieldGroup label="Colour Palette (comma-separated)">
            <Input value={palette} onChange={e => setPalette(e.target.value)} placeholder="deep teal, amber, charcoal" className="text-sm" />
          </FieldGroup>
          <FieldGroup label="LUT Reference">
            <Input value={lut} onChange={e => setLut(e.target.value)} placeholder="LUT name or brand" className="text-sm" />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Camera Movement & Lighting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Film className="h-4 w-4 text-green-500" />Camera Movement & Lighting
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Camera Movement Style">
            <SelectField value={movement} onValueChange={setMovement} placeholder="Select movement..." options={constants?.movementStyles || []} />
          </FieldGroup>
          <FieldGroup label="Lighting Style">
            <SelectField value={lighting} onValueChange={setLighting} placeholder="Select lighting..." options={constants?.lightingStyles || []} />
          </FieldGroup>
          <div className="sm:col-span-2">
            <FieldGroup label="Coverage Philosophy / Notes">
              <Textarea
                value={coverage} onChange={e => setCoverage(e.target.value)} rows={2}
                className="text-sm resize-none"
                placeholder="e.g. Master shot first. No reverse angles for protagonist POV scenes."
              />
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      {/* Sound & Music */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />Sound Design & Music
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Sound Design Direction">
            <SelectField value={sound} onValueChange={setSound} placeholder="Select direction..." options={constants?.soundDesignDirections || []} />
          </FieldGroup>
          <FieldGroup label="Music Genre / Direction">
            <SelectField value={music} onValueChange={setMusic} placeholder="Select genre..." options={constants?.musicGenres || []} />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={setMutation.isPending} className="gap-2">
          {setMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Vision
        </Button>
        <Button variant="outline" onClick={() => dnaMutation.mutate({ projectId })} disabled={dnaMutation.isPending} className="gap-2">
          {dnaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Visual DNA
        </Button>
      </div>

      {/* DNA Result */}
      {dnaResult?.visualDnaPrompt && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />Visual DNA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dnaResult.eraSignature && <ResultBlock label="Era Signature" value={dnaResult.eraSignature} />}
            {dnaResult.summary && <ResultBlock label="Production Identity" value={dnaResult.summary} />}
            <ResultBlock label="Visual DNA Prompt" value={dnaResult.visualDnaPrompt} copyable />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── TAB 2: Location Scout ─────────────────────────────────────────────────────
function LocationScoutTab({ projectId, constants }: { projectId: number; constants: Constants | null }) {
  const utils = trpc.useUtils();
  const { data: locationList = [], isLoading } = trpc.productionAssets.locationScout.list.useQuery(
    { projectId }, { enabled: !!projectId }
  );
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [enrichResults, setEnrichResults] = useState<Record<number, any>>({});

  const [name, setName] = useState(""); const [address, setAddress] = useState("");
  const [locType, setLocType] = useState(""); const [desc, setDesc] = useState("");
  const [archStyle, setArchStyle] = useState(""); const [socialClass, setSocialClass] = useState("");
  const [eraOverride, setEraOverride] = useState(""); const [countryOverride, setCountryOverride] = useState("");
  const [bestTime, setBestTime] = useState(""); const [weatherPrefs, setWeatherPrefs] = useState("");
  const [permitStatus, setPermitStatus] = useState(""); const [powerAccess, setPowerAccess] = useState(false);
  const [crewCap, setCrewCap] = useState(""); const [seasonNotes, setSeasonNotes] = useState("");
  const [constraints, setConstraints] = useState(""); const [locNotes, setLocNotes] = useState("");

  function resetForm() {
    setName(""); setAddress(""); setLocType(""); setDesc(""); setArchStyle(""); setSocialClass("");
    setEraOverride(""); setCountryOverride(""); setBestTime(""); setWeatherPrefs("");
    setPermitStatus(""); setPowerAccess(false); setCrewCap(""); setSeasonNotes(""); setConstraints(""); setLocNotes("");
  }

  const createMutation = trpc.productionAssets.locationScout.create.useMutation({
    onSuccess: () => {
      utils.productionAssets.locationScout.list.invalidate({ projectId });
      setShowAdd(false); resetForm(); toast.success("Location added");
    },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.productionAssets.locationScout.delete.useMutation({
    onSuccess: () => {
      utils.productionAssets.locationScout.list.invalidate({ projectId });
      toast.success("Location removed");
    },
    onError: e => toast.error(e.message),
  });
  const enrichMutation = trpc.productionAssets.locationScout.enrich.useMutation({
    onSuccess: (data, variables) => {
      setEnrichResults(prev => ({ ...prev, [variables.locationId]: data }));
      setExpandedId(variables.locationId);
      toast.success("Location enriched with AI analysis");
    },
    onError: e => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{locationList.length} location{locationList.length !== 1 ? "s" : ""} registered</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Add Location</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Register Filming Location</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="col-span-2">
                <FieldGroup label="Location Name *">
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Abandoned Textile Mill, East Wing" />
                </FieldGroup>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Address / Area">
                  <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, suburb, city" />
                </FieldGroup>
                <FieldGroup label="Social / Economic Class">
                  <Select value={socialClass} onValueChange={setSocialClass}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select class..." /></SelectTrigger>
                    <SelectContent>{SOCIAL_CLASSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              <FieldGroup label="Location Type">
                <Select value={locType} onValueChange={setLocType}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {GROUPED_LOCATION_TYPES.map(group => (
                      <SelectGroup key={group.group}>
                        <SelectLabel className="text-xs">{group.group}</SelectLabel>
                        {group.items.map(item => (
                          <SelectItem key={item} value={item} className="text-sm">
                            {item.replace(/-/g, " ")}
                          </SelectItem>
                        ))}
                        <SelectSeparator />
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Architectural Style">
                  <SelectField value={archStyle} onValueChange={setArchStyle} placeholder="Select style..." options={constants?.architecturalStyles || []} />
                </FieldGroup>
                <FieldGroup label="Best Time of Day">
                  <SelectField value={bestTime} onValueChange={setBestTime} placeholder="Select time..." options={constants?.timeOfDayOptions || []} />
                </FieldGroup>
                <FieldGroup label="Era Override (if flashback)">
                  <SelectField value={eraOverride} onValueChange={setEraOverride} placeholder="Override era..." options={constants?.eras || []} />
                </FieldGroup>
                <FieldGroup label="Country Override">
                  <SelectField value={countryOverride} onValueChange={setCountryOverride} placeholder="Override country..." options={constants?.countries || []} />
                </FieldGroup>
              </div>

              <FieldGroup label="Description / Director's Notes">
                <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What happens here? What mood? Any specific visual requirements?" rows={2} className="text-sm resize-none" />
              </FieldGroup>

              <FieldGroup label="Weather Preferences (comma-separated)">
                <Input value={weatherPrefs} onChange={e => setWeatherPrefs(e.target.value)} placeholder="overcast, light-rain, heavy-fog" className="text-sm" />
              </FieldGroup>

              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Permit Status">
                  <Select value={permitStatus} onValueChange={setPermitStatus}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Status..." /></SelectTrigger>
                    <SelectContent>{PERMIT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label="Crew Capacity">
                  <Input value={crewCap} onChange={e => setCrewCap(e.target.value)} placeholder="Up to 40 crew" className="text-sm" />
                </FieldGroup>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="powerAccess" checked={powerAccess} onChange={e => setPowerAccess(e.target.checked)} className="rounded" />
                <Label htmlFor="powerAccess" className="text-sm">Power access for lighting rigs</Label>
              </div>

              <FieldGroup label="Seasonal Notes">
                <Input value={seasonNotes} onChange={e => setSeasonNotes(e.target.value)} placeholder="Best in autumn — leaf colour; avoid summer tourist crowds" className="text-sm" />
              </FieldGroup>
              <FieldGroup label="Shooting Constraints">
                <Input value={constraints} onChange={e => setConstraints(e.target.value)} placeholder="No filming after 10pm; noise limit applies" className="text-sm" />
              </FieldGroup>
              <FieldGroup label="Additional Notes">
                <Textarea value={locNotes} onChange={e => setLocNotes(e.target.value)} rows={2} className="text-sm resize-none" placeholder="Logistics, access, contacts..." />
              </FieldGroup>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({
                  projectId, name,
                  address: address || undefined,
                  locationType: locType || undefined,
                  description: desc || undefined,
                  architecturalStyle: archStyle || undefined,
                  socialClass: socialClass || undefined,
                  eraOverride: eraOverride || undefined,
                  countryOverride: countryOverride || undefined,
                  bestTimeOfDay: bestTime || undefined,
                  weatherPreferences: weatherPrefs ? weatherPrefs.split(",").map(s => s.trim()).filter(Boolean) : undefined,
                  permitStatus: (permitStatus as any) || undefined,
                  powerAccess,
                  crewCapacity: crewCap || undefined,
                  seasonalNotes: seasonNotes || undefined,
                  shootingConstraints: constraints || undefined,
                  notes: locNotes || undefined,
                })}
                disabled={!name || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {locationList.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-muted p-10 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No locations yet. Add your first filming location to begin building your location library.</p>
        </div>
      )}

      <div className="space-y-3">
        {locationList.map((loc: any) => {
          const isExpanded = expandedId === loc.id;
          const enriched = enrichResults[loc.id];
          return (
            <Card key={loc.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{loc.name}</h3>
                      {loc.locationType && (
                        <Badge variant="secondary" className="text-xs">
                          {loc.locationType.replace(/-/g, " ")}
                        </Badge>
                      )}
                      {loc.permitStatus && loc.permitStatus !== "not_required" && (
                        <Badge variant={loc.permitStatus === "obtained" ? "default" : "outline"} className="text-xs">
                          {loc.permitStatus}
                        </Badge>
                      )}
                      {loc.aiVisualPrompt && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">AI Enriched</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      {loc.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{loc.address}</span>}
                      {loc.bestTimeOfDay && <span className="flex items-center gap-1"><Sun className="h-3 w-3" />{loc.bestTimeOfDay.replace(/-/g, " ")}</span>}
                      {loc.eraOverride && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />Era: {loc.eraOverride}</span>}
                      {loc.powerAccess && <span className="flex items-center gap-1 text-green-600"><Zap className="h-3 w-3" />Power</span>}
                    </div>
                    {loc.description && <p className="text-xs text-muted-foreground line-clamp-1">{loc.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm" variant="outline" className="h-8 gap-1 text-xs"
                      onClick={() => enrichMutation.mutate({ locationId: loc.id })}
                      disabled={enrichMutation.isPending && enrichMutation.variables?.locationId === loc.id}
                    >
                      {enrichMutation.isPending && enrichMutation.variables?.locationId === loc.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Sparkles className="h-3 w-3" />}
                      Enrich
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setExpandedId(isExpanded ? null : loc.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: loc.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-muted/20 p-4 space-y-3">
                  {enriched ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">AI Cinematographic Analysis</span>
                      </div>
                      <ResultBlock label="Architectural Character" value={enriched.architecturalCharacter} />
                      <ResultBlock label="Visual Description" value={enriched.visualDescription} />
                      <ResultBlock label="Unique Fingerprint" value={enriched.uniqueFingerprint} />
                      <ResultBlock label="Lighting Analysis" value={enriched.lightingAnalysis} />
                      <ResultBlock label="Time of Day Guide" value={enriched.timeOfDayGuide} />
                      <ResultBlock label="Weather Impact" value={enriched.weatherImpact} />
                      <ResultBlock label="Best Camera Angles" value={enriched.bestAngles} />
                      <ResultBlock label="Costume Context" value={enriched.costumeContext} />
                      <ResultBlock label="AI Generation Prompt" value={enriched.aiPromptSuffix} copyable />
                    </div>
                  ) : loc.aiVisualPrompt ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Previously enriched. Click Enrich to refresh.</p>
                      <ResultBlock label="Saved AI Prompt" value={loc.aiVisualPrompt} copyable />
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Sparkles className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Click Enrich to generate a full cinematographic analysis including lighting, architecture, costume context, and AI generation prompt.</p>
                    </div>
                  )}
                  {(loc.seasonalNotes || loc.shootingConstraints || loc.crewCapacity) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t">
                      {loc.seasonalNotes && <div className="text-xs"><span className="text-muted-foreground">Season: </span>{loc.seasonalNotes}</div>}
                      {loc.shootingConstraints && <div className="text-xs"><span className="text-muted-foreground">Constraints: </span>{loc.shootingConstraints}</div>}
                      {loc.crewCapacity && <div className="text-xs"><span className="text-muted-foreground">Crew: </span>{loc.crewCapacity}</div>}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB 3: Vehicle Registry ──────────────────────────────────────────────────
function VehicleRegistryTab({ projectId, constants }: { projectId: number; constants: Constants | null }) {
  const utils = trpc.useUtils();
  const { data: vehicles = [], isLoading } = trpc.productionAssets.vehicleRegistry.list.useQuery(
    { projectId }, { enabled: !!projectId }
  );
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [promptResults, setPromptResults] = useState<Record<number, any>>({});

  const [vName, setVName] = useState(""); const [vMake, setVMake] = useState("");
  const [vModel, setVModel] = useState(""); const [vYear, setVYear] = useState("");
  const [vColor, setVColor] = useState(""); const [vCondition, setVCondition] = useState("");
  const [vRole, setVRole] = useState(""); const [vType, setVType] = useState("");
  const [vPeriod, setVPeriod] = useState(""); const [vFeatures, setVFeatures] = useState("");
  const [vNotes, setVNotes] = useState("");

  function resetVehicleForm() {
    setVName(""); setVMake(""); setVModel(""); setVYear(""); setVColor("");
    setVCondition(""); setVRole(""); setVType(""); setVPeriod(""); setVFeatures(""); setVNotes("");
  }

  const createMutation = trpc.productionAssets.vehicleRegistry.create.useMutation({
    onSuccess: () => {
      utils.productionAssets.vehicleRegistry.list.invalidate({ projectId });
      setShowAdd(false); resetVehicleForm(); toast.success("Vehicle registered");
    },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.productionAssets.vehicleRegistry.delete.useMutation({
    onSuccess: () => {
      utils.productionAssets.vehicleRegistry.list.invalidate({ projectId });
      toast.success("Vehicle removed");
    },
    onError: e => toast.error(e.message),
  });
  const promptMutation = trpc.productionAssets.vehicleRegistry.generatePrompt.useMutation({
    onSuccess: (data, variables) => {
      setPromptResults(prev => ({ ...prev, [variables.vehicleId]: data }));
      setExpandedId(variables.vehicleId);
      toast.success("Vehicle AI profile generated");
    },
    onError: e => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} registered</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Register Vehicle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Register Production Vehicle</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <FieldGroup label="Label / Name *">
                <Input value={vName} onChange={e => setVName(e.target.value)} placeholder='e.g. "Hero Car", "Police Cruiser #2"' />
              </FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Make"><Input value={vMake} onChange={e => setVMake(e.target.value)} placeholder="Ford, BMW..." /></FieldGroup>
                <FieldGroup label="Model"><Input value={vModel} onChange={e => setVModel(e.target.value)} placeholder="Mustang, M3..." /></FieldGroup>
                <FieldGroup label="Year"><Input type="number" value={vYear} onChange={e => setVYear(e.target.value)} placeholder="1968" /></FieldGroup>
                <FieldGroup label="Colour / Finish"><Input value={vColor} onChange={e => setVColor(e.target.value)} placeholder="midnight black metallic" /></FieldGroup>
                <FieldGroup label="Production Role">
                  <SelectField value={vRole} onValueChange={setVRole} placeholder="Select role..." options={constants?.vehicleRoles || []} />
                </FieldGroup>
                <FieldGroup label="Condition">
                  <SelectField value={vCondition} onValueChange={setVCondition} placeholder="Select condition..." options={constants?.vehicleConditions || []} />
                </FieldGroup>
                <FieldGroup label="Vehicle Type">
                  <SelectField value={vType} onValueChange={setVType} placeholder="Select type..." options={VEHICLE_TYPES} />
                </FieldGroup>
                <FieldGroup label="Period / Era Context">
                  <Input value={vPeriod} onChange={e => setVPeriod(e.target.value)} placeholder="1970s muscle, near-future" />
                </FieldGroup>
              </div>
              <FieldGroup label="Special Features / Dressings">
                <Input value={vFeatures} onChange={e => setVFeatures(e.target.value)} placeholder="Bullet-hole dressings, cracked windscreen, custom exhaust" />
              </FieldGroup>
              <FieldGroup label="Notes">
                <Textarea value={vNotes} onChange={e => setVNotes(e.target.value)} rows={2} className="text-sm resize-none" placeholder="Scene assignments, stunt notes, availability..." />
              </FieldGroup>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({
                  projectId, name: vName,
                  make: vMake || undefined, model: vModel || undefined,
                  year: vYear ? Number(vYear) : undefined, color: vColor || undefined,
                  condition: vCondition || undefined, vehicleRole: vRole || undefined,
                  vehicleType: vType || undefined, period: vPeriod || undefined,
                  specialFeatures: vFeatures || undefined, notes: vNotes || undefined,
                })}
                disabled={!vName || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Register Vehicle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {vehicles.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-muted p-10 text-center">
          <Car className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No vehicles yet. Register hero cars, background vehicles, and special-purpose rigs.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {vehicles.map((v: any) => {
          const isExpanded = expandedId === v.id;
          const prompted = promptResults[v.id];
          const vehicleLabel = [v.year, v.make, v.model].filter(Boolean).join(" ");
          return (
            <Card key={v.id} className="overflow-hidden">
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{v.name}</h3>
                      {v.vehicleRole && <Badge variant="secondary" className="text-xs">{v.vehicleRole}</Badge>}
                      {v.aiVisualPrompt && <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">AI Profile</Badge>}
                    </div>
                    {vehicleLabel && <p className="text-xs text-muted-foreground">{vehicleLabel}{v.color ? " \u2014 " + v.color : ""}</p>}
                    {v.condition && <p className="text-xs text-muted-foreground capitalize">{v.condition.replace(/-/g, " ")}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: v.id })} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button
                  size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8"
                  onClick={() => promptMutation.mutate({ vehicleId: v.id })}
                  disabled={promptMutation.isPending && promptMutation.variables?.vehicleId === v.id}
                >
                  {promptMutation.isPending && promptMutation.variables?.vehicleId === v.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Sparkles className="h-3 w-3" />}
                  Generate AI Profile
                </Button>
              </div>
              {isExpanded && (
                <div className="border-t bg-muted/20 p-4 space-y-3">
                  {prompted ? (
                    <>
                      <ResultBlock label="Visual Description" value={prompted.visualDescription} />
                      <ResultBlock label="Period Accuracy" value={prompted.periodAccuracy} />
                      <ResultBlock label="Cinematic Notes" value={prompted.cinematicNotes} />
                      <ResultBlock label="Lighting Behaviour" value={prompted.lightingBehavior} />
                      <ResultBlock label="Condition Details" value={prompted.conditionDetails} />
                      <ResultBlock label="AI Generation Prompt" value={prompted.aiPromptSuffix} copyable />
                    </>
                  ) : v.aiVisualPrompt ? (
                    <ResultBlock label="Saved AI Prompt" value={v.aiVisualPrompt} copyable />
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-xs text-muted-foreground">Click Generate AI Profile to create a detailed visual prompt for consistent rendering across all scenes.</p>
                    </div>
                  )}
                  {v.specialFeatures && <ResultBlock label="Special Features" value={v.specialFeatures} />}
                  {v.notes && <ResultBlock label="Notes" value={v.notes} />}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB 4: Atmosphere Generator ──────────────────────────────────────────────
function AtmosphereTab({ projectId, constants }: { projectId: number; constants: Constants | null }) {
  const { data: vision } = trpc.productionAssets.vision.get.useQuery({ projectId }, { enabled: !!projectId });
  const [timeOfDay, setTimeOfDay] = useState("");
  const [weather, setWeather] = useState("");
  const [season, setSeason] = useState("");
  const [visibility, setVisibility] = useState("");
  const [wind, setWind] = useState("");
  const [lightingIntent, setLightingIntent] = useState("");
  const [locationCtx, setLocationCtx] = useState("");
  const [genre, setGenre] = useState("");
  const [sceneDesc, setSceneDesc] = useState("");
  const [injectDna, setInjectDna] = useState(true);
  const [result, setResult] = useState<any>(null);

  const v = vision as any;

  const generateMutation = trpc.productionAssets.atmosphere.generate.useMutation({
    onSuccess: data => { setResult(data); toast.success("Atmosphere generated"); },
    onError: e => toast.error(e.message),
  });

  function handleGenerate() {
    if (!timeOfDay || !weather || !season) { toast.error("Select time of day, weather, and season"); return; }
    generateMutation.mutate({
      timeOfDay, weather, season: season as any,
      visibility: (visibility as any) || undefined,
      windCondition: (wind as any) || undefined,
      lightingIntent: lightingIntent || undefined,
      locationContext: locationCtx || undefined,
      genre: genre || undefined,
      sceneDescription: sceneDesc || undefined,
      visualDna: injectDna ? (v?.visualDnaPrompt || undefined) : undefined,
      era: v?.productionEra || undefined,
      country: v?.productionCountry || undefined,
    });
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-sky-500" />Atmospheric Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <FieldGroup label="Time of Day *">
            <SelectField value={timeOfDay} onValueChange={setTimeOfDay} placeholder="Select time..." options={constants?.timeOfDayOptions || []} />
          </FieldGroup>
          <FieldGroup label="Weather Conditions *">
            <SelectField value={weather} onValueChange={setWeather} placeholder="Select weather..." options={constants?.weatherOptions || []} />
          </FieldGroup>
          <FieldGroup label="Season *">
            <Select value={season} onValueChange={setSeason}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Season..." /></SelectTrigger>
              <SelectContent>
                {SEASONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Visibility">
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Visibility..." /></SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o.replace(/-/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Wind Condition">
            <Select value={wind} onValueChange={setWind}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Wind..." /></SelectTrigger>
              <SelectContent>
                {WIND_OPTIONS.map(o => <SelectItem key={o} value={o}>{o.replace(/-/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Lighting Intent">
            <SelectField value={lightingIntent} onValueChange={setLightingIntent} placeholder="Intent..." options={LIGHTING_INTENTS} />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Film className="h-4 w-4 text-indigo-500" />Scene Context
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Genre / Tone">
            <SelectField value={genre} onValueChange={setGenre} placeholder="Genre..." options={GENRES} />
          </FieldGroup>
          <FieldGroup label="Location Context">
            <Input value={locationCtx} onChange={e => setLocationCtx(e.target.value)} placeholder="apartment-lobby, city-street, forest..." className="text-sm" />
          </FieldGroup>
          <div className="sm:col-span-2">
            <FieldGroup label="Scene Description (optional)">
              <Textarea value={sceneDesc} onChange={e => setSceneDesc(e.target.value)} rows={2} className="text-sm resize-none" placeholder="What happens in this scene? Who is present? What emotion?" />
            </FieldGroup>
          </div>
          {v?.visualDnaPrompt && (
            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="injectDna" checked={injectDna} onChange={e => setInjectDna(e.target.checked)} className="rounded" />
              <Label htmlFor="injectDna" className="text-sm">Inject Director's Visual DNA</Label>
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">DNA Ready</Badge>
            </div>
          )}
          {v?.productionEra && (
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md bg-muted/40 p-2">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                Era context from Vision: <strong>{v.productionEra}</strong>
                {v.productionCountry && <><span className="mx-1">&#xB7;</span><Globe className="h-3.5 w-3.5 shrink-0" /><strong>{v.productionCountry}</strong></>}
                {" \u2014 applied automatically."}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleGenerate}
        disabled={generateMutation.isPending || !timeOfDay || !weather || !season}
        className="gap-2 w-full sm:w-auto"
      >
        {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        Generate Atmosphere
      </Button>

      {result && (
        <Card className="border-sky-500/30 bg-sky-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CloudSun className="h-4 w-4 text-sky-500" />Atmosphere Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ResultBlock label="Atmosphere" value={result.atmosphereDescription} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ResultBlock label="Lighting Conditions" value={result.lightingConditions} />
              <ResultBlock label="Colour Science" value={result.colorScience} />
              <ResultBlock label="Shadow Behaviour" value={result.shadowBehavior} />
              <ResultBlock label="Atmospheric Elements" value={result.atmosphericElements} />
              {result.eraAccurateDetails && <ResultBlock label="Era-Accurate Details" value={result.eraAccurateDetails} />}
              {result.geographicCharacter && <ResultBlock label="Geographic Character" value={result.geographicCharacter} />}
              <ResultBlock label="Mood Impact" value={result.moodImpact} />
              <ResultBlock label="Camera Recommendations" value={result.cameraRecommendations} />
            </div>
            <ResultBlock label="AI Generation Prompt" value={result.aiPromptSuffix} copyable />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PreProductionPanel() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, params] = useRoute("/projects/:id/pre-production");
  const [, navigate] = useLocation();
  const projectId = Number(params?.id);
  const [activeTab, setActiveTab] = useState("vision");

  const { data: constants } = trpc.productionAssets.vision.getConstants.useQuery(undefined, { staleTime: Infinity });
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId && isAuthenticated });

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!isAuthenticated) { window.location.href = getLoginUrl(); return null; }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/projects/" + projectId)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-amber-500 shrink-0" />
              Director's Pre-Production Panel
            </h1>
            {project && <p className="text-xs text-muted-foreground truncate">{(project as any).title}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-auto flex-wrap">
            <TabsTrigger value="vision" className="gap-2 text-xs sm:text-sm">
              <Eye className="h-3.5 w-3.5" />Vision
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2 text-xs sm:text-sm">
              <MapPin className="h-3.5 w-3.5" />Locations
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-2 text-xs sm:text-sm">
              <Car className="h-3.5 w-3.5" />Vehicles
            </TabsTrigger>
            <TabsTrigger value="atmosphere" className="gap-2 text-xs sm:text-sm">
              <CloudSun className="h-3.5 w-3.5" />Atmosphere
            </TabsTrigger>
          </TabsList>
          <TabsContent value="vision">
            <VisionTab projectId={projectId} constants={constants as Constants | null} />
          </TabsContent>
          <TabsContent value="locations">
            <LocationScoutTab projectId={projectId} constants={constants as Constants | null} />
          </TabsContent>
          <TabsContent value="vehicles">
            <VehicleRegistryTab projectId={projectId} constants={constants as Constants | null} />
          </TabsContent>
          <TabsContent value="atmosphere">
            <AtmosphereTab projectId={projectId} constants={constants as Constants | null} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
