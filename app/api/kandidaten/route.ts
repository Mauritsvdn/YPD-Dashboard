import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Kandidaat } from "@/lib/types";

// Haal alle actieve kandidaten op (nog niet verstuurd)
export async function GET() {
  const { data, error } = await supabase
    .from("kandidaten")
    .select("*")
    .is("verstuurd_op", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const kandidaten: Kandidaat[] = (data ?? []).map((k) => ({
    id: k.id,
    neepnaam: k.neepnaam,
    regio: k.regio,
    beschikbaarheid: k.beschikbaarheid,
    salaris: k.salaris,
    type: k.type,
    functies: k.functies ?? [],
    werkervaring: k.werkervaring ?? [],
    opleidingen: k.opleidingen ?? [],
    bijzonderheden: k.bijzonderheden,
    categorie: k.categorie,
    pitchTekst: k.pitch_tekst,
  }));

  return NextResponse.json(kandidaten);
}

// Verwijder alle actieve kandidaten (die nu in de mailing staan).
// Reeds verstuurde/gearchiveerde kandidaten blijven ongemoeid.
export async function DELETE() {
  const { error } = await supabase
    .from("kandidaten")
    .delete()
    .is("verstuurd_op", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Voeg een nieuwe kandidaat toe
export async function POST(request: Request) {
  const kandidaat: Kandidaat = await request.json();

  const { error } = await supabase.from("kandidaten").insert({
    id: kandidaat.id,
    neepnaam: kandidaat.neepnaam,
    regio: kandidaat.regio,
    beschikbaarheid: kandidaat.beschikbaarheid,
    salaris: kandidaat.salaris,
    type: kandidaat.type,
    functies: kandidaat.functies,
    werkervaring: kandidaat.werkervaring,
    opleidingen: kandidaat.opleidingen,
    bijzonderheden: kandidaat.bijzonderheden,
    categorie: kandidaat.categorie,
    pitch_tekst: kandidaat.pitchTekst,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
