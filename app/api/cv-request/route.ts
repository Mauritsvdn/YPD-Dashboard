import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const LOGO_URL = "https://ypd-dashboard.vercel.app/ypd-logo.png";

// GET: redirect oude directe links naar het formulier
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kandidaat = searchParams.get("kandidaat") || "";
  const email = searchParams.get("email") || "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://ypd-dashboard.vercel.app";

  const params = new URLSearchParams();
  if (kandidaat) params.set("kandidaat", kandidaat);
  if (email) params.set("email", email);

  return Response.redirect(`${baseUrl}/cv-aanvragen?${params.toString()}`, 302);
}

// POST: verwerkt het aanvraagformulier (met telefoonnummer)
export async function POST(request: Request) {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const body = await request.json();
    const kandidaat: string = body.kandidaat || "";
    const email: string = body.email || "";
    const telefoonnummer: string = body.telefoonnummer || "";
    const bedrijf: string = body.bedrijf || "";

    if (!kandidaat || !email) {
      return NextResponse.json({ error: "Kandidaat en e-mail zijn verplicht" }, { status: 400 });
    }
    if (!telefoonnummer) {
      return NextResponse.json({ error: "Telefoonnummer is verplicht" }, { status: 400 });
    }

    await supabase.from("cv_requests").insert({
      kandidaat_naam: kandidaat,
      aanvrager_email: email,
      telefoonnummer,
      bedrijf_naam: bedrijf || null,
    });

    // Notificatie naar YPD intern
    await resend.emails.send({
      from: "YPD Dashboard <noreply@ypd.nl>",
      to: "info@ypd.nl",
      subject: `📥 CV-aanvraag: ${kandidaat}`,
      html: interneNotificatieHtml(kandidaat, email, telefoonnummer, bedrijf),
    });

    // Bevestigingsmail naar de aanvrager
    await resend.emails.send({
      from: "YPD <noreply@ypd.nl>",
      to: email,
      subject: `Bevestiging: uw CV-aanvraag voor ${kandidaat}`,
      html: bevestigingsMailHtml(kandidaat),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("cv-request fout:", err);
    return NextResponse.json({ error: "Fout bij verwerken aanvraag" }, { status: 500 });
  }
}

// ─── Interne notificatie → info@ypd.nl ────────────────────────────────────

function interneNotificatieHtml(kandidaat: string, aanvrager: string, telefoonnummer: string, bedrijf: string): string {
  const datum = new Date().toLocaleString("nl-NL", {
    weekday: "long", day: "numeric", month: "long",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return emailShell(`
    <!-- Melding label -->
    <tr>
      <td style="padding:0 40px 28px 40px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#f9f6fc;border-radius:20px;padding:5px 14px;">
              <p style="color:#7B3FA0;font-size:12px;font-weight:700;margin:0;letter-spacing:0.5px;">INTERNE MELDING</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Titel -->
    <tr>
      <td style="padding:0 40px 8px 40px;">
        <h1 style="color:#1a1a1a;font-size:22px;font-weight:700;margin:0;">Nieuwe CV-aanvraag</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 28px 40px;">
        <p style="color:#aaa;font-size:13px;margin:0;">${datum}</p>
      </td>
    </tr>

    <!-- Blokken -->
    <tr>
      <td style="padding:0 40px 12px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ebe3f5;border-radius:10px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="color:#7B3FA0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 4px 0;">Kandidaat</p>
              <p style="color:#1a1a1a;font-size:16px;font-weight:700;margin:0;">${kandidaat}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fde8ed;border-radius:10px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="color:#E8547A;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px 0;">Aangevraagd door</p>
              ${bedrijf ? `<p style="color:#1a1a1a;font-size:15px;font-weight:700;margin:0 0 2px 0;">${bedrijf}</p>` : ""}
              <p style="color:#444;font-size:14px;margin:0 0 2px 0;">${aanvrager}</p>
              <p style="margin:0 0 8px 0;">
                <a href="tel:${telefoonnummer}" style="color:#7B3FA0;font-size:15px;font-weight:700;text-decoration:none;">📞 ${telefoonnummer}</a>
              </p>
              <a href="mailto:${aanvrager}?subject=CV%20${encodeURIComponent(kandidaat)}&body=Beste%2C%0A%0ABedankt%20voor%20uw%20aanvraag%20voor%20het%20CV%20van%20${encodeURIComponent(kandidaat)}.%20Wij%20nemen%20zo%20spoedig%20mogelijk%20contact%20met%20u%20op.%0A%0AMet%20vriendelijke%20groet%2C%0AYPD"
                 style="color:#888;font-size:13px;text-decoration:none;">Stuur een e-mail →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Knoppen: bellen + mailen -->
    <tr>
      <td style="padding:0 40px 40px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;">
              <a href="tel:${telefoonnummer}"
                 style="display:block;text-align:center;background:linear-gradient(90deg,#7B3FA0,#E8547A);color:#fff;text-decoration:none;padding:13px 20px;border-radius:25px;font-size:14px;font-weight:700;">
                📞 Bel aanvrager
              </a>
            </td>
            <td style="padding-left:8px;">
              <a href="mailto:${aanvrager}?subject=CV%20${encodeURIComponent(kandidaat)}&body=Beste%2C%0A%0ABedankt%20voor%20uw%20aanvraag%20voor%20het%20CV%20van%20${encodeURIComponent(kandidaat)}.%20Wij%20nemen%20zo%20spoedig%20mogelijk%20contact%20met%20u%20op.%0A%0AMet%20vriendelijke%20groet%2C%0AYPD"
                 style="display:block;text-align:center;background:#f3ecfa;color:#7B3FA0;text-decoration:none;padding:13px 20px;border-radius:25px;font-size:14px;font-weight:700;">
                ✉️ Stuur e-mail
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `, "YPD Dashboard · Interne melding");
}

// ─── Bevestigingsmail → aanvrager ──────────────────────────────────────────

function bevestigingsMailHtml(kandidaat: string): string {
  return emailShell(`
    <!-- Titel -->
    <tr>
      <td style="padding:0 40px 16px 40px;">
        <h1 style="color:#1a1a1a;font-size:22px;font-weight:700;margin:0 0 8px 0;">Bedankt voor uw aanvraag</h1>
        <p style="color:#555;font-size:15px;line-height:1.7;margin:0;">
          We hebben uw aanvraag voor het CV van <strong style="color:#7B3FA0;">${kandidaat}</strong> ontvangen.
          Een van onze consultants neemt zo spoedig mogelijk contact met u op.
        </p>
      </td>
    </tr>

    <!-- Info blok -->
    <tr>
      <td style="padding:0 40px 28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6fc;border-radius:10px;border-left:3px solid #7B3FA0;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="color:#7B3FA0;font-size:13px;font-weight:700;margin:0 0 4px 0;">Heeft u vragen?</p>
              <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">
                Neem contact op via <a href="mailto:info@ypd.nl" style="color:#7B3FA0;">info@ypd.nl</a>
                of bel <strong>088 80 10 200</strong>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Spacer -->
    <tr><td style="height:8px;"></td></tr>
  `, "Bevestiging CV-aanvraag");
}

// ─── Bevestigingspagina in browser (na klik op CV-link) ───────────────────

function bevestigingHtml(titel: string, bericht: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${titel} – YPD</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;min-height:100vh;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f2f2f2" style="min-height:100vh;">
    <tr>
      <td align="center" valign="middle" style="padding:40px 16px;">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 40px 24px 40px;text-align:center;border-bottom:1px solid #f0f0f0;">
              <img src="${LOGO_URL}" alt="YPD" height="40" style="display:block;margin:0 auto 0 auto;" />
            </td>
          </tr>
          <tr><td style="height:4px;background:linear-gradient(90deg,#7B3FA0,#E8547A,#E8823A,#F5A623);"></td></tr>
          <tr>
            <td style="padding:36px 40px;text-align:center;">
              <h1 style="color:#1a1a1a;font-size:22px;font-weight:700;margin:0 0 12px 0;">${titel}</h1>
              <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 28px 0;">${bericht}</p>
              <p style="color:#bbb;font-size:12px;margin:0;">
                <a href="https://ypd.nl" style="color:#7B3FA0;text-decoration:none;">ypd.nl</a>
                &nbsp;·&nbsp; 088 80 10 200 &nbsp;·&nbsp; info@ypd.nl
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

// ─── Gedeelde email shell ──────────────────────────────────────────────────

function emailShell(body: string, subLabel: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subLabel} – YPD</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f2f2f2">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;">

        <!-- Header: wit met logo -->
        <tr>
          <td style="padding:28px 40px 20px 40px;text-align:center;border-bottom:1px solid #f5f5f5;">
            <img src="${LOGO_URL}" alt="YPD" height="44" style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- Gradient accent balk -->
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#7B3FA0,#E8547A,#E8823A,#F5A623);"></td>
        </tr>

        <!-- Spacer -->
        <tr><td style="height:32px;"></td></tr>

        <!-- Body -->
        ${body}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px 40px;border-top:1px solid #f5f5f5;text-align:center;">
            <p style="color:#bbb;font-size:11px;margin:0;">
              <a href="https://ypd.nl" style="color:#7B3FA0;text-decoration:none;">ypd.nl</a>
              &nbsp;·&nbsp; Visserijstraat 3-5, Enschede &nbsp;·&nbsp; 088 80 10 200
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
