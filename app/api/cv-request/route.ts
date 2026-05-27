import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

export async function GET(request: Request) {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { searchParams } = new URL(request.url);
  const kandidaat = searchParams.get("kandidaat") || "";
  const email = searchParams.get("email") || "";

  if (!kandidaat || !email) {
    return new Response(bevestigingHtml("Ongeldige aanvraag", "Ontbrekende gegevens. Neem contact op met YPD."), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 400,
    });
  }

  try {
    await supabase.from("cv_requests").insert({
      kandidaat_naam: kandidaat,
      aanvrager_email: email,
    });

    // Notificatie naar YPD intern
    await resend.emails.send({
      from: "YPD Dashboard <noreply@ypd.nl>",
      to: "info@ypd.nl",
      subject: `CV-aanvraag: ${kandidaat}`,
      html: `<p><strong>${email}</strong> wil het cv ontvangen van kandidaat <strong>${kandidaat}</strong>.</p><p>Datum: ${new Date().toLocaleString("nl-NL")}</p>`,
    });

    // Bevestigingsmail naar de aanvrager
    await resend.emails.send({
      from: "YPD <noreply@ypd.nl>",
      to: email,
      subject: `Bevestiging: CV-aanvraag ${kandidaat}`,
      html: bevestigingsMailHtml(kandidaat),
    });

    return new Response(
      bevestigingHtml(
        "Bedankt voor uw aanvraag!",
        `We hebben uw aanvraag voor het CV van <strong>${kandidaat}</strong> ontvangen. Een YPD-consultant neemt zo spoedig mogelijk contact met u op.`
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err) {
    console.error("cv-request fout:", err);
    return new Response(
      bevestigingHtml(
        "Er is iets misgegaan",
        "Uw aanvraag kon niet worden verwerkt. Neem direct contact op via info@ypd.nl of 088 80 10 200."
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 500 }
    );
  }
}

function bevestigingsMailHtml(kandidaat: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bevestiging CV-aanvraag – YPD</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#7B3FA0 0%,#E8823A 60%,#F5A623 100%);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
              <img src="https://ypd.nl/wp-content/uploads/2025/05/ypd.svg" alt="YPD" height="36" style="filter:brightness(0) invert(1);" />
            </td>
          </tr>
          <tr>
            <td style="background:#fff;padding:40px;border-radius:0 0 16px 16px;">
              <h1 style="color:#7B3FA0;font-size:20px;font-weight:700;margin:0 0 16px 0;">Bedankt voor uw aanvraag!</h1>
              <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 12px 0;">
                We hebben uw aanvraag voor het CV van <strong style="color:#222;">${kandidaat}</strong> goed ontvangen.
              </p>
              <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 28px 0;">
                Een van onze consultants neemt zo spoedig mogelijk contact met u op om de verdere stappen te bespreken.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f9f6fc;border-left:3px solid #7B3FA0;border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="color:#7B3FA0;font-size:13px;font-weight:700;margin:0 0 4px 0;">Heeft u vragen?</p>
                    <p style="color:#555;font-size:13px;margin:0;">Neem gerust contact op via <a href="mailto:info@ypd.nl" style="color:#7B3FA0;">info@ypd.nl</a> of bel <strong>088 80 10 200</strong>.</p>
                  </td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid #f0f0f0;margin:28px 0 20px 0;" />
              <p style="color:#aaa;font-size:11px;margin:0;text-align:center;">
                <a href="https://ypd.nl" style="color:#7B3FA0;text-decoration:none;">ypd.nl</a> &bull; Visserijstraat 3-5, Enschede &bull; 088 80 10 200
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function bevestigingHtml(titel: string, bericht: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${titel} – YPD</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: linear-gradient(135deg, #7B3FA0 0%, #E8823A 60%, #F5A623 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #fff; border-radius: 16px; padding: 48px 40px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
    img { height: 48px; margin-bottom: 24px; }
    h1 { color: #7B3FA0; font-size: 22px; margin: 0 0 16px 0; }
    p { color: #555; font-size: 15px; line-height: 1.6; }
    a { color: #7B3FA0; }
  </style>
</head>
<body>
  <div class="card">
    <img src="https://ypd.nl/wp-content/uploads/2025/05/ypd.svg" alt="YPD" />
    <h1>${titel}</h1>
    <p>${bericht}</p>
    <p style="margin-top:24px;font-size:13px;color:#999;">
      <a href="https://ypd.nl">ypd.nl</a> &bull; 088 80 10 200 &bull; info@ypd.nl
    </p>
  </div>
</body>
</html>`;
}
