"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fout, setFout] = useState("");
  const [resetModus, setResetModus] = useState(false);
  const [resetVerstuurd, setResetVerstuurd] = useState(false);
  const router = useRouter();

  async function handleInloggen(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFout("");
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setFout("Onjuist e-mailadres of wachtwoord. Probeer opnieuw.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFout("");
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/set-password`,
    });
    if (error) {
      setFout("Fout bij versturen. Probeer opnieuw.");
    } else {
      setResetVerstuurd(true);
    }
    setLoading(false);
  }

  // Wachtwoord vergeten scherm
  if (resetModus) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7B3FA0 0%, #E8823A 60%, #F5A623 100%)" }}>
        <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src="/ypd-logo.png" alt="YPD Logo" className="h-16" />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Wachtwoord vergeten</h1>

          {resetVerstuurd ? (
            <div className="text-center mt-4">
              <div className="text-5xl mb-5">📬</div>
              <p className="font-semibold text-gray-800 mb-2">Check je e-mail</p>
              <p className="text-gray-500 text-sm leading-relaxed">
                We hebben een herstellink gestuurd naar <strong>{email}</strong>.
                Klik op de link om een nieuw wachtwoord in te stellen.
              </p>
              <button
                onClick={() => { setResetModus(false); setResetVerstuurd(false); }}
                className="mt-6 text-sm text-purple-600 hover:underline"
              >
                Terug naar inloggen
              </button>
            </div>
          ) : (
            <>
              <p className="text-center text-gray-500 mb-8 text-sm">
                Voer je e-mailadres in — we sturen je een link om een nieuw wachtwoord in te stellen.
              </p>
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    placeholder="naam@ypd.nl"
                    required
                  />
                </div>
                {fout && <p className="text-red-500 text-sm text-center">{fout}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-base transition disabled:opacity-60"
                  style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
                >
                  {loading ? "Versturen..." : "Stuur herstellink"}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetModus(false); setFout(""); }}
                  className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  Terug naar inloggen
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // Normaal inlogscherm
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7B3FA0 0%, #E8823A 60%, #F5A623 100%)" }}>
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/ypd-logo.png" alt="YPD Logo" className="h-16" />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Recruiter Dashboard</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">Log in om door te gaan</p>

        <form onSubmit={handleInloggen} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="naam@ypd.nl"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              placeholder="••••••••"
              required
            />
          </div>
          {fout && <p className="text-red-500 text-sm text-center">{fout}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold text-base transition disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
          >
            {loading ? "Inloggen..." : "Inloggen"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => { setResetModus(true); setFout(""); }}
            className="text-sm text-gray-400 hover:text-purple-600 transition"
          >
            Wachtwoord vergeten?
          </button>
        </div>
      </div>
    </div>
  );
}
