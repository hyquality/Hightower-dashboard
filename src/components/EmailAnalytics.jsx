/**
 * Email Analytics - Hightower Branded
 * Real data from Supabase
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

const COLORS = {
  primary: '#1a2fa8',
  accent: '#00c896',
  dark: '#0a1628',
  card: '#111827',
  border: '#1e293b',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
};

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
    try {
      const API_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gxwurcysysqbulbbazph.supabase.co';
      const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Fetch email logs
      const res = await fetch(`${API_URL}/rest/v1/email_logs?select=*&order(sent_at,desc)&limit=50`, {
        headers: {
          'apikey': API_KEY,
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const logs = await res.json();
      
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1a2fa8] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-[#0a1628] min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Analytics</h1>
          <p className="text-[#94a3b8]">Track your email campaign performance</p>
        </div>
        <button onClick={fetchEmailStats} className="p-2 bg-[#111827] text-[#e2e8f0] rounded-lg border border-[#1e293b] hover:border-[#00c896]">
          ↻
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

      {/* Charts placeholder - would need recharts integration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111827] rounded-xl p-6 border border-[#1e293b]">
          <h3 className="text-lg font-semibold text-white mb-4">Open Rate Trend</h3>
          <div className="h-48 flex items-center justify-center text-[#94a3b8]">
            {openRate}% overall open rate
          </div>
        </div>
        <div className="bg-[#111827] rounded-xl p-6 border border-[#1e293b]">
          <h3 className="text-lg font-semibold text-white mb-4">Click Rate Trend</h3>
          <div className="h-48 flex items-center justify-center text-[#94a3b8]">
            {clickRate}% overall click rate
          </div>
        </div>
      </div>

      {/* Recent Emails Table */}
      <div className="bg-[#111827] rounded-xl p-6 border border-[#1e293b]">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Emails</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left py-3 px-4 text-[#94a3b8] font-medium">Recipient</th>
                <th className="text-left py-3 px-4 text-[#94a3b8] font-medium">Subject</th>
                <th className="text-center py-3 px-4 text-[#94a3b8] font-medium">Sent</th>
                <th className="text-center py-3 px-4 text-[#94a3b8] font-medium">Opened</th>
                <th className="text-center py-3 px-4 text-[#94a3b8] font-medium">Clicked</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentLogs.slice(0, 10).map((log, idx) => (
                <tr key={idx} className="border-b border-[#1e293b]/50 hover:bg-[#0a1628]">
                  <td className="py-3 px-4 text-white">{log.recipient_email}</td>
                  <td className="py-3 px-4 text-[#94a3b8] truncate max-w-xs">{log.subject}</td>
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
    <div className="bg-[#111827] rounded-xl p-4 border border-[#1e293b]">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
        <span className="text-[#94a3b8] text-sm">{label}</span>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-white">{value.toLocaleString()}</span>
        {subValue && <span className="text-[#94a3b8] text-sm ml-2">{subValue}</span>}
      </div>
    </div>
  );
}
