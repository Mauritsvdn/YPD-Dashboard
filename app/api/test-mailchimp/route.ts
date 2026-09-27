import { NextResponse } from "next/server";
import { generateMailchimpHtml } from "@/lib/email-template";
import { Kandidaat } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const {
      kandidaten,
      testEmail,
      maandJaar: maandJaarInput,
      mailingTitel: mailingTitelInput,
    } = (await request.json()) as {
      kandidaten: Kandidaat[];
      testEmail: string;
      maandJaar?: string;
      mailingTitel?: string;
    };

    if (!kandidaten || kandidaten.length === 0) {
      return NextResponse.json({ error: "Geen kandidaten in de mailing" }, { status: 400 });
    }
    if (!testEmail) {
      return NextResponse.json({ error: "Geen testmail e-mailadres opgegeven" }, { status: 400 });
    }

    const apiKey = process.env.MAILCHIMP_API_KEY!;
    const server = process.env.MAILCHIMP_SERVER_PREFIX!;
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID!;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ypd-dashboard.vercel.app";

    // Door de recruiter ingestelde maand/jaar; valt terug op de huidige maand.
    const maandJaarRuw =
      maandJaarInput?.trim() ||
      new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
    // Maandnaam altijd met hoofdletter, bv. "Mei 2026".
    const maandJaar = maandJaarRuw.charAt(0).toUpperCase() + maandJaarRuw.slice(1);

    // Geef iedere testmail een uniek onderwerp. Gmail groepeert testmails met
    // hetzelfde onderwerp en kan identieke kandidaatblokken dan achter "..." verbergen.
    // De echte mailingroute wordt hierdoor niet geraakt.
    const testMoment = new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());

    const mailingTitel =
      mailingTitelInput?.trim().replace(/[\r\n]+/g, " ") ||
      "Selectie Beschikbare Professionals";

    const html = generateMailchimpHtml(
      kandidaten,
      baseUrl,
      maandJaar,
      mailingTitel,
      true
    );

    const baseMailchimp = `https://${server}.api.mailchimp.com/3.0`;
    const headers = {
      Authorization: `apikey ${apiKey}`,
      "Content-Type": "application/json",
    };

    // Maak een tijdelijke campagne aan
    const campaignRes = await fetch(`${baseMailchimp}/campaigns`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "regular",
        recipients: { list_id: audienceId },
        settings: {
          title: `YPD automatische testmail ${testMoment}`,
          subject_line: `${mailingTitel} ${maandJaar} — test ${testMoment}`,
          from_name: "YPD",
          reply_to: "info@ypd.nl",
          from_email: "info@ypd.nl",
        },
      }),
    });

    if (!campaignRes.ok) {
      const err = await campaignRes.json();
      throw new Error(`Campaign aanmaken mislukt: ${JSON.stringify(err)}`);
    }

    const campaign = await campaignRes.json();
    const campaignId = campaign.id;

    // Zet de HTML content
    const contentRes = await fetch(`${baseMailchimp}/campaigns/${campaignId}/content`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ html }),
    });

    if (!contentRes.ok) {
      const err = await contentRes.json();
      throw new Error(`Content instellen mislukt: ${JSON.stringify(err)}`);
    }

    // Stuur testmail naar alleen het opgegeven e-mailadres
    const testRes = await fetch(`${baseMailchimp}/campaigns/${campaignId}/actions/test`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        test_emails: [testEmail],
        send_type: "html",
      }),
    });

    if (!testRes.ok && testRes.status !== 204) {
      const err = await testRes.json().catch(() => ({}));
      throw new Error(`Testmail versturen mislukt: ${JSON.stringify(err)}`);
    }

    // Bewaar de huidige testcampagne: de categorie-links verwijzen naar de
    // Mailchimp-browsercopy en moeten na ontvangst nog bereikbaar zijn.
    // Ruim oudere automatische YPD-testcampagnes op, zodat er maximaal één blijft.
    try {
      const lijstRes = await fetch(
        `${baseMailchimp}/campaigns?status=save&count=100`,
        { headers }
      );
      if (lijstRes.ok) {
        const lijst = (await lijstRes.json()) as {
          campaigns?: Array<{
            id: string;
            settings?: { title?: string };
          }>;
        };
        const oudeTests = (lijst.campaigns ?? []).filter(
          (item) =>
            item.id !== campaignId &&
            item.settings?.title?.startsWith("YPD automatische testmail ")
        );
        await Promise.all(
          oudeTests.map((item) =>
            fetch(`${baseMailchimp}/campaigns/${item.id}`, {
              method: "DELETE",
              headers,
            })
          )
        );
      }
    } catch (cleanupError) {
      console.warn("Oude Mailchimp-testcampagnes opruimen mislukt:", cleanupError);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("test-mailchimp fout:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout bij versturen testmail" },
      { status: 500 }
    );
  }
}
