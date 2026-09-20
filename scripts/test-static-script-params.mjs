import assert from 'node:assert/strict';
import { staticScriptParams } from '../src/lib/staticScriptParams.js';
const scripts = [{name:'塑料溫室'}, {name:'聲聲慢2:此生不換'}, {name:'舊名稱',slug:'stable-slug'}];
assert.deepEqual(staticScriptParams(scripts,'win32'), [{name:'塑料溫室'},{name:'stable-slug'}]);
assert.deepEqual(staticScriptParams(scripts,'linux'), [{name:'塑料溫室'},{name:'聲聲慢2:此生不換'},{name:'stable-slug'}]);
console.log('PASS Windows prerender excludes filesystem-unsafe names without changing URL keys; Linux unchanged');
