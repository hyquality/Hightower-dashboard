import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, Users, BarChart3, Send, Mail, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

const LINKS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", path: "/LeadsDashboard", icon: Users },
  { label: "Analytics", path: "/leads", icon: BarChart3 },
  { label: "Campaigns", path: "/Campaigns", icon: Send },
  { label: "Email Log", path: "/EmailLog", icon: Mail },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-[#0a1628] border-b border-[#1e293b] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#00c896]">H</span>
              <span className="text-xl font-semibold text-white hidden sm:block">Hightower</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#1a2fa8] text-white"
                      : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => logout()} className="text-[#94a3b8] hover:text-white hover:bg-[#1e293b]">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1e293b] py-4">
            <div className="space-y-1">
              {LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#1a2fa8] text-white"
                        : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
              <button
                onClick={() => logout()}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#1e293b] rounded-lg"
              >
                <LogOut className="w-5 h-5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
