import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCampaigns } from "@/lib/supabaseQueries";
import { apiPost } from "@/lib/serverApi";
import { X, Send, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BulkSendModal({ selectedLeads, onClose, onSuccess }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [sending, setSending] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => listCampaigns(),
  });

  const leadsWithEmail = selectedLeads.filter(l => l.email);
  const leadsWithoutEmail = selectedLeads.filter(l => !l.email);

  const handleSend = async () => {
    if (!selectedCampaignId) return;
    setSending(true);
    try {
      const result = await apiPost("/api/send-to-leads", {
        campaign_id: selectedCampaignId,
        lead_ids: leadsWithEmail.map((l) => l.id),
        leads: leadsWithEmail,
      });
      if (result?.error) throw new Error(result.error);
      alert(`✅ Sent ${result.sent} email(s) successfully!`);
      onSuccess();
    } catch (e) {
      alert("Error sending emails: " + e.message);
    }
    setSending(false);
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a2fa8] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            <h2 className="font-bold text-lg">Send Campaign to Selected Leads</h2>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Summary */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-1">
            <p className="text-sm font-semibold text-slate-700">
              {selectedLeads.length} lead{selectedLeads.length !== 1 ? "s" : ""} selected
            </p>
            <p className="text-sm text-[#00c896] font-medium">
              ✓ {leadsWithEmail.length} have email addresses and will receive the campaign
            </p>
            {leadsWithoutEmail.length > 0 && (
              <p className="text-sm text-slate-400">
                ✗ {leadsWithoutEmail.length} have no email and will be skipped
              </p>
            )}
          </div>

          {/* Campaign picker */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Select Campaign
            </label>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a campaign..." />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.template || "No template"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign preview info */}
          {selectedCampaign && (
            <div className="border border-slate-200 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold text-slate-700">{selectedCampaign.subject}</p>
              <p className="text-slate-500 text-xs line-clamp-2">{selectedCampaign.body}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || !selectedCampaignId || leadsWithEmail.length === 0}
            className="bg-[#00c896] hover:bg-[#00b085] text-white"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send to {leadsWithEmail.length} Lead{leadsWithEmail.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}