import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "@/pages/AdminDashboard";
import AwardsLibrary from "@/pages/AwardsLibrary";
import AwardsCatalog from "@/pages/AwardsCatalog";
import EligibilityCheck from "./pages/EligibilityCheck";
import CriteriaGovernance from "./pages/CriteriaGovernance";
import UserManagement from "@/pages/UserManagement";
import Account from "@/pages/Account";
import InstitutionalGovernance from "@/pages/InstitutionalGovernance";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/awards" component={AwardsCatalog} />
      <Route path="/awards-catalog" component={AwardsCatalog} />
      <Route path="/awards-samples" component={AwardsLibrary} />
      <Route path="/eligibility-check" component={EligibilityCheck} />
      <Route path="/criteria" component={CriteriaGovernance} />
      <Route path="/users" component={UserManagement} />
      <Route path="/governance" component={InstitutionalGovernance} />
      <Route path="/account" component={Account} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-left" richColors />
          <DashboardLayout><Router /></DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
