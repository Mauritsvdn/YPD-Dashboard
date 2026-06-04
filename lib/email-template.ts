import { Kandidaat } from "./types";

const LOGO_URL = "https://ypd-dashboard.vercel.app/ypd-logo.png";
const PURPLE = "#7B3FA0";
const PINK = "#E8547A";
const GRADIENT = `linear-gradient(90deg, ${PURPLE}, ${PINK}, #E8823A, #F5A623)`;

/**
 * Houdt het scheidingsteken "|" in een categorienaam (bv. "Interim | Management | Directie")
 * bij het voorgaande woord met een non-breaking space, zodat het label niet midden in de
 * naam afbreekt met een losse "|" aan het begin van een regel.
 */
function formatCategorieLabel(cat: string): string {
  return cat.replace(/\s*\|\s*/g, "&nbsp;| ");
}

/** Formatteert het salarisbedrag. Puur getal → "€4.500,-", anders ongewijzigd (met € prefix). */
function formatSalaris(salaris: string | null | undefined): string {
  const trimmed = (salaris ?? "").trim();
  if (!trimmed) return "";
  if (/^\d+$/.test(trimmed)) {
    return `€${parseInt(trimmed, 10).toLocaleString("nl-NL")},-`;
  }
  return trimmed.startsWith("€") ? trimmed : `€${trimmed}`;
}

// ── Herbruikbare inline-style fragmenten (1× gedefinieerd → minder herhaling per kandidaat) ──
const BULLET_TD = `padding:2px 0;color:#444;font-size:13px;line-height:1.55;`;
const LABEL_P = `font-size:10px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1px;margin:0 0 7px 0;`;

/** Render een bullet-lijstje als tabelrijen. */
const bullets = (items: string[]): string =>
  items.map((i) => `<tr><td style="${BULLET_TD}">• ${i}</td></tr>`).join("");

/** Render een paars uppercase sectielabel. */
const label = (t: string): string =>
  `<p class="ypd-text-purple" style="${LABEL_P}">${t}</p>`;

/**
 * @param maandJaar  Door de recruiter ingestelde maand+jaar (bv. "juni 2026"), gebruikt in de
 *                   titel en hero-header. Valt terug op de huidige maand als niet meegegeven.
 */
