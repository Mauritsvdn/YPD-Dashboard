import type { Kandidaat } from "./types";

const LOGO_URL = "https://ypd-dashboard.vercel.app/ypd-logo.png";
const PURPLE = "#7B3FA0";
const PINK = "#E8547A";
const GRADIENT = `linear-gradient(90deg, ${PURPLE}, ${PINK}, #E8823A, #F5A623)`;

// ── Effen fallback-kleuren voor ieder kleurverloop ─────────────────────────────────────
// Klassiek Outlook (Windows, Word-renderer) en sommige webmail negeren `linear-gradient`.
// Zonder fallback viel de hero-achtergrond weg en werd de witte titel onleesbaar (wit op wit).
// Daarom krijgt iedere gradient een `bgcolor`-attribuut én een `background-color` vóór de
// `background-image`, zodat clients zonder gradient-ondersteuning een gelijkende effen kleur tonen.
const HERO_GRADIENT = "linear-gradient(135deg,#5e2880 0%,#c03d68 55%,#c86020 100%)";
const HERO_BG = "#8f3272"; // gemiddelde tint van het hero-verloop; wit erop: contrast ≈ 7,6:1
const STRIP_BG = PINK;
const CAT_BAR_GRADIENT = "linear-gradient(90deg,#f1eafa,#fce8f0)";
const CAT_BAR_BG = "#f6e9f5";
const CTA_GRADIENT = `linear-gradient(90deg,${PURPLE},${PINK})`;
const CTA_BG = "#b14a8d"; // midden van paars → roze; wit erop: contrast ≈ 5,4:1

// ── Kleurverloop voor klassiek Outlook (Windows) ─────────────────────────────────────────
// De Word-renderer van Outlook kent geen CSS-gradients, wel VML. Binnen <!--[if gte mso 9]>
// tekenen we daarom hetzelfde huisstijlverloop als VML-vlak; alle andere clients slaan dit
// blok over en gebruiken de CSS-gradient. Kopbalk en kleurstrip komen één keer voor, dus dit
// kost slechts enkele honderden bytes. `colors` geeft de kleurstops van begin (0) tot eind (1).
// Mocht het verloop in Outlook gespiegeld verschijnen, pas dan alleen VML_ANGLE aan.
const VML_ANGLE = 90;
const HERO_VML_COLORS = "0 #5e2880;.55 #c03d68;1 #c86020";
const STRIP_VML_COLORS = `0 ${PURPLE};.33 ${PINK};.66 #E8823A;1 #F5A623`;
const vmlFill = (begin: string, eind: string, stops: string): string =>
  `<v:fill type="gradient" color="${begin}" color2="${eind}" colors="${stops}" angle="${VML_ANGLE}"/>`;

/** Inline stijl voor achtergrond: eerst effen kleur, daarna (optioneel ondersteund) het verloop. */
const bg = (kleur: string, gradient: string): string =>
  `background-color:${kleur};background-image:${gradient};`;

// Kritieke opmaak staat inline: Gmail met niet-Google-accounts (IMAP/Exchange) en sommige
// Outlook-varianten negeren de <style>-blok of de class-stijlen op links. Alleen elementen die
// weinig voorkomen (navigatie, categoriebalken, hero) krijgen volledige inline stijlen, zodat de
// mail ruim onder de Gmail-cliplimiet (102 KB) blijft.
const NAV_LINK_STYLE = `display:inline-block;color:${PURPLE};text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap;`;
const NAV_SEP = `<span class="y-nav-sep" style="color:#dddddd;margin:0 3px;">&nbsp;| </span>`;
const STANDAARD_MAILING_TITEL = "Selectie Beschikbare Professionals";
const STANDAARD_INTRO_TEKST =
  "Een beknopte selectie van onlangs gesproken professionals van de afgelopen maand. Klik op een categorie om direct naar de profielen te gaan:";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] ?? char
  );
}

/**
 * Houdt het scheidingsteken "|" in een categorienaam (bv. "Interim | Management | Directie")
 * bij het voorgaande woord met een non-breaking space, zodat het label niet midden in de
 * naam afbreekt met een losse "|" aan het begin van een regel.
 */
function formatCategorieLabel(cat: string): string {
  return cat.replace(/\s*\|\s*/g, "&nbsp;| ");
}

