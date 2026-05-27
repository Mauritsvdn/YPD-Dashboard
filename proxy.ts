import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Bouw response op zodat Supabase Auth cookies kan lezen én schrijven
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Zet cookies zowel op request als response (Supabase vereiste)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Haal gebruiker op (vernieuwt sessie indien verlopen)
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Publieke routes — altijd doorlaten
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/cv-request")
  ) {
    return response;
  }

  // Beveiligde routes — redirect naar login als niet ingelogd
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  // Match alles behalve statische bestanden en Next.js internals
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon\\.png|.*\\.svg$).*)",
  ],
};
