/**
 * New Dashboard Home
 * Modern, enhanced dashboard with quick stats and actions
 */

import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  Users, Mail, TrendingUp, DollarSign, Plus, ArrowRight,
  Send, Download, RefreshCw, Calendar, Bell, Settings,
  ChevronRight, Play, Pause, Clock
} from 'lucide-react';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    leads: 0,
    campaigns: 0,
    sent: 0,
    revenue: 0
  });

  useEffect(() => {
    // Simulate loading - replace with real API calls
    setTimeout(() => {
      setStats({
        leads: 1548,
        campaigns: 12,
        sent: 24560,
        revenue: 125000
      });
      setLoading(false);
    }, 800);
  }, []);

  const recentActivity = [
    { type: 'lead', message: 'New 45 leads scraped from Google Maps', time: '2 hours ago' },
    { type: 'email', message: 'Campaign "Summer Promo" sent to 1,200 leads', time: '5 hours ago' },
    { type: 'lead', message: '15 leads enriched with Hunter.io', time: '1 day ago' },
    { type: 'campaign', message: 'Campaign "Spring Special" opened by 34%', time: '2 days ago' },
  ];

  const upcomingTasks = [
    { id: 1, task: 'Daily lead scrape', time: '8:00 AM ET', status: 'scheduled' },
    { id: 2, task: 'Review new leads', time: '10:00 AM ET', status: 'pending' },
    { id: 3, task: 'Send follow-up campaign', time: '2:00 PM ET', status: 'draft' },
  ];

  const campaignPerformance = [
    { name: 'Week 1', sent: 1200, opened: 280, clicked: 45 },
    { name: 'Week 2', sent: 980, opened: 245, clicked: 38 },
    { name: 'Week 3', sent: 1450, opened: 420, clicked: 82 },
    { name: 'Week 4', sent: 1100, opened: 310, clicked: 55 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back! 👋</h1>
          <p className="text-gray-400 mt-1">Here's what's happening with your MCA business</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">3</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Users} 
          label="Total Leads" 
          value={stats.leads.toLocaleString()} 
          trend={+12.5}
          color="cyan"
        />
        <StatCard 
          icon={Mail} 
          label="Campaigns" 
          value={stats.campaigns} 
          trend={+2}
          color="purple"
        />
        <StatCard 
          icon={Send} 
          label="Emails Sent" 
          value={stats.sent.toLocaleString()} 
          trend={+8.3}
          color="green"
        />
        <StatCard 
          icon={DollarSign} 
          label="Pipeline Value" 
          value={`$${(stats.revenue / 1000).toFixed(0)}K`} 
          trend={+15.2}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Performance Chart */}
        <div className="lg:col-span-2 bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Campaign Performance</h2>
            <select className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 border border-gray-700">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={campaignPerformance}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00f5ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="sent" stroke="#00f5ff" fillOpacity={1} fill="url(#colorSent)" name="Sent" />
              <Area type="monotone" dataKey="opened" stroke="#a855f7" fillOpacity={1} fill="url(#colorOpened)" name="Opened" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 pb-4 border-b border-gray-800/50 last:border-0">
                <div className={`p-2 rounded-lg ${
                  activity.type === 'lead' ? 'bg-cyan-500/10 text-cyan-400' :
                  activity.type === 'email' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-green-500/10 text-green-400'
                }`}>
                  {activity.type === 'lead' && <Users className="w-4 h-4" />}
                  {activity.type === 'email' && <Mail className="w-4 h-4" />}
                  {activity.type === 'campaign' && <TrendingUp className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-gray-200 text-sm">{activity.message}</p>
                  <p className="text-gray-500 text-xs mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-cyan-400 text-sm hover:text-cyan-300 flex items-center justify-center gap-1">
            View all activity <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Actions & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickAction 
              icon={Plus} 
              label="Add Leads" 
              description="Import or add manually"
              color="cyan"
            />
            <QuickAction 
              icon={Send} 
              label="Send Campaign" 
              description="Create & send email campaign"
              color="green"
            />
            <QuickAction 
              icon={Download} 
              label="Export Data" 
              description="Download leads or reports"
              color="purple"
            />
            <QuickAction 
              icon={RefreshCw} 
              label="Scrape Leads" 
              description="Run the lead scraper"
              color="orange"
            />
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Today's Schedule</h2>
            <span className="text-gray-400 text-sm flex items-center gap-1">
              <Clock className="w-4 h-4" /> ET
            </span>
          </div>
          <div className="space-y-3">
            {upcomingTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'scheduled' ? 'bg-green-400' :
                    task.status === 'pending' ? 'bg-yellow-400' :
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-gray-200">{task.task}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">{task.time}</span>
                  <button className="p-1 hover:bg-gray-700 rounded">
                    {task.status === 'scheduled' ? <Pause className="w-4 h-4 text-gray-400" /> :
                     task.status === 'draft' ? <Play className="w-4 h-4 text-gray-400" /> :
                     <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm">
            Manage Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, color }) {
  const colorClasses = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    green: 'text-green-400 bg-green-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
  };

  return (
    <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-gray-400 text-sm mt-1">{label}</p>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, description, color }) {
  const colorClasses = {
    cyan: 'hover:border-cyan-500/50 hover:bg-cyan-500/5',
    green: 'hover:border-green-500/50 hover:bg-green-500/5',
    purple: 'hover:border-purple-500/50 hover:bg-purple-500/5',
    orange: 'hover:border-orange-500/50 hover:bg-orange-500/5',
  };

  const iconColors = {
    cyan: 'text-cyan-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
  };

  return (
    <button className={`p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-left transition-all ${colorClasses[color]}`}>
      <Icon className={`w-5 h-5 ${iconColors[color]} mb-2`} />
      <p className="text-white font-medium">{label}</p>
      <p className="text-gray-500 text-xs mt-1">{description}</p>
    </button>
  );
}
