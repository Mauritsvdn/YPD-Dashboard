import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

export async function GET() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const gebruikers = data.users
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));

  return NextResponse.json(gebruikers);
}

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "E-mail is verplicht" }, { status: 400 });

  // Maak gebruiker aan in Supabase (direct bevestigd, geen invite-flow)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (error) {
    const bericht = error.message.includes("already been registered")
      ? "Dit e-mailadres is al toegevoegd."
      : error.message;
    return NextResponse.json({ error: bericht }, { status: 400 });
  }

  // Genereer een "stel wachtwoord in" link voor de nieuwe gebruiker
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://ypd-dashboard.vercel.app";
  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=/set-password`,
    },
  });

  const wachtwoordLink = linkData?.properties?.action_link ?? `${baseUrl}/login`;

  // Stuur branded welkomstmail met wachtwoord-instellen link
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "YPD <noreply@ypd.nl>",
    to: email,
    subject: "Welkom bij het YPD Recruiter Dashboard — stel je wachtwoord in",
    html: welkomMailHtml(email, wachtwoordLink),
  });

  return NextResponse.json({ ok: true, id: data.user?.id });
}

const LOGO_URL = "https://ypd-dashboard.vercel.app/ypd-logo.png";

function welkomMailHtml(email: string, wachtwoordLink: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welkom bij het YPD Recruiter Dashboard</title>
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
        <tr><td style="height:4px;background:linear-gradient(90deg,#7B3FA0,#E8547A,#E8823A,#F5A623);"></td></tr>
        <tr><td style="height:32px;"></td></tr>

        <!-- Welkom titel -->
        <tr>
          <td style="padding:0 40px 8px 40px;">
            <h1 style="color:#1a1a1a;font-size:22px;font-weight:700;margin:0;">Welkom bij het Recruiter Dashboard</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 24px 40px;">
            <p style="color:#555;font-size:15px;line-height:1.7;margin:0;">
              Je hebt toegang gekregen tot het YPD Recruiter Dashboard. Stel eerst je wachtwoord in om te beginnen.
            </p>
          </td>
        </tr>

        <!-- Wat kun je doen -->
        <tr>
          <td style="padding:0 40px 24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6fc;border-radius:10px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="color:#7B3FA0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px 0;">Wat kun je doen</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr><td style="padding:4px 0;color:#444;font-size:14px;">✓&nbsp;&nbsp;AI-gegenereerde kandidaatpitches aanmaken</td></tr>
                    <tr><td style="padding:4px 0;color:#444;font-size:14px;">✓&nbsp;&nbsp;Maandelijkse mailings samenstellen en versturen</td></tr>
                    <tr><td style="padding:4px 0;color:#444;font-size:14px;">✓&nbsp;&nbsp;CV-aanvragen van relaties bekijken en opvolgen</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Stappen -->
        <tr>
          <td style="padding:0 40px 24px 40px;">
            <p style="color:#7B3FA0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px 0;">Zo ga je aan de slag</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:6px 0;">
                  <span style="display:inline-block;background:#7B3FA0;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;vertical-align:middle;">1</span>
                  <span style="color:#444;font-size:14px;vertical-align:middle;">Klik op de knop hieronder om je wachtwoord in te stellen</span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;">
                  <span style="display:inline-block;background:#7B3FA0;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;vertical-align:middle;">2</span>
                  <span style="color:#444;font-size:14px;vertical-align:middle;">Log voortaan in op <a href="https://ypd-dashboard.vercel.app/login" style="color:#7B3FA0;font-weight:600;">ypd-dashboard.vercel.app</a></span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;">
                  <span style="display:inline-block;background:#7B3FA0;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;vertical-align:middle;">3</span>
                  <span style="color:#444;font-size:14px;vertical-align:middle;">E-mail: <strong>${email}</strong> + jouw wachtwoord</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA knop -->
        <tr>
          <td style="padding:0 40px 8px 40px;" align="center">
            <a href="${wachtwoordLink}"
               style="display:inline-block;background:linear-gradient(90deg,#7B3FA0,#E8547A);color:#fff;text-decoration:none;padding:14px 36px;border-radius:25px;font-size:15px;font-weight:700;">
              Stel wachtwoord in →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 40px 32px 40px;text-align:center;">
            <p style="color:#bbb;font-size:11px;margin:0;">Deze link is 24 uur geldig.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px 40px;border-top:1px solid #f5f5f5;text-align:center;">
            <p style="color:#bbb;font-size:11px;margin:0;">
              Vragen? <a href="mailto:info@ypd.nl" style="color:#7B3FA0;text-decoration:none;">info@ypd.nl</a>
              &nbsp;·&nbsp; 088 80 10 200 &nbsp;·&nbsp;
              <a href="https://ypd.nl" style="color:#7B3FA0;text-decoration:none;">ypd.nl</a>
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
