/**
 * Email Analytics - Hightower Branded
 * Clean design with real Supabase data
 */

import { useState, useEffect } from 'react';

export default function EmailAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    recentLogs: []
  });

  useEffect(() => {
    fetchEmailStats();
  }, []);

  async function fetchEmailStats() {
    setLoading(true);
    try {
      'https://gxwurcysysqbulbbazph.supabase.co';
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4d3VyY3lzeXNxYnVsYmJhenBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjczMDYsImV4cCI6MjA4OTYwMzMwNn0.RlB52DP8mf5H0WjHkd0K_fJ1dLVQ0Z2Rr7ZVJ1qO1Z0';
      
      const res = await fetch(`${API_URL}/rest/v1/email_logs?select=*&order(sent_at,desc)&limit=50`, {
        headers: {
          'apikey': API_KEY,
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const logs = res.ok ? await res.json() : [];
      
      const sent = logs?.length || 0;
      const delivered = logs?.filter(l => l.delivered)?.length || 0;
      const opened = logs?.filter(l => l.opened)?.length || 0;
      const clicked = logs?.filter(l => l.clicked)?.length || 0;
      const bounced = logs?.filter(l => l.bounced)?.length || 0;
      
      setStats({
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        recentLogs: logs || []
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const openRate = stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(1) : 0;
  const clickRate = stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(1) : 0;

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
          <h1 className="text-2xl font-bold text-white">Email Analytics</h1>
          <p className="text-[#94a3b8]">Track your email campaign performance</p>
        </div>
        <button onClick={fetchEmailStats} className="btn-secondary flex items-center gap-2 self-start">
          ↻ Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Sent" value={stats.sent} color="#1a2fa8" />
        <MetricCard label="Delivered" value={stats.delivered} color="#00c896" />
        <MetricCard label="Opened" value={stats.opened} subValue={`${openRate}%`} color="#6366f1" />
        <MetricCard label="Clicked" value={stats.clicked} subValue={`${clickRate}%`} color="#f59e0b" />
        <MetricCard label="Bounced" value={stats.bounced} color="#ef4444" />
      </div>

      {/* Recent Emails Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Emails</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Recipient</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Subject</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Sent</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Opened</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-[#94a3b8] uppercase">Clicked</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentLogs.slice(0, 15).map((log, idx) => (
                <tr key={idx} className="border-b border-[#1e293b]/50 hover:bg-[#0a1628]/50">
                  <td className="py-3 px-4 text-white">{log.recipient_email || 'N/A'}</td>
                  <td className="py-3 px-4 text-[#94a3b8] truncate max-w-xs">{log.subject || '-'}</td>
                  <td className="py-3 px-4 text-center text-[#94a3b8]">
                    {log.sent_at ? new Date(log.sent_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {log.opened ? <span className="text-[#00c896]">✓</span> : <span className="text-[#94a3b8]">-</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {log.clicked ? <span className="text-[#00c896]">✓</span> : <span className="text-[#94a3b8]">-</span>}
                  </td>
                </tr>
              ))}
              {stats.recentLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-[#94a3b8]">
                    No email logs yet. Send a campaign to see stats here.
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

function MetricCard({ label, value, subValue, color }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
        <span className="text-[#94a3b8] text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      {subValue && <p className="text-[#94a3b8] text-sm">{subValue} rate</p>}
    </div>
  );
}