/**
 * Formatteert het salaris voor weergave.
 * - Jaarsalaris (K-notatie "85K", of een puur getal ≥ 12.000) → "€85K" (geen /maand).
 * - Maandsalaris (puur getal < 12.000) → "€4.500,- bruto/maand".
 * - Maandsalaris-range (bv. "3000 tot 3500 per maand") → "€3.000,- tot €3.500,- bruto/maand".
 * - Uurtarief / vrije tekst → ongewijzigd (met € prefix indien nog niet aanwezig).
 */
export function formatSalaris(salaris: string | null | undefined): string {
  const trimmed = (salaris ?? "").trim();
  if (!trimmed) return "";
  const kMatch = trimmed.match(/^€?\s*(\d+)\s*[kK]$/);
  if (kMatch) return `${kMatch[1]}K`;
  const rangeMatch = trimmed.match(
    /^€?\s*(\d{1,3}(?:[.\s]\d{3})*|\d+)\s*(?:-|–|tot|t\/m)\s*€?\s*(\d{1,3}(?:[.\s]\d{3})*|\d+)(?:\s*(?:bruto)?\s*(?:per|\/)\s*maand)?$/i
  );
  if (rangeMatch) {
    const van = parseInt(rangeMatch[1].replace(/[.\s]/g, ""), 10);
    const tot = parseInt(rangeMatch[2].replace(/[.\s]/g, ""), 10);
    if (van < 12000 && tot < 12000) {
      return `€${van.toLocaleString("nl-NL")},- tot €${tot.toLocaleString("nl-NL")},- bruto/maand`;
    }
  }
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    if (n >= 12000) return `${Math.round(n / 1000)}K`;
    return `€${n.toLocaleString("nl-NL")},- bruto/maand`;
  }
  // Tekstuele indicatie zonder bedrag (bv. "in overleg", "nader te bepalen")
  // → voorafgegaan door "Salaris" zodat het niet als los "In overleg" leest,
  // géén euroteken ervoor. Bv. "in overleg" → "Salaris in overleg".
  if (!/\d/.test(trimmed)) {
    return `Salaris ${trimmed.charAt(0).toLowerCase() + trimmed.slice(1)}`;
  }
  return trimmed.startsWith("€") ? trimmed : `€${trimmed}`;
}

/** Naam + leeftijd, bv. "Marcus - 36". Leeftijd is optioneel. */
function formatNaam(neepnaam: string, leeftijd?: string): string {
  const l = (leeftijd ?? "").trim();
  if (!l) return neepnaam;
  return `${neepnaam} - ${l}`;
}

// ── Herbruikbare stijlen als CSS-classes (1× in de <style> gedefinieerd → geen herhaalde inline
// styles per kandidaat, wat de mailgrootte fors verkleint zonder het uiterlijk te wijzigen).
// De desktop-waarden staan in de basisregels in de <style>; de mobiele media-query en dark-mode
// regels overschrijven ze net als voorheen met !important.

/** Render een bullet-lijstje als tabelrijen. */
const bullets = (items: string[]): string =>
  items.map((i) => `<div class="y-bul">• ${i}</div>`).join("");

/** Render een paars uppercase sectielabel. */
const label = (t: string): string =>
  `<p class="y-label">${t}</p>`;

function categorieAnchor(cat: string, index: number): string {
  const slug = cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `cat-${index + 1}-${slug || "categorie"}`;
}

/**
 * @param maandJaar  Door de recruiter ingestelde maand+jaar (bv. "juni 2026"), gebruikt in de
 *                   titel en hero-header. Valt terug op de huidige maand als niet meegegeven.
 */
