/**
 * Lead Analytics - Hightower Branded
 * Clean design with real Supabase data
 */

import { useState, useEffect } from 'react';

export default function LeadAnalytics() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    withEmail: 0,
    withPhone: 0,
    sources: {},
    categories: {}
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    try {
      'https://gxwurcysysqbulbbazph.supabase.co';
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4d3VyY3lzeXNxYnVsYmJhenBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjczMDYsImV4cCI6MjA4OTYwMzMwNn0.RlB52DP8mf5H0WjHkd0K_fJ1dLVQ0Z2Rr7ZVJ1qO1Z0';
      
      const res = await fetch(`${API_URL}/rest/v1/leads?select=*&order(created_at,desc)&limit=200`, {
        headers: {
          'apikey': API_KEY,
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const data = res.ok ? await res.json() : [];
      
      const withEmail = data?.filter(l => l.email)?.length || 0;
      const withPhone = data?.filter(l => l.phone)?.length || 0;
      
      const sources = {};
      data?.forEach(lead => {
        const source = lead.source || 'unknown';
        sources[source] = (sources[source] || 0) + 1;
      });
      
      const categories = {};
      data?.forEach(lead => {
        const cat = lead.category || 'uncategorized';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      
      setLeads(data || []);
      setStats({
        total: data?.length || 0,
        withEmail,
        withPhone,
        sources,
        categories
      });
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }

  const colorArray = ['#1a2fa8', '#00c896', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#1a2fa8] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Analytics</h1>
          <p className="text-[#94a3b8]">Your scraped leads from multiple sources</p>
        </div>
        <button onClick={fetchLeads} className="btn-secondary flex items-center gap-2 self-start">
          ↻ Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Leads" value={stats.total} color="#1a2fa8" />
        <MetricCard label="With Email" value={stats.withEmail} color="#00c896" />
        <MetricCard label="With Phone" value={stats.withPhone} color="#6366f1" />
        <MetricCard label="No Contact" value={stats.total - stats.withEmail - stats.withPhone} color="#94a3b8" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Leads by Source</h3>
          <div className="space-y-3">
            {Object.entries(stats.sources).map(([source, count], idx) => (
              <SourceBar 
                key={source} 
                label={source} 
                value={count} 
                total={stats.total} 
                color={colorArray[idx % colorArray.length]} 
              />
            ))}
            {Object.keys(stats.sources).length === 0 && (
              <p className="text-[#94a3b8] text-center py-4">No data yet</p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Leads by Category</h3>
          <div className="space-y-3">
            {Object.entries(stats.categories).map(([cat, count], idx) => (
              <SourceBar 
                key={cat} 
                label={cat} 
                value={count} 
                total={stats.total} 
                color={colorArray[idx % colorArray.length]} 
              />
            ))}
            {Object.keys(stats.categories).length === 0 && (
              <p className="text-[#94a3b8] text-center py-4">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Leads ({leads.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Business</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Source</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Phone</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Added</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 20).map((lead, idx) => (
                <tr key={idx} className="border-b border-[#1e293b]/50 hover:bg-[#0a1628]/50">
                  <td className="py-3 px-4 text-white font-medium">{lead.business_name || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <span className="badge badge-primary">{lead.source || 'unknown'}</span>
                  </td>
                  <td className="py-3 px-4 text-[#94a3b8]">{lead.email || '-'}</td>
                  <td className="py-3 px-4 text-[#94a3b8]">{lead.phone || '-'}</td>
                  <td className="py-3 px-4 text-[#94a3b8] text-sm">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-[#94a3b8]">
                    No leads yet. Run the scraper to add leads.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div className="card flex items-center gap-3">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
      <div>
        <p className="text-xl font-bold text-white">{value.toLocaleString()}</p>
        <p className="text-[#94a3b8] text-sm">{label}</p>
      </div>
    </div>
  );
}

function SourceBar({ label, value, total, color }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#e2e8f0]">{label}</span>
        <span className="text-[#94a3b8]">{value.toLocaleString()} ({percent}%)</span>
      </div>
      <div className="h-2 bg-[#0a1628] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }}></div>
      </div>
    </div>
  );
}
