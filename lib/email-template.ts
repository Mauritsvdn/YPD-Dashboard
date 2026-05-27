import { Kandidaat } from "./types";

const LOGO_URL = "https://ypd-dashboard.vercel.app/ypd-logo.png";
const PURPLE = "#7B3FA0";
const PINK = "#E8547A";
const GRADIENT = `linear-gradient(90deg, ${PURPLE}, ${PINK}, #E8823A, #F5A623)`;

/** Formatteert het salarisbedrag. Puur getal → "€4.500,-", anders ongewijzigd (met € prefix). */
function formatSalaris(salaris: string): string {
  const trimmed = salaris.trim();
  if (/^\d+$/.test(trimmed)) {
    return `€${parseInt(trimmed, 10).toLocaleString("nl-NL")},-`;
  }
  return trimmed.startsWith("€") ? trimmed : `€${trimmed}`;
}

export function generateMailchimpHtml(kandidaten: Kandidaat[], baseUrl: string): string {
  const maandJaar = new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  const jaar = new Date().getFullYear();
  const categorieenInMailing = Array.from(new Set(kandidaten.map((k) => k.categorie)));

  // Nav links met telling per categorie
  const navLinks = categorieenInMailing
    .map((cat) => {
      const anchor = cat.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const count = kandidaten.filter((k) => k.categorie === cat).length;
      return `<a href="#${anchor}" style="color:${PURPLE};text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap;">${cat}&nbsp;(${count})</a>`;
    })
    .join(`<span style="color:#ddd;margin:0 6px;">|</span>`);

  const categorieSections = categorieenInMailing
    .map((cat) => {
      const anchor = cat.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const kands = kandidaten.filter((k) => k.categorie === cat);

      const kandidaatCards = kands
        .map((k) => {
          const cvUrl = `${baseUrl}/api/cv-request?kandidaat=${encodeURIComponent(k.neepnaam)}&email=*|EMAIL|*`;

          const salarisFormatted = formatSalaris(k.salaris);
          // Voeg "bruto/maand" toe als het puur een getal was
          const salarisDisplay = /^\d+$/.test(k.salaris.trim())
            ? `${salarisFormatted} bruto/maand`
            : salarisFormatted;

          const werkervaringBullets = k.werkervaring
            .map(
              (w) =>
                `<tr><td style="padding:2px 0;color:#444;font-size:13px;line-height:1.55;">• ${w}</td></tr>`
            )
            .join("");
          const opleidingenBullets = k.opleidingen
            .map(
              (o) =>
                `<tr><td style="padding:2px 0;color:#444;font-size:13px;line-height:1.55;">• ${o}</td></tr>`
            )
            .join("");
          const functiesBullets = k.functies
            .map(
              (f) =>
                `<tr><td style="padding:2px 0;color:#444;font-size:13px;line-height:1.55;">• ${f}</td></tr>`
            )
            .join("");

          return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;background:#fff;border-radius:12px;border:1px solid #e4e4e4;">
          <tr><td>

            <!-- Kandidaat header -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:18px 24px 14px 24px;border-bottom:1px solid #f0f0f0;">
                  <p style="font-size:16px;font-weight:700;color:#1a1a1a;margin:0 0 5px 0;">${k.neepnaam}</p>
                  <p style="font-size:13px;color:#777;margin:0;line-height:1.5;">
                    ${k.regio}&nbsp;&nbsp;·&nbsp;&nbsp;${k.beschikbaarheid}&nbsp;&nbsp;·&nbsp;&nbsp;<span style="color:${PURPLE};font-weight:600;">${salarisDisplay}</span>&nbsp;<span style="color:#aaa;font-size:12px;">(${k.type})</span>
                  </p>
                </td>
              </tr>
            </table>

            <!-- 2 kolommen: functies + werkervaring | opleidingen -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="55%" valign="top" style="padding:16px 12px 16px 24px;border-right:1px solid #f5f5f5;">
                  <p style="font-size:10px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1px;margin:0 0 7px 0;">Gewenste functie(s)</p>
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;">${functiesBullets}</table>
                  <p style="font-size:10px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1px;margin:0 0 7px 0;">Relevante werkervaring</p>
                  <table cellpadding="0" cellspacing="0">${werkervaringBullets}</table>
                </td>
                <td width="45%" valign="top" style="padding:16px 24px 16px 12px;">
                  <p style="font-size:10px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1px;margin:0 0 7px 0;">Relevante opleidingen</p>
                  <table cellpadding="0" cellspacing="0">${opleidingenBullets}</table>
                </td>
              </tr>
            </table>

            <!-- Bijzonderheden (volle breedte) -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
              <tr>
                <td style="padding:14px 24px;background:#faf8fc;">
                  <p style="font-size:10px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1px;margin:0 0 6px 0;">Bijzonderheden</p>
                  <p style="font-size:13px;color:#444;line-height:1.7;margin:0;">${k.bijzonderheden}</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
              <tr>
                <td style="padding:14px 24px;" align="right">
                  <a href="${cvUrl}"
                     style="display:inline-block;background:linear-gradient(90deg,${PURPLE},${PINK});color:#fff;text-decoration:none;padding:11px 24px;border-radius:20px;font-size:13px;font-weight:700;">
                    Ik wil een CV ontvangen →
                  </a>
                </td>
              </tr>
            </table>

          </td></tr>
        </table>`;
        })
        .join("");

      return `
      <!-- ── Categorie: ${cat} ── -->
      <table width="100%" cellpadding="0" cellspacing="0" id="${anchor}" style="margin:28px 0 12px 0;">
        <tr>
          <td style="padding:10px 18px;border-radius:8px;background:linear-gradient(90deg,#f1eafa,#fce8f0);">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><p style="font-size:12px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1.2px;margin:0;">${cat}</p></td>
                <td align="right"><p style="font-size:11px;color:#c4a0d8;margin:0;">${kands.length} kandidaat${kands.length !== 1 ? "en" : ""}</p></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ${kandidaatCards}
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:2px 0 16px 0;">
            <a href="#top" style="color:#ccc;font-size:11px;text-decoration:none;">↑ Terug naar boven</a>
          </td>
        </tr>
      </table>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>YPD – Beschikbare Professionals ${maandJaar}</title>
</head>
<body style="margin:0;padding:0;background:#eeecf0;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#eeecf0">
  <tr>
    <td align="center" style="padding:32px 16px;" id="top">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

        <!-- HEADER: wit met logo -->
        <tr>
          <td style="background:#fff;border-radius:16px 16px 0 0;padding:26px 40px 22px 40px;text-align:center;">
            <img src="${LOGO_URL}" alt="YPD" height="46" style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- GRADIENT ACCENT BALK -->
        <tr><td style="height:4px;background:${GRADIENT};"></td></tr>

        <!-- HERO -->
        <tr>
          <td style="background:linear-gradient(135deg,#5e2880 0%,#c03d68 55%,#c86020 100%);padding:30px 40px;text-align:center;">
            <p style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px 0;">Yours Personeelsdiensten · Twente</p>
            <p style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Beschikbare Professionals</p>
            <p style="color:rgba(255,255,255,0.88);font-size:15px;font-weight:300;margin:0;">${maandJaar}</p>
          </td>
        </tr>

        <!-- INTRO + CATEGORIEËN NAV -->
        <tr>
          <td style="background:#fff;padding:22px 40px 20px 40px;">
            <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px 0;">
              Een beknopte selectie van onlangs gesproken kandidaten deze maand. Klik op een categorie om direct naar de profielen te gaan:
            </p>
            <p style="text-align:center;margin:0;line-height:2.4;border-top:1px solid #f5f5f5;padding-top:14px;">${navLinks}</p>
          </td>
        </tr>

        <!-- KANDIDATEN -->
        <tr>
          <td style="background:#f4f2f6;padding:4px 24px 24px 24px;">
            ${categorieSections}
          </td>
        </tr>

        <!-- SELECTIE DISCLAIMER -->
        <tr>
          <td style="background:#fff;padding:22px 40px 14px 40px;text-align:center;border-top:2px solid #eeecf0;">
            <p style="color:#555;font-size:13px;line-height:1.7;margin:0 0 8px 0;">
              Dit is slechts een selectie van beschikbare kandidaten.<br>
              Voor andere interessante profielen kunt u ons uiteraard ook benaderen!
            </p>
            <p style="color:#bbb;font-size:12px;font-style:italic;margin:0;">
              "In verband met privacy gebruiken wij hier fictieve namen."
            </p>
          </td>
        </tr>

        <!-- WERVINGSFEE -->
        <tr>
          <td style="background:#faf7fd;padding:14px 40px;border-top:1px solid #ede4f8;border-bottom:1px solid #ede4f8;">
            <p style="color:#555;font-size:12px;line-height:1.7;margin:0;text-align:center;">
              Voor professionals die we al in bemiddeling hebben, maar die we niet specifiek hebben geworven voor uw openstaande vacature, hanteren wij een wervingsfee van <strong style="color:${PURPLE};">16% van het bruto jaarsalaris</strong> (op fulltime basis).
            </p>
          </td>
        </tr>

        <!-- DIENSTEN + CONTACT -->
        <tr>
          <td style="background:#fff;padding:20px 40px 22px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="55%" valign="top" style="padding-right:20px;">
                  <p style="color:${PURPLE};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Onze diensten</p>
                  <p style="color:#555;font-size:12px;line-height:1.9;margin:0;">
                    Werving en Selectie<br>
                    Bemiddeling van Interim Professionals<br>
                    Interim HR Advies &amp; Recruiting
                  </p>
                </td>
                <td width="45%" valign="top" style="padding-left:20px;border-left:1px solid #f0f0f0;">
                  <p style="color:${PURPLE};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Contact</p>
                  <p style="color:#555;font-size:12px;line-height:1.9;margin:0;">
                    <a href="tel:0888010200" style="color:#555;text-decoration:none;">Tel: 088-8010200</a><br>
                    Visserijstraat 3-5<br>
                    7514 BZ Enschede
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f8f7f9;border-top:1px solid #e8e4ec;padding:18px 40px 22px 40px;text-align:center;border-radius:0 0 16px 16px;">
            <img src="${LOGO_URL}" alt="YPD" height="28" style="display:block;margin:0 auto 10px auto;" />
            <p style="color:#bbb;font-size:11px;margin:0 0 3px 0;">
              Copyright &copy; ${jaar} Yours Personeelsdiensten, All rights reserved.
            </p>
            <p style="color:#ccc;font-size:11px;margin:0 0 10px 0;">
              Visserijstraat 3-5 · 7514 BZ Enschede
            </p>
            <p style="color:#bbb;font-size:11px;margin:0 0 6px 0;">
              U ontvangt deze e-mail omdat u bent aangemeld voor de YPD nieuwsbrief.
            </p>
            <p style="margin:0 0 8px 0;">
              <a href="*|UNSUB|*" style="color:#aaa;font-size:11px;text-decoration:underline;">Uw gegevens aanpassen of uitschrijven uit de lijst</a>
            </p>
            <p style="color:#ddd;font-size:10px;margin:0;">Email Marketing Powered by Mailchimp</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
