import { createHash } from "node:crypto";
import { generateMailchimpHtml } from "./email-template";
import type { Kandidaat } from "./types";

export const STANDAARD_BASE_URL = "https://ypd-dashboard.vercel.app";

/**
 * Gmail knipt berichten af boven ~102 KB HTML. Mailchimp herschrijft links nog naar
 * tracking-URL's en voegt een tracking-pixel toe (samen enkele KB), dus we houden ~6 KB marge aan.
 */
export const MAX_MAILING_BYTES = 96 * 1024;

export interface MailingInput {
  kandidaten: Kandidaat[];
  maandJaar?: string;
  mailingTitel?: string;
  introTekst?: string;
}

export interface Mailing {
  html: string;
  /** sha256 van de HTML, zodat test- en productieverzending vergelijkbaar zijn. */
  htmlHash: string;
  htmlBytes: number;
  maandJaar: string;
  mailingTitel: string;
  onderwerp: string;
}

/**
 * Eén bron voor de mailing-HTML. Zowel /api/test-mailchimp als /api/send-mailchimp
 * gebruiken deze functie, zodat de testmail exact dezelfde HTML krijgt als de echte mailing.
 */
export function bouwMailing(
  input: MailingInput,
  baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL || STANDAARD_BASE_URL
): Mailing {
  // Door de recruiter ingestelde maand/jaar; valt terug op de huidige maand.
  const maandJaarRuw =
    input.maandJaar?.trim() ||
    new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  // Maandnaam altijd met hoofdletter, bv. "Mei 2026".
  const maandJaar = maandJaarRuw.charAt(0).toUpperCase() + maandJaarRuw.slice(1);
  const mailingTitel =
    input.mailingTitel?.trim().replace(/[\r\n]+/g, " ") ||
    "Selectie Beschikbare Professionals";
  const introTekst = input.introTekst?.trim();

  const html = generateMailchimpHtml(
    input.kandidaten,
    baseUrl,
    maandJaar,
    mailingTitel,
    introTekst,
    true
  );

  return {
    html,
    htmlHash: createHash("sha256").update(html).digest("hex"),
    htmlBytes: Buffer.byteLength(html, "utf8"),
    maandJaar,
    mailingTitel,
    onderwerp: `${mailingTitel} ${maandJaar}`,
  };
}

/** Foutmelding als de mailing zo groot is dat Gmail hem zou afknippen, anders null. */
export function grootteWaarschuwing(mailing: Mailing): string | null {
  if (mailing.htmlBytes <= MAX_MAILING_BYTES) return null;
  const kb = (mailing.htmlBytes / 1024).toFixed(1);
  const max = Math.round(MAX_MAILING_BYTES / 1024);
  return `De mailing is ${kb} KB; boven ${max} KB knipt Gmail de mail af ("Bericht ingekort"). Verwijder enkele professionals of splits de mailing.`;
}
