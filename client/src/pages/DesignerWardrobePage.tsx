import { useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Shirt,
  VenetianMask,
  Crown,
  Shield,
  Wand2,
  User,
  Gem,
  ShoppingBag,
  Footprints,
  HardHat,
  Layers,
  Store,
  Sofa,
  Users,
  Sparkles,
  Eye,
  EyeOff,
  Folder,
  Package,
  Building2,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ *
 * v6.77 ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Designer Wardrobe page
 *
 * One unified page surfaced at TWO routes:
 *   /designer-wardrobe                       ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ standalone library
 *   /projects/:projectId/wardrobe            ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ project-scoped (adds the
 *                                              "Project" tab with attach/
 *                                              assignment management)
 *
 * Wardrobe is the umbrella for everything a costume / fashion / production
 * designer may upload: fashion collections, costumes, period costumes,
 * uniforms, fantasy / sci-fi outfits, character signature looks, accessories
 * (jewellery, bags, shoes, hats), fabrics / textiles, shopfront / boutique
 * displays, set dressing, and background-extra wardrobe.
 *
 * Premium dark amber-on-zinc styling consistent with ProjectBrands and the
 * rest of the studio. Free to manage ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ no credits charged on this page.
 * ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */

type WardrobeType =
  | "fashion" | "costume" | "period_costume" | "uniform" | "fantasy_sci_fi"
  | "character_signature" | "background_extra"
  | "accessory" | "jewellery" | "bag" | "shoes" | "hat"
  | "textile" | "shopfront_display" | "set_dressing"
  | "wardrobe" | "other";

interface CategoryMeta {
  id: WardrobeType;
  label: string;
  icon: typeof Shirt;
  blurb: string;
}

const ALL_CATEGORIES: CategoryMeta[] = [
  { id: "fashion",             label: "Fashion",              icon: Shirt,         blurb: "Ready-to-wear & runway looks" },
  { id: "costume",             label: "Costumes",             icon: VenetianMask,  blurb: "Theatrical & character costumes" },
  { id: "period_costume",      label: "Period",               icon: Crown,         blurb: "Era-accurate historical wardrobe" },
  { id: "uniform",             label: "Uniforms",             icon: Shield,        blurb: "Military, service, sports, school" },
  { id: "fantasy_sci_fi",      label: "Fantasy / Sci-Fi",     icon: Wand2,         blurb: "Imagined worlds & speculative looks" },
  { id: "character_signature", label: "Character Looks",      icon: User,          blurb: "Signature outfits per character" },
  { id: "accessory",           label: "Accessories",          icon: Gem,           blurb: "Belts, gloves, scarves, eyewear" },
  { id: "jewellery",           label: "Jewellery",            icon: Sparkles,      blurb: "Rings, necklaces, earrings, watches" },
  { id: "bag",                 label: "Bags",                 icon: ShoppingBag,   blurb: "Handbags, backpacks, totes, clutches" },
  { id: "shoes",               label: "Shoes",                icon: Footprints,    blurb: "Heels, boots, sneakers, sandals" },
  { id: "hat",                 label: "Hats",                 icon: HardHat,       blurb: "Caps, helmets, headpieces" },
  { id: "textile",             label: "Fabrics / Textiles",   icon: Layers,        blurb: "Bolts, swatches, prints, weaves" },
  { id: "shopfront_display",   label: "Shopfront",            icon: Store,         blurb: "Boutique & showroom display" },
  { id: "set_dressing",        label: "Set Dressing",         icon: Sofa,          blurb: "Fashion-led set dressing" },
  { id: "background_extra",    label: "Background Extras",    icon: Users,         blurb: "Crowd & extra wardrobe" },
  { id: "wardrobe",            label: "Other Wardrobe",       icon: Package,       blurb: "Anything else" },
];

const CATEGORY_BY_ID = new Map(ALL_CATEGORIES.map((c) => [c.id, c]));

const PROFILE_TYPES = [
  { value: "designer",            label: "Fashion Designer" },
  { value: "costume_designer",    label: "Costume Designer" },
  { value: "stylist",             label: "Stylist" },
  { value: "wardrobe_department", label: "Wardrobe Department" },
  { value: "brand",               label: "Brand / Label" },
  { value: "production_designer", label: "Production Designer" },
  { value: "other",               label: "Other" },
];

const COLLECTION_TYPES = [
  "wardrobe", "fashion_collection", "costume_collection",
  "period_costumes", "uniforms", "fantasy_sci_fi",
  "retail_shopfront", "textiles", "accessories",
  "set_dressing", "other",
];

const LICENSE_TYPES = [
  { value: "reference_only",  label: "Reference only" },
  { value: "editorial",       label: "Editorial use" },
  { value: "non_commercial",  label: "Non-commercial" },
  { value: "full_license",    label: "Full production license" },
  { value: "custom",          label: "Custom (see notes)" },
];

const VISIBILITY_OPTIONS = [
  { value: "public",       label: "Public ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ listed in browse" },
  { value: "unlisted",     label: "Unlisted ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ link only" },
  { value: "project_only", label: "This project only" },
  { value: "private",      label: "Private ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ only me" },
];

/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Item form state ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */

interface ItemForm {
  name: string;
  description: string;
  wardrobeType: WardrobeType;
  subcategory: string;
  era: string;
  colors: string;       // comma-separated
  materials: string;    // comma-separated
  styleTags: string;    // comma-separated
  primaryImageUrl: string;
  referencePrompt: string;
  characterWardrobeAllowed: boolean;
  costumeUseAllowed: boolean;
  shopfrontPlacementAllowed: boolean;
  brandPlacementAllowed: boolean;
  commercialUseAllowed: boolean;
  licenseType: string;
  visibility: string;
  collectionId: string; // "" or id
  projectId: string;    // "" or id (defaults to current project)
}

const emptyItem: ItemForm = {
  name: "", description: "", wardrobeType: "wardrobe",
  subcategory: "", era: "",
  colors: "", materials: "", styleTags: "",
  primaryImageUrl: "", referencePrompt: "",
  characterWardrobeAllowed: true, costumeUseAllowed: true,
  shopfrontPlacementAllowed: true, brandPlacementAllowed: false,
  commercialUseAllowed: false,
  licenseType: "reference_only",
  visibility: "public",
  collectionId: "", projectId: "",
};

function csvToArr(s: string): string[] | undefined {
  const arr = s.split(",").map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Profile form state ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */

interface ProfileForm {
  brandName: string;
  displayName: string;
  profileType: string;
  bio: string;
  website: string;
  instagram: string;
  contactEmail: string;
  logoUrl: string;
  visibility: "public" | "private" | "unlisted";
}

const emptyProfile: ProfileForm = {
  brandName: "", displayName: "", profileType: "designer",
  bio: "", website: "", instagram: "", contactEmail: "",
  logoUrl: "", visibility: "public",
};

/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Collection form state ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */

interface CollectionForm {
  name: string;
  description: string;
  collectionType: string;
  season: string;
  year: string;
  styleTags: string;
  coverImageUrl: string;
  visibility: "public" | "private" | "unlisted";
  licenseType: string;
  licenseNotes: string;
}

const emptyCollection: CollectionForm = {
  name: "", description: "", collectionType: "wardrobe",
  season: "", year: "", styleTags: "", coverImageUrl: "",
  visibility: "public", licenseType: "reference_only", licenseNotes: "",
};

/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */

export default function DesignerWardrobePage() {
  const params = useParams<{ projectId?: string }>();
  const projectId = params.projectId ? Number(params.projectId) : undefined;
  const inProjectMode = typeof projectId === "number" && Number.isFinite(projectId);

  const utils = trpc.useUtils();

  /* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Queries ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */
  const profileQ = trpc.designerWardrobe.getMyProfile.useQuery();
  const myItemsQ = trpc.designerWardrobe.listWardrobeItems.useQuery({ scope: "mine", limit: 200 });
  const publicItemsQ = trpc.designerWardrobe.listWardrobeItems.useQuery({ scope: "public", limit: 200 });
  const collectionsQ = trpc.designerWardrobe.listCollections.useQuery({ scope: "all", limit: 120 });
  const projectQ = trpc.project.get.useQuery(
    { id: projectId as number },
    { enabled: inProjectMode },
  );
  const projectAssignmentsQ = trpc.designerWardrobe.listAssignmentsForProject.useQuery(
    { projectId: projectId as number },
    { enabled: inProjectMode },
  );
  const projectCharsQ = trpc.character.listByProject.useQuery(
    { projectId: projectId as number },
    { enabled: inProjectMode },
  );
  const projectScenesQ = trpc.scene.listByProject.useQuery(
    { projectId: projectId as number },
    { enabled: inProjectMode },
  );

  /* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Mutations ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */
  const upsertProfile = trpc.designerWardrobe.upsertProfile.useMutation({
    onSuccess: () => {
      utils.designerWardrobe.getMyProfile.invalidate();
      toast.success("Profile saved");
      setProfileOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const createCollection = trpc.designerWardrobe.createCollection.useMutation({
    onSuccess: () => {
      utils.designerWardrobe.listCollections.invalidate();
      toast.success("Collection created");
      setCollectionOpen(false);
      setCollectionForm(emptyCollection);
    },
    onError: (e) => toast.error(e.message),
  });
  const createItem = trpc.designerWardrobe.createWardrobeItem.useMutation({
    onSuccess: () => {
      utils.designerWardrobe.listWardrobeItems.invalidate();
      toast.success("Wardrobe item added");
      setItemOpen(false);
      setItemForm(emptyItem);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteItem = trpc.designerWardrobe.deleteWardrobeItem.useMutation({
    onSuccess: () => {
      utils.designerWardrobe.listWardrobeItems.invalidate();
      toast.success("Item removed");
    },
    onError: (e) => toast.error(e.message),
  });
  const attachToCharacter = trpc.designerWardrobe.attachToCharacter.useMutation({
    onSuccess: () => {
      utils.designerWardrobe.listAssignmentsForProject.invalidate();
      toast.success("Attached to character");
      setAttachOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const attachToScene = trpc.designerWardrobe.attachToScene.useMutation({
    onSuccess: () => {
      utils.designerWardrobe.listAssignmentsForProject.invalidate();
      toast.success("Attached to scene");
      setAttachOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const removeAssignment = trpc.designerWardrobe.removeAssignment.useMutation({
    onSuccess: () => {
      utils.designerWardrobe.listAssignmentsForProject.invalidate();
      toast.success("Removed from project");
    },
    onError: (e) => toast.error(e.message),
  });

  /* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Local state ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */
  const [tab, setTab] = useState<string>(inProjectMode ? "project" : "browse");
  const [browseFilter, setBrowseFilter] = useState<WardrobeType | "all">("all");

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfile);

  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionForm, setCollectionForm] = useState<CollectionForm>(emptyCollection);

  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItem);

  const [attachOpen, setAttachOpen] = useState(false);
  const [attachItem, setAttachItem] = useState<any | null>(null);
  const [attachKind, setAttachKind] = useState<"character" | "scene">("character");
  const [attachCharId, setAttachCharId] = useState<string>("");
  const [attachSceneId, setAttachSceneId] = useState<string>("");
  const [attachUsage, setAttachUsage] = useState<string>("reference");
  const [attachAssignType, setAttachAssignType] = useState<string>("character_wardrobe");
  const [attachNotes, setAttachNotes] = useState<string>("");

  /* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Derived ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */
  const myItems = myItemsQ.data ?? [];
  const publicItems = publicItemsQ.data ?? [];
  const collections = collectionsQ.data ?? [];
  const profile = profileQ.data ?? null;

  const browseItems = useMemo(() => {
    const list = publicItems;
    if (browseFilter === "all") return list;
    return list.filter((it: any) => it.wardrobeType === browseFilter);
  }, [publicItems, browseFilter]);

  const myCollections = useMemo(
    () => collections.filter((c: any) => c.userId === (profile as any)?.userId),
    [collections, profile],
  );

  /* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Handlers ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */
  const openEditProfile = () => {
    if (profile) {
      setProfileForm({
        brandName: profile.brandName ?? "",
        displayName: profile.displayName ?? "",
        profileType: profile.profileType ?? "designer",
        bio: profile.bio ?? "",
        website: profile.website ?? "",
        instagram: profile.instagram ?? "",
        contactEmail: profile.contactEmail ?? "",
        logoUrl: profile.logoUrl ?? "",
        visibility: (profile.visibility as any) ?? "public",
      });
    } else {
      setProfileForm(emptyProfile);
    }
    setProfileOpen(true);
  };

  const submitProfile = () => {
    if (!profileForm.brandName.trim()) {
      toast.error("Brand / studio name is required");
      return;
    }
    upsertProfile.mutate({
      brandName: profileForm.brandName.trim(),
      displayName: profileForm.displayName.trim() || undefined,
      profileType: profileForm.profileType as any,
      bio: profileForm.bio.trim() || undefined,
      website: profileForm.website.trim() || undefined,
      instagram: profileForm.instagram.trim() || undefined,
      contactEmail: profileForm.contactEmail.trim() || undefined,
      logoUrl: profileForm.logoUrl.trim() || undefined,
      visibility: profileForm.visibility,
    });
  };

  const submitCollection = () => {
    if (!collectionForm.name.trim()) {
      toast.error("Collection name is required");
      return;
    }
    createCollection.mutate({
      name: collectionForm.name.trim(),
      description: collectionForm.description.trim() || undefined,
      collectionType: collectionForm.collectionType as any,
      season: collectionForm.season.trim() || undefined,
      year: collectionForm.year.trim() ? Number(collectionForm.year) : undefined,
      styleTags: csvToArr(collectionForm.styleTags),
      coverImageUrl: collectionForm.coverImageUrl.trim() || undefined,
      visibility: collectionForm.visibility,
      licenseType: collectionForm.licenseType as any,
      licenseNotes: collectionForm.licenseNotes.trim() || undefined,
    });
  };

  const submitItem = () => {
    if (!itemForm.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    createItem.mutate({
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || undefined,
      wardrobeType: itemForm.wardrobeType,
      subcategory: itemForm.subcategory.trim() || undefined,
      era: itemForm.era.trim() || undefined,
      colors: csvToArr(itemForm.colors),
      materials: csvToArr(itemForm.materials),
      styleTags: csvToArr(itemForm.styleTags),
      primaryImageUrl: itemForm.primaryImageUrl.trim() || undefined,
      imageUrls: itemForm.primaryImageUrl.trim() ? [itemForm.primaryImageUrl.trim()] : undefined,
      referencePrompt: itemForm.referencePrompt.trim() || undefined,
      characterWardrobeAllowed: itemForm.characterWardrobeAllowed,
      costumeUseAllowed: itemForm.costumeUseAllowed,
      shopfrontPlacementAllowed: itemForm.shopfrontPlacementAllowed,
      brandPlacementAllowed: itemForm.brandPlacementAllowed,
      commercialUseAllowed: itemForm.commercialUseAllowed,
      licenseType: itemForm.licenseType as any,
      visibility: itemForm.visibility as any,
      collectionId: itemForm.collectionId ? Number(itemForm.collectionId) : undefined,
      projectId: itemForm.projectId
        ? Number(itemForm.projectId)
        : (inProjectMode && (itemForm.visibility === "project_only" || itemForm.visibility === "private"))
          ? projectId
          : undefined,
    });
  };

  const openAttach = (item: any) => {
    if (!inProjectMode) {
      toast.error("Open this page from a project to attach wardrobe.");
      return;
    }
    setAttachItem(item);
    setAttachKind("character");
    setAttachCharId("");
    setAttachSceneId("");
    setAttachUsage("reference");
    setAttachAssignType("character_wardrobe");
    setAttachNotes("");
    setAttachOpen(true);
  };

  const submitAttach = () => {
    if (!attachItem || !inProjectMode) return;
    if (attachKind === "character") {
      if (!attachCharId) { toast.error("Pick a character"); return; }
      attachToCharacter.mutate({
        projectId: projectId!,
        characterId: Number(attachCharId),
        wardrobeItemId: attachItem.id,
        assignmentType: attachAssignType as any,
        usageMode: attachUsage as any,
        placementNotes: attachNotes.trim() || undefined,
        promptWeight: 60,
      });
    } else {
      if (!attachSceneId) { toast.error("Pick a scene"); return; }
      attachToScene.mutate({
        projectId: projectId!,
        sceneId: Number(attachSceneId),
        wardrobeItemId: attachItem.id,
        assignmentType: attachAssignType as any,
        usageMode: attachUsage as any,
        placementNotes: attachNotes.trim() || undefined,
        promptWeight: 60,
      });
    }
  };

  /* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Renderers ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */

  const renderItemCard = (it: any, opts?: { showAttach?: boolean; showDelete?: boolean }) => {
    const meta = CATEGORY_BY_ID.get(it.wardrobeType as WardrobeType);
    const Icon = meta?.icon ?? Package;
    return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <Card key={it.id} className="bg-zinc-900/40 border-zinc-800 overflow-hidden flex flex-col glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
        <div className="aspect-[4/5] bg-zinc-950 relative overflow-hidden">
          {it.primaryImageUrl ? (
            <img
              src={it.primaryImageUrl}
              alt={it.name}
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="w-14 h-14 text-zinc-700" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className="bg-zinc-950/80 text-amber-200 border-amber-700/40 text-[10px]">
              <Icon className="w-3 h-3 mr-1" />
              {meta?.label ?? it.wardrobeType}
            </Badge>
          </div>
          {it.visibility !== "public" ? (
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className="bg-zinc-950/80 text-zinc-300 border-amber-500/20 text-[10px]">
                <EyeOff className="w-3 h-3 mr-1" />
                {it.visibility}
              </Badge>
            </div>
          ) : null}
        </div>
        <CardContent className="p-3 flex-1 flex flex-col glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <div className="font-medium text-sm truncate">{it.name}</div>
          {it.subcategory ? (
            <div className="text-xs text-zinc-500 truncate">{it.subcategory}</div>
          ) : null}
          {it.description ? (
            <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{it.description}</div>
          ) : null}
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {it.era ? (
              <Badge variant="outline" className="bg-zinc-800/40 text-zinc-300 border-amber-500/20 text-[10px]">
                {it.era}
              </Badge>
            ) : null}
            {Array.isArray(it.styleTags) && it.styleTags.slice(0, 2).map((t: string) => (
              <Badge key={t} variant="outline" className="bg-zinc-800/40 text-zinc-300 border-zinc-700 text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
          <div className="mt-auto pt-3 flex items-center gap-2">
            {opts?.showAttach !== false && inProjectMode ? (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black flex-1"
                onClick={() => openAttach(it)}
              >
                <Link2 className="w-3 h-3 mr-1" /> Attach
              </Button>
            ) : null}
            {opts?.showDelete ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-rose-400 hover:text-rose-300"
                onClick={() => {
                  if (confirm(`Remove "${it.name}"?`)) deleteItem.mutate({ id: it.id });
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderItemSkeletons = (n: number) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/5] bg-zinc-900" />
      ))}
    </div>
  );

  /* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Page ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top nav */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          {inProjectMode ? (
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center text-sm text-zinc-400 hover:text-amber-300"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to project
            </Link>
          ) : (
            <Link
              href={`/dashboard`}
              className="inline-flex items-center text-sm text-zinc-400 hover:text-amber-300"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to dashboard
            </Link>
          )}

          <div className="flex items-center gap-2">
            {profile ? (
              <button
                onClick={openEditProfile}
                className="inline-flex items-center gap-2 rounded-md border border-amber-700/40 bg-zinc-900/40 px-3 py-1.5 text-xs hover:border-amber-500 transition-colors"
              >
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt="" className="w-5 h-5 rounded object-cover" />
                ) : (
                  <Building2 className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-amber-200 font-medium">{profile.brandName}</span>
                <span className="text-zinc-500">ÃÂÃÂÃÂÃÂ·</span>
                <span className="text-zinc-400">{profile.profileType?.replace(/_/g, " ")}</span>
                <Pencil className="w-3 h-3 text-zinc-500" />
              </button>
            ) : (
              <Button
                size="sm"
                onClick={openEditProfile}
                className="bg-amber-500 hover:bg-amber-400 text-black"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Set up your designer profile
              </Button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2 gradient-text-gold">
            <Shirt className="w-7 h-7 text-amber-400" />
            Designer Wardrobe
            {inProjectMode && projectQ.data?.title ? (
              <span className="text-zinc-500 font-normal">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ {projectQ.data.title}</span>
            ) : null}
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
            A premium library of fashion, costumes, period wardrobe, uniforms,
            fantasy & sci-fi outfits, character looks, accessories (jewellery,
            bags, shoes, hats), fabrics, shopfront / boutique displays,
            background-extra wardrobe, and fashion-led set dressing.
            {inProjectMode
              ? " Browse, then attach items to characters or scenes ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ the AI will read every attachment when generating shots."
              : " Build your designer presence, organize collections, and publish wardrobe references for productions to use."}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Free to manage ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ no credits charged on this page.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-zinc-900/60 border border-zinc-800">
            <TabsTrigger value="browse" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Eye className="w-4 h-4 mr-1" /> Browse Library
            </TabsTrigger>
            <TabsTrigger value="mine" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Package className="w-4 h-4 mr-1" /> My Items
            </TabsTrigger>
            <TabsTrigger value="collections" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Folder className="w-4 h-4 mr-1" /> My Collections
            </TabsTrigger>
            {inProjectMode ? (
              <TabsTrigger value="project" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                <Link2 className="w-4 h-4 mr-1" /> Project Wardrobe
              </TabsTrigger>
            ) : null}
          </TabsList>

          {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Browse ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
          <TabsContent value="browse" className="mt-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setBrowseFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  browseFilter === "all"
                    ? "bg-amber-500 text-black border-amber-500"
                    : "bg-zinc-900/40 text-zinc-300 border-zinc-800 hover:border-amber-700/60"
                }`}
              >
                All
              </button>
              {ALL_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = browseFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setBrowseFilter(c.id)}
                    title={c.blurb}
                    className={`px-3 py-1.5 rounded-full text-xs border inline-flex items-center gap-1 transition-colors ${
                      active
                        ? "bg-amber-500 text-black border-amber-500"
                        : "bg-zinc-900/40 text-zinc-300 border-zinc-800 hover:border-amber-700/60"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {c.label}
                  </button>
                );
              })}
            </div>

            {publicItemsQ.isLoading ? (
              renderItemSkeletons(8)
            ) : browseItems.length === 0 ? (
              <Card className="bg-zinc-900/40 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardContent className="p-10 text-center glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <Shirt className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
                  <h3 className="text-lg font-medium mb-1 gradient-text-gold">Nothing in this category yet</h3>
                  <p className="text-sm text-zinc-400 max-w-md mx-auto">
                    Be the first to publish wardrobe to the public library ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ open
                    My Items and add a new piece, then set its visibility to Public.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {browseItems.map((it: any) => renderItemCard(it))}
              </div>
            )}
          </TabsContent>

          {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ My Items ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
          <TabsContent value="mine" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-zinc-400">
                {myItems.length} item{myItems.length === 1 ? "" : "s"} in your wardrobe
              </div>
              <Button
                onClick={() => { setItemForm(emptyItem); setItemOpen(true); }}
                className="bg-amber-500 hover:bg-amber-400 text-black"
              >
                <Plus className="w-4 h-4 mr-1" /> Add item
              </Button>
            </div>
            {myItemsQ.isLoading ? (
              renderItemSkeletons(4)
            ) : myItems.length === 0 ? (
              <Card className="bg-zinc-900/40 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardContent className="p-10 text-center glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <Package className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
                  <h3 className="text-lg font-medium mb-1 gradient-text-gold">Your wardrobe is empty</h3>
                  <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">
                    Add fashion pieces, costumes, accessories, fabrics ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ anything
                    a director might dress a character or a shop window with.
                  </p>
                  <Button
                    onClick={() => { setItemForm(emptyItem); setItemOpen(true); }}
                    className="bg-amber-500 hover:bg-amber-400 text-black"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add your first item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {myItems.map((it: any) => renderItemCard(it, { showAttach: inProjectMode, showDelete: true }))}
              </div>
            )}
          </TabsContent>

          {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Collections ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
          <TabsContent value="collections" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-zinc-400">
                {myCollections.length} collection{myCollections.length === 1 ? "" : "s"}
              </div>
              <Button
                onClick={() => { setCollectionForm(emptyCollection); setCollectionOpen(true); }}
                disabled={!profile}
                title={!profile ? "Set up your designer profile first" : ""}
                className="bg-amber-500 hover:bg-amber-400 text-black"
              >
                <Plus className="w-4 h-4 mr-1" /> New collection
              </Button>
            </div>
            {!profile ? (
              <Card className="bg-zinc-900/40 border-amber-800/40 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardContent className="p-6 text-sm text-amber-200 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  Set up your designer profile first ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ it becomes the byline on
                  every collection you publish.
                </CardContent>
              </Card>
            ) : collectionsQ.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Skeleton className="h-40 bg-zinc-900" />
                <Skeleton className="h-40 bg-zinc-900" />
                <Skeleton className="h-40 bg-zinc-900" />
              </div>
            ) : myCollections.length === 0 ? (
              <Card className="bg-zinc-900/40 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardContent className="p-10 text-center glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <Folder className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
                  <h3 className="text-lg font-medium mb-1 gradient-text-gold">No collections yet</h3>
                  <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">
                    Group your wardrobe into collections ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ a season, a costume
                    set for a film, a shopfront capsule, a textile catalogue.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {myCollections.map((c: any) => (
                  <Card key={c.id} className="bg-zinc-900/40 border-zinc-800 overflow-hidden glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                    <div className="aspect-[16/9] bg-zinc-950 relative overflow-hidden">
                      {c.coverImageUrl ? (
                        <img src={c.coverImageUrl} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Folder className="w-10 h-10 text-zinc-700" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-zinc-500">{c.collectionType?.replace(/_/g, " ")}{c.season ? ` ÃÂÃÂÃÂÃÂ· ${c.season}` : ""}{c.year ? ` ÃÂÃÂÃÂÃÂ· ${c.year}` : ""}</div>
                      {c.description ? (
                        <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{c.description}</div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Project Wardrobe ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
          {inProjectMode ? (
            <TabsContent value="project" className="mt-4">
              <div className="mb-2 text-sm text-zinc-400">
                Wardrobe attached to this project ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ every attachment is fed to the
                AI when it generates the matching scene or character.
              </div>
              {projectAssignmentsQ.isLoading ? (
                <Skeleton className="h-32 bg-zinc-900" />
              ) : (projectAssignmentsQ.data ?? []).length === 0 ? (
                <Card className="bg-zinc-900/40 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <CardContent className="p-10 text-center glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                    <Link2 className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
                    <h3 className="text-lg font-medium mb-1 gradient-text-gold">No wardrobe attached yet</h3>
                    <p className="text-sm text-zinc-400 max-w-md mx-auto">
                      Open <span className="text-amber-300">Browse Library</span> or{" "}
                      <span className="text-amber-300">My Items</span> and click
                      <span className="text-amber-300"> Attach</span> on any piece
                      to dress a character or set a scene.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {(projectAssignmentsQ.data ?? []).map((a: any) => {
                    const item = a.item;
                    const meta = item ? CATEGORY_BY_ID.get(item.wardrobeType as WardrobeType) : null;
                    const Icon = meta?.icon ?? Package;
                    const charName = a.characterId
                      ? (projectCharsQ.data?.find((c: any) => c.id === a.characterId)?.name ?? `Character #${a.characterId}`)
                      : null;
                    const sceneRef = a.sceneId
                      ? (projectScenesQ.data?.find((s: any) => s.id === a.sceneId))
                      : null;
                    return (
                      <Card key={a.id} className="bg-zinc-900/40 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                        <CardContent className="p-3 flex items-center gap-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                          <div className="w-14 h-14 rounded bg-zinc-950 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item?.primaryImageUrl ? (
                              <img src={item.primaryImageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Icon className="w-6 h-6 text-zinc-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{item?.name ?? "Unknown item"}</span>
                              <Badge variant="outline" className="bg-zinc-800/40 text-zinc-300 border-amber-500/20 text-[10px]">
                                {a.assignmentType.replace(/_/g, " ")}
                              </Badge>
                              <Badge variant="outline" className="bg-amber-900/30 text-amber-200 border-amber-700/40 text-[10px]">
                                {a.usageMode.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5">
                              {charName ? `Character: ${charName}` : null}
                              {sceneRef ? `Scene #${sceneRef.sceneNumber ?? sceneRef.id}${sceneRef.title ? ` ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ${sceneRef.title}` : ""}` : null}
                            </div>
                            {a.placementNotes ? (
                              <div className="text-xs text-zinc-400 mt-1 line-clamp-1">{a.placementNotes}</div>
                            ) : null}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-400 hover:text-rose-300"
                            onClick={() => {
                              if (confirm("Detach this wardrobe from the project?")) removeAssignment.mutate({ id: a.id });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Profile dialog ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">{profile ? "Edit designer profile" : "Set up your designer profile"}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Your profile is the byline on collections and items you publish to
              the wardrobe library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-zinc-300">Brand / studio name *</Label>
              <Input
                value={profileForm.brandName}
                onChange={(e) => setProfileForm((f) => ({ ...f, brandName: e.target.value }))}
                placeholder="e.g. Maison Aurora, Atelier 12, Costume Hall"
                className="bg-zinc-950 border-zinc-800 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Display name</Label>
                <Input
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="optional"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Profile type</Label>
                <Select
                  value={profileForm.profileType}
                  onValueChange={(v) => setProfileForm((f) => ({ ...f, profileType: v }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                    {PROFILE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Bio</Label>
              <Textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="What you make, who you dress, where you're based"
                className="bg-zinc-950 border-zinc-800 mt-1 min-h-[70px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Website</Label>
                <Input
                  value={profileForm.website}
                  onChange={(e) => setProfileForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Instagram</Label>
                <Input
                  value={profileForm.instagram}
                  onChange={(e) => setProfileForm((f) => ({ ...f, instagram: e.target.value }))}
                  placeholder="@handle"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Contact email</Label>
                <Input
                  value={profileForm.contactEmail}
                  onChange={(e) => setProfileForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="hello@studio.com"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Logo URL</Label>
                <Input
                  value={profileForm.logoUrl}
                  onChange={(e) => setProfileForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Visibility</Label>
              <Select
                value={profileForm.visibility}
                onValueChange={(v) => setProfileForm((f) => ({ ...f, visibility: v as any }))}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProfileOpen(false)}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-black"
              onClick={submitProfile}
              disabled={upsertProfile.isPending}
            >
              Save profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Collection dialog ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Dialog open={collectionOpen} onOpenChange={setCollectionOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">New collection</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Group wardrobe into a season, a film's costume set, a shopfront
              capsule, or a textile catalogue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-zinc-300">Name *</Label>
              <Input
                value={collectionForm.name}
                onChange={(e) => setCollectionForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. SS27, The Lighthouse ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Costumes"
                className="bg-zinc-950 border-zinc-800 mt-1"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Description</Label>
              <Textarea
                value={collectionForm.description}
                onChange={(e) => setCollectionForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-zinc-950 border-zinc-800 mt-1 min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label className="text-zinc-300">Type</Label>
                <Select
                  value={collectionForm.collectionType}
                  onValueChange={(v) => setCollectionForm((f) => ({ ...f, collectionType: v }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                    {COLLECTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-300">Season</Label>
                <Input
                  value={collectionForm.season}
                  onChange={(e) => setCollectionForm((f) => ({ ...f, season: e.target.value }))}
                  placeholder="SS27"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Year</Label>
                <Input
                  value={collectionForm.year}
                  onChange={(e) => setCollectionForm((f) => ({ ...f, year: e.target.value }))}
                  inputMode="numeric"
                  placeholder="2027"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Style tags (comma-separated)</Label>
              <Input
                value={collectionForm.styleTags}
                onChange={(e) => setCollectionForm((f) => ({ ...f, styleTags: e.target.value }))}
                placeholder="minimalist, baroque, streetwear"
                className="bg-zinc-950 border-zinc-800 mt-1"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Cover image URL</Label>
              <Input
                value={collectionForm.coverImageUrl}
                onChange={(e) => setCollectionForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                placeholder="https://"
                className="bg-zinc-950 border-zinc-800 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Visibility</Label>
                <Select
                  value={collectionForm.visibility}
                  onValueChange={(v) => setCollectionForm((f) => ({ ...f, visibility: v as any }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-300">License</Label>
                <Select
                  value={collectionForm.licenseType}
                  onValueChange={(v) => setCollectionForm((f) => ({ ...f, licenseType: v }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                    {LICENSE_TYPES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">License notes</Label>
              <Textarea
                value={collectionForm.licenseNotes}
                onChange={(e) => setCollectionForm((f) => ({ ...f, licenseNotes: e.target.value }))}
                placeholder="Any usage restrictions productions should respect"
                className="bg-zinc-950 border-zinc-800 mt-1 min-h-[50px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCollectionOpen(false)}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-black"
              onClick={submitCollection}
              disabled={createCollection.isPending}
            >
              Create collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Item dialog ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">Add wardrobe item</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Anything a director might dress a character, set, or extra with ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
              from a couture gown to a single hat to a roll of fabric.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Name *</Label>
                <Input
                  value={itemForm.name}
                  onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Category</Label>
                <Select
                  value={itemForm.wardrobeType}
                  onValueChange={(v) => setItemForm((f) => ({ ...f, wardrobeType: v as WardrobeType }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800 max-h-72">
                    {ALL_CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Subcategory</Label>
                <Input
                  value={itemForm.subcategory}
                  onChange={(e) => setItemForm((f) => ({ ...f, subcategory: e.target.value }))}
                  placeholder="e.g. trench coat, signet ring, silk crepe"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Era</Label>
                <Input
                  value={itemForm.era}
                  onChange={(e) => setItemForm((f) => ({ ...f, era: e.target.value }))}
                  placeholder="1920s, contemporary, far-future"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Description</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-zinc-950 border-zinc-800 mt-1 min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-zinc-300">Colors</Label>
                <Input
                  value={itemForm.colors}
                  onChange={(e) => setItemForm((f) => ({ ...f, colors: e.target.value }))}
                  placeholder="ivory, burgundy"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Materials</Label>
                <Input
                  value={itemForm.materials}
                  onChange={(e) => setItemForm((f) => ({ ...f, materials: e.target.value }))}
                  placeholder="silk, leather, brass"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Style tags</Label>
                <Input
                  value={itemForm.styleTags}
                  onChange={(e) => setItemForm((f) => ({ ...f, styleTags: e.target.value }))}
                  placeholder="minimalist, baroque"
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Primary image URL</Label>
              <Input
                value={itemForm.primaryImageUrl}
                onChange={(e) => setItemForm((f) => ({ ...f, primaryImageUrl: e.target.value }))}
                placeholder="https://"
                className="bg-zinc-950 border-zinc-800 mt-1"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Reference prompt for the AI</Label>
              <Textarea
                value={itemForm.referencePrompt}
                onChange={(e) => setItemForm((f) => ({ ...f, referencePrompt: e.target.value }))}
                placeholder="Concise visual description used when this item is attached to a scene or character."
                className="bg-zinc-950 border-zinc-800 mt-1 min-h-[60px]"
              />
            </div>

            <div className="border-t border-zinc-800 pt-3">
              <Label className="text-zinc-300 text-xs uppercase tracking-wider">Usage permissions</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {([
                  ["characterWardrobeAllowed", "Character wardrobe OK"],
                  ["costumeUseAllowed",       "Costume use OK"],
                  ["shopfrontPlacementAllowed","Shopfront / set OK"],
                  ["brandPlacementAllowed",   "Brand label may be visible"],
                  ["commercialUseAllowed",    "Commercial production OK"],
                ] as const).map(([k, label]) => (
                  <div key={k} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded px-3 py-2">
                    <span className="text-xs text-zinc-300">{label}</span>
                    <Switch
                      checked={(itemForm as any)[k]}
                      onCheckedChange={(v) => setItemForm((f) => ({ ...f, [k]: v } as any))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">License</Label>
                <Select
                  value={itemForm.licenseType}
                  onValueChange={(v) => setItemForm((f) => ({ ...f, licenseType: v }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                    {LICENSE_TYPES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-300">Visibility</Label>
                <Select
                  value={itemForm.visibility}
                  onValueChange={(v) => setItemForm((f) => ({ ...f, visibility: v }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                    {VISIBILITY_OPTIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {myCollections.length > 0 ? (
              <div>
                <Label className="text-zinc-300">Add to collection (optional)</Label>
                <Select
                  value={itemForm.collectionId || "none"}
                  onValueChange={(v) => setItemForm((f) => ({ ...f, collectionId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                    <SelectItem value="none">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ None ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</SelectItem>
                    {myCollections.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setItemOpen(false)}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-black"
              onClick={submitItem}
              disabled={createItem.isPending}
            >
              Add to wardrobe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Attach dialog ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">Attach to project</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Where should the AI use <span className="text-amber-300">{attachItem?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setAttachKind("character"); setAttachAssignType("character_wardrobe"); }}
                className={`px-3 py-2 rounded border text-sm ${
                  attachKind === "character"
                    ? "bg-amber-500 text-black border-amber-500"
                    : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-amber-700/60"
                }`}
              >
                <User className="w-4 h-4 inline mr-1" /> Character
              </button>
              <button
                onClick={() => { setAttachKind("scene"); setAttachAssignType("scene_set_dressing"); }}
                className={`px-3 py-2 rounded border text-sm ${
                  attachKind === "scene"
                    ? "bg-amber-500 text-black border-amber-500"
                    : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-amber-700/60"
                }`}
              >
                <Sofa className="w-4 h-4 inline mr-1" /> Scene
              </button>
            </div>

            {attachKind === "character" ? (
              <>
                <div>
                  <Label className="text-zinc-300">Character</Label>
                  <Select value={attachCharId} onValueChange={setAttachCharId}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                      <SelectValue placeholder="Pick a character" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                      {(projectCharsQ.data ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-300">Type</Label>
                  <Select value={attachAssignType} onValueChange={setAttachAssignType}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                      <SelectItem value="character_wardrobe">Everyday wardrobe</SelectItem>
                      <SelectItem value="character_costume">Costume (period / special)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-zinc-300">Scene</Label>
                  <Select value={attachSceneId} onValueChange={setAttachSceneId}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                      <SelectValue placeholder="Pick a scene" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800 max-h-72">
                      {(projectScenesQ.data ?? []).map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          Scene {s.sceneNumber ?? s.id}{s.title ? ` ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ${s.title}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-300">Type</Label>
                  <Select value={attachAssignType} onValueChange={setAttachAssignType}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                      <SelectItem value="scene_set_dressing">Set dressing</SelectItem>
                      <SelectItem value="shopfront_display">Shopfront / boutique display</SelectItem>
                      <SelectItem value="background_extra">Background extra wardrobe</SelectItem>
                      <SelectItem value="mood_reference">Mood reference</SelectItem>
                      <SelectItem value="period_reference">Period reference</SelectItem>
                      <SelectItem value="uniform_reference">Uniform reference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label className="text-zinc-300">Usage mode</Label>
              <Select value={attachUsage} onValueChange={setAttachUsage}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="must_match">Must match exactly</SelectItem>
                  <SelectItem value="inspired_by">Inspired by</SelectItem>
                  <SelectItem value="costume_accurate">Costume accurate</SelectItem>
                  <SelectItem value="period_accurate">Period accurate</SelectItem>
                  <SelectItem value="background_only">Background only</SelectItem>
                  <SelectItem value="brand_visible">Brand may be visible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-zinc-300">Placement notes</Label>
              <Textarea
                value={attachNotes}
                onChange={(e) => setAttachNotes(e.target.value)}
                placeholder="e.g. only in the cafe scene, worn open over the white shirt"
                className="bg-zinc-950 border-zinc-800 mt-1 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAttachOpen(false)}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-black"
              onClick={submitAttach}
              disabled={attachToCharacter.isPending || attachToScene.isPending}
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