export function generateMailchimpHtml(
  kandidaten: Kandidaat[],
  baseUrl: string,
  maandJaar?: string
): string {
  const maandJaarLabel =
    maandJaar?.trim() ||
    new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  const jaar = new Date().getFullYear();
  const categorieenInMailing = Array.from(new Set(kandidaten.map((k) => k.categorie)));

  // Nav links met telling per categorie
  const navLinks = categorieenInMailing
    .map((cat) => {
      const anchor = cat.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const count = kandidaten.filter((k) => k.categorie === cat).length;
      return `<a href="#${anchor}" style="color:${PURPLE};text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap;">${formatCategorieLabel(cat)}&nbsp;(${count})</a>`;
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

          // ── Hybrid/Fluid 2-koloms blok ──
          // Geen flexbox/grid en GEEN @media-afhankelijkheid: twee inline-block tabellen met
          // max-width zakken op smalle schermen (Gmail-app) vanzelf onder elkaar. MSO-conditionals
          // dwingen Outlook/desktop om ze náást elkaar te houden (58% / 42%).
          const linkerKolom =
            `<div class="ypd-col" style="display:inline-block;vertical-align:top;width:100%;max-width:340px;font-size:13px;">` +
              `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
              `<td class="ypd-col-l" style="padding:16px 12px 16px 24px;border-right:1px solid #f5f5f5;">` +
                label("Gewenste functie(s)") +
                `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">${bullets(k.functies)}</table>` +
                label("Relevante werkervaring") +
                `<table cellpadding="0" cellspacing="0" border="0">${bullets(k.werkervaring)}</table>` +
              `</td></tr></table>` +
            `</div>`;

          const rechterKolom =
            `<div class="ypd-col" style="display:inline-block;vertical-align:top;width:100%;max-width:250px;font-size:13px;">` +
              `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
              `<td class="ypd-col-r" style="padding:16px 24px 16px 12px;">` +
                label("Relevante opleidingen") +
                `<table cellpadding="0" cellspacing="0" border="0">${bullets(k.opleidingen)}</table>` +
              `</td></tr></table>` +
            `</div>`;

          const tweeKolommen =
            `<tr><td style="font-size:0;line-height:0;">` +
              `<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="58%" valign="top"><![endif]-->` +
              linkerKolom +
              `<!--[if mso]></td><td width="42%" valign="top"><![endif]-->` +
              rechterKolom +
              `<!--[if mso]></td></tr></table><![endif]-->` +
            `</td></tr>`;

          const bijzonderheden = k.bijzonderheden
            ? `<tr><td class="ypd-bg-tint-2" bgcolor="#faf8fc" style="padding:14px 24px;background:#faf8fc;border-top:1px solid #f0f0f0;">` +
                label("Bijzonderheden") +
                `<p class="ypd-text-body" style="font-size:13px;color:#444;line-height:1.7;margin:0;">${k.bijzonderheden}</p>` +
              `</td></tr>`
            : "";

          return (
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="ypd-card" bgcolor="#ffffff" style="margin:0 0 16px 0;background:#fff;border-radius:12px;border:1px solid #e4e4e4;">` +
              // Kandidaat header
              `<tr><td style="padding:18px 24px 14px 24px;border-bottom:1px solid #f0f0f0;">` +
                `<p class="ypd-text-dark" style="font-size:16px;font-weight:700;color:#1a1a1a;margin:0 0 5px 0;">${k.neepnaam}</p>` +
                `<p class="ypd-text-muted" style="font-size:13px;color:#777;margin:0;line-height:1.6;">` +
                  `${k.regio} ·&nbsp;${k.beschikbaarheid} ·&nbsp;<span class="ypd-text-purple" style="color:${PURPLE};font-weight:600;">${salarisDisplay}</span> <span style="color:#aaa;font-size:12px;">(${k.type})</span>` +
                `</p>` +
              `</td></tr>` +
              tweeKolommen +
              bijzonderheden +
              // CTA
              `<tr><td align="right" style="padding:14px 24px;border-top:1px solid #f0f0f0;">` +
                `<a href="${cvUrl}" style="display:inline-block;background:linear-gradient(90deg,${PURPLE},${PINK});color:#fff;text-decoration:none;padding:11px 24px;border-radius:20px;font-size:13px;font-weight:700;">Ik wil een CV ontvangen →</a>` +
              `</td></tr>` +
            `</table>`
          );
        })
        .join("");

      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" id="${anchor}" style="margin:28px 0 12px 0;"><tr>` +
          `<td style="padding:10px 18px;border-radius:8px;background:linear-gradient(90deg,#f1eafa,#fce8f0);">` +
            `<a name="${anchor}" style="display:block;text-decoration:none;font-size:1px;line-height:1px;color:transparent;">&nbsp;</a>` +
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
              `<td><p style="font-size:12px;font-weight:700;color:${PURPLE};text-transform:uppercase;letter-spacing:1.2px;margin:0;line-height:1.5;">${formatCategorieLabel(cat)}</p></td>` +
              `<td align="right"><p style="font-size:11px;color:#c4a0d8;margin:0;">${kands.length} kandidaat${kands.length !== 1 ? "en" : ""}</p></td>` +
            `</tr></table>` +
          `</td></tr></table>` +
          kandidaatCards +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:2px 0 16px 0;"><a href="#top" style="color:#ccc;font-size:11px;text-decoration:none;">↑ Terug naar boven</a></td></tr></table>`
      );
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>YPD – Selectie Beschikbare Kandidaten ${maandJaarLabel}</title><style>:root,html,body{color-scheme:light only;supported-color-schemes:light only}@media (prefers-color-scheme:dark){.ypd-bg-page{background-color:#eeecf0!important}.ypd-bg-white{background-color:#fff!important}.ypd-bg-grey{background-color:#f4f2f6!important}.ypd-bg-tint{background-color:#faf7fd!important}.ypd-bg-tint-2{background-color:#faf8fc!important}.ypd-bg-soft{background-color:#f8f7f9!important}.ypd-card{background-color:#fff!important}.ypd-text-dark{color:#1a1a1a!important}.ypd-text-body{color:#444!important}.ypd-text-muted{color:#777!important}.ypd-text-soft{color:#555!important}.ypd-text-purple{color:#7B3FA0!important}}[data-ogsc] .ypd-bg-page,[data-ogsb] .ypd-bg-page{background-color:#eeecf0!important}[data-ogsc] .ypd-bg-white,[data-ogsb] .ypd-bg-white{background-color:#fff!important}[data-ogsc] .ypd-bg-grey,[data-ogsb] .ypd-bg-grey{background-color:#f4f2f6!important}[data-ogsc] .ypd-bg-tint,[data-ogsb] .ypd-bg-tint{background-color:#faf7fd!important}[data-ogsc] .ypd-bg-tint-2,[data-ogsb] .ypd-bg-tint-2{background-color:#faf8fc!important}[data-ogsc] .ypd-bg-soft,[data-ogsb] .ypd-bg-soft{background-color:#f8f7f9!important}[data-ogsc] .ypd-card,[data-ogsb] .ypd-card{background-color:#fff!important}[data-ogsc] .ypd-text-dark{color:#1a1a1a!important}[data-ogsc] .ypd-text-body{color:#444!important}[data-ogsc] .ypd-text-muted{color:#777!important}[data-ogsc] .ypd-text-soft{color:#555!important}[data-ogsc] .ypd-text-purple{color:#7B3FA0!important}@media only screen and (max-width:600px){.ypd-outer{width:100%!important;max-width:100%!important}.ypd-body-pad{padding:16px 8px!important}.ypd-pad-lg{padding-left:20px!important;padding-right:20px!important}.ypd-pad-md{padding-left:14px!important;padding-right:14px!important}.ypd-hero-title{font-size:20px!important}.ypd-col-l{border-right:none!important}}</style></head><body class="ypd-bg-page" style="margin:0;padding:0;background:#eeecf0;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eeecf0" class="ypd-bg-page"><tr><td align="center" class="ypd-body-pad" style="padding:32px 16px;" id="top"><a name="top" style="display:block;text-decoration:none;font-size:1px;line-height:1px;color:transparent;">&nbsp;</a><table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" class="ypd-outer" style="max-width:640px;width:100%;"><tr><td class="ypd-bg-white ypd-pad-lg" bgcolor="#ffffff" style="background:#fff;border-radius:16px 16px 0 0;padding:26px 40px 22px 40px;text-align:center;"><img src="${LOGO_URL}" alt="YPD" height="46" style="display:block;margin:0 auto;"></td></tr><tr><td style="height:4px;line-height:4px;font-size:4px;background:${GRADIENT};">&nbsp;</td></tr><tr><td class="ypd-pad-lg" style="background:linear-gradient(135deg,#5e2880 0%,#c03d68 55%,#c86020 100%);padding:30px 40px;text-align:center;"><p class="ypd-hero-sub" style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px 0;">Yours Personeelsdiensten · Twente</p><p class="ypd-hero-title" style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px 0;">Selectie Beschikbare Kandidaten</p><p style="color:rgba(255,255,255,0.88);font-size:15px;font-weight:300;margin:0;">${maandJaarLabel}</p></td></tr><tr><td class="ypd-bg-white ypd-pad-lg" bgcolor="#ffffff" style="background:#fff;padding:22px 40px 20px 40px;"><p class="ypd-text-soft" style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px 0;">Een beknopte selectie van onlangs gesproken kandidaten deze maand. Klik op een categorie om direct naar de profielen te gaan:</p><p style="text-align:center;margin:0;line-height:2.4;border-top:1px solid #f5f5f5;padding-top:14px;">${navLinks}</p></td></tr><tr><td class="ypd-bg-grey ypd-pad-md" bgcolor="#f4f2f6" style="background:#f4f2f6;padding:4px 24px 24px 24px;">${categorieSections}</td></tr><tr><td class="ypd-bg-white ypd-pad-lg" bgcolor="#ffffff" style="background:#fff;padding:22px 40px 14px 40px;text-align:center;border-top:2px solid #eeecf0;"><p class="ypd-text-soft" style="color:#555;font-size:13px;line-height:1.7;margin:0 0 8px 0;">Dit is slechts een selectie van beschikbare kandidaten.<br>Voor andere interessante profielen kunt u ons uiteraard ook benaderen!</p><p style="color:#bbb;font-size:12px;font-style:italic;margin:0;">"In verband met privacy gebruiken wij hier fictieve namen."</p></td></tr><tr><td class="ypd-bg-tint ypd-pad-lg" bgcolor="#faf7fd" style="background:#faf7fd;padding:14px 40px;border-top:1px solid #ede4f8;border-bottom:1px solid #ede4f8;"><p class="ypd-text-soft" style="color:#555;font-size:12px;line-height:1.7;margin:0;text-align:center;">Voor professionals die we al in bemiddeling hebben, maar die we niet specifiek hebben geworven voor uw openstaande vacature, hanteren wij een wervingsfee van <strong class="ypd-text-purple" style="color:${PURPLE};">16% van het bruto jaarsalaris</strong> (op fulltime basis).</p></td></tr><tr><td class="ypd-bg-white ypd-pad-lg" bgcolor="#ffffff" style="background:#fff;padding:20px 40px 22px 40px;"><div style="font-size:0;line-height:0;"><!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="55%" valign="top"><![endif]--><div style="display:inline-block;vertical-align:top;width:100%;max-width:300px;font-size:12px;"><p class="ypd-text-purple" style="color:${PURPLE};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Onze diensten</p><p class="ypd-text-soft" style="color:#555;font-size:12px;line-height:1.9;margin:0;">Werving en Selectie<br>Bemiddeling van Interim Professionals<br>Interim HR Advies &amp; Recruiting</p></div><!--[if mso]></td><td width="45%" valign="top"><![endif]--><div style="display:inline-block;vertical-align:top;width:100%;max-width:240px;font-size:12px;"><p class="ypd-text-purple" style="color:${PURPLE};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Contact</p><p class="ypd-text-soft" style="color:#555;font-size:12px;line-height:1.9;margin:0;"><a href="tel:0888010200" style="color:#555;text-decoration:none;">Tel: 088-8010200</a><br>Visserijstraat 3-5<br>7514 BZ Enschede</p></div><!--[if mso]></td></tr></table><![endif]--></div></td></tr><tr><td class="ypd-bg-soft ypd-pad-lg" bgcolor="#f8f7f9" style="background:#f8f7f9;border-top:1px solid #e8e4ec;padding:18px 40px 22px 40px;text-align:center;border-radius:0 0 16px 16px;"><img src="${LOGO_URL}" alt="YPD" height="28" style="display:block;margin:0 auto 10px auto;"><p style="color:#bbb;font-size:11px;margin:0 0 3px 0;">Copyright &copy; ${jaar} Yours Personeelsdiensten, All rights reserved.</p><p style="color:#ccc;font-size:11px;margin:0 0 10px 0;">Visserijstraat 3-5 · 7514 BZ Enschede</p><p style="color:#bbb;font-size:11px;margin:0 0 6px 0;">U ontvangt deze e-mail omdat u bent aangemeld voor de YPD nieuwsbrief.</p><p style="margin:0 0 8px 0;"><a href="*|UNSUB|*" style="color:#aaa;font-size:11px;text-decoration:underline;">Uw gegevens aanpassen of uitschrijven uit de lijst</a></p><p style="color:#ddd;font-size:10px;margin:0;">Email Marketing Powered by Mailchimp</p></td></tr></table></td></tr></table></body></html>`;
}
