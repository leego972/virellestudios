/**
 * v6.78 — Global Film & Cinema Funding Sources expansion
 * ─────────────────────────────────────────────────────────
 * Idempotent seed of ~150 official film/cinema funding sources from the
 * brief at docs/VIRELLE_V678_GLOBAL_FILM_FUNDING_SOURCES_BRIEF.md.
 *
 * Source quality rule (per brief, phase 2):
 *   - National screen agencies, regional film commissions, government
 *     cultural funds, official festival/market funds, major documentary
 *     funds, official co-production funds, official broadcaster /
 *     film-institute funding pages.
 *   - Avoid low-quality random blog lists.
 *
 * Idempotency:
 *   - The funding_sources table has UNIQUE INDEX
 *     `uq_funding_country_org (country(100), organization(100))`
 *     installed by autoMigrate Step 2b.
 *   - We use `INSERT IGNORE` so re-runs are silent no-ops on dupes.
 *   - We never DELETE, never UPDATE, never overwrite user-added rows.
 *   - We do not touch the existing 95-row seed.
 *
 * Israel is included as its own country with 8 dedicated Israeli
 * cinema/film funding sources (the existing seed already had 4).
 *
 * Notes are kept neutral and funding-focused — no political commentary
 * (per brief).
 */

import { sql } from "drizzle-orm";

interface FundingRow {
  country: string;
  organization: string;
  type: string;
  supports: string;
  stage: string;
  fundingForm: string;
  eligibility: string;
  officialSite: string;
  notes: string;
  packType?: string;
  primaryLanguage?: string;
}

/* ───────────────────────────────────────────────────────────────────── *
 * The dataset.  Grouped by region for easy review.
 * ───────────────────────────────────────────────────────────────────── */

