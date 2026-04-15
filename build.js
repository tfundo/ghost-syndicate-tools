#!/usr/bin/env node
'use strict';

/**
 * build.js — Ghost Syndicate Tools
 * Copia todos los assets a dist/ y ofusca los archivos JS.
 * Ejecutado por Cloudflare Pages en cada deploy.
 */

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs   = require('fs');
const path = require('path');

const SRC  = __dirname;           // web/
const DIST = path.join(SRC, 'dist');

// Archivos y carpetas a excluir del copy
const EXCLUDE = new Set(['node_modules', 'dist', 'build.js', 'package.json', 'package-lock.json', '.gitignore']);

// Archivos JS a ofuscar (rutas relativas a SRC)
const OBFUSCATE = ['assets/app.js', 'assets/comparador.js'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('Building Ghost Syndicate Tools...\n');

// 1. Limpiar dist/
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true, force: true });
}

// 2. Copiar todos los archivos
console.log('Copying files...');
copyDir(SRC, DIST);
console.log('  Done.\n');

// 3. Ofuscar archivos JS
console.log('Obfuscating JS...');
for (const relPath of OBFUSCATE) {
  const filePath = path.join(DIST, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP (not found): ${relPath}`);
    continue;
  }
  const code   = fs.readFileSync(filePath, 'utf8');
  const result = JavaScriptObfuscator.obfuscate(code, {
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
  });
  fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf8');
  const origKB = Math.round(code.length / 1024);
  const newKB  = Math.round(result.getObfuscatedCode().length / 1024);
  console.log(`  ${relPath}  (${origKB} KB → ${newKB} KB)`);
}

console.log('\nBuild complete → dist/');
