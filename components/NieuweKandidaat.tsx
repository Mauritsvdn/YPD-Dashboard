"use client";

import { useState, useRef } from "react";
import { Kandidaat, CATEGORIEEN } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";

interface Props {
  onToevoegen: (kandidaat: Kandidaat) => void;
}

export default function NieuweKandidaat({ onToevoegen }: Props) {
  const [notities, setNotities] = useState("");
  const [categorie, setCategorie] = useState<string>(CATEGORIEEN[0]);
  const [bestand, setBestand] = useState<File | null>(null);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState("");
  const [pitch, setPitch] = useState<Kandidaat | null>(null);
  const [pitchTekst, setPitchTekst] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function genereerPitch() {
    setLaden(true);
    setFout("");
    setPitch(null);

    const form = new FormData();
    if (bestand) form.append("cv", bestand);
    form.append("notities", notities);
    form.append("categorie", categorie);

    try {
      const res = await fetch("/api/generate-pitch", { method: "POST", body: form });
      if (!res.ok) throw new Error("Fout bij genereren");
      const data = await res.json();
      setPitch(data);
      setPitchTekst(data.pitchTekst);
    } catch {
      setFout("Er is een fout opgetreden bij het genereren van de pitch.");
    } finally {
      setLaden(false);
    }
  }

  function voegToe() {
    if (!pitch) return;
    const kandidaat: Kandidaat = {
      ...pitch,
      id: nanoid(),
      pitchTekst,
    };
    onToevoegen(kandidaat);
    setNotities("");
    setBestand(null);
    setPitch(null);
    setPitchTekst("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-5">Nieuwe kandidaat toevoegen</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">CV uploaden (PDF of DOCX)</label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setBestand(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:text-white file:cursor-pointer file:bg-purple-600 cursor-pointer border border-gray-200 rounded-xl p-2 hover:border-purple-300 transition"
          />
          {bestand && <p className="text-xs text-gray-500 mt-1">{bestand.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Categorie</label>
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
          >
            {CATEGORIEEN.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Gespreksnotities</label>
        <textarea
          value={notities}
          onChange={(e) => setNotities(e.target.value)}
          rows={5}
          placeholder="Bijv: Wil als controller werken, beschikbaar 40 uur, regio Utrecht, salariswens €5.000,-. Heeft 8 jaar ervaring bij een productiebedrijf. Studeert naast zijn werk..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm resize-none"
        />
      </div>

      <button
        onClick={genereerPitch}
        disabled={laden || (!bestand && !notities.trim())}
        className="mt-4 px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
      >
        {laden ? "Pitch genereren..." : "Genereer pitch"}
      </button>

      {fout && <p className="mt-3 text-red-500 text-sm">{fout}</p>}

      {pitch && (
        <div className="mt-6 border border-purple-100 rounded-xl p-5 bg-purple-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Gegenereerde pitch – bewerk indien nodig</h3>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">{categorie}</span>
          </div>
          <textarea
            value={pitchTekst}
            onChange={(e) => setPitchTekst(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm font-mono bg-white resize-none"
          />
          <button
            onClick={voegToe}
            className="mt-3 px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition"
            style={{ background: "linear-gradient(90deg, #E8547A, #9B59B6)" }}
          >
            Voeg toe aan mailing
          </button>
        </div>
      )}
    </div>
  );
}
