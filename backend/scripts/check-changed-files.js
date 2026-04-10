import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

const collectJsFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
};

const jsFiles = [
  ...collectJsFiles(path.join(backendDir, 'src')),
  ...collectJsFiles(path.join(backendDir, 'scripts')),
];

if (jsFiles.length === 0) {
  console.log('[check:backend] No backend .js files found.');
  process.exit(0);
}

for (const absolutePath of jsFiles) {
  const file = path.relative(backendDir, absolutePath).replace(/\\/g, '/');

  try {
    const source = fs.readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '');
    new vm.SourceTextModule(source, { identifier: absolutePath });
    console.log(`[check:backend] OK ${file}`);
  } catch (error) {
    console.error(`[check:backend] Syntax error in ${file}`);
    console.error(error.message);
    process.exit(1);
  }
}

console.log(`[check:backend] Checked ${jsFiles.length} backend file(s).`);
