import { Users, UserPlus, Mail, SendHorizonal } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-[#1a2fa8]">{value.toLocaleString()}</p>
    </div>
  </div>
);

export default function StatsRow({ leads, totalCount }) {
  const total = totalCount ?? leads.length;
  const newLeads = leads.filter((l) => l.status === "New").length;
  const enriched = leads.filter((l) => l.email && l.email.trim() !== "").length;
  const emailsSent = leads.filter((l) => l.email_sent).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Users} label="Total Leads" value={total} accent="bg-[#1a2fa8]" />
      <StatCard icon={UserPlus} label="New Leads" value={newLeads} accent="bg-[#2a3fbf]" />
      <StatCard icon={Mail} label="Enriched (Have Email)" value={enriched} accent="bg-[#00c896]" />
      <StatCard icon={SendHorizonal} label="Emails Sent" value={emailsSent} accent="bg-[#00b085]" />
    </div>
  );
}