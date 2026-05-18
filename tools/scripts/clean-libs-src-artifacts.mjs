#!/usr/bin/env node
/**
 * Elimina artefactos de compilación TypeScript que quedaron por error en libs (carpeta src).
 *
 * Es seguro: el fuente real son los .ts; el build oficial escribe en dist/libs.
 *
 * Uso:
 *   node tools/scripts/clean-libs-src-artifacts.mjs          # elimina
 *   node tools/scripts/clean-libs-src-artifacts.mjs --dry-run # solo lista
 *   node tools/scripts/clean-libs-src-artifacts.mjs --force   # también huérfanos sin .ts
 */

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const libsRoot = join(root, 'libs');

const ARTIFACT_SUFFIXES = ['.d.ts.map', '.js.map', '.d.ts', '.js'];
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

/** @param {string} filePath */
function matchingSourceTs(filePath) {
  for (const suffix of ARTIFACT_SUFFIXES) {
    if (filePath.endsWith(suffix)) {
      return `${filePath.slice(0, -suffix.length)}.ts`;
    }
  }
  return null;
}

/** @param {string} dir */
function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

/** @param {string} filePath */
function isArtifact(filePath) {
  return ARTIFACT_SUFFIXES.some((s) => filePath.endsWith(s));
}

function main() {
  if (!existsSync(libsRoot)) {
    console.error('No existe libs/ en la raíz del monorepo.');
    process.exit(1);
  }

  const candidates = walk(libsRoot).filter((f) => {
    const rel = relative(libsRoot, f);
    return rel.includes('/src/') && isArtifact(f);
  });

  let removed = 0;
  let skipped = 0;

  for (const file of candidates) {
    const sourceTs = matchingSourceTs(file);
    const hasSource = sourceTs && existsSync(sourceTs);

    if (!hasSource && !force) {
      skipped++;
      console.log(`[skip] ${relative(root, file)} (sin ${sourceTs ? relative(root, sourceTs) : '.ts'}; usa --force)`);
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${relative(root, file)}`);
    } else {
      rmSync(file, { force: true });
      console.log(`[removed] ${relative(root, file)}`);
    }
    removed++;
  }

  // dist legacy dentro de cada lib (libs/application/dist, etc.)
  for (const libName of readdirSync(libsRoot)) {
    const legacyDist = join(libsRoot, libName, 'dist');
    if (!existsSync(legacyDist)) continue;
    try {
      if (!statSync(legacyDist).isDirectory()) continue;
    } catch {
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] ${relative(root, legacyDist)}/`);
    } else {
      rmSync(legacyDist, { recursive: true, force: true });
      console.log(`[removed] ${relative(root, legacyDist)}/`);
    }
    removed++;
  }

  const mode = dryRun ? 'dry-run' : 'done';
  console.log(
    `\n${mode}: ${removed} eliminado(s), ${skipped} omitido(s). Regenerá con: npm run build:libs`
  );
}

main();
