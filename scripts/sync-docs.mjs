import fs from 'node:fs';
import { css, bootCss } from '../src/ui.js';
import { featureJs } from '../src/features.js';

const file = new URL('../docs/index.html', import.meta.url);
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/<style>[\s\S]*?<\/style>/, `<style>${css}${bootCss}</style>`);
const start = html.indexOf("<script>(()=>{\n  const key='itsrecoil.preferences';");
if (start < 0) throw new Error('Feature script missing from Pages entry');
const end = html.indexOf('</script>', start);
if (end < 0) throw new Error('Feature script closing tag missing');
html = html.slice(0, start) + `<script>${featureJs}</script>` + html.slice(end + 9);
fs.writeFileSync(file, html);

