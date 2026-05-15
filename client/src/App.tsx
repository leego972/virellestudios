import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { SubscriptionGate } from "./components/SubscriptionGate";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// ─── Lazy-loaded pages (code splitting) ───
// Core pages loaded eagerly for instant navigation
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import OpenerPreview from "./pages/OpenerPreview";
import NotFound from "@/pages/NotFound";
import { useAuth } from "./_core/hooks/useAuth";
import GoldWatermarkLaunch from "./components/GoldWatermarkLaunch";
import { useContentProtection } from "./components/ContentProtection";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import CommandPaletteGlobal from "./components/CommandPaletteGlobal";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";

// Dashboard pages — lazy loaded
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const NewProject = lazy(() => import("./pages/NewProject"));
const Characters = lazy(() => import("./pages/Characters"));
// v6.77 — Per-project brand allow/block list
const ProjectBrands = lazy(() => import("./pages/ProjectBrands"));
const DesignerWardrobePage = lazy(() => import("./pages/DesignerWardrobePage"));
const SignatureCast = lazy(() => import("./pages/SignatureCast"));
const TalentSearch = lazy(() => import("./pages/TalentSearch"));
const SceneEditor = lazy(() => import("./pages/SceneEditor"));
const Movies = lazy(() => import("./pages/Movies"));
const AssistantPage = lazy(() => import("./pages/AssistantPage"));
// v6.68 — Phase 2 / Phase 5 / Phase 10 surfaces.
const ProjectCommandCenterPage = lazy(() => import("./pages/ProjectCommandCenterPage"));
const BYOKControlCenterPage = lazy(() => import("./pages/BYOKControlCenterPage"));
const PitchDeckPage = lazy(() => import("./pages/PitchDeckPage"));
// v6.69 — Phase 3 / Phase 8 surfaces.
const ScriptBreakdownWizardPage = lazy(() => import("./pages/ScriptBreakdownWizardPage"));
const AwaitingReviewPage = lazy(() => import("./pages/AwaitingReviewPage"));
const AdPosterMaker = lazy(() => import("./pages/AdPosterMaker"));
const CampaignManager = lazy(() => import("./pages/CampaignManager"));
const ContentCreatorPage = lazy(() => import("./pages/ContentCreatorPage"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminOutreach = lazy(() => import("./pages/AdminOutreach"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const AdminAutonomous = lazy(() => import("./pages/AdminAutonomous"));
const AdminGrowthDashboard = lazy(() => import("./pages/AdminGrowthDashboard"));
const AdminSignatureCast = lazy(() => import("./pages/AdminSignatureCast"));
const AdvertisingDashboard = lazy(() => import("./pages/AdvertisingDashboard"));
const SeoDashboard = lazy(() => import("./pages/SeoDashboard"));

// Auth pages — lazy loaded (less frequently visited)
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Pricing = lazy(() => import("./pages/Pricing"));

// Public pages — lazy loaded
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const Contact = lazy(() => import("./pages/Contact"));
const Showcase = lazy(() => import("./pages/Showcase"));
const SharePreview = lazy(() => import("./pages/SharePreview"));

// Legal pages — lazy loaded
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const AcceptableUsePolicy = lazy(() => import("./pages/legal/AcceptableUsePolicy"));
const AIContentPolicy = lazy(() => import("./pages/legal/AIContentPolicy"));
const IPPolicy = lazy(() => import("./pages/legal/IPPolicy"));

// New public pages — lazy loaded
const DownloadApp = lazy(() => import("./pages/DownloadApp"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const About = lazy(() => import("./pages/About"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Solutions = lazy(() => import("./pages/Solutions"));

// Dashboard feature pages — lazy loaded
const Referrals = lazy(() => import("./pages/Referrals"));
const CreditsPage = lazy(() => import("./pages/Credits"));
const ProjectSamples = lazy(() => import("./pages/ProjectSamples"));
const SettingsPage = lazy(() => import("./pages/Settings"));

// Full-screen tool pages — lazy loaded (Pro features, heavy components)
const ScriptWriter = lazy(() => import("./pages/ScriptWriter"));
const Storyboard = lazy(() => import("./pages/Storyboard"));
const CreditsEditor = lazy(() => import("./pages/CreditsEditor"));
const ShotList = lazy(() => import("./pages/ShotList"));
const ContinuityCheck = lazy(() => import("./pages/ContinuityCheck"));
const ColorGrading = lazy(() => import("./pages/ColorGrading"));
const LocationScout = lazy(() => import("./pages/LocationScout"));
const MoodBoard = lazy(() => import("./pages/MoodBoard"));
const Subtitles = lazy(() => import("./pages/Subtitles"));
const DialogueEditor = lazy(() => import("./pages/DialogueEditor"));
const BudgetEstimator = lazy(() => import("./pages/BudgetEstimator"));
const SoundEffects = lazy(() => import("./pages/SoundEffects"));
const VisualEffects = lazy(() => import("./pages/VisualEffects"));
const Collaboration = lazy(() => import("./pages/Collaboration"));
const MultiShotSequencer = lazy(() => import("./pages/MultiShotSequencer"));
const NLEExport = lazy(() => import("./pages/NLEExport"));
const VFXSuite = lazy(() => import("./pages/VFXSuite"));
const LiveActionPlate = lazy(() => import("./pages/LiveActionPlate"));
const AICasting = lazy(() => import("./pages/AICasting"));
const AssetMarketplace = lazy(() => import("./pages/AssetMarketplace"));
const DirectorCut = lazy(() => import("./pages/DirectorCut"));
const PreProductionPanel = lazy(() => import("./pages/PreProductionPanel"));
const FeatureTimeline = lazy(() => import("./pages/FeatureTimeline"));
const TrailerStudio = lazy(() => import("./pages/TrailerStudio"));
const TVCommercial = lazy(() => import("./pages/TVCommercial"));
const FundingDirectory = lazy(() => import("./pages/FundingDirectory"));
const FundingProMatch = lazy(() => import("./pages/FundingProMatch"));
const Distribute = lazy(() => import("./pages/Distribute"));
const PitchLab = lazy(() => import("./pages/PitchLab"));
const PressKit = lazy(() => import("./pages/PressKit"));
const FestivalTracker = lazy(() => import("./pages/FestivalTracker"));
const CrowdfundingHub = lazy(() => import("./pages/CrowdfundingHub"));
  const CrowdfundBrowse = lazy(() => import("./pages/Campaigns"));
  const CrowdfundCampaignPage = lazy(() => import("./pages/CampaignPage"));
const BrandOutreach = lazy(() => import("./pages/BrandOutreach"));
const ProductionOffice = lazy(() => import("./pages/ProductionOffice"));
const ProStudio = lazy(() => import("./pages/ProStudio"));
const ProStudioOps = lazy(() => import("./pages/ProStudioOps"));
const SocialCutsFactory = lazy(() => import("./pages/SocialCutsFactory"));
// v6.63 — Production Spine
const Schedule = lazy(() => import("./pages/Schedule"));
const DayOutOfDays = lazy(() => import("./pages/DayOutOfDays"));
const CallSheets = lazy(() => import("./pages/CallSheets"));
const CallSheetPrint = lazy(() => import("./pages/CallSheetPrint"));
const Contacts = lazy(() => import("./pages/Contacts"));
const BudgetTracker = lazy(() => import("./pages/Budget"));
const ActivityTimeline = lazy(() => import("./pages/ActivityTimeline"));
// v6.64 — Pro Studio additions
const Collaborators = lazy(() => import("./pages/CollaboratorsPage"));
const ScriptImport = lazy(() => import("./pages/ScriptImportPage"));
const ScriptExport = lazy(() => import("./pages/ScriptExportPage"));
const CalendarFeed = lazy(() => import("./pages/CalendarFeedPage"));
const ApprovalChain = lazy(() => import("./pages/ApprovalChainPage"));
const BudgetFringes = lazy(() => import("./pages/BudgetFringesPage"));
const AssetVersions = lazy(() => import("./pages/AssetVersionsPage"));
const Sides = lazy(() => import("./pages/SidesPage"));
const DailyReport = lazy(() => import("./pages/DailyReportPage"));
const AutoRecap = lazy(() => import("./pages/AutoRecapPage"));
const CastingBoard = lazy(() => import("./pages/CastingBoard"));
const CuttingRoom = lazy(() => import("./pages/CuttingRoom"));
const FilmPage = lazy(() => import("./pages/FilmPage"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const Collections = lazy(() => import("./pages/Collections"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const BillingPortal = lazy(() => import("./pages/BillingPortal"));
  const MusicScore = lazy(() => import("./pages/MusicScore"));
  const LegalDocs = lazy(() => import("./pages/LegalDocs"));
  const ScriptCoverage = lazy(() => import("./pages/ScriptCoverage"));
  const TaxIncentives = lazy(() => import("./pages/TaxIncentives"));
  const TableRead = lazy(() => import("./pages/TableRead"));
  const SeriesBible = lazy(() => import("./pages/SeriesBible"));
  const FilmComps = lazy(() => import("./pages/FilmComps"));
  const Equipment = lazy(() => import("./pages/Equipment"));
  const Community = lazy(() => import("./pages/Community"));

// ─── Loading fallback ───
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// ─── Suspense wrapper for lazy components with local error recovery ───
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

// Gated page wrappers — show upgrade prompt if user's subscription doesn't include the feature
// Tier key reference (3 public tiers):
//   indie        = Indie        (500 credits)    — screenplay, characters, shot list
//   amateur      = Creator      (2,000 credits)  — + video gen, voice acting, film score, export
//   independent  = Industry     (6,000 credits)  — + VFX, multi-shot, NLE export, AI casting, collaboration
// requiredTier values match the first tier where the canUse* flag is true in TIER_LIMITS (subscription.ts)
function GatedScriptWriter() { return <LazyPage><SubscriptionGate feature="Script Writer" featureKey="canUseScriptWriter" requiredTier="indie"><ScriptWriter /></SubscriptionGate></LazyPage>; }
function GatedStoryboard() { return <LazyPage><SubscriptionGate feature="Storyboard" featureKey="canUseStoryboard" requiredTier="amateur"><Storyboard /></SubscriptionGate></LazyPage>; }
function GatedCreditsEditor() { return <LazyPage><SubscriptionGate feature="Credits Editor" featureKey="canUseCreditsEditor" requiredTier="amateur"><CreditsEditor /></SubscriptionGate></LazyPage>; }
function GatedShotList() { return <LazyPage><SubscriptionGate feature="Shot List" featureKey="canUseShotList" requiredTier="indie"><ShotList /></SubscriptionGate></LazyPage>; }
function GatedContinuityCheck() { return <LazyPage><SubscriptionGate feature="Continuity Check" featureKey="canUseContinuityCheck" requiredTier="amateur"><ContinuityCheck /></SubscriptionGate></LazyPage>; }
function GatedColorGrading() { return <LazyPage><SubscriptionGate feature="Color Grading" featureKey="canUseColorGrading" requiredTier="amateur"><ColorGrading /></SubscriptionGate></LazyPage>; }
function GatedLocationScout() { return <LazyPage><SubscriptionGate feature="Location Scout" featureKey="canUseLocationScout" requiredTier="indie"><LocationScout /></SubscriptionGate></LazyPage>; }
function GatedMoodBoard() { return <LazyPage><SubscriptionGate feature="Mood Board" featureKey="canUseMoodBoard" requiredTier="indie"><MoodBoard /></SubscriptionGate></LazyPage>; }
function GatedSubtitles() { return <LazyPage><SubscriptionGate feature="Subtitles" featureKey="canUseSubtitles" requiredTier="amateur"><Subtitles /></SubscriptionGate></LazyPage>; }
function GatedDialogueEditor() { return <LazyPage><SubscriptionGate feature="Dialogue Editor" featureKey="canUseDialogueEditor" requiredTier="indie"><DialogueEditor /></SubscriptionGate></LazyPage>; }
function GatedBudgetEstimator() { return <LazyPage><SubscriptionGate feature="Budget Estimator" featureKey="canUseBudgetEstimator" requiredTier="indie"><BudgetEstimator /></SubscriptionGate></LazyPage>; }
function GatedSoundEffects() { return <LazyPage><SubscriptionGate feature="Sound Effects" featureKey="canUseSoundEffects" requiredTier="amateur"><SoundEffects /></SubscriptionGate></LazyPage>; }
function GatedVisualEffects() { return <LazyPage><SubscriptionGate feature="Visual Effects" featureKey="canUseVisualEffects" requiredTier="independent"><VisualEffects /></SubscriptionGate></LazyPage>; }
function GatedCollaboration() { return <LazyPage><SubscriptionGate feature="Collaboration" featureKey="canUseCollaboration" requiredTier="independent"><Collaboration /></SubscriptionGate></LazyPage>; }
function GatedMultiShotSequencer() { return <LazyPage><SubscriptionGate feature="Multi-Shot Sequencer" featureKey="canUseMultiShotSequencer" requiredTier="independent"><MultiShotSequencer /></SubscriptionGate></LazyPage>; }
function GatedNLEExport() { return <LazyPage><SubscriptionGate feature="NLE Export" featureKey="canUseNLEExport" requiredTier="independent"><NLEExport /></SubscriptionGate></LazyPage>; }
function GatedVFXSuite() { return <LazyPage><SubscriptionGate feature="VFX Suite" featureKey="canUseVisualEffects" requiredTier="independent"><VFXSuite /></SubscriptionGate></LazyPage>; }
function GatedLiveActionPlate() { return <LazyPage><SubscriptionGate feature="Live Action Plate" featureKey="canUseLiveActionPlate" requiredTier="independent"><LiveActionPlate /></SubscriptionGate></LazyPage>; }
function GatedAICasting() { return <LazyPage><SubscriptionGate feature="AI Casting" featureKey="canUseAICasting" requiredTier="independent"><AICasting /></SubscriptionGate></LazyPage>; }
function GatedDirectorCut() { return <LazyPage><SubscriptionGate feature="Director's Cut" featureKey="canUseDirectorAssistant" requiredTier="indie"><DirectorCut /></SubscriptionGate></LazyPage>; }
function GatedPreProductionPanel() { return <LazyPage><SubscriptionGate feature="Pre-Production Panel" featureKey="canUseLocationScout" requiredTier="indie"><PreProductionPanel /></SubscriptionGate></LazyPage>; }
function GatedFeatureTimeline() { return <LazyPage><SubscriptionGate feature="Feature Timeline" featureKey="canUseDirectorAssistant" requiredTier="indie"><FeatureTimeline /></SubscriptionGate></LazyPage>; }
function GatedTrailerStudio() { return <LazyPage><SubscriptionGate feature="Trailer Studio" featureKey="canUseFullFilmGeneration" requiredTier="amateur"><TrailerStudio /></SubscriptionGate></LazyPage>; }
function GatedTVCommercial() { return <LazyPage><SubscriptionGate feature="TV Commercial Creator" featureKey="canUseAdPosterMaker" requiredTier="independent"><TVCommercial /></SubscriptionGate></LazyPage>; }
  function GatedMusicScore() { return <LazyPage><SubscriptionGate feature="Music Score" featureKey="canUseSoundEffects" requiredTier="indie"><MusicScore /></SubscriptionGate></LazyPage>; }
  function GatedScriptCoverage() { return <LazyPage><SubscriptionGate feature="Script Coverage" featureKey="canUseScriptWriter" requiredTier="indie"><ScriptCoverage /></SubscriptionGate></LazyPage>; }
  function GatedTableRead() { return <LazyPage><SubscriptionGate feature="AI Table Read" featureKey="canUseDialogueEditor" requiredTier="indie"><TableRead /></SubscriptionGate></LazyPage>; }
  function GatedEquipment() { return <LazyPage><SubscriptionGate feature="Equipment & Props" featureKey="canUseLocationScout" requiredTier="indie"><Equipment /></SubscriptionGate></LazyPage>; }
    function GatedLegalDocs() { return <LazyPage><SubscriptionGate feature="Legal Documents" featureKey="canUseBudgetEstimator" requiredTier="indie"><LegalDocs /></SubscriptionGate></LazyPage>; }
    function GatedTaxIncentives() { return <LazyPage><SubscriptionGate feature="Tax Incentives" featureKey="canUseBudgetEstimator" requiredTier="indie"><TaxIncentives /></SubscriptionGate></LazyPage>; }
    function GatedSeriesBible() { return <LazyPage><SubscriptionGate feature="Series Bible" featureKey="canUseScriptWriter" requiredTier="indie"><SeriesBible /></SubscriptionGate></LazyPage>; }
    function GatedFilmComps() { return <LazyPage><SubscriptionGate feature="Film Comps" featureKey="canUseBudgetEstimator" requiredTier="indie"><FilmComps /></SubscriptionGate></LazyPage>; }
    function GatedCommunity() { return <LazyPage><SubscriptionGate feature="Community" featureKey="canUseDirectorAssistant" requiredTier="indie"><Community /></SubscriptionGate></LazyPage>; }

function Router() {
  return (
    <Switch>
      {/* Public landing page */}
      <Route path="/welcome" component={Landing} />

      {/* Auth pages (no layout) */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/pricing">{() => <LazyPage><Pricing /></LazyPage>}</Route>
      <Route path="/subscription">{() => <LazyPage><Pricing /></LazyPage>}</Route>
      <Route path="/billing/success">{() => <LazyPage><BillingSuccess /></LazyPage>}</Route>
      <Route path="/billing/portal">{() => <LazyPage><BillingPortal /></LazyPage>}</Route>
      <Route path="/contact">{() => <LazyPage><Contact /></LazyPage>}</Route>
      <Route path="/opener-preview">{() => <OpenerPreview />}</Route>
      <Route path="/forgot-password">{() => <LazyPage><ForgotPassword /></LazyPage>}</Route>
      <Route path="/reset-password">{() => <LazyPage><ResetPassword /></LazyPage>}</Route>

      {/* Public blog pages (no auth required) */}
      <Route path="/blog">{() => <LazyPage><Blog /></LazyPage>}</Route>
      <Route path="/blog/:slug">{() => <LazyPage><BlogArticle /></LazyPage>}</Route>
      <Route path="/terms">{() => <LazyPage><TermsOfService /></LazyPage>}</Route>
      <Route path="/privacy">{() => <LazyPage><PrivacyPolicy /></LazyPage>}</Route>
      <Route path="/acceptable-use">{() => <LazyPage><AcceptableUsePolicy /></LazyPage>}</Route>
      <Route path="/ai-content-policy">{() => <LazyPage><AIContentPolicy /></LazyPage>}</Route>
      <Route path="/ip-policy">{() => <LazyPage><IPPolicy /></LazyPage>}</Route>
      <Route path="/dmca">{() => <LazyPage><IPPolicy /></LazyPage>}</Route>
      <Route path="/showcase">{() => <LazyPage><Showcase /></LazyPage>}</Route>
      <Route path="/share/:projectId/:token">{() => <LazyPage><SharePreview /></LazyPage>}</Route>
      <Route path="/films/:slug">{() => <LazyPage><FilmPage /></LazyPage>}</Route>
      <Route path="/creators/:slug">{() => <LazyPage><CreatorProfile /></LazyPage>}</Route>
        <Route path="/crowdfund/c/:slug">{() => <LazyPage><CrowdfundCampaignPage /></LazyPage>}</Route>
        <Route path="/crowdfund/browse">{() => <LazyPage><CrowdfundBrowse /></LazyPage>}</Route>
      <Route path="/collections/:slug">{() => <LazyPage><Collections /></LazyPage>}</Route>
      <Route path="/how-it-works">{() => <LazyPage><HowItWorks /></LazyPage>}</Route>
      <Route path="/about">{() => <LazyPage><About /></LazyPage>}</Route>
      <Route path="/faq">{() => <LazyPage><FAQ /></LazyPage>}</Route>
      <Route path="/solutions">{() => <LazyPage><Solutions /></LazyPage>}</Route>
      <Route path="/download">{() => <LazyPage><DownloadApp /></LazyPage>}</Route>
      <Route path="/app">{() => <LazyPage><DownloadApp /></LazyPage>}</Route>
      <Route path="/signature-cast">{() => <LazyPage><SignatureCast /></LazyPage>}</Route>
      <Route path="/talent-search">{() => <LazyPage><TalentSearch /></LazyPage>}</Route>

      {/* Full-screen pages with subscription gates */}
      <Route path="/projects/:projectId/script/:scriptId" component={GatedScriptWriter} />
      <Route path="/projects/:projectId/script" component={GatedScriptWriter} />
      <Route path="/projects/:projectId/storyboard" component={GatedStoryboard} />
      <Route path="/projects/:projectId/credits" component={GatedCreditsEditor} />
      <Route path="/projects/:projectId/shot-list" component={GatedShotList} />
      <Route path="/projects/:projectId/continuity" component={GatedContinuityCheck} />
      <Route path="/projects/:projectId/color-grading" component={GatedColorGrading} />
      <Route path="/projects/:id/locations" component={GatedLocationScout} />
      <Route path="/projects/:id/mood-board" component={GatedMoodBoard} />
      <Route path="/projects/:id/subtitles" component={GatedSubtitles} />
      <Route path="/projects/:projectId/dialogue" component={GatedDialogueEditor} />
      <Route path="/projects/:projectId/budget" component={GatedBudgetEstimator} />
      <Route path="/projects/:id/sound-effects" component={GatedSoundEffects} />
      <Route path="/projects/:id/visual-effects" component={GatedVisualEffects} />
      <Route path="/projects/:id/collaboration" component={GatedCollaboration} />
      <Route path="/projects/:projectId/multi-shot/:sceneId" component={GatedMultiShotSequencer} />
      <Route path="/projects/:projectId/multi-shot" component={GatedMultiShotSequencer} />
      <Route path="/projects/:projectId/nle-export" component={GatedNLEExport} />
      <Route path="/projects/:projectId/vfx-suite/:sceneId" component={GatedVFXSuite} />
      <Route path="/projects/:projectId/vfx-suite" component={GatedVFXSuite} />
      <Route path="/projects/:projectId/live-action-plate" component={GatedLiveActionPlate} />
      <Route path="/projects/:projectId/ai-casting" component={GatedAICasting} />
      <Route path="/projects/:projectId/director-cut" component={GatedDirectorCut} />
      <Route path="/projects/:id/pre-production" component={GatedPreProductionPanel} />
      <Route path="/projects/:projectId/feature-timeline" component={GatedFeatureTimeline} />
      <Route path="/projects/:projectId/trailer-studio" component={GatedTrailerStudio} />
      <Route path="/projects/:projectId/tv-commercial" component={GatedTVCommercial} />
      {/* v6.63 — Printable call sheet (full-screen, no dashboard chrome) */}
      <Route path="/projects/:id/call-sheets/:dayId">{() => <LazyPage><CallSheetPrint /></LazyPage>}</Route>

      {/* Dashboard layout pages */}
      <Route>
        <DashboardLayout>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/dashboard" component={Home} />
              <Route path="/projects">{() => <Projects />}</Route>
              <Route path="/projects/new">{() => <NewProject />}</Route>
              <Route path="/projects/:id">{() => <ProjectDetail />}</Route>
              {/* v6.68 — Project Command Center, BYOK, Pitch Deck */}
              <Route path="/projects/:id/command-center">{() => <LazyPage><ProjectCommandCenterPage /></LazyPage>}</Route>
              <Route path="/projects/:projectId/pitch-deck">{() => <LazyPage><PitchDeckPage /></LazyPage>}</Route>
              <Route path="/settings/byok">{() => <LazyPage><BYOKControlCenterPage /></LazyPage>}</Route>
              {/* v6.69 — Script breakdown wizard + Awaiting review queue */}
              <Route path="/projects/:projectId/brands">{() => <LazyPage><ProjectBrands /></LazyPage>}</Route>
              {/* v6.77 — Designer Wardrobe (umbrella library) */}
              <Route path="/designer-wardrobe">{() => <LazyPage><DesignerWardrobePage /></LazyPage>}</Route>
              <Route path="/projects/:projectId/wardrobe">{() => <LazyPage><DesignerWardrobePage /></LazyPage>}</Route>
      <Route path="/projects/:projectId/script-breakdown">{() => <LazyPage><ScriptBreakdownWizardPage /></LazyPage>}</Route>
              <Route path="/awaiting-review">{() => <LazyPage><AwaitingReviewPage /></LazyPage>}</Route>
              <Route path="/projects/:id/scenes">{() => <SceneEditor />}</Route>
              <Route path="/movies">{() => <Movies />}</Route>
              <Route path="/assistant">{() => <LazyPage><AssistantPage /></LazyPage>}</Route>
              <Route path="/poster-maker">{() => <AdPosterMaker />}</Route>
              <Route path="/characters">{() => <Characters />}</Route>
              <Route path="/campaigns">{() => <CampaignManager />}</Route>
              <Route path="/content-creator">{() => <ContentCreatorPage />}</Route>
              <Route path="/samples">{() => <LazyPage><ProjectSamples /></LazyPage>}</Route>
              <Route path="/referrals">{() => <Referrals />}</Route>
              <Route path="/credits">{() => <LazyPage><CreditsPage /></LazyPage>}</Route>
              <Route path="/marketplace">{() => <LazyPage><AssetMarketplace /></LazyPage>}</Route>
              <Route path="/settings">{() => <SettingsPage />}</Route>
              <Route path="/funding">{() => <LazyPage><FundingDirectory /></LazyPage>}</Route>
              <Route path="/funding-directory">{() => <LazyPage><FundingDirectory /></LazyPage>}</Route>
              <Route path="/funding-pro">{() => <LazyPage><FundingProMatch /></LazyPage>}</Route>
              <Route path="/festivals">{() => <LazyPage><FestivalTracker /></LazyPage>}</Route>
              <Route path="/projects/:id/distribute">{() => <LazyPage><Distribute /></LazyPage>}</Route>
              <Route path="/projects/:projectId/pitch-lab">{() => <LazyPage><PitchLab /></LazyPage>}</Route>
              <Route path="/projects/:projectId/press-kit">{() => <LazyPage><PressKit /></LazyPage>}</Route>
              <Route path="/projects/:projectId/crowdfunding">{() => <LazyPage><CrowdfundingHub /></LazyPage>}</Route>
              <Route path="/projects/:projectId/brand-outreach">{() => <LazyPage><BrandOutreach /></LazyPage>}</Route>
              <Route path="/crowdfunding">{() => <LazyPage><CrowdfundingHub /></LazyPage>}</Route>
              <Route path="/brand-outreach">{() => <LazyPage><BrandOutreach /></LazyPage>}</Route>
              <Route path="/projects/:projectId/production-office">{() => <LazyPage><ProductionOffice /></LazyPage>}</Route>
              <Route path="/projects/:projectId/social-cuts">{() => <LazyPage><SocialCutsFactory /></LazyPage>}</Route>
              <Route path="/projects/:projectId/casting-board">{() => <LazyPage><CastingBoard /></LazyPage>}</Route>
              <Route path="/projects/:projectId/cutting-room">{() => <LazyPage><CuttingRoom /></LazyPage>}</Route>
              <Route path="/projects/:projectId/pro-studio">{() => <LazyPage><ProStudio /></LazyPage>}</Route>
              <Route path="/projects/:projectId/studio-ops">{() => <LazyPage><ProStudioOps /></LazyPage>}</Route>
              <Route path="/admin/users">{() => <AdminUsers />}</Route>
              <Route path="/admin/security">{() => <SecurityDashboard />}</Route>
              <Route path="/admin/autonomous">{() => <LazyPage><AdminAutonomous /></LazyPage>}</Route>
              <Route path="/admin/advertising">{() => <LazyPage><AdvertisingDashboard /></LazyPage>}</Route>
              <Route path="/admin/seo">{() => <LazyPage><SeoDashboard /></LazyPage>}</Route>
              <Route path="/admin/outreach">{() => <LazyPage><AdminOutreach /></LazyPage>}</Route>
              <Route path="/admin/growth">{() => <LazyPage><AdminGrowthDashboard /></LazyPage>}</Route>
              <Route path="/admin/signature-cast">{() => <LazyPage><AdminSignatureCast /></LazyPage>}</Route>
              {/* v6.63 — Production Spine */}
              <Route path="/projects/:id/schedule">{() => <LazyPage><Schedule /></LazyPage>}</Route>
              <Route path="/projects/:id/day-out-of-days">{() => <LazyPage><DayOutOfDays /></LazyPage>}</Route>
              <Route path="/projects/:id/call-sheets">{() => <LazyPage><CallSheets /></LazyPage>}</Route>
              <Route path="/projects/:id/contacts">{() => <LazyPage><Contacts /></LazyPage>}</Route>
              <Route path="/projects/:id/budget-tracker">{() => <LazyPage><BudgetTracker /></LazyPage>}</Route>
              <Route path="/projects/:id/activity">{() => <LazyPage><ActivityTimeline /></LazyPage>}</Route>
              {/* v6.64 — Collaboration, script i/o, calendar, audit, fringes, versioning */}
              <Route path="/projects/:id/collaborators">{() => <LazyPage><Collaborators /></LazyPage>}</Route>
              <Route path="/projects/:id/script-import">{() => <LazyPage><ScriptImport /></LazyPage>}</Route>
              <Route path="/projects/:id/script-export">{() => <LazyPage><ScriptExport /></LazyPage>}</Route>
              <Route path="/projects/:id/calendar-feed">{() => <LazyPage><CalendarFeed /></LazyPage>}</Route>
              <Route path="/projects/:id/approval-chain">{() => <LazyPage><ApprovalChain /></LazyPage>}</Route>
              <Route path="/projects/:id/budget-fringes">{() => <LazyPage><BudgetFringes /></LazyPage>}</Route>
              <Route path="/projects/:id/asset-versions">{() => <LazyPage><AssetVersions /></LazyPage>}</Route>
              <Route path="/projects/:id/sides">{() => <LazyPage><Sides /></LazyPage>}</Route>
              <Route path="/projects/:id/sides/:dayId">{() => <LazyPage><Sides /></LazyPage>}</Route>
              <Route path="/projects/:id/daily-report">{() => <LazyPage><DailyReport /></LazyPage>}</Route>
              <Route path="/projects/:id/daily-report/:dayId">{() => <LazyPage><DailyReport /></LazyPage>}</Route>
              <Route path="/projects/:id/auto-recap">{() => <LazyPage><AutoRecap /></LazyPage>}</Route>
                {/* ── New competitive-gap features ── */}
                <Route path="/projects/:id/music-score" component={GatedMusicScore} />
                <Route path="/projects/:id/coverage" component={GatedScriptCoverage} />
                <Route path="/projects/:id/table-read" component={GatedTableRead} />
                <Route path="/projects/:id/equipment" component={GatedEquipment} />
                <Route path="/legal-docs" component={GatedLegalDocs} />
                <Route path="/tax-incentives" component={GatedTaxIncentives} />
                <Route path="/series" component={GatedSeriesBible} />
                <Route path="/film-comps" component={GatedFilmComps} />
                <Route path="/community" component={GatedCommunity} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  // Global IP protection — disables right-click on media, drag-save, and screenshot shortcuts
  useContentProtection();
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <GoldWatermarkLaunch />
          <Toaster />
          <Router />
          <CommandPaletteGlobal />
          <KeyboardShortcutsHelp />
          <PWAInstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
