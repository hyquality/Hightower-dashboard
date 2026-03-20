import { useState, useEffect } from "react";
import { X, Save, Loader2, Send, Users, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchLeadsBatched } from "@/lib/supabaseQueries";
import { apiPost } from "@/lib/serverApi";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildEmailHtml } from "@/lib/emailTemplate";

const INDUSTRIES = ["All", "Restaurant", "Retail", "Construction", "Healthcare", "Transportation", "Real Estate", "Technology", "Manufacturing", "Auto", "Beauty & Wellness", "Home Services", "Legal", "Other"];
const STATUSES = ["All", "New", "Contacted", "Interested", "Applied", "Funded", "Not Interested"];
const TEMPLATES = ["Introduction", "Follow-up", "Special Offer", "Re-engagement", "Custom"];

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function CampaignFormPanel({ campaign, onClose }) {
  const isNew = !campaign;
  const [form, setForm] = useState(campaign || { status: "Draft", filter_industry: "All", filter_status: "All" });
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [leadCount, setLeadCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const qc = useQueryClient();

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Fetch lead count for the selected filters
  useEffect(() => {
    const fetchCount = async () => {
      setLoadingCount(true);
      try {
        const filter = {};
        if (form.filter_industry && form.filter_industry !== "All") filter.industry = form.filter_industry;
        if (form.filter_status && form.filter_status !== "All") filter.status = form.filter_status;
        
        const filterObj = {};
        if (form.filter_industry && form.filter_industry !== "All") filterObj.industry = form.filter_industry;
        if (form.filter_status && form.filter_status !== "All") filterObj.status = form.filter_status;
        const allLeads = await fetchLeadsBatched(filterObj);
        setLeadCount(allLeads.filter(l => l.email).length);
      } catch (e) {
        console.error(e);
      }
      setLoadingCount(false);
    };
    fetchCount();
  }, [form.filter_industry, form.filter_status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = { ...form };
      delete row.id;
      delete row.created_at;
      if (isNew) {
        const { error } = await supabase.from("campaigns").insert(row);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("campaigns").update(row).eq("id", campaign.id);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      onClose();
    } catch (e) {
      alert("Error saving campaign: " + e.message);
    }
    setSaving(false);
  };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      let campaignId = campaign?.id;

      // Save/create the campaign first
      if (isNew) {
        const row = { ...form, status: "Active", launched_date: today };
        delete row.id;
        delete row.created_at;
        const { data: created, error: insErr } = await supabase.from("campaigns").insert(row).select().single();
        if (insErr) throw insErr;
        campaignId = created.id;
      } else {
        const row = { ...form, status: "Active", launched_date: today };
        delete row.id;
        delete row.created_at;
        const { error: upErr } = await supabase.from("campaigns").update(row).eq("id", campaign.id);
        if (upErr) throw upErr;
      }

      const result = await apiPost("/api/send-campaign", { campaign_id: campaignId });
      if (result?.error) throw new Error(result.error);

      alert(`Campaign launched! Sent ${result.sent} email(s) to ${result.total_targets} matching lead(s).`);
    } catch (e) {
      alert("Error launching campaign: " + e.message);
    }
    qc.invalidateQueries({ queryKey: ["campaigns"] });
    setLaunching(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="bg-[#0d1f3c] text-white px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg">{isNew ? "New Campaign" : campaign.name}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <Field label="Campaign Name">
            <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Spring Outreach 2025" />
          </Field>
          <Field label="Template">
            <Select value={form.template || ""} onValueChange={(v) => set("template", v)}>
              <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
              <SelectContent>{TEMPLATES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Subject Line">
            <Input value={form.subject || ""} onChange={(e) => set("subject", e.target.value)} placeholder="Email subject..." />
          </Field>
          <Field label="Email Body">
            <Textarea rows={6} value={form.body || ""} onChange={(e) => set("body", e.target.value)} placeholder="Write your email body here..." />
          </Field>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Target Audience</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Filter by Industry">
                <Select value={form.filter_industry || "All"} onValueChange={(v) => set("filter_industry", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Filter by Status">
                <Select value={form.filter_status || "All"} onValueChange={(v) => set("filter_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex items-center gap-2 bg-[#f0f7fa] rounded-lg px-4 py-3">
              <Users className="w-4 h-4 text-[#1a6b7c]" />
              {loadingCount ? (
                <span className="text-sm text-slate-500">Calculating...</span>
              ) : (
                <span className="text-sm font-semibold text-[#0d1f3c]">
                  {leadCount !== null ? `${leadCount.toLocaleString()} leads with emails match this audience` : "—"}
                </span>
              )}
            </div>
          </div>

          {/* Email Preview */}
          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-[#1a6b7c] hover:underline"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "Hide" : "Preview"} Email Design
            </button>
            {showPreview && (
              <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden" style={{ height: 400 }}>
                <iframe
                  srcDoc={buildEmailHtml({ subject: form.subject, body: form.body || "Your email body will appear here.", recipientName: "John" })}
                  title="Email Preview"
                  className="w-full h-full border-0"
                  style={{ transform: "scale(0.75)", transformOrigin: "top left", width: "133%", height: "133%" }}
                />
              </div>
            )}
          </div>

          {!isNew && (
            <Field label="Status">
              <Select value={form.status || "Draft"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Draft", "Active", "Paused", "Completed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-between gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || launching} variant="outline">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button onClick={handleLaunch} disabled={saving || launching} className="bg-[#1a6b7c] hover:bg-[#155e6d] text-white">
              {launching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Launch
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}