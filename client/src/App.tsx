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
import NotFound from "@/pages/NotFound";

// Dashboard pages — lazy loaded
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const NewProject = lazy(() => import("./pages/NewProject"));
const Characters = lazy(() => import("./pages/Characters"));
const SceneEditor = lazy(() => import("./pages/SceneEditor"));
const Movies = lazy(() => import("./pages/Movies"));
const AdPosterMaker = lazy(() => import("./pages/AdPosterMaker"));
const CampaignManager = lazy(() => import("./pages/CampaignManager"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));

// Auth pages — lazy loaded (less frequently visited)
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Pricing = lazy(() => import("./pages/Pricing"));

// Public pages — lazy loaded
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));

// Dashboard feature pages — lazy loaded
const Referrals = lazy(() => import("./pages/Referrals"));

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
function GatedScriptWriter() { return <LazyPage><SubscriptionGate feature="Script Writer" featureKey="canUseScriptWriter" requiredTier="pro"><ScriptWriter /></SubscriptionGate></LazyPage>; }
function GatedStoryboard() { return <LazyPage><SubscriptionGate feature="Storyboard" featureKey="canUseStoryboard" requiredTier="pro"><Storyboard /></SubscriptionGate></LazyPage>; }
function GatedCreditsEditor() { return <LazyPage><SubscriptionGate feature="Credits Editor" featureKey="canUseScriptWriter" requiredTier="pro"><CreditsEditor /></SubscriptionGate></LazyPage>; }
function GatedShotList() { return <LazyPage><SubscriptionGate feature="Shot List" featureKey="canUseShotList" requiredTier="pro"><ShotList /></SubscriptionGate></LazyPage>; }
function GatedContinuityCheck() { return <LazyPage><SubscriptionGate feature="Continuity Check" featureKey="canUseContinuityCheck" requiredTier="pro"><ContinuityCheck /></SubscriptionGate></LazyPage>; }
function GatedColorGrading() { return <LazyPage><SubscriptionGate feature="Color Grading" featureKey="canUseColorGrading" requiredTier="pro"><ColorGrading /></SubscriptionGate></LazyPage>; }
function GatedLocationScout() { return <LazyPage><SubscriptionGate feature="Location Scout" featureKey="canUseLocationScout" requiredTier="pro"><LocationScout /></SubscriptionGate></LazyPage>; }
function GatedMoodBoard() { return <LazyPage><SubscriptionGate feature="Mood Board" featureKey="canUseMoodBoard" requiredTier="pro"><MoodBoard /></SubscriptionGate></LazyPage>; }
function GatedSubtitles() { return <LazyPage><SubscriptionGate feature="Subtitles" featureKey="canUseSubtitles" requiredTier="pro"><Subtitles /></SubscriptionGate></LazyPage>; }
function GatedDialogueEditor() { return <LazyPage><SubscriptionGate feature="Dialogue Editor" featureKey="canUseDialogueEditor" requiredTier="pro"><DialogueEditor /></SubscriptionGate></LazyPage>; }
function GatedBudgetEstimator() { return <LazyPage><SubscriptionGate feature="Budget Estimator" featureKey="canUseBudgetEstimator" requiredTier="pro"><BudgetEstimator /></SubscriptionGate></LazyPage>; }
function GatedSoundEffects() { return <LazyPage><SubscriptionGate feature="Sound Effects" featureKey="canUseSoundEffects" requiredTier="pro"><SoundEffects /></SubscriptionGate></LazyPage>; }
function GatedVisualEffects() { return <LazyPage><SubscriptionGate feature="Visual Effects" featureKey="canUseVisualEffects" requiredTier="pro"><VisualEffects /></SubscriptionGate></LazyPage>; }
function GatedCollaboration() { return <LazyPage><SubscriptionGate feature="Collaboration" featureKey="canUseCollaboration" requiredTier="pro"><Collaboration /></SubscriptionGate></LazyPage>; }

function Router() {
  return (
    <Switch>
      {/* Auth pages (no layout) */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/pricing">{() => <LazyPage><Pricing /></LazyPage>}</Route>
      <Route path="/forgot-password">{() => <LazyPage><ForgotPassword /></LazyPage>}</Route>
      <Route path="/reset-password">{() => <LazyPage><ResetPassword /></LazyPage>}</Route>

      {/* Public blog pages (no auth required) */}
      <Route path="/blog">{() => <LazyPage><Blog /></LazyPage>}</Route>
      <Route path="/blog/:slug">{() => <LazyPage><BlogArticle /></LazyPage>}</Route>

      {/* Full-screen pages with subscription gates */}
      <Route path="/projects/:projectId/script/:scriptId" component={GatedScriptWriter} />
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

      {/* Dashboard layout pages */}
      <Route>
        <DashboardLayout>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/projects">{() => <Projects />}</Route>
              <Route path="/projects/new">{() => <NewProject />}</Route>
              <Route path="/projects/:id">{() => <ProjectDetail />}</Route>
              <Route path="/projects/:id/scenes">{() => <SceneEditor />}</Route>
              <Route path="/movies">{() => <Movies />}</Route>
              <Route path="/poster-maker">{() => <AdPosterMaker />}</Route>
              <Route path="/characters">{() => <Characters />}</Route>
              <Route path="/campaigns">{() => <CampaignManager />}</Route>
              <Route path="/referrals">{() => <Referrals />}</Route>
              <Route path="/admin/users">{() => <AdminUsers />}</Route>
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
