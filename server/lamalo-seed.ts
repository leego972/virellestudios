/**
   * lamalo-seed.ts
   * Seeds the Lamalo Fashion in-house designer brand for Virelle Studios.
   * 9 collections · 106 items · Men, Women, Kids, Accessories, Footwear, Eyewear
   * Run via the admin.seedLamalo tRPC mutation (once, idempotent).
   * Platform keeps 100% — no Stripe Connect destination for this designer.
   */
  import { getDb } from "./db";
  import { designerProfiles, designerCollections, wardrobeItems } from "../drizzle/schema";
  import { eq } from "drizzle-orm";
  import { logger } from "./_core/logger";

  const log = logger;

  // ─── Types ──────────────────────────────────────────────────────────────────

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

  // ─── Collection 1: Men's Casual ─────────────────────────────────────────────

  const mensCasual: SeedCollection = {
    name: "Lamalo Men's Casual",
    description: "Everyday relaxed staples for men — breathable fabrics, clean cuts, versatile colour palette for any casual scene.",
    collectionType: "fashion_collection",
    season: "Spring/Summer 2026",
    year: 2026,
    styleTags: ["casual", "menswear", "relaxed", "everyday", "minimal"],
    collectionPriceAud: 4500,
    items: [
      { name: "Lamalo Linen Shirt", description: "Relaxed-fit linen shirt with a soft drape and single chest pocket.", category: "top", subcategory: "shirt", genderFit: "male", colors: ["terracotta", "sage green", "off-white", "cobalt blue"], materials: ["linen"], styleTags: ["casual", "summer", "breathable"], leasePriceAud: 1000, retailPriceAud: 12000, referencePrompt: "relaxed linen shirt, chest pocket, soft drape, subtle texture" },
      { name: "Lamalo Polo Shirt", description: "Classic piqué polo with ribbed collar and two-button placket.", category: "top", subcategory: "polo", genderFit: "male", colors: ["cobalt blue", "forest green", "slate grey", "burgundy"], materials: ["cotton piqué"], styleTags: ["smart-casual", "preppy", "classic"], leasePriceAud: 900, retailPriceAud: 10000, referencePrompt: "piqué polo shirt, ribbed collar, two-button placket, fitted" },
      { name: "Lamalo Graphic Tee", description: "Oversized crew-neck tee with a subtle tonal Lamalo wordmark graphic.", category: "top", subcategory: "t-shirt", genderFit: "male", colors: ["off-white", "lavender", "butter yellow", "burnt orange"], materials: ["100% cotton"], styleTags: ["streetwear", "relaxed", "graphic"], leasePriceAud: 700, retailPriceAud: 7000, referencePrompt: "oversized crew-neck tee, subtle wordmark graphic, relaxed fit" },
      { name: "Lamalo Henley Tee", description: "Three-button henley in soft jersey — effortlessly layerable.", category: "top", subcategory: "t-shirt", genderFit: "male", colors: ["chocolate brown", "sage green", "camel", "slate grey"], materials: ["cotton jersey"], styleTags: ["casual", "layerable", "classic"], leasePriceAud: 800, retailPriceAud: 8500, referencePrompt: "henley neck tee, three-button placket, soft jersey, slightly fitted" },
      { name: "Lamalo Chino Trouser", description: "Straight-leg chino in a garment-dyed cotton twill — the perfect smart-casual bottom.", category: "bottom", subcategory: "trouser", genderFit: "male", colors: ["chocolate brown", "camel", "slate grey", "off-white"], materials: ["cotton twill"], styleTags: ["smart-casual", "versatile", "tailored casual"], leasePriceAud: 1200, retailPriceAud: 14000, referencePrompt: "straight-leg chino trouser, garment-dyed, clean front, slightly tapered" },
      { name: "Lamalo Cargo Short", description: "Relaxed cargo short with oversized pockets and a drawstring waist.", category: "bottom", subcategory: "short", genderFit: "male", colors: ["terracotta", "khaki", "forest green", "slate grey"], materials: ["cotton ripstop"], styleTags: ["utility", "casual", "summer"], leasePriceAud: 900, retailPriceAud: 10000, referencePrompt: "cargo short, oversized side pockets, drawstring waist, relaxed fit" },
      { name: "Lamalo Denim Jean", description: "Slim-straight denim jean in a mid-weight selvedge-inspired weave.", category: "bottom", subcategory: "denim", genderFit: "male", colors: ["indigo", "off-white", "midnight black"], materials: ["denim"], styleTags: ["denim", "classic", "versatile"], leasePriceAud: 1400, retailPriceAud: 16000, referencePrompt: "slim-straight denim jean, mid-weight, five-pocket, clean hemline" },
      { name: "Lamalo Linen Short", description: "Lightweight linen short cut at mid-thigh with side seam pockets.", category: "bottom", subcategory: "short", genderFit: "male", colors: ["sage green", "off-white", "terracotta", "camel"], materials: ["linen"], styleTags: ["summer", "beach-ready", "relaxed"], leasePriceAud: 900, retailPriceAud: 9500, referencePrompt: "linen short, mid-thigh length, relaxed fit, side seam pockets" },
      { name: "Lamalo Overshirt Jacket", description: "Boxy overshirt-jacket in a soft cotton flannel — ideal transitional layer.", category: "outerwear", subcategory: "jacket", genderFit: "male", colors: ["burnt orange", "chocolate brown", "sage green"], materials: ["cotton flannel"], styleTags: ["layering", "casual jacket", "transitional"], leasePriceAud: 1500, retailPriceAud: 18000, referencePrompt: "boxy overshirt jacket, buttoned front, chest pockets, soft flannel texture" },
      { name: "Lamalo Bomber Jacket", description: "Classic bomber silhouette in a smooth satin-finish shell with ribbed cuffs.", category: "outerwear", subcategory: "jacket", genderFit: "male", colors: ["cobalt blue", "midnight black", "olive green"], materials: ["satin shell", "knit rib"], styleTags: ["streetwear", "bomber", "classic"], leasePriceAud: 1800, retailPriceAud: 22000, referencePrompt: "classic bomber jacket, satin shell, ribbed collar and cuffs, zip front" },
      { name: "Lamalo Canvas Sneaker", description: "Clean low-top canvas sneaker with a vulcanised rubber sole.", category: "shoes", subcategory: "sneaker", genderFit: "male", colors: ["off-white", "cobalt blue", "terracotta", "midnight black"], materials: ["canvas", "rubber sole"], styleTags: ["casual footwear", "classic sneaker", "everyday"], leasePriceAud: 1000, retailPriceAud: 12000, referencePrompt: "low-top canvas sneaker, clean silhouette, vulcanised rubber sole, lace-up" },
      { name: "Lamalo Leather Loafer", description: "Penny loafer in supple full-grain leather with a stacked wooden heel.", category: "shoes", subcategory: "loafer", genderFit: "male", colors: ["chocolate brown", "camel", "midnight black"], materials: ["full-grain leather", "leather sole"], styleTags: ["smart-casual footwear", "loafer", "classic"], leasePriceAud: 1400, retailPriceAud: 20000, referencePrompt: "penny loafer, full-grain leather, stacked wooden heel, slip-on" },
    ],
  };

  // ─── Collection 2: Men's Sport ──────────────────────────────────────────────

  const mensSport: SeedCollection = {
    name: "Lamalo Men's Sport",
    description: "Performance-driven sportswear with a clean aesthetic — built for movement, designed to look sharp on and off the field.",
    collectionType: "fashion_collection",
    season: "Spring/Summer 2026",
    year: 2026,
    styleTags: ["sport", "athleisure", "performance", "active", "menswear"],
    collectionPriceAud: 4000,
    items: [
      { name: "Lamalo Performance Polo", description: "Moisture-wicking stretch polo with a clean minimal logo.", category: "top", subcategory: "polo", genderFit: "male", colors: ["forest green", "cobalt blue", "slate grey", "burnt orange"], materials: ["performance polyester", "elastane"], styleTags: ["sport", "polo", "moisture-wicking"], leasePriceAud: 1000, retailPriceAud: 11000, referencePrompt: "sport polo, moisture-wicking fabric, subtle logo, fitted athletic cut" },
      { name: "Lamalo Running Tee", description: "Lightweight mesh-blend running tee with back ventilation panel.", category: "top", subcategory: "t-shirt", genderFit: "male", colors: ["cobalt blue", "forest green", "burnt orange", "slate grey"], materials: ["mesh polyester blend"], styleTags: ["running", "sport", "breathable"], leasePriceAud: 800, retailPriceAud: 8000, referencePrompt: "lightweight running tee, ventilation panel, minimal branding, athletic fit" },
      { name: "Lamalo Training Short", description: "5-inch inseam training short with built-in liner and zip side pocket.", category: "bottom", subcategory: "short", genderFit: "male", colors: ["midnight black", "slate grey", "cobalt blue", "forest green"], materials: ["stretch woven"], styleTags: ["training", "sport", "gym"], leasePriceAud: 900, retailPriceAud: 9500, referencePrompt: "training short, 5-inch inseam, built-in liner, zip pocket, athletic fit" },
      { name: "Lamalo Jogger Pant", description: "Tapered jogger with a ribbed cuff, elastic waistband and drawstring.", category: "bottom", subcategory: "jogger", genderFit: "male", colors: ["charcoal", "sage green", "lavender", "slate grey"], materials: ["French terry cotton"], styleTags: ["athleisure", "jogger", "comfortable"], leasePriceAud: 1100, retailPriceAud: 13000, referencePrompt: "tapered jogger pant, ribbed cuffs, elastic waistband, drawstring" },
      { name: "Lamalo Track Jacket", description: "Retro-inspired track jacket with contrast side stripe and zip chest pocket.", category: "outerwear", subcategory: "jacket", genderFit: "male", colors: ["burnt orange", "cobalt blue", "forest green", "slate grey"], materials: ["technical polyester", "mesh lining"], styleTags: ["track", "retro sport", "athleisure"], leasePriceAud: 1400, retailPriceAud: 16000, referencePrompt: "track jacket, contrast side stripe, zip chest pocket, retro athletic silhouette" },
      { name: "Lamalo Track Pant", description: "Matching track pant with contrast side stripe and ankle zip.", category: "bottom", subcategory: "trouser", genderFit: "male", colors: ["midnight black", "slate grey", "cobalt blue"], materials: ["technical polyester"], styleTags: ["track", "retro sport", "matching set"], leasePriceAud: 1100, retailPriceAud: 13000, referencePrompt: "track pant, contrast side stripe, ankle zip, straight leg, retro sport" },
      { name: "Lamalo Zip Hoodie", description: "Full-zip sport hoodie in a heavyweight fleece with kangaroo pockets.", category: "outerwear", subcategory: "hoodie", genderFit: "male", colors: ["chocolate brown", "slate grey", "forest green"], materials: ["heavyweight fleece"], styleTags: ["hoodie", "athleisure", "warm"], leasePriceAud: 1400, retailPriceAud: 17000, referencePrompt: "full-zip hoodie, heavyweight fleece, kangaroo pocket, sport fit" },
      { name: "Lamalo Sport Mesh Tee", description: "Drop-shoulder mesh tee with tonal panel detailing for breathability.", category: "top", subcategory: "t-shirt", genderFit: "male", colors: ["midnight black", "cobalt blue", "burnt orange"], materials: ["open-weave mesh polyester"], styleTags: ["sport", "mesh", "streetwear"], leasePriceAud: 800, retailPriceAud: 8500, referencePrompt: "drop-shoulder mesh tee, tonal panel detail, open weave texture, sport fit" },
      { name: "Lamalo Running Shoe", description: "Lightweight running shoe with a foam midsole and breathable upper.", category: "shoes", subcategory: "trainer", genderFit: "male", colors: ["off-white cobalt", "forest green white", "midnight black orange"], materials: ["mesh upper", "foam midsole", "rubber outsole"], styleTags: ["running", "sport shoe", "lightweight"], leasePriceAud: 1600, retailPriceAud: 22000, referencePrompt: "lightweight running shoe, foam midsole, breathable mesh upper, rubber outsole" },
      { name: "Lamalo Sport Slide", description: "Recovery slide with a contoured EVA footbed and adjustable single-strap.", category: "shoes", subcategory: "slide", genderFit: "male", colors: ["midnight black", "slate grey", "forest green"], materials: ["EVA foam", "rubber"], styleTags: ["recovery slide", "poolside", "sport"], leasePriceAud: 600, retailPriceAud: 6000, referencePrompt: "sport recovery slide, single strap, contoured EVA footbed" },
    ],
  };

  // ─── Collection 3: Men's Elegant ────────────────────────────────────────────

  const mensElegant: SeedCollection = {
    name: "Lamalo Men's Elegant",
    description: "Refined formalwear and smart dressing for men — sharp tailoring, premium fabrics, effortlessly authoritative.",
    collectionType: "fashion_collection",
    season: "Autumn/Winter 2026",
    year: 2026,
    styleTags: ["formal", "elegant", "tailored", "menswear", "premium"],
    collectionPriceAud: 7500,
    items: [
      { name: "Lamalo Suit Jacket", description: "Single-breasted two-button suit jacket with a clean notch lapel.", category: "suit", subcategory: "blazer", genderFit: "male", colors: ["charcoal", "midnight navy", "chocolate brown", "champagne"], materials: ["wool blend", "viscose lining"], styleTags: ["suit", "formal", "tailored"], leasePriceAud: 2500, retailPriceAud: 60000, referencePrompt: "single-breasted suit jacket, notch lapel, two-button, slim silhouette" },
      { name: "Lamalo Suit Trouser", description: "Matching flat-front suit trouser with a clean break hem.", category: "suit", subcategory: "trouser", genderFit: "male", colors: ["charcoal", "midnight navy", "chocolate brown", "champagne"], materials: ["wool blend"], styleTags: ["suit", "formal", "tailored"], leasePriceAud: 1500, retailPriceAud: 32000, referencePrompt: "flat-front suit trouser, slim leg, clean break hemline" },
      { name: "Lamalo Dress Shirt", description: "Crisp poplin dress shirt with a spread collar and French cuff option.", category: "top", subcategory: "shirt", genderFit: "male", colors: ["off-white", "pale blue", "blush", "champagne"], materials: ["Egyptian cotton poplin"], styleTags: ["formal shirt", "dress shirt", "crisp"], leasePriceAud: 1000, retailPriceAud: 18000, referencePrompt: "crisp poplin dress shirt, spread collar, French cuff, slim fit" },
      { name: "Lamalo Dinner Jacket", description: "Peak-lapel dinner jacket in a silk-faced satin with grosgrain trim.", category: "outerwear", subcategory: "jacket", genderFit: "male", colors: ["midnight black", "deep forest", "champagne"], materials: ["wool-silk blend", "satin facing"], styleTags: ["black tie", "dinner jacket", "formal"], leasePriceAud: 3500, retailPriceAud: 95000, referencePrompt: "dinner jacket, peak lapel, satin facing, one button, formal black tie" },
      { name: "Lamalo Dress Trouser", description: "Slim dress trouser with a satin side stripe — pairs with the Dinner Jacket.", category: "bottom", subcategory: "trouser", genderFit: "male", colors: ["midnight black", "charcoal", "taupe"], materials: ["fine wool"], styleTags: ["formal trouser", "dinner dress", "sleek"], leasePriceAud: 1200, retailPriceAud: 28000, referencePrompt: "slim dress trouser, satin side stripe, flat front, formal" },
      { name: "Lamalo Waistcoat", description: "Matching waistcoat in a fine wool — adds a three-piece look.", category: "suit", subcategory: "waistcoat", genderFit: "male", colors: ["charcoal", "midnight navy", "champagne"], materials: ["wool blend"], styleTags: ["three-piece", "waistcoat", "formal"], leasePriceAud: 1000, retailPriceAud: 20000, referencePrompt: "five-button waistcoat, v-neckline, matching suit fabric, formal" },
      { name: "Lamalo Oxford Shoe", description: "Classic balmoral Oxford in burnished full-grain calf leather.", category: "shoes", subcategory: "oxford", genderFit: "male", colors: ["chocolate brown", "midnight black", "camel"], materials: ["full-grain calf leather", "leather sole"], styleTags: ["oxford", "formal shoe", "classic"], leasePriceAud: 2000, retailPriceAud: 45000, referencePrompt: "balmoral Oxford shoe, burnished calfskin, closed lacing, leather sole" },
      { name: "Lamalo Derby Shoe", description: "Open-laced Derby in smooth calfskin — slightly more relaxed than an Oxford.", category: "shoes", subcategory: "derby", genderFit: "male", colors: ["midnight black", "burgundy", "chocolate brown"], materials: ["smooth calfskin", "leather sole"], styleTags: ["derby", "smart shoe", "dress shoe"], leasePriceAud: 1800, retailPriceAud: 38000, referencePrompt: "Derby shoe, open lacing, smooth calfskin, sleek silhouette, leather sole" },
      { name: "Lamalo Knitted Tie", description: "Square-tip knitted silk tie — a subtle textural statement.", category: "accessory", subcategory: "tie", genderFit: "male", colors: ["forest green", "burgundy", "cobalt blue", "slate grey"], materials: ["knitted silk"], styleTags: ["tie", "accessory", "smart"], leasePriceAud: 500, retailPriceAud: 9000, referencePrompt: "square-tip knitted silk tie, textured weave, slim width" },
      { name: "Lamalo Silk Pocket Square", description: "Hand-rolled silk pocket square in a painterly abstract print.", category: "accessory", subcategory: "pocket square", genderFit: "male", colors: ["cobalt blue", "burgundy", "sage green", "dusty rose"], materials: ["100% silk"], styleTags: ["accessory", "pocket square", "formal detail"], leasePriceAud: 400, retailPriceAud: 6500, referencePrompt: "silk pocket square, hand-rolled edge, abstract print, folded in breast pocket" },
    ],
  };

  // ─── Collection 4: Women's Casual ───────────────────────────────────────────

  const womensCasual: SeedCollection = {
    name: "Lamalo Women's Casual",
    description: "Everyday effortless dressing for women — relaxed silhouettes, joyful colour, elevated basics.",
    collectionType: "fashion_collection",
    season: "Spring/Summer 2026",
    year: 2026,
    styleTags: ["casual", "womenswear", "relaxed", "colourful", "everyday"],
    collectionPriceAud: 4500,
    items: [
      { name: "Lamalo Midi Dress", description: "Flowy midi dress in a lightweight woven fabric with a V-neckline and adjustable tie waist.", category: "dress", subcategory: "midi dress", genderFit: "female", colors: ["dusty rose", "butter yellow", "sage green", "lavender"], materials: ["viscose crepe"], styleTags: ["midi", "summer dress", "flowy"], leasePriceAud: 1200, retailPriceAud: 16000, referencePrompt: "flowy midi dress, V-neckline, adjustable tie waist, lightweight fabric, relaxed" },
      { name: "Lamalo Wrap Dress", description: "Classic wrap silhouette in a soft printed crepe — universally flattering.", category: "dress", subcategory: "wrap dress", genderFit: "female", colors: ["terracotta", "cobalt blue", "burnt orange", "champagne"], materials: ["crepe"], styleTags: ["wrap dress", "classic", "flattering"], leasePriceAud: 1300, retailPriceAud: 17000, referencePrompt: "wrap dress, deep V-neckline, self-tie belt, flared skirt, mid-calf length" },
      { name: "Lamalo Knit Top", description: "Ribbed knit crop top with a scoop neck and short sleeves.", category: "top", subcategory: "knit", genderFit: "female", colors: ["lavender", "cream", "terracotta", "dusty rose"], materials: ["cotton rib knit"], styleTags: ["knit", "crop top", "casual"], leasePriceAud: 700, retailPriceAud: 8500, referencePrompt: "ribbed knit crop top, scoop neck, short sleeves, fitted" },
      { name: "Lamalo Wrap Top", description: "Lightweight wrap top in a silky fabric — effortlessly chic.", category: "top", subcategory: "blouse", genderFit: "female", colors: ["burnt orange", "sage green", "champagne", "cobalt blue"], materials: ["satin crepe"], styleTags: ["wrap top", "blouse", "casual chic"], leasePriceAud: 900, retailPriceAud: 11000, referencePrompt: "wrap top, deep V, self-tie, fluttering sleeves, silky finish" },
      { name: "Lamalo Linen Shirt (Women's)", description: "Oversized linen shirt in a relaxed boyfriend cut — perfect as a cover-up or tucked in.", category: "top", subcategory: "shirt", genderFit: "female", colors: ["off-white", "sage green", "terracotta", "dusty rose"], materials: ["linen"], styleTags: ["linen", "relaxed", "versatile"], leasePriceAud: 900, retailPriceAud: 11000, referencePrompt: "oversized boyfriend linen shirt, relaxed fit, rolled sleeves, relaxed collar" },
      { name: "Lamalo Wide-Leg Jean", description: "High-waist wide-leg jean in a rigid denim — retro-inspired silhouette.", category: "bottom", subcategory: "denim", genderFit: "female", colors: ["off-white", "indigo", "chocolate brown"], materials: ["rigid denim"], styleTags: ["wide-leg", "retro", "denim"], leasePriceAud: 1400, retailPriceAud: 17000, referencePrompt: "high-waist wide-leg jean, rigid denim, five-pocket, retro silhouette" },
      { name: "Lamalo Mini Skirt", description: "A-line mini skirt in a structured cotton poplin.", category: "bottom", subcategory: "skirt", genderFit: "female", colors: ["butter yellow", "terracotta", "lavender", "cobalt blue"], materials: ["cotton poplin"], styleTags: ["mini skirt", "A-line", "playful"], leasePriceAud: 800, retailPriceAud: 9000, referencePrompt: "A-line mini skirt, structured poplin, above-knee length" },
      { name: "Lamalo Midi Skirt", description: "Bias-cut satin midi skirt with a subtle slip silhouette.", category: "bottom", subcategory: "skirt", genderFit: "female", colors: ["sage green", "dusty rose", "burnt orange", "chocolate brown"], materials: ["satin"], styleTags: ["midi skirt", "satin", "slip-style"], leasePriceAud: 1000, retailPriceAud: 13000, referencePrompt: "bias-cut satin midi skirt, slip silhouette, mid-calf, subtle sheen" },
      { name: "Lamalo Crop Blazer", description: "Boxy crop blazer in a textured boucle — adds instant polish to any look.", category: "outerwear", subcategory: "blazer", genderFit: "female", colors: ["chocolate brown", "off-white", "dusty rose", "midnight black"], materials: ["boucle wool blend"], styleTags: ["blazer", "boucle", "cropped"], leasePriceAud: 1500, retailPriceAud: 20000, referencePrompt: "boxy crop blazer, boucle texture, single button, cropped length" },
      { name: "Lamalo Denim Jacket", description: "Oversized denim jacket with raw edges and contrast stitching.", category: "outerwear", subcategory: "jacket", genderFit: "female", colors: ["indigo", "off-white"], materials: ["denim"], styleTags: ["denim", "oversized", "casual layer"], leasePriceAud: 1200, retailPriceAud: 15000, referencePrompt: "oversized denim jacket, raw edge detail, contrast stitching, casual fit" },
      { name: "Lamalo Block Heel Mule", description: "Pointed-toe mule on a stable block heel — chic and comfortable.", category: "shoes", subcategory: "mule", genderFit: "female", colors: ["terracotta", "off-white", "midnight black", "camel"], materials: ["smooth leather"], styleTags: ["mule", "block heel", "chic"], leasePriceAud: 1200, retailPriceAud: 18000, referencePrompt: "pointed-toe mule, block heel, backless, smooth leather upper" },
      { name: "Lamalo Strappy Sandal", description: "Barely-there strappy flat sandal with a thin leather sole.", category: "shoes", subcategory: "sandal", genderFit: "female", colors: ["champagne", "cobalt blue", "burnt orange", "midnight black"], materials: ["leather straps", "leather sole"], styleTags: ["sandal", "strappy", "summer"], leasePriceAud: 800, retailPriceAud: 11000, referencePrompt: "strappy flat sandal, thin leather straps, minimal silhouette, ankle wrap" },
    ],
  };

  // ─── Collection 5: Women's Sport ────────────────────────────────────────────

  const womensSport: SeedCollection = {
    name: "Lamalo Women's Sport",
    description: "Performance activewear for women — form-flattering silhouettes, high-stretch fabrics, made to move.",
    collectionType: "fashion_collection",
    season: "Spring/Summer 2026",
    year: 2026,
    styleTags: ["sport", "activewear", "performance", "athleisure", "womenswear"],
    collectionPriceAud: 4000,
    items: [
      { name: "Lamalo Sport Bra Top", description: "Medium-support sport bra with a scoop neck and racerback design.", category: "top", subcategory: "sport bra", genderFit: "female", colors: ["forest green", "slate grey", "dusty rose", "cobalt blue"], materials: ["nylon", "elastane"], styleTags: ["sport bra", "activewear", "medium support"], leasePriceAud: 700, retailPriceAud: 7500, referencePrompt: "medium-support sport bra, scoop neck, racerback, smooth stretch fabric" },
      { name: "Lamalo Sport Crop Tee", description: "Cropped sport tee with a dropped shoulder and raw hem.", category: "top", subcategory: "t-shirt", genderFit: "female", colors: ["lavender", "sage green", "midnight black", "burnt orange"], materials: ["cotton modal blend"], styleTags: ["sport crop", "athleisure", "casual active"], leasePriceAud: 700, retailPriceAud: 7000, referencePrompt: "cropped sport tee, dropped shoulder, raw hem, relaxed athletic fit" },
      { name: "Lamalo High-Waist Legging", description: "High-waist compression legging in a four-way stretch fabric.", category: "bottom", subcategory: "legging", genderFit: "female", colors: ["forest green", "slate grey", "dusty rose", "midnight black"], materials: ["nylon", "elastane"], styleTags: ["legging", "high-waist", "compression"], leasePriceAud: 1000, retailPriceAud: 12000, referencePrompt: "high-waist legging, compression fit, four-way stretch, seamless construction" },
      { name: "Lamalo Biker Short", description: "8-inch inseam biker short with a wide waistband and hidden pocket.", category: "bottom", subcategory: "short", genderFit: "female", colors: ["midnight black", "forest green", "dusty rose"], materials: ["nylon", "elastane"], styleTags: ["biker short", "activewear", "versatile"], leasePriceAud: 700, retailPriceAud: 8000, referencePrompt: "biker short, 8-inch inseam, wide waistband, hidden waistband pocket" },
      { name: "Lamalo Sport Windbreaker", description: "Packable windbreaker in a lightweight shell with a half-zip and adjustable hem.", category: "outerwear", subcategory: "jacket", genderFit: "female", colors: ["burnt orange", "cobalt blue", "sage green"], materials: ["nylon shell"], styleTags: ["windbreaker", "packable", "sporty"], leasePriceAud: 1200, retailPriceAud: 14000, referencePrompt: "packable windbreaker, half-zip, adjustable hem, lightweight shell" },
      { name: "Lamalo Sport Hoodie", description: "Fitted sport hoodie in a brushed fleece with a zip hand pocket.", category: "outerwear", subcategory: "hoodie", genderFit: "female", colors: ["lavender", "midnight black", "forest green"], materials: ["brushed fleece"], styleTags: ["sport hoodie", "fitted", "warm layer"], leasePriceAud: 1100, retailPriceAud: 13000, referencePrompt: "fitted sport hoodie, brushed fleece, zip hand pocket, athletic silhouette" },
      { name: "Lamalo Sport Skirt", description: "Tennis-style pleated sport skirt with built-in biker shorts.", category: "bottom", subcategory: "skirt", genderFit: "female", colors: ["dusty rose", "forest green", "slate grey"], materials: ["stretch woven", "nylon lining"], styleTags: ["sport skirt", "tennis", "athleisure"], leasePriceAud: 900, retailPriceAud: 10000, referencePrompt: "pleated tennis skirt, built-in shorts, stretch waistband, mid-thigh length" },
      { name: "Lamalo Running Tee (Women's)", description: "Lightweight crew-neck running tee with ventilation side panels.", category: "top", subcategory: "t-shirt", genderFit: "female", colors: ["cobalt blue", "sage green", "lavender", "burnt orange"], materials: ["performance mesh blend"], styleTags: ["running", "breathable", "sport"], leasePriceAud: 700, retailPriceAud: 7500, referencePrompt: "lightweight running tee, ventilation side panels, crew neck, athletic fit" },
      { name: "Lamalo Sport Trainer (Women's)", description: "Cushioned women's trainer with a knit upper and platform foam sole.", category: "shoes", subcategory: "trainer", genderFit: "female", colors: ["off-white rose", "midnight black", "forest green"], materials: ["knit upper", "foam sole", "rubber outsole"], styleTags: ["trainer", "sport shoe", "cushioned"], leasePriceAud: 1400, retailPriceAud: 19000, referencePrompt: "women's sport trainer, knit upper, platform foam midsole, cushioned" },
      { name: "Lamalo Sport Slide (Women's)", description: "Recovery slide with a contoured footbed and wide adjustable strap.", category: "shoes", subcategory: "slide", genderFit: "female", colors: ["dusty rose", "midnight black", "sage green"], materials: ["EVA foam", "soft rubber strap"], styleTags: ["sport slide", "recovery", "comfortable"], leasePriceAud: 500, retailPriceAud: 5500, referencePrompt: "women's sport slide, wide single strap, contoured EVA footbed, minimal" },
    ],
  };

  // ─── Collection 6: Women's Elegant ──────────────────────────────────────────

  const womensElegant: SeedCollection = {
    name: "Lamalo Women's Elegant",
    description: "Elevated eveningwear and refined power dressing — for the woman who commands every room she enters.",
    collectionType: "fashion_collection",
    season: "Autumn/Winter 2026",
    year: 2026,
    styleTags: ["elegant", "evening", "formal", "womenswear", "luxury"],
    collectionPriceAud: 8000,
    items: [
      { name: "Lamalo Evening Gown", description: "Floor-length column gown in a liquid satin with a draped cowl back.", category: "dress", subcategory: "gown", genderFit: "female", colors: ["champagne", "midnight black", "dusty rose", "sage green"], materials: ["silk satin"], styleTags: ["gown", "evening", "red carpet"], leasePriceAud: 4000, retailPriceAud: 180000, referencePrompt: "floor-length column gown, liquid satin, cowl draped back, sleeveless" },
      { name: "Lamalo Cocktail Dress", description: "Structured mini dress with a sweetheart neckline and flared skirt.", category: "dress", subcategory: "cocktail dress", genderFit: "female", colors: ["cobalt blue", "burgundy", "forest green", "dusty rose"], materials: ["duchess satin"], styleTags: ["cocktail", "mini dress", "structured"], leasePriceAud: 2500, retailPriceAud: 65000, referencePrompt: "structured mini dress, sweetheart neckline, duchess satin, flared skirt" },
      { name: "Lamalo Asymmetric Dress", description: "One-shoulder midi dress with a handkerchief hem — dramatic and modern.", category: "dress", subcategory: "midi dress", genderFit: "female", colors: ["burnt orange", "lavender", "champagne"], materials: ["georgette"], styleTags: ["asymmetric", "one-shoulder", "editorial"], leasePriceAud: 2800, retailPriceAud: 72000, referencePrompt: "one-shoulder midi dress, handkerchief hem, georgette fabric, floaty silhouette" },
      { name: "Lamalo Silk Blouse", description: "Relaxed-shoulder silk blouse with a fluid drape and hidden button placket.", category: "top", subcategory: "blouse", genderFit: "female", colors: ["champagne", "ivory", "dusty rose", "cobalt blue"], materials: ["100% silk"], styleTags: ["silk blouse", "luxury top", "refined"], leasePriceAud: 1400, retailPriceAud: 28000, referencePrompt: "silk blouse, relaxed shoulder, hidden button placket, fluid drape" },
      { name: "Lamalo Wide-Leg Trouser (Elegant)", description: "High-waist wide-leg trouser in a fine crêpe — the new power suit bottom.", category: "bottom", subcategory: "trouser", genderFit: "female", colors: ["midnight black", "champagne", "chocolate brown"], materials: ["fine crêpe"], styleTags: ["wide-leg", "power dressing", "elegant"], leasePriceAud: 1500, retailPriceAud: 30000, referencePrompt: "high-waist wide-leg trouser, fine crêpe, pressed front crease, floor-grazing" },
      { name: "Lamalo Power Blazer", description: "Oversized double-breasted power blazer with statement lapels.", category: "outerwear", subcategory: "blazer", genderFit: "female", colors: ["midnight black", "camel", "cobalt blue", "dusty rose"], materials: ["stretch wool blend"], styleTags: ["power blazer", "double-breasted", "boss"], leasePriceAud: 2000, retailPriceAud: 55000, referencePrompt: "double-breasted oversized blazer, wide lapels, structured shoulders, power silhouette" },
      { name: "Lamalo Tailored Skirt", description: "Pencil skirt with a back-kick pleat — understated boardroom power.", category: "bottom", subcategory: "skirt", genderFit: "female", colors: ["midnight black", "champagne", "chocolate brown", "forest green"], materials: ["fine wool blend"], styleTags: ["pencil skirt", "tailored", "formal"], leasePriceAud: 1200, retailPriceAud: 22000, referencePrompt: "pencil skirt, back-kick pleat, knee length, structured fit" },
      { name: "Lamalo Satin Slip Dress", description: "90s-inspired satin slip dress with adjustable spaghetti straps.", category: "dress", subcategory: "slip dress", genderFit: "female", colors: ["champagne", "dusty rose", "midnight black", "sage green"], materials: ["silk-touch satin"], styleTags: ["slip dress", "90s minimal", "satin"], leasePriceAud: 1800, retailPriceAud: 42000, referencePrompt: "satin slip dress, spaghetti straps, bias cut, 90s minimal, midi length" },
      { name: "Lamalo Strappy Heel", description: "Multi-strap stiletto heel in a smooth leather — the evening essential.", category: "shoes", subcategory: "heel", genderFit: "female", colors: ["champagne", "midnight black", "dusty rose", "cobalt blue"], materials: ["smooth leather"], styleTags: ["stiletto", "evening heel", "strappy"], leasePriceAud: 1800, retailPriceAud: 42000, referencePrompt: "multi-strap stiletto heel, smooth leather, 90mm heel, ankle strap" },
      { name: "Lamalo Pointed-Toe Heel", description: "Classic pointed-toe pump in a patent leather with a mid stiletto heel.", category: "shoes", subcategory: "pump", genderFit: "female", colors: ["midnight black", "burgundy", "camel", "off-white"], materials: ["patent leather"], styleTags: ["pump", "pointed toe", "classic"], leasePriceAud: 1600, retailPriceAud: 38000, referencePrompt: "pointed-toe pump, patent leather, mid stiletto heel, classic silhouette" },
      { name: "Lamalo Slingback Heel", description: "Elegant slingback kitten heel in a soft nappa leather.", category: "shoes", subcategory: "heel", genderFit: "female", colors: ["champagne", "cobalt blue", "sage green"], materials: ["nappa leather"], styleTags: ["slingback", "kitten heel", "elegant"], leasePriceAud: 1400, retailPriceAud: 32000, referencePrompt: "slingback kitten heel, nappa leather, almond toe, elegant" },
      { name: "Lamalo Evening Clutch", description: "Minaudière clutch in a metallic satin with a chain wrist strap.", category: "bag", subcategory: "clutch", genderFit: "female", colors: ["midnight black", "champagne", "dusty rose"], materials: ["metallic satin", "gold-tone hardware"], styleTags: ["clutch", "evening bag", "minaudière"], leasePriceAud: 900, retailPriceAud: 18000, referencePrompt: "minaudière clutch, metallic satin, chain wrist strap, gold hardware, evening bag" },
    ],
  };

  // ─── Collection 7: Kids' Collection ─────────────────────────────────────────

  const kids: SeedCollection = {
    name: "Lamalo Kids' Collection",
    description: "Playful, comfortable and stylish clothing for children — from casual everyday to special occasions, in colours kids love.",
    collectionType: "fashion_collection",
    season: "Spring/Summer 2026",
    year: 2026,
    styleTags: ["kids", "children", "playful", "comfortable", "colourful"],
    collectionPriceAud: 2500,
    items: [
      { name: "Lamalo Kids Graphic Tee", description: "Soft cotton crew-neck tee with a bold Lamalo graphic print.", category: "top", subcategory: "t-shirt", genderFit: "unisex", colors: ["butter yellow", "lavender", "sage green", "cobalt blue"], materials: ["100% cotton"], styleTags: ["kids casual", "graphic tee", "playful"], leasePriceAud: 400, retailPriceAud: 4500, referencePrompt: "kids crew-neck tee, bold graphic print, relaxed fit, bright colours" },
      { name: "Lamalo Kids Polo Shirt", description: "Classic kids polo in a soft piqué — smart enough for any occasion.", category: "top", subcategory: "polo", genderFit: "unisex", colors: ["cobalt blue", "forest green", "dusty rose", "off-white"], materials: ["cotton piqué"], styleTags: ["kids polo", "smart casual", "classic"], leasePriceAud: 500, retailPriceAud: 5500, referencePrompt: "kids polo shirt, piqué fabric, ribbed collar, relaxed fit" },
      { name: "Lamalo Kids Hoodie", description: "Cosy pull-over hoodie in a soft French terry with kangaroo pocket.", category: "outerwear", subcategory: "hoodie", genderFit: "unisex", colors: ["terracotta", "sage green", "chocolate brown", "cobalt blue"], materials: ["French terry cotton"], styleTags: ["kids hoodie", "cosy", "everyday"], leasePriceAud: 600, retailPriceAud: 7000, referencePrompt: "kids pullover hoodie, French terry, kangaroo pocket, drawstring hood" },
      { name: "Lamalo Kids Jogger", description: "Tapered kids jogger with a wide ribbed waistband and cuffs.", category: "bottom", subcategory: "jogger", genderFit: "unisex", colors: ["slate grey", "forest green", "cobalt blue", "lavender"], materials: ["cotton jersey"], styleTags: ["kids jogger", "comfortable", "everyday"], leasePriceAud: 500, retailPriceAud: 5500, referencePrompt: "tapered kids jogger, ribbed waistband and cuffs, relaxed fit" },
      { name: "Lamalo Kids Denim Short", description: "Classic five-pocket denim short with a frayed hem.", category: "bottom", subcategory: "short", genderFit: "unisex", colors: ["indigo", "off-white", "light wash"], materials: ["denim"], styleTags: ["kids denim", "summer", "casual"], leasePriceAud: 400, retailPriceAud: 4500, referencePrompt: "kids denim short, frayed hem, five-pocket, above-knee length" },
      { name: "Lamalo Kids Party Dress", description: "Tulle-skirt party dress with a fitted bodice and ribbon waistband.", category: "dress", subcategory: "party dress", genderFit: "female", colors: ["dusty rose", "lavender", "off-white", "butter yellow"], materials: ["cotton bodice", "tulle skirt"], styleTags: ["party dress", "occasion", "princess"], leasePriceAud: 800, retailPriceAud: 9500, referencePrompt: "kids party dress, fitted bodice, tulle skirt, ribbon waistband, knee length" },
      { name: "Lamalo Kids Sun Dress", description: "Lightweight printed sun dress with adjustable straps.", category: "dress", subcategory: "sun dress", genderFit: "female", colors: ["butter yellow", "dusty rose", "sage green"], materials: ["cotton lawn"], styleTags: ["sun dress", "summer", "light"], leasePriceAud: 500, retailPriceAud: 6000, referencePrompt: "kids sun dress, adjustable shoulder straps, floral-adjacent print, knee length" },
      { name: "Lamalo Kids Mini Suit Jacket", description: "Kids single-breasted suit jacket — perfect for formal occasions.", category: "suit", subcategory: "blazer", genderFit: "male", colors: ["midnight navy", "charcoal"], materials: ["wool blend"], styleTags: ["kids formal", "suit jacket", "occasion"], leasePriceAud: 900, retailPriceAud: 11000, referencePrompt: "kids single-breasted suit jacket, notch lapel, two buttons, formal" },
      { name: "Lamalo Kids Mini Suit Trouser", description: "Matching flat-front suit trouser for the Kids Mini Suit Jacket.", category: "suit", subcategory: "trouser", genderFit: "male", colors: ["midnight navy", "charcoal"], materials: ["wool blend"], styleTags: ["kids formal", "suit trouser", "matching"], leasePriceAud: 600, retailPriceAud: 7000, referencePrompt: "kids flat-front suit trouser, slim leg, matching suit fabric" },
      { name: "Lamalo Kids Sneaker", description: "Versatile kids sneaker in a canvas-and-rubber build.", category: "shoes", subcategory: "sneaker", genderFit: "unisex", colors: ["off-white", "cobalt blue", "forest green", "lavender"], materials: ["canvas", "rubber sole"], styleTags: ["kids sneaker", "everyday", "comfortable"], leasePriceAud: 500, retailPriceAud: 6000, referencePrompt: "kids canvas sneaker, clean silhouette, rubber sole, velcro or lace option" },
      { name: "Lamalo Kids Mary Jane", description: "Patent Mary Jane with a single bar strap — a classic for occasions.", category: "shoes", subcategory: "mary jane", genderFit: "female", colors: ["midnight black", "dusty rose", "off-white"], materials: ["patent leather"], styleTags: ["mary jane", "occasion shoe", "classic"], leasePriceAud: 600, retailPriceAud: 7500, referencePrompt: "kids patent Mary Jane, single bar strap, round toe, flat heel" },
      { name: "Lamalo Kids Sport Shoe", description: "Lightweight kids sport shoe with velcro fastening for easy on-off.", category: "shoes", subcategory: "trainer", genderFit: "unisex", colors: ["cobalt blue", "forest green", "burnt orange"], materials: ["mesh upper", "foam sole"], styleTags: ["sport shoe", "kids trainer", "active"], leasePriceAud: 500, retailPriceAud: 6000, referencePrompt: "kids sport trainer, velcro fastening, mesh upper, lightweight foam sole" },
    ],
  };

  // ─── Collection 8: Watches & Jewellery ──────────────────────────────────────

  const watchesAndJewellery: SeedCollection = {
    name: "Lamalo Watches & Jewellery",
    description: "Investment-worthy accessories for every look — from statement watches to layerable fine jewellery.",
    collectionType: "accessories",
    season: "Year-Round 2026",
    year: 2026,
    styleTags: ["accessories", "jewellery", "watches", "luxury", "investment pieces"],
    collectionPriceAud: 5000,
    items: [
      { name: "Lamalo Gold Watch", description: "36mm case gold-tone dress watch on a smooth leather strap.", category: "accessory", subcategory: "watch", genderFit: "unisex", colors: ["champagne gold"], materials: ["stainless steel case", "leather strap", "mineral glass"], styleTags: ["watch", "dress watch", "gold"], leasePriceAud: 1800, retailPriceAud: 60000, referencePrompt: "36mm gold-tone dress watch, champagne dial, leather strap, minimal indices" },
      { name: "Lamalo Rose Gold Watch", description: "34mm rose gold case watch with a mother-of-pearl dial.", category: "accessory", subcategory: "watch", genderFit: "unisex", colors: ["rose gold"], materials: ["stainless steel case", "leather strap", "sapphire crystal"], styleTags: ["watch", "rose gold", "elegant"], leasePriceAud: 1800, retailPriceAud: 68000, referencePrompt: "34mm rose gold case, mother-of-pearl dial, blush leather strap, dainty" },
      { name: "Lamalo Silver Watch", description: "40mm stainless steel sports-dress hybrid on a metal bracelet.", category: "accessory", subcategory: "watch", genderFit: "unisex", colors: ["silver"], materials: ["stainless steel case and bracelet", "sapphire glass"], styleTags: ["watch", "silver", "sport-dress"], leasePriceAud: 1500, retailPriceAud: 55000, referencePrompt: "40mm stainless steel watch, silver dial, integrated metal bracelet, clean case" },
      { name: "Lamalo Gunmetal Watch", description: "42mm DLC-coated gunmetal watch on a rubber strap — bold and modern.", category: "accessory", subcategory: "watch", genderFit: "unisex", colors: ["gunmetal"], materials: ["DLC-coated steel", "rubber strap"], styleTags: ["watch", "gunmetal", "bold"], leasePriceAud: 1500, retailPriceAud: 55000, referencePrompt: "42mm gunmetal DLC watch, matte black dial, rubber strap, contemporary sports" },
      { name: "Lamalo Chain Necklace", description: "Chunky paperclip chain necklace in a polished finish — a wardrobe staple.", category: "jewellery", subcategory: "necklace", genderFit: "unisex", colors: ["gold", "silver"], materials: ["gold-plate over brass", "sterling silver option"], styleTags: ["chain necklace", "staple", "chunky"], leasePriceAud: 700, retailPriceAud: 12000, referencePrompt: "chunky paperclip chain necklace, polished finish, 45cm length" },
      { name: "Lamalo Pendant Necklace", description: "Dainty pendant necklace with a teardrop stone set in a fine chain.", category: "jewellery", subcategory: "necklace", genderFit: "female", colors: ["gold", "rose gold", "silver"], materials: ["gold-plate", "semi-precious stone"], styleTags: ["pendant necklace", "dainty", "fine jewellery feel"], leasePriceAud: 600, retailPriceAud: 10000, referencePrompt: "dainty pendant necklace, teardrop stone, fine chain, subtle sparkle" },
      { name: "Lamalo Statement Earrings", description: "Sculptural geometric drop earrings for maximum impact.", category: "jewellery", subcategory: "earrings", genderFit: "female", colors: ["gold", "oxidised silver", "rose gold"], materials: ["brass", "gold-plate"], styleTags: ["statement earrings", "geometric", "bold"], leasePriceAud: 600, retailPriceAud: 9500, referencePrompt: "sculptural geometric drop earrings, gold-tone, architectural shape, statement" },
      { name: "Lamalo Hoop Earrings", description: "Classic medium hoop earrings — the forever accessory.", category: "jewellery", subcategory: "earrings", genderFit: "female", colors: ["gold", "silver", "rose gold"], materials: ["gold-plate over brass", "sterling silver option"], styleTags: ["hoops", "classic", "everyday jewellery"], leasePriceAud: 500, retailPriceAud: 8000, referencePrompt: "medium hoop earrings, polished finish, 40mm diameter, classic" },
      { name: "Lamalo Signet Ring", description: "Flat-face signet ring in a polished satin finish — modern and wearable.", category: "jewellery", subcategory: "ring", genderFit: "unisex", colors: ["gold", "silver", "gunmetal"], materials: ["sterling silver", "gold-plate option"], styleTags: ["signet ring", "unisex", "statement"], leasePriceAud: 500, retailPriceAud: 8500, referencePrompt: "flat-face signet ring, satin polish, oval face, substantial weight" },
      { name: "Lamalo Stacking Ring Set", description: "Set of three fine-band stacking rings — mix, match and layer.", category: "jewellery", subcategory: "ring", genderFit: "female", colors: ["gold", "silver", "mixed metals"], materials: ["gold-plate", "sterling silver"], styleTags: ["stacking rings", "layering", "fine jewellery"], leasePriceAud: 600, retailPriceAud: 9000, referencePrompt: "three-piece stacking ring set, fine bands, minimal, mix of metals" },
      { name: "Lamalo Layered Bracelet", description: "Set of three layered bracelets — a chain, a bangle and a cord.", category: "jewellery", subcategory: "bracelet", genderFit: "unisex", colors: ["gold", "silver", "mixed metals"], materials: ["gold-plate", "sterling silver", "waxed cord"], styleTags: ["bracelet set", "layered", "casual jewellery"], leasePriceAud: 600, retailPriceAud: 10000, referencePrompt: "layered bracelet set, chain plus bangle plus cord, mixed textures" },
      { name: "Lamalo Cuff Bracelet", description: "Open cuff bracelet in a hammered finish — one size, effortless.", category: "jewellery", subcategory: "bracelet", genderFit: "unisex", colors: ["gold", "silver", "gunmetal"], materials: ["brass", "gold-plate"], styleTags: ["cuff", "statement bracelet", "minimal"], leasePriceAud: 600, retailPriceAud: 9500, referencePrompt: "open cuff bracelet, hammered texture finish, medium width, unisex" },
      { name: "Lamalo Pearl Necklace", description: "16-inch freshwater pearl necklace with a gold-tone barrel clasp.", category: "jewellery", subcategory: "necklace", genderFit: "female", colors: ["cream pearl gold", "cream pearl silver"], materials: ["freshwater pearl", "gold-tone clasp"], styleTags: ["pearl", "classic", "timeless"], leasePriceAud: 900, retailPriceAud: 18000, referencePrompt: "16-inch freshwater pearl necklace, uniform pearls, gold barrel clasp, classic" },
      { name: "Lamalo Tennis Bracelet", description: "Alternating crystal tennis bracelet in a prong-set design.", category: "jewellery", subcategory: "bracelet", genderFit: "female", colors: ["gold diamond", "silver crystal"], materials: ["gold-plate", "cubic zirconia"], styleTags: ["tennis bracelet", "sparkle", "evening"], leasePriceAud: 900, retailPriceAud: 18000, referencePrompt: "tennis bracelet, prong-set cubic zirconia, box clasp, delicate sparkle" },
    ],
  };

  // ─── Collection 9: Hats, Eyewear & Footwear ─────────────────────────────────

  const hatsEyewearFootwear: SeedCollection = {
    name: "Lamalo Hats, Eyewear & Footwear",
    description: "The finishing touches — curated headwear, statement sunglasses and everyday footwear to complete any look.",
    collectionType: "accessories",
    season: "Year-Round 2026",
    year: 2026,
    styleTags: ["hats", "sunglasses", "footwear", "accessories", "finishing touches"],
    collectionPriceAud: 4000,
    items: [
      { name: "Lamalo Bucket Hat", description: "Relaxed cotton bucket hat with a mid brim — the season's most-worn headwear.", category: "hat", subcategory: "bucket hat", genderFit: "unisex", colors: ["sage green", "terracotta", "off-white", "chocolate brown"], materials: ["cotton canvas"], styleTags: ["bucket hat", "casual", "summer"], leasePriceAud: 700, retailPriceAud: 7500, referencePrompt: "cotton bucket hat, mid brim, relaxed fit, unstructured crown" },
      { name: "Lamalo Wide-Brim Hat", description: "Packable wide-brim sun hat in a fine paper straw.", category: "hat", subcategory: "sun hat", genderFit: "unisex", colors: ["champagne", "natural straw", "chocolate brown"], materials: ["paper straw"], styleTags: ["sun hat", "wide-brim", "beach"], leasePriceAud: 800, retailPriceAud: 9500, referencePrompt: "wide-brim sun hat, paper straw weave, ribbon band, packable" },
      { name: "Lamalo Baseball Cap", description: "Six-panel structured baseball cap with a tonal embroidered Lamalo logo.", category: "hat", subcategory: "cap", genderFit: "unisex", colors: ["midnight black", "cobalt blue", "off-white", "forest green"], materials: ["cotton twill"], styleTags: ["baseball cap", "sporty", "everyday"], leasePriceAud: 700, retailPriceAud: 7500, referencePrompt: "structured six-panel baseball cap, tonal embroidered logo, adjustable strap" },
      { name: "Lamalo Beanie", description: "Ribbed-knit beanie with a cuffed brim — a cold-season essential.", category: "hat", subcategory: "beanie", genderFit: "unisex", colors: ["forest green", "slate grey", "burnt orange", "lavender"], materials: ["merino wool blend"], styleTags: ["beanie", "winter", "cosy"], leasePriceAud: 600, retailPriceAud: 6500, referencePrompt: "ribbed-knit cuffed beanie, merino wool, close fit, no pom" },
      { name: "Lamalo Beret", description: "Classic French beret in a wool-felt — effortlessly Parisian.", category: "hat", subcategory: "beret", genderFit: "female", colors: ["dusty rose", "chocolate brown", "midnight black", "sage green"], materials: ["wool felt"], styleTags: ["beret", "French", "elegant"], leasePriceAud: 700, retailPriceAud: 8000, referencePrompt: "wool-felt French beret, soft drape, short stem, Parisian" },
      { name: "Lamalo Fedora", description: "Pinched-crown felt fedora with a grosgrain band.", category: "hat", subcategory: "fedora", genderFit: "unisex", colors: ["camel", "midnight black", "chocolate brown"], materials: ["wool felt"], styleTags: ["fedora", "smart hat", "classic"], leasePriceAud: 900, retailPriceAud: 12000, referencePrompt: "felt fedora, pinched crown, medium brim, grosgrain band, side feather optional" },
      { name: "Lamalo Oversized Sunglasses", description: "Square oversized frame sunglasses with UV400 lenses.", category: "accessory", subcategory: "sunglasses", genderFit: "unisex", colors: ["tortoise", "midnight black", "champagne"], materials: ["acetate frame", "UV400 lens"], styleTags: ["oversized sunglasses", "retro", "statement eyewear"], leasePriceAud: 900, retailPriceAud: 14000, referencePrompt: "oversized square sunglasses, thick acetate frame, solid tinted lens, retro glam" },
      { name: "Lamalo Aviator Sunglasses", description: "Teardrop aviator in a lightweight metal frame with gradient lenses.", category: "accessory", subcategory: "sunglasses", genderFit: "unisex", colors: ["gold frame", "silver frame", "gunmetal"], materials: ["metal frame", "polarised glass lens"], styleTags: ["aviator", "classic sunglasses", "polarised"], leasePriceAud: 900, retailPriceAud: 14000, referencePrompt: "teardrop aviator sunglasses, thin metal frame, gradient polarised lens" },
      { name: "Lamalo Cat-Eye Sunglasses", description: "Retro cat-eye frame in a thick acetate with a bold upswept corner.", category: "accessory", subcategory: "sunglasses", genderFit: "female", colors: ["tortoise", "midnight black", "dusty rose frame"], materials: ["acetate frame", "UV400 lens"], styleTags: ["cat-eye", "retro", "feminine eyewear"], leasePriceAud: 900, retailPriceAud: 14000, referencePrompt: "cat-eye sunglasses, thick acetate frame, upswept corners, retro feminine" },
      { name: "Lamalo Round Sunglasses", description: "Small round frame sunglasses for a vintage intellectual look.", category: "accessory", subcategory: "sunglasses", genderFit: "unisex", colors: ["gold frame", "silver frame", "midnight black"], materials: ["metal frame", "UV400 lens"], styleTags: ["round sunglasses", "vintage", "intellectual"], leasePriceAud: 800, retailPriceAud: 12000, referencePrompt: "small round sunglasses, fine metal frame, solid tinted lens, vintage" },
      { name: "Lamalo Sport Sunglasses", description: "Wrap-around sport sunglasses with polarised lenses and a rubber nose bridge.", category: "accessory", subcategory: "sunglasses", genderFit: "unisex", colors: ["midnight black", "cobalt blue", "forest green"], materials: ["TR90 frame", "polarised lens", "rubber grip"], styleTags: ["sport sunglasses", "polarised", "active"], leasePriceAud: 800, retailPriceAud: 11000, referencePrompt: "wrap-around sport sunglasses, polarised lens, rubber grip, TR90 frame" },
      { name: "Lamalo Chelsea Boot", description: "Sleek pull-on Chelsea boot in a smooth full-grain leather.", category: "shoes", subcategory: "boot", genderFit: "unisex", colors: ["midnight black", "chocolate brown", "camel"], materials: ["full-grain leather", "leather sole"], styleTags: ["chelsea boot", "classic", "smart casual"], leasePriceAud: 1800, retailPriceAud: 40000, referencePrompt: "Chelsea boot, elastic side panel, pull tab, smooth leather, almond toe" },
      { name: "Lamalo White Sneaker", description: "Clean minimalist leather low-top sneaker — the wardrobe backbone.", category: "shoes", subcategory: "sneaker", genderFit: "unisex", colors: ["off-white", "triple white", "off-white black"], materials: ["smooth leather", "rubber sole"], styleTags: ["white sneaker", "minimal", "versatile"], leasePriceAud: 1200, retailPriceAud: 18000, referencePrompt: "minimalist leather low-top sneaker, clean white sole, tonal laces, slim silhouette" },
      { name: "Lamalo Platform Boot", description: "Lace-up platform ankle boot in a smooth leather with a chunky lug sole.", category: "shoes", subcategory: "boot", genderFit: "female", colors: ["midnight black", "chocolate brown", "off-white"], materials: ["smooth leather", "rubber lug sole"], styleTags: ["platform boot", "statement footwear", "grunge chic"], leasePriceAud: 1600, retailPriceAud: 35000, referencePrompt: "lace-up platform ankle boot, chunky lug sole, smooth leather, statement" },
    ],
  };

  // ─── All collections ─────────────────────────────────────────────────────────

  const ALL_COLLECTIONS: SeedCollection[] = [
    mensCasual,
    mensSport,
    mensElegant,
    womensCasual,
    womensSport,
    womensElegant,
    kids,
    watchesAndJewellery,
    hatsEyewearFootwear,
  ];

  // ─── Seed runner ─────────────────────────────────────────────────────────────

  export async function runLamaloSeed(userId: number): Promise<{ created: boolean; collections: number; items: number }> {
    const db = await getDb();

    // Idempotency check
    const existing = await db
      .select({ id: designerProfiles.id })
      .from(designerProfiles)
      .where(eq(designerProfiles.brandName, "Lamalo Fashion"))
      .limit(1);

    if (existing.length > 0) {
      log.info("Lamalo Fashion already seeded — skipping");
      return { created: false, collections: 0, items: 0 };
    }

    // Insert designer profile
    const [profile] = await db
      .insert(designerProfiles)
      .values({
        userId,
        brandName: "Lamalo Fashion",
        displayName: "Lamalo",
        profileType: "brand",
        bio: "Lamalo Fashion is the Virelle Studios in-house label — contemporary, accessible, and production-ready. " +
             "Nine curated collections spanning menswear, womenswear, kids, and accessories, built to dress any character " +
             "in any scene. Lease individual pieces or entire collections at some of the most competitive prices on the marketplace.",
        website: "https://virelle.life/wardrobe-marketplace",
        instagram: "@lamalofashion",
        contactEmail: "wardrobe@virelle.life",
        logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png",
        verified: true,
        visibility: "public",
        stripeAccountId: null,
        stripeAccountStatus: "none",
        membershipStatus: "active",
        membershipSubscriptionId: null,
        membershipCurrentPeriodEnd: new Date("2099-12-31"),
      });

    // @ts-ignore — Drizzle MySQL insertId
    const designerProfileId: number = (profile as any).insertId ?? 1;

    let totalItems = 0;

    for (const col of ALL_COLLECTIONS) {
      // Insert collection
      const [colResult] = await db
        .insert(designerCollections)
        .values({
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
          licenseNotes: "Leased for use in Virelle Studios film productions. Platform retains 100% revenue.",
          collectionPriceAud: col.collectionPriceAud,
          published: true,
          publishedAt: new Date(),
        });

      // @ts-ignore
      const collectionId: number = (colResult as any).insertId;

      // Insert items
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
          sizeRange: "XS–XXL (kids: 2–14)",
          era: "Contemporary 2026",
          colors: item.colors,
          materials: item.materials,
          styleTags: item.styleTags,
          referencePrompt: item.referencePrompt,
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

      log.info("Lamalo collection seeded");
    }

    log.info("Lamalo Fashion seed complete");
    return { created: true, collections: ALL_COLLECTIONS.length, items: totalItems };
  }
  