import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, Star, Plus, ChevronLeft, ChevronRight, Send, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 50;

const INDUSTRIES = ["All", "Restaurant", "Retail", "Construction", "Healthcare", "Transportation", "Real Estate", "Technology", "Manufacturing", "Auto", "Beauty & Wellness", "Home Services", "Legal", "Other"];
const STATUSES = ["All", "New", "Contacted", "Interested", "Applied", "Funded", "Not Interested"];
const SOURCES = ["All", "Google Maps", "Yelp", "LinkedIn", "Referral", "Cold Call", "Website", "Other"];

const STATUS_STYLES = {
  New: "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]",
  Contacted: "bg-[#fef9c3] text-[#854d0e] border-[#fde68a]",
  Interested: "bg-[#ccfbf1] text-[#0f766e] border-[#99f6e4]",
  Funded: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]",
  "Not Interested": "bg-slate-100 text-slate-500 border-slate-200",
};

const COLS = [
  { label: "Business Name", key: "business_name" },
  { label: "Owner", key: "owner_name" },
  { label: "Industry", key: "industry" },
  { label: "City / State", key: "city" },
  { label: "Phone", key: "phone" },
  { label: "Email", key: "email" },
  { label: "Website", key: "website" },
  { label: "Rating", key: "rating" },
  { label: "Source", key: "source" },
  { label: "Status", key: "status" },
  { label: "Date Added", key: "created_at" },
  { label: "Notes", key: "notes" },
];

function StarRating({ rating }) {
  if (!rating) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-[#f0c040] text-[#f0c040]" />
      <span className="text-sm font-medium text-slate-700">{Number(rating).toFixed(1)}</span>
    </div>
  );
}

function InlineStatus({ lead }) {
  const qc = useQueryClient();
  const handleChange = async (val) => {
    const { error } = await supabase.from("leads").update({ status: val }).eq("id", lead.id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["leads"] });
  };
  return (
    <Select value={lead.status || "New"} onValueChange={handleChange}>
      <SelectTrigger
        onClick={(e) => e.stopPropagation()}
        className={`h-7 text-xs font-semibold border px-2 py-0 rounded-full w-auto min-w-[120px] ${STATUS_STYLES[lead.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {STATUSES.filter((s) => s !== "All").map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function LeadsTable({
  leads, isLoading, search, setSearch,
  filterIndustry, setFilterIndustry,
  filterStatus, setFilterStatus,
  filterSource, setFilterSource,
  allLeads, onRowClick, onAddClick, onBulkSend,
}) {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => { setPage(1); }, [leads.length, search, filterIndustry, filterStatus, filterSource]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sortedLeads = sortKey ? [...leads].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  }) : leads;

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / PAGE_SIZE));
  const paginated = sortedLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allPageIds = paginated.map(l => l.id);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.has(id));
  const selectedLeads = sortedLeads.filter(l => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        allPageIds.forEach(id => next.delete(id));
      } else {
        allPageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      {/* Filters */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by business, city, or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 hidden md:block" />
            <Select value={filterIndustry} onValueChange={setFilterIndustry}>
              <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Industry" /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <span className="text-sm text-slate-400 whitespace-nowrap">{leads.length.toLocaleString()} results</span>
          {selectedIds.size > 0 && (
            <Button onClick={() => onBulkSend(selectedLeads)} className="bg-[#00c896] hover:bg-[#00b085] text-white whitespace-nowrap">
              <Send className="w-4 h-4 mr-1" /> Send Campaign ({selectedIds.size})
            </Button>
          )}
          <Button onClick={onAddClick} className="bg-[#1a2fa8] hover:bg-[#2a3fbf] text-white whitespace-nowrap">
            <Plus className="w-4 h-4 mr-1" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-slate-100">
              <th className="px-4 py-3">
                <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} className="w-4 h-4 accent-[#1a2fa8] cursor-pointer" />
              </th>
              {COLS.map((col) => (
                <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-slate-800 transition-colors" onClick={() => handleSort(col.key)}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key
                      ? sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      : <ChevronUp className="w-3 h-3 opacity-20" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array(COLS.length + 1).fill(0).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} className="text-center py-16 text-slate-400">
                  No leads found. Try adjusting your filters or add a new lead.
                </td>
              </tr>
            ) : (
              paginated.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => onRowClick(lead)}
                  className="border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="w-4 h-4 accent-[#1a2fa8] cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1a2fa8] max-w-[160px] truncate">{lead.business_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{lead.owner_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{lead.industry || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {lead.phone ? <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="hover:text-[#00c896]">{lead.phone}</a> : "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[160px] truncate">
                    {lead.email
                      ? <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-[#00c896] hover:underline">{lead.email}</a>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[140px] truncate">
                    {lead.website
                      ? <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#00c896] hover:underline text-xs">{lead.website.replace(/^https?:\/\//, "")}</a>
                      : "—"}
                  </td>
                  <td className="px-4 py-3"><StarRating rating={lead.rating} /></td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{lead.source || "—"}</td>
                  <td className="px-4 py-3">
                    <InlineStatus lead={lead} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                    {lead.created_at ? format(new Date(lead.created_at), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate text-xs">{lead.notes || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Showing {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, sortedLeads.length).toLocaleString()} of {sortedLeads.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 font-medium px-2">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}