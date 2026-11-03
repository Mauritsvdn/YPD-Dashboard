import type { Kandidaat } from "../lib/types";

const CATEGORIEEN = [
  "Finance, Interim | Management | Directie",
  "Techniek",
  "HRM",
  "Sales | Operations",
  "Supply Chain | Inkoop",
  "IT & Tech",
  "Marketing",
  "Administratief | Secretarieel",
];

/** Realistische (eerder ruime) kandidaatprofielen voor grootte- en opmaaktests. */
export function maakKandidaten(aantal: number): Kandidaat[] {
  return Array.from({ length: aantal }, (_, i) => ({
    id: `k-${i}`,
    neepnaam: `Kandidaat${i}`,
    leeftijd: String(25 + (i % 30)),
    regio: "Regio Enschede / Hengelo",
    beschikbaarheid: "Per direct beschikbaar",
    salaris: i % 3 ? "4500" : "85K",
    type: i % 2 ? "Vast" : "Interim",
    functies: ["Senior Financial Controller", "Business Controller", "Manager Finance"],
    werkervaring: [
      "8 jaar ervaring als controller bij een internationale productieorganisatie",
      "Verantwoordelijk voor maand- en jaarafsluitingen, budgettering en forecasting",
      "Implementatie van een nieuw ERP-systeem (SAP S/4HANA)",
      "Aansturing van een team van vijf medewerkers",
    ],
    opleidingen: ["Master Accountancy – Universiteit Twente", "RC-opleiding – VU Amsterdam"],
    bijzonderheden:
      i % 2
        ? "Zoekt een functie met doorgroeimogelijkheden; bereid tot 45 minuten reistijd en 32-40 uur per week."
        : "",
    categorie: CATEGORIEEN[i % CATEGORIEEN.length],
    pitchTekst: "",
  }));
}
