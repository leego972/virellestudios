/**
 * lamalo-seed.ts  — Lamalo Fashion · Virelle Studios in-house brand
 * 26 collections · 1 400+ items
 *
 * Rules:
 *  - Every color variant = a separate purchasable item (white tee ≠ black tee)
 *  - Every base item has ≥ 7 color options
 *  - Price ≈ 10% of Kmart AUD retail prices (per-category, auto-calculated)
 *  - Collection bundle = sum of item prices × 0.90  (10 % discount, auto-calculated)
 *  - No lease price — one purchase, use forever across all projects/scenes
 *  - Seed is additive: skips collections that already exist by name
 */

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { designerProfiles, designerCollections, wardrobeItems } from "../drizzle/schema";
import { logger } from "./_core/logger";

const log = logger.child({ module: "lamalo-seed" });

// ─── Pricing — ~10 % of Kmart AUD retail prices ─────────────────────────────
// (image-only virtual wardrobe items, not physical goods)

const CAT_PRICE: Record<string, number> = {
  "tops":        100,   // $1.00 — tees, polos, shirts, hoodies, tanks
  "bottoms":     250,   // $2.50 — jeans, chinos, trousers, joggers
  "outerwear":   350,   // $3.50 — jackets, coats, blazers
  "dresses":     200,   // $2.00 — dresses, jumpsuits
  "swimwear":    150,   // $1.50 — bikinis, one-pieces, boardshorts
  "footwear":    300,   // $3.00 — sneakers, boots, sandals, heels
  "accessories": 100,   // $1.00 — hats, belts, scarves, jewellery
  "watches":     150,   // $1.50 — men's and women's watches
  "eyewear":     100,   // $1.00 — sunglasses and frames
  "bags":        200,   // $2.00 — totes, crossbodies, clutches, duffels
  "suits":       500,   // $5.00 — suit jackets, blazers, formal separates
  "uniforms":    300,   // $3.00 — professional / costume uniforms
  "knitwear":    200,   // $2.00 — merino, cardigans, sweaters
  "lingerie":    100,   // $1.00 — underwear, bralettes, sleepwear basics
  "sleepwear":   100,   // $1.00 — pyjamas, nightgowns, robes
};

/** Return retail price (AUD cents) for a category, default $1.00 */
function itemPrice(category: string): number {
  return CAT_PRICE[category.toLowerCase()] ?? 100;
}

