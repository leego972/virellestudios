import { safeJsonExtract } from "./safeParse";
import { invokeLLM } from "./llm";
import { generateImage } from "./imageGeneration";
import { generateVideo as byokGenerateVideo } from "./byokVideoEngine";
import type { UserApiKeys } from "./byokVideoEngine";
import { storagePut } from "../storage";

import { logger } from "./logger";
import {
  postToLinkedIn,
  postToFilmSubreddits,
  broadcastWhatsApp,
  getSocialCredentialStatus,
  type PostResult,
} from "./socialPostingEngine";

// ============================================================
// ADVERTISING ENGINE - Automated free platform advertising
// ============================================================

// Platform definitions with their APIs and posting strategies
export interface AdPlatform {
  id: string;
  name: string;
  type: "social" | "forum" | "directory" | "community" | "marketplace";
  category: "film" | "art" | "tech" | "general";
  url: string;
  description: string;
  audienceType: string;
  postingStrategy: string;
  requiresAuth: boolean;
  authType?: "api_key" | "oauth" | "manual";
  maxPostLength?: number;
  supportsImages: boolean;
  supportsLinks: boolean;
  bestTimeToPost: string;
  cooldownHours: number; // minimum hours between posts
}

export const AD_PLATFORMS: AdPlatform[] = [
  // Film & Filmmaking Communities
  {
    id: "reddit_filmmakers",
    name: "Reddit r/Filmmakers",
    type: "forum",
    category: "film",
    url: "https://reddit.com/r/Filmmakers",
    description: "500K+ filmmakers discussing tools, techniques, and projects",
    audienceType: "Professional and aspiring filmmakers",
    postingStrategy: "Share as a tool showcase with behind-the-scenes of how AI generates films. Avoid hard selling.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 40000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "10:00-14:00 EST",
    cooldownHours: 168, // once per week
  },
  {
    id: "reddit_filmmaking",
    name: "Reddit r/filmmaking",
    type: "forum",
    category: "film",
    url: "https://reddit.com/r/filmmaking",
    description: "400K+ filmmaking enthusiasts",
    audienceType: "Indie filmmakers and students",
    postingStrategy: "Position as a free tool for pre-production and storyboarding. Share value first.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 40000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "10:00-14:00 EST",
    cooldownHours: 168,
  },
  {
    id: "reddit_indiefilm",
    name: "Reddit r/indiefilm",
    type: "forum",
    category: "film",
    url: "https://reddit.com/r/indiefilm",
    description: "Indie film community",
    audienceType: "Independent filmmakers",
    postingStrategy: "Focus on how it helps indie filmmakers with limited budgets visualize their stories.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 40000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "10:00-14:00 EST",
    cooldownHours: 168,
  },
  {
    id: "reddit_screenwriting",
    name: "Reddit r/Screenwriting",
    type: "forum",
    category: "film",
    url: "https://reddit.com/r/Screenwriting",
    description: "1M+ screenwriters",
    audienceType: "Screenwriters who want to visualize their scripts",
    postingStrategy: "Emphasize the script-to-visual pipeline. Show how writers can see their stories come alive.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 40000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "10:00-14:00 EST",
    cooldownHours: 168,
  },
  // Art Communities
  {
    id: "reddit_digitalart",
    name: "Reddit r/DigitalArt",
    type: "forum",
    category: "art",
    url: "https://reddit.com/r/DigitalArt",
    description: "Digital art community",
    audienceType: "Digital artists interested in AI-assisted creation",
    postingStrategy: "Showcase the visual output quality. Share AI-generated film stills as art pieces.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 40000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "12:00-16:00 EST",
    cooldownHours: 168,
  },
  // Tech/Startup Communities
  {
    id: "reddit_sideproject",
    name: "Reddit r/SideProject",
    type: "forum",
    category: "tech",
    url: "https://reddit.com/r/SideProject",
    description: "Showcase side projects",
    audienceType: "Developers and makers",
    postingStrategy: "Present as a technical achievement. Share the tech stack and AI pipeline.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 40000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "09:00-12:00 EST",
    cooldownHours: 720, // once per month
  },
  {
    id: "reddit_startups",
    name: "Reddit r/startups",
    type: "forum",
    category: "tech",
    url: "https://reddit.com/r/startups",
    description: "Startup community",
    audienceType: "Entrepreneurs and startup founders",
    postingStrategy: "Share the business model and growth story. Focus on the market opportunity.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 40000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "09:00-12:00 EST",
    cooldownHours: 720,
  },
  // Film Directories & Platforms
  {
    id: "producthunt",
    name: "Product Hunt",
    type: "directory",
    category: "tech",
    url: "https://producthunt.com",
    description: "Product launch platform with tech-savvy audience",
    audienceType: "Early adopters, tech enthusiasts, investors",
    postingStrategy: "Launch with a compelling tagline, demo video, and maker story.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 260,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "00:01 PST",
    cooldownHours: 8760, // once per year
  },
  {
    id: "indiehackers",
    name: "Indie Hackers",
    type: "community",
    category: "tech",
    url: "https://indiehackers.com",
    description: "Community of indie makers and bootstrapped founders",
    audienceType: "Indie makers, bootstrapped founders",
    postingStrategy: "Share revenue milestones, building in public updates, and lessons learned.",
    requiresAuth: true,
    authType: "manual",
    maxPostLength: 10000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "09:00-12:00 EST",
    cooldownHours: 168,
  },
  {
    id: "hackernews",
    name: "Hacker News",
    type: "forum",
    category: "tech",
    url: "https://news.ycombinator.com",
    description: "Y Combinator's tech community",
    audienceType: "Developers, founders, tech professionals",
    postingStrategy: "Show HN post with technical depth. Focus on the AI/ML pipeline.",
    requiresAuth: true,
    authType: "manual",
    maxPostLength: 2000,
    supportsImages: false,
    supportsLinks: true,
    bestTimeToPost: "09:00-11:00 EST",
    cooldownHours: 720,
  },
  // Creative Platforms
  {
    id: "behance",
    name: "Behance",
    type: "marketplace",
    category: "art",
    url: "https://behance.net",
    description: "Adobe's creative showcase platform",
    audienceType: "Professional designers and artists",
    postingStrategy: "Create a project showcasing AI-generated film visuals as a case study.",
    requiresAuth: true,
    authType: "manual",
    maxPostLength: 50000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "10:00-14:00 EST",
    cooldownHours: 336,
  },
  {
    id: "deviantart",
    name: "DeviantArt",
    type: "community",
    category: "art",
    url: "https://deviantart.com",
    description: "Largest online art community",
    audienceType: "Artists and art enthusiasts",
    postingStrategy: "Share AI-generated film stills and concept art. Engage with the community.",
    requiresAuth: true,
    authType: "manual",
    maxPostLength: 50000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "12:00-16:00 EST",
    cooldownHours: 168,
  },
  // Film-Specific Platforms
  {
    id: "filmfreeway",
    name: "FilmFreeway",
    type: "directory",
    category: "film",
    url: "https://filmfreeway.com",
    description: "Film festival submission platform",
    audienceType: "Filmmakers submitting to festivals",
    postingStrategy: "List Virelle Studios as a production tool in the marketplace.",
    requiresAuth: true,
    authType: "manual",
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "anytime",
    cooldownHours: 2160,
  },
  {
    id: "stage32",
    name: "Stage 32",
    type: "community",
    category: "film",
    url: "https://stage32.com",
    description: "Creative community for film, TV, and theater professionals",
    audienceType: "Film industry professionals",
    postingStrategy: "Share as a production tool. Engage in discussions about AI in filmmaking.",
    requiresAuth: true,
    authType: "manual",
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "10:00-14:00 EST",
    cooldownHours: 168,
  },
  // Social Media
  {
    id: "twitter",
    name: "X (Twitter)",
    type: "social",
    category: "general",
    url: "https://x.com",
    description: "Microblogging platform",
    audienceType: "General audience, filmmakers, tech enthusiasts",
    postingStrategy: "Share short clips, behind-the-scenes, and engage with film/AI hashtags.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 280,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "09:00-12:00 EST",
    cooldownHours: 24,
  },
  {
    id: "linkedin",
    name: "LinkedIn â Film Industry",
    type: "social",
    category: "film",
    url: "https://linkedin.com",
    description: "Professional networking â targeting film production companies, studio executives, independent producers, directors, cinematographers, and entertainment industry professionals",
    audienceType: "Film production companies, studio executives, independent producers, directors, cinematographers, screenwriters, VFX supervisors, casting directors, film finance professionals, entertainment lawyers, distribution executives, post-production supervisors",
    postingStrategy: "Write thought leadership posts specifically for film industry professionals. Address their real pain points: production costs, pre-production time, pitching to studios, visualising scripts before shoot. Use industry terminology (pre-production, principal photography, post-production, above-the-line, below-the-line, P&A budget, day-out-of-days). Tag relevant industry hashtags: #FilmProduction #IndieFilm #FilmFinance #Cinematography #Screenwriting #HollywoodAI #FilmIndustry #PostProduction #VFX #FilmMaking. Mention specific use cases: pitch decks, pre-vis, animatics, table reads. Professional, authoritative tone â speak as a fellow industry professional, not a tech startup.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 3000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "08:00-10:00 EST weekdays",
    cooldownHours: 48,
  },
  {
    id: "linkedin_producers",
    name: "LinkedIn â Independent Producers",
    type: "social",
    category: "film",
    url: "https://linkedin.com",
    description: "Targeting independent film producers and production company owners",
    audienceType: "Independent film producers, production company founders, executive producers, line producers, film financiers",
    postingStrategy: "Focus on ROI and budget efficiency. Independent producers are obsessed with budget. Show how Virelle Studios eliminates pre-production costs: no location scouts, no concept artists, no storyboard artists. Quantify savings: '$50K pre-vis budget â $0 with AI'. Speak to the business case. Address the pitch process: 'Show investors a fully visualised film before spending a dollar on production.' Use hashtags: #FilmFinance #IndependentFilm #FilmProducer #FilmBudget #MovieProduction.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 3000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "07:30-09:30 EST weekdays",
    cooldownHours: 72,
  },
  {
    id: "linkedin_directors",
    name: "LinkedIn â Directors & Cinematographers",
    type: "social",
    category: "film",
    url: "https://linkedin.com",
    description: "Targeting film directors, cinematographers, and visual storytellers",
    audienceType: "Film directors, cinematographers, DPs, visual effects supervisors, production designers, art directors",
    postingStrategy: "Speak to the creative vision. Directors and DPs care about visual language, not cost. Show how Virelle Studios lets them pre-visualise every shot: exact camera angles, lens choices, lighting setups, color grades â before a single day of principal photography. Position as the ultimate pre-vis tool. Reference real cinematography concepts: Dutch angle, rack focus, golden hour, motivated lighting, color temperature. Use hashtags: #Cinematography #FilmDirector #DirectorOfPhotography #PreVis #VisualStorytelling #FilmCraft.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 3000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "09:00-11:00 EST weekdays",
    cooldownHours: 72,
  },
  {
    id: "linkedin_studios",
    name: "LinkedIn â Production Companies & Studios",
    type: "social",
    category: "film",
    url: "https://linkedin.com",
    description: "Targeting production companies, studios, and entertainment conglomerates",
    audienceType: "Production company executives, studio development executives, head of production, VP of development, content acquisition executives",
    postingStrategy: "Enterprise pitch. Studios care about content volume, speed to market, and IP development. Position Virelle Studios as an enterprise AI production tool that lets studios develop and visualise 10x more projects in the same time. Address the development slate problem: 'Most projects die in development because visualisation is too expensive. Virelle Studios eliminates that barrier.' Use case: rapid prototyping of IP before greenlight. Tone: boardroom-ready, data-driven. Use hashtags: #FilmStudio #EntertainmentIndustry #ContentProduction #IPDevelopment #FilmDevelopment.",
    requiresAuth: true,
    authType: "oauth",
    maxPostLength: 3000,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "08:00-10:00 EST weekdays",
    cooldownHours: 96,
  },
  {
    id: "facebook_groups",
    name: "Facebook Film Groups",
    type: "community",
    category: "film",
    url: "https://facebook.com/groups",
    description: "Various filmmaking and art Facebook groups",
    audienceType: "Filmmakers, artists, creative professionals",
    postingStrategy: "Share in relevant groups: Indie Filmmakers, Film Production, AI Art, etc.",
    requiresAuth: true,
    authType: "oauth",
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "10:00-14:00 EST",
    cooldownHours: 168,
  },
  {
    id: "tiktok",
    name: "TikTok",
    type: "social",
    category: "general",
    url: "https://tiktok.com",
    description: "Short-form video platform with massive reach for creative content",
    audienceType: "Gen Z & Millennials, film enthusiasts, creatives, tech-savvy users",
    postingStrategy: "Post 15-60s vertical video clips showcasing AI-generated film scenes. Use trending audio, cinematic transitions, behind-the-scenes of AI filmmaking. Hashtags: #AIFilm #IndieFilm #FilmTok #AIArt #Filmmaking",
    requiresAuth: true,
    authType: "oauth",
    supportsImages: false,
    supportsLinks: false,
    bestTimeToPost: "19:00-23:00 EST",
    cooldownHours: 12,
    maxPostLength: 2200,
  },
  {
    id: "instagram",
    name: "Instagram",
    type: "social",
    category: "general",
    url: "https://instagram.com",
    description: "Visual-first platform ideal for cinematic stills and short film clips",
    audienceType: "Filmmakers, visual artists, creative directors, film students",
    postingStrategy: "Post cinematic stills from AI-generated scenes as feed posts. Use Reels for 15-30s clips. Stories for behind-the-scenes. Hashtags: #AIFilmmaking #IndieFilm #Cinematography #AIArt #FilmProduction",
    requiresAuth: true,
    authType: "oauth",
    supportsImages: true,
    supportsLinks: false,
    bestTimeToPost: "11:00-13:00 EST",
    cooldownHours: 24,
    maxPostLength: 2200,
  },
  {
    id: "youtube",
    name: "YouTube",
    type: "social" as any,
    category: "general",
    url: "https://youtube.com",
    description: "World's largest video platform â ideal for AI film showcases and tutorials",
    audienceType: "Film students, indie filmmakers, content creators, AI enthusiasts",
    postingStrategy: "Upload AI-generated film trailers, behind-the-scenes breakdowns, tutorial videos showing the Virelle Studios workflow. Optimize titles with 'AI Film', 'AI Filmmaking', 'Indie Film'. Include virelle.life in description.",
    requiresAuth: true,
    authType: "oauth",
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "14:00-16:00 EST",
    cooldownHours: 48,
    maxPostLength: 5000,
  },
  {
    id: "discord_film",
    name: "Discord â Film Communities",
    type: "community",
    category: "film",
    url: "https://discord.com",
    description: "Active filmmaking Discord servers with engaged indie film communities",
    audienceType: "Indie filmmakers, film students, AI art enthusiasts, game devs",
    postingStrategy: "Share in #showcase or #projects channels of film/AI Discord servers. Include a short clip or still. Servers: Indie Film Hub, AI Art, Filmmaking Community, Midjourney.",
    requiresAuth: true,
    authType: "api_key" as any,
    supportsImages: true,
    supportsLinks: true,
    bestTimeToPost: "18:00-22:00 EST",
    cooldownHours: 48,
    maxPostLength: 2000,
  },

    // ── Film post-production & professional communities ─────────────────────
    {
      id: "artstation",
      name: "ArtStation",
      type: "community" as const,
      category: "art" as const,
      url: "https://artstation.com",
      description: "World's largest platform for VFX artists, concept artists, and visual storytellers — 14M+ creatives",
      audienceType: "VFX artists, concept artists, 3D artists, game designers, film production designers",
      postingStrategy: "Post AI-generated film stills and character designs as professional portfolio pieces. Frame Virelle Studios as the ultimate tool for pre-production concept art and VFX pre-vis. Show the visual quality — ArtStation users respond to stunning imagery. Include a breakdown of how each shot was generated. Engage in comments with technical details about the AI pipeline.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "10:00-16:00 EST weekdays",
      cooldownHours: 72,
      maxPostLength: 5000,
    },
    {
      id: "creative_cow",
      name: "Creative COW Forums",
      type: "forum" as const,
      category: "film" as const,
      url: "https://creativecow.net/forums",
      description: "The internet's largest post-production and filmmaking professional community — 400K+ members",
      audienceType: "Post-production professionals, editors, colorists, VFX artists, cinematographers, film producers",
      postingStrategy: "Contribute genuinely to forum threads about AI tools in post-production. Answer questions like 'How do you handle pre-vis on low budgets?' with a detailed walkthrough of Virelle Studios. Avoid hard selling — this community respects expertise. Share tutorials and workflows. Mention Virelle Studios only when directly relevant and add real value.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "09:00-17:00 EST weekdays",
      cooldownHours: 48,
      maxPostLength: 20000,
    },
    {
      id: "cinema5d",
      name: "Cinema5D Community",
      type: "community" as const,
      category: "film" as const,
      url: "https://cinema5d.com",
      description: "Professional cinematography and camera news community — cinematographers and DoPs",
      audienceType: "Directors of Photography, cinematographers, camera operators, film lighting technicians",
      postingStrategy: "Write about how Virelle Studios can be used for pre-visualisation of camera angles, lighting setups, and shot composition before principal photography. DoPs will be interested in how AI pre-vis saves time on set. Focus on technical accuracy and cinematographic language: frame rates, aspect ratios, lens choices, lighting rigs.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "09:00-12:00 EST",
      cooldownHours: 168,
      maxPostLength: 5000,
    },
    {
      id: "reddit_vfx",
      name: "Reddit r/vfx",
      type: "forum" as const,
      category: "film" as const,
      url: "https://reddit.com/r/vfx/submit",
      description: "180K+ VFX artists and visual effects professionals",
      audienceType: "VFX artists, compositors, 3D generalists, motion graphics artists, game devs",
      postingStrategy: "Share Virelle Studios' AI-generated cinematic scenes as VFX breakdowns. Show before/after, the AI pipeline, and how the visual DNA system creates consistent imagery. This community loves technical depth — explain the Runway Gen-4 integration, the prompt engineering, and the character consistency system. Frame it as a tool for VFX pre-vis and concept exploration.",
      requiresAuth: true,
      authType: "oauth" as const,
      maxPostLength: 40000,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "10:00-14:00 EST weekdays",
      cooldownHours: 168,
    },
    {
      id: "reddit_cinematography",
      name: "Reddit r/cinematography",
      type: "forum" as const,
      category: "film" as const,
      url: "https://reddit.com/r/cinematography/submit",
      description: "500K+ cinematography enthusiasts and professional DoPs",
      audienceType: "Cinematographers, DoPs, camera operators, aspiring filmmakers",
      postingStrategy: "Post AI-generated film stills with detailed notes on the cinematographic choices made: lens choice, lighting, color grade, camera angle. Position Virelle Studios as a tool for planning shots and testing visual ideas before shooting. Engage with questions about how specific looks were achieved. Use correct cinematography terminology — motivated lighting, aspect ratio, colour temperature, bokeh.",
      requiresAuth: true,
      authType: "oauth" as const,
      maxPostLength: 40000,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "10:00-14:00 EST",
      cooldownHours: 168,
    },
    {
      id: "reddit_videoediting",
      name: "Reddit r/VideoEditing",
      type: "forum" as const,
      category: "film" as const,
      url: "https://reddit.com/r/VideoEditing/submit",
      description: "230K+ video editors from professional to hobbyist",
      audienceType: "Video editors, motion designers, content creators, YouTubers",
      postingStrategy: "Share the full Virelle Studios export pipeline: how AI-generated scenes, soundtracks, and visual effects can be exported as professional-quality assets for editing. Show workflow integrations. Editors care about file formats, colour spaces, and pipeline compatibility — address these. Show how Virelle Studios generates edit-ready content.",
      requiresAuth: true,
      authType: "oauth" as const,
      maxPostLength: 40000,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "10:00-14:00 EST",
      cooldownHours: 168,
    },
    {
      id: "reddit_videography",
      name: "Reddit r/videography",
      type: "forum" as const,
      category: "film" as const,
      url: "https://reddit.com/r/videography/submit",
      description: "300K+ videographers from wedding to commercial to documentary",
      audienceType: "Videographers, content creators, wedding filmmakers, commercial directors",
      postingStrategy: "Show how Virelle Studios can be used for creative pitch decks and visual concepts for commercial clients. Videographers pitch to clients constantly — AI-generated storyboards and concept visuals are a game-changer for winning jobs. Position as the ultimate pre-pitch tool: 'Show clients what you'll create before you film a frame.'",
      requiresAuth: true,
      authType: "oauth" as const,
      maxPostLength: 40000,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "10:00-14:00 EST",
      cooldownHours: 168,
    },
    {
      id: "quora",
      name: "Quora — Film & AI Questions",
      type: "community" as const,
      category: "film" as const,
      url: "https://quora.com",
      description: "World's largest Q&A platform — 400M+ monthly visitors",
      audienceType: "General public, aspiring filmmakers, professionals researching AI tools, students",
      postingStrategy: "Answer questions like: 'How can I make a professional film without a big budget?', 'What is the best AI tool for filmmaking?', 'Can AI replace traditional film production?', 'How do I create a storyboard with AI?', 'What are the best AI tools for indie filmmakers?'. Write 500-1000 word expert answers. Mention Virelle Studios naturally as the tool you use or recommend. Include specific examples and workflows. Link to virelle.life at the end with a helpful CTA.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "anytime",
      cooldownHours: 24,
      maxPostLength: 10000,
    },
    {
      id: "productionhub",
      name: "ProductionHub",
      type: "directory" as const,
      category: "film" as const,
      url: "https://www.productionhub.com",
      description: "Film and video production directory — used by producers to find tools, crew, and services",
      audienceType: "Film producers, production companies, video production studios, brand agencies",
      postingStrategy: "Create a company listing for Virelle Studios as an AI film production tool/service provider. Include a compelling description focused on the ROI: faster pre-production, zero pre-vis costs, instant storyboarding. Add portfolio samples of AI-generated scenes. This is a high-intent directory — people here are actively looking for production solutions.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "anytime",
      cooldownHours: 720,
      maxPostLength: 3000,
    },
    {
      id: "mandy_com",
      name: "Mandy.com",
      type: "directory" as const,
      category: "film" as const,
      url: "https://www.mandy.com",
      description: "Global film, TV, and production industry job board and community — 600K+ industry professionals",
      audienceType: "Film and TV industry professionals: directors, producers, editors, cinematographers, writers",
      postingStrategy: "Create a company profile for Virelle Studios as a production tool/service. Post in the industry news/resources sections. Mandy.com is used by working professionals — focus on professional workflows, time savings, and how it integrates into real production pipelines. Mention the Industry plan ($499/month) and team collaboration features for production companies.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "anytime",
      cooldownHours: 720,
      maxPostLength: 3000,
    },
    {
      id: "shooting_people",
      name: "Shooting People",
      type: "community" as const,
      category: "film" as const,
      url: "https://shootingpeople.org",
      description: "UK-based global indie filmmaking community — 50K+ indie filmmakers, directors, writers",
      audienceType: "Independent filmmakers, screenwriters, directors, producers — primarily UK and European",
      postingStrategy: "Share Virelle Studios as a revolutionary tool for indie filmmakers working with micro-budgets. The Shooting People community is passionate about indie film — they'll respond to the democratisation angle: 'Hollywood-quality pre-production tools now available to every indie filmmaker.' Share specific workflows: how a UK indie director used Virelle Studios to storyboard their short film in 2 hours. Include before/after of production process.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "09:00-17:00 GMT",
      cooldownHours: 168,
      maxPostLength: 5000,
    },
    {
      id: "cinando",
      name: "Cinando",
      type: "directory" as const,
      category: "film" as const,
      url: "https://cinando.com",
      description: "International film market platform used at Cannes, Berlinale, AFM — buyers, sellers, distributors",
      audienceType: "Film distributors, sales agents, festival programmers, international co-producers, financiers",
      postingStrategy: "Create a company listing as an AI production tool provider. This is an international film market platform — target the co-production and development finance community. These decision-makers care about content pipeline speed and cost. Position Virelle Studios as the tool that lets international productions visualise projects for market presentations at Cannes, Berlinale, and AFM without expensive pre-vis costs.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "anytime",
      cooldownHours: 720,
      maxPostLength: 3000,
    },
    {
      id: "ein_presswire",
      name: "EIN Presswire (Free PR)",
      type: "directory" as const,
      category: "general" as const,
      url: "https://www.einpresswire.com",
      description: "Free press release distribution — syndicated to hundreds of news sites including AP, Reuters partners",
      audienceType: "Journalists, bloggers, industry press, Google News indexing",
      postingStrategy: "Submit press releases for major milestones: new feature launches, user milestones, industry partnerships, award nominations. Write in formal press release style: headline, dateline, body (inverted pyramid), boilerplate about Virelle Studios, contact information. EIN Presswire syndicates to hundreds of sites — excellent for SEO backlinks and Google News indexing. Target film industry publications.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "09:00-11:00 EST",
      cooldownHours: 336,
      maxPostLength: 5000,
    },
    {
      id: "prlog",
      name: "PRLog (Free Press Releases)",
      type: "directory" as const,
      category: "general" as const,
      url: "https://www.prlog.org",
      description: "Free press release distribution with SEO value — indexed by Google News",
      audienceType: "Journalists, industry researchers, Google News readers",
      postingStrategy: "Submit regular press releases about Virelle Studios developments. PRLog is free and provides SEO-valuable backlinks from a high-authority domain. Write professional press releases for every significant update: new AI model integrations (Runway Gen-4), new features (character consistency, EPK generator), partnership announcements. Always include a quote from the founders.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "09:00-12:00 EST",
      cooldownHours: 336,
      maxPostLength: 5000,
    },
    {
      id: "patreon",
      name: "Patreon Creator Community",
      type: "community" as const,
      category: "film" as const,
      url: "https://patreon.com",
      description: "Subscription-based creator platform — 250K+ active creators many in film and video",
      audienceType: "Creative content creators, independent filmmakers building audiences, documentary makers",
      postingStrategy: "Reach out to film and video creators on Patreon who are building audiences. Virelle Studios is the perfect tool for Patreon creators: they can use it to create high-quality content for their patrons. Pitch as a tool that helps them produce more content faster. Also consider creating a Virelle Studios Patreon page offering early access, tutorials, and behind-the-scenes AI filmmaking content.",
      requiresAuth: true,
      authType: "oauth" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "anytime",
      cooldownHours: 168,
      maxPostLength: 50000,
    },
    {
      id: "film_courage",
      name: "Film Courage Community",
      type: "community" as const,
      category: "film" as const,
      url: "https://filmcourage.com",
      description: "Indie filmmaker education platform and YouTube channel — 1M+ subscribers, active community",
      audienceType: "Aspiring filmmakers, screenwriters, indie directors, film students",
      postingStrategy: "Submit guest articles, reach out for a YouTube interview, or engage with their community. Film Courage focuses on indie filmmaker education — perfect for 'How I Made a Film With AI' type content. Write a detailed tutorial or case study on using Virelle Studios from script to final export. Their audience is passionate learners who will try tools they discover through Film Courage.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "anytime",
      cooldownHours: 336,
      maxPostLength: 10000,
    },
    {
      id: "indiefilmhustle",
      name: "Indie Film Hustle Community",
      type: "community" as const,
      category: "film" as const,
      url: "https://indiefilmhustle.com",
      description: "Major indie filmmaker podcast, community, and film school — 300K+ filmmakers",
      audienceType: "Indie filmmakers, screenwriters, directors, film school graduates launching careers",
      postingStrategy: "Submit Virelle Studios for a podcast feature or blog review. IFH is one of the most trusted indie film voices — a feature or mention here carries major credibility. Write a guest post about 'How AI is Changing Indie Film Production' with Virelle Studios as the centrepiece. The IFH audience is practical and results-oriented — show real outputs and real time/cost savings.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "anytime",
      cooldownHours: 720,
      maxPostLength: 10000,
    },
    {
      id: "dribbble",
      name: "Dribbble",
      type: "community" as const,
      category: "art" as const,
      url: "https://dribbble.com",
      description: "Design community — 12M+ designers, UI/UX, motion graphics, and brand designers",
      audienceType: "Graphic designers, UI/UX designers, motion graphics artists, brand designers, creative directors",
      postingStrategy: "Post AI-generated poster art, UI mockups for the Virelle Studios interface, and cinematic stills as design showcases. Dribbble is visual-first — the quality of Virelle's AI output will speak for itself. Tag as: AI art, film poster design, motion graphics, cinematography. This audience appreciates aesthetic quality and innovative tools. Focus on the design side of film production.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "10:00-16:00 EST",
      cooldownHours: 72,
      maxPostLength: 2000,
    },
    {
      id: "youtube_community",
      name: "YouTube Community Posts",
      type: "social" as const,
      category: "film" as const,
      url: "https://studio.youtube.com",
      description: "YouTube Community tab — direct posts to channel subscribers without a full video",
      audienceType: "Existing YouTube subscribers, filmmaking enthusiasts, AI tool early adopters",
      postingStrategy: "Use Community posts for quick updates, polls ('Which AI-generated scene is more cinematic?'), behind-the-scenes stills, and feature announcements. Community posts appear in subscribers' home feeds and are excellent for engagement between video uploads. Include images — posts with visuals get 10x more engagement. Ask questions to drive comments.",
      requiresAuth: true,
      authType: "oauth" as const,
      supportsImages: true,
      supportsLinks: false,
      bestTimeToPost: "10:00-14:00 EST",
      cooldownHours: 48,
      maxPostLength: 5000,
    },
    {
      id: "film_festival_life",
      name: "FilmFestivalLife",
      type: "directory" as const,
      category: "film" as const,
      url: "https://filmfestivallife.com",
      description: "Film festival discovery platform — 35K+ festivals, used by filmmakers to find screening opportunities",
      audienceType: "Filmmakers entering festivals, festival programmers, film sales agents",
      postingStrategy: "Create a profile for Virelle Studios as a production tool resource. The FilmFestivalLife community is filmmakers actively submitting work to festivals — perfect timing to introduce AI production tools that can help them create competition-quality films. Write about how AI production democratises access to festival-quality filmmaking.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "anytime",
      cooldownHours: 720,
      maxPostLength: 3000,
    },
    {
      id: "no_film_school_newsletter",
      name: "No Film School — Newsletter & Community",
      type: "community" as const,
      category: "film" as const,
      url: "https://nofilmschool.com",
      description: "Major indie filmmaking publication and newsletter — 2M+ readers, respected editorial voice",
      audienceType: "Indie filmmakers, film students, cinematographers, screenwriters, directors",
      postingStrategy: "Submit a product review request or press kit to their editorial team. No Film School covers AI filmmaking tools actively — pitch a story on 'How Virelle Studios is changing indie film production.' Also contribute to their community forum. Write a detailed technical breakdown suitable for their audience: practical, jargon-aware, and focused on creative results. Include high-quality AI-generated stills as examples.",
      requiresAuth: true,
      authType: "manual" as const,
      supportsImages: true,
      supportsLinks: true,
      bestTimeToPost: "anytime",
      cooldownHours: 720,
      maxPostLength: 8000,
    },
  
];

