import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCampaigns } from "@/lib/supabaseQueries";
import { Plus, Send, BarChart2, MousePointerClick, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import CampaignFormPanel from "@/components/campaigns/CampaignFormPanel";
import NavBar from "@/components/NavBar";

const STATUS_COLORS = {
  Draft: "bg-slate-100 text-slate-600",
  Active: "bg-green-100 text-green-700",
  Paused: "bg-yellow-100 text-yellow-700",
  Completed: "bg-blue-100 text-blue-700",
};

export default function Campaigns() {
  const [showForm, setShowForm] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const qc = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => listCampaigns(),
  });

  const handleRowClick = (c) => {
    setEditCampaign(c);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditCampaign(null);
    qc.invalidateQueries({ queryKey: ["campaigns"] });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1a2fa8]">Campaigns</h2>
            <p className="text-slate-500 text-sm mt-0.5">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => { setEditCampaign(null); setShowForm(true); }} className="bg-[#1a2fa8] hover:bg-[#2a3fbf] text-white">
            <Plus className="w-4 h-4 mr-1" /> New Campaign
          </Button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Campaigns", value: campaigns.length, icon: BarChart2, color: "bg-[#1a2fa8]" },
            { label: "Emails Sent", value: campaigns.reduce((s, c) => s + (c.sent_count || 0), 0), icon: Send, color: "bg-[#2a3fbf]" },
            { label: "Total Opens", value: campaigns.reduce((s, c) => s + (c.open_count || 0), 0), icon: Eye, color: "bg-[#00c896]" },
            { label: "Total Clicks", value: campaigns.reduce((s, c) => s + (c.click_count || 0), 0), icon: MousePointerClick, color: "bg-[#00b085]" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-[#0d1f3c]">{value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-slate-100">
                {["Campaign Name", "Template", "Status", "Sent", "Opens", "Clicks", "Open Rate", "Launched"].map((col) => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array(8).fill(0).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    No campaigns yet. Create your first campaign to get started.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const openRate = c.sent_count ? Math.round((c.open_count || 0) / c.sent_count * 100) : 0;
                  return (
                    <tr key={c.id} onClick={() => handleRowClick(c)} className="border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#0d1f3c]">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600">{c.template || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-600"}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{(c.sent_count || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{(c.open_count || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{(c.click_count || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#00c896] rounded-full" style={{ width: `${openRate}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{openRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{c.launched_date ? format(new Date(c.launched_date), "MMM d, yyyy") : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <CampaignFormPanel campaign={editCampaign} onClose={handleClose} />
      )}
    </div>
  );
}