export function generateMailchimpHtml(
  kandidaten: Kandidaat[],
  baseUrl: string,
  maandJaar?: string,
  mailingTitel?: string,
  introTekst?: string,
  gebruikArchiveNavigatie = false
): string {
  const maandJaarRuw =
    maandJaar?.trim() ||
    new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  // Maandnaam altijd met hoofdletter, bv. "Mei 2026".
  const maandJaarLabel = maandJaarRuw.charAt(0).toUpperCase() + maandJaarRuw.slice(1);
  const jaar = new Date().getFullYear();
  const mailingTitelLabel = mailingTitel?.trim() || STANDAARD_MAILING_TITEL;
  const mailingTitelHtml = escapeHtml(mailingTitelLabel);
  const introTekstLabel = introTekst?.trim() || STANDAARD_INTRO_TEKST;
  const introTekstHtml = escapeHtml(introTekstLabel).replace(/\r?\n/g, "<br>");
  const categorieenInMailing = Array.from(new Set(kandidaten.map((k) => k.categorie)));

  // Interne anchors werken niet betrouwbaar in mobiele mailclients (o.a. Gmail/iOS).
  // In echte Mailchimp-mails linken we daarom naar de browsercopy van dezelfde
  // campagne met een fragment. In de dashboard-preview blijven interne anchors staan.
  const anchorHref = (anchor: string) =>
    gebruikArchiveNavigatie ? `*|ARCHIVE|*#${anchor}` : `#${anchor}`;
  const archiveLinkAttrs = gebruikArchiveNavigatie ? ' target="_blank" rel="noopener"' : "";

  // Nav links met telling per categorie
  const navLinks = categorieenInMailing
    .map((cat, index) => {
      const anchor = categorieAnchor(cat, index);
      const count = kandidaten.filter((k) => k.categorie === cat).length;
      // Volledig inline: klassiek Outlook negeert class-stijlen op links en toont ze anders
      // blauw en onderstreept.
      return `<a href="${anchorHref(anchor)}" class="y-nav" style="${NAV_LINK_STYLE}"${archiveLinkAttrs}>${formatCategorieLabel(cat)}&nbsp;(${count})</a>`;
    })
    .join(NAV_SEP);

  const categorieSections = categorieenInMailing
    .map((cat, index) => {
      const anchor = categorieAnchor(cat, index);
      const kands = kandidaten.filter((k) => k.categorie === cat);

      const kandidaatCards = kands
        .map((k) => {
          const cvUrl = `${baseUrl}/cv-aanvragen?kandidaat=${encodeURIComponent(k.neepnaam)}&email=*|EMAIL|*`;
          const salarisDisplay = formatSalaris(k.salaris);

          // Eén presentatietabel per kandidaat houdt desktop en klassieke Outlook in twee kolommen:
          // de kolommen zijn gewone cellen van de kaarttabel (overige rijen met colspan="2"), dus
          // zonder geneste wrapper-tabel. Op mobiel stapelen de cellen via de media-query.
          const linkerKolom =
            label("Gewenste functie(s)") +
            `<div class="y-list-gap">${bullets(k.functies)}</div>` +
            label("Relevante werkervaring") +
            bullets(k.werkervaring);

          const rechterKolom =
            label("Relevante opleidingen") +
            bullets(k.opleidingen);

          const tweeKolommen =
            `<tr>` +
              `<td width="58%" valign="top" class="y-col-l">${linkerKolom}</td>` +
              `<td width="42%" valign="top" class="y-col-r">${rechterKolom}</td>` +
            `</tr>`;

          const bijzonderheden = k.bijzonderheden
            ? `<tr><td colspan="2" class="y-bijz" bgcolor="#faf8fc">` +
                label("Bijzonderheden") +
                `<p class="y-details">${k.bijzonderheden}</p>` +
              `</td></tr>`
            : "";

          return (
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="y-card" bgcolor="#ffffff">` +
              // Kandidaat header
              `<tr><td colspan="2" class="y-chead">` +
                `<p class="y-name">${formatNaam(k.neepnaam, k.leeftijd)}</p>` +
                // Normale spaties (geen &nbsp;) zodat deze metaregel op smalle schermen netjes
                // afbreekt i.p.v. de mail horizontaal op te rekken; · blijft aan het vorige woord vast.
                `<p class="y-meta">` +
                  `${k.regio}&nbsp;· ${k.beschikbaarheid}&nbsp;· <span class="y-salary">${salarisDisplay}</span> <span class="y-type">(${k.type})</span>` +
                `</p>` +
              `</td></tr>` +
              tweeKolommen +
              bijzonderheden +
              // CTA
              // De knopkleur staat op een tabelcel (bgcolor + effen fallback via de class), zodat ook
              // klassiek Outlook een gekleurde knop met witte tekst toont i.p.v. witte tekst op wit.
              `<tr><td colspan="2" align="right" class="y-cfoot">` +
                `<table align="right" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${CTA_BG}" class="y-cta-td">` +
                `<a href="${cvUrl}" class="y-cta" style="color:#fff!important;-webkit-text-fill-color:#fff!important;text-decoration:none!important;"><span style="color:#fff!important;-webkit-text-fill-color:#fff!important;">Ik wil een CV ontvangen →</span></a>` +
                `</td></tr></table>` +
              `</td></tr>` +
            `</table>`
          );
        })
        .join("");

      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="y-cat-head"><tr>` +
          `<td class="y-cat-bar" bgcolor="${CAT_BAR_BG}" style="background-color:${CAT_BAR_BG};">` +
            `<a id="${anchor}" name="${anchor}" class="y-anchor">&nbsp;</a>` +
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
              `<td><p class="y-cat-title" style="color:${PURPLE};font-size:12px;font-weight:700;margin:0;">${formatCategorieLabel(cat)}</p></td>` +
              `<td align="right"><p class="y-cat-count" style="color:#c4a0d8;margin:0;">${kands.length} ${kands.length !== 1 ? "kandidaten" : "kandidaat"}</p></td>` +
            `</tr></table>` +
          `</td></tr></table>` +
          kandidaatCards +
          `<p class="y-back" align="center"><a href="${anchorHref("top")}" class="y-back-link" style="color:#ccc;text-decoration:none;"${archiveLinkAttrs}>↑ Terug naar boven</a></p>`
      );
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="nl" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>YPD – ${mailingTitelHtml} ${maandJaarLabel}</title><style>:root,html,body{color-scheme:light only;supported-color-schemes:light only}@media (prefers-color-scheme:dark){.y-bijz{background-color:#faf8fc!important}.y-name{color:#1a1a1a!important}.y-meta{color:#777!important}.y-label,.y-salary{color:#7B3FA0!important}.y-bul,.y-details{color:#333!important}.y-bg-page{background-color:#eeecf0!important}.y-bg-white{background-color:#fff!important}.y-bg-grey{background-color:#f4f2f6!important}.y-bg-tint{background-color:#faf7fd!important}.y-bg-tint-2{background-color:#faf8fc!important}.y-bg-soft{background-color:#f8f7f9!important}.y-card{background-color:#fff!important}.y-hero{background-color:${HERO_BG}!important}.y-hero-title{color:#fff!important}.y-cta-td{background-color:${CTA_BG}!important}.y-text-dark{color:#1a1a1a!important}.y-text-body{color:#444!important}.y-text-muted{color:#777!important}.y-text-soft{color:#555!important}.y-text-purple{color:#7B3FA0!important}}[data-ogsc] .y-bijz,[data-ogsb] .y-bijz{background-color:#faf8fc!important}[data-ogsc] .y-name{color:#1a1a1a!important}[data-ogsc] .y-meta{color:#777!important}[data-ogsc] .y-label,[data-ogsc] .y-salary{color:#7B3FA0!important}[data-ogsc] .y-bul,[data-ogsc] .y-details{color:#333!important}[data-ogsc] .y-bg-page,[data-ogsb] .y-bg-page{background-color:#eeecf0!important}[data-ogsc] .y-bg-white,[data-ogsb] .y-bg-white{background-color:#fff!important}[data-ogsc] .y-bg-grey,[data-ogsb] .y-bg-grey{background-color:#f4f2f6!important}[data-ogsc] .y-bg-tint,[data-ogsb] .y-bg-tint{background-color:#faf7fd!important}[data-ogsc] .y-bg-tint-2,[data-ogsb] .y-bg-tint-2{background-color:#faf8fc!important}[data-ogsc] .y-bg-soft,[data-ogsb] .y-bg-soft{background-color:#f8f7f9!important}[data-ogsc] .y-card,[data-ogsb] .y-card{background-color:#fff!important}[data-ogsb] .y-hero{background-color:${HERO_BG}!important}[data-ogsc] .y-hero-title,[data-ogsc] .y-hero-sub,[data-ogsc] .y-cta span{color:#fff!important}[data-ogsb] .y-cta-td{background-color:${CTA_BG}!important}[data-ogsb] .y-cat-bar{background-color:${CAT_BAR_BG}!important}[data-ogsc] .y-text-dark{color:#1a1a1a!important}[data-ogsc] .y-text-body{color:#444!important}[data-ogsc] .y-text-muted{color:#777!important}[data-ogsc] .y-text-soft{color:#555!important}[data-ogsc] .y-text-purple{color:#7B3FA0!important}.y-anchor{display:block;height:1px;line-height:1px;font-size:1px;text-decoration:none;color:transparent}.y-nav{display:inline-block;color:#7B3FA0;text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap}.y-nav-sep{color:#ddd;margin:0 6px}.y-salary{color:#7B3FA0;font-weight:600}.y-type{color:#aaa;font-size:12px}.y-cat-bar{padding:10px 18px;border-radius:8px;background-image:${CAT_BAR_GRADIENT}}.y-cat-title{text-transform:uppercase;letter-spacing:1.2px;line-height:1.5}.y-cat-count{font-size:11px}.y-back{text-align:center;margin:2px 0 16px 0}.y-back-link{font-size:11px}.y-details{font-size:13px;color:#333;line-height:1.6;margin:0}.y-list-gap{margin:0 0 18px 0}.y-cat-head{margin:28px 0 12px 0}.y-card{margin:0 0 16px 0;background:#fff;border-radius:12px;border:1px solid #e4e4e4}.y-chead{padding:18px 24px 14px 24px;border-bottom:1px solid #f0f0f0}.y-name{font-size:16px;font-weight:700;color:#1a1a1a;margin:0 0 5px 0}.y-meta{font-size:13px;color:#777;margin:0;line-height:1.7}.y-col-l{padding:16px 12px 16px 24px;border-right:1px solid #f0eef2}.y-col-r{padding:16px 24px 16px 12px}.y-label{font-size:10px;font-weight:700;color:#7B3FA0;text-transform:uppercase;letter-spacing:1px;margin:0 0 9px 0;padding:0 0 5px 0;border-bottom:1px solid #ece0f5}.y-bul{padding:3px 0;color:#333;font-size:13px;line-height:1.6}.y-bijz{padding:16px 24px;background:#faf8fc;border-top:1px solid #f0f0f0}.y-cfoot{padding:14px 24px;border-top:1px solid #f0f0f0}.y-cta-td{border-radius:20px;${bg(CTA_BG, CTA_GRADIENT)}}.y-cta{display:inline-block;color:#fff!important;-webkit-text-fill-color:#fff!important;text-decoration:none!important;padding:11px 24px;border-radius:20px;font-size:13px;font-weight:700}@media only screen and (max-width:600px){.y-outer{width:100%!important;max-width:100%!important}.y-body-pad{padding:16px 8px!important}.y-pad-lg{padding-left:20px!important;padding-right:20px!important}.y-pad-md{padding-left:14px!important;padding-right:14px!important}.y-hero-title{font-size:20px!important}.y-col-l,.y-col-r{display:block!important;width:100%!important;box-sizing:border-box!important}.y-col-l{border-right:none!important;padding:16px 20px 6px 20px!important}.y-col-r{padding:6px 20px 18px 20px!important}.y-bijz{padding:18px 20px!important}.y-bul,.y-details{font-size:15px!important;line-height:1.7!important;padding:4px 0!important}.y-label{font-size:11px!important;margin-bottom:11px!important}}</style><!--[if mso]><style>.y-cta-td{padding:11px 24px}.y-cta{padding:0}</style><![endif]--></head><body class="y-bg-page" style="margin:0;padding:0;background:#eeecf0;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eeecf0" class="y-bg-page"><tr><td align="center" class="y-body-pad" style="padding:32px 16px;"><a id="top" name="top" class="y-anchor">&nbsp;</a><!--[if mso]><table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr><td><![endif]--><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="y-outer" style="width:100%;max-width:600px;margin:0 auto;"><tr><td class="y-bg-white y-pad-lg" bgcolor="#ffffff" style="background:#fff;border-radius:16px 16px 0 0;padding:26px 40px 22px 40px;text-align:center;"><img src="${LOGO_URL}" alt="YPD" height="46" style="display:block;margin:0 auto;"></td></tr><tr><td bgcolor="${STRIP_BG}" style="height:4px;line-height:4px;font-size:4px;${bg(STRIP_BG, GRADIENT)}"><!--[if gte mso 9]><v:rect fill="true" stroke="false" style="width:600px;height:4px;">${vmlFill(PURPLE, "#F5A623", STRIP_VML_COLORS)}</v:rect><![endif]--><!--[if !mso]><!-->&nbsp;<!--<![endif]--></td></tr><tr><td class="y-hero" bgcolor="${HERO_BG}" style="${bg(HERO_BG, HERO_GRADIENT)}"><!--[if gte mso 9]><v:rect fill="true" stroke="false" style="width:600px;">${vmlFill("#5e2880", "#c86020", HERO_VML_COLORS)}<v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0"><![endif]--><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="y-pad-lg" align="center" style="padding:30px 40px;text-align:center;"><p class="y-hero-title" style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 8px 0;">${mailingTitelHtml}</p><p class="y-hero-sub" style="color:#f1e3ec;color:rgba(255,255,255,0.88);font-size:15px;font-weight:300;margin:0;">${maandJaarLabel}</p></td></tr></table><!--[if gte mso 9]></v:textbox></v:rect><![endif]--></td></tr><tr><td class="y-bg-white y-pad-lg" bgcolor="#ffffff" style="background:#fff;padding:22px 40px 20px 40px;"><p class="y-text-soft" style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px 0;">${introTekstHtml}</p><p style="text-align:center;margin:0;line-height:2.4;border-top:1px solid #f5f5f5;padding-top:14px;">${navLinks}</p></td></tr><tr><td class="y-bg-grey y-pad-md" bgcolor="#f4f2f6" style="background:#f4f2f6;padding:4px 24px 24px 24px;">${categorieSections}</td></tr><tr><td class="y-bg-white y-pad-lg" bgcolor="#ffffff" style="background:#fff;padding:22px 40px 14px 40px;text-align:center;border-top:2px solid #eeecf0;"><p class="y-text-soft" style="color:#555;font-size:13px;line-height:1.7;margin:0 0 8px 0;">Dit is slechts een selectie van beschikbare professionals.<br>Voor andere interessante profielen kunt u ons uiteraard ook benaderen via <a href="mailto:info@ypd.nl" class="y-text-purple" style="color:${PURPLE};text-decoration:none;font-weight:600;">info@ypd.nl</a></p><p style="color:#bbb;font-size:12px;font-style:italic;margin:0;">"In verband met privacy gebruiken wij hier fictieve namen."</p></td></tr><tr><td class="y-bg-tint y-pad-lg" bgcolor="#faf7fd" style="background:#faf7fd;padding:14px 40px;border-top:1px solid #ede4f8;border-bottom:1px solid #ede4f8;"><p class="y-text-soft" style="color:#555;font-size:12px;line-height:1.7;margin:0;text-align:center;">Voor professionals die we al in bemiddeling hebben, maar die we niet specifiek hebben geworven voor uw openstaande vacature, hanteren wij een wervingsfee van <strong class="y-text-purple" style="color:${PURPLE};">16% van het bruto jaarsalaris</strong> (op fulltime basis).</p></td></tr><tr><td class="y-bg-white y-pad-lg" bgcolor="#ffffff" style="background:#fff;padding:20px 40px 22px 40px;"><div style="font-size:0;line-height:0;"><!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="55%" valign="top"><![endif]--><div style="display:inline-block;vertical-align:top;width:100%;max-width:300px;font-size:12px;"><p class="y-text-purple" style="color:${PURPLE};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Onze diensten</p><p class="y-text-soft" style="color:#555;font-size:12px;line-height:1.9;margin:0;">Werving en Selectie<br>Bemiddeling van Interim Professionals<br>Interim HR Advies &amp; Recruiting</p></div><!--[if mso]></td><td width="45%" valign="top"><![endif]--><div style="display:inline-block;vertical-align:top;width:100%;max-width:240px;font-size:12px;"><p class="y-text-purple" style="color:${PURPLE};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:20px 0 8px 0;">Contact</p><p class="y-text-soft" style="color:#555;font-size:12px;line-height:1.9;margin:0;"><a href="tel:0888010200" style="color:#555;text-decoration:none;">Tel: 088-8010200</a><br>Visserijstraat 3-5<br>7514 BZ Enschede</p></div><!--[if mso]></td></tr></table><![endif]--></div></td></tr><tr><td class="y-bg-soft y-pad-lg" bgcolor="#f8f7f9" style="background:#f8f7f9;border-top:1px solid #e8e4ec;padding:18px 40px 22px 40px;text-align:center;border-radius:0 0 16px 16px;"><img src="${LOGO_URL}" alt="YPD" height="28" style="display:block;margin:0 auto 10px auto;"><p style="color:#bbb;font-size:11px;margin:0 0 3px 0;">Copyright &copy; ${jaar} YPD B.V., All rights reserved.</p><p style="color:#ccc;font-size:11px;margin:0 0 10px 0;">Visserijstraat 3-5 · 7514 BZ Enschede</p><p style="color:#bbb;font-size:11px;margin:0 0 6px 0;">U ontvangt deze e-mail omdat u bent aangemeld voor de YPD nieuwsbrief.</p><p style="margin:0 0 8px 0;"><a href="*|UNSUB|*" style="color:#aaa;font-size:11px;text-decoration:underline;">Uw gegevens aanpassen of uitschrijven uit de lijst</a></p><p style="color:#ddd;font-size:10px;margin:0;">Email Marketing Powered by Mailchimp</p></td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
}
