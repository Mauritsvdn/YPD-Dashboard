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

    const systemPrompt = `Je bent een recruiter bij YPD die maandelijkse kandidatendocumenten verwerkt.

Analyseer het aangeleverde document en extraheer ALLE kandidaten die erin staan beschreven.

Per kandidaat geef je exact dit JSON-object terug:
{
  "neepnaam": "de naam zoals in het document (als het een echte volledige naam is, vervang door een vergelijkbare fictieve Nederlandse voornaam)",
  "leeftijd": "leeftijd in hele jaren als getal indien vermeld (bijv '36'), anders lege string",
  "regio": "regio of stad zoals vermeld",
  "beschikbaarheid": "beschikbaarheid zoals vermeld (bijv '32 uur' of '24-32 uur per week')",
  "salaris": "maandsalaris als getal (bijv '4500'); of bij een jaarsalaris de K-notatie (bijv '85K'); of de volledige tariefstring bij uurtarief (bijv '62,- excl. BTW per uur')",
  "type": "NN, IN of MB — exact zoals vermeld in het document",
  "functies": ["gewenste functie 1", "gewenste functie 2"],
  "werkervaring": ["werkervaring bullet 1", "werkervaring bullet 2"],
  "opleidingen": ["opleiding 1", "opleiding 2"],
  "bijzonderheden": "de bijzonderheden tekst zo volledig mogelijk",
  "categorie": "kies de meest passende uit: ${CATEGORIEEN.join(" | ")}"
}

Geef ALLEEN een JSON-array terug met alle gevonden kandidaten. Geen andere tekst, geen uitleg, geen markdown.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8096,
      messages: [
        {
          role: "user",
          content: `Documentinhoud:\n\n${documentTekst}`,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Onverwacht antwoord van Claude");
    }

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Geen kandidatenlijst gevonden — controleer of het document kandidaatprofielen bevat");
    }

    const kandidaten = JSON.parse(jsonMatch[0]);

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
