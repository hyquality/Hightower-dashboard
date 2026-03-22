/**
 * Lead Analytics Dashboard
 * Shows scraped leads data with source breakdown and trends
 */

import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import { 
  Users, MapPin, Building2, Star, TrendingUp, 
  Filter, Download, RefreshCw, Calendar, Globe
} from 'lucide-react';

const COLORS = ['#00f5ff', '#ff00aa', '#00ff88', '#ff8800', '#a855f7', '#3b82f6'];

export default function LeadAnalytics({ leads = [] }) {
  const [filters, setFilters] = useState({
    source: 'all',
    category: 'all',
    dateRange: '30d'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  // Calculate metrics
  const totalLeads = leads.length;
  const uniqueSources = [...new Set(leads.map(l => l.source).filter(Boolean))];
  
  // Source breakdown
  const sourceData = uniqueSources.map(source => ({
    name: source || 'unknown',
    value: leads.filter(l => l.source === source).length
  })).sort((a, b) => b.value - a.value);

  // Category breakdown
  const categoryData = [
    { name: 'Auto Repair', value: leads.filter(l => l.category === 'auto_repair').length },
    { name: 'Nail Salon', value: leads.filter(l => l.category === 'nail_salon').length },
    { name: 'Hair Salon', value: leads.filter(l => l.category === 'hair_salon').length },
    { name: 'Restaurant', value: leads.filter(l => l.category === 'restaurant').length },
    { name: 'POS (BuiltWith)', value: leads.filter(l => l.category?.startsWith('pos_')).length },
  ].filter(d => d.value > 0);

  // Daily trend (mock data)
  const trendData = [
    { date: 'Mon', new: 45, total: 1200 },
    { date: 'Tue', new: 52, total: 1252 },
    { date: 'Wed', new: 78, total: 1330 },
    { date: 'Thu', new: 65, total: 1395 },
    { date: 'Fri', new: 90, total: 1485 },
    { date: 'Sat', new: 35, total: 1520 },
    { date: 'Sun', new: 28, total: 1548 },
  ];

  // Quality scores (mock)
  const qualityData = [
    { name: 'High (has email + phone)', value: leads.filter(l => l.email && l.phone).length },
    { name: 'Medium (has email OR phone)', value: leads.filter(l => (l.email && !l.phone) || (!l.email && l.phone)).length },
    { name: 'Low (contact info missing)', value: leads.filter(l => !l.email && !l.phone).length },
  ];

  // Rating distribution
  const ratingData = [
    { range: '5★', count: leads.filter(l => l.rating?.includes('5')).length },
    { range: '4★', count: leads.filter(l => l.rating?.includes('4')).length },
    { range: '3★', count: leads.filter(l => l.rating?.includes('3')).length },
    { range: '2★', count: leads.filter(l => l.rating?.includes('2')).length },
    { range: '1★', count: leads.filter(l => l.rating?.includes('1')).length },
    { range: 'N/A', count: leads.filter(l => !l.rating).length },
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Lead Analytics</h2>
          <p className="text-gray-400">Scraped leads from multiple sources</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/50 hover:bg-cyan-500/30 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-gray-900 rounded-lg font-medium hover:bg-cyan-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          icon={Users} 
          label="Total Leads" 
          value={totalLeads.toLocaleString()} 
          trend={+12}
          color="cyan"
        />
        <MetricCard 
          icon={Globe} 
          label="Sources" 
          value={uniqueSources.length} 
          color="purple"
        />
        <MetricCard 
          icon={Building2} 
          label="Categories" 
          value={categoryData.length} 
          color="green"
        />
        <MetricCard 
          icon={Star} 
          label="Avg Rating" 
          value="4.2" 
          color="orange"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Breakdown */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Leads by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#6b7280' }}
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Leads by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis type="category" dataKey="name" stroke="#9ca3af" width={100} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" fill="#00f5ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Lead Acquisition Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="new" stroke="#00ff88" fillOpacity={1} fill="url(#colorNew)" name="New Leads" />
              <Line type="monotone" dataKey="total" stroke="#00f5ff" strokeDasharray="5 5" name="Total" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quality Distribution */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Data Quality</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={qualityData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {qualityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-3">
            {qualityData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                <span className="text-xs text-gray-400">{item.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Rating Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ratingData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="range" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Leads Table */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Leads</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Business</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Category</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Source</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Contact</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Rating</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Scraped</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 10).map((lead, idx) => (
                <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 px-4 text-white font-medium">{lead.business_name}</td>
                  <td className="py-3 px-4">
                    <CategoryBadge category={lead.category} />
                  </td>
                  <td className="py-3 px-4">
                    <SourceBadge source={lead.source} />
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {lead.email && <div className="text-sm">{lead.email}</div>}
                    {lead.phone && <div className="text-sm text-gray-500">{lead.phone}</div>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {lead.rating && <span className="text-yellow-400">★ {lead.rating}</span>}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-400 text-sm">
                    {lead.scraped_at ? new Date(lead.scraped_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, trend, color }) {
  const colorClasses = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    green: 'text-green-400 bg-green-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
  };

  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{value}</span>
            {trend !== undefined && (
              <span className={`text-sm ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryBadge({ category }) {
  const styles = {
    auto_repair: 'bg-blue-500/20 text-blue-400',
    nail_salon: 'bg-pink-500/20 text-pink-400',
    hair_salon: 'bg-purple-500/20 text-purple-400',
    restaurant: 'bg-orange-500/20 text-orange-400',
  };
  
  const labels = {
    auto_repair: 'Auto Repair',
    nail_salon: 'Nail Salon',
    hair_salon: 'Hair Salon',
    restaurant: 'Restaurant',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category] || 'bg-gray-500/20 text-gray-400'}`}>
      {labels[category] || category}
    </span>
  );
}

function SourceBadge({ source }) {
  const styles = {
    google_maps: 'bg-cyan-500/20 text-cyan-400',
    yelp: 'bg-red-500/20 text-red-400',
    builtwith: 'bg-green-500/20 text-green-400',
    fmcs: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[source] || 'bg-gray-500/20 text-gray-400'}`}>
      {source || 'unknown'}
    </span>
  );
}
