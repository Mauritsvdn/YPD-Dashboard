"use client";

import { useState, useRef, useEffect } from "react";
import { Kandidaat, CATEGORIEEN } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";

interface Props {
  onToevoegen: (kandidaten: Kandidaat[]) => void | Promise<void>;
}

type Status = "idle" | "laden" | "review" | "opslaan" | "klaar" | "fout";

function regelsNaarArray(waarde: string) {
  return waarde.split("\n");
}

function normaliseerRegels(regels: string[]) {
  return regels.map((regel) => regel.trim()).filter(Boolean);
}

function missendeVelden(k: Kandidaat) {
  const checks: [string, boolean][] = [
    ["naam", Boolean(k.neepnaam.trim())],
    ["regio", Boolean(k.regio.trim())],
    ["beschikbaarheid", Boolean(k.beschikbaarheid.trim())],
    ["salaris/tarief", Boolean(k.salaris.trim())],
    ["type", Boolean(k.type.trim())],
    ["categorie", Boolean(k.categorie.trim())],
    ["pitchtekst", Boolean(k.pitchTekst.trim())],
  ];
  return checks.filter(([, gevuld]) => !gevuld).map(([label]) => label);
}

export default function BulkImport({ onToevoegen }: Props) {
  const [bestand, setBestand] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [fout, setFout] = useState("");
  const [resultaat, setResultaat] = useState<{ aantal: number; categorieen: string[] } | null>(null);
  const [kandidaten, setKandidaten] = useState<Kandidaat[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Blokkeer browser-navigatie terwijl verwerking bezig is
  useEffect(() => {
    if (status !== "laden" && status !== "opslaan") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "De verwerking is nog bezig. Weet je zeker dat je de pagina wil verlaten?";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  async function verwerkDocument() {
    if (!bestand) return;
    setStatus("laden");
    setFout("");
    setResultaat(null);
    setKandidaten([]);

    const form = new FormData();
    form.append("document", bestand);

    try {
      const res = await fetch("/api/generate-pitches-bulk", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij verwerken");

      const gevondenKandidaten: Kandidaat[] = data.kandidaten.map(
        (k: Omit<Kandidaat, "id">) => ({ ...k, id: nanoid() })
      );

      setKandidaten(gevondenKandidaten);
      setStatus("review");
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er is een fout opgetreden.");
      setStatus("fout");
    }
  }

  async function voegGecontroleerdeKandidatenToe() {
    const opgeschoond = kandidaten.map((k) => ({
      ...k,
      functies: normaliseerRegels(k.functies),
      werkervaring: normaliseerRegels(k.werkervaring),
      opleidingen: normaliseerRegels(k.opleidingen),
    }));

    setStatus("opslaan");
    setFout("");
    try {
      await onToevoegen(opgeschoond);
      const categorieen = Array.from(new Set(opgeschoond.map((k) => k.categorie)));
      setResultaat({ aantal: opgeschoond.length, categorieen });
      setKandidaten(opgeschoond);
      setStatus("klaar");
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Kandidaten konden niet worden opgeslagen.");
      setStatus("review");
    }
  }

  function updateKandidaat(id: string, update: Partial<Kandidaat>) {
    setKandidaten((huidig) =>
      huidig.map((k) => (k.id === id ? { ...k, ...update } : k))
    );
  }

  function verwijderKandidaat(id: string) {
    setKandidaten((huidig) => huidig.filter((k) => k.id !== id));
  }

  function opnieuw() {
    setBestand(null);
    setStatus("idle");
    setFout("");
    setResultaat(null);
    setKandidaten([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Maandelijks kandidatendocument</h2>
      <p className="text-sm text-gray-500 mb-5">
        Upload het Word- of PDF-document met alle kandidaten van deze maand. Controleer de gevonden profielen voordat ze aan de mailing worden toegevoegd.
      </p>

      {status !== "klaar" && status !== "review" && status !== "opslaan" && (
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
              <p className="text-xs text-gray-400 mt-1">Blijf op deze pagina — dit duurt ongeveer 20 seconden</p>
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

      {(status === "review" || status === "opslaan") && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-800">Controleer geïmporteerde kandidaten</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {kandidaten.length} kandidaat{kandidaten.length !== 1 ? "en" : ""} gevonden. Pas velden aan voordat je ze toevoegt.
              </p>
            </div>
            <button
              onClick={opnieuw}
              disabled={status === "opslaan"}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Ander document
            </button>
          </div>

          {fout && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {fout}
            </div>
          )}

          {kandidaten.length === 0 ? (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              Er staan geen kandidaten meer in de controlelijst.
            </div>
          ) : (
            kandidaten.map((k, index) => {
              const waarschuwingen = missendeVelden(k);
              return (
                <div key={k.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Kandidaat {index + 1}</p>
                      <h4 className="font-bold text-gray-800 mt-0.5">{k.neepnaam || "Naam ontbreekt"}</h4>
                    </div>
                    <button
                      onClick={() => verwijderKandidaat(k.id)}
                      className="self-start text-xs text-red-400 hover:text-red-600 font-medium transition"
                    >
                      Verwijder uit import
                    </button>
                  </div>

                  {waarschuwingen.length > 0 && (
                    <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                      Controleer ontbrekend: {waarschuwingen.join(", ")}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-sm font-semibold text-gray-700">
                      Naam
                      <input
                        value={k.neepnaam}
                        onChange={(e) => updateKandidaat(k.id, { neepnaam: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Categorie
                      <select
                        value={k.categorie}
                        onChange={(e) => updateKandidaat(k.id, { categorie: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      >
                        {CATEGORIEEN.map((categorie) => (
                          <option key={categorie} value={categorie}>{categorie}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Regio
                      <input
                        value={k.regio}
                        onChange={(e) => updateKandidaat(k.id, { regio: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Beschikbaarheid
                      <input
                        value={k.beschikbaarheid}
                        onChange={(e) => updateKandidaat(k.id, { beschikbaarheid: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Salaris/tarief
                      <input
                        value={k.salaris}
                        onChange={(e) => updateKandidaat(k.id, { salaris: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Type
                      <select
                        value={k.type}
                        onChange={(e) => updateKandidaat(k.id, { type: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      >
                        <option value="NN">NN</option>
                        <option value="IN">IN</option>
                        <option value="MB">MB</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <label className="text-sm font-semibold text-gray-700">
                      Functies
                      <textarea
                        value={k.functies.join("\n")}
                        onChange={(e) => updateKandidaat(k.id, { functies: regelsNaarArray(e.target.value) })}
                        rows={4}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white resize-none"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Werkervaring
                      <textarea
                        value={k.werkervaring.join("\n")}
                        onChange={(e) => updateKandidaat(k.id, { werkervaring: regelsNaarArray(e.target.value) })}
                        rows={4}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white resize-none"
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      Opleidingen
                      <textarea
                        value={k.opleidingen.join("\n")}
                        onChange={(e) => updateKandidaat(k.id, { opleidingen: regelsNaarArray(e.target.value) })}
                        rows={4}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white resize-none"
                      />
                    </label>
                  </div>

                  <label className="block mt-3 text-sm font-semibold text-gray-700">
                    Pitchtekst
                    <textarea
                      value={k.pitchTekst}
                      onChange={(e) => updateKandidaat(k.id, { pitchTekst: e.target.value })}
                      rows={8}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white resize-none"
                    />
                  </label>
                </div>
              );
            })
          )}

          <button
            onClick={voegGecontroleerdeKandidatenToe}
            disabled={kandidaten.length === 0 || status === "opslaan"}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
          >
            {status === "opslaan" ? "Kandidaten toevoegen..." : "Voeg gecontroleerde kandidaten toe aan mailing"}
          </button>
        </div>
      )}

      {status !== "klaar" && status !== "review" && status !== "opslaan" && (
        <button
          onClick={verwerkDocument}
          disabled={!bestand || status === "laden"}
          className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
        >
          {status === "laden" ? "Verwerken…" : "Verwerk document"}
        </button>
      )}

      {status === "fout" && fout && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {fout}
        </div>
      )}
    </div>
  );
}
