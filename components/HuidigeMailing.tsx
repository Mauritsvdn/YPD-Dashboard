"use client";

import { useState, useRef, useEffect } from "react";
import { Kandidaat, CATEGORIEEN } from "@/lib/types";
import { generateMailchimpHtml, formatSalaris } from "@/lib/email-template";

interface Props {
  kandidaten: Kandidaat[];
  laden: boolean;
  onVerwijder: (id: string) => void;
  onBijwerken: (kandidaat: Kandidaat) => void;
  onVerstuurd: () => void;
}

const MAAND_NAMEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

const legeKandidaat: Kandidaat = {
  id: "",
  neepnaam: "",
  leeftijd: "",
  regio: "",
  beschikbaarheid: "",
  salaris: "",
  type: "NN",
  functies: [],
  werkervaring: [],
  opleidingen: [],
  bijzonderheden: "",
  categorie: CATEGORIEEN[0],
  pitchTekst: "",
};

function regelsNaarArray(waarde: string) {
  return waarde.split("\n");
}

export default function HuidigeMailing({ kandidaten, laden, onVerwijder, onBijwerken, onVerstuurd }: Props) {
  const [preview, setPreview] = useState(false);

  // Maand/jaar voor onderwerpregel + mailheader. Standaard de huidige maand,
  // maar de recruiter stelt deze altijd zelf in voordat verstuurd wordt.
  const [maand, setMaand] = useState(() => new Date().getMonth());
  const [jaar, setJaar] = useState(() => new Date().getFullYear());
  // Maandnaam altijd met hoofdletter, bv. "Mei 2026".
  const maandJaar = `${MAAND_NAMEN[maand].charAt(0).toUpperCase()}${MAAND_NAMEN[maand].slice(1)} ${jaar}`;

  const [versturen, setVersturen] = useState(false);
  const [bericht, setBericht] = useState("");
  const [fout, setFout] = useState("");
  const [bewerken, setBewerken] = useState<Kandidaat | null>(null);
  const [opslaan, setOpslaan] = useState(false);

  // Testmail
  const [testModus, setTestModus] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testVersturen, setTestVersturen] = useState(false);
  const [testBericht, setTestBericht] = useState("");

  // Mailchimp-audience (naam + aantal subscribers) — getoond vóór verzenden als check
  const [audience, setAudience] = useState<{ naam: string; aantal: number } | null>(null);

  useEffect(() => {
    let actief = true;
    fetch("/api/mailchimp-audience")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (actief && data && !data.error) setAudience(data);
      })
      .catch(() => {});
    return () => {
      actief = false;
    };
  }, []);

  const previewRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  // Scroll naar preview zodra die opent
  useEffect(() => {
    if (preview && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [preview]);

  // Schaal de iframe naar containerbreedte zodat de email-design (640px breed)
  // proportioneel verkleind past op smalle schermen.
  useEffect(() => {
    if (!preview) return;
    const el = previewBoxRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setPreviewScale(Math.min(1, w / 640));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [preview]);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || "";

  let previewHtml = "";
  if (kandidaten.length > 0) {
    try {
      previewHtml = generateMailchimpHtml(kandidaten, baseUrl, maandJaar);
    } catch {
      previewHtml = "<p style='padding:2rem;color:red'>Fout bij genereren preview.</p>";
    }
  }

  // Meet de werkelijke hoogte van de email-inhoud zodat de box-hoogte exact
  // de geschaalde mail volgt en de hele mail in één keer zichtbaar is.
  const meetContentHoogte = () => {
    const doc = iframeRef.current?.contentDocument;
    if (doc?.body) {
      setContentHeight(doc.body.scrollHeight);
    }
  };

  useEffect(() => {
    if (!preview) return;
    // Hermeten zodra de preview-HTML wijzigt (bv. kandidaat aangepast).
    const id = requestAnimationFrame(meetContentHoogte);
    return () => cancelAnimationFrame(id);
  }, [preview, previewHtml]);

  async function verstuurMailing() {
    const doelgroep = audience
      ? `de audience "${audience.naam}" (${audience.aantal} subscribers)`
      : "de hele lijst";
    if (!confirm(`Weet je zeker dat je de mailing naar ${doelgroep} wilt versturen?`)) return;
    setVersturen(true);
    setFout("");
    setBericht("");
    try {
      const res = await fetch("/api/send-mailchimp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kandidaten, maandJaar }),
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
        body: JSON.stringify({ kandidaten, testEmail, maandJaar }),
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

  async function slaWijzigingenOp(e: React.FormEvent) {
    e.preventDefault();
    if (!bewerken) return;
    setOpslaan(true);
    setFout("");
    setBericht("");

    try {
      const kandidaat = {
        ...bewerken,
        functies: bewerken.functies.map((f) => f.trim()).filter(Boolean),
        werkervaring: bewerken.werkervaring.map((w) => w.trim()).filter(Boolean),
        opleidingen: bewerken.opleidingen.map((o) => o.trim()).filter(Boolean),
      };
      const res = await fetch(`/api/kandidaten/${kandidaat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kandidaat),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij opslaan");
      onBijwerken(kandidaat);
      setBewerken(null);
      setBericht("✓ Kandidaat bijgewerkt.");
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Fout bij opslaan");
    } finally {
      setOpslaan(false);
    }
  }

  function updateBewerken(update: Partial<Kandidaat>) {
    setBewerken((huidig) => ({ ...(huidig ?? legeKandidaat), ...update }));
  }

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

      {/* Maand/jaar voor onderwerpregel + mailheader — altijd zelf in te stellen */}
      {!laden && kandidaten.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 px-4 py-3 bg-purple-50/50 border border-purple-100 rounded-xl">
          <span className="text-sm font-semibold text-gray-700">Mailing voor:</span>
          <select
            value={maand}
            onChange={(e) => setMaand(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            {MAAND_NAMEN.map((naam, i) => (
              <option key={i} value={i}>{naam.charAt(0).toUpperCase() + naam.slice(1)}</option>
            ))}
          </select>
          <input
            type="number"
            value={jaar}
            onChange={(e) => setJaar(Number(e.target.value))}
            min={2020}
            max={2100}
            className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <span className="text-xs text-gray-500 ml-auto">
            Onderwerp: <span className="font-medium text-gray-700">Selectie onlangs gesproken professionals {maandJaar}</span>
          </span>
        </div>
      )}

      {/* Audience-check: naar wie gaat de mailing */}
      {!laden && kandidaten.length > 0 && audience && (
        <div className="mb-5 flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
          <span aria-hidden>📋</span>
          <span className="text-gray-600">Verstuurt naar audience</span>
          <span className="font-semibold text-gray-800">{audience.naam}</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">
              {kandidaten.length} profiel{kandidaten.length !== 1 ? "en" : ""}
            </span>
            <span aria-hidden className="text-gray-400">→</span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
              {audience.aantal} subscribers
            </span>
          </span>
        </div>
      )}

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
                  <span className="font-semibold text-gray-800">{k.neepnaam}{k.leeftijd ? ` · ${k.leeftijd} jaar` : ""}</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{k.categorie}</span>
                </div>
                <p className="text-xs text-gray-500">{k.regio} &bull; {k.beschikbaarheid} &bull; {formatSalaris(k.salaris)} ({k.type})</p>
                {k.functies.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{k.functies.join(", ")}</p>
                )}
              </div>
              <div className="ml-4 flex shrink-0 gap-3">
                <button
                  onClick={() => setBewerken(k)}
                  className="text-purple-600 hover:text-purple-800 text-xs font-medium transition"
                >
                  Bewerk
                </button>
                <button
                  onClick={() => onVerwijder(k.id)}
                  className="text-red-400 hover:text-red-600 text-xs font-medium transition"
                >
                  Verwijder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {bewerken && (
        <div className="fixed inset-0 z-30 bg-black/30 px-3 py-6 overflow-y-auto">
          <form
            onSubmit={slaWijzigingenOp}
            className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Kandidaat bewerken</h3>
                <p className="text-sm text-gray-500 mt-0.5">Wijzigingen worden direct gebruikt in de mailingpreview.</p>
              </div>
              <button
                type="button"
                onClick={() => setBewerken(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                Sluiten
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm font-semibold text-gray-700">
                Naam
                <input
                  value={bewerken.neepnaam}
                  onChange={(e) => updateBewerken({ neepnaam: e.target.value })}
                  required
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Leeftijd
                <input
                  value={bewerken.leeftijd ?? ""}
                  onChange={(e) => updateBewerken({ leeftijd: e.target.value })}
                  placeholder="bijv. 36"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Categorie
                <select
                  value={bewerken.categorie}
                  onChange={(e) => updateBewerken({ categorie: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {CATEGORIEEN.map((categorie) => (
                    <option key={categorie} value={categorie}>{categorie}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Regio
                <input
                  value={bewerken.regio}
                  onChange={(e) => updateBewerken({ regio: e.target.value })}
                  required
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Beschikbaarheid
                <input
                  value={bewerken.beschikbaarheid}
                  onChange={(e) => updateBewerken({ beschikbaarheid: e.target.value })}
                  required
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Salaris/tarief
                <input
                  value={bewerken.salaris}
                  onChange={(e) => updateBewerken({ salaris: e.target.value })}
                  required
                  placeholder="4500 = €/maand · 85K = jaarsalaris"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Type
                <select
                  value={bewerken.type}
                  onChange={(e) => updateBewerken({ type: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="NN">NN</option>
                  <option value="IN">IN</option>
                  <option value="MB">MB</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <label className="text-sm font-semibold text-gray-700">
                Functies
                <textarea
                  value={bewerken.functies.join("\n")}
                  onChange={(e) => updateBewerken({ functies: regelsNaarArray(e.target.value) })}
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Werkervaring
                <textarea
                  value={bewerken.werkervaring.join("\n")}
                  onChange={(e) => updateBewerken({ werkervaring: regelsNaarArray(e.target.value) })}
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Opleidingen
                <textarea
                  value={bewerken.opleidingen.join("\n")}
                  onChange={(e) => updateBewerken({ opleidingen: regelsNaarArray(e.target.value) })}
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </label>
            </div>

            <label className="block mt-4 text-sm font-semibold text-gray-700">
              Bijzonderheden
              <textarea
                value={bewerken.bijzonderheden}
                onChange={(e) => updateBewerken({ bijzonderheden: e.target.value })}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </label>

            <label className="block mt-4 text-sm font-semibold text-gray-700">
              Pitchtekst
              <textarea
                value={bewerken.pitchTekst}
                onChange={(e) => updateBewerken({ pitchTekst: e.target.value })}
                rows={9}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </label>

            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setBewerken(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                Annuleer
              </button>
              <button
                type="submit"
                disabled={opslaan}
                className="px-5 py-2 rounded-lg text-white text-sm font-semibold transition disabled:opacity-50"
                style={{ background: "linear-gradient(90deg, #7B3FA0, #E8547A)" }}
              >
                {opslaan ? "Opslaan..." : "Wijzigingen opslaan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {preview && kandidaten.length > 0 && (
        <div className="mt-6" ref={previewRef}>
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">E-mail preview</h3>
          <div
            ref={previewBoxRef}
            className="border border-gray-200 rounded-xl overflow-y-auto bg-gray-50 relative mx-auto"
            style={{
              width: "100%",
              maxWidth: 640,
              // Box-hoogte volgt de geschaalde mailhoogte zodat de hele mail in
              // beeld past; pas vanaf zeer lange mails verschijnt er scroll.
              height: contentHeight
                ? `min(${Math.ceil(contentHeight * previewScale)}px, 80vh)`
                : "clamp(400px, 70vh, 600px)",
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={previewHtml}
              title="Mailing preview"
              onLoad={meetContentHoogte}
              scrolling="no"
              style={{
                width: "640px",
                height: contentHeight ? `${contentHeight}px` : `${100 / previewScale}%`,
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: `calc(50% - ${320 * previewScale}px)`,
                border: "none",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
