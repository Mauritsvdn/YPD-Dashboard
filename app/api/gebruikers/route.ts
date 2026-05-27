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

  // Stuur branded welkomstmail via Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "YPD <noreply@ypd.nl>",
    to: email,
    subject: "Welkom bij het YPD Recruiter Dashboard",
    html: welkomMailHtml(email),
  });

  return NextResponse.json({ ok: true, id: data.user?.id });
}

function welkomMailHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welkom bij het YPD Dashboard</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#7B3FA0 0%,#E8823A 60%,#F5A623 100%);border-radius:16px 16px 0 0;padding:40px;text-align:center;">
              <img src="https://ypd.nl/wp-content/uploads/2025/05/ypd.svg" alt="YPD" height="44" style="filter:brightness(0) invert(1);margin-bottom:16px;" />
              <p style="color:#fff;font-size:20px;font-weight:700;margin:0;letter-spacing:0.5px;">Welkom bij het Recruiter Dashboard</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#fff;padding:40px;">

              <p style="color:#1a1a1a;font-size:15px;line-height:1.7;margin:0 0 16px 0;">
                Je hebt toegang gekregen tot het <strong>YPD Recruiter Dashboard</strong>. Via dit dashboard kun je:
              </p>

              <!-- Feature lijst -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td style="padding:6px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:28px;vertical-align:top;padding-top:1px;">
                          <span style="display:inline-block;width:20px;height:20px;background:linear-gradient(135deg,#7B3FA0,#E8547A);border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#fff;font-weight:700;">✓</span>
                        </td>
                        <td style="color:#444;font-size:14px;line-height:1.5;">Kandidaatprofielen aanmaken met AI-gegenereerde pitches</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:28px;vertical-align:top;padding-top:1px;">
                          <span style="display:inline-block;width:20px;height:20px;background:linear-gradient(135deg,#7B3FA0,#E8547A);border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#fff;font-weight:700;">✓</span>
                        </td>
                        <td style="color:#444;font-size:14px;line-height:1.5;">Maandelijkse mailings samenstellen en versturen via Mailchimp</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:28px;vertical-align:top;padding-top:1px;">
                          <span style="display:inline-block;width:20px;height:20px;background:linear-gradient(135deg,#7B3FA0,#E8547A);border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#fff;font-weight:700;">✓</span>
                        </td>
                        <td style="color:#444;font-size:14px;line-height:1.5;">CV-aanvragen van relaties bekijken en opvolgen</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Stappen -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6fc;border-radius:12px;padding:24px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="color:#7B3FA0;font-size:13px;font-weight:700;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:0.5px;">Zo log je in</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <span style="display:inline-block;background:#7B3FA0;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;vertical-align:middle;">1</span>
                          <span style="color:#444;font-size:14px;vertical-align:middle;">Ga naar <a href="https://ypd-dashboard.vercel.app/login" style="color:#7B3FA0;font-weight:600;">ypd-dashboard.vercel.app</a></span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <span style="display:inline-block;background:#7B3FA0;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;vertical-align:middle;">2</span>
                          <span style="color:#444;font-size:14px;vertical-align:middle;">Vul je e-mailadres in: <strong>${email}</strong></span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <span style="display:inline-block;background:#7B3FA0;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;vertical-align:middle;">3</span>
                          <span style="color:#444;font-size:14px;vertical-align:middle;">Klik op de inloglink die je per e-mail ontvangt</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <span style="display:inline-block;background:linear-gradient(90deg,#7B3FA0,#E8547A);color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:10px;vertical-align:middle;">✓</span>
                          <span style="color:#444;font-size:14px;vertical-align:middle;">Je bent ingelogd — geen wachtwoord nodig!</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA knop -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://ypd-dashboard.vercel.app/login"
                       style="display:inline-block;background:linear-gradient(90deg,#7B3FA0,#E8547A);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;">
                      Ga naar het dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px 0;" />
              <p style="color:#bbb;font-size:11px;margin:0;text-align:center;">
                Vragen? Stuur een e-mail naar <a href="mailto:info@ypd.nl" style="color:#7B3FA0;text-decoration:none;">info@ypd.nl</a> of bel <strong>088 80 10 200</strong><br>
                <a href="https://ypd.nl" style="color:#7B3FA0;text-decoration:none;">ypd.nl</a> &bull; Visserijstraat 3-5, Enschede
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:linear-gradient(135deg,#7B3FA0 0%,#E8823A 60%,#F5A623 100%);border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              <img src="https://ypd.nl/wp-content/uploads/2025/05/ypd.svg" alt="YPD" height="28" style="filter:brightness(0) invert(1);" />
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
