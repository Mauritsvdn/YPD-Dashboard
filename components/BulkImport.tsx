"use client";

import { useState, useRef } from "react";
import { Kandidaat } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";

interface Props {
  onToevoegen: (kandidaten: Kandidaat[]) => void;
}

export default function BulkImport({ onToevoegen }: Props) {
  const [bestand, setBestand] = useState<File | null>(null);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState("");
  const [kandidaten, setKandidaten] = useState<Kandidaat[]>([]);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [opslaanLaden, setOpslaanLaden] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function verwerkDocument() {
    if (!bestand) return;
    setLaden(true);
    setFout("");
    setKandidaten([]);

    const form = new FormData();
    form.append("document", bestand);

    try {
      const res = await fetch("/api/generate-pitches-bulk", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij verwerken");
      const metIds: Kandidaat[] = data.kandidaten.map(
        (k: Omit<Kandidaat, "id">) => ({ ...k, id: nanoid() })
      );
      setKandidaten(metIds);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er is een fout opgetreden.");
    } finally {
      setLaden(false);
    }
  }

  function verwijderKandidaat(id: string) {
    setKandidaten((prev) => prev.filter((k) => k.id !== id));
  }

  async function voegAlleToe() {
    setOpslaanLaden(true);
    try {
      await onToevoegen(kandidaten);
      setOpgeslagen(true);
      setKandidaten([]);
      setBestand(null);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setOpslaanLaden(false);
    }
  }

  function opnieuw() {
    setOpgeslagen(false);
    setBestand(null);
    setKandidaten([]);
    setFout("");
  }

  if (opgeslagen) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-3">✓</div>
        <p className="text-lg font-bold text-gray-800 mb-1">Kandidaten toegevoegd!</p>
        <p className="text-sm text-gray-500">De mailing staat klaar om te versturen.</p>
        <button
          onClick={opnieuw}
          className="mt-5 text-sm text-purple-600 hover:underline"
        >
          Nieuw document uploaden
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Maandelijks kandidatendocument</h2>
      <p className="text-sm text-gray-500 mb-5">
        Upload het Word- of PDF-document met alle kandidaten van deze maand. Het systeem haalt automatisch alle profielen eruit.
      </p>

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition"
      >
        <div className="text-4xl mb-2">{bestand ? "📄" : "☁️"}</div>
        {bestand ? (
          <>
            <p className="font-semibold text-gray-700 text-sm">{bestand.name}</p>
            <p className="text-xs text-gray-400 mt-1">{(bestand.size / 1024).toFixed(0)} KB — klik om te wijzigen</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-600">Klik om een bestand te kiezen</p>
            <p className="text-xs text-gray-400 mt-1">PDF of Word (.docx) — alle kandidaten in één document</p>
          </>
        )}
        <input
          ref={fileRef}
          id="bulk-upload"
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            setBestand(e.target.files?.[0] || null);
            setKandidaten([]);
            setFout("");
          }}
        />
      </div>

      {bestand && kandidaten.length === 0 && !laden && (
        <button
          onClick={verwerkDocument}
          className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-sm transition"
          style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
        >
          Verwerk document →
        </button>
      )}

      {/* Loading */}
      {laden && (
        <div className="mt-5 flex flex-col items-center gap-3 py-4">
          <div className="animate-spin w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full" />
          <p className="text-sm text-gray-500">Kandidaten worden geëxtraheerd… (dit duurt even)</p>
        </div>
      )}

      {/* Fout */}
      {fout && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {fout}
        </div>
      )}

      {/* Preview */}
      {kandidaten.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-800">
              {kandidaten.length} kandidaten gevonden
            </p>
            <span className="text-xs text-gray-400">Verwijder profielen die je niet wil toevoegen</span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 mb-4">
            {kandidaten.map((k, i) => (
              <div
                key={k.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50/20 transition"
              >
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{k.neepnaam}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                      {k.categorie}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {k.regio} · {k.beschikbaarheid} · €{k.salaris} ({k.type})
                  </p>
                  {k.functies.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {k.functies.slice(0, 2).join(" · ")}
                      {k.functies.length > 2 && ` +${k.functies.length - 2}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => verwijderKandidaat(k.id)}
                  className="text-gray-300 hover:text-red-400 transition text-lg leading-none shrink-0 px-1"
                  title="Verwijder uit selectie"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={voegAlleToe}
            disabled={opslaanLaden || kandidaten.length === 0}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-50"
            style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
          >
            {opslaanLaden
              ? "Opslaan..."
              : `Voeg alle ${kandidaten.length} kandidaten toe aan mailing →`}
          </button>

          <button
            onClick={() => { setKandidaten([]); setBestand(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="mt-2 w-full py-2 text-gray-400 hover:text-gray-600 text-sm transition"
          >
            Annuleren
          </button>
        </div>
      )}
    </div>
  );
}
