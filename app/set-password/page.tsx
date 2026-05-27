"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function SetPasswordPage() {
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [loading, setLoading] = useState(false);
  const [fout, setFout] = useState("");
  const [klaar, setKlaar] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFout("");

    if (wachtwoord.length < 8) {
      setFout("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (wachtwoord !== bevestig) {
      setFout("Wachtwoorden komen niet overeen.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password: wachtwoord });

    if (error) {
      setFout("Fout bij instellen wachtwoord. Probeer de link opnieuw te gebruiken.");
    } else {
      setKlaar(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #7B3FA0 0%, #E8823A 60%, #F5A623 100%)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/ypd-logo.png" alt="YPD Logo" className="h-16" />
        </div>

        {klaar ? (
          <div className="text-center">
            <div className="text-5xl mb-5">✅</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Wachtwoord ingesteld</h1>
            <p className="text-gray-500 text-sm">Je wordt doorgestuurd naar het dashboard...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Stel je wachtwoord in</h1>
            <p className="text-center text-gray-500 mb-8 text-sm">
              Kies een wachtwoord om in te kunnen loggen op het YPD Dashboard.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
                <input
                  type="password"
                  value={wachtwoord}
                  onChange={(e) => setWachtwoord(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  placeholder="Minimaal 8 tekens"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bevestig wachtwoord</label>
                <input
                  type="password"
                  value={bevestig}
                  onChange={(e) => setBevestig(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  placeholder="Herhaal je wachtwoord"
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
                {loading ? "Opslaan..." : "Stel wachtwoord in"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
