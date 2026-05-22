/**
   * lamalo-seed.ts
   * Lamalo Fashion — Virelle Studios in-house brand
   * 22 collections · 223 items
   * Men · Women · Kids · Elderly/Comfort · Swimwear · Footwear · Watches · Eyewear · Headwear · Bags · Accessories
   *
   * Run via: admin.lamaloAdmin.seedLamalo (idempotent — additive per collection)
   */

  import { and, eq } from "drizzle-orm";
  import { getDb } from "./db";
  import { designerProfiles, designerCollections, wardrobeItems } from "../drizzle/schema";
  import { logger } from "./_core/logger";

  const log = logger.child({ module: "lamalo-seed" });

  interface SeedItem {
    name: string;
    description: string;
    category: string;
    subcategory: string;
    genderFit: string;
    colors: string[];
    materials: string[];
    styleTags: string[];
    leasePriceAud: number; // cents
    retailPriceAud: number; // cents
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
    collectionPriceAud: number; // cents
    items: SeedItem[];
  }

  // ─── Collection 1: Men's Everyday Casual (Country Road DNA) ─────────────────

  const mensEveryday: SeedCollection = {
    name: "Lamalo Men's Everyday",
    description: "Relaxed daily-wear for men built on natural fabrics, clean silhouettes and versatile earth tones. Country Road heritage reinterpreted under the Lamalo label.",
    collectionType: "core",
    season: "All-Season",
    year: 2026,
    styleTags: ["casual","everyday","linen","sustainable","relaxed"],
    collectionPriceAud: 8500,
    items: [
      { name: "Lamalo Linen Overshirt", description: "Relaxed-fit linen-blend overshirt with chest pockets and a split hem. Wears open as a light layer or buttoned as a shirt.", category: "tops", subcategory: "shirts", genderFit: "male", colors: ["Sage Green","Sand","White","Slate"], materials: ["55% Linen","45% Cotton"], styleTags: ["linen","relaxed","coastal","layering"], leasePriceAud: 900, retailPriceAud: 5500, referencePrompt: "Men's relaxed linen overshirt sage green", primaryImageUrl: "/lamalo/men-linen-shirt.jpg" },
      { name: "Lamalo Classic Polo", description: "Pique cotton polo with two-button placket and contrast tipping. A clean everyday essential.", category: "tops", subcategory: "polos", genderFit: "male", colors: ["Cobalt Blue","White","Charcoal","Navy"], materials: ["100% Cotton Pique"], styleTags: ["polo","smart-casual","preppy"], leasePriceAud: 700, retailPriceAud: 4000, referencePrompt: "Men's classic pique polo cobalt blue", primaryImageUrl: "/lamalo/men-polo-shirt.jpg" },
      { name: "Lamalo Slim Chino", description: "Slim-fit cotton twill chino with a clean front, belt loops and side seam pockets.", category: "bottoms", subcategory: "chinos", genderFit: "male", colors: ["Camel","Navy","Stone","Black"], materials: ["98% Cotton","2% Elastane"], styleTags: ["chino","smart-casual","versatile"], leasePriceAud: 1000, retailPriceAud: 6000, referencePrompt: "Men's slim chino trousers camel", primaryImageUrl: "/lamalo/men-chino-trouser.jpg" },
      { name: "Lamalo Straight Denim", description: "Mid-rise straight-leg selvedge denim with classic five-pocket construction.", category: "bottoms", subcategory: "jeans", genderFit: "male", colors: ["Indigo","Mid-Wash","Black"], materials: ["98% Cotton Denim","2% Elastane"], styleTags: ["denim","classic","everyday"], leasePriceAud: 1200, retailPriceAud: 7000, referencePrompt: "Men's straight selvedge denim jeans indigo", primaryImageUrl: "/lamalo/men-denim-jean.jpg" },
      { name: "Lamalo Full-Zip Hoodie", description: "Heavyweight cotton-fleece full-zip hoodie with a structured hood and kangaroo zip pocket.", category: "tops", subcategory: "hoodies", genderFit: "male", colors: ["Forest Green","Charcoal","Navy"], materials: ["80% Cotton","20% Polyester Fleece"], styleTags: ["hoodie","casual","layering"], leasePriceAud: 1100, retailPriceAud: 6500, referencePrompt: "Men's full-zip heavyweight fleece hoodie forest green", primaryImageUrl: "/lamalo/men-zip-hoodie.jpg" },
      { name: "Lamalo Bomber Jacket", description: "Classic satin-shell bomber with ribbed cuffs, collar and hem. Minimal branding, maximum versatility.", category: "outerwear", subcategory: "jackets", genderFit: "male", colors: ["Midnight Black","Olive","Sand"], materials: ["Nylon Shell","Polyester Lining","Ribbed Knit Trim"], styleTags: ["bomber","streetwear","minimal"], leasePriceAud: 1600, retailPriceAud: 9500, referencePrompt: "Men's classic bomber jacket midnight black", primaryImageUrl: "/lamalo/men-bomber-jacket.jpg" },
      { name: "Lamalo Premium Tee", description: "Supima cotton crew-neck tee with a medium weight and relaxed silhouette. The daily essential.", category: "tops", subcategory: "t-shirts", genderFit: "male", colors: ["White","Off-White","Sage","Black"], materials: ["100% Supima Cotton"], styleTags: ["tee","essential","relaxed"], leasePriceAud: 500, retailPriceAud: 3000, referencePrompt: "Men's premium Supima cotton tee white minimal", primaryImageUrl: "/lamalo/men-polo-shirt.jpg" },
      { name: "Lamalo Linen Short", description: "Mid-length linen-blend short with an elastic-back waist and side pockets. Summer essential.", category: "bottoms", subcategory: "shorts", genderFit: "male", colors: ["Sand","Navy","Charcoal"], materials: ["55% Linen","45% Cotton"], styleTags: ["linen","summer","casual"], leasePriceAud: 700, retailPriceAud: 4000, referencePrompt: "Men's relaxed linen shorts sand natural", primaryImageUrl: "/lamalo/men-chino-trouser.jpg" },
      { name: "Lamalo Cotton Henley", description: "Three-button henley in soft pima cotton with a relaxed fit.", category: "tops", subcategory: "t-shirts", genderFit: "male", colors: ["White","Grey","Navy"], materials: ["100% Pima Cotton"], styleTags: ["henley","casual","coastal"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Men's cotton henley shirt white relaxed", primaryImageUrl: "/lamalo/men-polo-shirt.jpg" },
      { name: "Lamalo Woven Short", description: "Casual woven short in durable cotton with a clean finish and cargo-style pocket detail.", category: "bottoms", subcategory: "shorts", genderFit: "male", colors: ["Khaki","Olive","Navy"], materials: ["100% Cotton"], styleTags: ["shorts","casual","utility"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Men's cotton woven shorts khaki casual", primaryImageUrl: "/lamalo/men-chino-trouser.jpg" },
    ],
  };

  // ─── Collection 2: Men's Performance Sport (Nike DNA) ────────────────────────

  const mensSport: SeedCollection = {
    name: "Lamalo Men's Performance",
    description: "High-function athletic wear built for training and beyond. Moisture-wicking performance fabrics, ergonomic cuts and clean sport aesthetics.",
    collectionType: "sport",
    season: "All-Season",
    year: 2026,
    styleTags: ["athletic","performance","training","sport","activewear"],
    collectionPriceAud: 7500,
    items: [
      { name: "Lamalo Track Jacket", description: "Lightweight full-zip track jacket with contrast side stripe. Performance tricot with a standard fit and two side zip pockets.", category: "outerwear", subcategory: "track-jackets", genderFit: "male", colors: ["Burnt Orange/White","Black","Cobalt Blue"], materials: ["100% Polyester Tricot"], styleTags: ["sport","track","retro-athletic"], leasePriceAud: 1100, retailPriceAud: 6500, referencePrompt: "Men's retro athletic track jacket burnt orange white stripe", primaryImageUrl: "/lamalo/men-track-jacket.jpg" },
      { name: "Lamalo Tapered Jogger", description: "Tapered performance jogger with ribbed ankle cuffs, drawstring waist and zip side pockets.", category: "bottoms", subcategory: "joggers", genderFit: "male", colors: ["Charcoal","Black","Navy"], materials: ["60% Cotton","40% Polyester"], styleTags: ["jogger","sport","athleisure"], leasePriceAud: 1000, retailPriceAud: 6000, referencePrompt: "Men's tapered jogger pants charcoal ribbed cuffs", primaryImageUrl: "/lamalo/men-jogger-pant.jpg" },
      { name: "Lamalo Dri-Lite Running Tee", description: "Ultra-lightweight moisture-wicking tee with flatlock seams and a technical mesh back panel.", category: "tops", subcategory: "t-shirts", genderFit: "male", colors: ["Forest Green","White","Black"], materials: ["Recycled Polyester"], styleTags: ["running","technical","lightweight"], leasePriceAud: 550, retailPriceAud: 3500, referencePrompt: "Men's lightweight running t-shirt forest green athletic", primaryImageUrl: "/lamalo/men-polo-shirt.jpg" },
      { name: "Lamalo Performance Short", description: "5" inseam training short with built-in mesh liner and an inner key pocket.", category: "bottoms", subcategory: "shorts", genderFit: "male", colors: ["Black","Navy","Charcoal"], materials: ["Nylon","Mesh Lining"], styleTags: ["training","shorts","athletic"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Men's performance training shorts black mesh", primaryImageUrl: "/lamalo/men-jogger-pant.jpg" },
      { name: "Lamalo Zip Sport Hoodie", description: "Performance full-zip hoodie with moisture-wicking cotton-blend fleece and a fitted athletic cut.", category: "tops", subcategory: "hoodies", genderFit: "male", colors: ["Forest Green","Black","Grey"], materials: ["60% Cotton","40% Polyester"], styleTags: ["hoodie","sport","training"], leasePriceAud: 1100, retailPriceAud: 6500, referencePrompt: "Men's performance zip sport hoodie forest green", primaryImageUrl: "/lamalo/men-zip-hoodie.jpg" },
      { name: "Lamalo Wind-Lite Jacket", description: "Packable wind and light-rain jacket in ripstop nylon. Zips into its own chest pocket.", category: "outerwear", subcategory: "jackets", genderFit: "male", colors: ["Cobalt Blue","Black","Forest Green"], materials: ["Ripstop Nylon"], styleTags: ["windbreaker","packable","running"], leasePriceAud: 1400, retailPriceAud: 8500, referencePrompt: "Men's lightweight packable windbreaker cobalt blue", primaryImageUrl: "/lamalo/men-track-jacket.jpg" },
      { name: "Lamalo Training Tank", description: "Open-back mesh training tank with sweat-wicking fabric and a relaxed athletic fit.", category: "tops", subcategory: "t-shirts", genderFit: "male", colors: ["White","Black","Cobalt Blue"], materials: ["100% Polyester Mesh"], styleTags: ["tank","training","gym"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Men's open-back mesh training tank white", primaryImageUrl: "/lamalo/men-polo-shirt.jpg" },
      { name: "Lamalo Compression Tight", description: "Full-length compression tight with graduated compression and a wide waistband.", category: "bottoms", subcategory: "tights", genderFit: "male", colors: ["Black","Navy"], materials: ["78% Nylon","22% Elastane"], styleTags: ["compression","running","training"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Men's full length compression tights black", primaryImageUrl: "/lamalo/men-jogger-pant.jpg" },
    ],
  };

  // ─── Collection 3: Men's Originals Retro (Adidas DNA) ────────────────────────

  const mensOriginals: SeedCollection = {
    name: "Lamalo Men's Originals",
    description: "Retro athletic heritage reimagined. Clean three-stripe aesthetics, tricot tracksuits and classic court footwear — sport culture dressed for the street.",
    collectionType: "lifestyle",
    season: "All-Season",
    year: 2026,
    styleTags: ["retro","originals","streetwear","heritage","sport-casual"],
    collectionPriceAud: 7000,
    items: [
      { name: "Lamalo Retro Track Jacket", description: "Heritage-inspired track jacket in smooth polyester tricot with contrast side stripe and full zip.", category: "outerwear", subcategory: "track-jackets", genderFit: "male", colors: ["Burnt Orange/White","Navy/White","Black"], materials: ["100% Polyester Tricot"], styleTags: ["retro","track","originals"], leasePriceAud: 1200, retailPriceAud: 7000, referencePrompt: "Men's retro heritage track jacket burnt orange stripe", primaryImageUrl: "/lamalo/men-track-jacket.jpg" },
      { name: "Lamalo Retro Track Pant", description: "Matching tricot track pant with side stripe and ankle zip. Pairs with the Track Jacket.", category: "bottoms", subcategory: "track-pants", genderFit: "male", colors: ["Burnt Orange/White","Navy/White","Black"], materials: ["100% Polyester Tricot"], styleTags: ["retro","track","originals"], leasePriceAud: 900, retailPriceAud: 5500, referencePrompt: "Men's retro track pants matching stripe detail", primaryImageUrl: "/lamalo/men-jogger-pant.jpg" },
      { name: "Lamalo Heritage Tee", description: "Essential cotton tee with a minimal Lamalo Originals graphic at the chest. Clean and wearable.", category: "tops", subcategory: "t-shirts", genderFit: "male", colors: ["White","Black","Grey"], materials: ["100% Cotton"], styleTags: ["graphic-tee","originals","heritage"], leasePriceAud: 500, retailPriceAud: 3000, referencePrompt: "Men's heritage graphic tee minimal logo white cotton", primaryImageUrl: "/lamalo/men-polo-shirt.jpg" },
      { name: "Lamalo Originals Hoodie", description: "Relaxed-fit cotton-fleece hoodie with a large kangaroo pocket and Originals embroidery on the chest.", category: "tops", subcategory: "hoodies", genderFit: "male", colors: ["Grey Marle","White","Black"], materials: ["80% Cotton","20% Polyester"], styleTags: ["hoodie","originals","relaxed"], leasePriceAud: 900, retailPriceAud: 5500, referencePrompt: "Men's originals relaxed hoodie grey marle", primaryImageUrl: "/lamalo/men-zip-hoodie.jpg" },
      { name: "Lamalo Classic Court Sneaker", description: "Low-top court sneaker in premium canvas with clean toe box and vulcanised rubber sole. Stan Smith heritage.", category: "footwear", subcategory: "sneakers", genderFit: "male", colors: ["White/White","White/Green","Black/White"], materials: ["Canvas Upper","Rubber Sole"], styleTags: ["sneaker","court","classic"], leasePriceAud: 1000, retailPriceAud: 6000, referencePrompt: "Men's classic canvas court sneaker white minimal", primaryImageUrl: "/lamalo/shoe-canvas-sneaker.jpg" },
      { name: "Lamalo Athletic Short", description: "Nylon training short with white side stripe trim and elastic waist with internal drawcord.", category: "bottoms", subcategory: "shorts", genderFit: "male", colors: ["Black/White","Navy","Grey"], materials: ["Nylon"], styleTags: ["shorts","athletic","originals"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Men's athletic shorts black white stripe trim", primaryImageUrl: "/lamalo/men-jogger-pant.jpg" },
      { name: "Lamalo Originals Polo", description: "Classic pique polo with a tonal Lamalo stripe at the collar and cuffs.", category: "tops", subcategory: "polos", genderFit: "male", colors: ["White","Black","Navy"], materials: ["100% Cotton Pique"], styleTags: ["polo","originals","classic"], leasePriceAud: 700, retailPriceAud: 4000, referencePrompt: "Men's originals polo shirt white stripe collar", primaryImageUrl: "/lamalo/men-polo-shirt.jpg" },
    ],
  };

  // ─── Collection 4: Men's Luxury Formal (Armani DNA) ──────────────────────────

  const mensFormal: SeedCollection = {
    name: "Lamalo Men's Luxury",
    description: "Understated tailored luxury. Italian-inspired construction, premium materials and minimal aesthetics. Armani elegance at Lamalo pricing.",
    collectionType: "formal",
    season: "All-Season",
    year: 2026,
    styleTags: ["formal","luxury","tailored","minimal","elegant"],
    collectionPriceAud: 18000,
    items: [
      { name: "Lamalo Single-Breasted Suit Jacket", description: "Single-breasted suit jacket in Italian wool-blend with a sharp notch lapel and padded shoulders. Available as a suit with matching trouser.", category: "formalwear", subcategory: "suit-jackets", genderFit: "male", colors: ["Charcoal","Navy","Midnight Black"], materials: ["70% Wool","30% Polyester"], styleTags: ["suit","formal","tailored"], leasePriceAud: 2200, retailPriceAud: 13000, referencePrompt: "Men's single breasted suit jacket charcoal sharp lapel", primaryImageUrl: "/lamalo/men-suit-jacket.jpg" },
      { name: "Lamalo Dress Trouser", description: "Tailored dress trouser in wool-blend with a flat front and clean finish. Pairs with the Suit Jacket.", category: "bottoms", subcategory: "dress-trousers", genderFit: "male", colors: ["Charcoal","Black","Navy"], materials: ["70% Wool","30% Polyester"], styleTags: ["formal","tailored","dress-trouser"], leasePriceAud: 1500, retailPriceAud: 9000, referencePrompt: "Men's tailored dress trousers charcoal wool blend", primaryImageUrl: "/lamalo/men-chino-trouser.jpg" },
      { name: "Lamalo Egyptian Cotton Dress Shirt", description: "Two-ply Egyptian cotton dress shirt with a semi-spread collar and single cuffs. Wrinkle-resistant finish.", category: "tops", subcategory: "dress-shirts", genderFit: "male", colors: ["White","Light Blue","Pale Pink"], materials: ["100% Egyptian Cotton"], styleTags: ["dress-shirt","formal","premium"], leasePriceAud: 1000, retailPriceAud: 6000, referencePrompt: "Men's Egyptian cotton dress shirt white formal", primaryImageUrl: "/lamalo/men-linen-shirt.jpg" },
      { name: "Lamalo Merino V-Neck", description: "Fine-gauge 100% merino V-neck knit. Wears under a blazer or alone with trousers.", category: "tops", subcategory: "knitwear", genderFit: "male", colors: ["Navy","Charcoal","Black"], materials: ["100% Merino Wool"], styleTags: ["merino","knitwear","smart"], leasePriceAud: 1400, retailPriceAud: 8500, referencePrompt: "Men's fine merino V-neck knit navy", primaryImageUrl: "/lamalo/men-zip-hoodie.jpg" },
      { name: "Lamalo Tailored Blazer", description: "Two-button tailored blazer in premium Italian wool-blend with a clean chest pocket and single-vent back.", category: "formalwear", subcategory: "blazers", genderFit: "male", colors: ["Navy","Stone","White"], materials: ["72% Wool","28% Polyester"], styleTags: ["blazer","smart","tailored"], leasePriceAud: 1800, retailPriceAud: 11000, referencePrompt: "Men's tailored blazer navy Italian wool", primaryImageUrl: "/lamalo/men-suit-jacket.jpg" },
      { name: "Lamalo Cashmere Overcoat", description: "Long single-breasted overcoat in luxurious wool-cashmere blend. Peak lapel, button-front with a clean back vent.", category: "outerwear", subcategory: "overcoats", genderFit: "male", colors: ["Camel","Charcoal","Navy"], materials: ["70% Wool","30% Cashmere"], styleTags: ["overcoat","luxury","tailored"], leasePriceAud: 2500, retailPriceAud: 15000, referencePrompt: "Men's cashmere overcoat camel peak lapel long", primaryImageUrl: "/lamalo/men-bomber-jacket.jpg" },
    ],
  };

  // ─── Collection 5: Men's Swimwear ────────────────────────────────────────────

  const mensSwimwear: SeedCollection = {
    name: "Lamalo Men's Swimwear",
    description: "Lightweight, quick-dry swim shorts and trunks for the beach, pool and everything between.",
    collectionType: "swimwear",
    season: "Summer",
    year: 2026,
    styleTags: ["swimwear","beach","summer","quick-dry"],
    collectionPriceAud: 3500,
    items: [
      { name: "Lamalo Classic Board Short", description: "Mid-thigh board short with elastic waist, side pockets and a Velcro fly. Fast-dry nylon.", category: "swimwear", subcategory: "board-shorts", genderFit: "male", colors: ["Navy/White","Cobalt Blue","Black"], materials: ["100% Nylon Quick-Dry"], styleTags: ["board-short","beach","classic"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Men's classic board short navy white waistband", primaryImageUrl: "/lamalo/swimwear-men-shorts.jpg" },
      { name: "Lamalo Floral Swim Trunk", description: "Slim-cut swim trunk with bold tropical floral print, elasticated waist and a mesh liner.", category: "swimwear", subcategory: "swim-trunks", genderFit: "male", colors: ["Tropical Blue/Green","Navy","White"], materials: ["Recycled Nylon"], styleTags: ["swim-trunk","floral","tropical"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Men's slim swim trunk tropical floral print blue", primaryImageUrl: "/lamalo/swimwear-men-trunk.jpg" },
      { name: "Lamalo Essential Swim Short", description: "Simple elastic-waist swim short with inner mesh brief and side pockets. Versatile and lightweight.", category: "swimwear", subcategory: "swim-shorts", genderFit: "male", colors: ["Black","Khaki","Navy"], materials: ["Polyester Quick-Dry"], styleTags: ["swim","essential","versatile"], leasePriceAud: 550, retailPriceAud: 3500, referencePrompt: "Men's essential swim short black quick dry", primaryImageUrl: "/lamalo/swimwear-men-shorts.jpg" },
      { name: "Lamalo Retro Swim Brief", description: "Low-rise retro-style swim brief in chlorine-resistant nylon/elastane blend.", category: "swimwear", subcategory: "swim-briefs", genderFit: "male", colors: ["Cobalt Blue","Black","White"], materials: ["80% Nylon","20% Elastane"], styleTags: ["swim-brief","retro","athletic"], leasePriceAud: 500, retailPriceAud: 3000, referencePrompt: "Men's retro swim brief cobalt blue nylon", primaryImageUrl: "/lamalo/swimwear-men-trunk.jpg" },
      { name: "Lamalo UPF50+ Rash Guard", description: "Long-sleeve rashguard with UPF50+ sun protection and a slim athletic fit.", category: "swimwear", subcategory: "rashguards", genderFit: "male", colors: ["White","Cobalt Blue","Black"], materials: ["82% Polyester","18% Elastane UPF50+"], styleTags: ["rashguard","UPF","surf"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Men's long sleeve rashguard white UPF50 sun protection", primaryImageUrl: "/lamalo/swimwear-men-shorts.jpg" },
    ],
  };

  // ─── Collection 6: Men's Comfort Series (Elderly/Senior) ─────────────────────

  const mensComfort: SeedCollection = {
    name: "Lamalo Men's Comfort Series",
    description: "Dignified, easy-wear clothing designed for comfort and confidence. Elastic waistbands, soft natural fabrics and practical details for relaxed daily life.",
    collectionType: "core",
    season: "All-Season",
    year: 2026,
    styleTags: ["comfort","senior","easy-care","relaxed","classic"],
    collectionPriceAud: 6500,
    items: [
      { name: "Lamalo Heritage Flannel Shirt", description: "Long-sleeve brushed cotton flannel shirt with a button front and chest pockets. Warm, easy to wear.", category: "tops", subcategory: "shirts", genderFit: "male", colors: ["Navy Check","Burgundy Check","Grey"], materials: ["100% Brushed Cotton Flannel"], styleTags: ["flannel","comfort","casual"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Men's classic flannel check shirt navy brushed cotton", primaryImageUrl: "/lamalo/elderly-men-flannel-shirt.jpg", sizeRange: "S–3XL" },
      { name: "Lamalo Button Cardigan", description: "Button-front cardigan in lambswool blend with ribbed cuffs and hem and two patch pockets.", category: "tops", subcategory: "knitwear", genderFit: "male", colors: ["Charcoal","Navy","Camel"], materials: ["80% Lambswool","20% Nylon"], styleTags: ["cardigan","knitwear","comfort"], leasePriceAud: 950, retailPriceAud: 5500, referencePrompt: "Men's button front cardigan charcoal lambswool warm", primaryImageUrl: "/lamalo/elderly-men-cardigan.jpg", sizeRange: "S–3XL" },
      { name: "Lamalo Anti-Pill Fleece Jacket", description: "Full-zip fleece jacket in anti-pill fabric with two front zip pockets and a chin guard.", category: "outerwear", subcategory: "fleece", genderFit: "male", colors: ["Navy","Charcoal","Forest Green"], materials: ["100% Anti-Pill Polyester Fleece"], styleTags: ["fleece","warm","practical"], leasePriceAud: 850, retailPriceAud: 5000, referencePrompt: "Men's full zip anti-pill fleece jacket navy warm", primaryImageUrl: "/lamalo/elderly-men-fleece-jacket.jpg", sizeRange: "S–3XL" },
      { name: "Lamalo Elastic-Waist Trouser", description: "Comfortable pull-on trouser with a full elastic waist and straight leg in soft cotton blend.", category: "bottoms", subcategory: "trousers", genderFit: "male", colors: ["Mid-Grey","Navy","Stone"], materials: ["65% Cotton","35% Polyester"], styleTags: ["comfort","elastic-waist","casual"], leasePriceAud: 700, retailPriceAud: 4000, referencePrompt: "Men's elastic waist comfort trousers mid grey cotton blend", primaryImageUrl: "/lamalo/elderly-men-comfort-trouser.jpg", sizeRange: "S–3XL" },
      { name: "Lamalo Puffer Gilet", description: "Lightweight quilted puffer gilet with zip front and two hand pockets. Excellent layering piece.", category: "outerwear", subcategory: "gilets", genderFit: "male", colors: ["Navy","Charcoal","Olive"], materials: ["Shell: Nylon","Fill: Polyester"], styleTags: ["gilet","puffer","layering"], leasePriceAud: 900, retailPriceAud: 5500, referencePrompt: "Men's warm quilted gilet vest navy puffer", primaryImageUrl: "/lamalo/elderly-men-gilet.jpg", sizeRange: "S–3XL" },
      { name: "Lamalo Relaxed Polo", description: "Soft jersey polo with a two-button placket. Easy to put on and comfortable all day.", category: "tops", subcategory: "polos", genderFit: "male", colors: ["Sky Blue","White","Stone"], materials: ["100% Soft Cotton Jersey"], styleTags: ["polo","comfort","classic"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Men's relaxed fit long sleeve polo sky blue comfortable senior", primaryImageUrl: "/lamalo/elderly-men-polo.jpg", sizeRange: "S–3XL" },
      { name: "Lamalo Cotton Pyjama Set", description: "Classic two-piece pyjama set in 100% cotton with a button-front top and elasticated trouser.", category: "nightwear", subcategory: "pyjamas", genderFit: "male", colors: ["Navy/White Stripe","Grey/Blue"], materials: ["100% Cotton"], styleTags: ["pyjamas","nightwear","comfort"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Men's soft cotton pyjama set navy white stripe classic", primaryImageUrl: "/lamalo/elderly-men-pyjama.jpg", sizeRange: "S–3XL" },
      { name: "Lamalo Wool Flat Cap", description: "Classic wool-blend flat cap with a fully lined interior and a snap brim.", category: "accessories", subcategory: "hats", genderFit: "male", colors: ["Beige Herringbone","Charcoal","Navy"], materials: ["80% Wool","20% Polyester"], styleTags: ["flat-cap","classic","heritage"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Men's wool herringbone flat cap beige classic senior", primaryImageUrl: "/lamalo/elderly-men-flat-cap.jpg" },
      { name: "Lamalo Memory Foam Slipper", description: "Sherpa-lined open-back slipper with a memory foam footbed and non-slip rubber sole.", category: "footwear", subcategory: "slippers", genderFit: "male", colors: ["Brown","Navy"], materials: ["Faux Suede","Sherpa Lining","Memory Foam"], styleTags: ["slipper","comfort","home"], leasePriceAud: 400, retailPriceAud: 2500, referencePrompt: "Men's sherpa lined memory foam slipper brown warm", primaryImageUrl: "/lamalo/elderly-men-slipper.jpg", sizeRange: "UK 6–13" },
    ],
  };

  // ─── Collection 7: Women's Everyday Casual (Country Road DNA) ────────────────

  const womensEveryday: SeedCollection = {
    name: "Lamalo Women's Everyday",
    description: "Effortless everyday dressing in natural fabrics and quiet earth tones. Relaxed, refined and seasonlessly wearable — Country Road spirit in a Lamalo edit.",
    collectionType: "core",
    season: "All-Season",
    year: 2026,
    styleTags: ["casual","linen","natural","relaxed","feminine"],
    collectionPriceAud: 9000,
    items: [
      { name: "Lamalo Linen Midi Dress", description: "Relaxed A-line linen-blend midi dress with a V-neckline, side pockets and a tied waist sash.", category: "dresses", subcategory: "midi-dresses", genderFit: "female", colors: ["Sand","Sage Green","White","Dusty Rose"], materials: ["55% Linen","45% Cotton"], styleTags: ["linen","dress","relaxed","feminine"], leasePriceAud: 1100, retailPriceAud: 6500, referencePrompt: "Women's relaxed linen midi dress sand natural colour", primaryImageUrl: "/lamalo/women-linen-dress.jpg" },
      { name: "Lamalo Silk-Touch Blouse", description: "Relaxed-fit blouse in silk-viscose blend with a soft drape and V-neckline. Tucks in or wears out.", category: "tops", subcategory: "blouses", genderFit: "female", colors: ["Ivory","Dusty Pink","White","Sage"], materials: ["70% Viscose","30% Silk"], styleTags: ["blouse","elegant","feminine"], leasePriceAud: 1000, retailPriceAud: 6000, referencePrompt: "Women's elegant silk blouse ivory white soft drape", primaryImageUrl: "/lamalo/women-silk-blouse.jpg" },
      { name: "Lamalo Fitted Blazer", description: "Tailored single-button blazer with a clean lapel, welt pockets and a slightly suppressed waist.", category: "outerwear", subcategory: "blazers", genderFit: "female", colors: ["White","Camel","Black","Cobalt"], materials: ["Cotton Blend"], styleTags: ["blazer","tailored","smart-casual"], leasePriceAud: 1600, retailPriceAud: 9500, referencePrompt: "Women's fitted tailored blazer crisp white clean lapels", primaryImageUrl: "/lamalo/women-blazer.jpg" },
      { name: "Lamalo Wide-Leg Trouser", description: "Relaxed wide-leg trouser in soft crepe with a high waist and clean-pressed front crease.", category: "bottoms", subcategory: "trousers", genderFit: "female", colors: ["Champagne","Black","Sage","Camel"], materials: ["Crepe/Linen Blend"], styleTags: ["wide-leg","tailored","relaxed"], leasePriceAud: 1050, retailPriceAud: 6500, referencePrompt: "Women's wide leg tailored trousers champagne ivory", primaryImageUrl: "/lamalo/women-wide-leg-pants.jpg" },
      { name: "Lamalo Linen Jumpsuit", description: "Long-sleeve V-neck linen jumpsuit with a belted waist and relaxed wide-leg. Effortless one-piece dressing.", category: "dresses", subcategory: "jumpsuits", genderFit: "female", colors: ["Terracotta","Sand","White"], materials: ["55% Linen","45% Cotton"], styleTags: ["jumpsuit","linen","one-piece"], leasePriceAud: 1200, retailPriceAud: 7000, referencePrompt: "Women's casual linen wide leg jumpsuit terracotta", primaryImageUrl: "/lamalo/women-jumpsuit.jpg" },
      { name: "Lamalo Wrap Midi Skirt", description: "Wrap-front midi skirt in cotton-linen blend with a side tie and a softly flared hem.", category: "bottoms", subcategory: "skirts", genderFit: "female", colors: ["Navy","Floral Print","Olive"], materials: ["55% Linen","45% Cotton"], styleTags: ["skirt","midi","relaxed"], leasePriceAud: 850, retailPriceAud: 5000, referencePrompt: "Women's wrap front midi skirt navy cotton linen", primaryImageUrl: "/lamalo/women-wide-leg-pants.jpg" },
      { name: "Lamalo Ribbed Tee", description: "Fitted ribbed cotton crew-neck tee. A seasonless wardrobe staple in versatile colours.", category: "tops", subcategory: "t-shirts", genderFit: "female", colors: ["White","Black","Sage","Terracotta"], materials: ["100% Cotton Rib"], styleTags: ["tee","essential","fitted"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Women's fitted ribbed cotton tee white minimal", primaryImageUrl: "/lamalo/women-silk-blouse.jpg" },
      { name: "Lamalo Classic Denim", description: "High-rise straight-leg denim in stretch cotton. Versatile five-pocket construction.", category: "bottoms", subcategory: "jeans", genderFit: "female", colors: ["Indigo","Mid-Wash","Black"], materials: ["98% Cotton","2% Elastane"], styleTags: ["denim","classic","everyday"], leasePriceAud: 1100, retailPriceAud: 6500, referencePrompt: "Women's high rise straight leg denim jeans indigo", primaryImageUrl: "/lamalo/men-denim-jean.jpg" },
    ],
  };

  // ─── Collection 8: Women's Active (Nike DNA) ─────────────────────────────────

  const womensActive: SeedCollection = {
    name: "Lamalo Women's Active",
    description: "Performance activewear built for women. Moisture-wicking fabrics, supportive construction and clean sport aesthetics that go from studio to street.",
    collectionType: "sport",
    season: "All-Season",
    year: 2026,
    styleTags: ["activewear","performance","sport","athletic","fitness"],
    collectionPriceAud: 7500,
    items: [
      { name: "Lamalo High-Waist Legging", description: "Full-length high-waist legging in 4-way stretch nylon-elastane. Squat-proof, moisture-wicking and flattering on all bodies.", category: "activewear", subcategory: "leggings", genderFit: "female", colors: ["Slate Grey","Black","Cobalt Blue","Dusty Rose"], materials: ["78% Nylon","22% Elastane"], styleTags: ["leggings","high-waist","performance"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Women's high waist performance leggings slate grey", primaryImageUrl: "/lamalo/women-leggings.jpg" },
      { name: "Lamalo Sport Bra", description: "Medium-support sport bra with a wide underband and removable pads. Smooth and minimal.", category: "activewear", subcategory: "sport-bras", genderFit: "female", colors: ["Black","White","Cobalt Blue"], materials: ["78% Nylon","22% Elastane"], styleTags: ["sport-bra","support","minimal"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Women's medium support sport bra midnight black minimal", primaryImageUrl: "/lamalo/women-sport-bra.jpg" },
      { name: "Lamalo Windbreaker", description: "Lightweight ripstop windbreaker with a packable hood, thumbhole cuffs and a drop-back hem.", category: "outerwear", subcategory: "jackets", genderFit: "female", colors: ["Cobalt Blue","Black","Sage"], materials: ["Ripstop Nylon"], styleTags: ["windbreaker","running","packable"], leasePriceAud: 1250, retailPriceAud: 7500, referencePrompt: "Women's lightweight running windbreaker cobalt blue", primaryImageUrl: "/lamalo/women-windbreaker.jpg" },
      { name: "Lamalo Performance Tracksuit", description: "Matching two-piece tracksuit in moisture-wicking performance jersey. Zip jacket and matching track pant.", category: "activewear", subcategory: "tracksuits", genderFit: "female", colors: ["Lavender","Black","Cobalt Blue"], materials: ["Polyester Jersey"], styleTags: ["tracksuit","sport","matching-set"], leasePriceAud: 1400, retailPriceAud: 8500, referencePrompt: "Women's retro athletic tracksuit lavender with white stripe", primaryImageUrl: "/lamalo/women-tracksuit.jpg" },
      { name: "Lamalo Active Running Tank", description: "Dri-Lite running tank with a racerback cut and flatlock seams. Lightweight and breezy.", category: "activewear", subcategory: "tanks", genderFit: "female", colors: ["White","Black","Pink"], materials: ["Recycled Polyester"], styleTags: ["tank","running","athletic"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Women's lightweight running tank white racerback athletic", primaryImageUrl: "/lamalo/women-sport-bra.jpg" },
      { name: "Lamalo Active Short", description: "High-waist active short with a 3" inseam and built-in liner. Great for training and HIIT.", category: "activewear", subcategory: "shorts", genderFit: "female", colors: ["Black","Navy","Cobalt"], materials: ["Nylon/Spandex"], styleTags: ["shorts","training","active"], leasePriceAud: 550, retailPriceAud: 3500, referencePrompt: "Women's high waist active short black training", primaryImageUrl: "/lamalo/women-leggings.jpg" },
      { name: "Lamalo Seamless Crop Top", description: "Seamless-knit long-sleeve crop top with a fitted silhouette. Studio-ready and street-ready.", category: "activewear", subcategory: "tops", genderFit: "female", colors: ["Grey","Black","White"], materials: ["Seamless Nylon-Elastane"], styleTags: ["seamless","crop","studio"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Women's seamless crop top grey fitted athletic", primaryImageUrl: "/lamalo/women-sport-bra.jpg" },
    ],
  };

  // ─── Collection 9: Women's Originals (Adidas DNA) ────────────────────────────

  const womensOriginals: SeedCollection = {
    name: "Lamalo Women's Originals",
    description: "Retro athletic heritage for women. Tricot tracksuits, heritage hoodies and classic sport aesthetics with a modern feminine cut.",
    collectionType: "lifestyle",
    season: "All-Season",
    year: 2026,
    styleTags: ["retro","originals","streetwear","sport-casual","heritage"],
    collectionPriceAud: 5500,
    items: [
      { name: "Lamalo Women's Retro Tracksuit", description: "Matching tricot tracksuit with contrast side stripe. Zip jacket and slim track pant.", category: "activewear", subcategory: "tracksuits", genderFit: "female", colors: ["Lavender/White","Black","Cobalt Blue"], materials: ["100% Polyester Tricot"], styleTags: ["retro","tracksuit","originals"], leasePriceAud: 1400, retailPriceAud: 8500, referencePrompt: "Women's retro tracksuit set lavender white stripe side detail", primaryImageUrl: "/lamalo/women-tracksuit.jpg" },
      { name: "Lamalo Women's Heritage Hoodie", description: "Oversized cotton-fleece hoodie with a front pouch pocket and subtle Originals branding.", category: "tops", subcategory: "hoodies", genderFit: "female", colors: ["Grey Marle","White","Black"], materials: ["80% Cotton","20% Polyester"], styleTags: ["hoodie","oversized","heritage"], leasePriceAud: 900, retailPriceAud: 5500, referencePrompt: "Women's oversized heritage hoodie grey marle cotton", primaryImageUrl: "/lamalo/men-zip-hoodie.jpg" },
      { name: "Lamalo Women's Classic Tee", description: "Relaxed-fit cotton tee with minimal Originals graphic at the chest.", category: "tops", subcategory: "t-shirts", genderFit: "female", colors: ["White","Pink","Black","Grey"], materials: ["100% Cotton"], styleTags: ["tee","relaxed","originals"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Women's classic originals cotton tee white minimal graphic", primaryImageUrl: "/lamalo/women-silk-blouse.jpg" },
      { name: "Lamalo Women's Retro Zip Jacket", description: "Quarter-zip sport jacket with retro stripe detailing on the sleeves. Sporty and versatile.", category: "outerwear", subcategory: "jackets", genderFit: "female", colors: ["Cobalt Blue","White","Pink"], materials: ["Polyester Tricot"], styleTags: ["zip-jacket","retro","sport"], leasePriceAud: 1050, retailPriceAud: 6500, referencePrompt: "Women's retro zip jacket cobalt blue stripe sleeves", primaryImageUrl: "/lamalo/women-windbreaker.jpg" },
      { name: "Lamalo Women's Athletic Skort", description: "Pleated skort over built-in shorts. High waist, sporty cut and a clean white aesthetic.", category: "activewear", subcategory: "skirts", genderFit: "female", colors: ["White","Black","Navy"], materials: ["Nylon/Spandex"], styleTags: ["skort","tennis","athletic"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Women's athletic skort white pleated high waist", primaryImageUrl: "/lamalo/women-leggings.jpg" },
    ],
  };

  // ─── Collection 10: Women's Luxury Formal (Armani DNA) ───────────────────────

  const womensFormal: SeedCollection = {
    name: "Lamalo Women's Luxury",
    description: "Refined tailoring and understated luxury. Italian-inspired minimalism, premium fabrics and a polished aesthetic for every formal occasion.",
    collectionType: "formal",
    season: "All-Season",
    year: 2026,
    styleTags: ["luxury","formal","tailored","elegant","minimal"],
    collectionPriceAud: 16000,
    items: [
      { name: "Lamalo Structured Blazer", description: "Sharp single-button blazer in Italian crepe with structured shoulders and a fitted waist.", category: "formalwear", subcategory: "blazers", genderFit: "female", colors: ["White","Camel","Black"], materials: ["Italian Crepe"], styleTags: ["blazer","structured","luxury"], leasePriceAud: 1800, retailPriceAud: 11000, referencePrompt: "Women's structured blazer white Italian crepe sharp", primaryImageUrl: "/lamalo/women-blazer.jpg" },
      { name: "Lamalo Wide-Leg Formal Trouser", description: "Wide-leg formal trouser in premium crepe with a high waist and clean-pressed front crease.", category: "bottoms", subcategory: "dress-trousers", genderFit: "female", colors: ["White","Black","Champagne"], materials: ["Premium Crepe"], styleTags: ["formal","wide-leg","luxury"], leasePriceAud: 1500, retailPriceAud: 9000, referencePrompt: "Women's wide leg formal trouser white premium crepe", primaryImageUrl: "/lamalo/women-wide-leg-pants.jpg" },
      { name: "Lamalo Pure Silk Blouse", description: "Pure silk blouse with mother-of-pearl buttons, a soft drape and a relaxed tuck-in silhouette.", category: "tops", subcategory: "blouses", genderFit: "female", colors: ["Ivory","Blush","White"], materials: ["100% Pure Silk"], styleTags: ["silk","blouse","luxury"], leasePriceAud: 1600, retailPriceAud: 9500, referencePrompt: "Women's pure silk blouse ivory elegant formal", primaryImageUrl: "/lamalo/women-silk-blouse.jpg" },
      { name: "Lamalo Cashmere Sweater", description: "Fine-gauge cashmere crew-neck sweater with a relaxed drape and minimal detailing.", category: "tops", subcategory: "knitwear", genderFit: "female", colors: ["Cream","Black","Navy"], materials: ["100% Cashmere"], styleTags: ["cashmere","luxury","knitwear"], leasePriceAud: 1800, retailPriceAud: 11000, referencePrompt: "Women's fine cashmere crew neck sweater cream", primaryImageUrl: "/lamalo/women-silk-blouse.jpg" },
      { name: "Lamalo Tailored Coat", description: "Long single-breasted coat in premium wool blend with a clean lapel and back vent.", category: "outerwear", subcategory: "coats", genderFit: "female", colors: ["Camel","Black","Navy"], materials: ["70% Wool","30% Polyester"], styleTags: ["coat","luxury","tailored"], leasePriceAud: 2500, retailPriceAud: 15000, referencePrompt: "Women's long tailored coat camel wool blend premium", primaryImageUrl: "/lamalo/women-blazer.jpg" },
      { name: "Lamalo Satin Slip Dress", description: "Bias-cut satin slip dress with thin adjustable straps and a subtle back split. Timeless elegance.", category: "dresses", subcategory: "evening-dresses", genderFit: "female", colors: ["Black","Ivory","Champagne"], materials: ["Polyester Satin"], styleTags: ["slip-dress","satin","evening"], leasePriceAud: 1500, retailPriceAud: 9000, referencePrompt: "Women's satin slip dress black bias cut elegant formal", primaryImageUrl: "/lamalo/women-linen-dress.jpg" },
      { name: "Lamalo Pleated Midi Skirt", description: "Pleated crepe midi skirt with an elasticated waist and a graceful swirl silhouette.", category: "bottoms", subcategory: "skirts", genderFit: "female", colors: ["Black","Ivory","Blush"], materials: ["Premium Crepe"], styleTags: ["pleated","midi","elegant"], leasePriceAud: 1400, retailPriceAud: 8500, referencePrompt: "Women's pleated midi skirt black crepe elegant", primaryImageUrl: "/lamalo/women-wide-leg-pants.jpg" },
    ],
  };

  // ─── Collection 11: Women's Swimwear ─────────────────────────────────────────

  const womensSwimwear: SeedCollection = {
    name: "Lamalo Women's Swimwear",
    description: "From laps to the beach — thoughtfully designed swimwear for women in every body-confident cut.",
    collectionType: "swimwear",
    season: "Summer",
    year: 2026,
    styleTags: ["swimwear","beach","summer","poolside","confidence"],
    collectionPriceAud: 5500,
    items: [
      { name: "Lamalo Classic One-Piece", description: "Scoop-neck one-piece swimsuit with a low back and clean lines. Chlorine-resistant fabric.", category: "swimwear", subcategory: "one-piece", genderFit: "female", colors: ["Black","Cobalt Blue","Sage"], materials: ["80% Nylon","20% Elastane Chlorine-Resistant"], styleTags: ["one-piece","classic","elegant"], leasePriceAud: 800, retailPriceAud: 5000, referencePrompt: "Women's classic one piece swimsuit black low back elegant", primaryImageUrl: "/lamalo/swimwear-women-onepiece.jpg" },
      { name: "Lamalo Triangle Bikini", description: "Adjustable triangle top and low-rise brief bottom in recycled nylon. Minimal and versatile.", category: "swimwear", subcategory: "bikinis", genderFit: "female", colors: ["Cobalt Blue","Terracotta","Sage","Black"], materials: ["Recycled Nylon/Elastane"], styleTags: ["bikini","triangle","minimal"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Women's triangle bikini set cobalt blue top and brief", primaryImageUrl: "/lamalo/swimwear-women-bikini.jpg" },
      { name: "Lamalo Modest Long-Sleeve Swimsuit", description: "Long-sleeve modest one-piece with UPF50+ protection. Full coverage, modern style.", category: "swimwear", subcategory: "one-piece", genderFit: "female", colors: ["Navy/White","Sage","Black"], materials: ["UPF50+ Nylon/Elastane"], styleTags: ["modest","UPF","coverage"], leasePriceAud: 900, retailPriceAud: 5500, referencePrompt: "Women's modest long sleeve swimsuit navy white UPF50", primaryImageUrl: "/lamalo/swimwear-women-modest.jpg" },
      { name: "Lamalo Ruched One-Piece", description: "Ruched one-piece with a flattering gathered front panel and adjustable straps.", category: "swimwear", subcategory: "one-piece", genderFit: "female", colors: ["Blush","Black","White"], materials: ["Nylon/Spandex"], styleTags: ["ruched","one-piece","flattering"], leasePriceAud: 850, retailPriceAud: 5000, referencePrompt: "Women's ruched one piece swimsuit blush gathered front", primaryImageUrl: "/lamalo/swimwear-women-onepiece.jpg" },
      { name: "Lamalo Sporty Bikini Set", description: "Sporty crop-top bikini with a supportive wired cup and matching high-waist brief.", category: "swimwear", subcategory: "bikinis", genderFit: "female", colors: ["Black","Cobalt Blue","White"], materials: ["Recycled Nylon/Elastane"], styleTags: ["bikini","sporty","high-waist"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Women's sporty crop bikini set black high waist", primaryImageUrl: "/lamalo/swimwear-women-bikini.jpg" },
      { name: "Lamalo Floral Bikini", description: "Tropical floral-print bikini with an underwire push-up top and tie-side bottoms.", category: "swimwear", subcategory: "bikinis", genderFit: "female", colors: ["Tropical Print","Cobalt","Sage"], materials: ["Recycled Nylon/Elastane"], styleTags: ["bikini","floral","tropical"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Women's tropical floral bikini cobalt blue tie side", primaryImageUrl: "/lamalo/swimwear-women-bikini.jpg" },
      { name: "Lamalo Swimwear Cover-Up", description: "Sheer cotton gauze cover-up dress with a V-neckline and side slits. Beach essential.", category: "swimwear", subcategory: "cover-ups", genderFit: "female", colors: ["White","Sand","Navy Stripe"], materials: ["Cotton Gauze"], styleTags: ["cover-up","beach","sheer"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Women's cotton gauze beach cover up dress white sheer", primaryImageUrl: "/lamalo/women-linen-dress.jpg" },
    ],
  };

  // ─── Collection 12: Women's Comfort Series (Elderly/Senior) ──────────────────

  const womensComfort: SeedCollection = {
    name: "Lamalo Women's Comfort Series",
    description: "Elegant, practical and easy-wear clothing for women who value comfort without compromising on style. Soft fabrics, easy fastenings and a dignified aesthetic.",
    collectionType: "core",
    season: "All-Season",
    year: 2026,
    styleTags: ["comfort","senior","easy-care","classic","dignified"],
    collectionPriceAud: 7500,
    items: [
      { name: "Lamalo Wrap Midi Dress", description: "Soft viscose wrap dress with a V-neckline and gentle floral print. Easy to put on, flattering on all shapes.", category: "dresses", subcategory: "midi-dresses", genderFit: "female", colors: ["Dusty Rose/Floral","Lavender","Navy"], materials: ["100% Viscose"], styleTags: ["wrap-dress","comfort","feminine"], leasePriceAud: 900, retailPriceAud: 5500, referencePrompt: "Women's elegant wrap midi dress dusty rose floral print modest", primaryImageUrl: "/lamalo/elderly-women-wrap-dress.jpg", sizeRange: "XS–3XL" },
      { name: "Lamalo Elastic-Waist Trouser", description: "Pull-on trouser with a full elastic waist in soft cotton. Comfortable and dignified all day.", category: "bottoms", subcategory: "trousers", genderFit: "female", colors: ["Pale Blue","Navy","Blush"], materials: ["65% Cotton","35% Polyester"], styleTags: ["comfort","elastic-waist","classic"], leasePriceAud: 700, retailPriceAud: 4000, referencePrompt: "Women's relaxed pull-on trouser elastic waist pale blue comfortable", primaryImageUrl: "/lamalo/elderly-women-elastic-trouser.jpg", sizeRange: "XS–3XL" },
      { name: "Lamalo Long Wrap Cardigan", description: "Flowing open-front cardigan in merino blend that wraps and ties. Exceptionally comfortable.", category: "tops", subcategory: "knitwear", genderFit: "female", colors: ["Blush","Grey","Sage"], materials: ["70% Merino Wool","30% Polyester"], styleTags: ["cardigan","wrap","cosy"], leasePriceAud: 1000, retailPriceAud: 6000, referencePrompt: "Women's warm open front long cardigan soft blush pink knit", primaryImageUrl: "/lamalo/elderly-women-long-cardigan.jpg", sizeRange: "XS–3XL" },
      { name: "Lamalo Button Blouse", description: "Button-front blouse in easy-care cotton with a soft drape and gentle collar. Timeless.", category: "tops", subcategory: "blouses", genderFit: "female", colors: ["Sky Blue","White","Blush"], materials: ["100% Easy-Care Cotton"], styleTags: ["blouse","button-front","classic"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Women's classic button front blouse sky blue easy care", primaryImageUrl: "/lamalo/elderly-women-blouse.jpg", sizeRange: "XS–3XL" },
      { name: "Lamalo Quilted Zip Jacket", description: "Lightweight zip-front quilted jacket with easy-access pockets. Warm, neat and packable.", category: "outerwear", subcategory: "jackets", genderFit: "female", colors: ["Teal","Navy","Blush"], materials: ["Shell: Polyester","Fill: Polyester"], styleTags: ["quilted","jacket","practical"], leasePriceAud: 900, retailPriceAud: 5500, referencePrompt: "Women's lightweight quilted jacket teal zip up warm", primaryImageUrl: "/lamalo/elderly-women-quilted-jacket.jpg", sizeRange: "XS–3XL" },
      { name: "Lamalo Floral Cotton Nightgown", description: "Long cotton nightgown with a button-front neckline and soft floral print. Cosy and modest.", category: "nightwear", subcategory: "nightgowns", genderFit: "female", colors: ["White/Pink Floral","Blue/White"], materials: ["100% Cotton"], styleTags: ["nightgown","nightwear","comfort"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Women's soft cotton floral nightgown white pink long modest", primaryImageUrl: "/lamalo/elderly-women-nightgown.jpg", sizeRange: "XS–3XL" },
      { name: "Lamalo A-Line Midi Skirt", description: "Classic A-line midi skirt in soft cotton-blend with a fully elasticated waist.", category: "bottoms", subcategory: "skirts", genderFit: "female", colors: ["Navy","Black","Blush"], materials: ["65% Cotton","35% Polyester"], styleTags: ["skirt","a-line","classic"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Women's classic A-line skirt midi length navy blue", primaryImageUrl: "/lamalo/elderly-women-midi-skirt.jpg", sizeRange: "XS–3XL" },
      { name: "Lamalo Wool-Mix Coat", description: "Warm wool-mix coat with a classic lapel, button-front and side pockets. Smart and practical.", category: "outerwear", subcategory: "coats", genderFit: "female", colors: ["Camel","Navy","Charcoal"], materials: ["60% Wool","40% Polyester"], styleTags: ["coat","wool","classic"], leasePriceAud: 1500, retailPriceAud: 9000, referencePrompt: "Women's warm wool mix coat camel full length classic senior", primaryImageUrl: "/lamalo/elderly-women-wool-coat.jpg", sizeRange: "XS–3XL" },
      { name: "Lamalo Wide-Fit Walking Shoe", description: "Supportive wide-fit leather walking shoe with a cushioned insole and non-slip sole.", category: "footwear", subcategory: "walking-shoes", genderFit: "female", colors: ["White","Navy","Black"], materials: ["Leather Upper","Cushioned Insole"], styleTags: ["walking-shoe","comfortable","supportive"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Women's comfortable wide fit walking shoe white leather supportive", primaryImageUrl: "/lamalo/elderly-women-walking-shoe.jpg", sizeRange: "UK 3–9 (Wide)" },
    ],
  };

  // ─── Collection 13: Kids' Everyday ───────────────────────────────────────────

  const kidsEveryday: SeedCollection = {
    name: "Lamalo Kids' Everyday",
    description: "Durable, comfortable and fun everyday clothing for kids. Designed to handle playground adventures and look great doing it.",
    collectionType: "core",
    season: "All-Season",
    year: 2026,
    styleTags: ["kids","everyday","colourful","durable","comfortable"],
    collectionPriceAud: 4500,
    items: [
      { name: "Lamalo Kids' Graphic Tee", description: "Soft organic cotton tee with a bold Lamalo graphic on the front. Machine washable and super soft.", category: "tops", subcategory: "t-shirts", genderFit: "kids", colors: ["Yellow","Red","Cobalt Blue","White"], materials: ["100% Organic Cotton"], styleTags: ["graphic-tee","kids","colourful"], leasePriceAud: 350, retailPriceAud: 2000, referencePrompt: "Children's colourful graphic tee yellow organic cotton", primaryImageUrl: "/lamalo/kids-graphic-tee.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Kids' School Polo", description: "Hardwearing pique cotton polo perfect for school or everyday wear. Easy-care fabric.", category: "tops", subcategory: "polos", genderFit: "kids", colors: ["White","Navy","Red","Cobalt"], materials: ["100% Cotton Pique"], styleTags: ["polo","school","smart"], leasePriceAud: 380, retailPriceAud: 2500, referencePrompt: "Children's classic school polo shirt white navy easy care", primaryImageUrl: "/lamalo/kids-polo-shirt.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Kids' Slim Denim", description: "Slim-fit stretch denim jeans for kids with an adjustable inner waist and reinforced knees.", category: "bottoms", subcategory: "jeans", genderFit: "kids", colors: ["Indigo","Mid-Wash","Black"], materials: ["Cotton/Elastane Denim"], styleTags: ["denim","kids","durable"], leasePriceAud: 550, retailPriceAud: 3500, referencePrompt: "Children's slim fit stretch denim jeans indigo adjustable waist", primaryImageUrl: "/lamalo/kids-denim-jeans.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Kids' Fleece Hoodie", description: "Cosy cotton-fleece hoodie with a kangaroo pouch pocket and flat-lock seams.", category: "tops", subcategory: "hoodies", genderFit: "kids", colors: ["Coral","Cobalt Blue","Black"], materials: ["80% Cotton","20% Polyester Fleece"], styleTags: ["hoodie","cosy","kids"], leasePriceAud: 550, retailPriceAud: 3500, referencePrompt: "Children's cosy fleece hoodie coral pink soft cotton", primaryImageUrl: "/lamalo/kids-fleece-hoodie.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Girls' Linen Dress", description: "Relaxed linen-cotton dress with flutter sleeves and a smocked waist. Perfect for warm days.", category: "dresses", subcategory: "casual-dresses", genderFit: "kids", colors: ["Pink","White","Sage"], materials: ["55% Linen","45% Cotton"], styleTags: ["dress","girls","linen"], leasePriceAud: 500, retailPriceAud: 3000, referencePrompt: "Children's linen summer dress pink light flutter sleeves", primaryImageUrl: "/lamalo/kids-linen-dress.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Kids' Canvas Sneaker", description: "Classic low-top canvas sneaker with a cushioned insole and flexible rubber sole.", category: "footwear", subcategory: "sneakers", genderFit: "kids", colors: ["White/Rainbow","White/Blue"], materials: ["Canvas Upper","Rubber Sole"], styleTags: ["sneaker","kids","casual"], leasePriceAud: 500, retailPriceAud: 3000, referencePrompt: "Children's canvas low-top sneaker white rainbow sole", primaryImageUrl: "/lamalo/kids-sneaker.jpg", sizeRange: "UK 6–2 (Kids)" },
      { name: "Lamalo Kids' Velcro Sandal", description: "Adjustable velcro sport sandal with cushioned footbed and a flexible EVA sole.", category: "footwear", subcategory: "sandals", genderFit: "kids", colors: ["Teal","White","Black"], materials: ["Synthetic Upper","EVA Sole"], styleTags: ["sandal","velcro","summer"], leasePriceAud: 420, retailPriceAud: 2500, referencePrompt: "Children's velcro sport sandal teal blue EVA sole", primaryImageUrl: "/lamalo/kids-sandal.jpg", sizeRange: "UK 6–2 (Kids)" },
      { name: "Lamalo Kids' Cotton Shorts", description: "Elasticated-waist cotton shorts for comfortable all-day wear. Machine washable.", category: "bottoms", subcategory: "shorts", genderFit: "kids", colors: ["Khaki","Navy","Grey"], materials: ["100% Cotton Twill"], styleTags: ["shorts","casual","comfortable"], leasePriceAud: 300, retailPriceAud: 2000, referencePrompt: "Children's casual cotton shorts khaki elasticated waist", primaryImageUrl: "/lamalo/kids-shorts.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
    ],
  };

  // ─── Collection 14: Kids' Active & Outerwear ─────────────────────────────────

  const kidsActive: SeedCollection = {
    name: "Lamalo Kids' Active",
    description: "High-energy outerwear and activewear that keeps up with kids from school run to sport. Durable, practical and full of colour.",
    collectionType: "sport",
    season: "All-Season",
    year: 2026,
    styleTags: ["kids","active","sport","outerwear","durable"],
    collectionPriceAud: 4000,
    items: [
      { name: "Lamalo Kids' Retro Tracksuit", description: "Matching zip jacket and jogger in performance jersey with a classic side stripe.", category: "activewear", subcategory: "tracksuits", genderFit: "kids", colors: ["Cobalt/White","Red/White","Black"], materials: ["Polyester Jersey"], styleTags: ["tracksuit","sport","retro"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Children's retro tracksuit cobalt blue white stripe athletic", primaryImageUrl: "/lamalo/kids-tracksuit.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Kids' Puffer Jacket", description: "Lightweight warmth without the bulk. Water-resistant puffer with a hood and two zip pockets.", category: "outerwear", subcategory: "jackets", genderFit: "kids", colors: ["Yellow","Cobalt Blue","Pink"], materials: ["Shell: Nylon","Fill: Polyester"], styleTags: ["puffer","warm","kids"], leasePriceAud: 800, retailPriceAud: 5000, referencePrompt: "Children's bright yellow puffer jacket warm lightweight hood", primaryImageUrl: "/lamalo/kids-puffer-jacket.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Kids' Waterproof Rain Jacket", description: "Fully waterproof rain jacket with a packable hood, reflective trim and taped seams.", category: "outerwear", subcategory: "rain-jackets", genderFit: "kids", colors: ["Orange","Yellow","Cobalt"], materials: ["Waterproof Polyester Shell"], styleTags: ["rain-jacket","waterproof","kids"], leasePriceAud: 700, retailPriceAud: 4000, referencePrompt: "Children's bright waterproof rain jacket orange hood reflective", primaryImageUrl: "/lamalo/kids-rain-jacket.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Kids' Party Dress", description: "Tulle and satin party dress with a bow sash and full skirt. Perfect for celebrations.", category: "dresses", subcategory: "formal-dresses", genderFit: "kids", colors: ["Pink","Cobalt Blue","White"], materials: ["Polyester Satin","Tulle"], styleTags: ["party-dress","formal","princess"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Children's tulle party dress pink bow sash full skirt", primaryImageUrl: "/lamalo/kids-party-dress.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Kids' Sport Shorts", description: "Lightweight nylon shorts with an elasticated waist and a small side pocket.", category: "bottoms", subcategory: "shorts", genderFit: "kids", colors: ["Black","Navy","Cobalt","Red"], materials: ["100% Nylon"], styleTags: ["shorts","sport","active"], leasePriceAud: 260, retailPriceAud: 1500, referencePrompt: "Children's lightweight sport shorts black nylon elastic waist", primaryImageUrl: "/lamalo/kids-shorts.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Kids' School Backpack", description: "Durable nylon backpack with padded back panel, organiser pockets and a water bottle side pocket.", category: "accessories", subcategory: "bags", genderFit: "kids", colors: ["Teal","Cobalt","Pink"], materials: ["Nylon"], styleTags: ["backpack","school","kids"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Children's colourful school backpack teal green multiple pockets", primaryImageUrl: "/lamalo/kids-backpack.jpg" },
    ],
  };

  // ─── Collection 15: Kids' Swimwear ───────────────────────────────────────────

  const kidsSwimwear: SeedCollection = {
    name: "Lamalo Kids' Swimwear",
    description: "Sun-smart and fun swimwear for kids. UPF50+ fabrics, durable construction and bright designs built for the pool and beach.",
    collectionType: "swimwear",
    season: "Summer",
    year: 2026,
    styleTags: ["kids","swimwear","UPF","summer","colourful"],
    collectionPriceAud: 2500,
    items: [
      { name: "Lamalo Kids' UPF50+ One-Piece", description: "Colourful UPF50+ swimsuit with a crossback design and chlorine-resistant fabric.", category: "swimwear", subcategory: "one-piece", genderFit: "kids", colors: ["Rainbow Print","Cobalt Blue","Pink"], materials: ["UPF50+ Nylon/Elastane"], styleTags: ["one-piece","UPF","colourful"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Children's colourful UPF50+ swimsuit rainbow crossback", primaryImageUrl: "/lamalo/swimwear-kids-onepiece.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Kids' Rashguard Set", description: "Long-sleeve rashguard with matching shorts in UPF50+ fabric. Full sun protection for beach days.", category: "swimwear", subcategory: "rashguards", genderFit: "kids", colors: ["Blue Dinosaur","Tropical Print"], materials: ["UPF50+ Polyester"], styleTags: ["rashguard","UPF","kids"], leasePriceAud: 550, retailPriceAud: 3500, referencePrompt: "Children's rashguard set blue dinosaur print long sleeve UPF50", primaryImageUrl: "/lamalo/swimwear-kids-rashguard-set.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Boys' Swim Short", description: "Quick-dry board short with elasticated waist and inner mesh brief.", category: "swimwear", subcategory: "swim-shorts", genderFit: "kids", colors: ["Cobalt/White","Tropical Print"], materials: ["Quick-Dry Nylon"], styleTags: ["swim-short","boys","beach"], leasePriceAud: 380, retailPriceAud: 2500, referencePrompt: "Children's boys swim short cobalt blue quick dry beach", primaryImageUrl: "/lamalo/swimwear-kids-onepiece.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
      { name: "Lamalo Girls' Frill Swimsuit", description: "Frill-trim one-piece with a modest neckline and UPF30+ protection. Adorable and practical.", category: "swimwear", subcategory: "one-piece", genderFit: "kids", colors: ["Pink","Cobalt Blue","Mint"], materials: ["Nylon/Spandex UPF30+"], styleTags: ["swimsuit","girls","frill"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Children's girls frill swimsuit pink adorable UPF protection", primaryImageUrl: "/lamalo/swimwear-kids-onepiece.jpg", sizeRange: "2–3Y,3–4Y,4–5Y,5–6Y,6–7Y,7–8Y,8–9Y,9–10Y,10–11Y,11–12Y" },
    ],
  };

  // ─── Collection 16: Men's Footwear ───────────────────────────────────────────

  const mensFootwear: SeedCollection = {
    name: "Lamalo Men's Footwear",
    description: "From canvas court sneakers to polished leather dress shoes — every style a man needs, built with quality materials at Lamalo's competitive pricing.",
    collectionType: "footwear",
    season: "All-Season",
    year: 2026,
    styleTags: ["footwear","shoes","sneakers","leather","men"],
    collectionPriceAud: 9500,
    items: [
      { name: "Lamalo Canvas Lo Sneaker", description: "Low-profile canvas sneaker with a vulcanised rubber sole and clean minimal upper. A classic icon.", category: "footwear", subcategory: "sneakers", genderFit: "male", colors: ["White","Black/White","Navy"], materials: ["Canvas Upper","Rubber Sole"], styleTags: ["sneaker","canvas","classic"], leasePriceAud: 950, retailPriceAud: 5500, referencePrompt: "Men's clean low top canvas sneaker white rubber sole minimal", primaryImageUrl: "/lamalo/shoe-canvas-sneaker.jpg", sizeRange: "UK 6–14" },
      { name: "Lamalo Performance Runner", description: "Lightweight running trainer with engineered mesh upper, foam midsole and high-traction outsole.", category: "footwear", subcategory: "running-shoes", genderFit: "male", colors: ["White/Cobalt","Black","Grey/White"], materials: ["Mesh Upper","Foam Midsole","Rubber Outsole"], styleTags: ["running","performance","trainer"], leasePriceAud: 1250, retailPriceAud: 7500, referencePrompt: "Men's performance runner white cobalt blue foam midsole mesh", primaryImageUrl: "/lamalo/shoe-running-trainer.jpg", sizeRange: "UK 6–14" },
      { name: "Lamalo Penny Loafer", description: "Classic leather penny loafer with a stacked heel and leather lining. Italian-inspired.", category: "footwear", subcategory: "loafers", genderFit: "male", colors: ["Brown","Black","Tan"], materials: ["Full-Grain Leather"], styleTags: ["loafer","leather","classic"], leasePriceAud: 1500, retailPriceAud: 9000, referencePrompt: "Men's leather penny loafer chocolate brown stacked heel", primaryImageUrl: "/lamalo/shoe-leather-loafer.jpg", sizeRange: "UK 6–13" },
      { name: "Lamalo Chelsea Boot", description: "Sleek pull-on Chelsea boot in smooth leather with an elastic gore and stacked sole.", category: "footwear", subcategory: "boots", genderFit: "male", colors: ["Midnight Black","Tan"], materials: ["Smooth Leather"], styleTags: ["chelsea-boot","leather","formal"], leasePriceAud: 1700, retailPriceAud: 10000, referencePrompt: "Men's chelsea boot midnight black sleek leather pull-on", primaryImageUrl: "/lamalo/shoe-chelsea-boot.jpg", sizeRange: "UK 6–13" },
      { name: "Lamalo Sport Recovery Slide", description: "Cushioned EVA recovery slide with a single adjustable strap. Post-training essential.", category: "footwear", subcategory: "slides", genderFit: "male", colors: ["Black","White","Cobalt"], materials: ["EVA Foam"], styleTags: ["slide","recovery","sport"], leasePriceAud: 500, retailPriceAud: 3000, referencePrompt: "Men's sport recovery slide black EVA cushioned adjustable strap", primaryImageUrl: "/lamalo/shoe-sport-slide.jpg", sizeRange: "UK 6–14" },
      { name: "Lamalo Orthopaedic Slip-On", description: "Wide-fit slip-on shoe with orthopaedic insole, arch support and non-slip sole. Ideal for everyday comfort.", category: "footwear", subcategory: "comfort-shoes", genderFit: "male", colors: ["Tan","Black"], materials: ["Soft Leather Upper","Orthopaedic Insole"], styleTags: ["comfort","orthopaedic","slip-on"], leasePriceAud: 1100, retailPriceAud: 6500, referencePrompt: "Men's orthopaedic slip-on shoe tan leather no laces supportive", primaryImageUrl: "/lamalo/elderly-men-ortho-shoe.jpg", sizeRange: "UK 6–14 (Wide Fit)" },
      { name: "Lamalo Men's Sherpa Slipper", description: "Bootie-style slipper with sherpa lining, memory foam footbed and a non-slip indoor sole.", category: "footwear", subcategory: "slippers", genderFit: "male", colors: ["Brown","Navy"], materials: ["Faux Suede","Sherpa Lining","Memory Foam"], styleTags: ["slipper","comfort","home"], leasePriceAud: 420, retailPriceAud: 2500, referencePrompt: "Men's warm sherpa lined bootie slipper brown indoor", primaryImageUrl: "/lamalo/elderly-men-slipper.jpg", sizeRange: "UK 6–14" },
    ],
  };

  // ─── Collection 17: Women's Footwear ─────────────────────────────────────────

  const womensFootwear: SeedCollection = {
    name: "Lamalo Women's Footwear",
    description: "From platform sneakers to kitten heels — the complete women's shoe wardrobe. Stylish, comfortable and built to last.",
    collectionType: "footwear",
    season: "All-Season",
    year: 2026,
    styleTags: ["footwear","shoes","heels","sneakers","women"],
    collectionPriceAud: 10500,
    items: [
      { name: "Lamalo Platform Sneaker", description: "Platform leather sneaker with a chunky sole and a sleek white upper. Elevated everyday.", category: "footwear", subcategory: "sneakers", genderFit: "female", colors: ["White","Black","Cobalt"], materials: ["Leather Upper","Platform Rubber Sole"], styleTags: ["platform","sneaker","elevated"], leasePriceAud: 1250, retailPriceAud: 7500, referencePrompt: "Women's white leather platform sneaker chunky sole minimal", primaryImageUrl: "/lamalo/women-platform-sneaker.jpg", sizeRange: "UK 3–9" },
      { name: "Lamalo Strappy Heel Sandal", description: "Block heel strappy sandal in suede with an adjustable ankle strap. Goes from office to dinner.", category: "footwear", subcategory: "heels", genderFit: "female", colors: ["Nude","Black","Cobalt"], materials: ["Suede Upper","Leather Lining"], styleTags: ["heels","strappy","elegant"], leasePriceAud: 1400, retailPriceAud: 8500, referencePrompt: "Women's strappy block heel sandal nude beige suede ankle strap", primaryImageUrl: "/lamalo/women-heel-sandal.jpg", sizeRange: "UK 3–9" },
      { name: "Lamalo Kitten Heel Pump", description: "Pointed-toe kitten heel pump in smooth leather. Classic, feminine and office-ready.", category: "footwear", subcategory: "heels", genderFit: "female", colors: ["Black","Nude","White"], materials: ["Smooth Leather"], styleTags: ["kitten-heel","pump","classic"], leasePriceAud: 1500, retailPriceAud: 9000, referencePrompt: "Women's pointed toe kitten heel pump black leather minimal", primaryImageUrl: "/lamalo/women-kitten-heel.jpg", sizeRange: "UK 3–9" },
      { name: "Lamalo Knee-High Boot", description: "Knee-high suede boot with a low block heel and a side zip. Autumn/winter essential.", category: "footwear", subcategory: "boots", genderFit: "female", colors: ["Tan","Black"], materials: ["Suede Upper","Leather Insole"], styleTags: ["knee-boot","suede","autumn"], leasePriceAud: 1800, retailPriceAud: 11000, referencePrompt: "Women's knee-high suede boot tan brown side zip", primaryImageUrl: "/lamalo/women-knee-boot.jpg", sizeRange: "UK 3–9" },
      { name: "Lamalo Cork Wedge Sandal", description: "Open-toe cork wedge sandal with a leather upper and an adjustable ankle strap.", category: "footwear", subcategory: "sandals", genderFit: "female", colors: ["Tan","Black","White"], materials: ["Leather Upper","Cork Wedge Sole"], styleTags: ["wedge","sandal","summer"], leasePriceAud: 1200, retailPriceAud: 7000, referencePrompt: "Women's cork wedge sandal tan strappy adjustable ankle", primaryImageUrl: "/lamalo/women-wedge-sandal.jpg", sizeRange: "UK 3–9" },
      { name: "Lamalo Ballet Flat", description: "Classic leather ballet flat with a squared-off round toe and a cushioned insole. All-day comfort.", category: "footwear", subcategory: "flats", genderFit: "female", colors: ["Nude","Black","White"], materials: ["Leather Upper","Leather Lining"], styleTags: ["ballet-flat","classic","comfortable"], leasePriceAud: 900, retailPriceAud: 5500, referencePrompt: "Women's classic leather ballet flat nude rounded toe minimal", primaryImageUrl: "/lamalo/women-heel-sandal.jpg", sizeRange: "UK 3–9" },
      { name: "Lamalo Senior Court Shoe", description: "Wide-fit leather court shoe with a cushioned insole and a low comfortable heel.", category: "footwear", subcategory: "comfort-shoes", genderFit: "female", colors: ["Navy","Black","Beige"], materials: ["Soft Leather","Cushioned Insole"], styleTags: ["court-shoe","comfortable","wide-fit"], leasePriceAud: 850, retailPriceAud: 5000, referencePrompt: "Elderly women's wide fit comfort court shoe navy leather cushioned", primaryImageUrl: "/lamalo/elderly-women-court-shoe.jpg", sizeRange: "UK 3–9 (Wide Fit)" },
      { name: "Lamalo Women's Comfort Slipper", description: "Plush memory-foam slipper with faux-fur lining and a non-slip sole.", category: "footwear", subcategory: "slippers", genderFit: "female", colors: ["Dusty Pink","Grey"], materials: ["Faux Suede","Faux Fur Lining","Memory Foam"], styleTags: ["slipper","comfort","cosy"], leasePriceAud: 420, retailPriceAud: 2500, referencePrompt: "Women's memory foam comfort slipper dusty pink faux fur lining", primaryImageUrl: "/lamalo/elderly-women-slipper.jpg", sizeRange: "UK 3–9" },
    ],
  };

  // ─── Collection 18: Watches ───────────────────────────────────────────────────

  const watchCollection: SeedCollection = {
    name: "Lamalo Watches",
    description: "Precision-crafted timepieces for men and women. From classic dress watches to sporty chronographs and elegant bracelet styles.",
    collectionType: "accessories",
    season: "All-Season",
    year: 2026,
    styleTags: ["watches","timepieces","luxury","accessories"],
    collectionPriceAud: 12000,
    items: [
      { name: "Lamalo Men's Classic Dress Watch", description: "Minimalist dress watch with a stainless steel case, black dial and genuine leather strap. Date complication.", category: "accessories", subcategory: "watches", genderFit: "male", colors: ["Silver/Black","Gold/White","Rose Gold/White"], materials: ["Stainless Steel Case","Mineral Crystal","Leather Strap"], styleTags: ["watch","dress","minimal"], leasePriceAud: 1600, retailPriceAud: 9500, referencePrompt: "Men's minimalist dress watch silver stainless black dial leather strap", primaryImageUrl: "/lamalo/watch-mens-classic.jpg" },
      { name: "Lamalo Men's Sport Chronograph", description: "Bold sport chronograph with a black case and dial, rubber strap and 100m water resistance.", category: "accessories", subcategory: "watches", genderFit: "male", colors: ["Black/Black","Silver/Grey"], materials: ["Stainless Steel","Rubber Strap","Sapphire Crystal"], styleTags: ["watch","chronograph","sport"], leasePriceAud: 1800, retailPriceAud: 11000, referencePrompt: "Men's sport chronograph watch black case rubber strap 100m water", primaryImageUrl: "/lamalo/watch-mens-sport.jpg" },
      { name: "Lamalo Men's Minimalist Watch", description: "Ultra-thin quartz watch with a clean white dial, silver case and a slim leather strap.", category: "accessories", subcategory: "watches", genderFit: "male", colors: ["Silver/White","Black/Black"], materials: ["Stainless Steel Case","Leather Strap"], styleTags: ["watch","minimalist","thin"], leasePriceAud: 1400, retailPriceAud: 8500, referencePrompt: "Men's ultra thin minimalist watch silver case white dial slim", primaryImageUrl: "/lamalo/watch-mens-classic.jpg" },
      { name: "Lamalo Men's Mesh Bracelet Watch", description: "Stainless steel mesh bracelet watch with a sunburst champagne dial. Smart-casual versatility.", category: "accessories", subcategory: "watches", genderFit: "male", colors: ["Gold/Champagne","Silver/White"], materials: ["Stainless Steel Mesh Bracelet"], styleTags: ["watch","mesh","smart-casual"], leasePriceAud: 1500, retailPriceAud: 9000, referencePrompt: "Men's mesh bracelet watch gold champagne dial sunburst", primaryImageUrl: "/lamalo/watch-mens-classic.jpg" },
      { name: "Lamalo Women's Elegant Watch", description: "Rose gold case with a mother-of-pearl dial and a thin baguette bracelet. Understated glamour.", category: "accessories", subcategory: "watches", genderFit: "female", colors: ["Rose Gold/Pearl","Gold/White"], materials: ["Stainless Steel Rose Gold PVD","Bracelet Band"], styleTags: ["watch","elegant","rose-gold"], leasePriceAud: 1600, retailPriceAud: 9500, referencePrompt: "Women's elegant watch rose gold mother of pearl dial thin bracelet", primaryImageUrl: "/lamalo/watch-womens-elegant.jpg" },
      { name: "Lamalo Women's Fashion Watch", description: "Gold-tone case with a sunburst champagne dial and an interchangeable mesh bracelet.", category: "accessories", subcategory: "watches", genderFit: "female", colors: ["Gold/Champagne","Rose Gold/Blush"], materials: ["Gold PVD Stainless Steel","Mesh Bracelet"], styleTags: ["watch","fashion","gold"], leasePriceAud: 1500, retailPriceAud: 9000, referencePrompt: "Women's fashion watch gold tone champagne dial mesh bracelet", primaryImageUrl: "/lamalo/watch-womens-fashion.jpg" },
      { name: "Lamalo Women's Sport Watch", description: "Active sport watch with a 40mm case, silicone strap and 50m water resistance. Sporty and colourful.", category: "accessories", subcategory: "watches", genderFit: "female", colors: ["Silver/White","Cobalt Blue Strap"], materials: ["Stainless Steel","Silicone Strap"], styleTags: ["watch","sport","active"], leasePriceAud: 1400, retailPriceAud: 8500, referencePrompt: "Women's sport watch silver case cobalt blue silicone strap active", primaryImageUrl: "/lamalo/watch-mens-sport.jpg" },
      { name: "Lamalo Women's Slim Bracelet Watch", description: "Delicate thin-case watch with a diamond-set bezel and an ultra-slim bracelet.", category: "accessories", subcategory: "watches", genderFit: "female", colors: ["Gold/White","Silver/White"], materials: ["Stainless Steel","Crystal Bezel"], styleTags: ["watch","slim","delicate"], leasePriceAud: 1550, retailPriceAud: 9500, referencePrompt: "Women's slim bracelet watch gold diamond bezel delicate thin case", primaryImageUrl: "/lamalo/watch-womens-elegant.jpg" },
    ],
  };

  // ─── Collection 19: Eyewear / Sunglasses ─────────────────────────────────────

  const eyewearCollection: SeedCollection = {
    name: "Lamalo Eyewear",
    description: "From sport shields to vintage aviators — curated sunglasses for every face shape and lifestyle. UV400 protection as standard.",
    collectionType: "accessories",
    season: "All-Season",
    year: 2026,
    styleTags: ["sunglasses","eyewear","UV400","fashion","sport"],
    collectionPriceAud: 5000,
    items: [
      { name: "Lamalo Sport Shield", description: "Wraparound sport shield with UV400 polarised lens. Impact-resistant polycarbonate frame.", category: "accessories", subcategory: "sunglasses", genderFit: "unisex", colors: ["Black","Cobalt/Grey","White/Mirror"], materials: ["Polycarbonate Frame","UV400 Polarised Lens"], styleTags: ["sport","shield","polarised"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Sport wraparound shield sunglasses black UV400 polycarbonate", primaryImageUrl: "/lamalo/sunglasses-sport.jpg" },
      { name: "Lamalo Oversized Fashion", description: "Statement oversized sunglasses in Italian acetate with UV400 lenses. Bold and modern.", category: "accessories", subcategory: "sunglasses", genderFit: "unisex", colors: ["Tortoiseshell","Black","Clear"], materials: ["Italian Acetate","UV400 Lens"], styleTags: ["oversized","fashion","statement"], leasePriceAud: 800, retailPriceAud: 5000, referencePrompt: "Oversized fashion sunglasses tortoiseshell acetate bold UV400", primaryImageUrl: "/lamalo/sunglasses-fashion.jpg" },
      { name: "Lamalo Retro Round", description: "Thin metal-frame round sunglasses inspired by the 1970s. Brown tinted UV400 lens.", category: "accessories", subcategory: "sunglasses", genderFit: "unisex", colors: ["Gold/Amber","Silver/Grey","Black"], materials: ["Metal Frame","UV400 Tinted Lens"], styleTags: ["retro","round","vintage"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Retro round sunglasses gold metal frame amber brown tinted lens", primaryImageUrl: "/lamalo/sunglasses-retro.jpg" },
      { name: "Lamalo Classic Aviator", description: "Iconic aviator frame with a double bridge, teardrop lens and UV400 polarised coating.", category: "accessories", subcategory: "sunglasses", genderFit: "unisex", colors: ["Gold/Green","Silver/Blue","Gunmetal"], materials: ["Metal Frame","Polarised UV400"], styleTags: ["aviator","classic","polarised"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Classic aviator sunglasses gold frame polarised green lens double bridge", primaryImageUrl: "/lamalo/sunglasses-aviator.jpg" },
      { name: "Lamalo Minimal Rectangle", description: "Slim rectangular frame in lightweight acetate. Clean and modern with UV400 flat lens.", category: "accessories", subcategory: "sunglasses", genderFit: "unisex", colors: ["Black","Tortoiseshell","Crystal"], materials: ["Lightweight Acetate","UV400 Flat Lens"], styleTags: ["minimal","rectangle","modern"], leasePriceAud: 700, retailPriceAud: 4000, referencePrompt: "Slim rectangular sunglasses matte black acetate UV400 flat lens", primaryImageUrl: "/lamalo/sunglasses-minimal.jpg" },
      { name: "Lamalo Cat-Eye", description: "Retro-inspired cat-eye frame in acetate with a dramatic upswept corner.", category: "accessories", subcategory: "sunglasses", genderFit: "female", colors: ["Black","Tortoiseshell","Pink"], materials: ["Acetate Frame","UV400 Lens"], styleTags: ["cat-eye","retro","feminine"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Women's cat-eye sunglasses tortoiseshell dramatic upswept retro", primaryImageUrl: "/lamalo/sunglasses-fashion.jpg" },
      { name: "Lamalo Sport Wrap", description: "Lightweight sport wrap with interchangeable lenses and a ventilated nose bridge.", category: "accessories", subcategory: "sunglasses", genderFit: "unisex", colors: ["Black/Yellow","Black/Red","White"], materials: ["Polycarbonate","Rubber Grip"], styleTags: ["sport","wrap","interchangeable"], leasePriceAud: 650, retailPriceAud: 4000, referencePrompt: "Sport wrap sunglasses black yellow interchangeable lens lightweight", primaryImageUrl: "/lamalo/sunglasses-sport.jpg" },
      { name: "Lamalo Vintage Browline", description: "Bold acetate brow with slim metal lower frame. Heritage-inspired and endlessly flattering.", category: "accessories", subcategory: "sunglasses", genderFit: "unisex", colors: ["Black/Gold","Tortoiseshell/Gold"], materials: ["Acetate/Metal","UV400 Lens"], styleTags: ["browline","vintage","heritage"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Vintage browline sunglasses black gold acetate metal heritage", primaryImageUrl: "/lamalo/sunglasses-retro.jpg" },
    ],
  };

  // ─── Collection 20: Headwear ──────────────────────────────────────────────────

  const headwearCollection: SeedCollection = {
    name: "Lamalo Headwear",
    description: "Caps, hats and beanies for every season and style. From structured baseball caps to wide-brim sun hats and cosy knit beanies.",
    collectionType: "accessories",
    season: "All-Season",
    year: 2026,
    styleTags: ["hats","caps","headwear","accessories","seasonal"],
    collectionPriceAud: 3500,
    items: [
      { name: "Lamalo Structured Baseball Cap", description: "6-panel structured cap in cotton twill with an adjustable snapback closure and embroidered Lamalo logo.", category: "accessories", subcategory: "caps", genderFit: "unisex", colors: ["White","Black","Navy","Cobalt"], materials: ["100% Cotton Twill"], styleTags: ["baseball-cap","structured","casual"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Structured baseball cap white cotton minimal embroidered logo snapback", primaryImageUrl: "/lamalo/hat-baseball-cap.jpg" },
      { name: "Lamalo Bucket Hat", description: "Relaxed woven-cotton bucket hat with a wide drooping brim and a woven label.", category: "accessories", subcategory: "hats", genderFit: "unisex", colors: ["Black","White","Sage","Cobalt"], materials: ["100% Cotton"], styleTags: ["bucket-hat","summer","casual"], leasePriceAud: 420, retailPriceAud: 2500, referencePrompt: "Cotton bucket hat black wide brim woven casual relaxed", primaryImageUrl: "/lamalo/hat-bucket.jpg" },
      { name: "Lamalo Wide-Brim Sun Hat", description: "Natural straw sun hat with a wide brim and a black grosgrain ribbon band. Summer essential.", category: "accessories", subcategory: "hats", genderFit: "unisex", colors: ["Natural Straw","White","Black"], materials: ["Natural Straw","Cotton Lining"], styleTags: ["sun-hat","straw","summer"], leasePriceAud: 550, retailPriceAud: 3500, referencePrompt: "Wide brim natural straw sun hat black ribbon band summer", primaryImageUrl: "/lamalo/hat-wide-brim.jpg" },
      { name: "Lamalo Ribbed Knit Beanie", description: "Classic ribbed merino-wool beanie with a folded cuff. Soft, warm and versatile.", category: "accessories", subcategory: "beanies", genderFit: "unisex", colors: ["Charcoal","Black","White","Burgundy"], materials: ["100% Merino Wool"], styleTags: ["beanie","merino","winter"], leasePriceAud: 380, retailPriceAud: 2500, referencePrompt: "Ribbed knit beanie charcoal merino wool folded cuff warm", primaryImageUrl: "/lamalo/hat-beanie.jpg" },
      { name: "Lamalo Dad Cap", description: "Unstructured low-profile 6-panel cap in washed cotton with a curved brim.", category: "accessories", subcategory: "caps", genderFit: "unisex", colors: ["White","Grey","Sage"], materials: ["Washed Cotton"], styleTags: ["dad-cap","unstructured","relaxed"], leasePriceAud: 420, retailPriceAud: 2500, referencePrompt: "Unstructured washed cotton dad cap white curved brim casual", primaryImageUrl: "/lamalo/hat-baseball-cap.jpg" },
      { name: "Lamalo Trucker Cap", description: "Classic 5-panel trucker cap with a foam front and mesh back for breathability.", category: "accessories", subcategory: "caps", genderFit: "unisex", colors: ["White/Mesh","Black/Mesh","Navy/Mesh"], materials: ["Cotton Front","Nylon Mesh Back"], styleTags: ["trucker","mesh","casual"], leasePriceAud: 420, retailPriceAud: 2500, referencePrompt: "Classic trucker cap white foam front mesh back breathable", primaryImageUrl: "/lamalo/hat-baseball-cap.jpg" },
      { name: "Lamalo Wool Flat Cap", description: "Traditional flat cap in herringbone wool blend with a fully lined interior.", category: "accessories", subcategory: "hats", genderFit: "unisex", colors: ["Beige Herringbone","Charcoal","Navy"], materials: ["80% Wool","20% Polyester"], styleTags: ["flat-cap","heritage","classic"], leasePriceAud: 500, retailPriceAud: 3000, referencePrompt: "Wool herringbone flat cap beige traditional lined interior", primaryImageUrl: "/lamalo/elderly-men-flat-cap.jpg" },
      { name: "Lamalo Wool Beret", description: "Classic wool felt beret with a central stalk and a comfortable inner band.", category: "accessories", subcategory: "hats", genderFit: "unisex", colors: ["Black","Camel","Burgundy"], materials: ["100% Wool Felt"], styleTags: ["beret","classic","artistic"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Classic wool felt beret black French style artistic", primaryImageUrl: "/lamalo/hat-bucket.jpg" },
      { name: "Lamalo Performance Visor", description: "Open-crown visor in moisture-wicking fabric with UV protection and an adjustable back strap.", category: "accessories", subcategory: "caps", genderFit: "unisex", colors: ["White","Black","Cobalt"], materials: ["Performance Polyester"], styleTags: ["visor","sport","UV-protection"], leasePriceAud: 350, retailPriceAud: 2000, referencePrompt: "Performance sport visor white UV protection moisture wicking open crown", primaryImageUrl: "/lamalo/hat-baseball-cap.jpg" },
    ],
  };

  // ─── Collection 21: Handbags & Carry ─────────────────────────────────────────

  const handbagsCollection: SeedCollection = {
    name: "Lamalo Bags & Handbags",
    description: "Canvas totes to leather crossbodies — thoughtfully designed bags for every occasion and age. Practical, stylish and built to last.",
    collectionType: "accessories",
    season: "All-Season",
    year: 2026,
    styleTags: ["bags","handbags","leather","canvas","accessories"],
    collectionPriceAud: 12000,
    items: [
      { name: "Lamalo Canvas Tote", description: "Large structured canvas tote with internal slip pockets and a leather base trim. Everyday versatile.", category: "accessories", subcategory: "tote-bags", genderFit: "unisex", colors: ["Natural/Beige","Black","Cobalt"], materials: ["Canvas","Leather Trim"], styleTags: ["tote","canvas","everyday"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Large structured canvas tote bag natural beige leather trim minimal", primaryImageUrl: "/lamalo/bag-tote.jpg" },
      { name: "Lamalo Leather Crossbody", description: "Small structured leather crossbody with gold hardware and an adjustable strap. Day-to-evening.", category: "accessories", subcategory: "crossbody-bags", genderFit: "female", colors: ["Tan Cognac","Black","White"], materials: ["Full-Grain Leather","Gold Hardware"], styleTags: ["crossbody","leather","structured"], leasePriceAud: 1400, retailPriceAud: 8500, referencePrompt: "Leather crossbody bag tan cognac adjustable strap gold hardware", primaryImageUrl: "/lamalo/bag-crossbody.jpg" },
      { name: "Lamalo Evening Clutch", description: "Sleek box clutch in smooth leather with a magnetic snap and a gold chain wrist strap.", category: "accessories", subcategory: "clutches", genderFit: "female", colors: ["Black","Gold","Ivory"], materials: ["Smooth Leather","Gold-Tone Hardware"], styleTags: ["clutch","evening","formal"], leasePriceAud: 950, retailPriceAud: 5500, referencePrompt: "Evening clutch bag black smooth leather gold chain strap formal", primaryImageUrl: "/lamalo/bag-clutch.jpg" },
      { name: "Lamalo Sport Duffel", description: "Large nylon duffel with a zippered main compartment, wet pouch and adjustable shoulder strap.", category: "accessories", subcategory: "duffel-bags", genderFit: "unisex", colors: ["Black","Cobalt","Grey"], materials: ["Nylon","Rubber Base Feet"], styleTags: ["duffel","sport","gym"], leasePriceAud: 1100, retailPriceAud: 6500, referencePrompt: "Large sport duffel bag black nylon shoulder strap wet pouch", primaryImageUrl: "/lamalo/bag-sports-duffel.jpg" },
      { name: "Lamalo Quilted Shoulder Bag", description: "Quilted diamond-pattern shoulder bag with a gold chain strap and a flap closure.", category: "accessories", subcategory: "shoulder-bags", genderFit: "female", colors: ["White","Black","Cobalt"], materials: ["Quilted Leather","Gold Chain"], styleTags: ["quilted","shoulder-bag","chic"], leasePriceAud: 1500, retailPriceAud: 9000, referencePrompt: "Quilted leather shoulder bag white diamond pattern gold chain flap", primaryImageUrl: "/lamalo/bag-shoulder.jpg" },
      { name: "Lamalo Structured Leather Tote", description: "Top-handle structured tote in full-grain leather with an internal organiser and a zip top.", category: "accessories", subcategory: "tote-bags", genderFit: "female", colors: ["Black","Tan","Camel"], materials: ["Full-Grain Leather"], styleTags: ["tote","leather","structured"], leasePriceAud: 1800, retailPriceAud: 11000, referencePrompt: "Structured leather tote bag black full grain top handle organiser", primaryImageUrl: "/lamalo/bag-tote.jpg" },
      { name: "Lamalo Mini Shoulder Bag", description: "Compact mini bag with a leather body and a long adjustable chain strap. Evening to everyday.", category: "accessories", subcategory: "shoulder-bags", genderFit: "female", colors: ["Black","Tan","Cobalt"], materials: ["Leather","Chain Strap"], styleTags: ["mini-bag","chain","compact"], leasePriceAud: 1250, retailPriceAud: 7500, referencePrompt: "Mini shoulder bag black leather chain strap compact evening", primaryImageUrl: "/lamalo/bag-shoulder.jpg" },
      { name: "Lamalo Travel Weekender", description: "Canvas-and-leather weekender bag with a wide zip opening, shoe compartment and carry handles.", category: "accessories", subcategory: "travel-bags", genderFit: "unisex", colors: ["Black","Navy"], materials: ["Canvas Body","Leather Handles and Trim"], styleTags: ["weekender","travel","weekend"], leasePriceAud: 1600, retailPriceAud: 9500, referencePrompt: "Canvas leather weekender travel bag black shoe compartment handles", primaryImageUrl: "/lamalo/bag-sports-duffel.jpg" },
      { name: "Lamalo Kids' Backpack", description: "Fun and durable nylon backpack for kids with padded straps, organiser pockets and a water bottle slot.", category: "accessories", subcategory: "backpacks", genderFit: "kids", colors: ["Teal","Cobalt","Pink"], materials: ["Nylon"], styleTags: ["backpack","kids","school"], leasePriceAud: 500, retailPriceAud: 3000, referencePrompt: "Children's colourful backpack teal padded straps school organiser pockets", primaryImageUrl: "/lamalo/kids-backpack.jpg" },
    ],
  };

  // ─── Collection 22: Accessories — Belts, Scarves, Jewellery & More ────────────

  const accessoriesCollection: SeedCollection = {
    name: "Lamalo Accessories",
    description: "The finishing touches — belts, scarves, jewellery, gloves and more. Thoughtfully crafted accessories for men, women, kids and seniors.",
    collectionType: "accessories",
    season: "All-Season",
    year: 2026,
    styleTags: ["accessories","belts","scarves","jewellery","finishing-touches"],
    collectionPriceAud: 4500,
    items: [
      { name: "Lamalo Men's Leather Belt", description: "Full-grain leather belt with a brushed nickel pin buckle. Classic and versatile.", category: "accessories", subcategory: "belts", genderFit: "male", colors: ["Tan","Black","Brown"], materials: ["Full-Grain Leather"], styleTags: ["belt","leather","classic"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Men's genuine leather belt tan brown silver nickel buckle", primaryImageUrl: "/lamalo/acc-mens-belt.jpg" },
      { name: "Lamalo Men's Slim Wallet", description: "Slim bifold wallet in smooth leather with card slots and a notes compartment.", category: "accessories", subcategory: "wallets", genderFit: "male", colors: ["Black","Tan","Navy"], materials: ["Smooth Leather"], styleTags: ["wallet","slim","leather"], leasePriceAud: 550, retailPriceAud: 3500, referencePrompt: "Men's slim bifold leather wallet black card slots notes compartment", primaryImageUrl: "/lamalo/acc-mens-wallet.jpg" },
      { name: "Lamalo Women's Silk Scarf", description: "100% pure silk square scarf with a vibrant print. Wear around the neck, as a headband or on the wrist.", category: "accessories", subcategory: "scarves", genderFit: "female", colors: ["Multicolour Floral","Navy/Cream","Cobalt/Gold"], materials: ["100% Pure Silk"], styleTags: ["scarf","silk","versatile"], leasePriceAud: 750, retailPriceAud: 4500, referencePrompt: "Women's silk square scarf floral print multicolour 100% pure silk", primaryImageUrl: "/lamalo/acc-women-silk-scarf.jpg" },
      { name: "Lamalo Gold Chain Necklace", description: "Delicate 18K gold-plated chain necklace with a lobster clasp. Timeless and wearable.", category: "accessories", subcategory: "jewellery", genderFit: "female", colors: ["Gold","Rose Gold","Silver"], materials: ["18K Gold-Plated Stainless Steel"], styleTags: ["necklace","gold","delicate"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Women's delicate gold chain necklace 18k plated minimal lobster clasp", primaryImageUrl: "/lamalo/acc-women-necklace.jpg" },
      { name: "Lamalo Gold Hoop Earrings", description: "Classic gold hoop earrings in two sizes — everyday 25mm and statement 40mm.", category: "accessories", subcategory: "jewellery", genderFit: "female", colors: ["Gold","Silver","Rose Gold"], materials: ["18K Gold-Plated Stainless Steel"], styleTags: ["earrings","hoops","classic"], leasePriceAud: 380, retailPriceAud: 2500, referencePrompt: "Women's gold hoop earrings 18k plated two sizes minimal classic", primaryImageUrl: "/lamalo/acc-women-earrings.jpg" },
      { name: "Lamalo Merino Knit Scarf", description: "Chunky cable-knit merino wool scarf. Warm, soft and generous in length.", category: "accessories", subcategory: "scarves", genderFit: "unisex", colors: ["Burgundy","Charcoal","Camel"], materials: ["100% Merino Wool"], styleTags: ["scarf","merino","winter"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Unisex chunky cable knit merino wool scarf burgundy warm generous", primaryImageUrl: "/lamalo/acc-scarf-knit.jpg" },
      { name: "Lamalo Kids' Fun Socks Set", description: "Set of 5 pairs of cotton socks in colourful animal and graphic prints. Kids love them.", category: "accessories", subcategory: "socks", genderFit: "kids", colors: ["Animal Print Mix","Rainbow","Sports Mix"], materials: ["80% Cotton","15% Polyester","5% Elastane"], styleTags: ["socks","kids","colourful"], leasePriceAud: 180, retailPriceAud: 1500, referencePrompt: "Children's fun socks 5 pack colourful animal print rainbow", primaryImageUrl: "/lamalo/acc-kids-socks-set.jpg", sizeRange: "3–5Y,6–8Y,9–12Y" },
      { name: "Lamalo Classic Umbrella", description: "Windproof fibreglass frame umbrella with a wooden curved handle. Opens to 100cm. Senior-friendly grip.", category: "accessories", subcategory: "umbrellas", genderFit: "unisex", colors: ["Black","Navy"], materials: ["Polyester Canopy","Fibreglass Frame","Wooden Handle"], styleTags: ["umbrella","windproof","practical"], leasePriceAud: 450, retailPriceAud: 2500, referencePrompt: "Classic windproof umbrella black wooden curved handle easy grip senior", primaryImageUrl: "/lamalo/acc-elderly-umbrella.jpg" },
      { name: "Lamalo Leather Gloves", description: "Classic leather gloves with cashmere lining. Touchscreen-compatible tips and a button closure.", category: "accessories", subcategory: "gloves", genderFit: "unisex", colors: ["Dark Brown","Black","Camel"], materials: ["Nappa Leather","Cashmere Lining"], styleTags: ["gloves","leather","winter"], leasePriceAud: 700, retailPriceAud: 4000, referencePrompt: "Classic leather gloves dark brown cashmere lined touchscreen tips", primaryImageUrl: "/lamalo/acc-leather-gloves.jpg", sizeRange: "XS–XL" },
    ],
  };

  // ─── Elderly Swimwear ──────────────────────────────────────────────────────────

  const elderlySwimwear: SeedCollection = {
    name: "Lamalo Comfort Swimwear",
    description: "Swimwear designed with dignity and comfort in mind. Modest cuts, UV protection and flattering styles for mature bodies.",
    collectionType: "swimwear",
    season: "Summer",
    year: 2026,
    styleTags: ["swimwear","modest","senior","comfort","UPF"],
    collectionPriceAud: 3000,
    items: [
      { name: "Lamalo Women's Skirted Swimsuit", description: "Modest one-piece with an attached skirted bottom panel for extra coverage. UPF30+ fabric.", category: "swimwear", subcategory: "one-piece", genderFit: "female", colors: ["Navy/White Trim","Black","Teal"], materials: ["UPF30+ Nylon/Elastane"], styleTags: ["modest","skirted","senior"], leasePriceAud: 800, retailPriceAud: 5000, referencePrompt: "Elderly women's modest one piece skirted swimsuit navy white trim UPF", primaryImageUrl: "/lamalo/swimwear-elderly-women.jpg", sizeRange: "XS–3XL" },
      { name: "Lamalo Men's Comfort Swim Short", description: "Longer-length swim short with a full elastic waist and quick-dry fabric. Comfortable in and out of the water.", category: "swimwear", subcategory: "swim-shorts", genderFit: "male", colors: ["Khaki","Navy","Black"], materials: ["Quick-Dry Polyester"], styleTags: ["swim-short","comfort","modest"], leasePriceAud: 600, retailPriceAud: 3500, referencePrompt: "Elderly men's longer swim short khaki elasticated waist quick dry comfort", primaryImageUrl: "/lamalo/swimwear-elderly-men.jpg", sizeRange: "S–3XL" },
      { name: "Lamalo Women's Swim Tunic", description: "Over-swimsuit swim tunic providing coverage and comfort at the pool. UPF50+ fabric.", category: "swimwear", subcategory: "cover-ups", genderFit: "female", colors: ["Navy","Black","Teal"], materials: ["UPF50+ Polyester"], styleTags: ["swim-tunic","coverage","modest"], leasePriceAud: 700, retailPriceAud: 4000, referencePrompt: "Women's swim tunic navy UPF50 modest coverage pool beach senior", primaryImageUrl: "/lamalo/swimwear-elderly-women.jpg", sizeRange: "XS–3XL" },
      { name: "Lamalo Unisex Aqua Shoe", description: "Quick-dry aqua shoe with a drainage sole and a slip-on design. Pool, beach and water sports.", category: "footwear", subcategory: "water-shoes", genderFit: "unisex", colors: ["Black","Cobalt Blue","Grey"], materials: ["Neoprene Upper","Non-Slip Sole"], styleTags: ["aqua-shoe","water-sports","comfort"], leasePriceAud: 400, retailPriceAud: 2500, referencePrompt: "Unisex aqua water shoe black neoprene drainage sole slip-on pool beach", primaryImageUrl: "/lamalo/shoe-sport-slide.jpg", sizeRange: "UK 3–14" },
    ],
  };

  // ─── ALL_COLLECTIONS ──────────────────────────────────────────────────────────

  const ALL_COLLECTIONS: SeedCollection[] = [
    mensEveryday,
    mensSport,
    mensOriginals,
    mensFormal,
    mensSwimwear,
    mensComfort,
    womensEveryday,
    womensActive,
    womensOriginals,
    womensFormal,
    womensSwimwear,
    womensComfort,
    kidsEveryday,
    kidsActive,
    kidsSwimwear,
    mensFootwear,
    womensFootwear,
    watchCollection,
    eyewearCollection,
    headwearCollection,
    handbagsCollection,
    accessoriesCollection,
    elderlySwimwear,
  ];

  // ─── Seed Runner ──────────────────────────────────────────────────────────────

  export async function runLamaloSeed(
    userId: number
  ): Promise<{ created: boolean; collections: number; items: number }> {
    const db = (await getDb())!;

    // Get or create the Lamalo Fashion designer profile
    let designerProfileId: number;
    const existing = await db
      .select({ id: designerProfiles.id })
      .from(designerProfiles)
      .where(eq(designerProfiles.brandName, "Lamalo Fashion"))
      .limit(1);

    if (existing.length > 0) {
      designerProfileId = existing[0].id;
      log.info(`Lamalo Fashion profile found (id=${designerProfileId}) — checking for new collections`);
    } else {
      const [profile] = await db.insert(designerProfiles).values({
        userId,
        brandName: "Lamalo Fashion",
        displayName: "Lamalo",
        profileType: "brand",
        bio:
          "Lamalo Fashion is the Virelle Studios in-house label — contemporary, accessible, and production-ready. " +
          "Twenty-three curated collections spanning menswear, womenswear, kids, seniors, swimwear, footwear, " +
          "watches, eyewear and accessories. Lease individual pieces or entire collections at some of the most " +
          "competitive prices on the marketplace.",
        website: "https://virelle.life/wardrobe-marketplace",
        instagram: "@lamalofashion",
        contactEmail: "wardrobe@virelle.life",
        logoUrl:
          "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png",
        verified: true,
        visibility: "public",
        stripeAccountId: null,
        stripeAccountStatus: "none",
        membershipStatus: "active",
        membershipSubscriptionId: null,
        membershipCurrentPeriodEnd: new Date("2099-12-31"),
      });
      // @ts-ignore — Drizzle MySQL insertId
      designerProfileId = (profile as any).insertId ?? 1;
      log.info(`Lamalo Fashion profile created (id=${designerProfileId})`);
    }

    let newCollections = 0;
    let totalItems = 0;

    for (const col of ALL_COLLECTIONS) {
      // Check if this collection already exists — additive seeding
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

      // Insert collection
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
          "Leased for use in Virelle Studios film productions. Platform retains 100% revenue.",
        collectionPriceAud: col.collectionPriceAud,
        published: true,
        publishedAt: new Date(),
      });

      // @ts-ignore — Drizzle MySQL insertId
      const collectionId: number = (colResult as any).insertId ?? 1;
      newCollections++;

      for (const item of col.items) {
        await db.insert(wardrobeItems).values({
          collectionId,
          userId,
          designerProfileId,
          name: item.name,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          wardrobeType: "fashion",
          genderFit: item.genderFit,
          sizeRange: item.sizeRange ?? "XS–XXL",
          era: "Contemporary 2026",
          colors: item.colors,
          materials: item.materials,
          styleTags: item.styleTags,
          referencePrompt: item.referencePrompt,
          primaryImageUrl: item.primaryImageUrl ?? null,
          brandPlacementAllowed: false,
          shopfrontPlacementAllowed: true,
          characterWardrobeAllowed: true,
          costumeUseAllowed: true,
          commercialUseAllowed: true,
          licenseType: "full_license",
          visibility: "public",
          status: "active",
          retailPriceAud: item.retailPriceAud,
          leasePriceAud: item.leasePriceAud,
        });
        totalItems++;
      }

      log.info(`Seeded collection "${col.name}" with ${col.items.length} items`);
    }

    log.info(
      `Lamalo Fashion seed complete — ${newCollections} new collections, ${totalItems} new items`
    );
    return { created: existing.length === 0, collections: newCollections, items: totalItems };
  }
  