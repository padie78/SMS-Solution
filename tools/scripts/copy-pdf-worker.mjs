import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const destDir = join(root, 'apps/sustainability-web/src/assets/pdfjs');
const dest = join(destDir, 'pdf.worker.min.mjs');

try {
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
} catch {
  // pdfjs-dist may not be installed yet on first pass
}
