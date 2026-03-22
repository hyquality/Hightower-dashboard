import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import LeadsDashboard from "./pages/LeadsDashboard";
import Campaigns from "./pages/Campaigns";
import EmailLog from "./pages/EmailLog";
import Login from "./pages/Login";
import DashboardHome from "./components/DashboardHome";
import EmailAnalytics from "./components/EmailAnalytics";
import LeadAnalytics from "./components/LeadAnalytics";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardHome />} />
      <Route path="/LeadsDashboard" element={<LeadsDashboard />} />
      <Route path="/leads" element={<LeadAnalytics />} />
      <Route path="/Campaigns" element={<Campaigns />} />
      <Route path="/EmailLog" element={<EmailLog />} />
      <Route path="/email-analytics" element={<EmailAnalytics />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
