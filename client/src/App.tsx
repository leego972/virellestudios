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
import NotFound from "@/pages/NotFound";
import { useAuth } from "./_core/hooks/useAuth";

// Dashboard pages — lazy loaded
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const NewProject = lazy(() => import("./pages/NewProject"));
const Characters = lazy(() => import("./pages/Characters"));
const SceneEditor = lazy(() => import("./pages/SceneEditor"));
const Movies = lazy(() => import("./pages/Movies"));
const AdPosterMaker = lazy(() => import("./pages/AdPosterMaker"));
const CampaignManager = lazy(() => import("./pages/CampaignManager"));
const ContentCreatorPage = lazy(() => import("./pages/ContentCreatorPage"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const AdminAutonomous = lazy(() => import("./pages/AdminAutonomous"));
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

// Legal pages — lazy loaded
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const AcceptableUsePolicy = lazy(() => import("./pages/legal/AcceptableUsePolicy"));
const AIContentPolicy = lazy(() => import("./pages/legal/AIContentPolicy"));

// New public pages — lazy loaded
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
const TrailerStudio = lazy(() => import("./pages/TrailerStudio"));
const TVCommercial = lazy(() => import("./pages/TVCommercial"));

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

// ─── Suspense wrapper for lazy components ───
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// Gated page wrappers — show upgrade prompt if user's subscription doesn't include the feature
function GatedScriptWriter() { return <LazyPage><SubscriptionGate feature="Script Writer" featureKey="canUseScriptWriter" requiredTier="independent"><ScriptWriter /></SubscriptionGate></LazyPage>; }
function GatedStoryboard() { return <LazyPage><SubscriptionGate feature="Storyboard" featureKey="canUseStoryboard" requiredTier="independent"><Storyboard /></SubscriptionGate></LazyPage>; }
function GatedCreditsEditor() { return <LazyPage><SubscriptionGate feature="Credits Editor" featureKey="canUseScriptWriter" requiredTier="independent"><CreditsEditor /></SubscriptionGate></LazyPage>; }
function GatedShotList() { return <LazyPage><SubscriptionGate feature="Shot List" featureKey="canUseShotList" requiredTier="independent"><ShotList /></SubscriptionGate></LazyPage>; }
function GatedContinuityCheck() { return <LazyPage><SubscriptionGate feature="Continuity Check" featureKey="canUseContinuityCheck" requiredTier="independent"><ContinuityCheck /></SubscriptionGate></LazyPage>; }
function GatedColorGrading() { return <LazyPage><SubscriptionGate feature="Color Grading" featureKey="canUseColorGrading" requiredTier="independent"><ColorGrading /></SubscriptionGate></LazyPage>; }
function GatedLocationScout() { return <LazyPage><SubscriptionGate feature="Location Scout" featureKey="canUseLocationScout" requiredTier="independent"><LocationScout /></SubscriptionGate></LazyPage>; }
function GatedMoodBoard() { return <LazyPage><SubscriptionGate feature="Mood Board" featureKey="canUseMoodBoard" requiredTier="independent"><MoodBoard /></SubscriptionGate></LazyPage>; }
function GatedSubtitles() { return <LazyPage><SubscriptionGate feature="Subtitles" featureKey="canUseSubtitles" requiredTier="independent"><Subtitles /></SubscriptionGate></LazyPage>; }
function GatedDialogueEditor() { return <LazyPage><SubscriptionGate feature="Dialogue Editor" featureKey="canUseDialogueEditor" requiredTier="independent"><DialogueEditor /></SubscriptionGate></LazyPage>; }
function GatedBudgetEstimator() { return <LazyPage><SubscriptionGate feature="Budget Estimator" featureKey="canUseBudgetEstimator" requiredTier="independent"><BudgetEstimator /></SubscriptionGate></LazyPage>; }
function GatedSoundEffects() { return <LazyPage><SubscriptionGate feature="Sound Effects" featureKey="canUseSoundEffects" requiredTier="independent"><SoundEffects /></SubscriptionGate></LazyPage>; }
function GatedVisualEffects() { return <LazyPage><SubscriptionGate feature="Visual Effects" featureKey="canUseVisualEffects" requiredTier="industry"><VisualEffects /></SubscriptionGate></LazyPage>; }
function GatedCollaboration() { return <LazyPage><SubscriptionGate feature="Collaboration" featureKey="canUseCollaboration" requiredTier="independent"><Collaboration /></SubscriptionGate></LazyPage>; }
function GatedMultiShotSequencer() { return <LazyPage><SubscriptionGate feature="Multi-Shot Sequencer" featureKey="canUseMultiShotSequencer" requiredTier="industry"><MultiShotSequencer /></SubscriptionGate></LazyPage>; }
function GatedNLEExport() { return <LazyPage><SubscriptionGate feature="NLE Export" featureKey="canUseNLEExport" requiredTier="industry"><NLEExport /></SubscriptionGate></LazyPage>; }
function GatedVFXSuite() { return <LazyPage><SubscriptionGate feature="VFX Suite" featureKey="canUseVisualEffects" requiredTier="industry"><VFXSuite /></SubscriptionGate></LazyPage>; }
function GatedLiveActionPlate() { return <LazyPage><SubscriptionGate feature="Live Action Plate" featureKey="canUseLiveActionPlate" requiredTier="industry"><LiveActionPlate /></SubscriptionGate></LazyPage>; }
function GatedAICasting() { return <LazyPage><SubscriptionGate feature="AI Casting" featureKey="canUseAICasting" requiredTier="industry"><AICasting /></SubscriptionGate></LazyPage>; }
function GatedDirectorCut() { return <LazyPage><DirectorCut /></LazyPage>; }
function GatedTrailerStudio() { return <LazyPage><SubscriptionGate feature="Trailer Studio" featureKey="canUseFullFilmGeneration" requiredTier="independent"><TrailerStudio /></SubscriptionGate></LazyPage>; }
function GatedTVCommercial() { return <LazyPage><SubscriptionGate feature="TV Commercial Creator" featureKey="canUseAdPosterMaker" requiredTier="independent"><TVCommercial /></SubscriptionGate></LazyPage>; }

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
      <Route path="/contact">{() => <LazyPage><Contact /></LazyPage>}</Route>
      <Route path="/forgot-password">{() => <LazyPage><ForgotPassword /></LazyPage>}</Route>
      <Route path="/reset-password">{() => <LazyPage><ResetPassword /></LazyPage>}</Route>

      {/* Public blog pages (no auth required) */}
      <Route path="/blog">{() => <LazyPage><Blog /></LazyPage>}</Route>
      <Route path="/blog/:slug">{() => <LazyPage><BlogArticle /></LazyPage>}</Route>
      <Route path="/terms">{() => <LazyPage><TermsOfService /></LazyPage>}</Route>
      <Route path="/privacy">{() => <LazyPage><PrivacyPolicy /></LazyPage>}</Route>
      <Route path="/acceptable-use">{() => <LazyPage><AcceptableUsePolicy /></LazyPage>}</Route>
      <Route path="/ai-content-policy">{() => <LazyPage><AIContentPolicy /></LazyPage>}</Route>
      <Route path="/showcase">{() => <LazyPage><Showcase /></LazyPage>}</Route>
      <Route path="/how-it-works">{() => <LazyPage><HowItWorks /></LazyPage>}</Route>
      <Route path="/about">{() => <LazyPage><About /></LazyPage>}</Route>
      <Route path="/faq">{() => <LazyPage><FAQ /></LazyPage>}</Route>
      <Route path="/solutions">{() => <LazyPage><Solutions /></LazyPage>}</Route>

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
      <Route path="/projects/:projectId/trailer-studio" component={GatedTrailerStudio} />
      <Route path="/projects/:projectId/tv-commercial" component={GatedTVCommercial} />

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
              <Route path="/projects/:id/scenes">{() => <SceneEditor />}</Route>
              <Route path="/movies">{() => <Movies />}</Route>
              <Route path="/poster-maker">{() => <AdPosterMaker />}</Route>
              <Route path="/characters">{() => <Characters />}</Route>
              <Route path="/campaigns">{() => <CampaignManager />}</Route>
              <Route path="/content-creator">{() => <ContentCreatorPage />}</Route>
              <Route path="/samples">{() => <LazyPage><ProjectSamples /></LazyPage>}</Route>
              <Route path="/referrals">{() => <Referrals />}</Route>
              <Route path="/credits">{() => <LazyPage><CreditsPage /></LazyPage>}</Route>
              <Route path="/marketplace">{() => <LazyPage><AssetMarketplace /></LazyPage>}</Route>
              <Route path="/settings">{() => <SettingsPage />}</Route>
              <Route path="/admin/users">{() => <AdminUsers />}</Route>
              <Route path="/admin/security">{() => <SecurityDashboard />}</Route>
              <Route path="/admin/autonomous">{() => <LazyPage><AdminAutonomous /></LazyPage>}</Route>
              <Route path="/admin/advertising">{() => <LazyPage><AdvertisingDashboard /></LazyPage>}</Route>
              <Route path="/admin/seo">{() => <LazyPage><SeoDashboard /></LazyPage>}</Route>
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
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
