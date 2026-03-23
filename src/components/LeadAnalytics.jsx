/**
 * Lead Analytics - Hightower Branded
 */

import { useState, useEffect } from 'react';

export default function LeadAnalytics() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, withEmail: 0, withPhone: 0, sources: {}, categories: {} });

  useEffect(() => { fetchLeads(); }, []);

  async function fetchLeads() {
    setLoading(true);
    try {
      const API_URL = 'https://gxwurcysysqbulbbazph.supabase.co';
      const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4d3VyY3lzeXNxYnVsYmJhenBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjczMDYsImV4cCI6MjA4OTYwMzMwNn0.RlB52DP8mf5H0WjHkd0K_fJ1dLVQ0Z2Rr7ZVJ1qO1Z0';
      const headers = { 'apikey': API_KEY, 'Authorization': `Bearer ${API_KEY}` };
      
      const res = await fetch(`${API_URL}/rest/v1/leads?select=*&order(created_at,desc)&limit=200`, { headers });
      const data = res.ok ? await res.json() : [];
      
      const withEmail = data?.filter(l => l.email)?.length || 0;
      const withPhone = data?.filter(l => l.phone)?.length || 0;
      const sources = {}, categories = {};
      data?.forEach(lead => {
        sources[lead.source || 'unknown'] = (sources[lead.source || 'unknown'] || 0) + 1;
        categories[lead.category || 'uncategorized'] = (categories[lead.category || 'uncategorized'] || 0) + 1;
      });
      
      setLeads(data || []);
      setStats({ total: data?.length || 0, withEmail, withPhone, sources, categories });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const colorArray = ['#1a2fa8', '#00c896', '#6366f1', '#f59e0b', '#ef4444'];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#1a2fa8] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-white">Lead Analytics</h1><p className="text-[#94a3b8]">Your scraped leads</p></div>
        <button onClick={fetchLeads} className="btn-secondary">↻ Refresh</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Leads" value={stats.total} color="#1a2fa8" />
        <MetricCard label="With Email" value={stats.withEmail} color="#00c896" />
        <MetricCard label="With Phone" value={stats.withPhone} color="#6366f1" />
        <MetricCard label="No Contact" value={stats.total - stats.withEmail - stats.withPhone} color="#94a3b8" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card"><h3 className="text-lg font-semibold text-white mb-4">Leads by Source</h3>
          <div className="space-y-3">{Object.entries(stats.sources).map(([s, c], i) => <SourceBar key={s} label={s} value={c} total={stats.total} color={colorArray[i%5]} />)}</div>
        </div>
        <div className="card"><h3 className="text-lg font-semibold text-white mb-4">Leads by Category</h3>
          <div className="space-y-3">{Object.entries(stats.categories).map(([c, v], i) => <SourceBar key={c} label={c} value={v} total={stats.total} color={colorArray[i%5]} />)}</div>
        </div>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Leads ({leads.length})</h3>
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr className="border-b border-[#1e293b]">
            <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Business</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Source</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Email</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Phone</th>
          </tr></thead>
          <tbody>{leads.slice(0,15).map((lead,i) => <tr key={i} className="border-b border-[#1e293b]/50"><td className="py-3 px-4 text-white">{lead.business_name||'N/A'}</td><td className="py-3 px-4"><span className="badge badge-primary">{lead.source||'unknown'}</span></td><td className="py-3 px-4 text-[#94a3b8]">{lead.email||'-'}</td><td className="py-3 px-4 text-[#94a3b8]">{lead.phone||'-'}</td></tr>)}</tbody>
        </table></div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return <div className="card flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{backgroundColor:color}}></div><div><p className="text-xl font-bold text-white">{value.toLocaleString()}</p><p className="text-[#94a3b8] text-sm">{label}</p></div></div>;
}

function SourceBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round(value/total*100) : 0;
  return <div><div className="flex justify-between text-sm mb-1"><span className="text-[#e2e8f0]">{label}</span><span className="text-[#94a3b8]">{value.toLocaleString()} ({pct}%)</span></div><div className="h-2 bg-[#0a1628] rounded-full"><div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:color}}></div></div></div>;
}
