export interface Kandidaat {
  id: string;
  neepnaam: string;
  leeftijd?: string;
  regio: string;
  beschikbaarheid: string;
  salaris: string;
  type: string;
  functies: string[];
  werkervaring: string[];
  opleidingen: string[];
  bijzonderheden: string;
  categorie: string;
  pitchTekst: string;
}

export interface CvRequest {
  id: string;
  kandidaat_naam: string;
  aanvrager_email: string;
  telefoonnummer: string | null;
  bedrijf_naam: string | null;
  created_at: string;
}

export const CATEGORIEEN = [
  "Finance, Interim | Management | Directie",
  "Techniek",
  "HRM",
  "Sales | Operations",
  "Supply Chain | Inkoop",
  "IT & Tech",
  "Marketing",
  "Administratief | Secretarieel",
  "Overig",
] as const;

export type Categorie = typeof CATEGORIEEN[number];
