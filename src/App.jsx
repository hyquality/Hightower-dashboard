import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import NavBar from "./components/NavBar";
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
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1a2fa8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <NavBar />
      <main className="max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/LeadsDashboard" element={<LeadsDashboard />} />
          <Route path="/leads" element={<LeadAnalytics />} />
          <Route path="/Campaigns" element={<Campaigns />} />
          <Route path="/EmailLog" element={<EmailLog />} />
          <Route path="/analytics" element={<EmailAnalytics />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
