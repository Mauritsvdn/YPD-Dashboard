"use client";

import { useState } from "react";
import { Kandidaat } from "@/lib/types";
import { generateMailchimpHtml } from "@/lib/email-template";

interface Props {
  kandidaten: Kandidaat[];
  laden: boolean;
  onVerwijder: (id: string) => void;
  onVerstuurd: () => void;
}

export default function HuidigeMailing({ kandidaten, laden, onVerwijder, onVerstuurd }: Props) {
  const [preview, setPreview] = useState(false);
  const [versturen, setVersturen] = useState(false);
  const [bericht, setBericht] = useState("");
  const [fout, setFout] = useState("");

  // Testmail
  const [testModus, setTestModus] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testVersturen, setTestVersturen] = useState(false);
  const [testBericht, setTestBericht] = useState("");

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || "";

  let previewHtml = "";
  if (kandidaten.length > 0) {
    try {
      previewHtml = generateMailchimpHtml(kandidaten, baseUrl);
    } catch {
      previewHtml = "<p style='padding:2rem;color:red'>Fout bij genereren preview.</p>";
    }
  }

  async function verstuurMailing() {
    if (!confirm("Weet je zeker dat je de mailing naar de hele lijst wilt versturen?")) return;
    setVersturen(true);
    setFout("");
    setBericht("");
    try {
      const res = await fetch("/api/send-mailchimp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kandidaten }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij versturen");
      setBericht(`✓ Mailing verstuurd! Onderwerp: "${data.onderwerp}"`);
      onVerstuurd();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Fout bij versturen");
    } finally {
      setVersturen(false);
    }
  }

  async function verstuurTestmail(e: React.FormEvent) {
    e.preventDefault();
    setTestVersturen(true);
    setTestBericht("");
    setFout("");
    try {
      const res = await fetch("/api/test-mailchimp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kandidaten, testEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij versturen");
      setTestBericht(`✓ Testmail verstuurd naar ${testEmail}`);
      setTestModus(false);
      setTestEmail("");
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Fout bij versturen testmail");
    } finally {
      setTestVersturen(false);
    }
  }

  const maandJaar = new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Huidige mailing</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {maandJaar} &bull; {laden ? "laden..." : `${kandidaten.length} kandidaat${kandidaten.length !== 1 ? "en" : ""}`}
          </p>
        </div>
        {!laden && kandidaten.length > 0 && (
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-purple-200 text-purple-700 hover:bg-purple-50 transition"
            >
              {preview ? "Sluit preview" : "Preview"}
            </button>
            <button
              onClick={() => { setTestModus(!testModus); setFout(""); setTestBericht(""); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Testmail
            </button>
            <button
              onClick={verstuurMailing}
              disabled={versturen}
              className="col-span-2 sm:col-span-1 px-4 py-2 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50"
              style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
            >
              {versturen ? "Versturen..." : "Verstuur naar lijst"}
            </button>
          </div>
        )}
      </div>

      {/* Testmail formulier */}
      {testModus && (
        <form onSubmit={verstuurTestmail} className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Stuur testmail naar:</span>
            <button type="button" onClick={() => setTestModus(false)} className="text-gray-400 hover:text-gray-600 text-sm transition">✕</button>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="jouw@email.nl"
              required
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              type="submit"
              disabled={testVersturen}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 shrink-0"
              style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
            >
              {testVersturen ? "..." : "Verstuur"}
            </button>
          </div>
        </form>
      )}

      {/* Berichten */}
      {testBericht && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {testBericht}
        </div>
      )}
      {bericht && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {bericht}
        </div>
      )}
      {fout && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {fout}
        </div>
      )}

      {laden ? (
        <div className="text-center py-12 text-gray-400 text-sm">Laden...</div>
      ) : kandidaten.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm">Nog geen kandidaten toegevoegd aan de mailing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {kandidaten.map((k) => (
            <div key={k.id} className="flex items-start justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50/30 transition">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-800">{k.neepnaam}</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{k.categorie}</span>
                </div>
                <p className="text-xs text-gray-500">{k.regio} &bull; {k.beschikbaarheid} &bull; €{k.salaris},- ({k.type})</p>
                {k.functies.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{k.functies.join(", ")}</p>
                )}
              </div>
              <button
                onClick={() => onVerwijder(k.id)}
                className="ml-4 text-red-400 hover:text-red-600 text-xs font-medium transition shrink-0"
              >
                Verwijder
              </button>
            </div>
          ))}
        </div>
      )}

      {preview && kandidaten.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">E-mail preview</h3>
          <div className="border border-gray-200 rounded-xl overflow-hidden" style={{ height: "clamp(400px, 70vh, 600px)" }}>
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full"
              title="Mailing preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
