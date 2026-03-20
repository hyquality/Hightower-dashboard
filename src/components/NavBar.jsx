import { Link, useLocation } from "react-router-dom";
import { BRAND_LOGO_URL } from "@/lib/brand";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const LINKS = [
  { label: "Leads", path: "/LeadsDashboard" },
  { label: "Campaigns", path: "/Campaigns" },
  { label: "Email Log", path: "/EmailLog" },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();

  return (
    <div className="bg-white border-b border-gray-200 px-8 shadow-sm">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        <div className="py-4">
          <img src={BRAND_LOGO_URL} alt="Hightower Funding" className="h-10 w-auto" />
        </div>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1 h-full">
            {LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-5 text-sm font-semibold border-b-2 transition-colors ${
                  pathname === link.path
                    ? "border-[#00c896] text-[#1a2fa8]"
                    : "border-transparent text-gray-500 hover:text-[#1a2fa8] hover:border-gray-300"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Button variant="outline" size="sm" onClick={() => logout()} className="shrink-0">
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
