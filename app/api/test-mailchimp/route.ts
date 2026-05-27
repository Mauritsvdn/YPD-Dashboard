import { NextResponse } from "next/server";
import { generateMailchimpHtml } from "@/lib/email-template";
import { Kandidaat } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { kandidaten, testEmail } = (await request.json()) as {
      kandidaten: Kandidaat[];
      testEmail: string;
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

    const maandJaar = new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
    const html = generateMailchimpHtml(kandidaten, baseUrl);

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
          subject_line: `[TEST] Onlangs gesproken kandidaten ${maandJaar}`,
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

    // Verwijder de tijdelijke campagne zodat Mailchimp opgeruimd blijft
    await fetch(`${baseMailchimp}/campaigns/${campaignId}`, {
      method: "DELETE",
      headers,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("test-mailchimp fout:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout bij versturen testmail" },
      { status: 500 }
    );
  }
}
