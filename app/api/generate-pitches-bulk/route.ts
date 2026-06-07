import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIEEN } from "@/lib/types";

export const maxDuration = 300; // Vercel Pro: max 5 minuten

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function parsePdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Eén kandidaat zoals Claude die teruggeeft (vóór het toevoegen van pitchTekst).
type RuweKandidaat = {
  neepnaam: string;
  leeftijd?: string;
  regio: string;
  beschikbaarheid: string;
  salaris: string;
  type: string;
  functies: string[];
  werkervaring: string[];
  opleidingen: string[];
  bijzonderheden: string;
  categorie?: string;
};

// Maximale grootte (in tekens) per batch. Ruim gekozen zodat een normaal
// maanddocument in één keer wordt verwerkt — dan kan geen enkel profiel op een
// batch-grens worden doorgesneden (de oorzaak van ontbrekende gegevens). Alleen
// uitzonderlijk grote documenten worden alsnog opgesplitst. De JSON-respons past
// hieronder ruim binnen max_tokens (streaming, 32K).
const BATCH_CHAR_LIMIT = 24000;

// Knipt het document op in batches op alinea-grenzen, zodat een kandidaatprofiel
// niet middenin wordt doorgesneden. Kleine documenten leveren één batch op.
function splitInBatches(documentTekst: string): string[] {
  const blokken = documentTekst.split(/\n\s*\n/);
  const batches: string[] = [];
  let huidige = "";

  for (const blok of blokken) {
    // Start een nieuwe batch zodra de huidige vol is.
    if (huidige && huidige.length + blok.length > BATCH_CHAR_LIMIT) {
      batches.push(huidige);
      huidige = "";
    }
    huidige = huidige ? `${huidige}\n\n${blok}` : blok;
  }
  if (huidige.trim()) batches.push(huidige);

  return batches.length > 0 ? batches : [documentTekst];
}

const SYSTEM_PROMPT = `Je bent een recruiter bij YPD die maandelijkse kandidatendocumenten verwerkt.

Analyseer het aangeleverde document en extraheer ALLE kandidaten die erin staan beschreven. Werk het document zorgvuldig van boven tot onder door en sla niemand over.

Neem per kandidaat ALLE genoemde informatie volledig over. Vat niets samen en laat niets weg dat in het document staat: alle gewenste functies, álle werkervaring-punten, álle opleidingen en de volledige bijzonderheden-tekst. Als een veld in het document staat, moet het ook in de JSON terechtkomen.

Per kandidaat geef je exact dit JSON-object terug:
{
  "neepnaam": "de naam zoals in het document (als het een echte volledige naam is, vervang door een vergelijkbare fictieve Nederlandse voornaam)",
  "leeftijd": "leeftijd in hele jaren als getal indien vermeld (bijv '36'), anders lege string",
  "regio": "regio of stad zoals vermeld",
  "beschikbaarheid": "beschikbaarheid zoals vermeld (bijv '32 uur' of '24-32 uur per week')",
  "salaris": "maandsalaris als getal (bijv '4500'); of bij een jaarsalaris de K-notatie (bijv '85K'); of de volledige tariefstring bij uurtarief (bijv '62,- excl. BTW per uur'). Staat er geen concreet bedrag maar bijvoorbeeld 'in overleg', 'nader te bepalen' of 'n.t.b.' (ook bij 'tariefindicatie: in overleg'), neem die aanduiding dan letterlijk over (bijv 'in overleg'). Laat dit veld nooit leeg als er enige indicatie staat.",
  "type": "NN, IN of MB — exact zoals vermeld in het document",
  "functies": ["gewenste functie 1", "gewenste functie 2"],
  "werkervaring": ["werkervaring bullet 1", "werkervaring bullet 2"],
  "opleidingen": ["opleiding 1", "opleiding 2"],
  "bijzonderheden": "de bijzonderheden tekst zo volledig mogelijk",
  "categorie": "kies de meest passende uit: ${CATEGORIEEN.join(" | ")}"
}

Neem elke professional MAAR ÉÉN KEER op — geen dubbele kandidaten, ook niet als iemand meerdere keren in het document voorkomt.

Geef ALLEEN een JSON-array terug met alle gevonden kandidaten. Geen andere tekst, geen uitleg, geen markdown.`;

