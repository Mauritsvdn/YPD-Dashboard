"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [verstuurd, setVerstuurd] = useState(false);
  const [fout, setFout] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFout("");

    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false, // Alleen bestaande gebruikers kunnen inloggen
      },
    });

    if (error) {
      setFout(
        error.message.includes("not authorized") || error.message.includes("Signups")
          ? "Dit e-mailadres heeft geen toegang. Neem contact op met de beheerder."
          : "Er is iets misgegaan. Probeer opnieuw."
      );
    } else {
      setVerstuurd(true);
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
          <img src="https://ypd.nl/wp-content/uploads/2025/05/ypd.svg" alt="YPD Logo" className="h-16" />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Recruiter Dashboard</h1>

        {verstuurd ? (
          <div className="text-center mt-4">
            <div className="text-5xl mb-5">📬</div>
            <p className="font-semibold text-gray-800 mb-2">Check je e-mail</p>
            <p className="text-gray-500 text-sm leading-relaxed">
              We hebben een inloglink gestuurd naar{" "}
              <span className="font-medium text-gray-700">{email}</span>.<br />
              Klik op de link om direct in te loggen.
            </p>
            <button
              onClick={() => { setVerstuurd(false); setEmail(""); }}
              className="mt-6 text-sm text-purple-600 hover:underline"
            >
              Ander e-mailadres gebruiken
            </button>
          </div>
        ) : (
          <>
            <p className="text-center text-gray-500 mb-8 text-sm">
              Voer je e-mailadres in om een inloglink te ontvangen
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mailadres
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="naam@ypd.nl"
                  required
                />
              </div>
              {fout && (
                <p className="text-red-500 text-sm text-center">{fout}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-white font-semibold text-base transition disabled:opacity-60"
                style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
              >
                {loading ? "Versturen..." : "Stuur inloglink"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
