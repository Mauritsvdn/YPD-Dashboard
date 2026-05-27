import { Kandidaat } from "./types";

const LOGO_URL = "https://ypd-dashboard.vercel.app/ypd-logo.png";
const GRADIENT = "linear-gradient(90deg, #7B3FA0, #E8547A, #E8823A, #F5A623)";

export function generateMailchimpHtml(kandidaten: Kandidaat[], baseUrl: string): string {
  const maandJaar = new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  const categorieenInMailing = Array.from(new Set(kandidaten.map((k) => k.categorie)));

  const navLinks = categorieenInMailing
    .map((cat) => {
      const anchor = cat.toLowerCase().replace(/[^a-z0-9]/g, "-");
      return `<a href="#${anchor}" style="color:#7B3FA0;text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap;">${cat}</a>`;
    })
    .join(`<span style="color:#ddd;margin:0 8px;">|</span>`);

  const categorieSections = categorieenInMailing
    .map((cat) => {
      const anchor = cat.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const kands = kandidaten.filter((k) => k.categorie === cat);

      const kandidaatCards = kands.map((k) => {
        const cvUrl = `${baseUrl}/api/cv-request?kandidaat=${encodeURIComponent(k.neepnaam)}&email=*|EMAIL|*`;

        const werkervaringBullets = k.werkervaring
          .map((w) => `<tr><td style="padding:2px 0;color:#444;font-size:13px;line-height:1.5;">• ${w}</td></tr>`)
          .join("");
        const opleidingenBullets = k.opleidingen
          .map((o) => `<tr><td style="padding:2px 0;color:#444;font-size:13px;line-height:1.5;">• ${o}</td></tr>`)
          .join("");
        const functiesBullets = k.functies
          .map((f) => `<tr><td style="padding:2px 0;color:#444;font-size:13px;line-height:1.5;">• ${f}</td></tr>`)
          .join("");

        return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;background:#fff;border-radius:12px;border:1px solid #ececec;">
          <tr>
            <td style="padding:0;">

              <!-- Kandidaat header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px 24px 16px 24px;border-bottom:1px solid #f5f5f5;">
                    <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 4px 0;">${k.neepnaam}</p>
                    <p style="font-size:13px;color:#888;margin:0;">
                      ${k.regio}&nbsp;&nbsp;·&nbsp;&nbsp;${k.beschikbaarheid}&nbsp;&nbsp;·&nbsp;&nbsp;
                      <span style="color:#7B3FA0;font-weight:600;">€${k.salaris},-</span> bruto/maand (${k.type})
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Kandidaat body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Links: functies + werkervaring -->
                  <td width="50%" valign="top" style="padding:20px 12px 20px 24px;">
                    <p style="font-size:11px;font-weight:700;color:#7B3FA0;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px 0;">Gewenste functie(s)</p>
                    <table cellpadding="0" cellspacing="0">${functiesBullets}</table>
                    <p style="font-size:11px;font-weight:700;color:#7B3FA0;text-transform:uppercase;letter-spacing:0.8px;margin:16px 0 8px 0;">Werkervaring</p>
                    <table cellpadding="0" cellspacing="0">${werkervaringBullets}</table>
                  </td>
                  <!-- Rechts: opleidingen + bijzonderheden -->
                  <td width="50%" valign="top" style="padding:20px 24px 20px 12px;border-left:1px solid #f5f5f5;">
                    <p style="font-size:11px;font-weight:700;color:#7B3FA0;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px 0;">Opleidingen</p>
                    <table cellpadding="0" cellspacing="0">${opleidingenBullets}</table>
                    <p style="font-size:11px;font-weight:700;color:#7B3FA0;text-transform:uppercase;letter-spacing:0.8px;margin:16px 0 8px 0;">Bijzonderheden</p>
                    <p style="font-size:13px;color:#444;line-height:1.6;margin:0;">${k.bijzonderheden}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f5f5f5;">
                <tr>
                  <td style="padding:16px 24px;" align="right">
                    <a href="${cvUrl}"
                       style="display:inline-block;background:linear-gradient(90deg,#7B3FA0,#E8547A);color:#fff;text-decoration:none;padding:10px 22px;border-radius:20px;font-size:13px;font-weight:700;">
                      Ik wil een CV ontvangen
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>`;
      }).join("");

      return `
      <!-- Categorie -->
      <table width="100%" cellpadding="0" cellspacing="0" id="${anchor}" style="margin:32px 0 16px 0;">
        <tr>
          <td style="padding:12px 20px;border-radius:8px;" bgcolor="#f9f6fc">
            <p style="font-size:13px;font-weight:700;color:#7B3FA0;text-transform:uppercase;letter-spacing:1px;margin:0;">${cat}</p>
          </td>
        </tr>
      </table>
      ${kandidaatCards}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0 0;">
        <tr>
          <td align="center">
            <a href="#top" style="color:#bbb;font-size:12px;text-decoration:none;">↑ Terug naar boven</a>
          </td>
        </tr>
      </table>`;
    }).join("");

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>YPD – Beschikbare Professionals ${maandJaar}</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f2f2f2">
  <tr>
    <td align="center" style="padding:32px 16px;" id="top">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

        <!-- HEADER: wit met logo -->
        <tr>
          <td style="background:#fff;border-radius:16px 16px 0 0;padding:28px 40px 20px 40px;text-align:center;">
            <img src="${LOGO_URL}" alt="YPD" height="48" style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- GRADIENT ACCENT BALK -->
        <tr>
          <td style="height:4px;background:${GRADIENT};"></td>
        </tr>

        <!-- HERO -->
        <tr>
          <td style="background:linear-gradient(135deg,#7B3FA0 0%,#E8547A 50%,#E8823A 100%);padding:36px 40px;text-align:center;">
            <p style="color:#fff;font-size:22px;font-weight:700;margin:0 0 6px 0;letter-spacing:2px;text-transform:uppercase;">Beschikbare Professionals</p>
            <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;font-weight:400;">${maandJaar}</p>
          </td>
        </tr>

        <!-- INTRO + NAV -->
        <tr>
          <td style="background:#fff;padding:24px 40px;border-bottom:1px solid #f0f0f0;">
            <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px 0;">
              Een selectie van kandidaten die wij deze maand hebben gesproken. Klik op een categorie om direct naar de profielen te gaan:
            </p>
            <p style="text-align:center;margin:0;line-height:2;">${navLinks}</p>
          </td>
        </tr>

        <!-- KANDIDATEN -->
        <tr>
          <td style="background:#f9f9f9;padding:8px 32px 32px 32px;">
            ${categorieSections}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#fff;border-top:1px solid #ececec;padding:28px 40px;text-align:center;border-radius:0 0 16px 16px;">
            <img src="${LOGO_URL}" alt="YPD" height="32" style="display:block;margin:0 auto 12px auto;" />
            <p style="color:#888;font-size:12px;margin:0 0 4px 0;">Visserijstraat 3-5, Enschede &bull; 088 80 10 200 &bull; info@ypd.nl</p>
            <p style="color:#bbb;font-size:11px;margin:12px 0 0 0;">
              U ontvangt deze e-mail omdat u bent aangemeld voor de YPD nieuwsbrief.&nbsp;&nbsp;
              <a href="*|UNSUB|*" style="color:#bbb;">Uitschrijven</a>
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
