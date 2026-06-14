import { useState, useEffect, useRef } from "react";
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

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Types ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
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

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Reusable micro-components ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm" variant="ghost" className="h-7 px-2 text-xs"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? "ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Copied" : "Copy"}
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

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ TAB 1: Director's Vision ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
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
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground text-amber-400" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Production World */}
      <Card>
        <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <Globe className="h-4 w-4 text-amber-500" />Production World
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
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
                placeholder='e.g. "1940s occupied Paris ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ mostly exterior streets, Haussmann apartment interiors, wartime offices"'
              />
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      {/* Camera Package */}
      <Card>
        <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <Camera className="h-4 w-4 text-blue-500" />Camera Package
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
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
        <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <Palette className="h-4 w-4 text-purple-500" />Colour & Look
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
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
        <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <Film className="h-4 w-4 text-green-500" />Camera Movement & Lighting
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
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
        <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <Zap className="h-4 w-4 text-orange-500" />Sound Design & Music
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
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
          {setMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Save className="h-4 w-4" />}
          Save Vision
        </Button>
        <Button variant="outline" onClick={() => dnaMutation.mutate({ projectId })} disabled={dnaMutation.isPending} className="gap-2">
          {dnaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Sparkles className="h-4 w-4" />}
          Generate Visual DNA
        </Button>
      </div>

      {/* DNA Result */}
      {dnaResult?.visualDnaPrompt && (
        <Card className="border-amber-500/30 bg-amber-500/5 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <Star className="h-4 w-4 text-amber-500" />Visual DNA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            {dnaResult.eraSignature && <ResultBlock label="Era Signature" value={dnaResult.eraSignature} />}
            {dnaResult.summary && <ResultBlock label="Production Identity" value={dnaResult.summary} />}
            <ResultBlock label="Visual DNA Prompt" value={dnaResult.visualDnaPrompt} copyable />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ TAB 2: Location Scout ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
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

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground text-amber-400" /></div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{locationList.length} location{locationList.length !== 1 ? "s" : ""} registered</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Add Location</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto glass-dark">
            <DialogHeader><DialogTitle className="gradient-text-gold">Register Filming Location</DialogTitle></DialogHeader>
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
                <Input value={seasonNotes} onChange={e => setSeasonNotes(e.target.value)} placeholder="Best in autumn ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ leaf colour; avoid summer tourist crowds" className="text-sm" />
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
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2 text-amber-400" /> : null}
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
            <Card key={loc.id} className="overflow-hidden glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm gradient-text-gold">{loc.name}</h3>
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
                      size="sm" variant="outline" className="h-8 gap-1 text-xs hover:border-amber-500/50 hover:text-amber-400"
                      onClick={() => enrichMutation.mutate({ locationId: loc.id })}
                      disabled={enrichMutation.isPending && enrichMutation.variables?.locationId === loc.id}
                    >
                      {enrichMutation.isPending && enrichMutation.variables?.locationId === loc.id
                        ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
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
                      <Sparkles className="h-5 w-5 text-amber-400/70 mx-auto mb-2" />
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

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ TAB 3: Vehicle Registry ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
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

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground text-amber-400" /></div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} registered</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Register Vehicle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto glass-dark">
            <DialogHeader><DialogTitle className="gradient-text-gold">Register Production Vehicle</DialogTitle></DialogHeader>
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
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2 text-amber-400" /> : null}
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
            <Card key={v.id} className="overflow-hidden glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm gradient-text-gold">{v.name}</h3>
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
                  size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8 hover:border-amber-500/50 hover:text-amber-400"
                  onClick={() => promptMutation.mutate({ vehicleId: v.id })}
                  disabled={promptMutation.isPending && promptMutation.variables?.vehicleId === v.id}
                >
                  {promptMutation.isPending && promptMutation.variables?.vehicleId === v.id
                    ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
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

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ TAB 4: Atmosphere Generator ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
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
        <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CloudSun className="h-4 w-4 text-sky-500" />Atmospheric Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
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
        <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <Film className="h-4 w-4 text-indigo-500" />Scene Context
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
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
        {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Wand2 className="h-4 w-4" />}
        Generate Atmosphere
      </Button>

      {result && (
        <Card className="border-sky-500/30 bg-sky-500/5 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <CloudSun className="h-4 w-4 text-sky-500" />Atmosphere Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
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


// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Wardrobe Upload Tab ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
const WARDROBE_CATEGORIES = [
  { value: "all",         label: "All" },
  { value: "top",         label: "Tops" },
  { value: "bottom",      label: "Bottoms" },
  { value: "dress",       label: "Dresses / Gowns" },
  { value: "outerwear",   label: "Outerwear" },
  { value: "footwear",    label: "Footwear" },
  { value: "headwear",    label: "Headwear" },
  { value: "accessory",   label: "Accessories" },
  { value: "underwear",   label: "Undergarments" },
  { value: "full-outfit", label: "Full Outfits" },
];

const CAT_COLORS: Record<string, string> = {
  top:          "bg-blue-500/15 text-blue-700 border-blue-300",
  bottom:       "bg-green-500/15 text-green-700 border-green-300",
  dress:        "bg-pink-500/15 text-pink-700 border-pink-300",
  outerwear:    "bg-slate-500/15 text-slate-700 border-slate-300",
  footwear:     "bg-amber-500/15 text-amber-700 border-amber-300",
  headwear:     "bg-purple-500/15 text-purple-700 border-purple-300",
  accessory:    "bg-rose-500/15 text-rose-700 border-rose-300",
  underwear:    "bg-orange-500/15 text-orange-700 border-orange-300",
  "full-outfit":"bg-indigo-500/15 text-indigo-700 border-indigo-300",
};

function WardrobeTab({ projectId }: { projectId: number; constants?: any }) {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.productionAssets.wardrobeUpload.list.useQuery(
    { projectId }, { enabled: !!projectId }
  );

  const [filterCat, setFilterCat] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [analysisMap, setAnalysisMap] = useState<Record<number, any>>({});
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [uName, setUName] = useState("");
  const [uCat, setUCat] = useState("");
  const [uColor, setUColor] = useState("");
  const [uColor2, setUColor2] = useState("");
  const [uFabric, setUFabric] = useState("");
  const [uCondition, setUCondition] = useState("");
  const [uBrand, setUBrand] = useState("");
  const [uDesc, setUDesc] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setPreviewUrl(null); setImageBase64(null); setImageMime("image/jpeg");
    setUName(""); setUCat(""); setUColor(""); setUColor2("");
    setUFabric(""); setUCondition(""); setUBrand(""); setUDesc("");
  }

  const uploadMutation = trpc.productionAssets.wardrobeUpload.upload.useMutation({
    onSuccess: () => {
      utils.productionAssets.wardrobeUpload.list.invalidate({ projectId });
      setShowUpload(false); resetForm(); toast.success("Garment added to wardrobe");
    },
    onError: e => toast.error(e.message),
  });

  const charLinkMutation = trpc.productionAssets.wardrobeUpload.setCharacterLink.useMutation({
    onSuccess: () => { utils.productionAssets.wardrobeUpload.list.invalidate({ projectId }); toast.success("Character link saved"); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.productionAssets.wardrobeUpload.delete.useMutation({
    onSuccess: () => { utils.productionAssets.wardrobeUpload.list.invalidate({ projectId }); toast.success("Garment removed"); },
    onError: e => toast.error(e.message),
  });

  const analyseMutation = trpc.productionAssets.wardrobeUpload.analyseGarment.useMutation({
    onSuccess: (data, variables) => {
      setAnalysisMap(prev => ({ ...prev, [variables.itemId]: data }));
      setExpandedId(variables.itemId);
      utils.productionAssets.wardrobeUpload.list.invalidate({ projectId });
      toast.success("Garment analysed by AI costume designer");
    },
    onError: e => toast.error(e.message),
  });

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8 MB"); return; }
    setImageMime(file.type);
    if (!uName) setUName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setPreviewUrl(result);
      setImageBase64(result.replace(/^data:[^;]+;base64,/, ""));
    };
    reader.readAsDataURL(file);
  }

  const filteredItems = (items as any[]).filter(i => filterCat === "all" || i.category === filterCat);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground text-amber-400" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 gradient-text-gold">
            <Camera className="h-4 w-4 text-violet-500" />Wardrobe Library
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(items as any[]).length} garment{(items as any[]).length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <Dialog open={showUpload} onOpenChange={open => { setShowUpload(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4" />Upload Garment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-dark">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 gradient-text-gold">
                <Camera className="h-5 w-5 text-violet-500" />Upload Garment Photo
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Drop zone */}
              <div
                className={["border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden",
                  dragOver ? "border-violet-500 bg-violet-500/10" : "border-muted hover:border-violet-400 hover:bg-violet-500/5",
                  previewUrl ? "border-solid border-violet-400" : ""].join(" ")}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
                onClick={() => !previewUrl && fileRef.current?.click()}
              >
                {previewUrl ? (
                  <div className="relative">
                    <img src={previewUrl} alt="Preview" className="w-full max-h-72 object-contain bg-muted/30" />
                    <Button size="sm" variant="destructive" className="absolute top-2 right-2 h-7 text-xs"
                      onClick={e => { e.stopPropagation(); setPreviewUrl(null); setImageBase64(null); if (fileRef.current) fileRef.current.value = ""; }}>
                      Change Photo
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="h-14 w-14 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
                      <Camera className="h-7 w-7 text-violet-400" />
                    </div>
                    <p className="text-sm font-medium">Drop your garment photo here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ JPEG, PNG, WEBP up to 8 MB</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FieldGroup label="Garment Name *">
                    <Input value={uName} onChange={e => setUName(e.target.value)} placeholder='"Black Wool Overcoat", "1940s Silk Evening Gown"' />
                  </FieldGroup>
                </div>
                <FieldGroup label="Category">
                  <Select value={uCat} onValueChange={setUCat}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent>
                      {WARDROBE_CATEGORIES.filter(c => c.value !== "all").map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label="Brand / Designer">
                  <Input value={uBrand} onChange={e => setUBrand(e.target.value)} placeholder="Chanel, H&M, custom-made..." className="text-sm" />
                </FieldGroup>
                <FieldGroup label="Primary Colour">
                  <Input value={uColor} onChange={e => setUColor(e.target.value)} placeholder="midnight black, ivory..." className="text-sm" />
                </FieldGroup>
                <FieldGroup label="Secondary / Trim Colour">
                  <Input value={uColor2} onChange={e => setUColor2(e.target.value)} placeholder="gold trim, white lace..." className="text-sm" />
                </FieldGroup>
                <FieldGroup label="Fabric / Material">
                  <Input value={uFabric} onChange={e => setUFabric(e.target.value)} placeholder="wool, silk, denim, velvet..." className="text-sm" />
                </FieldGroup>
                <FieldGroup label="Condition">
                  <Select value={uCondition} onValueChange={setUCondition}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select condition..." /></SelectTrigger>
                    <SelectContent>
                      {["pristine", "lightly worn", "worn", "weathered", "distressed", "battle-damaged", "patched"].map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <div className="col-span-2">
                  <FieldGroup label="Notes / Scene Context">
                    <Textarea value={uDesc} onChange={e => setUDesc(e.target.value)} rows={2}
                      className="text-sm resize-none" placeholder="Which character wears this? Which scenes? Any relevant context..." />
                  </FieldGroup>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setShowUpload(false); resetForm(); }}>Cancel</Button>
              <Button className="bg-violet-600 hover:bg-violet-700"
                onClick={() => {
                  if (!imageBase64) { toast.error("Please select a photo first"); return; }
                  if (!uName.trim()) { toast.error("Please enter a garment name"); return; }
                  uploadMutation.mutate({
                    projectId, name: uName, imageBase64, mimeType: (imageMime as any),
                    category: uCat || undefined, color: uColor || undefined,
                    secondaryColor: uColor2 || undefined, fabric: uFabric || undefined,
                    condition: uCondition || undefined, brand: uBrand || undefined,
                    description: uDesc || undefined,
                  });
                }}
                disabled={uploadMutation.isPending || !imageBase64 || !uName.trim()}
              >
                {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2 text-amber-400" /> : null}
                Upload Garment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {WARDROBE_CATEGORIES.map(cat => {
          const count = cat.value === "all" ? (items as any[]).length : (items as any[]).filter((i: any) => i.category === cat.value).length;
          if (cat.value !== "all" && count === 0) return null;
          return (
            <Button key={cat.value} variant={filterCat === cat.value ? "default" : "outline"}
              size="sm" className="h-7 text-xs px-3"
              onClick={() => setFilterCat(cat.value)}>
              {cat.label}{count > 0 && <span className="ml-1 opacity-60 text-[10px]">{count}</span>}
            </Button>
          );
        })}
      </div>

      {/* Empty state */}
      {(items as any[]).length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-muted p-14 text-center">
          <div className="h-14 w-14 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Camera className="h-7 w-7 text-violet-400" />
          </div>
          <p className="font-medium text-sm">Your wardrobe is empty</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Upload photos of real costumes, garments, or reference clothing. The AI costume designer will analyse each piece ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ detecting fabric, era, social class, and generating cinematic prompts for consistent character rendering.
          </p>
          <Button size="sm" className="mt-4 bg-violet-600 hover:bg-violet-700 gap-2"
            onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4" />Upload First Garment
          </Button>
        </div>
      )}

      {/* Gallery */}
      {filteredItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredItems.map((item: any) => {
            const isExpanded = expandedId === item.id;
            const analysis = analysisMap[item.id];
            const savedAnalysis = item.aiStyleProfile ? (() => { try { return JSON.parse(item.aiStyleProfile); } catch { return null; } })() : null;
            const displayAnalysis = analysis || savedAnalysis;
            const catColor = CAT_COLORS[item.category] || "bg-muted text-muted-foreground border-border";
            const isAnalysing = analyseMutation.isPending && (analyseMutation.variables as any)?.itemId === item.id;
            return (
              <Card key={item.id} className="overflow-hidden group hover:ring-1 hover:ring-violet-400/50 transition-all glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20">
                {/* Image */}
                <div className="relative aspect-square bg-muted/30 overflow-hidden cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                  <img src={item.imageUrl} alt={item.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  {(item.aiStyleProfile || analysis) && (
                    <div className="absolute top-1.5 right-1.5">
                      <Badge className="text-[10px] h-4 px-1.5 bg-violet-600/90">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />AI
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs font-medium truncate">{item.name}</p>
                    {item.category && (
                      <span className={["text-[10px] px-1.5 py-0.5 rounded border", catColor].join(" ")}>
                        {WARDROBE_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action row */}
                <div className="p-2 flex items-center gap-1.5">
                  <Button size="sm" variant="outline"
                    className="flex-1 h-7 text-[11px] gap-1 border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-amber-500/50 hover:text-amber-400"
                    onClick={() => analyseMutation.mutate({ itemId: item.id })} disabled={isAnalysing}>
                    {isAnalysing ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : <Sparkles className="h-3 w-3" />}
                    AI Analyse
                  </Button>
                  <Button size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                    onClick={() => deleteMutation.mutate({ id: item.id })} disabled={deleteMutation.isPending}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Expanded analysis */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-3 space-y-2">
                    {displayAnalysis ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="h-3 w-3 text-violet-500" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">AI Costume Analysis</span>
                        </div>
                        {displayAnalysis.garmentName && (
                          <p className="text-xs font-medium">{displayAnalysis.garmentName}</p>
                        )}
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          {displayAnalysis.primaryColor && (
                            <div><span className="text-muted-foreground">Colour: </span>
                              {displayAnalysis.primaryColor}{displayAnalysis.secondaryColor ? " / " + displayAnalysis.secondaryColor : ""}
                            </div>
                          )}
                          {displayAnalysis.fabricType && (
                            <div><span className="text-muted-foreground">Fabric: </span>{displayAnalysis.fabricType}</div>
                          )}
                          {displayAnalysis.silhouette && (
                            <div><span className="text-muted-foreground">Silhouette: </span>{displayAnalysis.silhouette}</div>
                          )}
                          {displayAnalysis.estimatedEra && (
                            <div><span className="text-muted-foreground">Era: </span>{displayAnalysis.estimatedEra}</div>
                          )}
                          {displayAnalysis.socialClassIndicator && (
                            <div className="col-span-2"><span className="text-muted-foreground">Class: </span>{displayAnalysis.socialClassIndicator}</div>
                          )}
                        </div>
                        {displayAnalysis.cinematicNotes && (
                          <ResultBlock label="Cinematic Notes" value={displayAnalysis.cinematicNotes} />
                        )}
                        {displayAnalysis.characterSuggestion && (
                          <ResultBlock label="Character Fit" value={displayAnalysis.characterSuggestion} />
                        )}
                        {displayAnalysis.stylingTips && (
                          <ResultBlock label="Styling Tips" value={displayAnalysis.stylingTips} />
                        )}
                        {displayAnalysis.continuityNotes && (
                          <ResultBlock label="Continuity Notes" value={displayAnalysis.continuityNotes} />
                        )}
                        {displayAnalysis.aiPromptSuffix && (
                          <ResultBlock label="AI Generation Prompt" value={displayAnalysis.aiPromptSuffix} copyable />
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <Sparkles className="h-5 w-5 text-violet-300 mx-auto mb-1.5" />
                        <p className="text-[11px] text-muted-foreground">Click AI Analyse to get garment analysis ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ era, silhouette, cinematic lighting notes, and an AI generation prompt.</p>
                      </div>
                    )}
                    {(item.color || item.fabric || item.brand || item.condition) && (
                      <div className="grid grid-cols-2 gap-1 text-[11px] pt-2 border-t">
                        {item.color && <div><span className="text-muted-foreground">Tagged colour: </span>{item.color}</div>}
                        {item.fabric && <div><span className="text-muted-foreground">Tagged fabric: </span>{item.fabric}</div>}
                        {item.brand && <div><span className="text-muted-foreground">Brand: </span>{item.brand}</div>}
                        {item.condition && <div><span className="text-muted-foreground">Condition: </span>{item.condition}</div>}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Shot List Tab ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
const SHOT_TYPES = ["ECU","CU","MCU","MS","MLS","LS","WS","EWS","OTS","POV","TWO-SHOT","INSERT","AERIAL","DUTCH"];
const CAMERA_MOVEMENTS = ["STATIC","DOLLY IN","DOLLY OUT","PAN L","PAN R","TILT U","TILT D","TRACK","CRANE UP","CRANE DOWN","HANDHELD","STEADICAM","ZOOM IN","ZOOM OUT","DUTCH TILT"];

function ShotListTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: savedShots = [] } = trpc.productionAssets.shotList.list.useQuery({ projectId }, { enabled: !!projectId });

  const [sceneName, setSceneName]     = useState("");
  const [sceneNumber, setSceneNumber] = useState("");
  const [scriptText, setScriptText]   = useState("");
  const [generatedShots, setGeneratedShots] = useState<any[]>([]);
  const [activeScene, setActiveScene]   = useState<string | null>(null);

  const generateMutation = trpc.productionAssets.shotList.generate.useMutation({
    onSuccess: data => { setGeneratedShots(data.shots); toast.success(`${data.shots.length} shots generated`); },
    onError: e => toast.error(e.message),
  });
  const saveMutation = trpc.productionAssets.shotList.save.useMutation({
    onSuccess: () => { utils.productionAssets.shotList.list.invalidate({ projectId }); toast.success("Shot list saved"); setGeneratedShots([]); setSceneName(""); setScriptText(""); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.productionAssets.shotList.deleteScene.useMutation({
    onSuccess: () => { utils.productionAssets.shotList.list.invalidate({ projectId }); toast.success("Scene deleted"); },
    onError: e => toast.error(e.message),
  });

  // Group saved shots by scene
  const scenes = Array.from(new Set((savedShots as any[]).map((s: any) => s.sceneName)));

  const totalDuration = (shots: any[]) => {
    const secs = shots.reduce((a, s) => a + (s.estimatedDuration || 0), 0);
    return secs >= 60 ? `${Math.floor(secs/60)}m ${secs%60}s` : `${secs}s`;
  };

  const shotBadgeColor: Record<string, string> = {
    ECU:"bg-red-100 text-red-800", CU:"bg-orange-100 text-orange-800",
    MCU:"bg-amber-100 text-amber-800", MS:"bg-yellow-100 text-yellow-800",
    MLS:"bg-lime-100 text-lime-800", LS:"bg-green-100 text-green-800",
    WS:"bg-teal-100 text-teal-800", EWS:"bg-cyan-100 text-cyan-800",
    OTS:"bg-blue-100 text-blue-800", POV:"bg-indigo-100 text-indigo-800",
    "TWO-SHOT":"bg-violet-100 text-violet-800", INSERT:"bg-purple-100 text-purple-800",
    AERIAL:"bg-pink-100 text-pink-800", "DUTCH":"bg-rose-100 text-rose-800",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 gradient-text-gold">
            <Film className="h-4 w-4 text-violet-500" />Shot List Generator
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste your scene script ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ the AI reads your Director&apos;s Vision and generates a full shot list
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {scenes.length} scene{scenes.length !== 1 ? "s" : ""} saved
        </Badge>
      </div>

      {/* Generator form */}
      <Card>
        <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <Wand2 className="h-4 w-4 text-violet-500" />Generate New Shot List
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FieldGroup label="Scene Name *">
                <Input value={sceneName} onChange={e => setSceneName(e.target.value)}
                  placeholder='e.g. "INT. GRAND BALLROOM - NIGHT"' className="text-sm" />
              </FieldGroup>
            </div>
            <FieldGroup label="Scene #">
              <Input value={sceneNumber} onChange={e => setSceneNumber(e.target.value)}
                placeholder="14" className="text-sm" />
            </FieldGroup>
          </div>
          <FieldGroup label="Scene Script / Description *">
            <Textarea value={scriptText} onChange={e => setScriptText(e.target.value)}
              rows={6} className="text-sm font-mono resize-none"
              placeholder={"INT. GRAND BALLROOM - NIGHT\n\nELEANOR descends the marble staircase. Every eye in the room turns. MARCUS watches from the shadows by the far column, champagne untouched in his hand.\n\nELEANOR\nI didn't think you'd come.\n\nMARCUS steps forward into the candlelight..."} />
          </FieldGroup>
          <div className="flex items-center gap-2">
            <Button className="bg-violet-600 hover:bg-violet-700 gap-2"
              onClick={() => {
                if (!sceneName.trim()) { toast.error("Enter a scene name"); return; }
                if (!scriptText.trim()) { toast.error("Paste your scene script"); return; }
                generateMutation.mutate({ projectId, sceneName: sceneName.trim(), sceneNumber: sceneNumber.trim() || undefined, scriptText });
              }}
              disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Wand2 className="h-4 w-4" />}
              Generate Shot List
            </Button>
            <p className="text-xs text-muted-foreground">Uses your Director&apos;s Vision (era, camera, lens, movement style)</p>
          </div>
        </CardContent>
      </Card>

      {/* Generated results */}
      {generatedShots.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/30 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <Sparkles className="h-4 w-4 text-violet-500" />
                {generatedShots.length} shots ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ {totalDuration(generatedShots)} screen time
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setGeneratedShots([])}>Discard</Button>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1"
                  onClick={() => saveMutation.mutate({ projectId, sceneName, sceneNumber: sceneNumber || undefined, shots: generatedShots })}
                  disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : <Save className="h-3 w-3" />}
                  Save to Project
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-2 font-medium w-12">#</th>
                    <th className="text-left p-2 font-medium w-20">Type</th>
                    <th className="text-left p-2 font-medium w-16">Lens</th>
                    <th className="text-left p-2 font-medium w-24">Movement</th>
                    <th className="text-left p-2 font-medium">Frame / Action</th>
                    <th className="text-left p-2 font-medium w-24">Lighting</th>
                    <th className="text-left p-2 font-medium w-12">Dur.</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedShots.map((shot, i) => (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      <td className="p-2 font-mono font-semibold text-violet-700">{shot.shotNumber}</td>
                      <td className="p-2">
                        <span className={["text-[10px] px-1.5 py-0.5 rounded font-medium", shotBadgeColor[shot.shotType] || "bg-muted text-muted-foreground"].join(" ")}>
                          {shot.shotType}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-muted-foreground">{shot.lensLength}</td>
                      <td className="p-2 text-[10px] text-muted-foreground">{shot.cameraMovement}</td>
                      <td className="p-2">
                        <p className="font-medium">{shot.frameDescription}</p>
                        <p className="text-muted-foreground">{shot.action}</p>
                        {shot.dialogue && <p className="italic mt-0.5 text-violet-600">&ldquo;{shot.dialogue}&rdquo;</p>}
                        {shot.directorNote && <p className="text-amber-700 mt-0.5">ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¦ {shot.directorNote}</p>}
                      </td>
                      <td className="p-2 text-muted-foreground text-[10px]">{shot.lightingNote}</td>
                      <td className="p-2 text-muted-foreground">{shot.estimatedDuration}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved scenes */}
      {scenes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saved Shot Lists</h3>
          {scenes.map(sName => {
            const sShots = (savedShots as any[]).filter((s: any) => s.sceneName === sName);
            const isOpen = activeScene === sName;
            return (
              <Card key={sName}>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                  onClick={() => setActiveScene(isOpen ? null : sName)}>
                  <div className="flex items-center gap-3">
                    <Film className="h-4 w-4 text-violet-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{sName}</p>
                      <p className="text-xs text-muted-foreground">{sShots.length} shots ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ· {totalDuration(sShots)} screen time</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                      onClick={e => { e.stopPropagation(); deleteMutation.mutate({ projectId, sceneName: sName }); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b bg-muted/30">
                        <th className="text-left p-2 w-12">#</th>
                        <th className="text-left p-2 w-20">Type</th>
                        <th className="text-left p-2 w-16">Lens</th>
                        <th className="text-left p-2 w-24">Movement</th>
                        <th className="text-left p-2">Frame / Action</th>
                        <th className="text-left p-2 w-12">Dur.</th>
                      </tr></thead>
                      <tbody>
                        {sShots.map((shot: any, i: number) => (
                          <tr key={i} className="border-b hover:bg-muted/10">
                            <td className="p-2 font-mono font-semibold text-violet-700">{shot.shotNumber}</td>
                            <td className="p-2">
                              <span className={["text-[10px] px-1.5 py-0.5 rounded font-medium", shotBadgeColor[shot.shotType] || "bg-muted text-muted-foreground"].join(" ")}>{shot.shotType}</span>
                            </td>
                            <td className="p-2 font-mono text-muted-foreground">{shot.lensLength}</td>
                            <td className="p-2 text-[10px] text-muted-foreground">{shot.cameraMovement}</td>
                            <td className="p-2">
                              <p className="font-medium">{shot.frameDescription}</p>
                              <p className="text-muted-foreground">{shot.action}</p>
                              {shot.dialogue && <p className="italic text-violet-600">&ldquo;{shot.dialogue}&rdquo;</p>}
                            </td>
                            <td className="p-2 text-muted-foreground">{shot.estimatedDuration}s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {scenes.length === 0 && generatedShots.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-muted p-14 text-center">
          <Film className="h-10 w-10 text-violet-300 mx-auto mb-3" />
          <p className="font-medium text-sm">No shot lists yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Paste a scene from your script above. The AI reads your Director&apos;s Vision ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ era, camera format, lens profile, movement style ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ and generates a complete shot list with timing, framing, and lighting notes.
          </p>
        </div>
      )}
    </div>
  );
}


// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Shooting Schedule Tab ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
function ScheduleTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: days = [], isLoading } = trpc.productionAssets.shootingSchedule.list.useQuery({ projectId }, { enabled: !!projectId });
  const [generatedDays, setGeneratedDays] = useState<any[]>([]);

  const generateMutation = trpc.productionAssets.shootingSchedule.generate.useMutation({
    onSuccess: data => { setGeneratedDays(data.days); toast.success(`${data.days.length}-day schedule generated`); },
    onError: e => toast.error(e.message),
  });
  const saveMutation = trpc.productionAssets.shootingSchedule.save.useMutation({
    onSuccess: () => { utils.productionAssets.shootingSchedule.list.invalidate({ projectId }); setGeneratedDays([]); toast.success("Schedule saved"); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.productionAssets.shootingSchedule.deleteAll.useMutation({
    onSuccess: () => { utils.productionAssets.shootingSchedule.list.invalidate({ projectId }); toast.success("Schedule cleared"); },
    onError: e => toast.error(e.message),
  });

  const displayDays = generatedDays.length > 0 ? generatedDays : (days as any[]);
  const isGenerated = generatedDays.length > 0;

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground text-amber-400" /></div>;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 gradient-text-gold">
            <CalendarDays className="h-4 w-4 text-violet-500" />Shooting Schedule
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI groups your scenes by location, minimises company moves, respects permit windows and golden hour
          </p>
        </div>
        <div className="flex gap-2">
          {(days as any[]).length > 0 && !isGenerated && (
            <Button size="sm" variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-amber-500/50 hover:text-amber-400"
              onClick={() => deleteMutation.mutate({ projectId })} disabled={deleteMutation.isPending}>
              <Trash2 className="h-3.5 w-3.5" />Clear Schedule
            </Button>
          )}
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-2"
            onClick={() => generateMutation.mutate({ projectId })} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Wand2 className="h-4 w-4" />}
            {generateMutation.isPending ? "Scheduling..." : "Generate Schedule"}
          </Button>
        </div>
      </div>

      {isGenerated && (
        <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-lg p-3">
          <p className="text-sm text-violet-700 font-medium">
            <Sparkles className="h-4 w-4 inline mr-1" />
            {generatedDays.length}-day schedule ready ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ review then save
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setGeneratedDays([])}>Discard</Button>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1"
              onClick={() => saveMutation.mutate({ projectId, days: generatedDays })} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : <Save className="h-3 w-3" />}
              Save Schedule
            </Button>
          </div>
        </div>
      )}

      {displayDays.length === 0 && !generateMutation.isPending && (
        <div className="rounded-xl border-2 border-dashed border-muted p-14 text-center">
          <CalendarDays className="h-10 w-10 text-violet-300 mx-auto mb-3" />
          <p className="font-medium text-sm">No schedule yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            First scout your locations (Locations tab) and generate shot lists (Shot List tab). Then the AI can create an optimised day-by-day shooting schedule that groups scenes by location and respects your scouting data.
          </p>
          <Button size="sm" className="mt-4 bg-violet-600 hover:bg-violet-700 gap-2"
            onClick={() => generateMutation.mutate({ projectId })} disabled={generateMutation.isPending}>
            <Wand2 className="h-4 w-4" />Generate Schedule
          </Button>
        </div>
      )}

      {generateMutation.isPending && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500 text-amber-400" />
          <p className="text-sm text-muted-foreground">Analysing locations and scenes...</p>
          <p className="text-xs text-muted-foreground">Optimising for minimal company moves and golden hour windows</p>
        </div>
      )}

      {displayDays.length > 0 && (
        <div className="space-y-3">
          {displayDays.map((day: any, i: number) => (
            <Card key={i} className={isGenerated ? "border-violet-200" : ""}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                      <span className="text-white text-sm font-bold">D{day.dayNumber}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{day.locationName}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Sun className="h-3 w-3" />{day.callTime} ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ {day.wrapTime}</span>
                        <span>{day.estimatedPages} pages</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pl-13 ml-13 space-y-2">
                  <div className="ml-13">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Scenes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(day.scenes) ? day.scenes : []).map((sc: string, si: number) => (
                        <Badge key={si} variant="secondary" className="text-xs">{sc}</Badge>
                      ))}
                    </div>
                  </div>
                  {day.lightingWindow && (
                    <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-amber-800"><span className="font-medium">Golden Hour:</span> {day.lightingWindow}</p>
                    </div>
                  )}
                  {day.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">{day.notes}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {displayDays.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Card className="p-3 text-center glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <p className="text-2xl font-bold text-violet-700">{displayDays.length}</p>
                <p className="text-xs text-muted-foreground">Shoot Days</p>
              </Card>
              <Card className="p-3 text-center glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <p className="text-2xl font-bold text-violet-700">
                  {new Set(displayDays.map((d: any) => d.locationName)).size}
                </p>
                <p className="text-xs text-muted-foreground">Locations Used</p>
              </Card>
              <Card className="p-3 text-center glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <p className="text-2xl font-bold text-violet-700">
                  {displayDays.reduce((a: number, d: any) => a + (Array.isArray(d.scenes) ? d.scenes.length : 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Scenes</p>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Continuity Checker Tab ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
function ContinuityTab({ projectId }: { projectId: number }) {
  const [result, setResult] = useState<any>(null);
  const checkMutation = trpc.productionAssets.continuityCheck.run.useMutation({
    onSuccess: data => { setResult(data); },
    onError: e => toast.error(e.message),
  });

  const riskColors: Record<string, string> = {
    low:    "bg-green-100 text-green-800 border-green-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    high:   "bg-red-100 text-red-800 border-red-200",
  };
  const severityColors: Record<string, string> = {
    critical: "border-l-red-500 bg-red-50/50",
    warning:  "border-l-amber-500 bg-amber-50/50",
    info:     "border-l-blue-500 bg-blue-50/50",
  };
  const severityIcons: Record<string, string> = {
    critical: "ÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ´", warning: "ÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¡", info: "ÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂµ",
  };
  const catLabels: Record<string, string> = {
    era:"Era / Period", geography:"Geography", class:"Social Class",
    character:"Character", lighting:"Lighting", other:"Other",
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 gradient-text-gold">
            <Eye className="h-4 w-4 text-violet-500" />Continuity Checker
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI cross-references wardrobe, locations, and your Director&apos;s Vision to flag conflicts before they reach set
          </p>
        </div>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-2"
          onClick={() => checkMutation.mutate({ projectId })} disabled={checkMutation.isPending}>
          {checkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Zap className="h-4 w-4" />}
          {checkMutation.isPending ? "Analysing..." : "Run Continuity Check"}
        </Button>
      </div>

      {checkMutation.isPending && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500 text-amber-400" />
          <p className="text-sm text-muted-foreground">Comparing wardrobe eras with location eras...</p>
          <p className="text-xs text-muted-foreground">Checking social class consistency, geographic accuracy...</p>
        </div>
      )}

      {!result && !checkMutation.isPending && (
        <div className="rounded-xl border-2 border-dashed border-muted p-14 text-center">
          <Eye className="h-10 w-10 text-violet-300 mx-auto mb-3" />
          <p className="font-medium text-sm">No continuity report yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Add your Director&apos;s Vision (Vision tab), scout locations (Locations tab), and upload wardrobe (Wardrobe tab). Then run a check to catch era mismatches, geography conflicts, and social class inconsistencies before you reach set.
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Overall risk */}
          <div className={["rounded-xl border p-4 flex items-start gap-3", riskColors[result.overallRisk] || riskColors.low].join(" ")}>
            <div className="text-2xl mt-0.5">
              {result.overallRisk === "high" ? "ÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ´" : result.overallRisk === "medium" ? "ÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¡" : "ÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢"}
            </div>
            <div>
              <p className="font-semibold capitalize">{result.overallRisk} Continuity Risk</p>
              <p className="text-sm mt-1">{result.summary}</p>
              <p className="text-xs mt-1 opacity-70">
                {result.issues.length} issue{result.issues.length !== 1 ? "s" : ""} found ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ· {result.strengths.length} strength{result.strengths.length !== 1 ? "s" : ""} identified
              </p>
            </div>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issues Found</h3>
              {result.issues.map((issue: any, i: number) => (
                <div key={i} className={["rounded-lg border-l-4 p-3 space-y-1", severityColors[issue.severity] || severityColors.info].join(" ")}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{severityIcons[issue.severity] || "ÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂµ"}</span>
                    <p className="text-sm font-semibold">{issue.title}</p>
                    <Badge variant="outline" className="text-[10px] h-4 ml-auto">
                      {catLabels[issue.category] || issue.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{issue.description}</p>
                  <p className="text-xs pl-6 font-medium">
                    <span className="text-muted-foreground">Fix: </span>{issue.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Strengths</h3>
              <div className="rounded-xl bg-green-50 border border-green-200 p-3 space-y-1.5">
                {result.strengths.map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-green-800">
                    <span className="text-green-600 shrink-0">ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button size="sm" variant="outline" className="gap-2 hover:border-amber-500/50 hover:text-amber-400"
            onClick={() => checkMutation.mutate({ projectId })} disabled={checkMutation.isPending}>
            <Zap className="h-3.5 w-3.5" />Re-run Check
          </Button>
        </div>
      )}
    </div>
  );
}


// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Title Card / Text Overlay Tool ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
const TITLE_PRESETS = [
  { label: "TO BE CONTINUED...",  text: "TO BE CONTINUED...",  style: "cinematic", align: "center", pos: "bottom" },
  { label: "GUEST STAR",          text: "GUEST STAR\n[Name]",  style: "credits",   align: "center", pos: "bottom" },
  { label: "PREVIOUSLY ON...",    text: "PREVIOUSLY ON...",    style: "cinematic", align: "left",   pos: "top" },
  { label: "NEXT TIME ON...",     text: "NEXT TIME ON...",     style: "cinematic", align: "left",   pos: "top" },
  { label: "EPISODE TITLE",       text: "Episode I\n[Title]", style: "title",     align: "center", pos: "center" },
  { label: "TIME / PLACE CARD",   text: "PARIS, 1943",         style: "subtitle",  align: "left",   pos: "bottom" },
  { label: "YEARS LATER",         text: "5 YEARS LATER",      style: "cinematic", align: "center", pos: "center" },
  { label: "IN MEMORY OF",        text: "In Memory Of\n[Name]",style: "elegant",  align: "center", pos: "center" },
  { label: "THE END",             text: "THE END",             style: "title",     align: "center", pos: "center" },
  { label: "BASED ON...",         text: "Based on a true story",style: "subtitle", align: "center", pos: "bottom" },
];

const TEXT_STYLES = [
  { value: "cinematic",  label: "Cinematic",  font: "bold 48px 'Georgia', serif",           color: "#ffffff", shadow: "3px 3px 12px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)", letterSpacing: 6 },
  { value: "title",      label: "Grand Title",font: "bold 64px 'Georgia', serif",           color: "#ffffff", shadow: "2px 2px 20px rgba(0,0,0,1)", letterSpacing: 8 },
  { value: "credits",    label: "TV Credits", font: "300 36px 'Arial', sans-serif",         color: "#ffffff", shadow: "1px 1px 8px rgba(0,0,0,0.9)", letterSpacing: 3 },
  { value: "subtitle",   label: "Subtitle",   font: "italic 28px 'Georgia', serif",         color: "#e8e8e8", shadow: "1px 1px 6px rgba(0,0,0,0.8)", letterSpacing: 2 },
  { value: "elegant",    label: "Elegant",    font: "300 40px 'Georgia', serif",            color: "#f0e8d0", shadow: "0 0 30px rgba(0,0,0,0.8)", letterSpacing: 4 },
  { value: "neon",       label: "Neon",       font: "bold 48px 'Arial', sans-serif",        color: "#00ffff", shadow: "0 0 20px #00ffff, 0 0 40px #00ffff66", letterSpacing: 4 },
  { value: "horror",     label: "Horror",     font: "bold 52px 'Georgia', serif",           color: "#cc0000", shadow: "2px 2px 0 #000, 0 0 30px rgba(180,0,0,0.8)", letterSpacing: 2 },
  { value: "vintage",    label: "Vintage",    font: "bold italic 42px 'Georgia', serif",    color: "#f5e6a0", shadow: "2px 2px 8px rgba(0,0,0,0.9)", letterSpacing: 3 },
];

const TEXT_POSITIONS = [
  { value: "top",    label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
];

const TEXT_ALIGNS = [
  { value: "left",   label: "Left" },
  { value: "center", label: "Center" },
  { value: "right",  label: "Right" },
];

function TitleCardTab({ projectId }: { projectId: number }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const fileRef2   = useRef<HTMLInputElement>(null);

  const [bgImage,      setBgImage]      = useState<HTMLImageElement | null>(null);
  const [bgDataUrl,    setBgDataUrl]    = useState<string | null>(null);
  const [overlayText,  setOverlayText]  = useState("TO BE CONTINUED...");
  const [textStyle,    setTextStyle]    = useState("cinematic");
  const [textPos,      setTextPos]      = useState("bottom");
  const [textAlign,    setTextAlign]    = useState("center");
  const [customColor,  setCustomColor]  = useState("#ffffff");
  const [useCustomCol, setUseCustomCol] = useState(false);
  const [overlayDim,   setOverlayDim]   = useState(true);
  const [dimStrength,  setDimStrength]  = useState(40);
  const [vignette,     setVignette]     = useState(true);
  const [rendered,     setRendered]     = useState(false);
  const [paddingX,     setPaddingX]     = useState(60);
  const [lineSpacing,  setLineSpacing]  = useState(1.3);

  function loadImage(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setBgDataUrl(url);
      const img = new Image();
      img.onload = () => { setBgImage(img); setRendered(false); };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  function renderToCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 1920, H = 1080;
    canvas.width = W; canvas.height = H;
    const ctx2d = canvas.getContext("2d")!;
    ctx2d.clearRect(0, 0, W, H);

    // Background
    if (bgImage) {
      const scale = Math.max(W / bgImage.width, H / bgImage.height);
      const sw = bgImage.width * scale, sh = bgImage.height * scale;
      ctx2d.drawImage(bgImage, (W - sw) / 2, (H - sh) / 2, sw, sh);
    } else {
      ctx2d.fillStyle = "#0a0a0a";
      ctx2d.fillRect(0, 0, W, H);
    }

    // Overlay dimming
    if (overlayDim) {
      ctx2d.fillStyle = `rgba(0,0,0,${dimStrength / 100})`;
      ctx2d.fillRect(0, 0, W, H);
    }

    // Vignette
    if (vignette) {
      const grad = ctx2d.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.85);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx2d.fillStyle = grad;
      ctx2d.fillRect(0, 0, W, H);
    }

    // Text
    const styleObj = TEXT_STYLES.find(s => s.value === textStyle) || TEXT_STYLES[0];
    ctx2d.font = styleObj.font;
    ctx2d.shadowColor = "transparent";

    const lines = overlayText.split("\n");
    const lineH = parseInt(styleObj.font.match(/\d+(?=px)/)?.[0] || "48") * lineSpacing;
    const totalH = lineH * lines.length;

    let baseY: number;
    if (textPos === "top")    baseY = paddingX + lineH;
    else if (textPos === "bottom") baseY = H - paddingX - totalH + lineH;
    else                      baseY = (H - totalH) / 2 + lineH;

    ctx2d.textAlign = textAlign as CanvasTextAlign;
    let textX: number;
    if (textAlign === "left")  textX = paddingX;
    else if (textAlign === "right") textX = W - paddingX;
    else                       textX = W / 2;

    // Draw shadow/glow
    ctx2d.shadowColor   = styleObj.shadow.includes("rgba") ? styleObj.shadow.match(/rgba\([^)]+\)/)?.[0] || "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.9)";
    ctx2d.shadowBlur    = 20;
    ctx2d.shadowOffsetX = 2;
    ctx2d.shadowOffsetY = 2;
    ctx2d.fillStyle     = useCustomCol ? customColor : styleObj.color;

    lines.forEach((line, li) => {
      ctx2d.letterSpacing = styleObj.letterSpacing + "px";
      ctx2d.fillText(line, textX, baseY + li * lineH);
    });

    setRendered(true);
  }

  function downloadImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "title-card.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Title card downloaded!");
  }

  // Auto-render when settings change
  const depsKey = [overlayText, textStyle, textPos, textAlign, customColor, useCustomCol, overlayDim, dimStrength, vignette, paddingX, lineSpacing, bgDataUrl].join("|");
  useEffect(() => {
    if (canvasRef.current) renderToCanvas();
  }, [depsKey]);

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 gradient-text-gold">
          <Star className="h-4 w-4 text-violet-500" />Title Card Creator
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add cinematic text overlays ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ &ldquo;TO BE CONTINUED&rdquo;, &ldquo;GUEST STAR&rdquo;, chapter titles, time cards, and more
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick presets */}
          <Card>
            <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground text-amber-400/60 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">Quick Presets</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {TITLE_PRESETS.map((p, i) => (
                  <Button key={i} variant="outline" size="sm" className="h-6 text-[10px] px-2 hover:border-amber-500/50 hover:text-amber-400"
                    onClick={() => {
                      setOverlayText(p.text);
                      setTextStyle(p.style);
                      setTextAlign(p.align);
                      setTextPos(p.pos);
                    }}>{p.label}</Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Background image */}
          <Card>
            <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground text-amber-400/60 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">Background Image</CardTitle></CardHeader>
            <CardContent className="space-y-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div
                className={["border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-violet-400 transition-colors",
                  bgDataUrl ? "border-violet-300 bg-violet-50/20" : "border-muted"].join(" ")}
                onClick={() => fileRef2.current?.click()}>
                {bgDataUrl ? (
                  <div className="flex items-center gap-2">
                    <img src={bgDataUrl} alt="Background reference" className="h-10 w-16 object-cover rounded" />
                    <div className="text-left">
                      <p className="text-xs font-medium">Image loaded</p>
                      <p className="text-[10px] text-muted-foreground">Click to change</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Camera className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Click to upload background image</p>
                    <p className="text-[10px] text-muted-foreground">(Optional ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ black background if none)</p>
                  </div>
                )}
              </div>
              <input ref={fileRef2} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) loadImage(f); }} />
              {bgDataUrl && (
                <Button size="sm" variant="ghost" className="w-full h-7 text-xs text-muted-foreground"
                  onClick={() => { setBgImage(null); setBgDataUrl(null); }}>Remove image</Button>
              )}
            </CardContent>
          </Card>

          {/* Text content */}
          <Card>
            <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground text-amber-400/60 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">Text Content</CardTitle></CardHeader>
            <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <Textarea value={overlayText} onChange={e => setOverlayText(e.target.value)}
                rows={3} className="text-sm font-mono resize-none"
                placeholder={"TO BE CONTINUED...\nor\nGUEST STAR\nJOHN DOE"} />
              <p className="text-[10px] text-muted-foreground">Use new lines to split text into multiple lines</p>
            </CardContent>
          </Card>

          {/* Style options */}
          <Card>
            <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground text-amber-400/60 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">Style</CardTitle></CardHeader>
            <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <FieldGroup label="Text Style">
                <Select value={textStyle} onValueChange={setTextStyle}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEXT_STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <div className="grid grid-cols-2 gap-2">
                <FieldGroup label="Position">
                  <Select value={textPos} onValueChange={setTextPos}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEXT_POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label="Alignment">
                  <Select value={textAlign} onValueChange={setTextAlign}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEXT_ALIGNS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="customCol" checked={useCustomCol} onChange={e => setUseCustomCol(e.target.checked)} className="rounded" />
                <label htmlFor="customCol" className="text-xs">Custom text colour</label>
                {useCustomCol && (
                  <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="h-6 w-10 rounded cursor-pointer border border-muted" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Overlay options */}
          <Card>
            <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground text-amber-400/60 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">Image Effects</CardTitle></CardHeader>
            <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dimCheck" checked={overlayDim} onChange={e => setOverlayDim(e.target.checked)} className="rounded" />
                <label htmlFor="dimCheck" className="text-xs">Darken background</label>
              </div>
              {overlayDim && (
                <div className="pl-5 space-y-1">
                  <label className="text-xs text-muted-foreground">Strength: {dimStrength}%</label>
                  <input type="range" min={10} max={90} value={dimStrength} onChange={e => setDimStrength(+e.target.value)} className="w-full h-1.5 accent-amber-500600" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vigCheck" checked={vignette} onChange={e => setVignette(e.target.checked)} className="rounded" />
                <label htmlFor="vigCheck" className="text-xs">Cinematic vignette</label>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Margin from edges: {paddingX}px</label>
                <input type="range" min={20} max={200} value={paddingX} onChange={e => setPaddingX(+e.target.value)} className="w-full h-1.5 accent-amber-500600" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Line spacing: {lineSpacing}x</label>
                <input type="range" min={1} max={2} step={0.05} value={lineSpacing} onChange={e => setLineSpacing(+e.target.value)} className="w-full h-1.5 accent-amber-500600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:col-span-3 space-y-3">
          <div className="aspect-video w-full rounded-xl overflow-hidden border bg-black relative">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
            {!rendered && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <p className="text-white/60 text-sm">Preview will appear here</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 bg-violet-600 hover:bg-violet-700 gap-2" onClick={downloadImage} disabled={!rendered}>
              <Zap className="h-4 w-4" />Download Title Card (1920ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ1080 PNG)
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Rendered at 1920ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ1080 ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ broadcast quality. The preview is live; changes update automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

// ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Main Page ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
export default function PreProductionPanel() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, params] = useRoute("/projects/:id/pre-production");
  const [, navigate] = useLocation();
  const projectId = Number(params?.id);
  const [activeTab, setActiveTab] = useState("vision");

  const { data: constants } = trpc.productionAssets.vision.getConstants.useQuery(undefined, { staleTime: Infinity });
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId && isAuthenticated });

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground text-amber-400" /></div>;
  if (!isAuthenticated) { window.location.href = getLoginUrl(); return null; }

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      {/* Header */}
      <div className="border-b bg-card/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/projects/" + projectId)} aria-label="Back to project">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate flex items-center gap-2 text-gold-shimmer">
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
            <TabsTrigger value="vision" className="gap-2 text-xs sm:text-sm data-[state=active]:text-amber-400">
              <Eye className="h-3.5 w-3.5" />Vision
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2 text-xs sm:text-sm data-[state=active]:text-amber-400">
              <MapPin className="h-3.5 w-3.5" />Locations
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-2 text-xs sm:text-sm data-[state=active]:text-amber-400">
              <Car className="h-3.5 w-3.5" />Vehicles
            </TabsTrigger>
            <TabsTrigger value="atmosphere" className="gap-2 text-xs sm:text-sm data-[state=active]:text-amber-400">
              <CloudSun className="h-3.5 w-3.5" />Atmosphere
            </TabsTrigger>
            <TabsTrigger value="wardrobe" className="gap-2 text-xs sm:text-sm data-[state=active]:text-amber-400">
              <Camera className="h-3.5 w-3.5" />Wardrobe
            </TabsTrigger>
            <TabsTrigger value="shotlist" className="gap-2 text-xs sm:text-sm data-[state=active]:text-amber-400">
              <Film className="h-3.5 w-3.5" />Shot List
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2 text-xs sm:text-sm data-[state=active]:text-amber-400">
              <CalendarDays className="h-3.5 w-3.5" />Schedule
            </TabsTrigger>
            <TabsTrigger value="continuity" className="gap-2 text-xs sm:text-sm data-[state=active]:text-amber-400">
              <Eye className="h-3.5 w-3.5" />Continuity
            </TabsTrigger>
            <TabsTrigger value="titlecard" className="gap-2 text-xs sm:text-sm data-[state=active]:text-amber-400">
              <Star className="h-3.5 w-3.5" />Title Cards
            </TabsTrigger>
          </TabsList>
          <TabsContent value="vision">
            <VisionTab projectId={projectId} constants={constants as unknown as Constants | null} />
          </TabsContent>
          <TabsContent value="locations">
            <LocationScoutTab projectId={projectId} constants={constants as unknown as Constants | null} />
          </TabsContent>
          <TabsContent value="vehicles">
            <VehicleRegistryTab projectId={projectId} constants={constants as unknown as Constants | null} />
          </TabsContent>
          <TabsContent value="atmosphere">
            <AtmosphereTab projectId={projectId} constants={constants as unknown as Constants | null} />
          </TabsContent>
          <TabsContent value="wardrobe">
            <WardrobeTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="shotlist">
            <ShotListTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="schedule">
            <ScheduleTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="continuity">
            <ContinuityTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="titlecard">
            <TitleCardTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
