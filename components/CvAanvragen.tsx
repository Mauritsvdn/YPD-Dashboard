"use client";

import { useEffect, useState } from "react";
import { CvRequest } from "@/lib/types";

export default function CvAanvragen() {
  const [aanvragen, setAanvragen] = useState<CvRequest[]>([]);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState("");

  useEffect(() => {
    async function laadAanvragen() {
      try {
        const res = await fetch("/api/cv-requests");
        if (!res.ok) throw new Error("Fout bij laden");
        const data = await res.json();
        setAanvragen(data);
      } catch {
        setFout("Kon CV-aanvragen niet laden.");
      } finally {
        setLaden(false);
      }
    }
    laadAanvragen();
  }, []);

  function formatDatum(iso: string) {
    return new Date(iso).toLocaleString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-5">CV-aanvragen</h2>

      {laden && (
        <div className="text-center py-8 text-gray-400 text-sm">Laden...</div>
      )}

      {fout && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{fout}</div>
      )}

      {!laden && !fout && aanvragen.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📬</div>
          <p className="text-sm">Nog geen CV-aanvragen ontvangen</p>
        </div>
      )}

      {!laden && aanvragen.length > 0 && (
        <div className="space-y-3">
          {aanvragen.map((a) => (
            <div key={a.id} className="flex items-start justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50/20 transition">
              <div className="flex-1 min-w-0">
                {/* Kandidaat */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Kandidaat</span>
                  <span className="font-bold text-gray-800">{a.kandidaat_naam}</span>
                </div>

                {/* Aanvrager info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                  {a.bedrijf_naam && (
                    <p className="text-gray-700 font-semibold">{a.bedrijf_naam}</p>
                  )}
                  <p className="text-gray-600">{a.aanvrager_email}</p>
                  {a.telefoonnummer && (
                    <a
                      href={`tel:${a.telefoonnummer}`}
                      className="text-purple-700 font-semibold hover:underline"
                    >
                      📞 {a.telefoonnummer}
                    </a>
                  )}
                </div>
              </div>

              <div className="ml-4 text-right shrink-0">
                <p className="text-xs text-gray-400 whitespace-nowrap">{formatDatum(a.created_at)}</p>
                <div className="flex gap-2 mt-2 justify-end">
                  {a.telefoonnummer && (
                    <a
                      href={`tel:${a.telefoonnummer}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition"
                      style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
                    >
                      Bel
                    </a>
                  )}
                  <a
                    href={`mailto:${a.aanvrager_email}?subject=CV ${a.kandidaat_naam}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                  >
                    Mail
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
