import { useState, useEffect } from "react";
import { X, Save, Loader2, FileDown, FileX, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { apiPost } from "@/lib/serverApi";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INDUSTRIES = ["Restaurant", "Retail", "Construction", "Healthcare", "Transportation", "Real Estate", "Technology", "Manufacturing", "Auto", "Beauty & Wellness", "Home Services", "Legal", "Other"];
const STATUSES = ["New", "Contacted", "Interested", "Applied", "Funded", "Not Interested"];
const SOURCES = ["Google Maps", "Yelp", "LinkedIn", "Referral", "Cold Call", "Website", "Other"];

const STATUS_STYLES = {
  New: "bg-[#e0f2fe] text-[#0369a1]",
  Contacted: "bg-[#fef9c3] text-[#854d0e]",
  Interested: "bg-[#ccfbf1] text-[#0f766e]",
  Funded: "bg-[#dcfce7] text-[#166534]",
  "Not Interested": "bg-slate-100 text-slate-500",
};

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}

function DocsSection({ lead }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const uris = lead?.doc_file_uris
    ? lead.doc_file_uris.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const fetchLinks = async () => {
    if (fetched || uris.length === 0) return;
    setLoading(true);
    try {
      const data = await apiPost("/api/documents/signed-url", { paths: uris });
      const mapped = (data.urls || []).map((item) => ({
        url: item.signed_url || null,
        name: decodeURIComponent(String(item.path || "").split("/").pop() || item.path || ""),
      }));
      setLinks(mapped);
    } catch {
      setLinks(
        uris.map((uri) => ({
          url: null,
          name: decodeURIComponent(uri.split("/").pop() || uri),
        }))
      );
    }
    setLoading(false);
    setFetched(true);
  };

  if (uris.length === 0) return null;

  return (
    <div className="col-span-2">
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {/* Header — click to load */}
        <button
          onClick={fetchLinks}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            📄 Submitted Documents ({uris.length})
          </span>
          {!fetched && <span className="text-xs text-[#00c896] font-semibold">Click to load ↓</span>}
          {fetched && <span className="text-xs text-slate-400">✓ Loaded</span>}
        </button>

        {/* File list */}
        {fetched && (
          <div className="divide-y divide-slate-100">
            {loading && (
              <div className="px-4 py-3 flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating links...
              </div>
            )}
            {!loading && links.map((doc, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700 truncate flex-1">📎 {doc.name}</span>
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-white bg-[#1a2fa8] hover:bg-[#1525a0] px-3 py-1.5 rounded-md shrink-0 transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Download
                  </a>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <FileX className="w-3.5 h-3.5" /> Unavailable
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeadPanel({ lead, onClose, isNew = false }) {
  const [form, setForm] = useState(lead || { status: "New" });
  const [saving, setSaving] = useState(false);
  const [enrichingHunter, setEnrichingHunter] = useState(false);
  const qc = useQueryClient();

  const canHunterEnrich =
    !isNew &&
    lead?.id &&
    (!form.email?.trim() || !form.owner_name?.trim()) &&
    Boolean(form.website?.trim() || form.business_name?.trim());

  useEffect(() => {
    setForm(lead || { status: "New" });
  }, [lead]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form };
    delete payload.id;
    delete payload.created_at;
    if (isNew) {
      const { error } = await supabase.from("leads").insert(payload);
      if (error) {
        console.error(error);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("leads").update(payload).eq("id", lead.id);
      if (error) {
        console.error(error);
        setSaving(false);
        return;
      }
    }
    qc.invalidateQueries({ queryKey: ["leads"] });
    setSaving(false);
    onClose();
  };

  const handleHunterEnrichLead = async () => {
    if (!lead?.id) return;
    setEnrichingHunter(true);
    try {
      await apiPost("/api/enrich-leads-hunter", { lead_ids: [lead.id], limit: 1 });
      const { data, error } = await supabase.from("leads").select("*").eq("id", lead.id).single();
      if (!error && data) setForm(data);
      qc.invalidateQueries({ queryKey: ["leads"] });
      alert("Updated from Hunter.io where a match was found.");
    } catch (e) {
      alert(e?.message || "Hunter enrichment failed");
    }
    setEnrichingHunter(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a2fa8] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg leading-tight">
              {isNew ? "Add New Lead" : (form.business_name || "Edit Lead")}
            </h2>
            {!isNew && form.status && (
              <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[form.status]}`}>
                {form.status}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Business Name">
                <Input value={form.business_name || ""} onChange={(e) => set("business_name", e.target.value)} />
              </Field>
            </div>
            <Field label="Owner Name">
              <Input value={form.owner_name || ""} onChange={(e) => set("owner_name", e.target.value)} />
            </Field>
            <Field label="Industry">
              <Select value={form.industry || ""} onValueChange={(v) => set("industry", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Email">
              <Input value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Website">
              <Input value={form.website || ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Source">
              <Select value={form.source || ""} onValueChange={(v) => set("source", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status || "New"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="City">
              <Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="State">
              <Input value={form.state || ""} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={form.address || ""} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Zip">
              <Input value={form.zip || ""} onChange={(e) => set("zip", e.target.value)} />
            </Field>
            <Field label="Rating">
              <Input type="number" step="0.1" min="0" max="5" value={form.rating || ""} onChange={(e) => set("rating", parseFloat(e.target.value))} />
            </Field>
            <Field label="Review Count">
              <Input type="number" value={form.review_count || ""} onChange={(e) => set("review_count", parseInt(e.target.value))} />
            </Field>
            <Field label="Est. Monthly Revenue ($)">
              <Input type="number" value={form.estimated_monthly_revenue || ""} onChange={(e) => set("estimated_monthly_revenue", parseFloat(e.target.value))} />
            </Field>
            <Field label="Employee Count">
              <Input type="number" value={form.employee_count || ""} onChange={(e) => set("employee_count", parseInt(e.target.value))} />
            </Field>
            <Field label="Years in Business">
              <Input type="number" value={form.years_in_business || ""} onChange={(e) => set("years_in_business", parseFloat(e.target.value))} />
            </Field>
            <Field label="Scraped Date">
              <Input type="date" value={form.scraped_date || ""} onChange={(e) => set("scraped_date", e.target.value)} />
            </Field>
            <Field label="Enriched Date">
              <Input type="date" value={form.enriched_date || ""} onChange={(e) => set("enriched_date", e.target.value)} />
            </Field>
            <Field label="Email Sent Date">
              <Input type="date" value={form.email_sent_date || ""} onChange={(e) => set("email_sent_date", e.target.value)} />
            </Field>
            <div className="col-span-2">
              <Field label="Source URL">
                <Input value={form.source_url || ""} onChange={(e) => set("source_url", e.target.value)} placeholder="https://" />
              </Field>
            </div>
            <Field label="Enrichment Source">
              <Input value={form.enrichment_source || ""} onChange={(e) => set("enrichment_source", e.target.value)} />
            </Field>
            <Field label="Airtable ID">
              <Input value={form.airtable_id || ""} onChange={(e) => set("airtable_id", e.target.value)} />
            </Field>
            <div className="col-span-2">
              <Field label="Email Template">
                <Textarea rows={3} value={form.email_template || ""} onChange={(e) => set("email_template", e.target.value)} placeholder="Email template text..." />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Notes">
                <Textarea rows={4} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes..." />
              </Field>
            </div>

            {/* ── Documents section (only shows if docs exist) ── */}
            {!isNew && <DocsSection lead={lead} />}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-wrap">
          {canHunterEnrich && (
            <Button
              type="button"
              variant="outline"
              className="mr-auto border-amber-200 text-amber-900 hover:bg-amber-50"
              onClick={handleHunterEnrichLead}
              disabled={saving || enrichingHunter}
            >
              {enrichingHunter ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
              )}
              Fill from Hunter
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#00c896] hover:bg-[#00b085] text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {isNew ? "Create Lead" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}