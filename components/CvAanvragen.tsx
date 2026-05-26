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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Aanvrager</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">E-mail</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Kandidaat</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Datum</th>
              </tr>
            </thead>
            <tbody>
              {aanvragen.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="py-3 px-3 text-gray-700">{a.aanvrager_email.split("@")[0]}</td>
                  <td className="py-3 px-3 text-gray-600">{a.aanvrager_email}</td>
                  <td className="py-3 px-3">
                    <span className="font-medium text-purple-700">{a.kandidaat_naam}</span>
                  </td>
                  <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{formatDatum(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
