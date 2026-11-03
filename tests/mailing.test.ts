// Regressietests voor de YPD-mailing. Draaien met: npm test
// Mailchimp en Supabase worden volledig gemockt: er gaat niets naar een echte lijst.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { generateMailchimpHtml } from "../lib/email-template";
import { bouwMailing, grootteWaarschuwing, MAX_MAILING_BYTES } from "../lib/mailing";
import { maakKandidaten } from "./fixtures";

const BASE = "https://ypd-dashboard.vercel.app";
const PURPLE = "#7B3FA0";

function mail(aantal = 12) {
  return generateMailchimpHtml(maakKandidaten(aantal), BASE, "november 2026", undefined, undefined, true);
}

/** Alle openingstags met een bepaalde class (exacte class-token). */
function tagsMetClass(html: string, cls: string): string[] {
  const re = new RegExp(`<[a-z]+[^>]*class="(?:[^"]* )?${cls}(?: [^"]*)?"[^>]*>`, "g");
  return html.match(re) ?? [];
}

function attr(tag: string, naam: string): string | undefined {
  return tag.match(new RegExp(`\\s${naam}="([^"]*)"`))?.[1];
}

describe("kleurverlopen hebben een effen fallback", () => {
  const html = mail();
  const body = html.slice(html.indexOf("<body"));
  const css = html.match(/<style>([\s\S]*?)<\/style>/)![1];

  test("geen `background:` shorthand met gradient (Outlook negeert dan de hele declaratie)", () => {
    assert.doesNotMatch(html, /background\s*:\s*linear-gradient/);
  });

  test("ieder element met een inline gradient heeft bgcolor én background-color vóór de gradient", () => {
    const tags = body.match(/<[a-z]+[^>]*linear-gradient[^>]*>/g) ?? [];
    assert.ok(tags.length >= 2, "verwacht minstens kleurstrip en hero");
    for (const tag of tags) {
      assert.ok(attr(tag, "bgcolor"), `bgcolor ontbreekt: ${tag}`);
      const style = attr(tag, "style")!;
      const kleur = style.indexOf("background-color:");
      assert.ok(kleur >= 0 && kleur < style.indexOf("linear-gradient"), `geen fallback vóór gradient: ${tag}`);
    }
  });

  test("ieder element waarvan een class een gradient zet, heeft een bgcolor-fallback", () => {
    const classes = [...css.matchAll(/\.([a-z0-9-]+)\{[^}]*linear-gradient/g)].map((m) => m[1]);
    assert.ok(classes.length >= 2, "verwacht gradient-classes voor categoriebalk en CTA");
    for (const cls of classes) {
      const tags = tagsMetClass(body, cls);
      assert.ok(tags.length > 0, `class ${cls} wordt niet gebruikt`);
      for (const tag of tags) assert.ok(attr(tag, "bgcolor"), `bgcolor ontbreekt op .${cls}: ${tag}`);
    }
  });

  test("klassiek Outlook krijgt het huisstijlverloop als VML in kopbalk en kleurstrip", () => {
    assert.match(html, /<html[^>]*xmlns:v="urn:schemas-microsoft-com:vml"/);
    const vml = html.match(/<!--\[if gte mso 9\]><v:rect[\s\S]*?<!\[endif\]-->/g) ?? [];
    assert.equal(vml.length, 2, "verwacht VML voor kleurstrip en kopbalk");
    for (const blok of vml) assert.match(blok, /<v:fill type="gradient" color="#[0-9a-fA-F]{6}" color2="#[0-9a-fA-F]{6}" colors="0 #/);
    assert.match(html, /colors="0 #5e2880;\.55 #c03d68;1 #c86020"/);
    // Ieder geopend VML-vlak wordt ook weer gesloten, buiten zicht van andere clients.
    assert.equal((html.match(/<v:rect /g) ?? []).length, (html.match(/<\/v:rect>/g) ?? []).length);
    assert.equal((html.match(/<v:textbox /g) ?? []).length, (html.match(/<\/v:textbox>/g) ?? []).length);
    assert.equal((html.match(/<!--\[if/g) ?? []).length, (html.match(/<!\[endif\]-->/g) ?? []).length);
    // Buiten de MSO-conditionals staat geen VML (Gmail e.d. zien het nooit).
    const zonderMso = html.replace(/<!--\[if gte mso 9\]>[\s\S]*?<!\[endif\]-->/g, "");
    assert.doesNotMatch(zonderMso, /<\/?v:/);
  });

  test("hero: effen paarse achtergrond en inline witte titel", () => {
    const [hero] = tagsMetClass(body, "y-hero");
    assert.ok(hero, "hero-cel ontbreekt");
    assert.match(attr(hero, "bgcolor")!, /^#[0-9a-f]{6}$/i);
    assert.notEqual(attr(hero, "bgcolor")!.toLowerCase(), "#ffffff");
    const [titel] = tagsMetClass(body, "y-hero-title");
    assert.match(attr(titel, "style")!, /color:#ffffff/);
  });
});

describe("kritieke opmaak staat inline", () => {
  const kandidaten = maakKandidaten(12);
  const html = generateMailchimpHtml(kandidaten, BASE, "november 2026", undefined, undefined, true);
  const body = html.slice(html.indexOf("<body"));
  const categorieen = new Set(kandidaten.map((k) => k.categorie));

  test("navigatielinks: inline kleur, geen onderstreping, vaste fontgrootte", () => {
    const links = tagsMetClass(body, "y-nav");
    assert.equal(links.length, categorieen.size);
    for (const link of links) {
      const style = attr(link, "style") ?? "";
      assert.match(style, new RegExp(`color:${PURPLE}`), link);
      assert.match(style, /text-decoration:none/, link);
      assert.match(style, /font-size:13px/, link);
      assert.match(style, /font-weight:600/, link);
    }
  });

  test("navigatie-scheidingsteken heeft inline kleur en een breekbare spatie", () => {
    const seps = body.match(/<span class="y-nav-sep"[^>]*>[^<]*<\/span>/g) ?? [];
    assert.equal(seps.length, categorieen.size - 1);
    for (const sep of seps) {
      assert.match(sep, /style="color:#dddddd/);
      assert.match(sep, /&nbsp;\| <\/span>$/);
    }
  });

  test("navigatie verwijst in de echte mail naar de browserversie, in de preview naar interne anchors", () => {
    assert.ok(tagsMetClass(body, "y-nav").every((l) => attr(l, "href")!.startsWith("*|ARCHIVE|*#cat-")));
    const preview = generateMailchimpHtml(kandidaten, BASE, "november 2026");
    assert.ok(tagsMetClass(preview, "y-nav").every((l) => attr(l, "href")!.startsWith("#cat-")));
    // Iedere anchor uit de navigatie bestaat ook echt.
    for (const l of tagsMetClass(preview, "y-nav")) {
      const id = attr(l, "href")!.slice(1);
      assert.match(preview, new RegExp(`id="${id}"`));
    }
  });

  test("categoriebalken: effen achtergrond en titelkleur inline", () => {
    const bars = tagsMetClass(body, "y-cat-bar");
    assert.equal(bars.length, categorieen.size);
    for (const bar of bars) assert.match(attr(bar, "style")!, /background-color:#/);
    for (const t of tagsMetClass(body, "y-cat-title")) assert.match(attr(t, "style")!, new RegExp(`color:${PURPLE}`));
  });

  test("CTA: gekleurde cel met bgcolor en inline witte tekst voor iedere kandidaat", () => {
    const cellen = tagsMetClass(body, "y-cta-td");
    const links = tagsMetClass(body, "y-cta");
    assert.equal(cellen.length, kandidaten.length);
    assert.equal(links.length, kandidaten.length);
    for (const link of links) assert.match(attr(link, "style")!, /color:#fff!important/);
  });

  test("klassiek Outlook krijgt de knop-padding op de cel via een MSO-conditional", () => {
    assert.match(html, /<!--\[if mso\]><style>\.y-cta-td\{padding:11px 24px\}/);
  });
});

describe("Gmail-clipping (102 KB)", () => {
  test("ruime mailing van 40 kandidaten blijft onder de veilige limiet", () => {
    const m = bouwMailing({ kandidaten: maakKandidaten(40), maandJaar: "november 2026" }, BASE);
    assert.ok(m.htmlBytes < MAX_MAILING_BYTES, `${m.htmlBytes} bytes`);
    assert.equal(grootteWaarschuwing(m), null);
  });

  test("per kandidaat niet groter dan vóór de Outlook-fix (≈1,9 KB in deze fixture)", () => {
    const a = bouwMailing({ kandidaten: maakKandidaten(16), maandJaar: "x" }, BASE).htmlBytes;
    const b = bouwMailing({ kandidaten: maakKandidaten(32), maandJaar: "x" }, BASE).htmlBytes;
    const perKandidaat = (b - a) / 16;
    assert.ok(perKandidaat < 1920, `${perKandidaat.toFixed(0)} bytes per kandidaat`);
  });

  test("te grote mailing geeft een waarschuwing", () => {
    const m = bouwMailing({ kandidaten: maakKandidaten(80), maandJaar: "november 2026" }, BASE);
    assert.ok(m.htmlBytes > MAX_MAILING_BYTES);
    assert.match(grootteWaarschuwing(m)!, /knipt Gmail/);
  });
});

describe("testmail en productiemail gebruiken identieke HTML", () => {
  type Call = { url: string; method: string; body?: unknown };
  let calls: Call[] = [];
  const echteFetch = globalThis.fetch;
  const env = { ...process.env };

  beforeEach(() => {
    calls = [];
    Object.assign(process.env, {
      MAILCHIMP_API_KEY: "test-key-us1",
      MAILCHIMP_SERVER_PREFIX: "us1",
      MAILCHIMP_AUDIENCE_ID: "audience-test",
      NEXT_PUBLIC_BASE_URL: BASE,
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "test",
    });
    // Mock: niets verlaat dit proces. Iedere Mailchimp/Supabase-aanroep wordt alleen vastgelegd.
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? "GET";
      let body: unknown = init?.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { /* laat als tekst */ }
      }
      calls.push({ url, method, body });
      const json = url.endsWith("/campaigns") && method === "POST" ? { id: "camp-123" } : url.includes("/campaigns?") ? { campaigns: [] } : [];
      return new Response(JSON.stringify(json), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = echteFetch;
    process.env = { ...env };
  });

  const payload = {
    kandidaten: maakKandidaten(9),
    maandJaar: "november 2026",
    mailingTitel: "  Selectie Beschikbare Professionals\n",
    introTekst: "Regel één\nRegel twee",
  };

  async function contentVan(route: string, extra: Record<string, unknown> = {}) {
    const { POST } = await import(route);
    const res: Response = await POST(
      new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ ...payload, ...extra }) })
    );
    const data = await res.json();
    assert.equal(res.status, 200, JSON.stringify(data));
    const put = calls.find((c) => c.method === "PUT" && c.url.endsWith("/campaigns/camp-123/content"));
    assert.ok(put, "content-PUT ontbreekt");
    return { html: (put.body as { html: string }).html, data, calls: [...calls] };
  }

  test("beide routes zetten exact dezelfde HTML in de Mailchimp-campagne", async () => {
    const test_ = await contentVan("../app/api/test-mailchimp/route", { testEmail: "test@example.invalid" });
    const prod = await contentVan("../app/api/send-mailchimp/route");

    assert.equal(test_.html, prod.html);
    assert.equal(test_.data.htmlHash, prod.data.htmlHash);
    assert.equal(test_.html, bouwMailing(payload).html);

    // De testroute verstuurt alleen een test naar het opgegeven adres, nooit de campagne zelf.
    assert.ok(!test_.calls.some((c) => c.url.endsWith("/actions/send")));
    const testSend = test_.calls.find((c) => c.url.endsWith("/actions/test"));
    assert.deepEqual((testSend!.body as { test_emails: string[] }).test_emails, ["test@example.invalid"]);
    // Alle aanroepen gingen naar de mock (us1 test-server / ongeldig Supabase-domein).
    for (const c of [...test_.calls, ...prod.calls]) assert.match(c.url, /^https:\/\/(us1\.api\.mailchimp\.com|supabase\.invalid)\//);
  });

  test("productieroute weigert een mailing die Gmail zou afknippen (en maakt geen campagne aan)", async () => {
    const { POST } = await import("../app/api/send-mailchimp/route");
    const res: Response = await POST(
      new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ ...payload, kandidaten: maakKandidaten(80) }) })
    );
    assert.equal(res.status, 413);
    assert.equal(calls.length, 0);
  });
});
