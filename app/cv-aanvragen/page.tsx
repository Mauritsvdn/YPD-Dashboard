"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const LOGO_URL = "/ypd-logo.png";

function CvAanvraagFormulier() {
  const params = useSearchParams();
  const kandidaat = params.get("kandidaat") ?? "";
  const emailParam = params.get("email") ?? "";

  const [email, setEmail] = useState(emailParam);
  const [telefoonnummer, setTelefoonnummer] = useState("");
  const [bedrijf, setBedrijf] = useState("");
  const [laden, setLaden] = useState(false);
  const [status, setStatus] = useState<"idle" | "klaar" | "fout">("idle");
  const [foutmelding, setFoutmelding] = useState("");

  useEffect(() => {
    setEmail(emailParam);
  }, [emailParam]);

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    setLaden(true);
    setFoutmelding("");

    try {
      const res = await fetch("/api/cv-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kandidaat, email, telefoonnummer, bedrijf }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Er is iets misgegaan");
      }
      setStatus("klaar");
    } catch (err) {
      setFoutmelding(err instanceof Error ? err.message : "Er is iets misgegaan");
      setStatus("fout");
    } finally {
      setLaden(false);
    }
  }

  if (!kandidaat) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ongeldige aanvraag — ontbrekende kandidaatnaam.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 text-center border-b border-gray-100">
          <img src={LOGO_URL} alt="YPD" className="h-10 mx-auto mb-1" />
        </div>
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A, #E8823A, #F5A623)" }} />

        <div className="px-8 py-7">
          {status === "klaar" ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Aanvraag ontvangen!</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                We hebben uw aanvraag voor het CV van <strong className="text-purple-700">{kandidaat}</strong> ontvangen.
                Een consultant neemt zo spoedig mogelijk contact met u op.
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Vragen? <a href="mailto:info@ypd.nl" className="text-purple-600 hover:underline">info@ypd.nl</a> · 088 80 10 200
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-1">CV aanvragen</h2>
              <p className="text-sm text-gray-500 mb-6">
                U vraagt het CV aan van{" "}
                <span className="font-semibold text-purple-700">{kandidaat}</span>.
                Vul uw gegevens in zodat we contact kunnen opnemen.
              </p>

              <form onSubmit={verstuur} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    E-mailadres <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="uw@bedrijf.nl"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Telefoonnummer <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={telefoonnummer}
                    onChange={(e) => setTelefoonnummer(e.target.value)}
                    required
                    placeholder="06-12345678"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Bedrijfsnaam <span className="text-gray-400 font-normal">(optioneel)</span>
                  </label>
                  <input
                    type="text"
                    value={bedrijf}
                    onChange={(e) => setBedrijf(e.target.value)}
                    placeholder="Uw bedrijf B.V."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                {foutmelding && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    {foutmelding}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={laden}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-50 mt-2"
                  style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
                >
                  {laden ? "Aanvraag versturen…" : "Aanvraag versturen →"}
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-5">
                <a href="https://ypd.nl" className="text-purple-600 hover:underline">ypd.nl</a>
                {" · "}088 80 10 200{" · "}
                <a href="mailto:info@ypd.nl" className="text-purple-600 hover:underline">info@ypd.nl</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CvAanvraagPagina() {
  return (
    <Suspense>
      <CvAanvraagFormulier />
    </Suspense>
  );
}
