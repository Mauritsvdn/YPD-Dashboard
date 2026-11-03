// Minimale Node-loader voor de tests: lost het "@/..."-pad-alias en extensieloze
// TypeScript-imports op zoals Next.js dat doet, zodat de echte route-bestanden
// zonder build in Node kunnen draaien (Node ≥ 22.18 stript TypeScript-types zelf).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function metExtensie(bestand) {
  for (const kandidaat of [bestand, `${bestand}.ts`, `${bestand}.tsx`, path.join(bestand, "index.ts")]) {
    if (existsSync(kandidaat) && !kandidaat.endsWith(path.sep)) {
      if (kandidaat === bestand && !/\.[cm]?[jt]sx?$/.test(bestand)) continue;
      return kandidaat;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let bestand = null;
  if (specifier.startsWith("@/")) {
    bestand = metExtensie(path.join(root, specifier.slice(2)));
  } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parent = fileURLToPath(context.parentURL);
    if (parent.startsWith(root) && !parent.includes(`${path.sep}node_modules${path.sep}`)) {
      bestand = metExtensie(path.resolve(path.dirname(parent), specifier));
    }
  }
  if (bestand) {
    const url = pathToFileURL(bestand).href;
    return { url, format: bestand.endsWith(".ts") ? "module-typescript" : undefined, shortCircuit: true };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // Packages zonder "exports"-veld (zoals next/server) verwachten een expliciete .js-extensie in ESM.
    if (err?.code === "ERR_MODULE_NOT_FOUND" && !specifier.startsWith(".") && !path.extname(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw err;
  }
}
