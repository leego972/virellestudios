import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import NewProject from "./pages/NewProject";
import Characters from "./pages/Characters";
import SceneEditor from "./pages/SceneEditor";
import ScriptWriter from "./pages/ScriptWriter";
import Storyboard from "./pages/Storyboard";
import CreditsEditor from "./pages/CreditsEditor";
import ShotList from "./pages/ShotList";
import ContinuityCheck from "./pages/ContinuityCheck";
import ColorGrading from "./pages/ColorGrading";
import LocationScout from "./pages/LocationScout";
import MoodBoard from "./pages/MoodBoard";
import Subtitles from "./pages/Subtitles";
import DialogueEditor from "./pages/DialogueEditor";
import BudgetEstimator from "./pages/BudgetEstimator";
import SoundEffects from "./pages/SoundEffects";
import VisualEffects from "./pages/VisualEffects";
import Collaboration from "./pages/Collaboration";
import Movies from "./pages/Movies";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminUsers from "./pages/AdminUsers";

function Router() {
  return (
    <Switch>
      {/* Auth pages (no layout) */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      {/* Full-screen pages (own layout) */}
      <Route path="/projects/:projectId/script/:scriptId" component={ScriptWriter} />
      <Route path="/projects/:projectId/storyboard" component={Storyboard} />
      <Route path="/projects/:projectId/credits" component={CreditsEditor} />
      <Route path="/projects/:projectId/shot-list" component={ShotList} />
      <Route path="/projects/:projectId/continuity" component={ContinuityCheck} />
      <Route path="/projects/:projectId/color-grading" component={ColorGrading} />
      <Route path="/projects/:id/locations" component={LocationScout} />
      <Route path="/projects/:id/mood-board" component={MoodBoard} />
      <Route path="/projects/:id/subtitles" component={Subtitles} />
      <Route path="/projects/:projectId/dialogue" component={DialogueEditor} />
      <Route path="/projects/:projectId/budget" component={BudgetEstimator} />
      <Route path="/projects/:id/sound-effects" component={SoundEffects} />
      <Route path="/projects/:id/visual-effects" component={VisualEffects} />
      <Route path="/projects/:id/collaboration" component={Collaboration} />
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/new" component={NewProject} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/projects/:id/scenes" component={SceneEditor} />
            <Route path="/movies" component={Movies} />
            <Route path="/characters" component={Characters} />
            <Route path="/admin/users" component={AdminUsers} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
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
