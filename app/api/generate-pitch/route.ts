import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("cv") as File | null;
    const notities = formData.get("notities") as string;
    const categorie = formData.get("categorie") as string;

    let cvTekst = "";
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const naam = file.name.toLowerCase();
      if (naam.endsWith(".pdf")) {
        cvTekst = await parsePdf(buffer);
      } else if (naam.endsWith(".docx") || naam.endsWith(".doc")) {
        cvTekst = await parseDocx(buffer);
      }
    }

    const systemPrompt = `Je bent een recruiter bij YPD die anonieme kandidaatpitches schrijft voor een maandelijkse nieuwsbrief.

Genereer een anonieme kandidaatpitch in EXACT dit format:

Neem de naam over zoals die in het brondocument of de notities is opgegeven — de recruiter vult zelf de (fictieve) naam in. Verzin zelf GEEN nieuwe naam en vervang de opgegeven naam niet. Noem geen echte bedrijfsnamen (alleen sector/branche). Geen enkele overige persoonlijk herleidbare informatie.

Geef ALLEEN een JSON-object terug zonder extra tekst, in dit exacte schema:
{
  "neepnaam": "de naam exact zoals opgegeven in het brondocument of de notities — 1-op-1 overnemen, niet zelf verzinnen of vervangen",
  "leeftijd": "VERPLICHT overnemen als leeftijd in hele jaren als getal, bijv '36'. Zoek actief naar leeftijd, 'jaar', geboortedatum, geboortejaar of datum van geboorte. Als alleen een geboortedatum staat, bereken de leeftijd in hele jaren op basis van vandaag. Alleen lege string als er echt geen leeftijd of geboortedatum in het CV of de notities staat.",
  "regio": "regio in Nederland",
  "beschikbaarheid": "aantal uren per week",
  "salaris": "maandsalaris als getal zonder punt (bijv '4500'); of bij UITSLUITEND een jaarsalaris de K-notatie (bijv '85K')",
  "type": "NN of IN (in loondienst of als interim)",
  "functies": ["gewenste functie 1", "gewenste functie 2"],
  "werkervaring": ["bullet 1 werkervaring", "bullet 2 werkervaring"],
  "opleidingen": ["opleiding 1", "opleiding 2"],
  "bijzonderheden": "Vloeiende professionele alinea van 2-4 zinnen over wat deze kandidaat bijzonder maakt.",
  "categorie": "${categorie}"
}`;

    const vandaag = new Date().toLocaleDateString("nl-NL");
    const userPrompt = `Vandaag is ${vandaag}.\n\nCV-inhoud:\n${cvTekst || "(geen CV geüpload)"}\n\nGespreksnotities van recruiter:\n${notities || "(geen notities)"}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Onverwacht antwoord van Claude");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Geen JSON gevonden in Claude-antwoord");

    const pitch = JSON.parse(jsonMatch[0]);

    const naamRegel = pitch.leeftijd ? `${pitch.neepnaam} - ${pitch.leeftijd}` : pitch.neepnaam;
    const pitchTekst = `${naamRegel} – ${pitch.regio} – beschikbaar ${pitch.beschikbaarheid} uur – Salaris: ${pitch.salaris} (${pitch.type})

Gewenste functie(s):
${pitch.functies.map((f: string) => `• ${f}`).join("\n")}

Relevante werkervaring:
${pitch.werkervaring.map((w: string) => `• ${w}`).join("\n")}

Relevante opleidingen:
${pitch.opleidingen.map((o: string) => `• ${o}`).join("\n")}

Bijzonderheden:
${pitch.bijzonderheden}`;

    return NextResponse.json({ ...pitch, pitchTekst });
  } catch (err) {
    console.error("generate-pitch fout:", err);
    return NextResponse.json({ error: "Fout bij genereren pitch" }, { status: 500 });
  }
}
