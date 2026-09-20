// Prints environment KEY NAMES and availability only, never values.
import { readFileSync } from 'node:fs';
for (const file of process.argv.slice(2)) {
  console.log(file);
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match || /^(VERCEL|TURBO|NX_)/.test(match[1])) continue;
    const value = match[2].replace(/^["']|["']$/g, '');
    console.log(`${match[1]}: ${value.includes('[SENSITIVE]') ? 'REDACTED' : value ? 'available' : 'empty'}`);
  }
}
