import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Kandidaat } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const kandidaat: Kandidaat = await request.json();

  const { error } = await supabase
    .from("kandidaten")
    .update({
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
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase
    .from("kandidaten")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