// ============================================================
// Content Generation Types
// ============================================================

export type AdContentType = 
  | "launch_announcement"
  | "feature_showcase"
  | "behind_the_scenes"
  | "user_testimonial"
  | "comparison"
  | "tutorial_teaser"
  | "milestone"

  // Film industry-specific content types
  | "pitch_deck_teaser"
  | "industry_insight"
  | "case_study"
  | "pre_vis_showcase"
  | "roi_breakdown"
  | "executive_briefing";

export interface GeneratedAdContent {
  title: string;
  body: string;
  hashtags: string[];
  callToAction: string;
  imagePrompt: string; // for AI image generation
  platformId: string;
  contentType: AdContentType;
  tone: string;
}

export interface AdCampaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  platforms: string[];
  contentType: AdContentType;
  startDate: string;
  schedule: "once" | "daily" | "weekly" | "biweekly" | "monthly";
  generatedContent: GeneratedAdContent[];
  postHistory: AdPostRecord[];
  createdAt: string;
}

export interface AdPostRecord {
  platformId: string;
  platformName: string;
  postedAt: string;
  status: "success" | "failed" | "pending" | "scheduled";
  postUrl?: string;
  error?: string;
  contentPreview: string;
}

// ============================================================
// AI Content Generation
// ============================================================

