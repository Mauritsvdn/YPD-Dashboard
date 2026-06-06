import { NextResponse } from "next/server";
import { generateMailchimpHtml } from "@/lib/email-template";
import { Kandidaat } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { kandidaten, maandJaar: maandJaarInput } = (await request.json()) as {
      kandidaten: Kandidaat[];
      maandJaar?: string;
    };

    if (!kandidaten || kandidaten.length === 0) {
      return NextResponse.json({ error: "Geen kandidaten in de mailing" }, { status: 400 });
    }

    const apiKey = process.env.MAILCHIMP_API_KEY!;
    const server = process.env.MAILCHIMP_SERVER_PREFIX!;
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID!;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ypd-dashboard.vercel.app";

    // Door de recruiter ingestelde maand/jaar; valt terug op de huidige maand.
    const maandJaar =
      maandJaarInput?.trim() ||
      new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
    const onderwerp = `Selectie onlangs gesproken professionals ${maandJaar}`;

    const html = generateMailchimpHtml(kandidaten, baseUrl, maandJaar);

    const baseMailchimp = `https://${server}.api.mailchimp.com/3.0`;
    const headers = {
      Authorization: `apikey ${apiKey}`,
      "Content-Type": "application/json",
    };

    const campaignRes = await fetch(`${baseMailchimp}/campaigns`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "regular",
        recipients: { list_id: audienceId },
        settings: {
          subject_line: onderwerp,
          from_name: "YPD",
          reply_to: "info@ypd.nl",
          from_email: "info@ypd.nl",
        },
      }),
    });

    if (!campaignRes.ok) {
      const err = await campaignRes.json();
      throw new Error(`Mailchimp campaign aanmaken mislukt: ${JSON.stringify(err)}`);
    }

    const campaign = await campaignRes.json();
    const campaignId = campaign.id;

    const contentRes = await fetch(`${baseMailchimp}/campaigns/${campaignId}/content`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ html }),
    });

    if (!contentRes.ok) {
      const err = await contentRes.json();
      throw new Error(`Mailchimp content instellen mislukt: ${JSON.stringify(err)}`);
    }

    const sendRes = await fetch(`${baseMailchimp}/campaigns/${campaignId}/actions/send`, {
      method: "POST",
      headers,
    });

    if (!sendRes.ok && sendRes.status !== 204) {
      const err = await sendRes.json().catch(() => ({}));
      throw new Error(`Mailchimp versturen mislukt: ${JSON.stringify(err)}`);
    }

    // Markeer alle verstuurde kandidaten als gearchiveerd
    const ids = kandidaten.map((k) => k.id);
    await supabase
      .from("kandidaten")
      .update({ verstuurd_op: new Date().toISOString() })
      .in("id", ids);

    return NextResponse.json({ ok: true, campaignId, onderwerp });
  } catch (err) {
    console.error("send-mailchimp fout:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fout bij versturen mailing" },
      { status: 500 }
    );
  }
}
