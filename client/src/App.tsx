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

function Router() {
  return (
    <Switch>
      {/* Full-screen pages (own layout) */}
      <Route path="/project/:projectId/script/:scriptId" component={ScriptWriter} />
      <Route path="/project/:projectId/storyboard" component={Storyboard} />
      <Route path="/project/:projectId/credits" component={CreditsEditor} />
      <Route path="/project/:projectId/shot-list" component={ShotList} />
      <Route path="/project/:projectId/continuity" component={ContinuityCheck} />
      <Route path="/project/:projectId/color-grading" component={ColorGrading} />
      <Route path="/projects/:id/locations" component={LocationScout} />
      <Route path="/projects/:id/mood-board" component={MoodBoard} />
      <Route path="/projects/:id/subtitles" component={Subtitles} />
      <Route path="/projects/:projectId/dialogue" component={DialogueEditor} />
      <Route path="/projects/:projectId/budget" component={BudgetEstimator} />
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/new" component={NewProject} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/projects/:id/scenes" component={SceneEditor} />
            <Route path="/characters" component={Characters} />
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