/** 15 % off when buying the whole collection */
function cp(items: SeedItem[]): number {
  return Math.floor(items.reduce((sum, i) => sum + i.retailPriceAud, 0) * 0.90);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeedItem {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  genderFit: string;
  colors: string[];
  materials: string[];
  styleTags: string[];
  retailPriceAud: number;
  referencePrompt: string;
  primaryImageUrl?: string | null;
  sizeRange?: string;
}

interface BaseItem {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  genderFit: string;
  materials: string[];
  styleTags: string[];
  referencePrompt: string;
  primaryImageUrl?: string | null;
  sizeRange?: string;
}

interface SeedCollection {
  name: string;
  description: string;
  collectionType: string;
  season: string;
  year: number;
  styleTags: string[];
  collectionPriceAud: number;
  items: SeedItem[];
}

// ─── Helper: expand one base item into one item per color ────────────────────
// Auto-prices by category. Hard-capped at 5 colours per item.

function pollinationsUrl(prompt: string): string {
    const encoded = prompt
      .replace(/ /g, "%20").replace(/,/g, "%2C").replace(/\//g, "%2F")
      .replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/&/g, "%26");
    return `https://image.pollinations.ai/prompt/${encoded}%2C%20product%20photo%2C%20plain%20white%20background%2C%20studio%20lighting%2C%20fashion%20photography?width=512&height=512&nologo=true&model=flux`;
  }

  function cc(base: BaseItem, colors: string[]): SeedItem[] {
    const price = itemPrice(base.category);
    return colors.slice(0, 5).map(color => {
      const prompt = `${base.referencePrompt}, ${color.toLowerCase()} colorway`;
      return {
        ...base,
        name: `${base.name} — ${color}`,
        colors: [color],
        retailPriceAud: price,
        referencePrompt: prompt,
        primaryImageUrl: pollinationsUrl(prompt),
      };
    });
  }

// ─── Standard colour palettes ─────────────────────────────────────────────────

const TOPS     = ["White","Black","Navy","Charcoal Grey","Sage Green","Burgundy","Cobalt Blue","Forest Green","Camel","Dusty Rose"];
const POLO     = ["White","Black","Navy","Cobalt Blue","Sage Green","Burgundy","Charcoal","Red","Camel","Forest Green"];
const BOTTOMS  = ["Black","Navy","Camel","Stone","Olive","Charcoal","Cream","Burgundy"];
const DENIM    = ["Indigo","Mid-Wash Blue","Black","Dark Rinse","Light Blue","Stone Wash","Raw Denim"];
const OUTER    = ["Black","Navy","Olive","Camel","Charcoal","Forest Green","Sand","Burgundy"];
const HOODIE   = ["White","Black","Navy","Charcoal Grey","Forest Green","Burgundy","Sand","Cobalt Blue"];
const SPORT    = ["Black","White","Navy","Red","Royal Blue","Forest Green","Gold","Burgundy","Grey","Orange"];
const SWIM_M   = ["Navy","Black","Cobalt Blue","Teal","Coral Red","Olive","Burgundy","White"];
const SWIM_F   = ["Black","Navy","Cobalt Blue","Coral Pink","Teal","Burgundy","White","Sage Green"];
const DRESS    = ["White","Black","Navy","Sage Green","Blush Pink","Cobalt Blue","Dusty Rose","Olive"];
const NEUTRAL  = ["Black","Navy","Olive","Camel","Charcoal","Brown","Cream","Burgundy"];
const HAT      = ["Black","Navy","White","Olive","Camel","Charcoal","Burgundy","Forest Green"];
const SHOE_M   = ["White","Black","Brown","Navy","Grey","Tan","Olive"];
const SHOE_F   = ["White","Black","Nude Beige","Navy","Blush Pink","Silver","Camel"];
const EYEWEAR  = ["Black Frame","Tortoiseshell","Clear Frame","Brown Frame","Gold Frame","Navy Frame","White Frame"];
const WATCH_M  = ["Silver/White Dial","Gold/Black Dial","All Black","Silver/Blue Dial","Rose Gold/White Dial","Gunmetal/Green Dial","Bronze/Brown Dial"];
const WATCH_F  = ["Silver/White Dial","Gold/White Dial","Rose Gold/Pink Dial","All Black","Gold/Champagne Dial","Silver/Blue Dial","Two-Tone/Pearlescent Dial"];
const SHORTS   = ["Black","Navy","Khaki","Olive","Charcoal","Cobalt Blue","Forest Green","Burgundy"];

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 1 — Men's Everyday
// ─────────────────────────────────────────────────────────────────────────────

const mensEverydayItems: SeedItem[] = [
  ...cc({ name:"Lamalo Premium Tee", description:"Supima cotton crew-neck tee, medium weight, relaxed silhouette. The daily essential.", category:"tops", subcategory:"t-shirts", genderFit:"male", materials:["100% Supima Cotton"], styleTags:["tee","essential","relaxed"], referencePrompt:"Men's premium Supima cotton crew-neck t-shirt relaxed fit", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, TOPS),
  ...cc({ name:"Lamalo Linen Overshirt", description:"Relaxed-fit linen-blend overshirt with chest pockets and split hem.", category:"tops", subcategory:"shirts", genderFit:"male", materials:["55% Linen","45% Cotton"], styleTags:["linen","relaxed","coastal","layering"], referencePrompt:"Men's relaxed linen overshirt chest pockets split hem", primaryImageUrl:"/lamalo/men-linen-shirt.jpg" }, TOPS.slice(0,8)),
  ...cc({ name:"Lamalo Classic Polo", description:"Pique cotton polo with two-button placket and contrast tipping.", category:"tops", subcategory:"polos", genderFit:"male", materials:["100% Cotton Pique"], styleTags:["polo","smart-casual","preppy"], referencePrompt:"Men's classic pique cotton polo two-button placket", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, POLO),
  ...cc({ name:"Lamalo Cotton Henley", description:"Three-button henley in soft pima cotton with a relaxed fit.", category:"tops", subcategory:"t-shirts", genderFit:"male", materials:["100% Pima Cotton"], styleTags:["henley","casual","coastal"], referencePrompt:"Men's three-button henley pima cotton relaxed", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, TOPS.slice(0,8)),
  ...cc({ name:"Lamalo Slim Chino", description:"Slim-fit cotton twill chino with clean front and belt loops.", category:"bottoms", subcategory:"chinos", genderFit:"male", materials:["98% Cotton","2% Elastane"], styleTags:["chino","smart-casual","versatile"], referencePrompt:"Men's slim-fit cotton twill chino trouser clean front", primaryImageUrl:"/lamalo/men-chino-trouser.jpg" }, BOTTOMS),
  ...cc({ name:"Lamalo Straight Denim", description:"Mid-rise straight-leg selvedge denim, classic five-pocket construction.", category:"bottoms", subcategory:"jeans", genderFit:"male", materials:["98% Cotton Denim","2% Elastane"], styleTags:["denim","classic","everyday"], referencePrompt:"Men's straight-leg selvedge denim jeans five-pocket mid-rise", primaryImageUrl:"/lamalo/men-denim-jean.jpg" }, DENIM),
  ...cc({ name:"Lamalo Linen Short", description:"Mid-length linen-blend short with elastic-back waist and side pockets.", category:"bottoms", subcategory:"shorts", genderFit:"male", materials:["55% Linen","45% Cotton"], styleTags:["linen","summer","casual"], referencePrompt:"Men's mid-length linen blend shorts elastic waist relaxed", primaryImageUrl:"/lamalo/men-chino-trouser.jpg" }, SHORTS),
  ...cc({ name:"Lamalo Woven Short", description:"Casual woven short in durable cotton with cargo-style pocket detail.", category:"bottoms", subcategory:"shorts", genderFit:"male", materials:["100% Cotton"], styleTags:["shorts","casual","utility"], referencePrompt:"Men's casual cotton woven shorts cargo pocket detail", primaryImageUrl:"/lamalo/men-chino-trouser.jpg" }, SHORTS.slice(0,7)),
  ...cc({ name:"Lamalo Full-Zip Hoodie", description:"Heavyweight cotton-fleece full-zip hoodie with structured hood.", category:"tops", subcategory:"hoodies", genderFit:"male", materials:["80% Cotton","20% Polyester Fleece"], styleTags:["hoodie","casual","layering"], referencePrompt:"Men's heavyweight cotton-fleece full-zip hoodie structured hood", primaryImageUrl:"/lamalo/men-zip-hoodie.jpg" }, HOODIE),
  ...cc({ name:"Lamalo Bomber Jacket", description:"Classic satin-shell bomber with ribbed cuffs, collar and hem.", category:"outerwear", subcategory:"jackets", genderFit:"male", materials:["Nylon Shell","Polyester Lining","Ribbed Knit Trim"], styleTags:["bomber","streetwear","minimal"], referencePrompt:"Men's classic bomber jacket satin shell ribbed cuffs collar", primaryImageUrl:"/lamalo/men-bomber-jacket.jpg" }, OUTER),
];

const mensEveryday: SeedCollection = { name:"Lamalo Men's Everyday", description:"Relaxed daily-wear for men built on natural fabrics and clean silhouettes.", collectionType:"core", season:"All-Season", year:2026, styleTags:["casual","everyday","linen","sustainable","relaxed"], collectionPriceAud:cp(mensEverydayItems), items:mensEverydayItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 2 — Men's Performance + Sport
// ─────────────────────────────────────────────────────────────────────────────

const mensPerformanceItems: SeedItem[] = [
  ...cc({ name:"Lamalo Track Jacket", description:"Lightweight full-zip track jacket with contrast side stripe.", category:"outerwear", subcategory:"track-jackets", genderFit:"male", materials:["100% Polyester Tricot"], styleTags:["sport","track","retro-athletic"], referencePrompt:"Men's retro athletic track jacket contrast side stripe full-zip", primaryImageUrl:"/lamalo/men-track-jacket.jpg" }, SPORT),
  ...cc({ name:"Lamalo Tapered Jogger", description:"Tapered performance jogger with ribbed ankle cuffs and drawstring waist.", category:"bottoms", subcategory:"joggers", genderFit:"male", materials:["60% Cotton","40% Polyester"], styleTags:["jogger","sport","athleisure"], referencePrompt:"Men's tapered performance jogger ribbed ankle cuffs drawstring", primaryImageUrl:"/lamalo/men-jogger-pant.jpg" }, SPORT),
  ...cc({ name:"Lamalo Dri-Lite Running Tee", description:"Ultra-lightweight moisture-wicking tee with flatlock seams.", category:"tops", subcategory:"t-shirts", genderFit:"male", materials:["Recycled Polyester"], styleTags:["running","technical","lightweight"], referencePrompt:"Men's lightweight moisture-wicking running tee flatlock seams", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, SPORT),
  ...cc({ name:"Lamalo Performance Short", description:"5-inch inseam training short with built-in mesh liner and key pocket.", category:"bottoms", subcategory:"shorts", genderFit:"male", materials:["Nylon","Mesh Lining"], styleTags:["training","shorts","athletic"], referencePrompt:"Men's 5-inch training shorts built-in mesh liner", primaryImageUrl:"/lamalo/men-jogger-pant.jpg" }, SPORT),
  ...cc({ name:"Lamalo Zip Sport Hoodie", description:"Performance full-zip hoodie with moisture-wicking cotton-blend fleece.", category:"tops", subcategory:"hoodies", genderFit:"male", materials:["60% Cotton","40% Polyester"], styleTags:["hoodie","sport","training"], referencePrompt:"Men's performance full-zip sport hoodie moisture-wicking fleece", primaryImageUrl:"/lamalo/men-zip-hoodie.jpg" }, HOODIE),
  ...cc({ name:"Lamalo Wind-Lite Jacket", description:"Packable wind and light-rain jacket in ripstop nylon.", category:"outerwear", subcategory:"jackets", genderFit:"male", materials:["Ripstop Nylon"], styleTags:["windbreaker","packable","running"], referencePrompt:"Men's packable ripstop nylon windbreaker light rain jacket", primaryImageUrl:"/lamalo/men-track-jacket.jpg" }, OUTER),
  ...cc({ name:"Lamalo Training Tank", description:"Open-back mesh training tank with sweat-wicking fabric.", category:"tops", subcategory:"t-shirts", genderFit:"male", materials:["100% Polyester Mesh"], styleTags:["tank","training","gym"], referencePrompt:"Men's open-back mesh training tank sweat-wicking", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, SPORT),
  ...cc({ name:"Lamalo Compression Tight", description:"Full-length compression tight with graduated compression and wide waistband.", category:"bottoms", subcategory:"tights", genderFit:"male", materials:["78% Nylon","22% Elastane"], styleTags:["compression","running","training"], referencePrompt:"Men's full-length graduated compression tights wide waistband", primaryImageUrl:"/lamalo/men-jogger-pant.jpg" }, ["Black","Navy","Charcoal","Forest Green","Cobalt Blue","Burgundy","Royal Blue"]),
  // ── Soccer/Football ──
  ...cc({ name:"Lamalo Soccer Jersey", description:"Lightweight performance soccer jersey with moisture-wicking fabrication and mesh ventilation panels. Team-sport cut.", category:"tops", subcategory:"sport-jerseys", genderFit:"male", materials:["100% Recycled Polyester"], styleTags:["soccer","football","sport","jersey","team"], referencePrompt:"Men's soccer football jersey lightweight mesh ventilation performance fit", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, SPORT),
  ...cc({ name:"Lamalo Soccer Short", description:"Lightweight soccer short with elastic waistband and side splits for full range of motion.", category:"bottoms", subcategory:"sport-shorts", genderFit:"male", materials:["100% Polyester"], styleTags:["soccer","football","sport","shorts"], referencePrompt:"Men's soccer shorts elastic waistband side splits athletic", primaryImageUrl:"/lamalo/men-jogger-pant.jpg" }, SPORT),
  // ── Basketball ──
  ...cc({ name:"Lamalo Basketball Jersey", description:"Sleeveless NBA-style basketball jersey with wide armholes, mesh fabrication and bold number-ready front.", category:"tops", subcategory:"sport-jerseys", genderFit:"male", materials:["100% Polyester Mesh"], styleTags:["basketball","sport","jersey","NBA-style"], referencePrompt:"Men's sleeveless basketball jersey mesh wide armhole NBA-style", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, SPORT),
  ...cc({ name:"Lamalo Basketball Short", description:"Baggy-cut basketball short with elastic waist, side pockets and knee-length hem.", category:"bottoms", subcategory:"sport-shorts", genderFit:"male", materials:["100% Polyester"], styleTags:["basketball","sport","shorts","baggy"], referencePrompt:"Men's basketball shorts baggy knee-length elastic waist", primaryImageUrl:"/lamalo/men-jogger-pant.jpg" }, SPORT),
  // ── Hockey ──
  ...cc({ name:"Lamalo Hockey Jersey", description:"Durable padded-shoulder hockey-style jersey with reinforced elbows and moisture-wicking inner layer.", category:"tops", subcategory:"sport-jerseys", genderFit:"male", materials:["Polyester","Reinforced Mesh"], styleTags:["hockey","sport","jersey","team"], referencePrompt:"Men's hockey jersey padded shoulder reinforced elbows moisture-wicking", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, SPORT),
  // ── AFL / Aussie Rules ──
  ...cc({ name:"Lamalo AFL Guernsey", description:"Traditional Australian Rules Football guernsey with V-neck collar, sleeveless cut and stretch performance fabric.", category:"tops", subcategory:"sport-jerseys", genderFit:"male", materials:["Stretch Polyester"], styleTags:["AFL","australian-rules","guernsey","sport","team"], referencePrompt:"Men's AFL Aussie rules guernsey sleeveless V-neck stretch performance", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, SPORT),
  // ── American Football ──
  ...cc({ name:"Lamalo Football Jersey", description:"American football-style jersey with wide-shoulder seam, number-ready front and durable mesh construction.", category:"tops", subcategory:"sport-jerseys", genderFit:"male", materials:["100% Polyester"], styleTags:["american-football","sport","jersey","team"], referencePrompt:"Men's American football jersey wide shoulder mesh number-ready", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, SPORT),
  // ── Rugby ──
  ...cc({ name:"Lamalo Rugby Jersey", description:"Traditional short-sleeve rugby jersey with reinforced collar, rubberised buttons and durable cotton-poly blend.", category:"tops", subcategory:"sport-jerseys", genderFit:"male", materials:["60% Cotton","40% Polyester"], styleTags:["rugby","sport","jersey","team"], referencePrompt:"Men's rugby jersey reinforced collar rubberised buttons short-sleeve", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, SPORT),
];

const mensPerformance: SeedCollection = { name:"Lamalo Men's Performance", description:"High-function athletic wear and team-sport kits built for training and beyond.", collectionType:"sport", season:"All-Season", year:2026, styleTags:["athletic","performance","training","sport","soccer","basketball","hockey","AFL","football"], collectionPriceAud:cp(mensPerformanceItems), items:mensPerformanceItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 3 — Men's Originals (Retro Heritage)
// ─────────────────────────────────────────────────────────────────────────────

const mensOriginalsItems: SeedItem[] = [
  ...cc({ name:"Lamalo Retro Track Jacket", description:"Heritage track jacket in smooth polyester tricot with contrast side stripe.", category:"outerwear", subcategory:"track-jackets", genderFit:"male", materials:["100% Polyester Tricot"], styleTags:["retro","track","originals"], referencePrompt:"Men's retro heritage track jacket contrast side stripe tricot", primaryImageUrl:"/lamalo/men-track-jacket.jpg" }, SPORT),
  ...cc({ name:"Lamalo Retro Track Pant", description:"Matching tricot track pant with side stripe and ankle zip.", category:"bottoms", subcategory:"track-pants", genderFit:"male", materials:["100% Polyester Tricot"], styleTags:["retro","track","originals"], referencePrompt:"Men's retro track pants matching side stripe ankle zip tricot", primaryImageUrl:"/lamalo/men-jogger-pant.jpg" }, SPORT),
  ...cc({ name:"Lamalo Heritage Tee", description:"Cotton tee with minimal Lamalo Originals graphic at the chest.", category:"tops", subcategory:"t-shirts", genderFit:"male", materials:["100% Cotton"], styleTags:["graphic-tee","originals","heritage"], referencePrompt:"Men's heritage minimal graphic tee cotton originals", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, TOPS.slice(0,8)),
  ...cc({ name:"Lamalo Originals Hoodie", description:"Relaxed-fit cotton-fleece hoodie with large kangaroo pocket and Originals embroidery.", category:"tops", subcategory:"hoodies", genderFit:"male", materials:["80% Cotton","20% Polyester"], styleTags:["hoodie","originals","relaxed"], referencePrompt:"Men's originals relaxed hoodie kangaroo pocket embroidery", primaryImageUrl:"/lamalo/men-zip-hoodie.jpg" }, HOODIE),
  ...cc({ name:"Lamalo Originals Polo", description:"Classic pique polo with retro tipping and Originals emblem on chest.", category:"tops", subcategory:"polos", genderFit:"male", materials:["100% Cotton Pique"], styleTags:["polo","retro","originals"], referencePrompt:"Men's retro originals polo pique retro tipping chest emblem", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, POLO.slice(0,8)),
  ...cc({ name:"Lamalo Athletic Short", description:"Retro athletic short with mesh liner and side stripe.", category:"bottoms", subcategory:"shorts", genderFit:"male", materials:["Polyester","Mesh Lining"], styleTags:["retro","athletic","originals"], referencePrompt:"Men's retro athletic shorts mesh liner side stripe", primaryImageUrl:"/lamalo/men-jogger-pant.jpg" }, SPORT.slice(0,7)),
];

const mensOriginals: SeedCollection = { name:"Lamalo Men's Originals", description:"Retro athletic heritage reimagined for the streets.", collectionType:"lifestyle", season:"All-Season", year:2026, styleTags:["retro","originals","streetwear","heritage"], collectionPriceAud:cp(mensOriginalsItems), items:mensOriginalsItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 4 — Men's Luxury
// ─────────────────────────────────────────────────────────────────────────────

const mensLuxuryItems: SeedItem[] = [
  ...cc({ name:"Lamalo Suit Jacket", description:"Single-breasted suit jacket in Italian wool blend with notch lapel.", category:"tops", subcategory:"suits", genderFit:"male", materials:["70% Wool","30% Polyester"], styleTags:["suit","formal","luxury"], referencePrompt:"Men's single-breasted Italian wool suit jacket notch lapel tailored", primaryImageUrl:"/lamalo/men-suit-jacket.jpg" }, ["Charcoal","Navy","Black","Mid-Grey","Light Grey","Olive","Camel","Cream"]),
  ...cc({ name:"Lamalo Dress Trouser", description:"Slim tailored dress trouser with flat front and side seam pockets.", category:"bottoms", subcategory:"trousers", genderFit:"male", materials:["70% Wool","30% Polyester"], styleTags:["formal","tailored","smart"], referencePrompt:"Men's tailored flat-front dress trouser slim cut formal", primaryImageUrl:"/lamalo/men-chino-trouser.jpg" }, ["Charcoal","Navy","Black","Mid-Grey","Camel","Olive","Stone","Cream"]),
  ...cc({ name:"Lamalo Egyptian Cotton Dress Shirt", description:"Fine 2-ply Egyptian cotton dress shirt with barrel cuffs and spread collar.", category:"tops", subcategory:"shirts", genderFit:"male", materials:["100% Egyptian Cotton"], styleTags:["formal","luxury","dress-shirt"], referencePrompt:"Men's Egyptian cotton dress shirt barrel cuffs spread collar formal", primaryImageUrl:"/lamalo/men-linen-shirt.jpg" }, ["White","Pale Blue","Pale Pink","Lavender","Cream","Sky Blue","Sage","Charcoal"]),
  ...cc({ name:"Lamalo Merino V-Neck", description:"Fine-gauge merino wool V-neck in a slim fit.", category:"tops", subcategory:"knitwear", genderFit:"male", materials:["100% Merino Wool"], styleTags:["knitwear","luxury","smart-casual"], referencePrompt:"Men's fine-gauge merino wool V-neck slim fit knitwear", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, ["Charcoal","Navy","Camel","Forest Green","Burgundy","Cobalt Blue","Grey Marle","Cream"]),
  ...cc({ name:"Lamalo Tailored Blazer", description:"Two-button blazer in Italian wool blend, slim fit.", category:"outerwear", subcategory:"blazers", genderFit:"male", materials:["65% Wool","35% Polyester"], styleTags:["blazer","tailored","smart"], referencePrompt:"Men's Italian wool two-button blazer slim fit tailored", primaryImageUrl:"/lamalo/men-suit-jacket.jpg" }, ["Navy","Charcoal","Black","Olive","Camel","Mid-Grey","Cobalt Blue","Burgundy"]),
  ...cc({ name:"Lamalo Cashmere Overcoat", description:"Long cashmere-blend overcoat with notch lapel and single-breast button closure.", category:"outerwear", subcategory:"coats", genderFit:"male", materials:["80% Wool","20% Cashmere"], styleTags:["coat","luxury","formal"], referencePrompt:"Men's long cashmere-blend overcoat notch lapel single-breast", primaryImageUrl:"/lamalo/men-bomber-jacket.jpg" }, ["Camel","Charcoal","Navy","Black","Cream","Stone","Olive","Mid-Grey"]),
];

const mensLuxury: SeedCollection = { name:"Lamalo Men's Luxury", description:"Elevated tailoring in premium natural fibres.", collectionType:"luxury", season:"All-Season", year:2026, styleTags:["luxury","tailored","formal","merino","cashmere"], collectionPriceAud:cp(mensLuxuryItems), items:mensLuxuryItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 5 — Men's Swimwear
// ─────────────────────────────────────────────────────────────────────────────

const mensSwimwearItems: SeedItem[] = [
  ...cc({ name:"Lamalo Classic Board Short", description:"18-inch quick-dry board short with Velcro fly and side pocket.", category:"swimwear", subcategory:"board-shorts", genderFit:"male", materials:["100% Recycled Polyester"], styleTags:["swim","beach","surf"], referencePrompt:"Men's 18-inch quick-dry board shorts Velcro fly beach swim", primaryImageUrl:"/lamalo/swim-board-short.jpg" }, SWIM_M),
  ...cc({ name:"Lamalo Floral Swim Trunk", description:"Mid-length swim trunk with allover tropical floral print.", category:"swimwear", subcategory:"swim-trunks", genderFit:"male", materials:["100% Polyester"], styleTags:["swim","tropical","beach","floral"], referencePrompt:"Men's floral print mid-length swim trunks tropical beach", primaryImageUrl:"/lamalo/swim-board-short.jpg" }, ["Blue Floral","Navy Floral","Green Floral","Coral Floral","Black Floral","Teal Floral","Burgundy Floral"]),
  ...cc({ name:"Lamalo Essential Swim Short", description:"5-inch swim short with mesh liner and flat waistband — minimal and versatile.", category:"swimwear", subcategory:"swim-shorts", genderFit:"male", materials:["Nylon","Mesh Lining"], styleTags:["swim","minimal","versatile"], referencePrompt:"Men's 5-inch minimal swim short mesh liner flat waistband", primaryImageUrl:"/lamalo/swim-board-short.jpg" }, SWIM_M),
  ...cc({ name:"Lamalo Retro Swim Brief", description:"Competition-cut swim brief in durable nylon-elastane blend.", category:"swimwear", subcategory:"swim-briefs", genderFit:"male", materials:["78% Nylon","22% Elastane"], styleTags:["swim","retro","competition"], referencePrompt:"Men's retro competition swim brief nylon-elastane durable", primaryImageUrl:"/lamalo/swim-board-short.jpg" }, SWIM_M),
  ...cc({ name:"Lamalo UPF50+ Rash Guard", description:"Long-sleeve UPF50+ rash guard for sun protection in and out of water.", category:"swimwear", subcategory:"rash-guards", genderFit:"male", materials:["Recycled Nylon","Elastane"], styleTags:["swim","UPF50+","sun-protection","surf"], referencePrompt:"Men's long-sleeve UPF50+ rash guard sun protection surf", primaryImageUrl:"/lamalo/swim-rash-guard.jpg" }, ["Navy","Black","White","Cobalt Blue","Forest Green","Teal","Burgundy","Coral Red"]),
];

const mensSwimsear: SeedCollection = { name:"Lamalo Men's Swimwear", description:"Beach-ready swim for every body and style.", collectionType:"swimwear", season:"Summer", year:2026, styleTags:["swim","beach","surf","UPF50+"], collectionPriceAud:cp(mensSwimwearItems), items:mensSwimwearItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 6 — Men's Comfort Series (Active Seniors)
// ─────────────────────────────────────────────────────────────────────────────

const mensComfortItems: SeedItem[] = [
  ...cc({ name:"Lamalo Heritage Flannel Shirt", description:"Soft brushed-cotton flannel shirt with double chest pockets.", category:"tops", subcategory:"shirts", genderFit:"male", materials:["100% Brushed Cotton"], styleTags:["flannel","comfort","casual","seniors"], referencePrompt:"Men's soft brushed-cotton flannel shirt double chest pockets", primaryImageUrl:"/lamalo/men-linen-shirt.jpg" }, ["Red/Black Check","Blue Check","Green Check","Navy","Burgundy","Forest Green","Grey Check","Camel"]),
  ...cc({ name:"Lamalo Button Cardigan", description:"Chunky-knit button cardigan with patch pockets and a relaxed fit.", category:"tops", subcategory:"knitwear", genderFit:"male", materials:["60% Cotton","40% Acrylic"], styleTags:["cardigan","comfort","seniors","knitwear"], referencePrompt:"Men's chunky-knit button cardigan patch pockets relaxed fit", primaryImageUrl:"/lamalo/men-zip-hoodie.jpg" }, NEUTRAL),
  ...cc({ name:"Lamalo Anti-Pill Fleece Jacket", description:"Zip-through anti-pill fleece jacket with two zip hand pockets.", category:"outerwear", subcategory:"fleece", genderFit:"male", materials:["100% Anti-Pill Polyester Fleece"], styleTags:["fleece","comfort","casual","warm"], referencePrompt:"Men's anti-pill fleece zip jacket two hand pockets warm comfort", primaryImageUrl:"/lamalo/men-zip-hoodie.jpg" }, NEUTRAL),
  ...cc({ name:"Lamalo Elastic-Waist Trouser", description:"Comfort-fit trouser with full elastic waist, straight leg and side pockets.", category:"bottoms", subcategory:"trousers", genderFit:"male", materials:["65% Polyester","35% Cotton"], styleTags:["comfort","elastic-waist","seniors","easy-fit"], referencePrompt:"Men's comfort elastic-waist straight-leg trouser easy fit", primaryImageUrl:"/lamalo/men-chino-trouser.jpg" }, BOTTOMS),
  ...cc({ name:"Lamalo Puffer Gilet", description:"Lightweight down-fill gilet with baffled construction and zip front.", category:"outerwear", subcategory:"gilets", genderFit:"male", materials:["Recycled Nylon Shell","Down Fill"], styleTags:["gilet","warm","layering","comfort"], referencePrompt:"Men's lightweight down-fill puffer gilet baffled zip front", primaryImageUrl:"/lamalo/men-bomber-jacket.jpg" }, OUTER),
  ...cc({ name:"Lamalo Relaxed Polo", description:"Soft-touch cotton polo with generous comfort fit — easy on and off.", category:"tops", subcategory:"polos", genderFit:"male", materials:["100% Cotton Jersey"], styleTags:["polo","comfort","easy-fit","seniors"], referencePrompt:"Men's soft-touch cotton polo comfort fit generous cut easy", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, POLO.slice(0,8)),
  ...cc({ name:"Lamalo Cotton Pyjama Set", description:"Two-piece cotton pyjama set with elastic-waist pants and button-front top.", category:"sleepwear", subcategory:"pyjamas", genderFit:"male", materials:["100% Cotton"], styleTags:["sleepwear","comfort","pyjamas"], referencePrompt:"Men's two-piece cotton pyjama set elastic-waist button-front top", primaryImageUrl:"/lamalo/men-linen-shirt.jpg" }, ["Blue/White Stripe","Navy/White Stripe","Red/White Stripe","Grey Marle","Pale Blue","Pale Green","White","Camel"]),
];

const mensComfort: SeedCollection = { name:"Lamalo Men's Comfort Series", description:"Soft fabrics, forgiving fits, and easy-care construction for everyday comfort.", collectionType:"comfort", season:"All-Season", year:2026, styleTags:["comfort","seniors","easy-fit","relaxed"], collectionPriceAud:cp(mensComfortItems), items:mensComfortItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 7 — Women's Everyday
// ─────────────────────────────────────────────────────────────────────────────

const womensEverydayItems: SeedItem[] = [
  ...cc({ name:"Lamalo Linen Midi Dress", description:"Relaxed A-line midi dress in linen-blend fabric with adjustable waist tie.", category:"dresses", subcategory:"midi-dresses", genderFit:"female", materials:["55% Linen","45% Cotton"], styleTags:["dress","midi","relaxed","coastal"], referencePrompt:"Women's relaxed A-line linen midi dress adjustable waist tie", primaryImageUrl:"/lamalo/women-linen-dress.jpg" }, DRESS),
  ...cc({ name:"Lamalo Silk-Touch Blouse", description:"Lightweight woven blouse with subtle sheen and relaxed tuck-in hem.", category:"tops", subcategory:"blouses", genderFit:"female", materials:["100% Viscose"], styleTags:["blouse","feminine","versatile"], referencePrompt:"Women's lightweight silk-touch woven blouse subtle sheen tuck-in hem", primaryImageUrl:"/lamalo/women-blouse.jpg" }, DRESS),
  ...cc({ name:"Lamalo Fitted Blazer", description:"Tailored single-button blazer with a nipped waist and flap pockets.", category:"outerwear", subcategory:"blazers", genderFit:"female", materials:["65% Polyester","35% Viscose"], styleTags:["blazer","tailored","smart"], referencePrompt:"Women's tailored single-button blazer nipped waist flap pockets", primaryImageUrl:"/lamalo/women-blazer.jpg" }, ["Black","Navy","Camel","Cobalt Blue","Sage Green","Cream","Charcoal","Dusty Rose"]),
  ...cc({ name:"Lamalo Wide-Leg Trouser", description:"High-rise wide-leg trouser in fluid fabric with front pleat.", category:"bottoms", subcategory:"trousers", genderFit:"female", materials:["100% Viscose"], styleTags:["wide-leg","formal","feminine"], referencePrompt:"Women's high-rise wide-leg trouser fluid fabric front pleat", primaryImageUrl:"/lamalo/women-wide-leg-trouser.jpg" }, BOTTOMS),
  ...cc({ name:"Lamalo Linen Jumpsuit", description:"Wide-leg linen jumpsuit with V-neck and adjustable waist tie.", category:"dresses", subcategory:"jumpsuits", genderFit:"female", materials:["55% Linen","45% Cotton"], styleTags:["jumpsuit","relaxed","coastal","summer"], referencePrompt:"Women's wide-leg linen jumpsuit V-neck adjustable waist tie", primaryImageUrl:"/lamalo/women-linen-dress.jpg" }, DRESS),
  ...cc({ name:"Lamalo Wrap Midi Skirt", description:"Wrap-front midi skirt in fluid fabric with slight flare.", category:"bottoms", subcategory:"skirts", genderFit:"female", materials:["100% Viscose"], styleTags:["skirt","midi","feminine","wrap"], referencePrompt:"Women's wrap-front midi skirt fluid slight flare feminine", primaryImageUrl:"/lamalo/women-skirt.jpg" }, DRESS),
  ...cc({ name:"Lamalo Ribbed Tee", description:"Stretch-rib cotton tee in a fitted silhouette with a crew neck.", category:"tops", subcategory:"t-shirts", genderFit:"female", materials:["95% Cotton","5% Elastane"], styleTags:["tee","fitted","ribbed","essential"], referencePrompt:"Women's stretch-rib cotton crew-neck tee fitted silhouette", primaryImageUrl:"/lamalo/women-blouse.jpg" }, TOPS),
  ...cc({ name:"Lamalo Classic Denim", description:"Mid-rise straight-leg denim with authentic five-pocket construction.", category:"bottoms", subcategory:"jeans", genderFit:"female", materials:["98% Cotton","2% Elastane"], styleTags:["denim","classic","everyday"], referencePrompt:"Women's mid-rise straight-leg denim jeans five-pocket classic", primaryImageUrl:"/lamalo/women-wide-leg-trouser.jpg" }, DENIM),
  ...cc({ name:"Lamalo High-Waist Legging", description:"Full-length high-waist legging in sculpting four-way stretch fabric.", category:"bottoms", subcategory:"leggings", genderFit:"female", materials:["75% Nylon","25% Elastane"], styleTags:["leggings","everyday","comfort","fitted"], referencePrompt:"Women's full-length high-waist sculpting leggings four-way stretch", primaryImageUrl:"/lamalo/women-wide-leg-trouser.jpg" }, ["Black","Navy","Charcoal","Forest Green","Burgundy","Cobalt Blue","Camel","Dusty Rose"]),
];

const womensEveryday: SeedCollection = { name:"Lamalo Women's Everyday", description:"Effortlessly wearable women's essentials built for every day.", collectionType:"core", season:"All-Season", year:2026, styleTags:["casual","everyday","linen","versatile","feminine"], collectionPriceAud:cp(womensEverydayItems), items:womensEverydayItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 8 — Women's Active
// ─────────────────────────────────────────────────────────────────────────────

const womensActiveItems: SeedItem[] = [
  ...cc({ name:"Lamalo Sport Bra", description:"Medium-impact sport bra with removable cups and racerback design.", category:"tops", subcategory:"sport-bras", genderFit:"female", materials:["75% Nylon","25% Elastane"], styleTags:["sport-bra","training","medium-impact"], referencePrompt:"Women's medium-impact sport bra removable cups racerback", primaryImageUrl:"/lamalo/women-sport-bra.jpg" }, ["Black","Navy","Sage Green","Cobalt Blue","Coral Pink","Forest Green","Burgundy","White"]),
  ...cc({ name:"Lamalo Seamless Crop Top", description:"Seamless cropped training top with built-in support and ventilation cutouts.", category:"tops", subcategory:"crop-tops", genderFit:"female", materials:["Seamless Nylon-Elastane"], styleTags:["crop","training","seamless","gym"], referencePrompt:"Women's seamless crop training top built-in support ventilation", primaryImageUrl:"/lamalo/women-sport-bra.jpg" }, ["Black","Navy","Sage Green","Dusty Rose","Cobalt Blue","Forest Green","White","Burgundy"]),
  ...cc({ name:"Lamalo High-Waist Active Short", description:"4-inch active short with hidden waistband pocket and quick-dry fabric.", category:"bottoms", subcategory:"shorts", genderFit:"female", materials:["90% Polyester","10% Elastane"], styleTags:["shorts","active","gym","running"], referencePrompt:"Women's 4-inch active short hidden waistband pocket quick-dry", primaryImageUrl:"/lamalo/women-wide-leg-trouser.jpg" }, ["Black","Navy","Sage Green","Cobalt Blue","Forest Green","Burgundy","Coral Pink","Charcoal"]),
  ...cc({ name:"Lamalo Active Running Tank", description:"Relaxed-fit running tank with open back and moisture-wicking fabric.", category:"tops", subcategory:"tanks", genderFit:"female", materials:["100% Recycled Polyester"], styleTags:["tank","running","training"], referencePrompt:"Women's relaxed open-back running tank moisture-wicking performance", primaryImageUrl:"/lamalo/women-blouse.jpg" }, ["Black","White","Navy","Sage Green","Cobalt Blue","Forest Green","Coral Pink","Dusty Rose"]),
  ...cc({ name:"Lamalo Performance Tracksuit Top", description:"Quarter-zip performance fleece top with thumb holes and side pockets.", category:"tops", subcategory:"fleece", genderFit:"female", materials:["60% Cotton","40% Polyester"], styleTags:["tracksuit","training","zip","sport"], referencePrompt:"Women's quarter-zip performance fleece tracksuit top thumb holes", primaryImageUrl:"/lamalo/women-blazer.jpg" }, HOODIE),
  ...cc({ name:"Lamalo Yoga Tight", description:"Full-length high-waist yoga tight in buttery-soft fabric with inner pocket.", category:"bottoms", subcategory:"tights", genderFit:"female", materials:["72% Nylon","28% Elastane"], styleTags:["yoga","tight","training","full-length"], referencePrompt:"Women's full-length high-waist yoga tights buttery-soft inner pocket", primaryImageUrl:"/lamalo/women-wide-leg-trouser.jpg" }, ["Black","Navy","Charcoal","Forest Green","Burgundy","Sage Green","Cobalt Blue","Dusty Rose"]),
  ...cc({ name:"Lamalo Windbreaker", description:"Packable women's windbreaker in ripstop nylon with hood and zip pockets.", category:"outerwear", subcategory:"jackets", genderFit:"female", materials:["Ripstop Nylon"], styleTags:["windbreaker","packable","sport"], referencePrompt:"Women's packable windbreaker ripstop nylon hood zip pockets", primaryImageUrl:"/lamalo/women-blazer.jpg" }, OUTER),
  // ── Women's sport jerseys ──
  ...cc({ name:"Lamalo Women's Soccer Jersey", description:"Women's cut soccer jersey with moisture-wicking mesh panels and athletic fit.", category:"tops", subcategory:"sport-jerseys", genderFit:"female", materials:["100% Recycled Polyester"], styleTags:["soccer","sport","jersey","team"], referencePrompt:"Women's soccer jersey moisture-wicking mesh panels athletic fit", primaryImageUrl:"/lamalo/women-blouse.jpg" }, SPORT),
  ...cc({ name:"Lamalo Women's Basketball Jersey", description:"Women's sleeveless basketball jersey with wide armholes and mesh fabrication.", category:"tops", subcategory:"sport-jerseys", genderFit:"female", materials:["100% Polyester Mesh"], styleTags:["basketball","sport","jersey","sleeveless"], referencePrompt:"Women's sleeveless basketball jersey mesh wide armhole", primaryImageUrl:"/lamalo/women-blouse.jpg" }, SPORT),
];

const womensActive: SeedCollection = { name:"Lamalo Women's Active", description:"Performance activewear for training, running and beyond.", collectionType:"sport", season:"All-Season", year:2026, styleTags:["athletic","performance","training","yoga","running","soccer","basketball"], collectionPriceAud:cp(womensActiveItems), items:womensActiveItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 9 — Women's Originals
// ─────────────────────────────────────────────────────────────────────────────

const womensOriginalsItems: SeedItem[] = [
  ...cc({ name:"Lamalo Women's Retro Tracksuit Top", description:"Heritage tricot tracksuit top with contrast stripe and side zip.", category:"tops", subcategory:"track-jackets", genderFit:"female", materials:["100% Polyester Tricot"], styleTags:["retro","track","originals","heritage"], referencePrompt:"Women's retro tricot tracksuit top contrast stripe side zip", primaryImageUrl:"/lamalo/women-blazer.jpg" }, SPORT),
  ...cc({ name:"Lamalo Women's Retro Tracksuit Pant", description:"Matching tricot track pant with side stripe and ankle zip.", category:"bottoms", subcategory:"track-pants", genderFit:"female", materials:["100% Polyester Tricot"], styleTags:["retro","track","originals"], referencePrompt:"Women's retro tricot track pants matching side stripe ankle zip", primaryImageUrl:"/lamalo/women-wide-leg-trouser.jpg" }, SPORT),
  ...cc({ name:"Lamalo Women's Heritage Hoodie", description:"Relaxed cotton-fleece hoodie with kangaroo pocket and Originals embroidery.", category:"tops", subcategory:"hoodies", genderFit:"female", materials:["80% Cotton","20% Polyester"], styleTags:["hoodie","originals","relaxed"], referencePrompt:"Women's originals relaxed hoodie kangaroo pocket embroidery", primaryImageUrl:"/lamalo/women-blazer.jpg" }, HOODIE),
  ...cc({ name:"Lamalo Women's Classic Tee", description:"Unisex-feel classic cotton tee with relaxed box silhouette.", category:"tops", subcategory:"t-shirts", genderFit:"female", materials:["100% Cotton"], styleTags:["tee","originals","relaxed","classic"], referencePrompt:"Women's classic cotton tee relaxed box silhouette originals", primaryImageUrl:"/lamalo/women-blouse.jpg" }, TOPS.slice(0,8)),
  ...cc({ name:"Lamalo Women's Retro Zip Jacket", description:"Full-zip tricot jacket with chest patch pocket and Originals branding.", category:"outerwear", subcategory:"jackets", genderFit:"female", materials:["100% Polyester Tricot"], styleTags:["retro","jacket","originals","zip"], referencePrompt:"Women's full-zip tricot jacket chest patch pocket originals branding", primaryImageUrl:"/lamalo/women-blazer.jpg" }, SPORT.slice(0,7)),
  ...cc({ name:"Lamalo Women's Athletic Skort", description:"Retro athletic skort with built-in shorts and pleated skirt overlay.", category:"bottoms", subcategory:"skorts", genderFit:"female", materials:["100% Polyester"], styleTags:["skort","retro","athletic","tennis"], referencePrompt:"Women's retro athletic skort built-in shorts pleated overlay", primaryImageUrl:"/lamalo/women-skirt.jpg" }, ["White","Black","Navy","Cobalt Blue","Red","Forest Green","Gold","Burgundy"]),
];

const womensOriginals: SeedCollection = { name:"Lamalo Women's Originals", description:"Retro sport-heritage pieces for women, reimagined for everyday wear.", collectionType:"lifestyle", season:"All-Season", year:2026, styleTags:["retro","originals","heritage","sport","women"], collectionPriceAud:cp(womensOriginalsItems), items:womensOriginalsItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 10 — Women's Luxury
// ─────────────────────────────────────────────────────────────────────────────

const womensLuxuryItems: SeedItem[] = [
  ...cc({ name:"Lamalo Structured Blazer", description:"Tailored double-breasted blazer with peak lapels and a strong shoulder.", category:"outerwear", subcategory:"blazers", genderFit:"female", materials:["70% Wool","30% Polyester"], styleTags:["blazer","luxury","tailored","formal"], referencePrompt:"Women's tailored double-breasted blazer peak lapels strong shoulder", primaryImageUrl:"/lamalo/women-blazer.jpg" }, ["Black","Navy","Cream","Camel","Cobalt Blue","Charcoal","Dusty Rose","Sage Green"]),
  ...cc({ name:"Lamalo Wide-Leg Formal Trouser", description:"High-rise wide-leg formal trouser in Italian fabric with front crease.", category:"bottoms", subcategory:"trousers", genderFit:"female", materials:["100% Italian Polyester"], styleTags:["formal","wide-leg","luxury"], referencePrompt:"Women's high-rise wide-leg formal trouser Italian fabric front crease", primaryImageUrl:"/lamalo/women-wide-leg-trouser.jpg" }, ["Black","Navy","Camel","Cream","Charcoal","Cobalt Blue","Dusty Rose","Stone"]),
  ...cc({ name:"Lamalo Pure Silk Blouse", description:"Woven silk blouse with a V-neck and delicate button front.", category:"tops", subcategory:"blouses", genderFit:"female", materials:["100% Silk"], styleTags:["silk","luxury","feminine","blouse"], referencePrompt:"Women's pure silk woven blouse V-neck delicate button front", primaryImageUrl:"/lamalo/women-blouse.jpg" }, ["White","Black","Dusty Rose","Cobalt Blue","Sage Green","Cream","Pale Gold","Lavender"]),
  ...cc({ name:"Lamalo Cashmere Sweater", description:"Fine-knit cashmere sweater with crew neck and relaxed fit.", category:"tops", subcategory:"knitwear", genderFit:"female", materials:["100% Cashmere"], styleTags:["cashmere","luxury","knitwear"], referencePrompt:"Women's fine-knit cashmere crew-neck sweater relaxed fit", primaryImageUrl:"/lamalo/women-blouse.jpg" }, ["Camel","White","Black","Dusty Rose","Cobalt Blue","Sage Green","Cream","Burgundy"]),
  ...cc({ name:"Lamalo Tailored Coat", description:"Knee-length tailored coat with notch lapel and single-breast button closure.", category:"outerwear", subcategory:"coats", genderFit:"female", materials:["80% Wool","20% Cashmere"], styleTags:["coat","tailored","luxury","formal"], referencePrompt:"Women's knee-length tailored coat notch lapel single-breast", primaryImageUrl:"/lamalo/women-blazer.jpg" }, ["Camel","Black","Navy","Cream","Charcoal","Cobalt Blue","Dusty Rose","Olive"]),
  ...cc({ name:"Lamalo Satin Slip Dress", description:"Bias-cut satin slip dress with adjustable spaghetti straps.", category:"dresses", subcategory:"evening", genderFit:"female", materials:["100% Polyester Satin"], styleTags:["slip-dress","evening","luxury","minimal"], referencePrompt:"Women's bias-cut satin slip dress adjustable spaghetti straps", primaryImageUrl:"/lamalo/women-linen-dress.jpg" }, ["Black","Navy","Champagne","Dusty Rose","Cobalt Blue","Sage Green","Red","Cream"]),
  ...cc({ name:"Lamalo Pleated Midi Skirt", description:"Knife-pleated midi skirt in fluid fabric, waist-elastic back.", category:"bottoms", subcategory:"skirts", genderFit:"female", materials:["100% Polyester"], styleTags:["skirt","midi","pleated","elegant"], referencePrompt:"Women's knife-pleated midi skirt fluid fabric elastic-back waist", primaryImageUrl:"/lamalo/women-skirt.jpg" }, ["Black","Navy","Camel","Dusty Rose","Sage Green","Cobalt Blue","Cream","Burgundy"]),
];

const womensLuxury: SeedCollection = { name:"Lamalo Women's Luxury", description:"Elevated womenswear in premium natural and luxury fabrics.", collectionType:"luxury", season:"All-Season", year:2026, styleTags:["luxury","tailored","formal","silk","cashmere","women"], collectionPriceAud:cp(womensLuxuryItems), items:womensLuxuryItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 11 — Women's Swimwear
// ─────────────────────────────────────────────────────────────────────────────

const womensSwimwearItems: SeedItem[] = [
  ...cc({ name:"Lamalo Classic One-Piece", description:"Scoop-neck one-piece swimsuit with moderate coverage and adjustable straps.", category:"swimwear", subcategory:"one-pieces", genderFit:"female", materials:["80% Nylon","20% Elastane"], styleTags:["swimsuit","one-piece","classic","beach"], referencePrompt:"Women's scoop-neck one-piece swimsuit adjustable straps classic", primaryImageUrl:"/lamalo/women-swimsuit.jpg" }, SWIM_F),
  ...cc({ name:"Lamalo Triangle Bikini Set", description:"Classic triangle bikini top and tie-side brief — adjustable for the perfect fit.", category:"swimwear", subcategory:"bikinis", genderFit:"female", materials:["82% Nylon","18% Elastane"], styleTags:["bikini","beach","triangle","adjustable"], referencePrompt:"Women's triangle bikini top tie-side brief adjustable swimwear", primaryImageUrl:"/lamalo/women-swimsuit.jpg" }, SWIM_F),
  ...cc({ name:"Lamalo Ruched One-Piece", description:"Ruched front one-piece with tummy-control lining and wide straps.", category:"swimwear", subcategory:"one-pieces", genderFit:"female", materials:["80% Nylon","20% Elastane"], styleTags:["swimsuit","ruched","tummy-control","flattering"], referencePrompt:"Women's ruched front one-piece tummy-control wide straps", primaryImageUrl:"/lamalo/women-swimsuit.jpg" }, SWIM_F),
  ...cc({ name:"Lamalo Sporty Bikini Set", description:"Cross-back sporty bikini top with full-coverage brief for active beach days.", category:"swimwear", subcategory:"bikinis", genderFit:"female", materials:["80% Nylon","20% Elastane"], styleTags:["bikini","sporty","active","cross-back"], referencePrompt:"Women's sporty cross-back bikini full-coverage brief active", primaryImageUrl:"/lamalo/women-swimsuit.jpg" }, SWIM_F),
  ...cc({ name:"Lamalo Swimwear Cover-Up", description:"Lightweight linen-blend beach cover-up with side splits and drop hem.", category:"swimwear", subcategory:"cover-ups", genderFit:"female", materials:["55% Linen","45% Cotton"], styleTags:["cover-up","beach","casual","resort"], referencePrompt:"Women's linen beach cover-up side splits drop hem resort", primaryImageUrl:"/lamalo/women-linen-dress.jpg" }, DRESS),
  ...cc({ name:"Lamalo Long-Sleeve Swimsuit", description:"Long-sleeve modest swimsuit with UPF50+ fabrication and full-length coverage.", category:"swimwear", subcategory:"swimsuits", genderFit:"female", materials:["Recycled Nylon","Elastane"], styleTags:["modest","UPF50+","long-sleeve","beach"], referencePrompt:"Women's long-sleeve UPF50+ modest swimsuit full coverage", primaryImageUrl:"/lamalo/swim-rash-guard.jpg" }, ["Navy","Black","Cobalt Blue","Forest Green","Burgundy","Teal","White","Sage Green"]),
];

const womensSwimwear: SeedCollection = { name:"Lamalo Women's Swimwear", description:"Beach-confident swimwear for every shape and preference.", collectionType:"swimwear", season:"Summer", year:2026, styleTags:["swim","beach","bikini","one-piece","resort","UPF50+"], collectionPriceAud:cp(womensSwimwearItems), items:womensSwimwearItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 12 — Women's Comfort Series
// ─────────────────────────────────────────────────────────────────────────────

const womensComfortItems: SeedItem[] = [
  ...cc({ name:"Lamalo Wrap Midi Dress", description:"Easy-wear wrap midi dress with adjustable tie and flutter sleeves.", category:"dresses", subcategory:"midi-dresses", genderFit:"female", materials:["100% Viscose"], styleTags:["dress","wrap","comfort","easy-wear","seniors"], referencePrompt:"Women's easy-wear wrap midi dress adjustable tie flutter sleeves", primaryImageUrl:"/lamalo/women-linen-dress.jpg" }, DRESS),
  ...cc({ name:"Lamalo Elastic-Waist Trouser", description:"Comfort trouser with full elastic waist, straight leg and side pockets.", category:"bottoms", subcategory:"trousers", genderFit:"female", materials:["65% Polyester","35% Cotton"], styleTags:["comfort","elastic","easy-fit","seniors"], referencePrompt:"Women's comfort elastic-waist straight-leg trouser easy fit", primaryImageUrl:"/lamalo/women-wide-leg-trouser.jpg" }, BOTTOMS),
  ...cc({ name:"Lamalo Long Wrap Cardigan", description:"Longline wrap cardigan with side pockets and a soft-touch knit.", category:"tops", subcategory:"knitwear", genderFit:"female", materials:["60% Cotton","40% Acrylic"], styleTags:["cardigan","longline","comfort","wrap"], referencePrompt:"Women's longline wrap cardigan soft-touch knit side pockets", primaryImageUrl:"/lamalo/women-blazer.jpg" }, NEUTRAL),
  ...cc({ name:"Lamalo Button Blouse", description:"Relaxed-fit cotton blouse with short sleeves and tonal buttons.", category:"tops", subcategory:"blouses", genderFit:"female", materials:["100% Cotton"], styleTags:["blouse","relaxed","comfort","classic"], referencePrompt:"Women's relaxed cotton button blouse short sleeves tonal buttons", primaryImageUrl:"/lamalo/women-blouse.jpg" }, TOPS.slice(0,8)),
  ...cc({ name:"Lamalo Quilted Zip Jacket", description:"Lightweight quilted jacket with zip front, stand collar and side pockets.", category:"outerwear", subcategory:"jackets", genderFit:"female", materials:["Polyester Shell","Polyester Fill"], styleTags:["quilted","jacket","comfort","warm"], referencePrompt:"Women's lightweight quilted jacket zip front stand collar", primaryImageUrl:"/lamalo/women-blazer.jpg" }, OUTER),
  ...cc({ name:"Lamalo A-Line Midi Skirt", description:"Pull-on A-line midi skirt with elasticated waist and fluid drape.", category:"bottoms", subcategory:"skirts", genderFit:"female", materials:["100% Polyester"], styleTags:["skirt","A-line","comfort","seniors","easy"], referencePrompt:"Women's pull-on A-line midi skirt elasticated waist fluid drape", primaryImageUrl:"/lamalo/women-skirt.jpg" }, DRESS),
  ...cc({ name:"Lamalo Floral Cotton Nightgown", description:"Knee-length cotton nightgown with floral print, button placket and short sleeves.", category:"sleepwear", subcategory:"nightwear", genderFit:"female", materials:["100% Cotton"], styleTags:["sleepwear","comfort","nightgown","floral"], referencePrompt:"Women's knee-length cotton nightgown floral print short sleeves button", primaryImageUrl:"/lamalo/women-linen-dress.jpg" }, ["Blue Floral","Pink Floral","Green Floral","Lavender Floral","Yellow Floral","Red Floral","Cream Floral","Navy Floral"]),
];

const womensComfort: SeedCollection = { name:"Lamalo Women's Comfort Series", description:"Soft, easy-to-wear styles designed for everyday comfort and confidence.", collectionType:"comfort", season:"All-Season", year:2026, styleTags:["comfort","seniors","easy-fit","relaxed","women"], collectionPriceAud:cp(womensComfortItems), items:womensComfortItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 13 — Kids' Everyday
// ─────────────────────────────────────────────────────────────────────────────

const kidsEverydayItems: SeedItem[] = [
  ...cc({ name:"Lamalo Kids' Graphic Tee", description:"Soft cotton kids' tee with fun Lamalo graphic print and crew neck.", category:"tops", subcategory:"t-shirts", genderFit:"unisex", materials:["100% Cotton"], styleTags:["kids","tee","graphic","casual"], referencePrompt:"Kids' graphic print cotton tee crew neck colourful Lamalo", primaryImageUrl:"/lamalo/kids-graphic-tee.jpg" }, ["White","Navy","Red","Yellow","Forest Green","Cobalt Blue","Burgundy","Orange","Grey","Pink"]),
  ...cc({ name:"Lamalo Kids' School Polo", description:"Classic kids' pique polo with three-button placket — school-ready.", category:"tops", subcategory:"polos", genderFit:"unisex", materials:["100% Cotton Pique"], styleTags:["kids","polo","school","classic"], referencePrompt:"Kids' classic pique polo three-button placket school uniform", primaryImageUrl:"/lamalo/kids-polo-shirt.jpg" }, ["White","Navy","Royal Blue","Forest Green","Red","Burgundy","Black","Grey"]),
  ...cc({ name:"Lamalo Kids' Slim Denim", description:"Slim-fit kids' denim with adjustable inner waistband and five-pocket design.", category:"bottoms", subcategory:"jeans", genderFit:"unisex", materials:["98% Cotton","2% Elastane"], styleTags:["kids","denim","school","casual"], referencePrompt:"Kids' slim-fit denim jeans adjustable waistband five-pocket", primaryImageUrl:"/lamalo/kids-denim-jean.jpg" }, ["Indigo","Mid-Wash Blue","Black","Dark Rinse","Light Blue","Stone Wash","Raw Denim"]),
  ...cc({ name:"Lamalo Kids' Fleece Hoodie", description:"Soft-fleece kids' hoodie with kangaroo pocket and coloured drawstring.", category:"tops", subcategory:"hoodies", genderFit:"unisex", materials:["80% Cotton","20% Polyester"], styleTags:["kids","hoodie","casual","layering"], referencePrompt:"Kids' soft-fleece hoodie kangaroo pocket coloured drawstring", primaryImageUrl:"/lamalo/kids-hoodie.jpg" }, ["Navy","Red","Forest Green","Grey","Orange","Royal Blue","Burgundy","Pink"]),
  ...cc({ name:"Lamalo Girls' Linen Dress", description:"A-line linen dress for girls with smocked bodice and puff sleeves.", category:"dresses", subcategory:"dresses", genderFit:"female", materials:["55% Linen","45% Cotton"], styleTags:["kids","girls","dress","summer","linen"], referencePrompt:"Girls' A-line linen dress smocked bodice puff sleeves summer", primaryImageUrl:"/lamalo/kids-dress.jpg" }, ["White","Sage Green","Dusty Rose","Cobalt Blue","Yellow","Lavender","Navy","Coral"]),
  ...cc({ name:"Lamalo Kids' Cotton Shorts", description:"Pull-on kids' cotton shorts with adjustable inner waistband.", category:"bottoms", subcategory:"shorts", genderFit:"unisex", materials:["100% Cotton"], styleTags:["kids","shorts","casual","summer"], referencePrompt:"Kids' pull-on cotton shorts adjustable inner waistband casual", primaryImageUrl:"/lamalo/kids-denim-jean.jpg" }, ["Navy","Black","Khaki","Red","Forest Green","Cobalt Blue","Grey","Orange"]),
  ...cc({ name:"Lamalo Kids' Puffer Jacket", description:"Baffled puffer jacket for kids with zip front and hood.", category:"outerwear", subcategory:"jackets", genderFit:"unisex", materials:["Recycled Nylon Shell","Polyester Fill"], styleTags:["kids","puffer","winter","warm"], referencePrompt:"Kids' baffled puffer jacket zip front hood warm winter", primaryImageUrl:"/lamalo/kids-hoodie.jpg" }, ["Navy","Red","Black","Forest Green","Royal Blue","Orange","Burgundy","Coral Pink"]),
];

const kidsEveryday: SeedCollection = { name:"Lamalo Kids' Everyday", description:"Durable, fun everyday kids' clothing for school and play.", collectionType:"core", season:"All-Season", year:2026, styleTags:["kids","casual","school","everyday","durable"], collectionPriceAud:cp(kidsEverydayItems), items:kidsEverydayItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 14 — Kids' Active
// ─────────────────────────────────────────────────────────────────────────────

const kidsActiveItems: SeedItem[] = [
  ...cc({ name:"Lamalo Kids' Retro Tracksuit", description:"Two-piece kids' retro tracksuit with contrast stripe — zip top and elasticated pants.", category:"tops", subcategory:"tracksuits", genderFit:"unisex", materials:["100% Polyester Tricot"], styleTags:["kids","tracksuit","retro","sport"], referencePrompt:"Kids' retro two-piece tracksuit contrast stripe zip top elasticated pants", primaryImageUrl:"/lamalo/kids-hoodie.jpg" }, ["Navy/White","Red/White","Black/White","Green/White","Royal Blue/White","Burgundy/Gold","Grey/Black","Orange/White"]),
  ...cc({ name:"Lamalo Kids' Sport Shorts", description:"Lightweight kids' sport shorts with elastic waist and side pockets.", category:"bottoms", subcategory:"shorts", genderFit:"unisex", materials:["100% Polyester"], styleTags:["kids","sport","shorts","training"], referencePrompt:"Kids' lightweight sport shorts elastic waist side pockets", primaryImageUrl:"/lamalo/kids-denim-jean.jpg" }, ["Black","Navy","Red","Forest Green","Royal Blue","Grey","Orange","White"]),
  ...cc({ name:"Lamalo Kids' Soccer Jersey", description:"Kids' performance soccer jersey with mesh ventilation and athletic fit.", category:"tops", subcategory:"sport-jerseys", genderFit:"unisex", materials:["100% Polyester"], styleTags:["kids","soccer","jersey","sport","team"], referencePrompt:"Kids' performance soccer jersey mesh ventilation athletic fit", primaryImageUrl:"/lamalo/kids-polo-shirt.jpg" }, SPORT),
  ...cc({ name:"Lamalo Kids' Basketball Jersey", description:"Kids' sleeveless mesh basketball jersey with number-ready front.", category:"tops", subcategory:"sport-jerseys", genderFit:"unisex", materials:["100% Polyester Mesh"], styleTags:["kids","basketball","jersey","sleeveless","sport"], referencePrompt:"Kids' sleeveless mesh basketball jersey number-ready sporty", primaryImageUrl:"/lamalo/kids-polo-shirt.jpg" }, SPORT),
  ...cc({ name:"Lamalo Kids' Waterproof Rain Jacket", description:"Kids' packable waterproof jacket with sealed seams and adjustable hood.", category:"outerwear", subcategory:"jackets", genderFit:"unisex", materials:["Waterproof Nylon","Taped Seams"], styleTags:["kids","rain","waterproof","packable"], referencePrompt:"Kids' packable waterproof rain jacket sealed seams adjustable hood", primaryImageUrl:"/lamalo/kids-hoodie.jpg" }, ["Yellow","Navy","Red","Forest Green","Royal Blue","Orange","Black","Coral Pink"]),
];

const kidsActive: SeedCollection = { name:"Lamalo Kids' Active", description:"Sport and activity wear built tough for energetic kids.", collectionType:"sport", season:"All-Season", year:2026, styleTags:["kids","sport","active","soccer","basketball","running"], collectionPriceAud:cp(kidsActiveItems), items:kidsActiveItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 15 — Kids' Swimwear
// ─────────────────────────────────────────────────────────────────────────────

const kidsSwimwearItems: SeedItem[] = [
  ...cc({ name:"Lamalo Kids' UPF50+ One-Piece", description:"One-piece kids' swimsuit with UPF50+ protection and crossback design.", category:"swimwear", subcategory:"swimsuits", genderFit:"female", materials:["80% Nylon","20% Elastane"], styleTags:["kids","swimsuit","UPF50+","girls"], referencePrompt:"Kids' girls UPF50+ one-piece swimsuit crossback beach protection", primaryImageUrl:"/lamalo/kids-swimsuit.jpg" }, ["Navy","Black","Cobalt Blue","Coral Pink","Teal","Sage Green","Burgundy","Yellow"]),
  ...cc({ name:"Lamalo Kids' Rashguard Set", description:"Two-piece UPF50+ rashguard set — long-sleeve top and board short.", category:"swimwear", subcategory:"rashguards", genderFit:"unisex", materials:["Recycled Nylon","Elastane"], styleTags:["kids","rashguard","UPF50+","surf"], referencePrompt:"Kids' two-piece UPF50+ rashguard set long-sleeve board short surf", primaryImageUrl:"/lamalo/kids-swimsuit.jpg" }, ["Navy","Black","Red","Forest Green","Royal Blue","Cobalt Blue","Teal","Orange"]),
  ...cc({ name:"Lamalo Boys' Swim Short", description:"Mid-length boys' board short with quick-dry fabric and Velcro fly.", category:"swimwear", subcategory:"board-shorts", genderFit:"male", materials:["100% Polyester"], styleTags:["kids","boys","swim","board-short"], referencePrompt:"Boys' mid-length board shorts quick-dry Velcro fly beach swim", primaryImageUrl:"/lamalo/kids-swimsuit.jpg" }, SWIM_M),
  ...cc({ name:"Lamalo Girls' Frill Swimsuit", description:"Girls' frill-trim one-piece with adjustable straps and cute print.", category:"swimwear", subcategory:"swimsuits", genderFit:"female", materials:["80% Nylon","20% Elastane"], styleTags:["kids","girls","swimsuit","frill","cute"], referencePrompt:"Girls' frill-trim one-piece swimsuit adjustable straps cute print", primaryImageUrl:"/lamalo/kids-swimsuit.jpg" }, ["Coral Pink","Navy","Teal","Yellow","Cobalt Blue","Sage Green","Purple","Red"]),
];

const kidsSwimwear: SeedCollection = { name:"Lamalo Kids' Swimwear", description:"Fun and protective swimwear for kids at the beach and pool.", collectionType:"swimwear", season:"Summer", year:2026, styleTags:["kids","swim","beach","UPF50+","fun"], collectionPriceAud:cp(kidsSwimwearItems), items:kidsSwimwearItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 16 — Men's Footwear  (10 types × 7 colours)
// ─────────────────────────────────────────────────────────────────────────────

const mensFootwearItems: SeedItem[] = [
  // 1. Canvas Lo Sneaker
  ...cc({ name:"Lamalo Canvas Lo Sneaker", description:"Clean low-top canvas sneaker with vulcanised rubber sole — court-inspired.", category:"footwear", subcategory:"sneakers", genderFit:"male", materials:["Canvas Upper","Vulcanised Rubber Sole"], styleTags:["sneaker","canvas","minimal","casual"], referencePrompt:"Men's low-top canvas sneaker vulcanised rubber sole minimal court", primaryImageUrl:"/lamalo/shoe-canvas-sneaker.jpg" }, SHOE_M),
  // 2. Performance Runner
  ...cc({ name:"Lamalo Performance Runner", description:"Cushioned performance running shoe with breathable mesh upper and EVA midsole.", category:"footwear", subcategory:"runners", genderFit:"male", materials:["Mesh Upper","EVA Midsole","Rubber Outsole"], styleTags:["running","performance","athletic","trainer"], referencePrompt:"Men's cushioned performance running shoe mesh upper EVA midsole", primaryImageUrl:"/lamalo/shoe-running.jpg" }, SHOE_M),
  // 3. Oxford Dress Shoe
  ...cc({ name:"Lamalo Oxford Dress Shoe", description:"Classic cap-toe Oxford in polished leather with leather sole and stacked heel.", category:"footwear", subcategory:"dress-shoes", genderFit:"male", materials:["Full-Grain Leather","Leather Sole"], styleTags:["Oxford","dress","formal","leather"], referencePrompt:"Men's cap-toe Oxford leather dress shoe polished formal", primaryImageUrl:"/lamalo/shoe-dress-oxford.jpg" }, ["Black","Dark Brown","Tan","Burgundy","Navy","Cognac","Chestnut"]),
  // 4. Penny Loafer
  ...cc({ name:"Lamalo Penny Loafer", description:"Slip-on penny loafer in premium leather with a classic saddle strap.", category:"footwear", subcategory:"loafers", genderFit:"male", materials:["Premium Leather","Leather Sole"], styleTags:["loafer","smart-casual","slip-on","classic"], referencePrompt:"Men's slip-on penny loafer premium leather saddle strap classic", primaryImageUrl:"/lamalo/shoe-loafer.jpg" }, ["Black","Dark Brown","Tan","Burgundy","Navy","Cognac","Cream"]),
  // 5. Chelsea Boot
  ...cc({ name:"Lamalo Chelsea Boot", description:"Sleek Chelsea boot in smooth leather with elastic side gussets.", category:"footwear", subcategory:"boots", genderFit:"male", materials:["Leather Upper","Leather Sole"], styleTags:["boot","Chelsea","smart","versatile"], referencePrompt:"Men's Chelsea boot smooth leather elastic gussets sleek", primaryImageUrl:"/lamalo/shoe-chelsea-boot.jpg" }, ["Black","Dark Brown","Tan","Burgundy","Navy","Cognac","Grey"]),
  // 6. Flip Flop / Thong
  ...cc({ name:"Lamalo Classic Flip Flop", description:"Lightweight EVA flip flop with contoured footbed and textured strap.", category:"footwear", subcategory:"flip-flops", genderFit:"male", materials:["EVA Footbed","Rubber Sole","TPU Strap"], styleTags:["flip-flop","thong","beach","summer","casual"], referencePrompt:"Men's lightweight EVA flip flop contoured footbed textured strap beach", primaryImageUrl:"/lamalo/shoe-slide.jpg" }, ["Navy","Black","White","Cobalt Blue","Forest Green","Tan","Red"]),
  // 7. Sport Sandal
  ...cc({ name:"Lamalo Sport Sandal", description:"Adjustable sport sandal with hook-and-loop straps, toe loop and contoured EVA footbed.", category:"footwear", subcategory:"sandals", genderFit:"male", materials:["Synthetic Upper","EVA Footbed","Rubber Outsole"], styleTags:["sandal","sport","adjustable","outdoor"], referencePrompt:"Men's adjustable sport sandal hook-and-loop straps toe loop EVA contoured", primaryImageUrl:"/lamalo/shoe-slide.jpg" }, ["Black","Brown","Navy","Olive","Grey","Tan","Forest Green"]),
  // 8. Recovery Slide
  ...cc({ name:"Lamalo Recovery Slide", description:"Cushioned recovery slide with wide strap and contoured foam footbed.", category:"footwear", subcategory:"slides", genderFit:"male", materials:["Foam Footbed","Wide Synthetic Strap"], styleTags:["slide","recovery","casual","pool","gym"], referencePrompt:"Men's cushioned recovery slide wide strap contoured foam footbed pool", primaryImageUrl:"/lamalo/shoe-slide.jpg" }, SHOE_M),
  // 9. Hiking Boot
  ...cc({ name:"Lamalo Hiking Boot", description:"Mid-cut waterproof hiking boot with ankle support and aggressive rubber outsole.", category:"footwear", subcategory:"boots", genderFit:"male", materials:["Waterproof Leather","Rubber Outsole","Padded Collar"], styleTags:["hiking","boot","waterproof","outdoor","trail"], referencePrompt:"Men's mid-cut waterproof hiking boot ankle support aggressive outsole trail", primaryImageUrl:"/lamalo/shoe-chelsea-boot.jpg" }, ["Brown/Tan","Black/Grey","Olive/Brown","Tan/Sand","Grey/Black","Navy/Orange","Forest Green/Tan"]),
  // 10. Chukka / Work Boot
  ...cc({ name:"Lamalo Chukka Boot", description:"Desert-style chukka boot in suede with two-eyelet lacing and crepe sole.", category:"footwear", subcategory:"boots", genderFit:"male", materials:["Suede Upper","Crepe Rubber Sole"], styleTags:["chukka","boot","casual","desert","versatile"], referencePrompt:"Men's desert-style suede chukka boot two-eyelet lacing crepe sole", primaryImageUrl:"/lamalo/shoe-chelsea-boot.jpg" }, ["Sand","Black","Dark Brown","Cobalt Blue","Olive","Charcoal","Tan"]),
];

const mensFootwear: SeedCollection = { name:"Lamalo Men's Footwear", description:"10 footwear types for men — from Oxford to flip flop, in 7 colours each.", collectionType:"footwear", season:"All-Season", year:2026, styleTags:["footwear","shoes","sneakers","boots","sandals","flip-flops","men"], collectionPriceAud:cp(mensFootwearItems), items:mensFootwearItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 17 — Women's Footwear  (11 types × 7 colours)
// ─────────────────────────────────────────────────────────────────────────────

const womensFootwearItems: SeedItem[] = [
  // 1. Platform Sneaker
  ...cc({ name:"Lamalo Platform Sneaker", description:"Chunky-sole platform sneaker in faux leather with lace-up front.", category:"footwear", subcategory:"sneakers", genderFit:"female", materials:["Faux Leather Upper","Platform Rubber Sole"], styleTags:["sneaker","platform","streetwear","chunky"], referencePrompt:"Women's platform sneaker chunky sole faux leather lace-up streetwear", primaryImageUrl:"/lamalo/shoe-platform-sneaker.jpg" }, SHOE_F),
  // 2. Running Shoe
  ...cc({ name:"Lamalo Women's Runner", description:"Lightweight women's running shoe with breathable mesh upper and responsive cushioning.", category:"footwear", subcategory:"runners", genderFit:"female", materials:["Mesh Upper","Foam Midsole","Rubber Outsole"], styleTags:["running","athletic","lightweight","trainer"], referencePrompt:"Women's lightweight running shoe mesh upper responsive cushioning", primaryImageUrl:"/lamalo/shoe-running.jpg" }, SHOE_F),
  // 3. Strappy Heel Sandal
  ...cc({ name:"Lamalo Strappy Heel Sandal", description:"Thin-strap heeled sandal with adjustable ankle wrap and stiletto heel.", category:"footwear", subcategory:"heels", genderFit:"female", materials:["Synthetic Strap","Block-Heel or Stiletto"], styleTags:["sandal","heel","strappy","evening","feminine"], referencePrompt:"Women's strappy heeled sandal adjustable ankle wrap stiletto elegant", primaryImageUrl:"/lamalo/shoe-heel.jpg" }, ["Black","Nude Beige","Silver","Gold","Navy","Blush Pink","Red"]),
  // 4. Ballet Flat
  ...cc({ name:"Lamalo Ballet Flat", description:"Classic pointed-toe ballet flat in soft leather with elastic topline.", category:"footwear", subcategory:"flats", genderFit:"female", materials:["Soft Leather","Leather Insole"], styleTags:["flat","ballet","classic","versatile","feminine"], referencePrompt:"Women's pointed-toe ballet flat soft leather elastic topline classic", primaryImageUrl:"/lamalo/shoe-flat.jpg" }, ["Black","Nude Beige","Navy","Blush Pink","Red","Camel","White"]),
  // 5. Kitten Heel Pump
  ...cc({ name:"Lamalo Kitten Heel Pump", description:"Closed-toe kitten heel pump in premium leather with V-cut vamp.", category:"footwear", subcategory:"heels", genderFit:"female", materials:["Premium Leather","Leather Lining"], styleTags:["pump","kitten-heel","classic","office","elegant"], referencePrompt:"Women's closed-toe kitten heel pump V-cut vamp leather classic office", primaryImageUrl:"/lamalo/shoe-heel.jpg" }, ["Black","Nude Beige","Navy","Blush Pink","Red","Camel","Silver"]),
  // 6. Ankle Boot
  ...cc({ name:"Lamalo Ankle Boot", description:"Side-zip ankle boot in smooth leather with block heel and pointed toe.", category:"footwear", subcategory:"boots", genderFit:"female", materials:["Leather Upper","Block Heel","Side Zip"], styleTags:["boot","ankle","block-heel","versatile"], referencePrompt:"Women's side-zip ankle boot smooth leather block heel pointed toe", primaryImageUrl:"/lamalo/shoe-ankle-boot.jpg" }, ["Black","Dark Brown","Tan","Burgundy","Navy","Cognac","Camel"]),
  // 7. Knee-High Boot
  ...cc({ name:"Lamalo Knee-High Boot", description:"Pull-on knee-high boot in smooth leather with a block heel and inside zip.", category:"footwear", subcategory:"boots", genderFit:"female", materials:["Smooth Leather","Inside Zip","Block Heel"], styleTags:["boot","knee-high","statement","autumn","winter"], referencePrompt:"Women's pull-on knee-high leather boot block heel inside zip statement", primaryImageUrl:"/lamalo/shoe-ankle-boot.jpg" }, ["Black","Dark Brown","Tan","Burgundy","Navy","Cognac","Camel"]),
  // 8. Flip Flop
  ...cc({ name:"Lamalo Women's Flip Flop", description:"Slim-strap women's flip flop with soft EVA footbed and rubber outsole.", category:"footwear", subcategory:"flip-flops", genderFit:"female", materials:["Soft EVA Footbed","Slim TPU Strap","Rubber Outsole"], styleTags:["flip-flop","beach","summer","casual","minimal"], referencePrompt:"Women's slim-strap EVA flip flop beach summer casual minimal", primaryImageUrl:"/lamalo/shoe-slide.jpg" }, ["White","Black","Nude Beige","Navy","Blush Pink","Coral","Silver"]),
  // 9. Slide Sandal
  ...cc({ name:"Lamalo Slide Sandal", description:"Single-band slide sandal in padded faux leather for everyday comfort.", category:"footwear", subcategory:"slides", genderFit:"female", materials:["Faux Leather Band","Cushioned Footbed"], styleTags:["slide","sandal","minimal","casual","easy"], referencePrompt:"Women's single-band faux leather slide sandal cushioned footbed casual", primaryImageUrl:"/lamalo/shoe-slide.jpg" }, SHOE_F),
  // 10. Cork Wedge Sandal
  ...cc({ name:"Lamalo Cork Wedge Sandal", description:"Espadrille-inspired cork wedge sandal with ankle wrap strap.", category:"footwear", subcategory:"wedges", genderFit:"female", materials:["Cork Wedge","Ankle Wrap Strap","Leather Insole"], styleTags:["wedge","sandal","cork","summer","resort"], referencePrompt:"Women's cork wedge sandal ankle wrap strap espadrille summer resort", primaryImageUrl:"/lamalo/shoe-wedge.jpg" }, ["Natural Cork/Tan","Black/Black","White/White","Navy/Gold","Camel/Tan","Nude/Natural","Coral/Tan"]),
  // 11. Women's Loafer
  ...cc({ name:"Lamalo Women's Loafer", description:"Polished slip-on loafer with gold-tone hardware detail on the vamp.", category:"footwear", subcategory:"loafers", genderFit:"female", materials:["Premium Leather","Leather Sole"], styleTags:["loafer","smart","classic","office","elegant"], referencePrompt:"Women's polished loafer gold-tone hardware vamp leather smart office", primaryImageUrl:"/lamalo/shoe-flat.jpg" }, ["Black","Tan","Navy","Burgundy","Camel","White","Cobalt Blue"]),
];

const womensFootwear: SeedCollection = { name:"Lamalo Women's Footwear", description:"11 footwear styles for women — from flip flop to knee-high boot, in 7 colours.", collectionType:"footwear", season:"All-Season", year:2026, styleTags:["footwear","shoes","heels","boots","sandals","flats","women"], collectionPriceAud:cp(womensFootwearItems), items:womensFootwearItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 18 — Watches
// ─────────────────────────────────────────────────────────────────────────────

const watchItems: SeedItem[] = [
  ...cc({ name:"Lamalo Men's Classic Dress Watch", description:"36mm stainless steel dress watch with slim profile and leather strap.", category:"accessories", subcategory:"watches", genderFit:"male", materials:["316L Stainless Steel","Leather Strap","Mineral Crystal"], styleTags:["watch","dress","classic","formal"], referencePrompt:"Men's slim 36mm dress watch stainless steel leather strap formal", primaryImageUrl:"/lamalo/watch-dress.jpg" }, WATCH_M),
  ...cc({ name:"Lamalo Men's Sport Chronograph", description:"42mm sport chronograph with tachymeter bezel and rubber strap.", category:"accessories", subcategory:"watches", genderFit:"male", materials:["316L Stainless Steel","Rubber Strap","Mineral Crystal"], styleTags:["watch","sport","chronograph","athletic"], referencePrompt:"Men's 42mm sport chronograph tachymeter bezel rubber strap", primaryImageUrl:"/lamalo/watch-sport.jpg" }, WATCH_M),
  ...cc({ name:"Lamalo Men's Minimalist Watch", description:"38mm ultra-thin watch with mesh bracelet and clean dial.", category:"accessories", subcategory:"watches", genderFit:"male", materials:["Stainless Steel Mesh Bracelet","Mineral Crystal"], styleTags:["watch","minimalist","everyday","mesh"], referencePrompt:"Men's 38mm ultra-thin minimalist watch mesh bracelet clean dial", primaryImageUrl:"/lamalo/watch-dress.jpg" }, WATCH_M),
  ...cc({ name:"Lamalo Men's Field Watch", description:"40mm military field watch with canvas strap and luminous hands.", category:"accessories", subcategory:"watches", genderFit:"male", materials:["Steel Case","Canvas Strap","Luminous Hands"], styleTags:["watch","field","military","rugged","casual"], referencePrompt:"Men's 40mm military field watch canvas strap luminous hands rugged", primaryImageUrl:"/lamalo/watch-sport.jpg" }, WATCH_M),
  ...cc({ name:"Lamalo Women's Elegant Watch", description:"32mm women's watch with a slim case and satin-finish bracelet.", category:"accessories", subcategory:"watches", genderFit:"female", materials:["316L Stainless Steel","Satin Bracelet","Sapphire-Coated Crystal"], styleTags:["watch","elegant","women","slim"], referencePrompt:"Women's 32mm slim elegant watch satin bracelet sapphire crystal", primaryImageUrl:"/lamalo/watch-ladies.jpg" }, WATCH_F),
  ...cc({ name:"Lamalo Women's Fashion Watch", description:"36mm fashion watch with a two-tone case and mesh bracelet.", category:"accessories", subcategory:"watches", genderFit:"female", materials:["Two-Tone Steel","Mesh Bracelet","Mineral Crystal"], styleTags:["watch","fashion","two-tone","women"], referencePrompt:"Women's 36mm two-tone fashion watch mesh bracelet mineral crystal", primaryImageUrl:"/lamalo/watch-ladies.jpg" }, WATCH_F),
  ...cc({ name:"Lamalo Women's Sport Watch", description:"38mm women's sport watch with silicone strap and step-counter display.", category:"accessories", subcategory:"watches", genderFit:"female", materials:["Polymer Case","Silicone Strap"], styleTags:["watch","sport","active","women"], referencePrompt:"Women's 38mm sport watch silicone strap step-counter active", primaryImageUrl:"/lamalo/watch-sport.jpg" }, WATCH_F),
];

const watches: SeedCollection = { name:"Lamalo Watches", description:"Precision timekeeping for every occasion — dress to sport.", collectionType:"accessories", season:"All-Season", year:2026, styleTags:["watch","accessories","luxury","sport","minimalist"], collectionPriceAud:cp(watchItems), items:watchItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 19 — Eyewear
// ─────────────────────────────────────────────────────────────────────────────

const eyewearItems: SeedItem[] = [
  ...cc({ name:"Lamalo Sport Shield", description:"Wrap-around sport shield with UV400 and anti-fog lens.", category:"accessories", subcategory:"eyewear", genderFit:"unisex", materials:["TR90 Frame","Polycarbonate Lens"], styleTags:["sunglasses","sport","athletic","UV400"], referencePrompt:"Wrap-around sport shield sunglasses UV400 anti-fog athletic", primaryImageUrl:"/lamalo/eyewear-sport.jpg" }, EYEWEAR),
  ...cc({ name:"Lamalo Oversized Fashion", description:"Bold oversized square frame sunglasses — fashion statement.", category:"accessories", subcategory:"eyewear", genderFit:"female", materials:["Acetate Frame","Gradient Lens"], styleTags:["sunglasses","oversized","fashion","bold"], referencePrompt:"Oversized square frame fashion sunglasses gradient lens bold", primaryImageUrl:"/lamalo/eyewear-fashion.jpg" }, EYEWEAR),
  ...cc({ name:"Lamalo Retro Round", description:"Retro round keyhole-bridge sunglasses in acetate.", category:"accessories", subcategory:"eyewear", genderFit:"unisex", materials:["Acetate Frame","Mineral Glass Lens"], styleTags:["sunglasses","retro","round","vintage"], referencePrompt:"Retro round keyhole-bridge acetate sunglasses vintage", primaryImageUrl:"/lamalo/eyewear-fashion.jpg" }, EYEWEAR),
  ...cc({ name:"Lamalo Classic Aviator", description:"Teardrop aviator with metal frame and polarised lens.", category:"accessories", subcategory:"eyewear", genderFit:"unisex", materials:["Metal Frame","Polarised Lens"], styleTags:["sunglasses","aviator","classic","polarised"], referencePrompt:"Classic teardrop aviator metal frame polarised lens timeless", primaryImageUrl:"/lamalo/eyewear-fashion.jpg" }, EYEWEAR),
  ...cc({ name:"Lamalo Minimal Rectangle", description:"Slim rectangular sunglasses with thin metal temples.", category:"accessories", subcategory:"eyewear", genderFit:"unisex", materials:["Metal Frame","UV400 Lens"], styleTags:["sunglasses","rectangle","minimal","modern"], referencePrompt:"Slim rectangular sunglasses thin metal temples minimalist", primaryImageUrl:"/lamalo/eyewear-fashion.jpg" }, EYEWEAR),
  ...cc({ name:"Lamalo Cat-Eye", description:"Upswept cat-eye frame in acetate — feminine and bold.", category:"accessories", subcategory:"eyewear", genderFit:"female", materials:["Acetate Frame","Tinted Lens"], styleTags:["sunglasses","cat-eye","feminine","retro"], referencePrompt:"Upswept cat-eye acetate sunglasses feminine bold retro", primaryImageUrl:"/lamalo/eyewear-fashion.jpg" }, EYEWEAR),
  ...cc({ name:"Lamalo Sport Wrap", description:"Lightweight sport wrap with rubberised nose pads and UV400 lens.", category:"accessories", subcategory:"eyewear", genderFit:"unisex", materials:["TR90 Frame","UV400 Lens","Rubberised Nosepads"], styleTags:["sunglasses","sport","wrap","lightweight","UV400"], referencePrompt:"Lightweight sport wrap sunglasses rubberised nose pads UV400", primaryImageUrl:"/lamalo/eyewear-sport.jpg" }, EYEWEAR),
  ...cc({ name:"Lamalo Vintage Browline", description:"Retro browline glasses with bold upper frame and thin lower wire.", category:"accessories", subcategory:"eyewear", genderFit:"unisex", materials:["Mixed Acetate/Metal Frame","Mineral Lens"], styleTags:["glasses","browline","vintage","retro"], referencePrompt:"Retro browline glasses bold upper frame thin wire lower vintage", primaryImageUrl:"/lamalo/eyewear-fashion.jpg" }, EYEWEAR),
];

const eyewear: SeedCollection = { name:"Lamalo Eyewear", description:"Frames for every face — sport to fashion, minimal to bold.", collectionType:"accessories", season:"All-Season", year:2026, styleTags:["eyewear","sunglasses","fashion","sport","UV400"], collectionPriceAud:cp(eyewearItems), items:eyewearItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 20 — Headwear
// ─────────────────────────────────────────────────────────────────────────────

const headwearItems: SeedItem[] = [
  ...cc({ name:"Lamalo Structured Baseball Cap", description:"Six-panel structured baseball cap with pre-curved brim and snap closure.", category:"accessories", subcategory:"hats", genderFit:"unisex", materials:["100% Cotton","Snap Closure"], styleTags:["cap","baseball","casual","streetwear"], referencePrompt:"Six-panel structured baseball cap pre-curved brim snap closure", primaryImageUrl:"/lamalo/hat-baseball-cap.jpg" }, HAT),
  ...cc({ name:"Lamalo Bucket Hat", description:"Unstructured cotton bucket hat with downturned brim.", category:"accessories", subcategory:"hats", genderFit:"unisex", materials:["100% Cotton"], styleTags:["hat","bucket","summer","casual","beach"], referencePrompt:"Unstructured cotton bucket hat downturned brim beach summer", primaryImageUrl:"/lamalo/hat-bucket.jpg" }, HAT),
  ...cc({ name:"Lamalo Wide-Brim Sun Hat", description:"Packable wide-brim sun hat in woven paper straw with ribbon trim.", category:"accessories", subcategory:"hats", genderFit:"female", materials:["Paper Straw","Ribbon Trim"], styleTags:["hat","sun","wide-brim","beach","summer"], referencePrompt:"Packable wide-brim paper straw sun hat ribbon trim beach", primaryImageUrl:"/lamalo/hat-bucket.jpg" }, ["Natural Straw/Navy Ribbon","Natural Straw/Black Ribbon","Natural Straw/Red Ribbon","Black Straw","White Straw","Natural Straw/Camel","Natural Straw/Cobalt Ribbon"]),
  ...cc({ name:"Lamalo Ribbed Knit Beanie", description:"Snug-fit ribbed knit beanie with a folded cuff.", category:"accessories", subcategory:"beanies", genderFit:"unisex", materials:["100% Acrylic Knit"], styleTags:["beanie","knit","winter","casual"], referencePrompt:"Ribbed knit beanie folded cuff warm winter casual", primaryImageUrl:"/lamalo/hat-beanie.jpg" }, HAT),
  ...cc({ name:"Lamalo Dad Cap", description:"Unstructured six-panel dad cap with a low-profile and Velcro closure.", category:"accessories", subcategory:"hats", genderFit:"unisex", materials:["100% Cotton","Velcro Closure"], styleTags:["cap","dad","unstructured","casual"], referencePrompt:"Unstructured low-profile dad cap six-panel Velcro closure", primaryImageUrl:"/lamalo/hat-baseball-cap.jpg" }, HAT),
  ...cc({ name:"Lamalo Trucker Cap", description:"Five-panel trucker cap with mesh back and snap closure.", category:"accessories", subcategory:"hats", genderFit:"unisex", materials:["Cotton Front","Polyester Mesh Back","Snap Closure"], styleTags:["cap","trucker","mesh","casual"], referencePrompt:"Five-panel trucker cap mesh back snap closure casual", primaryImageUrl:"/lamalo/hat-baseball-cap.jpg" }, HAT),
  ...cc({ name:"Lamalo Wool Flat Cap", description:"Heritage wool flat cap with a short peak and button detail.", category:"accessories", subcategory:"hats", genderFit:"male", materials:["Wool Blend","Lining"], styleTags:["cap","flat","wool","heritage","classic"], referencePrompt:"Heritage wool flat cap short peak button detail classic", primaryImageUrl:"/lamalo/hat-flat-cap.jpg" }, ["Charcoal","Camel","Grey Herringbone","Black","Navy","Brown Herringbone","Cream Herringbone"]),
  ...cc({ name:"Lamalo Wool Beret", description:"Classic French-style beret in boiled wool.", category:"accessories", subcategory:"hats", genderFit:"female", materials:["Boiled Wool"], styleTags:["beret","french","classic","autumn","women"], referencePrompt:"Classic French boiled wool beret autumn fashion", primaryImageUrl:"/lamalo/hat-bucket.jpg" }, ["Black","Camel","Navy","Burgundy","Cobalt Blue","Forest Green","Grey"]),
  ...cc({ name:"Lamalo Performance Visor", description:"Lightweight performance visor with moisture-wicking sweatband.", category:"accessories", subcategory:"visors", genderFit:"unisex", materials:["Polyester","Moisture-Wicking Sweatband"], styleTags:["visor","sport","running","tennis"], referencePrompt:"Lightweight performance visor moisture-wicking sweatband sport", primaryImageUrl:"/lamalo/hat-baseball-cap.jpg" }, ["White","Black","Navy","Red","Forest Green","Cobalt Blue","Camel"]),
];

const headwear: SeedCollection = { name:"Lamalo Headwear", description:"Hats, caps and beanies for every head and every season.", collectionType:"accessories", season:"All-Season", year:2026, styleTags:["headwear","hat","cap","beanie","sun","sport"], collectionPriceAud:cp(headwearItems), items:headwearItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 21 — Bags & Handbags
// ─────────────────────────────────────────────────────────────────────────────

const bagsItems: SeedItem[] = [
  ...cc({ name:"Lamalo Canvas Tote", description:"Oversized cotton canvas tote with interior slip pocket and sturdy handles.", category:"bags", subcategory:"totes", genderFit:"unisex", materials:["Heavy Canvas","Cotton Handles"], styleTags:["tote","casual","beach","everyday"], referencePrompt:"Large canvas tote bag interior slip pocket sturdy handles casual", primaryImageUrl:"/lamalo/bag-tote.jpg" }, NEUTRAL),
  ...cc({ name:"Lamalo Leather Crossbody", description:"Compact zip-top crossbody in premium leather with adjustable strap.", category:"bags", subcategory:"crossbody", genderFit:"female", materials:["Premium Leather","Adjustable Strap"], styleTags:["crossbody","leather","compact","everyday"], referencePrompt:"Compact leather zip-top crossbody bag adjustable strap premium", primaryImageUrl:"/lamalo/bag-handbag.jpg" }, NEUTRAL),
  ...cc({ name:"Lamalo Evening Clutch", description:"Slim envelope clutch in faux leather with wrist strap.", category:"bags", subcategory:"clutches", genderFit:"female", materials:["Faux Leather","Chain Wrist Strap"], styleTags:["clutch","evening","formal","slim"], referencePrompt:"Slim envelope clutch faux leather chain wrist strap evening formal", primaryImageUrl:"/lamalo/bag-handbag.jpg" }, ["Black","Gold","Silver","Navy","Dusty Rose","Cobalt Blue","Champagne","Burgundy"]),
  ...cc({ name:"Lamalo Sport Duffel", description:"Weekend duffel with shoe compartment, wet pocket and padded straps.", category:"bags", subcategory:"duffels", genderFit:"unisex", materials:["Nylon","Padded Carry Strap"], styleTags:["duffel","sport","travel","gym","weekend"], referencePrompt:"Sport weekend duffel shoe compartment wet pocket padded straps gym", primaryImageUrl:"/lamalo/bag-tote.jpg" }, NEUTRAL),
  ...cc({ name:"Lamalo Quilted Shoulder Bag", description:"Quilted faux leather shoulder bag with chain strap and flip-lock closure.", category:"bags", subcategory:"shoulder-bags", genderFit:"female", materials:["Quilted Faux Leather","Chain Strap"], styleTags:["shoulder-bag","quilted","feminine","everyday"], referencePrompt:"Quilted faux leather shoulder bag chain strap flip-lock closure", primaryImageUrl:"/lamalo/bag-handbag.jpg" }, ["Black","Camel","Navy","Dusty Rose","Cobalt Blue","Cream","Burgundy"]),
  ...cc({ name:"Lamalo Structured Leather Tote", description:"Rigid top-handle tote in full-grain leather with zip closure.", category:"bags", subcategory:"totes", genderFit:"female", materials:["Full-Grain Leather","Metal Feet"], styleTags:["tote","leather","structured","professional"], referencePrompt:"Structured full-grain leather top-handle tote zip closure professional", primaryImageUrl:"/lamalo/bag-handbag.jpg" }, ["Black","Tan","Navy","Camel","Burgundy","Cognac","Cream"]),
  ...cc({ name:"Lamalo Mini Shoulder Bag", description:"Mini chain shoulder bag with flap and magnetic closure.", category:"bags", subcategory:"shoulder-bags", genderFit:"female", materials:["Faux Leather","Chain Strap","Magnetic Closure"], styleTags:["mini","shoulder","chain","fashion","going-out"], referencePrompt:"Mini chain shoulder bag flap magnetic closure going-out fashion", primaryImageUrl:"/lamalo/bag-handbag.jpg" }, ["Black","Gold","Silver","Cobalt Blue","Dusty Rose","White","Burgundy"]),
  ...cc({ name:"Lamalo Travel Weekender", description:"Spacious canvas weekender with leather trim and trolley sleeve.", category:"bags", subcategory:"travel", genderFit:"unisex", materials:["Canvas","Leather Trim","Trolley Sleeve"], styleTags:["travel","weekender","canvas","spacious"], referencePrompt:"Spacious canvas weekender bag leather trim trolley sleeve travel", primaryImageUrl:"/lamalo/bag-tote.jpg" }, ["Navy","Black","Tan/Brown","Olive","Charcoal","Camel","Cream"]),
];

const bags: SeedCollection = { name:"Lamalo Bags & Handbags", description:"Everyday bags, evening clutches and travel-ready duffels.", collectionType:"accessories", season:"All-Season", year:2026, styleTags:["bags","handbag","tote","crossbody","leather","travel"], collectionPriceAud:cp(bagsItems), items:bagsItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 22 — Accessories
// ─────────────────────────────────────────────────────────────────────────────

const accessoriesItems: SeedItem[] = [
  ...cc({ name:"Lamalo Men's Leather Belt", description:"Classic pin-buckle leather belt in full-grain cowhide.", category:"accessories", subcategory:"belts", genderFit:"male", materials:["Full-Grain Cowhide","Nickel-Tone Buckle"], styleTags:["belt","leather","formal","classic"], referencePrompt:"Men's classic pin-buckle full-grain leather belt formal", primaryImageUrl:"/lamalo/accessory-belt.jpg" }, ["Black","Dark Brown","Tan","Cognac","Burgundy","Navy","Camel"]),
  ...cc({ name:"Lamalo Women's Leather Belt", description:"Slim leather belt with gold-tone buckle — versatile and elegant.", category:"accessories", subcategory:"belts", genderFit:"female", materials:["Full-Grain Leather","Gold-Tone Buckle"], styleTags:["belt","leather","slim","elegant"], referencePrompt:"Women's slim leather belt gold-tone buckle elegant versatile", primaryImageUrl:"/lamalo/accessory-belt.jpg" }, ["Black","Tan","White","Camel","Nude Beige","Cobalt Blue","Burgundy"]),
  ...cc({ name:"Lamalo Men's Slim Wallet", description:"Slim bifold wallet in full-grain leather with 6 card slots.", category:"accessories", subcategory:"wallets", genderFit:"male", materials:["Full-Grain Leather"], styleTags:["wallet","slim","leather","bifold"], referencePrompt:"Men's slim bifold leather wallet 6 card slots minimal", primaryImageUrl:"/lamalo/accessory-belt.jpg" }, ["Black","Dark Brown","Tan","Cognac","Navy","Burgundy","Forest Green"]),
  ...cc({ name:"Lamalo Women's Silk Scarf", description:"Large 90×90cm silk-twill scarf with hand-rolled edges.", category:"accessories", subcategory:"scarves", genderFit:"female", materials:["100% Silk Twill"], styleTags:["scarf","silk","luxury","women"], referencePrompt:"Women's 90cm square silk twill scarf hand-rolled edges luxury", primaryImageUrl:"/lamalo/accessory-scarf.jpg" }, ["Navy/Gold","Black/White","Cobalt/Coral","Dusty Rose/Cream","Forest Green/Gold","Burgundy/Cream","Camel/White"]),
  ...cc({ name:"Lamalo Merino Knit Scarf", description:"Fine-knit merino scarf with fringed ends — winter essential.", category:"accessories", subcategory:"scarves", genderFit:"unisex", materials:["100% Merino Wool"], styleTags:["scarf","merino","winter","knit"], referencePrompt:"Fine-knit merino wool scarf fringed ends winter essential", primaryImageUrl:"/lamalo/accessory-scarf.jpg" }, ["Charcoal","Navy","Camel","Burgundy","Forest Green","Cobalt Blue","Cream"]),
  ...cc({ name:"Lamalo Gold Chain Necklace", description:"18ct gold-plated cable-chain necklace in three lengths.", category:"accessories", subcategory:"jewellery", genderFit:"female", materials:["18ct Gold-Plated Brass"], styleTags:["jewellery","necklace","gold","minimal"], referencePrompt:"18ct gold-plated cable chain necklace minimal elegant gold", primaryImageUrl:"/lamalo/accessory-scarf.jpg" }, ["Yellow Gold","Rose Gold","White Gold/Silver","Layered Yellow Gold","Layered Rose Gold","Two-Tone Gold","Matte Gold"]),
  ...cc({ name:"Lamalo Gold Hoop Earrings", description:"Polished gold-plated hoop earrings in small, medium and large.", category:"accessories", subcategory:"jewellery", genderFit:"female", materials:["18ct Gold-Plated Brass"], styleTags:["jewellery","earrings","hoops","gold"], referencePrompt:"Polished gold-plated hoop earrings classic elegant", primaryImageUrl:"/lamalo/accessory-scarf.jpg" }, ["Small Yellow Gold","Medium Yellow Gold","Large Yellow Gold","Small Rose Gold","Medium Rose Gold","Small Silver","Medium Silver"]),
  ...cc({ name:"Lamalo Leather Gloves", description:"Unlined leather gloves with a clean seam and touchscreen-compatible fingertips.", category:"accessories", subcategory:"gloves", genderFit:"unisex", materials:["Full-Grain Leather","Touchscreen Tips"], styleTags:["gloves","leather","winter","touchscreen"], referencePrompt:"Leather gloves touchscreen-compatible fingertips clean seam winter", primaryImageUrl:"/lamalo/accessory-scarf.jpg" }, ["Black","Dark Brown","Tan","Camel","Navy","Burgundy","Forest Green"]),
];

const accessories: SeedCollection = { name:"Lamalo Accessories", description:"The finishing touches — belts, wallets, scarves, jewellery and gloves.", collectionType:"accessories", season:"All-Season", year:2026, styleTags:["accessories","belts","scarves","jewellery","wallets","gloves"], collectionPriceAud:cp(accessoriesItems), items:accessoriesItems };

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION 23 — Comfort Swimwear (Seniors / Modest)
// ─────────────────────────────────────────────────────────────────────────────

const comfortSwimItems: SeedItem[] = [
  ...cc({ name:"Lamalo Women's Skirted Swimsuit", description:"One-piece swimsuit with attached swim skirt for modest coverage.", category:"swimwear", subcategory:"swimsuits", genderFit:"female", materials:["80% Nylon","20% Elastane"], styleTags:["swimwear","modest","skirted","seniors"], referencePrompt:"Women's one-piece swimsuit attached swim skirt modest senior coverage", primaryImageUrl:"/lamalo/women-swimsuit.jpg" }, SWIM_F),
  ...cc({ name:"Lamalo Men's Comfort Swim Short", description:"Longer-length swim short with elastic waist and side pockets — easy and comfortable.", category:"swimwear", subcategory:"swim-shorts", genderFit:"male", materials:["100% Polyester","Elastic Waist"], styleTags:["swimwear","comfort","seniors","long-short"], referencePrompt:"Men's longer-length comfort swim shorts elastic waist easy seniors", primaryImageUrl:"/lamalo/swim-board-short.jpg" }, SWIM_M),
  ...cc({ name:"Lamalo Women's Swim Tunic", description:"Long-sleeve swim tunic with UPF50+ and knee-length coverage.", category:"swimwear", subcategory:"swimsuits", genderFit:"female", materials:["Recycled Nylon","Elastane"], styleTags:["swimwear","tunic","UPF50+","modest","long-sleeve"], referencePrompt:"Women's long-sleeve UPF50+ swim tunic knee-length modest coverage", primaryImageUrl:"/lamalo/swim-rash-guard.jpg" }, ["Navy","Black","Cobalt Blue","Teal","Burgundy","Forest Green","White","Sage Green"]),
  ...cc({ name:"Lamalo Unisex Aqua Shoe", description:"Quick-dry aqua shoe with rubber sole for pool, beach and water sports.", category:"footwear", subcategory:"water-shoes", genderFit:"unisex", materials:["Neoprene Upper","Rubber Sole"], styleTags:["aqua","water-shoe","pool","beach","quick-dry"], referencePrompt:"Quick-dry neoprene aqua shoe rubber sole pool beach water sport", primaryImageUrl:"/lamalo/shoe-slide.jpg" }, ["Black","Navy","Cobalt Blue","Teal","Forest Green","Coral","White"]),
];

const comfortSwim: SeedCollection = { name:"Lamalo Comfort Swimwear", description:"Modest, senior-friendly and comfortable swimwear for pool and beach.", collectionType:"swimwear", season:"Summer", year:2026, styleTags:["swimwear","modest","seniors","comfort","UPF50+"], collectionPriceAud:cp(comfortSwimItems), items:comfortSwimItems };

// ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // COLLECTION 24 — Kids' Footwear
  // ─────────────────────────────────────────────────────────────────────────────

  const SHOE_K = ["White","Black","Navy","Red","Royal Blue","Pink","Purple"];

  const kidsFootwearItems: SeedItem[] = [
    ...cc({ name:"Lamalo Kids' Canvas Sneaker", description:"Classic lace-up canvas sneaker for kids — durable and easy to clean.", category:"footwear", subcategory:"sneakers", genderFit:"unisex", materials:["Canvas Upper","Rubber Sole"], styleTags:["sneakers","kids","casual","school"], referencePrompt:"Kids' canvas lace-up sneaker rubber sole durable casual school", primaryImageUrl:"/lamalo/shoe-sneaker.jpg", sizeRange:"EU 24–38" }, SHOE_K),
    ...cc({ name:"Lamalo Kids' Velcro Trainer", description:"Lightweight kids' trainer with velcro closure — easy for little hands.", category:"footwear", subcategory:"trainers", genderFit:"unisex", materials:["Mesh Upper","EVA Sole"], styleTags:["trainers","kids","velcro","easy-on"], referencePrompt:"Kids' lightweight velcro trainer mesh upper EVA sole easy-on", primaryImageUrl:"/lamalo/shoe-sneaker.jpg", sizeRange:"EU 24–36" }, SHOE_K),
    ...cc({ name:"Lamalo Kids' School Shoe", description:"Classic leather-look school shoe with cushioned insole and buckle detail.", category:"footwear", subcategory:"school-shoes", genderFit:"unisex", materials:["Synthetic Leather","Rubber Sole"], styleTags:["school","formal","kids","buckle"], referencePrompt:"Kids' classic leather-look school shoe cushioned insole buckle", primaryImageUrl:"/lamalo/shoe-oxford.jpg", sizeRange:"EU 28–38" }, ["Black","Brown","Navy","Tan","White"]),
    ...cc({ name:"Lamalo Kids' Running Shoe", description:"Lightweight kids' running shoe with responsive foam sole and reflective detail.", category:"footwear", subcategory:"running", genderFit:"unisex", materials:["Engineered Mesh","Foam Midsole"], styleTags:["running","sport","kids","lightweight"], referencePrompt:"Kids' lightweight running shoe engineered mesh foam midsole reflective", primaryImageUrl:"/lamalo/shoe-runner.jpg", sizeRange:"EU 28–38" }, ["White/Blue","Black/Red","Navy/Lime","Grey/Orange","White/Pink","Black/White","Blue/Yellow"]),
    ...cc({ name:"Lamalo Kids' Sandal", description:"Adjustable velcro sandal for kids with cushioned footbed and water-resistant straps.", category:"footwear", subcategory:"sandals", genderFit:"unisex", materials:["Synthetic Strap","EVA Footbed"], styleTags:["sandals","summer","kids","beach"], referencePrompt:"Kids' adjustable velcro sandal cushioned footbed water-resistant summer", primaryImageUrl:"/lamalo/shoe-slide.jpg", sizeRange:"EU 24–36" }, ["Black","Navy","Tan","Red","Blue","Pink","White"]),
    ...cc({ name:"Lamalo Kids' Gumboot", description:"Classic kids' gumboot in matte rubber with pull-on loop — puddle-proof.", category:"footwear", subcategory:"boots", genderFit:"unisex", materials:["Natural Rubber"], styleTags:["boots","rain","kids","waterproof","gumboots"], referencePrompt:"Kids' classic matte rubber gumboot pull-on loop waterproof rain", primaryImageUrl:"/lamalo/shoe-boot.jpg", sizeRange:"EU 24–36" }, ["Navy","Black","Red","Green","Yellow","Pink","Blue"]),
    ...cc({ name:"Lamalo Kids' Slip-On", description:"Easy pull-on kids' slip-on with elastic gusset and cushioned sole — great for quick trips.", category:"footwear", subcategory:"slip-ons", genderFit:"unisex", materials:["Canvas","Rubber Sole"], styleTags:["slip-on","kids","easy","casual"], referencePrompt:"Kids' canvas slip-on elastic gusset cushioned sole casual easy-on", primaryImageUrl:"/lamalo/shoe-sneaker.jpg", sizeRange:"EU 24–36" }, SHOE_K),
  ];

  const kidsFootwear: SeedCollection = { name:"Lamalo Kids' Footwear", description:"Durable, fun footwear for kids from toddlers to tweens — sneakers, school shoes, sandals and more.", collectionType:"footwear", season:"All-Season", year:2026, styleTags:["footwear","kids","sneakers","school","sandals"], collectionPriceAud:cp(kidsFootwearItems), items:kidsFootwearItems };

  // ─────────────────────────────────────────────────────────────────────────────
  // COLLECTION 25 — Teens' Casual
  // ─────────────────────────────────────────────────────────────────────────────

  const teensItems: SeedItem[] = [
    ...cc({ name:"Lamalo Teens' Oversized Tee", description:"Dropped-shoulder oversized tee for teens in soft cotton jersey — effortlessly cool.", category:"tops", subcategory:"t-shirts", genderFit:"unisex", materials:["100% Cotton Jersey"], styleTags:["oversized","teens","casual","streetwear"], referencePrompt:"Teens' oversized dropped-shoulder cotton tee casual streetwear", primaryImageUrl:"/lamalo/men-tshirt.jpg", sizeRange:"XS–XL Teen" }, TOPS),
    ...cc({ name:"Lamalo Teens' Graphic Hoodie", description:"Heavyweight pullover hoodie with Lamalo graphic chest print — a teen wardrobe essential.", category:"tops", subcategory:"hoodies", genderFit:"unisex", materials:["80% Cotton","20% Polyester"], styleTags:["hoodie","graphic","teens","streetwear"], referencePrompt:"Teens' heavyweight pullover hoodie graphic chest print streetwear", primaryImageUrl:"/lamalo/men-zip-hoodie.jpg", sizeRange:"XS–XL Teen" }, HOODIE),
    ...cc({ name:"Lamalo Teens' Cargo Pants", description:"Relaxed-fit cargo pants with side utility pockets — the teen street staple.", category:"bottoms", subcategory:"cargo", genderFit:"unisex", materials:["100% Cotton Twill"], styleTags:["cargo","teens","streetwear","relaxed"], referencePrompt:"Teens' relaxed-fit cotton cargo pants side utility pockets street", primaryImageUrl:"/lamalo/men-chino-trouser.jpg", sizeRange:"XS–XL Teen" }, ["Khaki","Black","Olive","Stone","Charcoal","Sand","Forest Green","Navy"]),
    ...cc({ name:"Lamalo Teens' Denim Jacket", description:"Classic unisex denim jacket in a boxy teen fit with raw-hem detail.", category:"outerwear", subcategory:"denim-jackets", genderFit:"unisex", materials:["100% Cotton Denim"], styleTags:["denim","teens","jacket","casual"], referencePrompt:"Teens' classic boxy-fit denim jacket raw-hem unisex casual", primaryImageUrl:"/lamalo/men-denim-jacket.jpg", sizeRange:"XS–XL Teen" }, DENIM),
    ...cc({ name:"Lamalo Teens' Bomber Jacket", description:"Satin-finish bomber jacket with ribbed collar, cuffs and hem — teen-approved.", category:"outerwear", subcategory:"bomber", genderFit:"unisex", materials:["100% Polyester Satin"], styleTags:["bomber","teens","jacket","streetwear"], referencePrompt:"Teens' satin-finish bomber jacket ribbed collar cuffs hem street", primaryImageUrl:"/lamalo/men-bomber-jacket.jpg", sizeRange:"XS–XL Teen" }, OUTER),
    ...cc({ name:"Lamalo Teens' Track Pants", description:"Slim tapered track pants with side stripe and elasticated ankle — sport meets street.", category:"bottoms", subcategory:"track-pants", genderFit:"unisex", materials:["80% Cotton","20% Polyester"], styleTags:["track-pants","teens","sport","street"], referencePrompt:"Teens' slim tapered track pants side stripe elasticated ankle sport street", primaryImageUrl:"/lamalo/men-jogger.jpg", sizeRange:"XS–XL Teen" }, ["Black","Navy","Charcoal","Forest Green","Burgundy","Cobalt Blue","White","Olive"]),
    ...cc({ name:"Lamalo Girls' Crop Top", description:"Fitted crop tee with ribbed texture and a relaxed open-edge hem.", category:"tops", subcategory:"crop-tops", genderFit:"female", materials:["95% Cotton","5% Elastane"], styleTags:["crop-top","teens","girls","casual"], referencePrompt:"Teens' girls fitted ribbed crop top relaxed open-edge hem casual", primaryImageUrl:"/lamalo/women-blouse.jpg", sizeRange:"XS–L Teen" }, ["White","Black","Blush Pink","Sage Green","Lavender","Cream","Dusty Rose","Navy"]),
    ...cc({ name:"Lamalo Teens' Mini Skirt", description:"Low-rise denim mini skirt with frayed hem — a teen classic.", category:"bottoms", subcategory:"skirts", genderFit:"female", materials:["100% Cotton Denim"], styleTags:["mini-skirt","teens","girls","denim","casual"], referencePrompt:"Teens' low-rise denim mini skirt frayed hem casual", primaryImageUrl:"/lamalo/women-wide-leg-trouser.jpg", sizeRange:"XS–L Teen" }, DENIM),
  ];

  const teens: SeedCollection = { name:"Lamalo Teens' Casual", description:"Street-ready teen fashion — oversized tees, cargo pants, bombers, and denim for the next generation.", collectionType:"casual", season:"All-Season", year:2026, styleTags:["teens","streetwear","casual","denim","oversized"], collectionPriceAud:cp(teensItems), items:teensItems };

  // ─────────────────────────────────────────────────────────────────────────────
  // COLLECTION 26 — Professional / Costume Uniforms
  // ─────────────────────────────────────────────────────────────────────────────

  const professionalItems: SeedItem[] = [
    ...cc({ name:"Lamalo Police Uniform Shirt", description:"Regulation-style navy police uniform shirt with epaulettes and badge tab — crisp and authoritative.", category:"tops", subcategory:"uniform-shirt", genderFit:"unisex", materials:["65% Polyester","35% Cotton"], styleTags:["police","uniform","professional","costume"], referencePrompt:"Police uniform shirt navy epaulettes badge tab regulation professional", primaryImageUrl:"/lamalo/men-linen-shirt.jpg" }, ["Navy","Black","White","Charcoal","Royal Blue"]),
    ...cc({ name:"Lamalo Police Uniform Pants", description:"Straight-leg uniform trousers with side stripe and reinforced knee panels.", category:"bottoms", subcategory:"uniform-pants", genderFit:"unisex", materials:["65% Polyester","35% Cotton"], styleTags:["police","uniform","pants","professional"], referencePrompt:"Police uniform trousers straight-leg side stripe reinforced knee professional", primaryImageUrl:"/lamalo/men-chino-trouser.jpg" }, ["Navy","Black","Charcoal","Royal Blue"]),
    ...cc({ name:"Lamalo Nurse Scrub Top", description:"V-neck nursing scrub top with two patch pockets and a relaxed unisex fit.", category:"tops", subcategory:"scrubs", genderFit:"unisex", materials:["55% Cotton","45% Polyester"], styleTags:["nurse","scrubs","medical","professional","healthcare"], referencePrompt:"Nurse V-neck scrub top patch pockets unisex medical healthcare", primaryImageUrl:"/lamalo/men-polo-shirt.jpg" }, ["Navy","Black","Royal Blue","Ceil Blue","Hunter Green","Burgundy","White","Charcoal"]),
    ...cc({ name:"Lamalo Nurse Scrub Pants", description:"Straight-leg nursing scrub pants with drawstring waist, cargo pocket and ankle hem.", category:"bottoms", subcategory:"scrubs", genderFit:"unisex", materials:["55% Cotton","45% Polyester"], styleTags:["nurse","scrubs","medical","professional"], referencePrompt:"Nurse scrub pants straight-leg drawstring waist cargo pocket medical", primaryImageUrl:"/lamalo/men-chino-trouser.jpg" }, ["Navy","Black","Royal Blue","Ceil Blue","Hunter Green","Burgundy","White","Charcoal"]),
    ...cc({ name:"Lamalo Paramedic / Ambulance Shirt", description:"High-visibility ambulance uniform shirt with reflective tape and large chest pockets.", category:"tops", subcategory:"uniform-shirt", genderFit:"unisex", materials:["Polyester","Cotton Blend"], styleTags:["paramedic","ambulance","high-vis","professional","uniform"], referencePrompt:"Paramedic ambulance uniform shirt high-visibility reflective tape chest pockets", primaryImageUrl:"/lamalo/men-linen-shirt.jpg" }, ["Green/Yellow Hi-Vis","Orange Hi-Vis","Navy","White","Teal"]),
    ...cc({ name:"Lamalo Paramedic Cargo Pants", description:"Durable paramedic cargo pants with multiple utility pockets and reinforced knees.", category:"bottoms", subcategory:"cargo", genderFit:"unisex", materials:["Ripstop Polyester","Cotton"], styleTags:["paramedic","ambulance","cargo","professional","uniform"], referencePrompt:"Paramedic cargo pants utility pockets reinforced knees durable professional", primaryImageUrl:"/lamalo/men-chino-trouser.jpg" }, ["Navy","Black","Olive","Charcoal","Forest Green"]),
    ...cc({ name:"Lamalo Firefighter Station Shirt", description:"Station-wear shirt for firefighters in flame-resistant cotton with chest pocket and roll-up sleeves.", category:"tops", subcategory:"uniform-shirt", genderFit:"unisex", materials:["100% FR Cotton"], styleTags:["firefighter","station-wear","FR","professional","uniform"], referencePrompt:"Firefighter station shirt flame-resistant cotton chest pocket roll-up sleeves", primaryImageUrl:"/lamalo/men-linen-shirt.jpg" }, ["Navy","Black","Dark Blue","Charcoal","Forest Green"]),
    ...cc({ name:"Lamalo Firefighter Hi-Vis Vest", description:"High-visibility safety vest with reflective strips and multiple ID pockets — worn over station wear.", category:"outerwear", subcategory:"vest", genderFit:"unisex", materials:["100% Polyester Mesh"], styleTags:["firefighter","hi-vis","safety-vest","professional","reflective"], referencePrompt:"Firefighter high-visibility safety vest reflective strips ID pockets orange yellow", primaryImageUrl:"/lamalo/men-bomber-jacket.jpg" }, ["Orange Hi-Vis","Yellow Hi-Vis","Red Hi-Vis"]),
    ...cc({ name:"Lamalo Security Guard Shirt", description:"Dark navy security uniform shirt with epaulette loops and breast pockets.", category:"tops", subcategory:"uniform-shirt", genderFit:"unisex", materials:["65% Polyester","35% Cotton"], styleTags:["security","uniform","professional","guard"], referencePrompt:"Security guard uniform shirt dark navy epaulette loops breast pockets professional", primaryImageUrl:"/lamalo/men-linen-shirt.jpg" }, ["Black","Navy","Charcoal","Dark Grey"]),
    ...cc({ name:"Lamalo Chef's Jacket", description:"Classic double-breasted chef's jacket in white cotton with black toggle buttons.", category:"tops", subcategory:"chef-wear", genderFit:"unisex", materials:["100% Cotton"], styleTags:["chef","kitchen","uniform","professional","hospitality"], referencePrompt:"Chef's double-breasted jacket white cotton black toggle buttons professional kitchen", primaryImageUrl:"/lamalo/men-linen-shirt.jpg" }, ["White","Black","Navy","Charcoal","Checkered Black/White"]),
  ];

  const professional: SeedCollection = { name:"Lamalo Professional Uniforms", description:"Profession-ready costume and workwear — police, nurses, paramedics, firefighters, security and chefs.", collectionType:"uniform", season:"All-Season", year:2026, styleTags:["uniform","professional","costume","police","nurse","paramedic","firefighter"], collectionPriceAud:cp(professionalItems), items:professionalItems };

  
// ALL COLLECTIONS
// ─────────────────────────────────────────────────────────────────────────────

const ALL_COLLECTIONS: SeedCollection[] = [
  mensEveryday,
  mensPerformance,
  mensOriginals,
  mensLuxury,
  mensSwimsear,
  mensComfort,
  womensEveryday,
  womensActive,
  womensOriginals,
  womensLuxury,
  womensSwimwear,
  womensComfort,
  kidsEveryday,
  kidsActive,
  kidsSwimwear,
  mensFootwear,
  womensFootwear,
  watches,
  eyewear,
  headwear,
  bags,
  accessories,
  comfortSwim,
  kidsFootwear,
  teens,
  professional,
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────────────────────────────────────

export async function runLamaloSeed(
  userId: number
): Promise<{ created: boolean; collections: number; items: number }> {
  const db = (await getDb())!;

    // ── Ensure all marketplace columns exist before inserting (idempotent) ──
    // This guards against Railway deployments where autoMigrate ALTER TABLE may
    // not have run yet, or ran on an older schema version.
    {
      const wiCols: Array<[string, string]> = [
        ["collectionId",             "INT NULL"],
        ["designerProfileId",        "INT NULL"],
        ["subcategory",              "VARCHAR(128) NULL"],
        ["wardrobeType",             "VARCHAR(64) NOT NULL DEFAULT 'wardrobe'"],
        ["genderFit",                "VARCHAR(64) NULL"],
        ["sizeRange",                "VARCHAR(128) NULL"],
        ["colors",                   "JSON NULL"],
        ["materials",                "JSON NULL"],
        ["styleTags",                "JSON NULL"],
        ["imageUrls",                "JSON NULL"],
        ["primaryImageUrl",          "TEXT NULL"],
        ["referencePrompt",          "TEXT NULL"],
        ["brandPlacementAllowed",    "TINYINT(1) NOT NULL DEFAULT 0"],
        ["shopfrontPlacementAllowed","TINYINT(1) NOT NULL DEFAULT 1"],
        ["characterWardrobeAllowed", "TINYINT(1) NOT NULL DEFAULT 1"],
        ["costumeUseAllowed",        "TINYINT(1) NOT NULL DEFAULT 1"],
        ["commercialUseAllowed",     "TINYINT(1) NOT NULL DEFAULT 0"],
        ["licenseType",              "VARCHAR(64) NOT NULL DEFAULT 'reference_only'"],
        ["licenseNotes",             "TEXT NULL"],
        ["visibility",               "VARCHAR(32) NOT NULL DEFAULT 'public'"],
        ["status",                   "VARCHAR(32) NOT NULL DEFAULT 'active'"],
        ["retailPriceAud",           "INT NULL"],
        ["leasePriceAud",            "INT NULL"],
      ];
      for (const [col, def] of wiCols) {
        try {
          await db.execute(sql.raw(`ALTER TABLE wardrobeItems ADD COLUMN \`${col}\` ${def}`));
        } catch { /* duplicate column = already exists, skip */ }
      }
      // Also ensure designerCollections has needed columns
      const dcCols: Array<[string, string]> = [
        ["designerProfileId", "INT NOT NULL DEFAULT 0"],
        ["collectionType",    "VARCHAR(64) NOT NULL DEFAULT 'core'"],
        ["season",            "VARCHAR(64) NULL"],
        ["year",              "INT NULL"],
        ["styleTags",         "JSON NULL"],
        ["collectionPriceAud","INT NULL"],
        ["status",            "VARCHAR(32) NOT NULL DEFAULT 'active'"],
        ["visibility",        "VARCHAR(32) NOT NULL DEFAULT 'public'"],
      ];
      for (const [col, def] of dcCols) {
        try {
          await db.execute(sql.raw(`ALTER TABLE designerCollections ADD COLUMN \`${col}\` ${def}`));
        } catch { /* skip */ }
      }
    }
  
  // ── Get or create the Lamalo Fashion designer profile (idempotent) ──
  // Use raw INSERT IGNORE so duplicate-key errors on re-runs are silently skipped.
  await db.execute(sql`
    INSERT IGNORE INTO designerProfiles
      (userId, brandName, displayName, profileType, bio, website, instagram,
       contactEmail, logoUrl, verified, visibility, stripeAccountId,
       stripeAccountStatus, membershipStatus, membershipSubscriptionId,
       membershipCurrentPeriodEnd)
    VALUES
      (${userId}, 'Lamalo Fashion', 'Lamalo', 'brand',
       'Lamalo Fashion is the Virelle Studios in-house label — contemporary, accessible, and production-ready. Twenty-six curated collections spanning menswear, womenswear, kids, seniors, swimwear, footwear, watches, eyewear and accessories. Each colour is a separate purchasable item. Buy a full collection bundle and save 10%.',
       'https://virelle.life/wardrobe-marketplace', '@lamalofashion', 'wardrobe@virelle.life',
       'https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png',
       TRUE, 'public', NULL, 'none', 'active', NULL, '2099-12-31 00:00:00')
  `);

  // Always look up the real id after the upsert
  const profileRow = await db
    .select({ id: designerProfiles.id })
    .from(designerProfiles)
    .where(eq(designerProfiles.brandName, "Lamalo Fashion"))
    .limit(1);

  if (profileRow.length === 0) {
    throw new Error("Failed to find or create Lamalo Fashion designer profile");
  }
  const designerProfileId = profileRow[0].id;
  log.info(`Lamalo Fashion profile ready (id=${designerProfileId})`);

  let newCollections = 0;
  let totalItems = 0;

  for (const col of ALL_COLLECTIONS) {
    // Additive — skip if collection already exists
    const existingCol = await db
      .select({ id: designerCollections.id })
      .from(designerCollections)
      .where(
        and(
          eq(designerCollections.designerProfileId, designerProfileId),
          eq(designerCollections.name, col.name)
        )
      )
      .limit(1);

    if (existingCol.length > 0) {
      log.info(`Collection "${col.name}" already exists — skipping`);
      continue;
    }

    // Insert collection — price auto-calculated (sum of item prices × 0.90, 10% bundle discount)
    const [colResult] = await db.insert(designerCollections).values({
      designerProfileId,
      userId,
      name: col.name,
      description: col.description,
      collectionType: col.collectionType,
      season: col.season,
      year: col.year,
      styleTags: col.styleTags,
      visibility: "public",
      licenseType: "full_license",
      licenseNotes:
        "One-time purchase — use in any Virelle Studios production, present or future. " +
        "Platform retains 100% revenue for Lamalo in-house items.",
      collectionPriceAud: col.collectionPriceAud,
      published: true,
      publishedAt: new Date(),
    });

    const collectionId: number = (colResult as any).insertId;
    if (!collectionId) { log.warn(`Collection "${col.name}" insert returned no insertId, skipping items`); newCollections++; continue; }
    newCollections++;
    for (const item of col.items) {
      // Use raw SQL to avoid Drizzle double-encoding JSON columns
      // Use Pollinations URL — /lamalo/ paths 404 in production
        const imgUrl = (item.primaryImageUrl && !item.primaryImageUrl.startsWith('/lamalo/'))
          ? item.primaryImageUrl
          : pollinationsUrl(item.referencePrompt ?? `${item.name} ${item.category} fashion item`);
        const imgUrlsJson = JSON.stringify([imgUrl]);
        await db.execute(sql`
          INSERT IGNORE INTO wardrobeItems
            (collectionId, userId, designerProfileId, name, description, category,
             subcategory, wardrobeType, genderFit, sizeRange, era,
             colors, materials, styleTags, primaryImageUrl, imageUrls, referencePrompt,
             brandPlacementAllowed, shopfrontPlacementAllowed, characterWardrobeAllowed,
             costumeUseAllowed, commercialUseAllowed, licenseType, visibility, status,
             retailPriceAud, leasePriceAud)
          VALUES
            (${collectionId}, ${userId}, ${designerProfileId},
             ${item.name}, ${item.description}, ${item.category},
             ${item.subcategory ?? null}, ${"fashion"}, ${item.genderFit ?? null},
             ${item.sizeRange ?? "XS-XXL"}, ${"Contemporary 2026"},
             ${item.colors ? JSON.stringify(item.colors) : null},
             ${item.materials ? JSON.stringify(item.materials) : null},
             ${item.styleTags ? JSON.stringify(item.styleTags) : null},
             ${imgUrl}, ${imgUrlsJson}, ${item.referencePrompt ?? null},
             ${0}, ${1}, ${1}, ${1}, ${1},
             ${"full_license"}, ${"public"}, ${"active"},
             ${item.retailPriceAud ?? null}, ${null})
        `);
        totalItems++;
    }

    log.info(`Seeded collection "${col.name}" with ${col.items.length} items (collection bundle = ${(col.collectionPriceAud / 100).toFixed(2)} AUD)`);
  }

  log.info(`Lamalo Fashion seed complete — ${newCollections} new collections, ${totalItems} new items`);

    // ── Auto-patch any previously-seeded items still using /lamalo/ paths or missing images ──
    try {
      await db.execute(sql`
        UPDATE wardrobeItems
        SET
          primaryImageUrl = CONCAT(
            'https://image.pollinations.ai/prompt/',
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
              COALESCE(referencePrompt, CONCAT(name, ' ', COALESCE(category, 'fashion'), ' fashion item')),
            ' ','%20'),',','%2C'),'/','%2F'),'(','%28'),')','%29'),'&','%26'),
            '%2C%20product%20photo%2C%20plain%20white%20background%2C%20studio%20lighting%2C%20fashion%20photography?width=512&height=512&nologo=true&model=flux'
          ),
          imageUrls = JSON_ARRAY(CONCAT(
            'https://image.pollinations.ai/prompt/',
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
              COALESCE(referencePrompt, CONCAT(name, ' ', COALESCE(category, 'fashion'), ' fashion item')),
            ' ','%20'),',','%2C'),'/','%2F'),'(','%28'),')','%29'),'&','%26'),
            '%2C%20product%20photo%2C%20plain%20white%20background%2C%20studio%20lighting%2C%20fashion%20photography?width=512&height=512&nologo=true&model=flux'
          ))
        WHERE collectionId IS NOT NULL
          AND (
            primaryImageUrl IS NULL
            OR primaryImageUrl = ''
            OR primaryImageUrl LIKE '/lamalo/%'
            OR imageUrls IS NULL
          )
      `);
      log.info('Auto-patched existing wardrobeItems: replaced /lamalo/ paths with Pollinations URLs');
    } catch (e) {
      log.warn({ err: e }, 'Auto-patch image URLs failed (non-fatal)');
    }

    return { created: newCollections > 0, collections: newCollections, items: totalItems };
  }