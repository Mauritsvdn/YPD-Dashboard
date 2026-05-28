import { Kandidaat } from "./types";

const LOGO_URL = "https://ypd-dashboard.vercel.app/ypd-logo.png";
const PURPLE = "#7B3FA0";
const PINK = "#E8547A";
const GRADIENT = `linear-gradient(90deg, ${PURPLE}, ${PINK}, #E8823A, #F5A623)`;

/** Formatteert het salarisbedrag. Puur getal → "€4.500,-", anders ongewijzigd (met € prefix). */
function formatSalaris(salaris: string | null | undefined): string {
  const trimmed = (salaris ?? "").trim();
  if (!trimmed) return "";
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
          const cvUrl = `${baseUrl}/cv-aanvragen?kandidaat=${encodeURIComponent(k.neepnaam)}&email=*|EMAIL|*`;

          const salarisFormatted = formatSalaris(k.salaris);
          const salarisDisplay = /^\d+$/.test((k.salaris ?? "").trim())
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
        <table width="100%" cellpadding="0" cellspacing="0" class="ypd-card" bgcolor="#ffffff" style="margin:0 0 16px 0;background:#fff;border-radius:12px;border:1px solid #e4e4e4;">
          <tr><td class="ypd-card" bgcolor="#ffffff" style="background:#fff;">

            <!-- Kandidaat header -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:18px 24px 14px 24px;border-bottom:1px solid #f0f0f0;">
                  <p class="ypd-text-dark ypd-cand-name" style="font-size:16px;font-weight:700;color:#1a1a1a;margin:0 0 5px 0;">${k.neepnaam}</p>
                  <p class="ypd-text-muted ypd-cand-meta" style="font-size:13px;color:#777;margin:0;line-height:1.5;">
                    ${k.regio} ·&nbsp;${k.beschikbaarheid} ·&nbsp;<span class="ypd-text-purple" style="color:${PURPLE};font-weight:600;">${salarisDisplay}</span> <span style="color:#aaa;font-size:12px;">(${k.type})</span>
                  </p>
                </td>
              </tr>
            </table>

            <!-- 2 kolommen: functies + werkervaring | opleidingen -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="55%" valign="top" class="ypd-stack ypd-stack-l" style="padding:16px 12px 16px 24px;border-right:1px solid #f5f5f5;">
                  <p class="ypd-text-purple" style="font-size:10px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1px;margin:0 0 7px 0;">Gewenste functie(s)</p>
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;">${functiesBullets}</table>
                  <p class="ypd-text-purple" style="font-size:10px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1px;margin:0 0 7px 0;">Relevante werkervaring</p>
                  <table cellpadding="0" cellspacing="0">${werkervaringBullets}</table>
                </td>
                <td width="45%" valign="top" class="ypd-stack ypd-stack-r" style="padding:16px 24px 16px 12px;">
                  <p class="ypd-text-purple" style="font-size:10px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1px;margin:0 0 7px 0;">Relevante opleidingen</p>
                  <table cellpadding="0" cellspacing="0">${opleidingenBullets}</table>
                </td>
              </tr>
            </table>

            <!-- Bijzonderheden (volle breedte) -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
              <tr>
                <td class="ypd-bg-tint-2" bgcolor="#faf8fc" style="padding:14px 24px;background:#faf8fc;">
                  <p class="ypd-text-purple" style="font-size:10px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1px;margin:0 0 6px 0;">Bijzonderheden</p>
                  <p class="ypd-text-body" style="font-size:13px;color:#444;line-height:1.7;margin:0;">${k.bijzonderheden}</p>
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
            <a name="${anchor}" style="display:block;text-decoration:none;font-size:1px;line-height:1px;color:transparent;">&nbsp;</a>
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
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>YPD – Beschikbare Professionals ${maandJaar}</title>
  <style>
    :root { color-scheme: light only; supported-color-schemes: light only; }
    html, body { color-scheme: light only; supported-color-schemes: light only; }

    /* Forceer originele kleuren in clients die toch dark-mode inversie toepassen
       (Gmail iOS, sommige Android-clients, Outlook.com dark mode). */
    @media (prefers-color-scheme: dark) {
      .ypd-bg-page    { background-color: #eeecf0 !important; }
      .ypd-bg-white   { background-color: #ffffff !important; }
      .ypd-bg-grey    { background-color: #f4f2f6 !important; }
      .ypd-bg-tint    { background-color: #faf7fd !important; }
      .ypd-bg-tint-2  { background-color: #faf8fc !important; }
      .ypd-bg-soft    { background-color: #f8f7f9 !important; }
      .ypd-card       { background-color: #ffffff !important; }
      .ypd-text-dark  { color: #1a1a1a !important; }
      .ypd-text-body  { color: #444444 !important; }
      .ypd-text-muted { color: #777777 !important; }
      .ypd-text-soft  { color: #555555 !important; }
      .ypd-text-purple{ color: #7B3FA0 !important; }
    }
    /* Outlook.com / Outlook dark mode */
    [data-ogsc] .ypd-bg-page,    [data-ogsb] .ypd-bg-page    { background-color: #eeecf0 !important; }
    [data-ogsc] .ypd-bg-white,   [data-ogsb] .ypd-bg-white   { background-color: #ffffff !important; }
    [data-ogsc] .ypd-bg-grey,    [data-ogsb] .ypd-bg-grey    { background-color: #f4f2f6 !important; }
    [data-ogsc] .ypd-bg-tint,    [data-ogsb] .ypd-bg-tint    { background-color: #faf7fd !important; }
    [data-ogsc] .ypd-bg-tint-2,  [data-ogsb] .ypd-bg-tint-2  { background-color: #faf8fc !important; }
    [data-ogsc] .ypd-bg-soft,    [data-ogsb] .ypd-bg-soft    { background-color: #f8f7f9 !important; }
    [data-ogsc] .ypd-card,       [data-ogsb] .ypd-card       { background-color: #ffffff !important; }
    [data-ogsc] .ypd-text-dark   { color: #1a1a1a !important; }
    [data-ogsc] .ypd-text-body   { color: #444444 !important; }
    [data-ogsc] .ypd-text-muted  { color: #777777 !important; }
    [data-ogsc] .ypd-text-soft   { color: #555555 !important; }
    [data-ogsc] .ypd-text-purple { color: #7B3FA0 !important; }

    /* ── Mobile responsive ─────────────────────────────────────────────── */
    @media only screen and (max-width: 600px) {
      table.ypd-outer { width: 100% !important; max-width: 100% !important; }

      /* Verklein de body marge op mobiel */
      td.ypd-body-pad { padding: 16px 8px !important; }

      /* Verklein 40px horizontale padding op mobiel */
      td.ypd-pad-lg { padding-left: 20px !important; padding-right: 20px !important; }
      td.ypd-pad-md { padding-left: 16px !important; padding-right: 16px !important; }

      /* Stack 2-koloms layouts onder elkaar */
      td.ypd-stack {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        border-right: none !important;
        border-left: none !important;
      }
      td.ypd-stack-l { padding: 14px 20px 6px 20px !important; }
      td.ypd-stack-r { padding: 6px 20px 14px 20px !important; }

      /* Hero tekst iets kleiner op mobiel */
      .ypd-hero-title { font-size: 20px !important; }
      .ypd-hero-sub   { font-size: 13px !important; }

      /* Kandidaat naam */
      .ypd-cand-name  { font-size: 17px !important; }

      /* Sta wrappen toe in de kandidaat-meta regel (regio · uren · salaris) */
      .ypd-cand-meta  { white-space: normal !important; line-height: 1.7 !important; }
    }
  </style>
</head>
<body class="ypd-bg-page" style="margin:0;padding:0;background:#eeecf0;font-family:Arial,Helvetica,sans-serif;color-scheme:light only;supported-color-schemes:light only;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#eeecf0" class="ypd-bg-page">
  <tr>
    <td align="center" class="ypd-body-pad" style="padding:32px 16px;" id="top">
      <a name="top" style="display:block;text-decoration:none;font-size:1px;line-height:1px;color:transparent;">&nbsp;</a>
      <table width="640" cellpadding="0" cellspacing="0" class="ypd-outer" style="max-width:640px;width:100%;">

        <!-- HEADER: wit met logo -->
        <tr>
          <td class="ypd-bg-white ypd-pad-lg" bgcolor="#ffffff" style="background:#fff;border-radius:16px 16px 0 0;padding:26px 40px 22px 40px;text-align:center;">
            <img src="${LOGO_URL}" alt="YPD" height="46" style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- GRADIENT ACCENT BALK -->
        <tr><td style="height:4px;background:${GRADIENT};"></td></tr>

        <!-- HERO -->
        <tr>
          <td class="ypd-pad-lg" style="background:linear-gradient(135deg,#5e2880 0%,#c03d68 55%,#c86020 100%);padding:30px 40px;text-align:center;">
            <p class="ypd-hero-sub" style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px 0;">Yours Personeelsdiensten · Twente</p>
            <p class="ypd-hero-title" style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Beschikbare Professionals</p>
            <p style="color:rgba(255,255,255,0.88);font-size:15px;font-weight:300;margin:0;">${maandJaar}</p>
          </td>
        </tr>

        <!-- INTRO + CATEGORIEËN NAV -->
        <tr>
          <td class="ypd-bg-white ypd-pad-lg" bgcolor="#ffffff" style="background:#fff;padding:22px 40px 20px 40px;">
            <p class="ypd-text-soft" style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px 0;">
              Een beknopte selectie van onlangs gesproken kandidaten deze maand. Klik op een categorie om direct naar de profielen te gaan:
            </p>
            <p style="text-align:center;margin:0;line-height:2.4;border-top:1px solid #f5f5f5;padding-top:14px;">${navLinks}</p>
          </td>
        </tr>

        <!-- KANDIDATEN -->
        <tr>
          <td class="ypd-bg-grey ypd-pad-md" bgcolor="#f4f2f6" style="background:#f4f2f6;padding:4px 24px 24px 24px;">
            ${categorieSections}
          </td>
        </tr>

        <!-- SELECTIE DISCLAIMER -->
        <tr>
          <td class="ypd-bg-white ypd-pad-lg" bgcolor="#ffffff" style="background:#fff;padding:22px 40px 14px 40px;text-align:center;border-top:2px solid #eeecf0;">
            <p class="ypd-text-soft" style="color:#555;font-size:13px;line-height:1.7;margin:0 0 8px 0;">
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
          <td class="ypd-bg-tint ypd-pad-lg" bgcolor="#faf7fd" style="background:#faf7fd;padding:14px 40px;border-top:1px solid #ede4f8;border-bottom:1px solid #ede4f8;">
            <p class="ypd-text-soft" style="color:#555;font-size:12px;line-height:1.7;margin:0;text-align:center;">
              Voor professionals die we al in bemiddeling hebben, maar die we niet specifiek hebben geworven voor uw openstaande vacature, hanteren wij een wervingsfee van <strong class="ypd-text-purple" style="color:${PURPLE};">16% van het bruto jaarsalaris</strong> (op fulltime basis).
            </p>
          </td>
        </tr>

        <!-- DIENSTEN + CONTACT -->
        <tr>
          <td class="ypd-bg-white ypd-pad-lg" bgcolor="#ffffff" style="background:#fff;padding:20px 40px 22px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="55%" valign="top" class="ypd-stack ypd-stack-l" style="padding-right:20px;">
                  <p class="ypd-text-purple" style="color:${PURPLE};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Onze diensten</p>
                  <p class="ypd-text-soft" style="color:#555;font-size:12px;line-height:1.9;margin:0;">
                    Werving en Selectie<br>
                    Bemiddeling van Interim Professionals<br>
                    Interim HR Advies &amp; Recruiting
                  </p>
                </td>
                <td width="45%" valign="top" class="ypd-stack ypd-stack-r" style="padding-left:20px;border-left:1px solid #f0f0f0;">
                  <p class="ypd-text-purple" style="color:${PURPLE};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Contact</p>
                  <p class="ypd-text-soft" style="color:#555;font-size:12px;line-height:1.9;margin:0;">
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
          <td class="ypd-bg-soft ypd-pad-lg" bgcolor="#f8f7f9" style="background:#f8f7f9;border-top:1px solid #e8e4ec;padding:18px 40px 22px 40px;text-align:center;border-radius:0 0 16px 16px;">
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
