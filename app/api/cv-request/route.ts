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

    await resend.emails.send({
      from: "YPD Dashboard <noreply@ypd.nl>",
      to: "info@ypd.nl",
      subject: `CV-aanvraag: ${kandidaat}`,
      html: `<p><strong>${email}</strong> wil het cv ontvangen van kandidaat <strong>${kandidaat}</strong>.</p><p>Datum: ${new Date().toLocaleString("nl-NL")}</p>`,
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
