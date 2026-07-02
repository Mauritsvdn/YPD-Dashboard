"use client";

import { useState, useRef, useEffect } from "react";
import { Kandidaat, CATEGORIEEN } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";

interface Props {
  onToevoegen: (kandidaten: Kandidaat[]) => void | Promise<void>;
  // Kandidaten die al in de mailing staan — gebruikt om dubbele bij heruploaden
  // te markeren (niet meer automatisch over te slaan).
  bestaande: Kandidaat[];
}

// Sleutel om te bepalen of een kandidaat al bestaat: genormaliseerde neepnaam.
function kandidaatSleutel(k: { neepnaam: string }) {
  return k.neepnaam.trim().toLowerCase().replace(/\s+/g, " ");
}

// Kandidaat in de review-stap, met markering of hij al in een vorige mailing
// stond en of de recruiter hem in deze mailing wil behouden.
type ReviewKandidaat = Kandidaat & { duplicaat: boolean; behouden: boolean };

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
    ["leeftijd", Boolean((k.leeftijd ?? "").trim())],
    ["regio", Boolean(k.regio.trim())],
    ["beschikbaarheid", Boolean(k.beschikbaarheid.trim())],
    ["salaris/tarief", Boolean(k.salaris.trim())],
    ["type", Boolean(k.type.trim())],
    ["categorie", Boolean(k.categorie.trim())],
    ["pitchtekst", Boolean(k.pitchTekst.trim())],
  ];
  return checks.filter(([, gevuld]) => !gevuld).map(([label]) => label);
}

export default function BulkImport({ onToevoegen, bestaande }: Props) {
  const [bestand, setBestand] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [fout, setFout] = useState("");
  const [resultaat, setResultaat] = useState<{ aantal: number; categorieen: string[] } | null>(null);
  const [kandidaten, setKandidaten] = useState<ReviewKandidaat[]>([]);
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

      // Markeer kandidaten die al in een vorige mailing stonden, maar filter ze
      // niet meer weg. De recruiter ziet ze in de review-stap en kiest zelf per
      // kandidaat of die (opnieuw) wordt toegevoegd. Bekende duplicaten staan
      // standaard op "niet toevoegen".
      const bestaandeSleutels = new Set(bestaande.map(kandidaatSleutel));
      const reviewKandidaten: ReviewKandidaat[] = gevondenKandidaten.map((k) => {
        const duplicaat = bestaandeSleutels.has(kandidaatSleutel(k));
        return { ...k, duplicaat, behouden: !duplicaat };
      });

      setKandidaten(reviewKandidaten);
      setStatus("review");
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er is een fout opgetreden.");
      setStatus("fout");
    }
  }

  async function voegGecontroleerdeKandidatenToe() {
    // Alleen kandidaten die de recruiter wil behouden gaan mee; de review-markering
    // (duplicaat/behouden) wordt weer verwijderd zodat een schone Kandidaat overblijft.
    const opgeschoond: Kandidaat[] = kandidaten
      .filter((k) => k.behouden)
      .map(({ duplicaat: _duplicaat, behouden: _behouden, ...k }) => ({
        ...k,
        leeftijd: (k.leeftijd ?? "").trim(),
        functies: normaliseerRegels(k.functies),
        werkervaring: normaliseerRegels(k.werkervaring),
        opleidingen: normaliseerRegels(k.opleidingen),
      }));

    if (opgeschoond.length === 0) return;

    setStatus("opslaan");
    setFout("");
    try {
      await onToevoegen(opgeschoond);
      const categorieen = Array.from(new Set(opgeschoond.map((k) => k.categorie)));
      setResultaat({ aantal: opgeschoond.length, categorieen });
      setStatus("klaar");
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Kandidaten konden niet worden opgeslagen.");
      setStatus("review");
    }
  }

  function updateKandidaat(id: string, update: Partial<ReviewKandidaat>) {
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

  const aantalGevonden = kandidaten.length;
  const aantalDuplicaten = kandidaten.filter((k) => k.duplicaat).length;
  const aantalTeVoegen = kandidaten.filter((k) => k.behouden).length;

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
                {aantalGevonden} {aantalGevonden !== 1 ? "kandidaten" : "kandidaat"} gevonden.
                {aantalDuplicaten > 0 && (
                  <> {aantalDuplicaten} stond{aantalDuplicaten !== 1 ? "en" : ""} al in een vorige mailing — zet hieronder zelf de toggle om als je {aantalDuplicaten !== 1 ? "die" : "die"} opnieuw wilt meesturen.</>
                )} {aantalTeVoegen} word{aantalTeVoegen !== 1 ? "en" : "t"} toegevoegd.
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
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              Er staan geen kandidaten meer in de controlelijst.
            </div>
          ) : (
            kandidaten.map((k, index) => {
              const waarschuwingen = missendeVelden(k);
              const overgeslagenDuplicaat = k.duplicaat && !k.behouden;
              return (
                <div
                  key={k.id}
                  className={`border rounded-xl p-4 transition ${
                    overgeslagenDuplicaat
                      ? "border-gray-200 bg-gray-100/70 opacity-70"
                      : "border-gray-100 bg-gray-50/60"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Kandidaat {index + 1}</p>
                      <h4 className="font-bold text-gray-800 mt-0.5">{k.neepnaam || "Naam ontbreekt"}</h4>
                      {k.duplicaat && (
                        <span className="inline-block mt-1.5 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                          Stond ook in vorige mailing
                        </span>
                      )}
                    </div>
                    {k.duplicaat ? (
                      <label className="self-start inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={k.behouden}
                          onChange={(e) => updateKandidaat(k.id, { behouden: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-400"
                        />
                        <span className={`text-xs font-semibold ${k.behouden ? "text-purple-700" : "text-gray-500"}`}>
                          {k.behouden ? "Behouden in deze mailing" : "Niet toevoegen"}
                        </span>
                      </label>
                    ) : (
                      <button
                        onClick={() => verwijderKandidaat(k.id)}
                        className="self-start text-xs text-red-400 hover:text-red-600 font-medium transition"
                      >
                        Verwijder uit import
                      </button>
                    )}
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
                      Leeftijd
                      <input
                        value={k.leeftijd ?? ""}
                        onChange={(e) => updateKandidaat(k.id, { leeftijd: e.target.value })}
                        placeholder="Bijv. 44"
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
                      <input
                        list={`type-opties-${k.id}`}
                        value={k.type}
                        onChange={(e) => updateKandidaat(k.id, { type: e.target.value })}
                        placeholder="NN, IN, MB of eigen type"
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      />
                      <datalist id={`type-opties-${k.id}`}>
                        <option value="NN">NN</option>
                        <option value="IN">IN</option>
                        <option value="MB">MB</option>
                      </datalist>
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
            disabled={aantalTeVoegen === 0 || status === "opslaan"}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
          >
            {status === "opslaan"
              ? "Kandidaten toevoegen..."
              : `Voeg ${aantalTeVoegen} ${aantalTeVoegen !== 1 ? "kandidaten" : "kandidaat"} toe aan mailing`}
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