const VIRELLE_INFO = {
  name: "Virelle Studios",
  tagline: "AI-Powered Film Production Studio",
  url: "https://virelle.life",
  description: "Virelle Studios is an AI-powered film production platform that lets anyone create professional-quality films using artificial intelligence. From script to screen â write your plot, and our AI generates cinematic scenes, characters, soundtracks, and complete movies.",
  features: [
    "AI Film Generation â Write a plot, get a complete film with scenes, characters, and visuals",
    "Cinematic Prompt Engine â Genre-specific visual DNA for consistent, professional imagery",
    "Script Writer â Full screenplay editor with AI assistance",
    "Storyboard Generator â Automatic storyboard creation from scripts",
    "Character Designer â AI character generation with consistent appearances",
    "Scene Editor â Drag-and-drop scene arrangement with AI image generation",
    "Sound Effects & Music â AI-generated soundtracks and sound design",
    "Visual Effects â Post-production VFX tools",
    "Color Grading â Professional color correction and grading",
    "Collaboration â Team-based filmmaking with role management",
    "Ad & Poster Maker â Create marketing materials for your films",
    "Media Player â Built-in cinema-quality video player",
    "Export â Full movie export with credits and soundtrack",
  ],
  pricing: {
    creator: "$29/month â 10 projects, 100 AI generations/month, full pipeline",
    pro: "$99/month â 25 projects, 200 generations, all creative tools",
    industry: "$499/month â Unlimited everything, 4K, ultra quality",
  },
  differentiators: [
    "End-to-end film production in one platform",
    "AI handles the visual production so you focus on storytelling",
    "No film crew, no expensive equipment, no post-production team needed",
    "From idea to finished film in minutes, not months",
    "Professional-grade output with cinematic visual DNA system",
  ],
};

