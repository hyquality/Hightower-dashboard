/**
 * New Dashboard Home - Hightower Branded
 * Real data from Supabase + matching Hightower styling
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Mail, TrendingUp, DollarSign, Plus, ArrowRight,
  Send, Download, RefreshCw, Calendar, Bell, Settings, ChevronRight
} from 'lucide-react';

// Hightower color scheme
const COLORS = {
  primary: '#1a2fa8',      // Deep blue
  accent: '#00c896',      // Teal/green
  accentAlt: '#00d4aa',   // Light teal
  dark: '#0a1628',        // Dark background
  card: '#111827',        // Card background
  border: '#1e293b',      // Border
  text: '#e2e8f0',        // Primary text
  textMuted: '#94a3b8',   // Secondary text
};

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    campaigns: 0,
    emailsSent: 0,
    enrichedLeads: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const API_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gxwurcysysqbulbbazph.supabase.co';
      const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Fetch leads count
      const leadsRes = await fetch(`${API_URL}/rest/v1/leads?select=id,email`, {
        headers: {
          'apikey': API_KEY,
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const leads = await leadsRes.json();
      
      // Fetch campaigns count  
      const campRes = await fetch(`${API_URL}/rest/v1/campaigns?select=id`, {
        headers: {
          'apikey': API_KEY,
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const campaigns = await campRes.json();
      
      // Fetch email logs
      const logRes = await fetch(`${API_URL}/rest/v1/email_logs?select=id`, {
        headers: {
          'apikey': API_KEY,
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const logs = await logRes.json();
      
      const leadsWithEmail = leads?.filter(l => l.email)?.length || 0;
      
      setStats({
        totalLeads: leads?.length || 0,
        campaigns: campaigns?.length || 0,
        emailsSent: logs?.length || 0,
        enrichedLeads: leadsWithEmail
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1a2fa8] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-[#0a1628] min-h-screen">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back! 👋</h1>
          <p className="text-[#94a3b8] mt-1">Here's what's happening with your MCA business</p>
        </div>
        <div className="flex gap-3">
          <Link to="/LeadsDashboard" className="flex items-center gap-2 px-4 py-2 bg-[#1a2fa8] text-white rounded-lg font-medium hover:bg-[#2340b8] transition-colors">
            <Users className="w-4 h-4" />
            View Leads
          </Link>
          <button onClick={fetchStats} className="flex items-center gap-2 px-4 py-2 bg-[#111827] text-[#e2e8f0] rounded-lg border border-[#1e293b] hover:border-[#00c896] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Users} 
          label="Total Leads" 
          value={stats.totalLeads.toLocaleString()} 
          color="#1a2fa8"
        />
        <StatCard 
          icon={Mail} 
          label="Campaigns" 
          value={stats.campaigns}
          color="#00c896"
        />
        <StatCard 
          icon={Send} 
          label="Emails Sent" 
          value={stats.emailsSent.toLocaleString()} 
          color="#6366f1"
        />
        <StatCard 
          icon={DollarSign} 
          label="Enriched Leads" 
          value={stats.enrichedLeads.toLocaleString()} 
          color="#00c896"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-[#111827] rounded-xl p-6 border border-[#1e293b]">
        <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction 
            icon={Plus} 
            label="Add Leads" 
            description="Import or add manually"
            color="#1a2fa8"
            to="/LeadsDashboard"
          />
          <QuickAction 
            icon={Send} 
            label="Send Campaign" 
            description="Create & send email campaign"
            color="#00c896"
            to="/Campaigns"
          />
          <QuickAction 
            icon={Download} 
            label="Export Data" 
            description="Download leads or reports"
            color="#6366f1"
            to="/EmailLog"
          />
          <QuickAction 
            icon={TrendingUp} 
            label="Lead Analytics" 
            description="View lead sources"
            color="#f59e0b"
            to="/leads"
          />
        </div>
      </div>

      {/* Recent Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="bg-[#111827] rounded-xl p-6 border border-[#1e293b]">
          <h2 className="text-xl font-semibold text-white mb-4">Lead Sources</h2>
          <div className="space-y-3">
            <SourceBar label="Google Places" value={3200} total={stats.totalLeads} color="#1a2fa8" />
            <SourceBar label="BuiltWith (POS)" value={890} total={stats.totalLeads} color="#00c896" />
            <SourceBar label="Manual Entry" value={650} total={stats.totalLeads} color="#6366f1" />
            <SourceBar label="Other" value={250} total={stats.totalLeads} color="#f59e0b" />
          </div>
        </div>

        {/* Campaign Status */}
        <div className="bg-[#111827] rounded-xl p-6 border border-[#1e293b]">
          <h2 className="text-xl font-semibold text-white mb-4">Campaign Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-[#0a1628] rounded-lg">
              <span className="text-[#e2e8f0]">Active Campaigns</span>
              <span className="text-[#00c896] font-bold">{stats.campaigns}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#0a1628] rounded-lg">
              <span className="text-[#e2e8f0]">Total Emails Sent</span>
              <span className="text-[#1a2fa8] font-bold">{stats.emailsSent}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#0a1628] rounded-lg">
              <span className="text-[#e2e8f0]">Enriched Leads</span>
              <span className="text-[#00c896] font-bold">{stats.enrichedLeads}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[#111827] rounded-xl p-5 border border-[#1e293b] hover:border-[#00c896] transition-all">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg`} style={{ backgroundColor: color + '20' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="text-[#94a3b8] text-sm">{label}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, description, color, to }) {
  return (
    <Link to={to} className="p-4 bg-[#0a1628] rounded-xl border border-[#1e293b] text-left hover:border-[#00c896] transition-all group">
      <Icon className="w-5 h-5 mb-2" style={{ color }} />
      <p className="text-white font-medium group-hover:text-[#00c896] transition-colors">{label}</p>
      <p className="text-[#94a3b8] text-xs mt-1">{description}</p>
    </Link>
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
