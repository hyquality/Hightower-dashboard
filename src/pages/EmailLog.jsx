import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listEmailLogs } from "@/lib/supabaseQueries";
import { Search, CheckCircle2, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import NavBar from "@/components/NavBar";

const STATUS_STYLES = {
  Sent: "bg-blue-100 text-blue-700",
  Delivered: "bg-green-100 text-green-700",
  Bounced: "bg-red-100 text-red-700",
  Failed: "bg-slate-100 text-slate-500",
};

function BoolCell({ value }) {
  if (value) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  return <Circle className="w-4 h-4 text-slate-300" />;
}

export default function EmailLog() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCampaign, setFilterCampaign] = useState("All");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["emailLogs"],
    queryFn: () => listEmailLogs(2000),
  });

  const campaigns = [...new Set(logs.map((l) => l.campaign_name).filter(Boolean))];

  const filtered = logs.filter((l) => {
    const matchSearch = !search ||
      l.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.subject?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || l.status === filterStatus;
    const matchCampaign = filterCampaign === "All" || l.campaign_name === filterCampaign;
    return matchSearch && matchStatus && matchCampaign;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1a2fa8]">Email Log</h2>
          <p className="text-slate-500 text-sm mt-0.5">{logs.length.toLocaleString()} emails tracked</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          {/* Filters */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search business, email, or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
              <SelectTrigger className="w-44 text-sm"><SelectValue placeholder="Campaign" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Campaigns</SelectItem>
                {campaigns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {["All", "Sent", "Delivered", "Bounced", "Failed"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-400 self-center whitespace-nowrap">{filtered.length.toLocaleString()} results</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-100">
                  {["Business Name", "Email", "Campaign", "Template", "Subject", "Sent Date", "Opened", "Clicked", "Status", "Next Followup"].map((col) => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array(6).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {Array(10).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-slate-400">
                      No email logs found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1a2fa8] whitespace-nowrap">{log.business_name || "—"}</td>
                      <td className="px-4 py-3 text-[#00c896] max-w-[160px] truncate">
                        <a href={`mailto:${log.email}`}>{log.email || "—"}</a>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{log.campaign_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{log.template || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{log.subject || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {log.sent_date ? format(new Date(log.sent_date), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3"><BoolCell value={log.opened} /></td>
                      <td className="px-4 py-3"><BoolCell value={log.clicked} /></td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[log.status] || "bg-slate-100 text-slate-500"}`}>
                          {log.status || "Sent"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {log.next_followup ? format(new Date(log.next_followup), "MMM d, yyyy") : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}