// Stuurt één batch naar Claude en parseert de JSON-array. Gooit een duidelijke
// foutmelding als het antwoord werd afgekapt of niet te parsen is.
async function extractKandidaten(batchTekst: string): Promise<RuweKandidaat[]> {
  // Streamen i.p.v. één request: bij een grote JSON-respons (veel kandidaten)
  // voorkomt dit HTTP-timeouts. Haiku 4.5 ondersteunt tot 64K outputtokens;
  // 32K geeft ruim budget zodat de array nooit middenin wordt afgekapt.
  const stream = client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 32000,
    messages: [{ role: "user", content: `Documentinhoud:\n\n${batchTekst}` }],
    system: SYSTEM_PROMPT,
  });
  const message = await stream.finalMessage();

  // Afgekapt antwoord → expliciet melden i.p.v. een cryptische JSON parse error.
  if (message.stop_reason === "max_tokens") {
    throw new Error(
      "Het antwoord van de AI werd afgekapt doordat dit deel van het document te veel kandidaten bevat. Probeer het document in kleinere delen aan te leveren."
    );
  }

  const content = message.content[0];
  if (!content || content.type !== "text") {
    throw new Error("Onverwacht antwoord van de AI bij het verwerken van het document");
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Geen kandidatenlijst gevonden — controleer of het document kandidaatprofielen bevat");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? (parsed as RuweKandidaat[]) : [];
  } catch {
    throw new Error(
      "De kandidatenlijst kon niet worden gelezen (ongeldige JSON van de AI). Het document was mogelijk te groot; probeer het in kleinere delen aan te leveren."
    );
  }
}

function buildPitchTekst(k: {
  neepnaam: string;
  leeftijd?: string;
  regio: string;
  beschikbaarheid: string;
  salaris: string;
  type: string;
  functies: string[];
  werkervaring: string[];
  opleidingen: string[];
  bijzonderheden: string;
}): string {
  const naamRegel = k.leeftijd ? `${k.neepnaam} - ${k.leeftijd} jaar oud` : k.neepnaam;
  return `${naamRegel} – ${k.regio} – beschikbaar ${k.beschikbaarheid} – Salaris/tarief: ${k.salaris} (${k.type})

Gewenste functie(s):
${k.functies.map((f) => `• ${f}`).join("\n")}

Relevante werkervaring:
${k.werkervaring.map((w) => `• ${w}`).join("\n")}

Relevante opleidingen:
${k.opleidingen.map((o) => `• ${o}`).join("\n")}

Bijzonderheden:
${k.bijzonderheden}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("document") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const naam = file.name.toLowerCase();

    let documentTekst = "";
    if (naam.endsWith(".pdf")) {
      documentTekst = await parsePdf(buffer);
    } else if (naam.endsWith(".docx") || naam.endsWith(".doc")) {
      documentTekst = await parseDocx(buffer);
    } else {
      return NextResponse.json({ error: "Alleen PDF of DOCX bestanden zijn toegestaan" }, { status: 400 });
    }

    if (!documentTekst.trim()) {
      return NextResponse.json({ error: "Het document lijkt leeg of kon niet worden gelezen" }, { status: 400 });
    }

    // Grote documenten met veel kandidaten leverden één te lange JSON-respons op
    // die werd afgekapt (JSON parse error). We knippen het document daarom op in
    // batches en verwerken die elk apart; de resultaten worden samengevoegd.
    const batches = splitInBatches(documentTekst);

    let kandidaten: RuweKandidaat[] = [];
    for (const batch of batches) {
      const batchKandidaten = await extractKandidaten(batch);
      kandidaten = kandidaten.concat(batchKandidaten);
    }

    // Vangnet: ontdubbel op genormaliseerde naam, zodat dezelfde professional
    // niet twee keer in de mailing belandt (bv. bij overlap tussen batches).
    const gezien = new Set<string>();
    kandidaten = kandidaten.filter((k) => {
      const sleutel = (k.neepnaam ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      if (!sleutel) return true; // geen naam → niet te ontdubbelen, behouden
      if (gezien.has(sleutel)) return false;
      gezien.add(sleutel);
      return true;
    });

    if (!Array.isArray(kandidaten) || kandidaten.length === 0) {
      return NextResponse.json({ error: "Geen kandidaten gevonden in het document" }, { status: 422 });
    }

    // Voeg pitchTekst toe
    const resultaat = kandidaten.map((k) => ({
      ...k,
      pitchTekst: buildPitchTekst(k),
    }));

    return NextResponse.json({ kandidaten: resultaat, aantal: resultaat.length });
  } catch (err) {
    console.error("generate-pitches-bulk fout:", err);
    const bericht = err instanceof Error ? err.message : "Fout bij verwerken document";
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
