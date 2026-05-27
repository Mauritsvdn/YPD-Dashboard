"use client";

import { useState, useRef } from "react";
import { Kandidaat } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";

interface Props {
  onToevoegen: (kandidaten: Kandidaat[]) => void;
}

type Status = "idle" | "laden" | "klaar" | "fout";

export default function BulkImport({ onToevoegen }: Props) {
  const [bestand, setBestand] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [fout, setFout] = useState("");
  const [resultaat, setResultaat] = useState<{ aantal: number; categorieen: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function verwerkEnVoegToe() {
    if (!bestand) return;
    setStatus("laden");
    setFout("");
    setResultaat(null);

    const form = new FormData();
    form.append("document", bestand);

    try {
      const res = await fetch("/api/generate-pitches-bulk", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij verwerken");

      const kandidaten: Kandidaat[] = data.kandidaten.map(
        (k: Omit<Kandidaat, "id">) => ({ ...k, id: nanoid() })
      );

      // Sla alle kandidaten parallel op
      await onToevoegen(kandidaten);

      const categorieen = Array.from(new Set(kandidaten.map((k) => k.categorie)));
      setResultaat({ aantal: kandidaten.length, categorieen });
      setStatus("klaar");
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er is een fout opgetreden.");
      setStatus("fout");
    }
  }

  function opnieuw() {
    setBestand(null);
    setStatus("idle");
    setFout("");
    setResultaat(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Maandelijks kandidatendocument</h2>
      <p className="text-sm text-gray-500 mb-5">
        Upload het Word- of PDF-document met alle kandidaten van deze maand. Alle profielen worden automatisch uitgehaald en toegevoegd aan de mailing.
      </p>

      {/* Upload zone */}
      {status !== "klaar" && (
        <div
          onClick={() => status === "idle" && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
            status === "idle"
              ? "border-purple-200 cursor-pointer hover:border-purple-400 hover:bg-purple-50/30"
              : "border-gray-200 bg-gray-50 cursor-default"
          }`}
        >
          <div className="text-4xl mb-2">
            {status === "laden" ? (
              <span className="inline-block animate-spin">⚙️</span>
            ) : bestand ? "📄" : "☁️"}
          </div>

          {status === "laden" ? (
            <>
              <p className="font-semibold text-gray-600 text-sm">Kandidaten worden geëxtraheerd…</p>
              <p className="text-xs text-gray-400 mt-1">Dit kan 15–30 seconden duren</p>
            </>
          ) : bestand ? (
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
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              setBestand(e.target.files?.[0] || null);
              setStatus("idle");
              setFout("");
            }}
          />
        </div>
      )}

      {/* Klaar-melding */}
      {status === "klaar" && resultaat && (
        <div className="border-2 border-green-200 bg-green-50 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">✓</div>
          <p className="font-bold text-gray-800 text-lg mb-1">
            {resultaat.aantal} kandidaten toegevoegd aan de mailing!
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {resultaat.categorieen.map((cat) => (
              <span key={cat} className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1 rounded-full font-medium">
                {cat}
              </span>
            ))}
          </div>
          <button
            onClick={opnieuw}
            className="mt-5 text-sm text-gray-400 hover:text-gray-600 transition"
          >
            Nieuw document uploaden
          </button>
        </div>
      )}

      {/* Actie-knop */}
      {status !== "klaar" && (
        <button
          onClick={verwerkEnVoegToe}
          disabled={!bestand || status === "laden"}
          className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
        >
          {status === "laden"
            ? "Verwerken…"
            : "Verwerk document en voeg alle kandidaten toe →"}
        </button>
      )}

      {/* Fout */}
      {status === "fout" && fout && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {fout}
        </div>
      )}
    </div>
  );
}
