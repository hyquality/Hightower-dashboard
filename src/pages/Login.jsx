import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { BRAND_LOGO_URL } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMessage("Check your email for the sign-in link.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex justify-center mb-8">
          <img src={BRAND_LOGO_URL} alt="Hightower Funding" className="h-12 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-center text-[#1a2fa8] mb-2">Leads dashboard</h1>
        <p className="text-sm text-slate-500 text-center mb-8">
          Sign in with your email. We&apos;ll send you a magic link.
        </p>
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Email
            </label>
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          {message && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{message}</p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a2fa8] hover:bg-[#1525a0] text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Send magic link
          </Button>
        </form>
      </div>
    </div>
  );
}
