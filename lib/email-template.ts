import { Kandidaat } from "./types";

export function generateMailchimpHtml(kandidaten: Kandidaat[], baseUrl: string): string {
  const maandJaar = new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

  const categorieenInMailing = Array.from(new Set(kandidaten.map((k) => k.categorie)));

  const navLinks = categorieenInMailing
    .map((cat) => {
      const anchor = cat.toLowerCase().replace(/[^a-z0-9]/g, "-");
      return `<a href="#${anchor}" style="color:#7B3FA0;text-decoration:none;margin:0 8px;font-size:13px;font-weight:600;">${cat}</a>`;
    })
    .join(" &bull; ");

  const categorieSections = categorieenInMailing
    .map((cat) => {
      const anchor = cat.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const kands = kandidaten.filter((k) => k.categorie === cat);

      const kandidaatCards = kands
        .map((k) => {
          const cvUrl = `${baseUrl}/api/cv-request?kandidaat=${encodeURIComponent(k.neepnaam)}&email=*|EMAIL|*`;
          const werkervaringBullets = k.werkervaring
            .map((w) => `<li style="margin:4px 0;color:#444;">${w}</li>`)
            .join("");
          const opleidingenBullets = k.opleidingen
            .map((o) => `<li style="margin:4px 0;color:#444;">${o}</li>`)
            .join("");
          const functiesBullets = k.functies
            .map((f) => `<li style="margin:4px 0;color:#444;">${f}</li>`)
            .join("");

          return `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;">
                <p style="font-weight:700;font-size:15px;color:#222;margin:0 0 12px 0;">
                  ${k.neepnaam} – ${k.regio} – beschikbaar ${k.beschikbaarheid} – Huidig Salaris: €${k.salaris},- bruto per maand (${k.type})
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" valign="top" style="padding-right:12px;">
                      <p style="font-weight:700;color:#7B3FA0;font-size:13px;margin:0 0 4px 0;">GEWENSTE FUNCTIE(S)</p>
                      <ul style="margin:0;padding-left:16px;">${functiesBullets}</ul>
                      <p style="font-weight:700;color:#7B3FA0;font-size:13px;margin:12px 0 4px 0;">RELEVANTE WERKERVARING</p>
                      <ul style="margin:0;padding-left:16px;">${werkervaringBullets}</ul>
                    </td>
                    <td width="50%" valign="top" style="padding-left:12px;">
                      <p style="font-weight:700;color:#7B3FA0;font-size:13px;margin:0 0 4px 0;">RELEVANTE OPLEIDINGEN</p>
                      <ul style="margin:0;padding-left:16px;">${opleidingenBullets}</ul>
                      <p style="font-weight:700;color:#7B3FA0;font-size:13px;margin:12px 0 4px 0;">BIJZONDERHEDEN</p>
                      <p style="color:#444;font-size:13px;margin:0;">${k.bijzonderheden}</p>
                    </td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                  <tr>
                    <td align="right">
                      <a href="${cvUrl}" style="background:linear-gradient(90deg,#E8547A,#9B59B6);color:#fff;text-decoration:none;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;display:inline-block;">
                        Ik wil een cv ontvangen
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>`;
        })
        .join("");

      return `
      <table width="100%" cellpadding="0" cellspacing="0" id="${anchor}" style="margin:32px 0 0 0;">
        <tr>
          <td style="background:linear-gradient(90deg,#E8547A,#9B59B6);padding:14px 24px;border-radius:10px;">
            <span style="color:#fff;font-weight:700;font-size:16px;text-transform:uppercase;letter-spacing:1px;">${cat}</span>
          </td>
        </tr>
      </table>
      ${kandidaatCards}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        <tr>
          <td align="center">
            <a href="#top" style="color:#7B3FA0;font-size:12px;text-decoration:none;">↑ Terug naar boven</a>
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
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;" id="top">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#7B3FA0 0%,#E8823A 60%,#F5A623 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <img src="https://ypd.nl/wp-content/uploads/2025/05/ypd.svg" alt="YPD" height="48" style="margin-bottom:16px;filter:brightness(0) invert(1);" />
              <p style="color:#fff;font-size:24px;font-weight:700;margin:0;letter-spacing:2px;">BESCHIKBARE PROFESSIONALS</p>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0 0;">${maandJaar}</p>
            </td>
          </tr>

          <!-- INTRO -->
          <tr>
            <td style="background:#fff;padding:24px 40px;">
              <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px 0;">
                Een beknopte selectie van onlangs gesproken kandidaten deze maand. Klik op een categorie om direct naar het gewenste profiel te gaan:
              </p>
              <p style="text-align:center;margin:0;">${navLinks}</p>
            </td>
          </tr>

          <!-- KANDIDATEN PER CATEGORIE -->
          <tr>
            <td style="background:#f9f9f9;padding:8px 40px 32px 40px;">
              ${categorieSections}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:linear-gradient(135deg,#7B3FA0 0%,#E8823A 60%,#F5A623 100%);border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
              <img src="https://ypd.nl/wp-content/uploads/2025/05/ypd.svg" alt="YPD" height="32" style="margin-bottom:12px;filter:brightness(0) invert(1);" />
              <p style="color:rgba(255,255,255,0.9);font-size:12px;margin:4px 0;">Visserijstraat 3-5, Enschede &bull; 088 80 10 200 &bull; info@ypd.nl</p>
              <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:8px 0 0 0;">
                U ontvangt deze e-mail omdat u bent aangemeld voor de YPD nieuwsbrief.<br>
                <a href="*|UNSUB|*" style="color:rgba(255,255,255,0.7);">Uitschrijven</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
