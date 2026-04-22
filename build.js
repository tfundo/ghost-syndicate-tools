#!/usr/bin/env node
'use strict';

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs   = require('fs');
const path = require('path');

const SRC  = __dirname;
const DIST = path.join(SRC, 'dist');

const EXCLUDE = new Set(['node_modules', 'dist', 'build.js', 'package.json', 'package-lock.json', '.gitignore']);

const OBFUSCATE = [
  'assets/app.js',
  'assets/comparador.js',
  'assets/mining.js',
  'assets/missions.js',
  'assets/i18n.js',
  'assets/trading.js',
  'assets/market.js',
  'assets/auth.js',
];

const OBFUSCATE_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 12,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false,
  target: 'browser',
};

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function minifyJson(jsonStr) {
  try {
    return JSON.stringify(JSON.parse(jsonStr));
  } catch {
    return jsonStr;
  }
}

console.log('Building...\n');

// 1. Limpiar dist/
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });

// 2. Copiar archivos
copyDir(SRC, DIST);

// 3. Strip comentarios HTML del index
const htmlPath = path.join(DIST, 'index.html');
if (fs.existsSync(htmlPath)) {
  const stripped = stripHtmlComments(fs.readFileSync(htmlPath, 'utf8'));
  fs.writeFileSync(htmlPath, stripped, 'utf8');
}

// 4. Minificar JSON
const dataDir = path.join(DIST, 'data');
if (fs.existsSync(dataDir)) {
  for (const f of fs.readdirSync(dataDir)) {
    if (!f.endsWith('.json')) continue;
    const fp = path.join(dataDir, f);
    const minified = minifyJson(fs.readFileSync(fp, 'utf8'));
    fs.writeFileSync(fp, minified, 'utf8');
    const kb = Math.round(minified.length / 1024);
    console.log(`  Minified: data/${f} (${kb} KB)`);
  }
}

// 5. Ofuscar JS
console.log('\nObfuscating JS...');
for (const relPath of OBFUSCATE) {
  const filePath = path.join(DIST, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP: ${relPath}`);
    continue;
  }
  const code   = fs.readFileSync(filePath, 'utf8');
  const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATE_OPTIONS);
  fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf8');
  const origKB = Math.round(code.length / 1024);
  const newKB  = Math.round(result.getObfuscatedCode().length / 1024);
  console.log(`  ${relPath}  (${origKB} KB → ${newKB} KB)`);
}

console.log('\nDone.');