export async function generateAdContent(
  platformId: string,
  contentType: AdContentType,
  customContext?: string
): Promise<GeneratedAdContent> {
  const platform = AD_PLATFORMS.find(p => p.id === platformId);
  if (!platform) throw new Error(`Platform not found: ${platformId}`);

  const prompt = buildAdPrompt(platform, contentType, customContext);
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert marketing copywriter specializing in tech product promotion on ${platform.name}. You understand the platform's culture, audience expectations, and what content performs well. You write authentic, engaging copy that doesn't feel like an ad â it feels like a genuine community member sharing something valuable.`
      },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ad_content",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Post title or headline" },
            body: { type: "string", description: "Main post body text" },
            hashtags: { type: "array", items: { type: "string" }, description: "Relevant hashtags" },
            callToAction: { type: "string", description: "Call to action text" },
            imagePrompt: { type: "string", description: "Prompt for generating an accompanying image" },
            tone: { type: "string", description: "The tone used: casual, professional, enthusiastic, etc." },
          },
          required: ["title", "body", "hashtags", "callToAction", "imagePrompt", "tone"],
          additionalProperties: false,
        }
      }
    }
  });

  const msg = response.choices?.[0]?.message;
  const content = typeof msg?.content === "string" ? msg.content : Array.isArray(msg?.content) ? msg.content.map((c: any) => c.text || "").join("") : "";
  let parsed: any;
  try {
    parsed = safeJsonExtract(content, null);
  } catch {
    throw new Error("Failed to parse AI-generated ad content");
  }

  return {
    ...parsed,
    platformId,
    contentType,
  };
}

function buildAdPrompt(
  platform: AdPlatform,
  contentType: AdContentType,
  customContext?: string
): string {
  const isLinkedInFilmIndustry = platform.id.startsWith("linkedin");

  const contentTypeInstructions: Record<AdContentType, string> = {
    launch_announcement: "Write a launch announcement for Virelle Studios. Make it exciting but authentic. Focus on the problem it solves and the 'wow' factor of AI film generation.",
    feature_showcase: "Showcase a specific feature of Virelle Studios. Pick the most impressive feature for this audience and explain it with enthusiasm. Show how it works and why it matters.",
    behind_the_scenes: "Write a behind-the-scenes post about how Virelle Studios works technically. Share the AI pipeline, the visual DNA system, or the cinematic prompt engine. Make it educational and fascinating.",
    user_testimonial: "Write a post from the perspective of someone who just used Virelle Studios to create their first AI film. Make it genuine, share the experience, the surprises, and the results.",
    comparison: "Write a comparison showing how Virelle Studios changes the filmmaking workflow. Compare traditional film production (months, expensive) vs AI-powered (minutes, accessible). Don't bash competitors â elevate the category.",
    tutorial_teaser: "Write a teaser for a tutorial on how to use Virelle Studios. Give just enough to intrigue people and make them want to try it. Include one concrete tip or workflow.",
    milestone: "Write a milestone/update post. Share growth, new features, or community achievements. Make the community feel like they're part of the journey.",

    // Film industry-specific
    pitch_deck_teaser: isLinkedInFilmIndustry
      ? "Write a LinkedIn post for film industry professionals about how Virelle Studios transforms the pitch process. The hook: 'What if you could show investors a fully visualised film before spending a dollar on production?' Walk through how a producer used Virelle Studios to create a cinematic pitch deck â script, storyboard, character designs, and scene previews â in 48 hours instead of 6 weeks. End with a call to action for producers to try it. Use professional film industry language. Include hashtags: #FilmProducer #FilmFinance #IndieFilm #PitchDeck #FilmProduction."
      : "Write a post about how Virelle Studios helps filmmakers pitch their projects with AI-generated visuals.",
    industry_insight: isLinkedInFilmIndustry
      ? "Write a thought leadership LinkedIn post for film industry professionals. Topic: 'AI is not replacing filmmakers â it's eliminating the gatekeepers.' Argue that the biggest barrier to filmmaking has never been talent â it's been access to expensive pre-production resources. AI removes that barrier. This is the most democratising moment in film history since the invention of the digital camera. Speak with authority. Reference industry trends, streaming platform demand for content, and the economics of independent film. End with how Virelle Studios fits into this shift. Use hashtags: #FilmIndustry #AIFilm #FutureOfFilm #HollywoodAI #FilmMaking."
      : "Write an insight post about how AI is transforming the film industry.",
    case_study: isLinkedInFilmIndustry
      ? "Write a LinkedIn case study post for film industry professionals. Format: Problem â Solution â Result. Problem: An independent director had a feature film script but couldn't afford pre-production visualisation ($80K+ for storyboards, concept art, and pre-vis). Solution: Used Virelle Studios to generate the full visual package â character designs, scene storyboards, location concepts, and a 3-minute pre-vis reel â in 72 hours. Result: Secured $2M in film finance at their first investor meeting because investors could SEE the film. Make it specific, credible, and compelling. Use hashtags: #FilmFinance #IndependentFilm #CaseStudy #FilmProduction."
      : "Write a case study showing how someone used Virelle Studios to create a film.",
    pre_vis_showcase: isLinkedInFilmIndustry
      ? "Write a LinkedIn post for directors and cinematographers showcasing Virelle Studios as the ultimate pre-visualisation tool. Explain how directors can now plan every shot before the first day of principal photography: exact camera angles (Dutch angle, bird's eye, tracking shot), lens choices (24mm wide, 85mm portrait, 200mm telephoto), lighting setups (golden hour, motivated practicals, three-point), and color grades (desaturated cold thriller, warm golden drama, high-contrast noir). This eliminates the most expensive mistakes on set. Speak in cinematography language. Use hashtags: #PreVis #Cinematography #FilmDirector #DirectorOfPhotography #FilmCraft."
      : "Write a post showcasing the pre-visualisation capabilities of Virelle Studios.",
    roi_breakdown: isLinkedInFilmIndustry
      ? "Write a LinkedIn post for film producers and studio executives with a clear ROI breakdown for Virelle Studios. Format as a financial comparison: Traditional pre-production costs vs Virelle Studios. Include: Storyboard artist ($15K-$40K) â $0. Concept artist ($10K-$25K) â $0. Pre-vis studio ($50K-$200K) â $0. Location scouting ($5K-$20K) â reduced by 80%. Total savings on a typical indie feature: $80K-$285K. Then show the Virelle Studios cost: $499/month Industry plan. ROI: 160x in year one. Make it punchy, data-driven, and undeniable. Use hashtags: #FilmBudget #FilmProducer #ROI #FilmProduction #IndependentFilm."
      : "Write a post breaking down the cost savings of using Virelle Studios vs traditional film production.",
    executive_briefing: isLinkedInFilmIndustry
      ? "Write a LinkedIn post in the style of an executive briefing for studio heads and production company executives. Topic: 'The AI Production Revolution â What Every Studio Needs to Know in 2025.' Cover: (1) The content volume problem â streaming platforms need 10x more content than studios can produce. (2) The solution â AI-powered production tools that multiply output without multiplying headcount. (3) Virelle Studios as the enterprise solution â unlimited projects, 4K output, team collaboration, full pipeline from script to screen. (4) The competitive risk â studios that don't adopt AI production tools will be outpaced by those that do. Authoritative, boardroom tone. Use hashtags: #FilmStudio #EntertainmentIndustry #ContentStrategy #AIProduction #FilmIndustry."
      : "Write an executive-level post about the strategic importance of AI in film production.",
  };

  return `
Generate a ${contentType.replace(/_/g, " ")} post for ${platform.name}.

PLATFORM CONTEXT:
- Platform: ${platform.name} (${platform.type})
- Audience: ${platform.audienceType}
- Posting Strategy: ${platform.postingStrategy}
- Max Length: ${platform.maxPostLength ? `${platform.maxPostLength} characters` : "No strict limit"}
- Supports Images: ${platform.supportsImages}
- Supports Links: ${platform.supportsLinks}

PRODUCT INFO:
- Name: ${VIRELLE_INFO.name}
- Tagline: ${VIRELLE_INFO.tagline}
- URL: ${VIRELLE_INFO.url}
- Description: ${VIRELLE_INFO.description}
- Key Features: ${VIRELLE_INFO.features.join("; ")}
- Pricing: Creator: ${VIRELLE_INFO.pricing.creator} | Pro: ${VIRELLE_INFO.pricing.pro} | Industry: ${VIRELLE_INFO.pricing.industry}
- Differentiators: ${VIRELLE_INFO.differentiators.join("; ")}

CONTENT INSTRUCTIONS:
${contentTypeInstructions[contentType]}

${customContext ? `ADDITIONAL CONTEXT: ${customContext}` : ""}

RULES:
1. Write in the natural voice and style of ${platform.name}'s community
2. Do NOT sound like a corporate ad or press release
3. Be genuine, helpful, and value-first
4. ${platform.type === "forum" ? "Follow the subreddit/forum rules â no spam, provide value" : "Be engaging and shareable"}
5. Include the URL naturally, not as a hard sell
6. Keep within the platform's character limits
7. Use appropriate formatting for the platform (markdown for Reddit, plain text for Twitter, etc.)
8. The image prompt should describe a cinematic, professional-looking image that showcases AI filmmaking
`;
}

// ============================================================
// Campaign Management
// ============================================================

// In-memory campaign storage (in production, this would be in the database)
const campaigns: Map<string, AdCampaign> = new Map();

export function createCampaign(
  name: string,
  platforms: string[],
  contentType: AdContentType,
  schedule: AdCampaign["schedule"]
): AdCampaign {
  const id = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const campaign: AdCampaign = {
    id,
    name,
    status: "draft",
    platforms,
    contentType,
    startDate: new Date().toISOString(),
    schedule,
    generatedContent: [],
    postHistory: [],
    createdAt: new Date().toISOString(),
  };
  campaigns.set(id, campaign);
  return campaign;
}

export function getCampaign(id: string): AdCampaign | undefined {
  return campaigns.get(id);
}

export function listCampaigns(): AdCampaign[] {
  return Array.from(campaigns.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function updateCampaignStatus(id: string, status: AdCampaign["status"]): void {
  const campaign = campaigns.get(id);
  if (campaign) {
    campaign.status = status;
  }
}

export function addPostRecord(campaignId: string, record: AdPostRecord): void {
  const campaign = campaigns.get(campaignId);
  if (campaign) {
    campaign.postHistory.push(record);
  }
}

export function deleteCampaign(id: string): boolean {
  return campaigns.delete(id);
}

// ============================================================
// Platform Posting Helpers
// ============================================================

// Generate a full campaign with content for all selected platforms
export async function generateCampaignContent(
  campaignId: string,
  customContext?: string
): Promise<GeneratedAdContent[]> {
  const campaign = campaigns.get(campaignId);
  if (!campaign) throw new Error("Campaign not found");

  // Generate content for all platforms in parallel for faster execution
  const results = await Promise.allSettled(
    campaign.platforms.map(platformId =>
      generateAdContent(platformId, campaign.contentType, customContext)
    )
  );

  const contents: GeneratedAdContent[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      contents.push(result.value);
    } else {
      logger.error(`Failed to generate content for ${campaign.platforms[i]}:`, result.reason);
    }
  }

  campaign.generatedContent = contents;
  return contents;
}

// Get platform info for display
export function getPlatformInfo(platformId: string): AdPlatform | undefined {
  return AD_PLATFORMS.find(p => p.id === platformId);
}

// Get all platforms grouped by category
export function getPlatformsByCategory(): Record<string, AdPlatform[]> {
  const grouped: Record<string, AdPlatform[]> = {};
  for (const platform of AD_PLATFORMS) {
    if (!grouped[platform.category]) {
      grouped[platform.category] = [];
    }
    grouped[platform.category].push(platform);
  }
  return grouped;
}

// Get recommended platforms for a given content type
export function getRecommendedPlatforms(contentType: AdContentType): AdPlatform[] {
  const recommendations: Record<AdContentType, string[]> = {
    launch_announcement: ["producthunt", "reddit_sideproject", "hackernews", "twitter", "linkedin"],
    feature_showcase: ["reddit_filmmakers", "reddit_filmmaking", "twitter", "behance"],
    behind_the_scenes: ["reddit_filmmakers", "hackernews", "indiehackers", "linkedin"],
    user_testimonial: ["reddit_indiefilm", "reddit_filmmaking", "facebook_groups", "twitter"],
    comparison: ["reddit_filmmakers", "reddit_screenwriting", "linkedin", "stage32"],
    tutorial_teaser: ["reddit_filmmaking", "reddit_screenwriting", "twitter", "deviantart"],
    milestone: ["indiehackers", "twitter", "linkedin", "reddit_sideproject"],

    // Film industry LinkedIn-specific
    pitch_deck_teaser: ["linkedin", "linkedin_producers", "reddit_filmmakers", "reddit_indiefilm", "stage32"],
    industry_insight: ["linkedin", "linkedin_studios", "reddit_filmmakers", "stage32"],
    case_study: ["linkedin_producers", "linkedin", "reddit_indiefilm", "stage32"],
    pre_vis_showcase: ["linkedin_directors", "linkedin", "reddit_filmmakers", "reddit_filmmaking", "behance"],
    roi_breakdown: ["linkedin_producers", "linkedin_studios", "reddit_indiefilm", "reddit_filmmakers"],
    executive_briefing: ["linkedin_studios", "linkedin", "hackernews"],
  };
  const ids = recommendations[contentType] || [];
  return AD_PLATFORMS.filter(p => ids.includes(p.id));
}


// ============================================================
// IMAGE AD GENERATION
// ============================================================

export interface GeneratedImageAd {
  imageUrl: string;
  style: string;
  prompt: string;
  platform: string;
  createdAt: string;
}

const IMAGE_AD_STYLES = [
  { name: "Movie Poster", prompt: (topic: string) => `Cinematic movie poster style promotional image for Virelle Studios AI filmmaking platform. Theme: "${topic}". Dark dramatic lighting, film grain texture, bold typography space, professional Hollywood poster aesthetic. Rich colors, atmospheric depth.` },
  { name: "Social Banner", prompt: (topic: string) => `Eye-catching social media banner for Virelle Studios. Topic: "${topic}". Cinematic widescreen composition, AI-generated film scene showcase, modern dark theme with gold/amber accents. Professional, shareable, 1200x628 aspect ratio.` },
  { name: "Instagram Square", prompt: (topic: string) => `Instagram-optimized square promotional image for Virelle Studios AI film production. Theme: "${topic}". Sleek dark background with cinematic lighting, film reel or camera elements, neon accents. Clean typography space. 1080x1080.` },
  { name: "Story/Reel Cover", prompt: (topic: string) => `Vertical story cover for Virelle Studios. Theme: "${topic}". Dynamic cinematic composition, dramatic lighting, film production elements (clapperboard, camera, screen). Dark theme with vibrant accent colors. Mobile-optimized 1080x1920.` },
  { name: "Feature Showcase", prompt: (topic: string) => `Product feature showcase image for Virelle Studios AI filmmaking. Feature: "${topic}". Clean UI mockup style showing the platform interface with a cinematic scene being generated. Dark theme, professional, enterprise-grade look.` },
  { name: "Behind The Scenes", prompt: (topic: string) => `Behind-the-scenes style image showing AI film production process. Theme: "${topic}". Split view: one side shows AI interface/code, other side shows cinematic output. Futuristic, tech-meets-art aesthetic. Teal and orange color grading.` },
];

export async function generateImageAd(
  topic?: string,
  style?: string
): Promise<GeneratedImageAd> {
  const selectedTopic = topic || VIRELLE_INFO.features[Math.floor(Math.random() * VIRELLE_INFO.features.length)];
  const selectedStyle = style 
    ? IMAGE_AD_STYLES.find(s => s.name === style) || IMAGE_AD_STYLES[0]
    : IMAGE_AD_STYLES[Math.floor(Math.random() * IMAGE_AD_STYLES.length)];

  const prompt = selectedStyle.prompt(selectedTopic);
  const result = await generateImage({ prompt });

  return {
    imageUrl: result.url || "",
    style: selectedStyle.name,
    prompt,
    platform: "multi_platform",
    createdAt: new Date().toISOString(),
  };
}

// ============================================================
// VIDEO AD GENERATION
// ============================================================

export interface GeneratedVideoAd {
  videoUrl: string;
  model: string;
  duration: number;
  prompt: string;
  platform: string;
  createdAt: string;
}

const VIDEO_AD_PROMPTS = [
  (topic: string) => `Cinematic showcase of AI film production: ${topic}. Smooth camera movement through a virtual film studio, screens showing AI-generated movie scenes. Futuristic, professional, inspiring. Dark ambient lighting with glowing screens.`,
  (topic: string) => `Time-lapse of an AI creating a movie scene: ${topic}. Starting from text prompt, morphing into storyboard, then into full cinematic scene. Magical transformation effect, particles of light forming the image. Dark background.`,
  (topic: string) => `Split-screen comparison: traditional film set vs AI filmmaking with Virelle Studios. Topic: ${topic}. Left side: expensive equipment, large crew. Right side: single person at laptop, same quality output. Clean, modern aesthetic.`,
  (topic: string) => `Dramatic reveal of an AI-generated film scene: ${topic}. Camera pushes through a digital portal into a fully realized cinematic world. Lens flares, volumetric lighting, film grain. Epic and inspiring.`,
  (topic: string) => `Montage of diverse AI-generated film genres: ${topic}. Quick cuts between horror, romance, sci-fi, action, documentary â all created by Virelle Studios. Each genre has distinct color grading and mood. Professional quality.`,
];

export async function generateVideoAd(
  topic?: string,
  platform?: string
): Promise<GeneratedVideoAd> {
  const selectedTopic = topic || VIRELLE_INFO.differentiators[Math.floor(Math.random() * VIRELLE_INFO.differentiators.length)];
  const promptFn = VIDEO_AD_PROMPTS[Math.floor(Math.random() * VIDEO_AD_PROMPTS.length)];
  const prompt = promptFn(selectedTopic);

  try {
    // Use empty keys so BYOK engine falls back to platform keys / Pollinations (free)
    const emptyKeys: UserApiKeys = {
      openaiKey: null, runwayKey: null, replicateKey: null,
      falKey: null, lumaKey: null, hfToken: null, preferredProvider: null,
    };
    const result = await byokGenerateVideo(emptyKeys, {
      prompt,
      duration: 5,
      aspectRatio: platform === "tiktok" || platform === "instagram" ? "9:16" : "16:9",
    });

    return {
      videoUrl: result.videoUrl,
      model: result.provider,
      duration: result.durationSeconds || 5,
      prompt,
      platform: platform || "multi_platform",
      createdAt: new Date().toISOString(),
    };
  } catch (err: any) {
    throw new Error(`Video ad generation failed: ${err.message}`);
  }
}

// ============================================================
// ENHANCED AD CONTENT WITH MEDIA
// ============================================================

export interface EnhancedAdContent {
  text: GeneratedAdContent;
  imageAd?: GeneratedImageAd;
  videoAd?: GeneratedVideoAd;
}

/**
 * Generate a complete ad package: text + image + optional video
 */
export async function generateFullAdPackage(
  platformId: string,
  contentType: AdContentType,
  options?: { includeVideo?: boolean; customContext?: string }
): Promise<EnhancedAdContent> {
  // Generate text content
  const text = await generateAdContent(platformId, contentType, options?.customContext);

  // Generate image ad using the text's image prompt
  let imageAd: GeneratedImageAd | undefined;
  try {
    imageAd = await generateImageAd(text.imagePrompt);
  } catch (err) {
    logger.error("[AdEngine] Image ad generation failed:", { error: String(err) });
  }

  // Generate video ad if requested
  let videoAd: GeneratedVideoAd | undefined;
  if (options?.includeVideo) {
    try {
      videoAd = await generateVideoAd(text.title);
    } catch (err) {
      logger.error("[AdEngine] Video ad generation failed:", { error: String(err) });
    }
  }

  return { text, imageAd, videoAd };
}

// ============================================================
// AUTONOMOUS ADVERTISING SCHEDULER
// ============================================================

interface AdSchedulerState {
  isRunning: boolean;
  lastRun: string | null;
  totalRuns: number;
  totalContentGenerated: number;
  totalImagesGenerated: number;
  totalVideosGenerated: number;
  totalPostsPublished: number;
  errors: string[];
  credentialStatus?: Record<string, { configured: boolean; missing: string[] }>;
}

const schedulerState: AdSchedulerState = {
  isRunning: false,
  lastRun: null,
  totalRuns: 0,
  totalContentGenerated: 0,
  totalImagesGenerated: 0,
  totalVideosGenerated: 0,
  totalPostsPublished: 0,
  errors: [],
};

// Lazy-load credential status (avoids import-time env var issues)
function ensureCredentialStatus() {
  if (!schedulerState.credentialStatus) {
    schedulerState.credentialStatus = getSocialCredentialStatus();
  }
}

export function getSchedulerState(): AdSchedulerState {
  return { ...schedulerState };
}

/**
 * Run one autonomous advertising cycle:
 * 1. Generate text content for 2-3 random platforms
 * 2. Generate 1-2 promotional images
 * 3. Generate 1 short video ad (if available)
 * 4. Store everything in campaigns for admin review
 */
export async function runAutonomousAdCycle(): Promise<{
  textContent: GeneratedAdContent[];
  images: GeneratedImageAd[];
  videos: GeneratedVideoAd[];
  errors: string[];
  socialResults?: PostResult[];
}> {
  logger.info("[AdEngine] Starting autonomous advertising cycle...");
  
  const results = {
    textContent: [] as GeneratedAdContent[],
    images: [] as GeneratedImageAd[],
    videos: [] as GeneratedVideoAd[],
    errors: [] as string[],
  };

  // 1. Generate text content for random platforms
  // Rotate through all content types including film-industry-specific LinkedIn types
  const generalContentTypes: AdContentType[] = [
    "launch_announcement", "feature_showcase", "behind_the_scenes",
    "user_testimonial", "tutorial_teaser",
  ];
  const linkedInContentTypes: AdContentType[] = [
    "pitch_deck_teaser", "industry_insight", "case_study",
    "pre_vis_showcase", "roi_breakdown", "executive_briefing",
  ];
  // Alternate between general and LinkedIn-specific content (50/50)
  const useLinkedInContent = Math.random() > 0.5;
  const selectedType = useLinkedInContent
    ? linkedInContentTypes[Math.floor(Math.random() * linkedInContentTypes.length)]
    : generalContentTypes[Math.floor(Math.random() * generalContentTypes.length)];

  // LinkedIn segments to rotate through
  const linkedInSegments = ["linkedin", "linkedin_producers", "linkedin_directors", "linkedin_studios"];
  const selectedLinkedInSegment = linkedInSegments[schedulerState.totalRuns % linkedInSegments.length];

  // Build platform list: always include the rotating LinkedIn segment + 1-2 film Reddit communities
  const filmRedditPlatforms = AD_PLATFORMS.filter(p =>
    ["reddit_filmmakers", "reddit_filmmaking", "reddit_indiefilm", "reddit_screenwriting"].includes(p.id)
  );
  const shuffledReddit = [...filmRedditPlatforms].sort(() => Math.random() - 0.5);
  const linkedInPlatform = AD_PLATFORMS.find(p => p.id === selectedLinkedInSegment);
  const platformsToTarget = [
    ...(linkedInPlatform ? [linkedInPlatform] : []),
    ...shuffledReddit.slice(0, 1 + Math.floor(Math.random() * 2)),
  ];

  for (const platform of platformsToTarget) {
    try {
      const content = await generateAdContent(platform.id, selectedType);
      results.textContent.push(content);
      schedulerState.totalContentGenerated++;
    } catch (err: any) {
      results.errors.push(`Text for ${platform.name}: ${err.message}`);
    }
  }

  // 2. Generate promotional images (1-2)
  const imageCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < imageCount; i++) {
    try {
      const imageAd = await generateImageAd();
      results.images.push(imageAd);
      schedulerState.totalImagesGenerated++;
    } catch (err: any) {
      results.errors.push(`Image ad: ${err.message}`);
    }
  }

  // 3. Generate a short video ad
  try {
    const videoAd = await generateVideoAd();
    results.videos.push(videoAd);
    schedulerState.totalVideosGenerated++;
  } catch (err: any) {
    results.errors.push(`Video ad: ${err.message}`);
  }

  // Store in a campaign for admin review
  const campaign = createCampaign(
    `Auto-Campaign ${new Date().toLocaleDateString()}`,
    platformsToTarget.map(p => p.id),
    selectedType,
    "weekly"
  );
  campaign.generatedContent = results.textContent;
  campaign.status = "active";

  // ââ ACTUAL SOCIAL POSTING ââââââââââââââââââââââââââââââââââââââââââââââââ
  const socialResults: PostResult[] = [];
  const primaryContent = results.textContent[0];
  const imageAd = results.images[0];

  if (primaryContent) {
    // 1. Post to LinkedIn
    try {
      const linkedInResult = await postToLinkedIn({
        text: `${primaryContent.title}\n\n${primaryContent.body}\n\n${primaryContent.callToAction}\n\nhttps://virelle.life`,
        imageUrl: imageAd?.imageUrl,
        title: primaryContent.title,
      });
      socialResults.push(linkedInResult);
      if (linkedInResult.success) {
        schedulerState.totalPostsPublished++;
      } else {
        results.errors.push(`LinkedIn: ${linkedInResult.error}`);
      }
    } catch (err: any) {
      results.errors.push(`LinkedIn post: ${err.message}`);
    }

    // 2. Post to Reddit film communities (2 subreddits per cycle)
    try {
      const redditTitle = primaryContent.title.length > 300
        ? primaryContent.title.slice(0, 297) + "..."
        : primaryContent.title;
      const redditText = `${primaryContent.body}\n\n${primaryContent.callToAction}\n\nTry it free: https://virelle.life`;
      const redditResults = await postToFilmSubreddits(redditTitle, redditText, "https://virelle.life", 2);
      socialResults.push(...redditResults);
      const redditSuccesses = redditResults.filter(r => r.success).length;
      schedulerState.totalPostsPublished += redditSuccesses;
      redditResults.filter(r => !r.success).forEach(r => results.errors.push(`Reddit: ${r.error}`));
    } catch (err: any) {
      results.errors.push(`Reddit post: ${err.message}`);
    }

    // 3. Broadcast to WhatsApp subscriber list
    try {
      const whatsappText = `ð¬ *${primaryContent.title}*\n\n${primaryContent.body.slice(0, 500)}\n\n${primaryContent.callToAction}\n\nð https://virelle.life`;
      const whatsappResults = await broadcastWhatsApp(whatsappText, imageAd?.imageUrl);
      socialResults.push(...whatsappResults);
      const waSuccesses = whatsappResults.filter(r => r.success).length;
      schedulerState.totalPostsPublished += waSuccesses;
      whatsappResults.filter(r => !r.success).forEach(r => results.errors.push(`WhatsApp: ${r.error}`));
    } catch (err: any) {
      results.errors.push(`WhatsApp broadcast: ${err.message}`);
    }
  }

  // Store social results on the campaign for admin review
  (campaign as any).socialPostResults = socialResults;
  // ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  schedulerState.lastRun = new Date().toISOString();
  schedulerState.totalRuns++;
  schedulerState.errors = results.errors;
  ensureCredentialStatus();
  schedulerState.credentialStatus = getSocialCredentialStatus();

  logger.info(`[AdEngine] Cycle complete: ${results.textContent.length} text, ${results.images.length} images, ${results.videos.length} videos, ${socialResults.length} social posts, ${results.errors.length} errors`);

  return { ...results, socialResults };
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the autonomous advertising scheduler.
 * Runs every 8 hours (3x/day) to generate fresh marketing content.
 */
export function startAdScheduler(): void {
  if (schedulerInterval) {
    logger.info("[AdEngine] Scheduler already running");
    return;
  }

  logger.info("[AdEngine] Starting autonomous advertising scheduler (every 8 hours)");
  schedulerState.isRunning = true;

  // Run first cycle after 5 minutes (let server fully start)
  setTimeout(async () => {
    try {
      await runAutonomousAdCycle();
    } catch (err) {
      logger.error("[AdEngine] First cycle failed:", { error: String(err) });
    }
  }, 5 * 60 * 1000);

  // Then run every 8 hours
  schedulerInterval = setInterval(async () => {
    try {
      await runAutonomousAdCycle();
    } catch (err) {
      logger.error("[AdEngine] Scheduled cycle failed:", { error: String(err) });
    }
  }, 8 * 60 * 60 * 1000);
}

export function stopAdScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    schedulerState.isRunning = false;
    logger.info("[AdEngine] Scheduler stopped");
  }
}