const ROWS: FundingRow[] = [
  /* ── International / global ─────────────────────────────────────── */
  { country: "International", organization: "IDFA Bertha Fund", type: "Documentary fund", supports: "Creative documentary from Africa, Asia, Latin America, Middle East, parts of Eastern Europe", stage: "Development/Production/Post-production", fundingForm: "Grant", eligibility: "Filmmakers from eligible countries", officialSite: "https://www.idfa.nl/en/info/about-bertha-fund", notes: "Two streams: Classic (development & production) and Europe (co-production).", packType: "Documentary Fund Pack", primaryLanguage: "English" },
  { country: "International", organization: "Sundance Institute Documentary Film Program", type: "Documentary fund", supports: "Feature documentaries with creative and social impact", stage: "Development/Production/Post-production", fundingForm: "Grant", eligibility: "Independent documentary filmmakers worldwide", officialSite: "https://www.sundance.org/programs/documentary-film", notes: "Year-round open call; multi-stage support.", packType: "Documentary Fund Pack", primaryLanguage: "English" },
  { country: "International", organization: "Doha Film Institute Grants", type: "Public-interest film fund", supports: "Narrative and documentary features, shorts, post-production", stage: "Development/Production/Post-production", fundingForm: "Grant", eligibility: "Open to filmmakers from MENA + selected international stages", officialSite: "https://www.dohafilminstitute.com/financing/grants", notes: "Spring and Fall cycles; some categories restricted to MENA filmmakers.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "International", organization: "World Cinema Fund (Berlinale)", type: "Co-production fund", supports: "Feature films from regions with weak film infrastructure", stage: "Production/Post-production", fundingForm: "Grant", eligibility: "Director from eligible region partnered with German producer", officialSite: "https://www.berlinale.de/en/world-cinema-fund.html", notes: "Run by Berlinale and German Federal Cultural Foundation.", packType: "Co-Production Fund Pack", primaryLanguage: "English" },
  { country: "International", organization: "Hubert Bals Fund (IFFR)", type: "Public-interest film fund", supports: "Innovative feature films from Africa, Asia, Latin America, Middle East, parts of Eastern Europe", stage: "Development/Post-production", fundingForm: "Grant", eligibility: "Directors from eligible countries", officialSite: "https://iffr.com/en/professionals/hubert-bals-fund", notes: "Operated by International Film Festival Rotterdam.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "International", organization: "Visions Sud Est", type: "Co-production fund", supports: "Fiction features from Africa, Asia, Latin America, Eastern Europe, MENA", stage: "Production/Post-production", fundingForm: "Grant", eligibility: "Directors from eligible countries with Swiss co-producer not required", officialSite: "https://www.visionssudest.ch", notes: "Swiss-based fund; two annual deadlines.", packType: "Co-Production Fund Pack", primaryLanguage: "English" },
  { country: "International", organization: "Sørfond", type: "Public-interest film fund", supports: "Feature films from countries on DAC list", stage: "Production", fundingForm: "Grant", eligibility: "Director from eligible country, Norwegian co-producer required", officialSite: "https://sorfond.no/en", notes: "Run by Norwegian Film Institute and FilmFromSouth.", packType: "Co-Production Fund Pack", primaryLanguage: "English" },
  { country: "International", organization: "Hot Docs–Blue Ice Group Documentary Fund", type: "Documentary fund", supports: "Documentary projects by African filmmakers", stage: "Development/Production", fundingForm: "Grant", eligibility: "African filmmakers", officialSite: "https://hotdocs.ca/industry/funds-and-awards", notes: "Hot Docs runs several documentary funds and the Forum market.", packType: "Documentary Fund Pack", primaryLanguage: "English" },
  { country: "International", organization: "Chicken & Egg Pictures", type: "Documentary fund", supports: "Feature documentaries by women and gender-nonconforming directors", stage: "Development/Production/Post-production", fundingForm: "Grant", eligibility: "Women + gender-nonconforming filmmakers", officialSite: "https://chickeneggpics.org", notes: "Mentorship + grants across multiple programs.", packType: "Documentary Fund Pack", primaryLanguage: "English" },
  { country: "International", organization: "Catapult Film Fund", type: "Documentary fund", supports: "Early-stage development of documentary feature films", stage: "Development", fundingForm: "Grant", eligibility: "Filmmakers worldwide", officialSite: "https://catapultfilmfund.org", notes: "Rolling open call.", packType: "Documentary Fund Pack", primaryLanguage: "English" },
  { country: "Europe / EU", organization: "Creative Europe MEDIA", type: "Public agency", supports: "Development, distribution, training, festivals, co-development", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Companies from MEDIA-eligible countries", officialSite: "https://culture.ec.europa.eu/creative-europe/creative-europe-media-strand", notes: "Major EU film funding programme.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "Europe / EU", organization: "Eurimages (Council of Europe)", type: "Co-production fund", supports: "European co-productions, distribution, exhibition", stage: "Production/Distribution", fundingForm: "Grant / loan", eligibility: "Producers from member states", officialSite: "https://www.coe.int/en/web/eurimages", notes: "Council of Europe co-production fund.", packType: "Co-Production Fund Pack", primaryLanguage: "English" },
  { country: "International", organization: "TorinoFilmLab", type: "Lab / market", supports: "Development of first and second feature films", stage: "Development", fundingForm: "Grant / lab", eligibility: "Filmmakers worldwide via open calls", officialSite: "https://www.torinofilmlab.it", notes: "Multiple labs (Next, Feature Lab, ScriptLab, Extended).", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "International", organization: "Berlinale Co-Production Market", type: "Market", supports: "Selected projects pitched to international co-financiers", stage: "Development/Production", fundingForm: "Market access", eligibility: "Producers with confirmed financing baseline", officialSite: "https://www.efm-berlinale.de/en/co-production-market/profile/profile.html", notes: "Held during European Film Market.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "International", organization: "Cannes La Cinef / Cinéfondation Atelier", type: "Lab / market", supports: "Student short films and feature project labs", stage: "Development", fundingForm: "Selection / lab", eligibility: "Film schools and selected directors", officialSite: "https://www.festival-cannes.com/en/cinef", notes: "Atelier supports project finance during Marché du Film.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "International", organization: "Locarno Open Doors", type: "Lab / market", supports: "Filmmakers from a rotating focus region", stage: "Development", fundingForm: "Lab / awards", eligibility: "Directors and producers from focus region", officialSite: "https://www.locarnofestival.ch/industry/open-doors.html", notes: "Annual focus region rotates.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "International", organization: "CPH:FORUM (CPH:DOX)", type: "Documentary market", supports: "International creative documentary co-financing", stage: "Development/Production", fundingForm: "Market access", eligibility: "Documentary projects with international ambition", officialSite: "https://cphdox.dk/en/industry", notes: "One of the largest documentary co-financing markets.", packType: "Documentary Fund Pack", primaryLanguage: "English" },
  { country: "International", organization: "Sheffield DocFest MeetMarket", type: "Documentary market", supports: "Documentary projects pitched to commissioners", stage: "Development/Production", fundingForm: "Market access", eligibility: "Selected documentary teams", officialSite: "https://www.sheffdocfest.com/marketplace/meetmarket", notes: "Selected via open call each year.", packType: "Documentary Fund Pack", primaryLanguage: "English" },
  { country: "International", organization: "Tribeca Film Institute / Tribeca All Access (where active)", type: "Lab / fund", supports: "Underrepresented voices in narrative and documentary", stage: "Development", fundingForm: "Grant / lab", eligibility: "Open by call cycle; verify current programmes", officialSite: "https://tribecafilm.com/festival/about", notes: "Programme line-up changes year to year — verify current open calls.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "International", organization: "Documentary Campus Masterschool", type: "Lab / market", supports: "European documentary makers training and pitching", stage: "Development", fundingForm: "Lab", eligibility: "Documentary teams via open call", officialSite: "https://www.documentary-campus.com", notes: "Annual masterschool with industry showcase.", packType: "Documentary Fund Pack", primaryLanguage: "English" },

  /* ── North America — United States ──────────────────────────────── */
  { country: "United States", organization: "National Endowment for the Arts (NEA)", type: "Federal cultural agency", supports: "Media arts including film and television", stage: "Development/Production", fundingForm: "Grant", eligibility: "U.S. nonprofits with 501(c)(3) status", officialSite: "https://www.arts.gov/grants/grants-for-arts-projects/media-arts", notes: "NEA Media Arts category covers film, video, and digital media.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "United States", organization: "PBS / POV / American Documentary", type: "Public broadcaster strand", supports: "Independent feature documentaries", stage: "Production/Post-production/Acquisition", fundingForm: "Co-production / acquisition", eligibility: "Independent documentary filmmakers", officialSite: "https://www.pbs.org/pov", notes: "POV is the longest-running showcase for indie documentary on U.S. TV.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "United States", organization: "Sundance Institute Feature Film Program", type: "Lab / fund", supports: "Independent narrative features (labs + grants)", stage: "Development/Production", fundingForm: "Grant / lab", eligibility: "Emerging independent narrative directors", officialSite: "https://www.sundance.org/programs/feature-film", notes: "Annual Screenwriters Lab and Directors Lab plus production grants.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "United States", organization: "Film Independent Artist Development", type: "Lab / fellowship", supports: "Diverse U.S. and international filmmakers", stage: "Development", fundingForm: "Lab / fellowship", eligibility: "Open submissions to specific labs", officialSite: "https://www.filmindependent.org/programs/artist-development", notes: "Project Involve, Producing Lab, Directing Lab, etc.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "United States", organization: "Vision Maker Media", type: "Public-interest fund", supports: "Native American film and television projects", stage: "Development/Production", fundingForm: "Grant", eligibility: "Native American producers", officialSite: "https://visionmakermedia.org", notes: "CPB-funded; supports Native voices in public media.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "United States", organization: "Firelight Media Documentary Lab", type: "Documentary fellowship", supports: "Documentary filmmakers of color", stage: "Development/Production", fundingForm: "Fellowship / grant", eligibility: "Emerging BIPOC documentary directors", officialSite: "https://www.firelightmedia.tv/programs", notes: "Multi-year fellowship + grants.", packType: "Documentary Fund Pack", primaryLanguage: "English" },
  { country: "United States (California)", organization: "California Film Commission — Film & TV Tax Credit", type: "State tax incentive", supports: "Feature films, TV series, recurring TV, indie features", stage: "Production", fundingForm: "Tax credit", eligibility: "California production spend", officialSite: "https://film.ca.gov/tax-credit", notes: "Program 3.0 / 4.0 — verify current allocation cycle.", packType: "Tax Incentive Pack", primaryLanguage: "English" },
  { country: "United States (New York)", organization: "NY State Film Tax Credit (Empire State Development)", type: "State tax incentive", supports: "Film and TV productions filming in New York State", stage: "Production/Post-production", fundingForm: "Tax credit", eligibility: "Qualified NY production / post-production spend", officialSite: "https://esd.ny.gov/film-tax-credit-program", notes: "Separate post-production credit available.", packType: "Tax Incentive Pack", primaryLanguage: "English" },
  { country: "United States (Georgia)", organization: "Georgia Film Office — Entertainment Industry Investment Act", type: "State tax incentive", supports: "Feature films, TV, commercials, music videos", stage: "Production", fundingForm: "Transferable tax credit", eligibility: "Min spend in Georgia", officialSite: "https://www.georgia.org/industries/film-entertainment", notes: "Up to 30% transferable credit including GA logo bump.", packType: "Tax Incentive Pack", primaryLanguage: "English" },
  { country: "United States (New Mexico)", organization: "New Mexico Film Office Production Tax Credit", type: "State tax incentive", supports: "Film, TV, post-production", stage: "Production/Post-production", fundingForm: "Refundable tax credit", eligibility: "NM-qualified spend", officialSite: "https://nmfilm.com/incentives", notes: "Uplifts available for rural production.", packType: "Tax Incentive Pack", primaryLanguage: "English" },
  { country: "United States (Louisiana)", organization: "Louisiana Entertainment — Motion Picture Production Program", type: "State tax incentive", supports: "Feature films, TV series, web series", stage: "Production", fundingForm: "Tax credit", eligibility: "Min Louisiana spend", officialSite: "https://www.louisianaentertainment.gov/film/motion-picture-production-program", notes: "Project caps and program caps apply.", packType: "Tax Incentive Pack", primaryLanguage: "English" },
  { country: "United States (Illinois)", organization: "Illinois Film Office — Film Production Tax Credit", type: "State tax incentive", supports: "Film and TV productions in Illinois", stage: "Production", fundingForm: "Tax credit", eligibility: "Illinois resident spend + uplifts", officialSite: "https://dceo.illinois.gov/expandrelocate/incentives/filmtax.html", notes: "Diversity uplift available.", packType: "Tax Incentive Pack", primaryLanguage: "English" },
  { country: "United States (Texas)", organization: "Texas Moving Image Industry Incentive Program", type: "State grant", supports: "Film, TV, commercials, video games filmed in Texas", stage: "Production", fundingForm: "Cash grant", eligibility: "Texas-qualified spend", officialSite: "https://gov.texas.gov/film/page/incentives", notes: "Tiered grant rates by spend bracket.", packType: "Tax Incentive Pack", primaryLanguage: "English" },

  /* ── Canada (provinces missing from existing seed) ──────────────── */
  { country: "Canada", organization: "National Film Board of Canada", type: "Federal public producer", supports: "Documentary, animation, interactive (in-house and co-production)", stage: "Development/Production", fundingForm: "In-house production / co-production", eligibility: "Canadian filmmakers", officialSite: "https://www.nfb.ca/working-with-the-nfb", notes: "NFB is a producer, not a grant programme.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "Canada (Manitoba)", organization: "Manitoba Film & Music", type: "Provincial agency", supports: "Film, TV, music in Manitoba", stage: "Development/Production", fundingForm: "Grant + tax credit", eligibility: "Manitoba production spend", officialSite: "https://mbfilmmusic.ca", notes: "Combines production fund + tax credit administration.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "Canada (Nova Scotia)", organization: "Screen Nova Scotia + NSF&TPI", type: "Provincial association / incentive", supports: "Production in Nova Scotia", stage: "Production", fundingForm: "Production incentive", eligibility: "Nova Scotia production spend", officialSite: "https://screennovascotia.com", notes: "Production incentive administered separately.", packType: "Tax Incentive Pack", primaryLanguage: "English" },
  { country: "Canada (Newfoundland & Labrador)", organization: "Newfoundland and Labrador Film Development Corporation", type: "Provincial agency", supports: "Film and TV in NL", stage: "Development/Production", fundingForm: "Equity / tax credit", eligibility: "NL production spend", officialSite: "https://nlfdc.ca", notes: "Separate equity programme + provincial tax credit.", packType: "Public Agency Pack", primaryLanguage: "English" },

  /* ── United Kingdom / Ireland ───────────────────────────────────── */
  { country: "United Kingdom", organization: "BFI Doc Society Fund", type: "Documentary fund", supports: "Independent UK documentary feature films", stage: "Development/Production/Post-production", fundingForm: "Grant", eligibility: "UK-based documentary filmmakers", officialSite: "https://docsociety.org/uk-doc-fund", notes: "BFI National Lottery funded; managed by Doc Society.", packType: "Documentary Fund Pack", primaryLanguage: "English" },
  { country: "United Kingdom (Scotland)", organization: "Screen Scotland", type: "National screen agency", supports: "Development, production, talent, broadcast content", stage: "Development/Production", fundingForm: "Grant", eligibility: "Scotland-based filmmakers / production", officialSite: "https://www.screen.scot/funding", notes: "Part of Creative Scotland.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "United Kingdom (Northern Ireland)", organization: "Northern Ireland Screen", type: "National screen agency", supports: "Production, development, animation, gaming", stage: "Development/Production", fundingForm: "Grant / equity", eligibility: "Production based in or spending in NI", officialSite: "https://www.northernirelandscreen.co.uk/funding", notes: "Multiple production funds + Irish Language Broadcast Fund.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "United Kingdom (Wales)", organization: "Ffilm Cymru Wales", type: "National screen agency", supports: "Welsh feature film and talent development", stage: "Development/Production", fundingForm: "Grant", eligibility: "Wales-based filmmakers / projects", officialSite: "https://ffilmcymruwales.com/en", notes: "BFI lottery-funded national lead.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "Ireland", organization: "Screen Ireland / Fís Éireann", type: "National screen agency", supports: "Film, TV drama, animation, documentary, talent", stage: "Development/Production/Distribution", fundingForm: "Grant / loan", eligibility: "Irish production companies / co-productions", officialSite: "https://www.screenireland.ie", notes: "National film & TV development agency.", packType: "Public Agency Pack", primaryLanguage: "English" },

  /* ── France ─────────────────────────────────────────────────────── */
  { country: "France", organization: "CNC — Centre National du Cinéma", type: "National public agency", supports: "Cinema, TV, animation, video games, immersive", stage: "Development/Production/Distribution/Exhibition", fundingForm: "Selective aid + automatic aid", eligibility: "French production / qualifying co-productions", officialSite: "https://www.cnc.fr/professionnels/aides-et-financements", notes: "Largest film funder in France.", packType: "Public Agency Pack", primaryLanguage: "French" },
  { country: "France (Île-de-France)", organization: "Région Île-de-France — Aide après réalisation / fonds de soutien", type: "Regional fund", supports: "Production filmed in Île-de-France", stage: "Production/Post-production", fundingForm: "Grant", eligibility: "Production spending in Île-de-France", officialSite: "https://www.iledefrance.fr/aide-aux-films", notes: "Several distinct schemes by format.", packType: "Public Agency Pack", primaryLanguage: "French" },
  { country: "France", organization: "ARTE France Cinéma", type: "Broadcaster co-production", supports: "Auteur-driven feature films", stage: "Development/Production", fundingForm: "Co-production investment", eligibility: "Producers in coordination with French sales/distribution", officialSite: "https://cinema.arte.tv", notes: "Subsidiary of ARTE France focused on cinema co-production.", packType: "Streamer Commission Pack", primaryLanguage: "French" },
  { country: "France (PACA)", organization: "Région Provence-Alpes-Côte d'Azur — Aide cinéma", type: "Regional fund", supports: "Production filmed in PACA region", stage: "Development/Production", fundingForm: "Grant", eligibility: "Filming in PACA region", officialSite: "https://www.maregionsud.fr/aides-et-appels-a-projets/detail/aide-au-cinema-et-a-laudiovisuel", notes: "CNC-partnered regional aid (1 € / 2 € convention).", packType: "Public Agency Pack", primaryLanguage: "French" },

  /* ── Germany (extras) ───────────────────────────────────────────── */
  { country: "Germany", organization: "FFA — German Federal Film Board", type: "National public agency", supports: "Production, distribution, exhibition, sales", stage: "Production/Distribution", fundingForm: "Grant / loan", eligibility: "Productions registered in Germany", officialSite: "https://www.ffa.de/funding.html", notes: "Self-administered industry levy.", packType: "Public Agency Pack", primaryLanguage: "German" },
  { country: "Germany", organization: "DFFF — German Federal Film Fund", type: "National incentive", supports: "Theatrical films produced in Germany", stage: "Production", fundingForm: "Production grant (rebate)", eligibility: "Min German production spend", officialSite: "https://www.dfff-ffa.de/en.html", notes: "DFFF I and DFFF II for international co-productions.", packType: "Tax Incentive Pack", primaryLanguage: "German" },
  { country: "Germany (NRW)", organization: "Film- und Medienstiftung NRW", type: "Regional fund", supports: "Film, TV, animation, games in North Rhine-Westphalia", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "NRW spend or NRW production", officialSite: "https://www.filmstiftung.de", notes: "One of Europe's largest regional film funds.", packType: "Public Agency Pack", primaryLanguage: "German" },
  { country: "Germany (Schleswig-Holstein/Hamburg)", organization: "MOIN Filmförderung Hamburg Schleswig-Holstein", type: "Regional fund", supports: "Film, TV, series, documentary", stage: "Development/Production", fundingForm: "Grant", eligibility: "Production spend in HH/SH", officialSite: "https://www.moin-filmfoerderung.de", notes: "Joint regional fund for Hamburg and Schleswig-Holstein.", packType: "Public Agency Pack", primaryLanguage: "German" },

  /* ── Nordics ────────────────────────────────────────────────────── */
  { country: "Denmark", organization: "Danish Film Institute (DFI)", type: "National screen agency", supports: "Feature film, documentary, short, talent, distribution", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Danish productions / qualifying co-productions", officialSite: "https://www.dfi.dk/en/english/funding", notes: "Major scheme + minor scheme + talent scheme.", packType: "Public Agency Pack", primaryLanguage: "Danish" },
  { country: "Sweden", organization: "Swedish Film Institute (SFI)", type: "National screen agency", supports: "Feature film, documentary, short, distribution, exhibition", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Swedish productions / qualifying co-productions", officialSite: "https://www.filminstitutet.se/en/funding", notes: "Production support, gender-equality goals.", packType: "Public Agency Pack", primaryLanguage: "Swedish" },
  { country: "Norway", organization: "Norwegian Film Institute (NFI)", type: "National screen agency", supports: "Feature film, documentary, series, talent", stage: "Development/Production/Distribution", fundingForm: "Grant + production incentive", eligibility: "Norwegian productions / qualifying co-productions", officialSite: "https://www.nfi.no/eng/grants", notes: "Includes production incentive scheme separate from selective aid.", packType: "Public Agency Pack", primaryLanguage: "Norwegian" },
  { country: "Finland", organization: "Finnish Film Foundation (SES)", type: "National screen agency", supports: "Feature film, documentary, short film, distribution", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Finnish productions / qualifying co-productions", officialSite: "https://ses.fi/en", notes: "Statutory state-supported foundation.", packType: "Public Agency Pack", primaryLanguage: "Finnish" },
  { country: "Iceland", organization: "Icelandic Film Centre", type: "National screen agency", supports: "Development, production, post, distribution", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Icelandic productions / qualifying co-productions", officialSite: "https://www.icelandicfilmcentre.is", notes: "Operates alongside the separate national reimbursement scheme.", packType: "Public Agency Pack", primaryLanguage: "Icelandic" },
  { country: "Nordic", organization: "Nordisk Film & TV Fond", type: "Regional co-production fund", supports: "Nordic film, drama series, documentary", stage: "Production/Distribution", fundingForm: "Grant / loan", eligibility: "Nordic productions with broadcaster / distributor attached", officialSite: "https://nordiskfilmogtvfond.com", notes: "Five Nordic film institutes + broadcasters.", packType: "Co-Production Fund Pack", primaryLanguage: "English" },

  /* ── Benelux ────────────────────────────────────────────────────── */
  { country: "Netherlands", organization: "Netherlands Film Fund", type: "National screen agency", supports: "Feature, documentary, animation, short, talent", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Dutch producers / qualifying co-productions", officialSite: "https://www.filmfonds.nl/page/129/regulations", notes: "Several support schemes + production incentive.", packType: "Public Agency Pack", primaryLanguage: "Dutch" },
  { country: "Belgium (Flanders)", organization: "Flanders Audiovisual Fund (VAF)", type: "Regional public fund", supports: "Film, TV, gaming, immersive", stage: "Development/Production", fundingForm: "Grant", eligibility: "Flemish producers / qualifying co-productions", officialSite: "https://www.vaf.be/en", notes: "Film, Media, Gaming pillars.", packType: "Public Agency Pack", primaryLanguage: "Dutch" },
  { country: "Belgium (Flanders)", organization: "Screen Flanders", type: "Regional economic fund", supports: "Audiovisual production spending in Flanders", stage: "Production", fundingForm: "Conditional advance / loan", eligibility: "Production spend in Flanders region", officialSite: "https://www.screenflanders.be/en", notes: "Operated by VLAIO + VAF.", packType: "Tax Incentive Pack", primaryLanguage: "Dutch" },
  { country: "Belgium (Wallonia)", organization: "Centre du Cinéma et de l'Audiovisuel — Fédération Wallonie-Bruxelles", type: "Regional public fund", supports: "Film, documentary, TV", stage: "Development/Production", fundingForm: "Grant", eligibility: "Producers in Wallonia-Brussels Federation", officialSite: "https://audiovisuel.cfwb.be", notes: "Selective aid + co-production support.", packType: "Public Agency Pack", primaryLanguage: "French" },
  { country: "Luxembourg", organization: "Film Fund Luxembourg", type: "National screen agency", supports: "Feature film, animation, TV, co-productions", stage: "Development/Production", fundingForm: "Grant / loan", eligibility: "Luxembourg producers / qualifying co-productions", officialSite: "https://www.filmfund.lu", notes: "Strong on animation co-production.", packType: "Public Agency Pack", primaryLanguage: "French" },

  /* ── Southern Europe ────────────────────────────────────────────── */
  { country: "Spain", organization: "ICAA — Instituto de la Cinematografía y de las Artes Audiovisuales", type: "National public agency", supports: "Feature film, documentary, short, talent, distribution", stage: "Development/Production/Distribution", fundingForm: "Grant / selective aid", eligibility: "Spanish producers / qualifying co-productions", officialSite: "https://www.cultura.gob.es/cultura/areas/cine.html", notes: "Selective + automatic aid programmes.", packType: "Public Agency Pack", primaryLanguage: "Spanish" },
  { country: "Italy", organization: "Direzione Generale Cinema e Audiovisivo — MiC", type: "National public agency", supports: "Cinema and audiovisual production, development, distribution", stage: "Development/Production/Distribution", fundingForm: "Grant / tax credit", eligibility: "Italian productions / qualifying co-productions", officialSite: "https://cinema.cultura.gov.it", notes: "Includes selective contributions and tax credit.", packType: "Public Agency Pack", primaryLanguage: "Italian" },
  { country: "Italy", organization: "Istituto Luce Cinecittà", type: "Public producer / promoter", supports: "Italian cinema international promotion + co-production", stage: "Development/Production/Distribution", fundingForm: "Co-production / promotion", eligibility: "Italian and co-production projects", officialSite: "https://www.cinecittaluce.it", notes: "Linked to MiC; runs Italian Pavilion at major festivals.", packType: "Public Agency Pack", primaryLanguage: "Italian" },
  { country: "Greece", organization: "Greek Film Centre (EKK)", type: "National screen agency", supports: "Feature film, documentary, short, talent", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Greek productions / qualifying co-productions", officialSite: "https://www.gfc.gr/en", notes: "Operates alongside national 35 % cash rebate.", packType: "Public Agency Pack", primaryLanguage: "Greek" },
  { country: "Croatia", organization: "Croatian Audiovisual Centre (HAVC)", type: "National screen agency", supports: "Feature film, documentary, animation, short, distribution", stage: "Development/Production/Distribution", fundingForm: "Grant + cash rebate", eligibility: "Croatian productions / qualifying co-productions", officialSite: "https://www.havc.hr/eng", notes: "Operates national 25–30 % cash rebate.", packType: "Public Agency Pack", primaryLanguage: "Croatian" },
  { country: "Slovenia", organization: "Slovenian Film Centre", type: "National screen agency", supports: "Feature film, documentary, animation, talent", stage: "Development/Production/Distribution", fundingForm: "Grant + cash rebate", eligibility: "Slovenian productions / qualifying co-productions", officialSite: "https://www.film-center.si/en", notes: "Operates national cash rebate scheme.", packType: "Public Agency Pack", primaryLanguage: "Slovenian" },
  { country: "Serbia", organization: "Film Center Serbia", type: "National screen agency", supports: "Feature, documentary, short, animation", stage: "Development/Production", fundingForm: "Grant + cash rebate", eligibility: "Serbian productions / qualifying co-productions", officialSite: "https://www.fcs.rs/en", notes: "Coordinates with national 25–30 % rebate.", packType: "Public Agency Pack", primaryLanguage: "Serbian" },
  { country: "Bulgaria", organization: "Bulgarian National Film Center", type: "National screen agency", supports: "Feature, documentary, animation, short", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Bulgarian productions / qualifying co-productions", officialSite: "https://nfc.bg/en", notes: "Operates alongside national cash rebate scheme.", packType: "Public Agency Pack", primaryLanguage: "Bulgarian" },

  /* ── Central / Eastern Europe ───────────────────────────────────── */
  { country: "Poland", organization: "Polish Film Institute", type: "National screen agency", supports: "Feature, documentary, animation, short, distribution", stage: "Development/Production/Distribution", fundingForm: "Grant + cash rebate", eligibility: "Polish productions / qualifying co-productions", officialSite: "https://pisf.pl/en", notes: "Operates national 30 % cash rebate.", packType: "Public Agency Pack", primaryLanguage: "Polish" },
  { country: "Czech Republic", organization: "Czech Film Fund", type: "National screen agency", supports: "Development, production, distribution, festivals", stage: "Development/Production/Distribution", fundingForm: "Grant + cash rebate", eligibility: "Czech productions / qualifying co-productions", officialSite: "https://fondkinematografie.cz/en", notes: "Operates national film industry rebate.", packType: "Public Agency Pack", primaryLanguage: "Czech" },
  { country: "Slovakia", organization: "Slovak Audiovisual Fund", type: "National screen agency", supports: "Feature, documentary, animation, distribution, festivals", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Slovak productions / qualifying co-productions", officialSite: "https://www.avf.sk/en", notes: "Operates alongside national 33 % cash rebate.", packType: "Public Agency Pack", primaryLanguage: "Slovak" },
  { country: "Lithuania", organization: "Lithuanian Film Centre", type: "National screen agency", supports: "Feature, documentary, animation, short, talent", stage: "Development/Production/Distribution", fundingForm: "Grant + tax incentive", eligibility: "Lithuanian productions / qualifying co-productions", officialSite: "https://www.lkc.lt/en", notes: "Operates national tax incentive scheme.", packType: "Public Agency Pack", primaryLanguage: "Lithuanian" },

  /* ── Australia / NZ (state extras) ──────────────────────────────── */
  { country: "Australia (Tasmania)", organization: "Screen Tasmania", type: "State agency", supports: "Tasmanian film, TV, online content", stage: "Development/Production", fundingForm: "Grant", eligibility: "Tasmanian creatives / production", officialSite: "https://www.screen.tas.gov.au", notes: "Several rolling production funds.", packType: "Public Agency Pack", primaryLanguage: "English" },

  /* ── East Asia ──────────────────────────────────────────────────── */
  { country: "South Korea", organization: "Korean Film Council (KOFIC)", type: "National screen agency", supports: "Production, distribution, international promotion, training", stage: "Development/Production/Distribution", fundingForm: "Grant / loan", eligibility: "Korean productions / qualifying co-productions", officialSite: "https://eng.kofic.or.kr", notes: "Multi-stream support including international co-productions.", packType: "Public Agency Pack", primaryLanguage: "Korean" },
  { country: "South Korea", organization: "Busan Asian Cinema Fund / Asian Project Market", type: "Festival fund / market", supports: "Asian feature film projects", stage: "Development/Post-production", fundingForm: "Grant / market", eligibility: "Asian directors and producers", officialSite: "https://www.asianfilmmarket.org", notes: "Includes Script Development Fund and Post-Production Fund.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "Japan", organization: "Agency for Cultural Affairs — Japanese Film Production Support", type: "Government cultural agency", supports: "Japanese feature films and documentaries", stage: "Production", fundingForm: "Grant", eligibility: "Japanese producers", officialSite: "https://www.bunka.go.jp/english/", notes: "Bunka-cho administers cultural-affairs support including film.", packType: "Public Agency Pack", primaryLanguage: "Japanese" },
  { country: "Japan", organization: "Tokyo Gap-Financing Market (TIFFCOM)", type: "Market", supports: "International gap financing for selected projects", stage: "Production", fundingForm: "Market access", eligibility: "Selected projects via open call", officialSite: "https://2024.tiffcom.jp/en/tgfm", notes: "Held during TIFFCOM in Tokyo.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "Taiwan", organization: "Taiwan Creative Content Agency (TAICCA)", type: "Public agency", supports: "Film, TV, animation, comics, games, music", stage: "Development/Production/Distribution", fundingForm: "Investment / grant", eligibility: "Taiwanese content companies / co-productions", officialSite: "https://taicca.tw/en", notes: "Includes International Co-Funding Program.", packType: "Public Agency Pack", primaryLanguage: "Mandarin" },
  { country: "Hong Kong", organization: "Create Hong Kong / Film Development Fund", type: "Government film fund", supports: "Local feature films, talent development, market access", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Hong Kong production companies", officialSite: "https://www.fdc.gov.hk/en/funding/funding.htm", notes: "Multiple schemes including First Feature Film Initiative.", packType: "Public Agency Pack", primaryLanguage: "English" },

  /* ── South / Southeast Asia ─────────────────────────────────────── */
  { country: "Philippines", organization: "Film Development Council of the Philippines (FDCP)", type: "National screen agency", supports: "Production, training, festivals, distribution", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Filipino producers", officialSite: "https://fdcp.ph", notes: "Includes FilmPhilippines incentive desk.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "Thailand", organization: "Thailand Film Office — Production Incentive", type: "National incentive", supports: "International film, TV, streaming productions", stage: "Production", fundingForm: "Cash rebate", eligibility: "Min Thai production spend", officialSite: "https://thailandfilmoffice.go.th", notes: "Cash rebate scheme administered by Department of Tourism.", packType: "Tax Incentive Pack", primaryLanguage: "English" },
  { country: "Malaysia", organization: "FINAS — National Film Development Corporation Malaysia", type: "National screen agency", supports: "Local film + Film in Malaysia Incentive (FIMI)", stage: "Production", fundingForm: "Grant + cash rebate", eligibility: "Malaysian producers / international productions filming in Malaysia", officialSite: "https://www.finas.gov.my/en/film-in-malaysia-incentive-fimi", notes: "30 % cash rebate via FIMI.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "India", organization: "NFDC India / Film Facilitation Office", type: "National screen agency", supports: "Indian film production + international shooting facilitation", stage: "Development/Production", fundingForm: "Grant + incentive", eligibility: "Indian productions + international productions filming in India", officialSite: "https://nfdcindia.com", notes: "FFO administers single-window clearance + national incentive.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "India", organization: "NFDC Film Bazaar Co-Production Market", type: "Market", supports: "South Asian and international co-production projects", stage: "Development/Production", fundingForm: "Market access", eligibility: "Selected projects via open call", officialSite: "https://nfdcfilmbazaar.com", notes: "Held annually alongside IFFI Goa.", packType: "Market/Lab Pack", primaryLanguage: "English" },

  /* ── Middle East / North Africa (extras) ────────────────────────── */
  { country: "Saudi Arabia", organization: "Red Sea Fund (Red Sea International Film Festival)", type: "Festival fund", supports: "Arab and African feature film, documentary, short, animation", stage: "Development/Production/Post-production", fundingForm: "Grant", eligibility: "Arab and African filmmakers", officialSite: "https://redseafilmfest.com/en/redseafund", notes: "Multiple yearly cycles.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "Saudi Arabia", organization: "Saudi Film Commission — Daw'i / Production Incentive", type: "Government film commission", supports: "Saudi and international films/series shooting in KSA", stage: "Production", fundingForm: "Cash rebate / grant", eligibility: "KSA-qualified production spend", officialSite: "https://film.moc.gov.sa/en", notes: "40 % production cash rebate scheme.", packType: "Tax Incentive Pack", primaryLanguage: "English" },
  { country: "United Arab Emirates", organization: "Abu Dhabi Film Commission — Production Rebate", type: "Government incentive", supports: "Films, TV, web series shooting in Abu Dhabi", stage: "Production", fundingForm: "Cash rebate", eligibility: "Abu Dhabi-qualified spend", officialSite: "https://film.gov.ae", notes: "Up to 30 % cash-back rebate.", packType: "Tax Incentive Pack", primaryLanguage: "English" },
  { country: "United Arab Emirates", organization: "Dubai Film and TV Commission", type: "Government film commission", supports: "Permits, locations, facilitation in Dubai", stage: "Production", fundingForm: "Facilitation", eligibility: "Productions filming in Dubai", officialSite: "https://film.dubai", notes: "Facilitation desk; check current incentive partners.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "Jordan", organization: "Royal Film Commission – Jordan", type: "Government film commission", supports: "Local + international productions in Jordan", stage: "Development/Production", fundingForm: "Grant + cash rebate", eligibility: "Jordan-qualified spend", officialSite: "https://film.jo", notes: "Operates national cash rebate up to 25 %.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "MENA", organization: "AFAC — Arab Fund for Arts and Culture (Cinema Programs)", type: "Regional cultural fund", supports: "Arab cinema: documentary and narrative", stage: "Development/Production/Post-production", fundingForm: "Grant", eligibility: "Arab filmmakers", officialSite: "https://www.arabculturefund.org", notes: "Includes Arab Documentary Film Program with IDFA Bertha and Sundance.", packType: "Public Agency Pack", primaryLanguage: "Arabic" },
  { country: "Morocco", organization: "Atlas Workshops (Marrakech International Film Festival)", type: "Festival lab / market", supports: "Arab and African feature projects + post-production", stage: "Development/Post-production", fundingForm: "Lab / award", eligibility: "Arab and African filmmakers", officialSite: "https://en.festivalmarrakech.info/atlas-workshops", notes: "Selected each year via open call.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "Tunisia", organization: "CNCI — Centre National du Cinéma et de l'Image (Tunisia)", type: "National screen agency", supports: "Tunisian film and audiovisual sector", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Tunisian producers", officialSite: "https://www.cnci.tn", notes: "National ministerial film centre.", packType: "Public Agency Pack", primaryLanguage: "Arabic" },

  /* ── Israel — required country coverage ─────────────────────────── *
   * The existing seed already contains 4 Israel rows:
   *   Israel Film Fund, Rabinovich Foundation - Cinema Project,
   *   New Fund for Cinema and Television, Gesher Multicultural Film Fund.
   * We add the remaining required Israeli sources from the brief.
   * Country = "Israel" exactly. Notes are neutral and funding-focused.
   */
  { country: "Israel", organization: "Makor Foundation for Israeli Films", type: "Public-interest film fund", supports: "Feature film script development, production, post-production", stage: "Development/Production/Post-production", fundingForm: "Grant", eligibility: "Israeli writers, directors, producers", officialSite: "https://makorfund.co.il", notes: "One of the five statutory Israeli cinema funds; supports first-time and established filmmakers.", packType: "Standard Film Fund Pack", primaryLanguage: "Hebrew" },
  { country: "Israel", organization: "Yehoshua Rabinovich Tel Aviv Foundation for the Arts — Cinema Project", type: "Municipal arts foundation", supports: "Feature film, documentary, short film", stage: "Development/Production", fundingForm: "Grant", eligibility: "Israeli filmmakers (priority for Tel Aviv-Yafo residents in some cycles)", officialSite: "https://www.rabinovichfoundation.org.il", notes: "Tel Aviv-Yafo municipal foundation supporting Israeli cinema across multiple programmes.", packType: "Standard Film Fund Pack", primaryLanguage: "Hebrew" },
  { country: "Israel", organization: "Jerusalem Film & Television Fund", type: "Regional film fund", supports: "Productions filming in Jerusalem and the surrounding region", stage: "Development/Production", fundingForm: "Grant", eligibility: "Israeli productions filming in Jerusalem region", officialSite: "https://www.jer-cin.org.il", notes: "Operated under the Jerusalem Cinematheque – Israel Film Archive.", packType: "Standard Film Fund Pack", primaryLanguage: "Hebrew" },
  { country: "Israel", organization: "Haifa Film Fund", type: "Regional film fund", supports: "Productions filming in Haifa and northern Israel", stage: "Development/Production", fundingForm: "Grant", eligibility: "Israeli productions with Haifa-region shoot or post", officialSite: "https://www.haifa-film.co.il", notes: "Linked to the Haifa International Film Festival; check current call cycles.", packType: "Standard Film Fund Pack", primaryLanguage: "Hebrew" },
  { country: "Israel", organization: "Israel Film Council — Ministry of Culture and Sport", type: "Government film council", supports: "Statutory cinema law support across the recognised film funds + policy", stage: "Development/Production/Distribution", fundingForm: "Public budget allocation", eligibility: "Operates via the recognised Israeli cinema funds", officialSite: "https://www.gov.il/en/departments/ministry_of_culture_and_sport", notes: "Allocates the statutory cinema budget to the recognised funds; also funds initiatives directly via the Ministry.", packType: "Public Agency Pack", primaryLanguage: "Hebrew" },
  { country: "Israel", organization: "Sam Spiegel International Film Lab", type: "International script lab", supports: "Feature film scripts (international, multi-language)", stage: "Development", fundingForm: "Lab + grant", eligibility: "Selected international screenwriters and director-writers", officialSite: "https://www.spiegellab.com", notes: "Year-long script lab based at the Sam Spiegel Film & TV School in Jerusalem.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "Israel", organization: "CoPro — Documentary Marketing Foundation", type: "Documentary market / forum", supports: "Israeli and international documentary projects", stage: "Development/Production", fundingForm: "Pitching forum / market", eligibility: "Selected projects via annual open call", officialSite: "https://copro.co.il", notes: "Annual CoPro pitching forum brings international commissioners to Tel Aviv.", packType: "Documentary Fund Pack", primaryLanguage: "English" },
  { country: "Israel", organization: "Docaviv Industry — Tel Aviv International Documentary Film Festival", type: "Festival industry / market", supports: "Israeli documentary projects (selected)", stage: "Development/Post-production", fundingForm: "Awards / market access", eligibility: "Selected Israeli documentary projects", officialSite: "https://www.docaviv.co.il/en", notes: "Industry programme runs alongside the Docaviv festival each spring.", packType: "Documentary Fund Pack", primaryLanguage: "English" },

  /* ── Africa ─────────────────────────────────────────────────────── */
  { country: "South Africa", organization: "National Film and Video Foundation (NFVF)", type: "National screen agency", supports: "Development, production, distribution, education", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "South African filmmakers and production companies", officialSite: "https://nfvf.co.za", notes: "Statutory body funded by the Department of Sport, Arts and Culture.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "South Africa (KZN)", organization: "KwaZulu-Natal Film Commission", type: "Provincial film commission", supports: "Productions in KwaZulu-Natal", stage: "Development/Production", fundingForm: "Grant / facilitation", eligibility: "KZN-based productions or partnerships", officialSite: "https://www.kwazulunatalfilm.co.za", notes: "Provincial public entity.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "South Africa (Gauteng)", organization: "Gauteng Film Commission", type: "Provincial film commission", supports: "Productions in Gauteng", stage: "Development/Production", fundingForm: "Grant / facilitation", eligibility: "Gauteng-based productions or partnerships", officialSite: "https://www.gautengfilm.org.za", notes: "Provincial public entity.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "Senegal", organization: "FOPICA — Fonds de Promotion de l'Industrie Cinématographique et Audiovisuelle", type: "National film fund", supports: "Senegalese cinema and audiovisual production", stage: "Development/Production/Post-production", fundingForm: "Grant", eligibility: "Senegalese filmmakers and producers", officialSite: "https://www.culture.gouv.sn", notes: "Administered under the Ministry of Culture.", packType: "Public Agency Pack", primaryLanguage: "French" },
  { country: "Rwanda", organization: "Rwanda Film Office (RDB)", type: "Government film commission", supports: "Local + international productions in Rwanda", stage: "Production", fundingForm: "Facilitation", eligibility: "Productions filming in Rwanda", officialSite: "https://rdb.rw", notes: "Located within the Rwanda Development Board.", packType: "Public Agency Pack", primaryLanguage: "English" },
  { country: "International (Africa)", organization: "Durban FilmMart", type: "Co-production market", supports: "African feature film and documentary projects", stage: "Development/Production", fundingForm: "Market access", eligibility: "African projects via annual open call", officialSite: "https://durbanfilmmart.co.za", notes: "Joint initiative of Durban International Film Festival and Durban Film Office.", packType: "Market/Lab Pack", primaryLanguage: "English" },
  { country: "International (Africa)", organization: "Realness Institute — Episodic Lab / Screenwriters' Residency", type: "Lab / residency", supports: "African screenwriters and directors", stage: "Development", fundingForm: "Lab / residency", eligibility: "African filmmakers via open call", officialSite: "https://realness.institute", notes: "Multi-programme institute supporting African storytelling.", packType: "Market/Lab Pack", primaryLanguage: "English" },

  /* ── Latin America / Caribbean ──────────────────────────────────── */
  { country: "Brazil", organization: "Fundo Setorial do Audiovisual (FSA / ANCINE)", type: "National sector fund", supports: "Brazilian audiovisual production, distribution, exhibition, infrastructure", stage: "Development/Production/Distribution", fundingForm: "Grant / equity / loan", eligibility: "Brazilian audiovisual companies", officialSite: "https://www.gov.br/ancine/pt-br/acesso-a-informacao/acoes-e-programas/fsa", notes: "Largest Brazilian sector fund, administered by ANCINE.", packType: "Public Agency Pack", primaryLanguage: "Portuguese" },
  { country: "Chile", organization: "Fondo Audiovisual — Ministerio de las Culturas, las Artes y el Patrimonio", type: "National public fund", supports: "Chilean audiovisual production, training, distribution, exhibition", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Chilean producers / qualifying co-productions", officialSite: "https://www.cultura.gob.cl/fondos/fondo-audiovisual", notes: "Annual open call; multiple categories.", packType: "Public Agency Pack", primaryLanguage: "Spanish" },
  { country: "Colombia", organization: "Proimágenes Colombia — Fondo para el Desarrollo Cinematográfico (FDC)", type: "National public fund", supports: "Colombian feature film, documentary, short, distribution", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Colombian producers / qualifying co-productions", officialSite: "https://www.proimagenescolombia.com/secciones/fdc", notes: "Operates alongside CINA / FILMA cash-rebate schemes.", packType: "Public Agency Pack", primaryLanguage: "Spanish" },
  { country: "Mexico", organization: "IMCINE — Instituto Mexicano de Cinematografía", type: "National screen agency", supports: "Feature film, documentary, short, talent, distribution", stage: "Development/Production/Distribution", fundingForm: "Grant", eligibility: "Mexican producers / qualifying co-productions", officialSite: "https://www.imcine.gob.mx", notes: "Administers Foprocine, Fidecine and other federal cinema funds.", packType: "Public Agency Pack", primaryLanguage: "Spanish" },
  { country: "Mexico", organization: "EFICINE — Estímulo Fiscal a la Industria Cinematográfica", type: "Federal tax incentive", supports: "Mexican feature film, distribution and exhibition", stage: "Production/Distribution", fundingForm: "Tax incentive", eligibility: "Eligible Mexican audiovisual projects", officialSite: "https://www.imcine.gob.mx/cine-mexicano/eficine-produccion", notes: "Tax-incentive scheme run by SHCP via IMCINE.", packType: "Tax Incentive Pack", primaryLanguage: "Spanish" },
  { country: "Uruguay", organization: "ICAU — Instituto del Cine y el Audiovisual del Uruguay", type: "National screen agency", supports: "Uruguayan film and audiovisual production", stage: "Development/Production/Distribution", fundingForm: "Grant + Programa Uruguay Audiovisual incentive", eligibility: "Uruguayan producers / qualifying co-productions", officialSite: "https://www.icau.mec.gub.uy", notes: "Administers PUA cash rebate alongside selective grants.", packType: "Public Agency Pack", primaryLanguage: "Spanish" },
  { country: "Peru", organization: "DAFO — Dirección del Audiovisual, la Fonografía y los Nuevos Medios", type: "National public agency", supports: "Peruvian feature film, documentary, short", stage: "Development/Production", fundingForm: "Grant", eligibility: "Peruvian producers / qualifying co-productions", officialSite: "https://dafo.cultura.pe", notes: "Part of the Peruvian Ministry of Culture.", packType: "Public Agency Pack", primaryLanguage: "Spanish" },
  { country: "Costa Rica", organization: "El Fauno / Proartes — Fondo El Fauno", type: "National cultural fund", supports: "Costa Rican audiovisual development, production, post", stage: "Development/Production/Post-production", fundingForm: "Grant", eligibility: "Costa Rican producers / qualifying co-productions", officialSite: "https://www.centrodecine.go.cr/fauno", notes: "Operated by Centro Costarricense de Producción Cinematográfica.", packType: "Public Agency Pack", primaryLanguage: "Spanish" },
  { country: "Dominican Republic", organization: "DGCINE — Dirección General de Cine (Dominican Republic)", type: "National public agency", supports: "Dominican audiovisual sector + transferable tax credit (Law 108-10)", stage: "Development/Production", fundingForm: "Grant + transferable tax credit", eligibility: "Dominican productions / qualifying co-productions or international productions filming locally", officialSite: "https://www.dgcine.gob.do", notes: "Law 108-10 provides a 25 % transferable tax credit.", packType: "Tax Incentive Pack", primaryLanguage: "Spanish" },
  { country: "Ibero-America", organization: "Programa Ibermedia", type: "Regional co-production fund", supports: "Ibero-American co-productions, development, distribution, training", stage: "Development/Production/Distribution", fundingForm: "Grant / loan", eligibility: "Producers from member countries", officialSite: "https://www.programaibermedia.com", notes: "23 member countries across Latin America, Spain, Portugal and Italy.", packType: "Co-Production Fund Pack", primaryLanguage: "Spanish" },
];

/* ───────────────────────────────────────────────────────────────────── *
 * SQL helpers
 * ───────────────────────────────────────────────────────────────────── */

function sqlEscape(value: string | undefined | null): string {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function defaultPackType(row: FundingRow): string {
  if (row.packType) return row.packType;
  const t = (row.type || "").toLowerCase();
  if (t.includes("tax") || t.includes("incentive") || t.includes("rebate")) return "Tax Incentive Pack";
  if (t.includes("documentary")) return "Documentary Fund Pack";
  if (t.includes("co-production")) return "Co-Production Fund Pack";
  if (t.includes("market") || t.includes("lab") || t.includes("residency")) return "Market/Lab Pack";
  if (t.includes("streamer") || t.includes("broadcast")) return "Streamer Commission Pack";
  return "Public Agency Pack";
}

function defaultLanguage(row: FundingRow): string {
  if (row.primaryLanguage) return row.primaryLanguage;
  return "English";
}

function packTitle(row: FundingRow): string {
  return `${row.organization} — Application Pack`;
}

const STANDARD_LOCALIZED_SECTIONS =
  "Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures";

const STANDARD_RECOMMENDED_ATTACHMENTS =
  "Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations";

const STANDARD_TAILORING_NOTES =
  "Use for national/regional cinema agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions. Verify current open calls and cycle deadlines before applying.";

/* ───────────────────────────────────────────────────────────────────── *
 * Public seed entry point
 * ───────────────────────────────────────────────────────────────────── */

/**
 * Idempotently seed the v6.78 global film funding sources.
 *
 * Safe to call on every boot: the funding_sources table has a UNIQUE
 * INDEX on (country, organization), so INSERT IGNORE silently drops
 * duplicates without raising errors.  We additionally short-circuit
 * with a marker check on the Israel Film Fund row planted by this
 * seed to avoid running ~150 inserts on every boot.
 */
export async function seedGlobalFundingV678(db: any): Promise<void> {
  try {
    // Fast-path marker check: if the v6.78 Israel additions are already
    // present, the whole batch was already seeded; skip silently.  The
    // mysql2 driver returns [rows, fields] from db.execute, so the rows
    // array sits at index 0 of the destructured result — same pattern
    // the existing seed in autoMigrate.ts uses for its COUNT(*) check.
    const [markerRows] = (await db.execute(
      sql.raw(
        `SELECT 1 AS present FROM funding_sources WHERE country='Israel' AND organization='Makor Foundation for Israeli Films' LIMIT 1`,
      ),
    )) as any;
    const markerHit =
      Array.isArray(markerRows) && markerRows.length > 0;
    if (markerHit) {
      console.log(
        `[AutoMigrate] v6.78 global funding seed already applied — skipping (${ROWS.length} sources already present).`,
      );
      return;
    }

    let inserted = 0;
    let failed = 0;
    for (const row of ROWS) {
      const values = [
        sqlEscape(row.country),
        sqlEscape(row.organization),
        sqlEscape(row.type),
        sqlEscape(row.supports),
        sqlEscape(row.stage),
        sqlEscape(row.fundingForm),
        sqlEscape(row.eligibility),
        sqlEscape(row.officialSite),
        sqlEscape(row.notes),
        sqlEscape(defaultPackType(row)),
        sqlEscape(defaultLanguage(row)),
        sqlEscape(packTitle(row)),
        sqlEscape(STANDARD_LOCALIZED_SECTIONS),
        sqlEscape(STANDARD_RECOMMENDED_ATTACHMENTS),
        sqlEscape(STANDARD_TAILORING_NOTES),
      ].join(", ");
      try {
        await db.execute(
          sql.raw(
            `INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES (${values}, NOW(), NOW())`,
          ),
        );
        inserted++;
      } catch (err: any) {
        failed++;
        console.error(
          `[AutoMigrate] v6.78 funding insert failed for ${row.country} / ${row.organization}:`,
          err?.message ?? err,
        );
      }
    }

    const [finalCount] = (await db.execute(
      sql.raw(`SELECT COUNT(*) as cnt FROM funding_sources`),
    )) as any;
    const total =
      finalCount?.[0]?.cnt ??
      finalCount?.cnt ??
      "?";
    console.log(
      `[AutoMigrate] v6.78 global film funding seed complete — attempted ${ROWS.length} inserts (${failed} errors); funding_sources now has ${total} total rows.`,
    );
  } catch (err: any) {
    console.error(
      `[AutoMigrate] v6.78 global funding seed failed:`,
      err?.message ?? err,
    );
  }
}
