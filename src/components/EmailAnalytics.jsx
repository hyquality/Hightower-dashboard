/**
 * Enhanced Email Analytics Component
 * Shows granular open/click tracking with Resend
 */

import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Mail, MousePointer, Eye, CheckCircle, XCircle, 
  TrendingUp, TrendingDown, Clock, Globe, Calendar 
} from 'lucide-react';

const COLORS = ['#00f5ff', '#ff00aa', '#00ff88', '#ff8800', '#a855f7'];

export default function EmailAnalytics({ campaignId, emailLogs }) {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading - in real app, fetch from API
    setTimeout(() => setLoading(false), 1000);
  }, [campaignId]);

  // Calculate metrics
  const metrics = {
    sent: emailLogs?.length || 0,
    delivered: emailLogs?.filter(e => e.delivered)?.length || 0,
    opened: emailLogs?.filter(e => e.opened)?.length || 0,
    clicked: emailLogs?.filter(e => e.clicked)?.length || 0,
    bounced: emailLogs?.filter(e => e.bounced)?.length || 0,
  };

  const openRate = metrics.delivered > 0 ? (metrics.opened / metrics.delivered * 100).toFixed(1) : 0;
  const clickRate = metrics.opened > 0 ? (metrics.clicked / metrics.opened * 100).toFixed(1) : 0;

  // Mock time series data - replace with real API data
  const timeSeriesData = [
    { date: 'Mon', sent: 120, delivered: 118, opened: 45, clicked: 12 },
    { date: 'Tue', sent: 98, delivered: 96, opened: 38, clicked: 8 },
    { date: 'Wed', sent: 150, delivered: 147, opened: 72, clicked: 25 },
    { date: 'Thu', sent: 134, delivered: 130, opened: 55, clicked: 18 },
    { date: 'Fri', sent: 110, delivered: 108, opened: 48, clicked: 15 },
    { date: 'Sat', sent: 45, delivered: 44, opened: 22, clicked: 5 },
    { date: 'Sun', sent: 32, delivered: 31, opened: 14, clicked: 3 },
  ];

  // Campaign comparison data
  const campaignComparison = [
    { name: 'This Campaign', openRate: parseFloat(openRate), clickRate: parseFloat(clickRate) },
    { name: 'Industry Avg', openRate: 21.5, clickRate: 2.8 },
  ];

  // Device breakdown (mock)
  const deviceData = [
    { name: 'Desktop', value: 45 },
    { name: 'Mobile', value: 38 },
    { name: 'Tablet', value: 17 },
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
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Email Analytics</h2>
        <div className="flex gap-2">
          {['24h', '7d', '30d', '90d'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard 
          icon={Mail} 
          label="Sent" 
          value={metrics.sent} 
          color="cyan"
        />
        <MetricCard 
          icon={CheckCircle} 
          label="Delivered" 
          value={metrics.delivered} 
          color="green"
        />
        <MetricCard 
          icon={Eye} 
          label="Opened" 
          value={metrics.opened} 
          subValue={`${openRate}%`}
          color="purple"
          trend={+5.2}
        />
        <MetricCard 
          icon={MousePointer} 
          label="Clicked" 
          value={metrics.clicked}
          subValue={`${clickRate}%`}
          color="orange"
          trend={+2.1}
        />
        <MetricCard 
          icon={XCircle} 
          label="Bounced" 
          value={metrics.bounced} 
          color="red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Over Time */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Delivery Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00f5ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="sent" stroke="#00f5ff" fillOpacity={1} fill="url(#colorSent)" name="Sent" />
              <Area type="monotone" dataKey="delivered" stroke="#00ff88" fill="transparent" name="Delivered" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Open/Click Trend */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Engagement Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="opened" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} name="Opened" />
              <Line type="monotone" dataKey="clicked" stroke="#ff8800" strokeWidth={2} dot={{ fill: '#ff8800' }} name="Clicked" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Breakdown */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Device Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            {deviceData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                <span className="text-gray-400 text-sm">{item.name} {item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Comparison */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Performance vs Industry</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={campaignComparison} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis type="category" dataKey="name" stroke="#9ca3af" width={100} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="openRate" fill="#00f5ff" name="Open Rate %" radius={[0, 4, 4, 0]} />
              <Bar dataKey="clickRate" fill="#ff00aa" name="Click Rate %" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performing Emails */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Email Events</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Recipient</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Subject</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Sent</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Opened</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Clicked</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(emailLogs || []).slice(0, 10).map((log, idx) => (
                <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 px-4 text-white">{log.recipient_email}</td>
                  <td className="py-3 px-4 text-gray-300 truncate max-w-xs">{log.subject}</td>
                  <td className="py-3 px-4 text-center text-gray-400">
                    {log.sent_at ? new Date(log.sent_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {log.opened ? <Eye className="w-4 h-4 text-purple-400 inline" /> : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {log.clicked ? <MousePointer className="w-4 h-4 text-orange-400 inline" /> : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={log.bounced ? 'bounced' : log.delivered ? 'delivered' : 'pending'} />
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

function MetricCard({ icon: Icon, label, value, subValue, color, trend }) {
  const colorClasses = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    green: 'text-green-400 bg-green-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    red: 'text-red-400 bg-red-500/10',
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
            <span className="text-2xl font-bold text-white">{value?.toLocaleString()}</span>
            {subValue && <span className="text-gray-400 text-sm">{subValue}</span>}
          </div>
        </div>
        {trend !== undefined && (
          <div className={`ml-auto flex items-center text-sm ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    delivered: 'bg-green-500/20 text-green-400',
    opened: 'bg-purple-500/20 text-purple-400',
    clicked: 'bg-orange-500/20 text-orange-400',
    bounced: 'bg-red-500/20 text-red-400',
    pending: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
