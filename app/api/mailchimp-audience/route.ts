import { NextResponse } from "next/server";

// Haalt naam + aantal subscribers van de Mailchimp-audience op,
// zodat de recruiter vóór verzenden ziet naar wie de mailing gaat.
export async function GET() {
  try {
    const apiKey = process.env.MAILCHIMP_API_KEY!;
    const server = process.env.MAILCHIMP_SERVER_PREFIX!;
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID!;

    const res = await fetch(
      `https://${server}.api.mailchimp.com/3.0/lists/${audienceId}`,
      {
        headers: { Authorization: `apikey ${apiKey}` },
        // Audience-aantallen veranderen langzaam; korte cache scheelt API-calls.
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Mailchimp audience ophalen mislukt: ${JSON.stringify(err)}`);
    }

    const list = await res.json();

    return NextResponse.json({
      naam: list.name as string,
      aantal: (list.stats?.member_count ?? 0) as number,
    });
  } catch (err) {
    console.error("mailchimp-audience fout:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout bij ophalen audience" },
      { status: 500 }
    );
  }
}
