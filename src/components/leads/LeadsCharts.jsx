import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const STATUS_COLORS = {
  New: "#1a2fa8",
  Contacted: "#00c896",
  Interested: "#2a3fbf",
  Funded: "#00b085",
  "Not Interested": "#cbd5e1",
};

export default function LeadsCharts({ leads }) {
  const industryMap = {};
  leads.forEach((l) => {
    const key = l.industry || "Other";
    industryMap[key] = (industryMap[key] || 0) + 1;
  });
  const industryData = Object.entries(industryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const statusMap = {};
  leads.forEach((l) => {
    const key = l.status || "New";
    statusMap[key] = (statusMap[key] || 0) + 1;
  });
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-[#1a2fa8] mb-4">Leads by Industry</h2>
        {industryData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={industryData} margin={{ top: 0, right: 10, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} cursor={{ fill: "#f0f4ff" }} />
              <Bar dataKey="count" fill="#1a2fa8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-[#1a2fa8] mb-4">Leads by Status</h2>
        {statusData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#cbd5e1"} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 12, color: "#475569" }}>{value}</span>} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}