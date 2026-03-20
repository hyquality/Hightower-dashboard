import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllLeads } from "@/lib/supabaseQueries";
import StatsRow from "@/components/leads/StatsRow";
import LeadsCharts from "@/components/leads/LeadsCharts";
import LeadsTable from "@/components/leads/LeadsTable";
import LeadPanel from "@/components/leads/LeadPanel";
import NavBar from "@/components/NavBar";
import BulkSendModal from "@/components/leads/BulkSendModal";

export default function LeadsDashboard() {
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [bulkSendLeads, setBulkSendLeads] = useState(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => fetchAllLeads(),
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        !search ||
        l.business_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.city?.toLowerCase().includes(search.toLowerCase()) ||
        l.owner_name?.toLowerCase().includes(search.toLowerCase());
      const matchIndustry = filterIndustry === "All" || l.industry === filterIndustry;
      const matchStatus = filterStatus === "All" || l.status === filterStatus;
      const matchSource = filterSource === "All" || l.source === filterSource;
      return matchSearch && matchIndustry && matchStatus && matchSource;
    });
  }, [leads, search, filterIndustry, filterStatus, filterSource]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">
        <StatsRow leads={leads} totalCount={leads.length} />
        <LeadsCharts leads={leads} />
        <LeadsTable
          leads={filteredLeads}
          isLoading={isLoading}
          search={search}
          setSearch={setSearch}
          filterIndustry={filterIndustry}
          setFilterIndustry={setFilterIndustry}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterSource={filterSource}
          setFilterSource={setFilterSource}
          allLeads={leads}
          onRowClick={setSelectedLead}
          onAddClick={() => setShowAddPanel(true)}
          onBulkSend={setBulkSendLeads}
        />
      </div>

      {selectedLead && (
        <LeadPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {bulkSendLeads && (
        <BulkSendModal
          selectedLeads={bulkSendLeads}
          onClose={() => setBulkSendLeads(null)}
          onSuccess={() => setBulkSendLeads(null)}
        />
      )}

      {showAddPanel && (
        <LeadPanel
          lead={null}
          isNew
          onClose={() => setShowAddPanel(false)}
        />
      )}
    </div>
  );
}