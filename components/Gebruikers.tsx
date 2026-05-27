"use client";

import { useEffect, useState } from "react";

interface Gebruiker {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function Gebruikers() {
  const [gebruikers, setGebruikers] = useState<Gebruiker[]>([]);
  const [laden, setLaden] = useState(true);
  const [nieuweEmail, setNieuweEmail] = useState("");
  const [toevoegen, setToevoegen] = useState(false);
  const [bericht, setBericht] = useState("");
  const [fout, setFout] = useState("");
  const [verwijderen, setVerwijderen] = useState<string | null>(null);

  useEffect(() => {
    laadGebruikers();
  }, []);

  async function laadGebruikers() {
    setLaden(true);
    try {
      const res = await fetch("/api/gebruikers");
      const data = await res.json();
      setGebruikers(data);
    } finally {
      setLaden(false);
    }
  }

  async function voegToe(e: React.FormEvent) {
    e.preventDefault();
    setToevoegen(true);
    setFout("");
    setBericht("");
    try {
      const res = await fetch("/api/gebruikers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nieuweEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBericht(`${nieuweEmail} is toegevoegd en ontvangt een welkomstmail.`);
      setNieuweEmail("");
      await laadGebruikers();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Fout bij toevoegen");
    } finally {
      setToevoegen(false);
    }
  }

  async function verwijderGebruiker(id: string, email: string) {
    if (!confirm(`Wil je ${email} verwijderen? Deze persoon kan dan niet meer inloggen.`)) return;
    setVerwijderen(id);
    try {
      const res = await fetch(`/api/gebruikers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fout bij verwijderen");
      setGebruikers((prev) => prev.filter((g) => g.id !== id));
    } catch {
      alert("Kon gebruiker niet verwijderen. Probeer opnieuw.");
    } finally {
      setVerwijderen(null);
    }
  }

  function formatDatum(iso: string | null) {
    if (!iso) return "Nog nooit";
    return new Date(iso).toLocaleString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function initialen(email: string) {
    return email.slice(0, 2).toUpperCase();
  }

  return (
    <div className="space-y-6">

      {/* Collega toevoegen */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Collega toevoegen</h2>
        <p className="text-sm text-gray-500 mb-5">
          De collega ontvangt automatisch een welkomstmail met uitleg hoe ze kunnen inloggen.
        </p>

        <form onSubmit={voegToe} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={nieuweEmail}
            onChange={(e) => setNieuweEmail(e.target.value)}
            placeholder="naam@ypd.nl"
            required
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
          />
          <button
            type="submit"
            disabled={toevoegen}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50"
            style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
          >
            {toevoegen ? "Toevoegen..." : "Toevoegen"}
          </button>
        </form>

        {bericht && (
          <div className="mt-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
            <span>✓</span> {bericht}
          </div>
        )}
        {fout && (
          <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {fout}
          </div>
        )}
      </div>

      {/* Collega's overzicht */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-5">
          Toegang
          {!laden && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              {gebruikers.length} {gebruikers.length === 1 ? "persoon" : "personen"}
            </span>
          )}
        </h2>

        {laden ? (
          <div className="text-center py-10 text-gray-400 text-sm">Laden...</div>
        ) : gebruikers.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-3">👤</div>
            <p className="text-sm">Nog geen collega's toegevoegd</p>
          </div>
        ) : (
          <div className="space-y-2">
            {gebruikers.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50/20 transition"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, #7B3FA0, #E8547A)" }}
                  >
                    {initialen(g.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{g.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Laatste login: {formatDatum(g.last_sign_in_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => verwijderGebruiker(g.id, g.email)}
                  disabled={verwijderen === g.id}
                  className="text-xs text-red-400 hover:text-red-600 font-medium transition disabled:opacity-40 shrink-0 ml-4"
                >
                  {verwijderen === g.id ? "..." : "Verwijder"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
