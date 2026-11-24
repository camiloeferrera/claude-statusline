#!/usr/bin/env node
// claude-statusline: modelo, proyecto, git, contexto y límites con barras en degradado.
// Lee el JSON que Claude Code manda por stdin. Corre con Node 18+ o Bun.
// Ajustes rápidos en CONFIG y en la paleta C.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const CONFIG = {
  icons: process.env.HUD_ICONS !== '0', // HUD_ICONS=0 si tu fuente no tiene Nerd Font
  barWidth: 16,                          // celdas por barra (se reduce en terminales angostas)
  paceMargin: 5,                         // puntos por encima del ritmo ideal para marcar ▲
};

// ── Paleta (truecolor) ────────────────────────────────────────────
const C = {
  model:  [217, 119, 87],   // naranja Claude
  project:[229, 192, 123],
  git:    [86, 182, 194],
  dirty:  [255, 203, 107],
  text:   [171, 178, 191],
  dim:    [92, 99, 112],
  track:  [55, 60, 70],
  ok:     [126, 198, 153],
  warn:   [255, 203, 107],
  bad:    [240, 113, 120],
  blue:   [130, 170, 255],
  violet: [199, 146, 234],
};
const fg = ([r, g, b]) => `\x1b[38;2;${r};${g};${b}m`;
const R = '\x1b[0m', B = '\x1b[1m';
const paint = (c, s) => `${fg(c)}${s}${R}`;
const I = CONFIG.icons
  ? { model: '󰚩', folder: '', branch: '', ctx: '󰍛', h5: '󱑂', d7: '󰃭', reset: '󰑓', up: '▲', sep: '' }
  : { model: '◆', folder: '▸', branch: '⎇', ctx: '◧', h5: '◷', d7: '▦', reset: '↺', up: '▲', sep: '·' };

// ── Utilidades ────────────────────────────────────────────────────
const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
// Degradado de 3 paradas según posición 0..1
function grad(stops, t) {
  t = Math.min(1, Math.max(0, t));
  const seg = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(seg));
  return lerp(stops[i], stops[i + 1], seg - i);
}
const CTX_STOPS = [C.ok, C.warn, C.bad];
const USE_STOPS = [C.blue, C.violet, C.bad];

// Barra de línea gruesa con resolución de media celda: ━ lleno, ╸ medio, ━ pista oscura
function bar(pct, width, stops) {
  const halves = Math.round((Math.min(100, Math.max(0, pct)) / 100) * width * 2);
  let out = '';
  for (let i = 0; i < width; i++) {
    const h = halves - i * 2;
    const col = grad(stops, width === 1 ? 0 : i / (width - 1));
    if (h >= 2) out += fg(col) + '━';
    else if (h === 1) out += fg(col) + '╸';
    else out += fg(C.track) + '━';
  }
  return out + R;
}
const levelColor = (pct, stops) => grad(stops, pct / 100);

function fmtTokens(n) {
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}
function fmtLeft(sec) {
  if (!(sec > 0)) return '';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  if (d) return h ? `${d}d ${h}h` : `${d}d`;
  if (h) return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
  return `${m}m`;
}
const visLen = (s) => [...s.replace(/\x1b\[[0-9;]*m/g, '')].length;

function git(cwd) {
  try {
    const out = execFileSync('git', ['-C', cwd, 'status', '--porcelain=v1', '--branch', '--untracked-files=normal'],
      { encoding: 'utf8', timeout: 800, stdio: ['ignore', 'pipe', 'ignore'] });
    const [head, ...rest] = out.split('\n');
    let branch = head.replace(/^## /, '').split('...')[0].replace(/^No commits yet on /, '');
    if (branch.startsWith('HEAD')) branch = 'detached';
    const ahead = /ahead (\d+)/.exec(head)?.[1], behind = /behind (\d+)/.exec(head)?.[1];
    return { branch, dirty: rest.filter(Boolean).length, ahead, behind };
  } catch { return null; }
}

// ── Entrada ───────────────────────────────────────────────────────
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let d = {};
try { d = JSON.parse(raw || '{}'); } catch {}

const cols = Math.max(40, (parseInt(process.env.COLUMNS ?? '', 10) || 120) - 4);
const width = cols < 70 ? 8 : cols < 100 ? 12 : CONFIG.barWidth;
const now = Date.now() / 1000;

// ── Línea 1: modelo · proyecto · git ──────────────────────────────
const modelName = (d.model?.display_name ?? 'Claude').replace(/^Claude\s+/, '').replace(/\s*\(.*\)$/, '');
const effort = d.effort?.level;
const effortDots = { low: '○', medium: '◐', high: '●', xhigh: '●●', max: '●●●' }[effort] ?? '';
const cwd = d.workspace?.current_dir ?? d.cwd ?? process.cwd();
const project = path.basename(d.workspace?.project_dir ?? cwd);
const sep = ` ${paint(C.dim, I.sep)} `;

const parts = [
  `${paint(C.model, I.model)} ${B}${paint(C.model, modelName)}` + (effortDots ? ` ${paint(C.dim, effortDots)}` : ''),
  `${paint(C.project, I.folder)} ${paint(C.project, project)}`,
];
const g = git(cwd);
if (g) {
  let s = `${paint(C.git, I.branch)} ${paint(C.git, g.branch)}`;
  if (g.dirty) s += paint(C.dirty, ` ●${g.dirty}`);
  if (g.ahead) s += paint(C.dim, ` ↑${g.ahead}`);
  if (g.behind) s += paint(C.dim, ` ↓${g.behind}`);
  parts.push(s);
}
const cost = d.cost?.total_cost_usd;
if (cost > 0) parts.push(paint(C.dim, `$${cost.toFixed(2)}`));
const lines = [parts.join(sep)];

// ── Contexto ──────────────────────────────────────────────────────
const cw = d.context_window ?? {};
const size = cw.context_window_size ?? 0;
const u = cw.current_usage ?? {};
let used = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
let ctxPct = cw.used_percentage;
if (!(ctxPct > 0) && size) ctxPct = (used / size) * 100;
if (!used && ctxPct > 0 && size) used = (ctxPct / 100) * size;
ctxPct = Math.round(ctxPct ?? 0);

const label = (icon, txt, w = 4) => `${paint(C.dim, icon)} ${paint(C.text, txt.padEnd(w))}`;
const pctTxt = (p, stops) => `${B}${paint(levelColor(p, stops), String(p).padStart(3) + '%')}`;

const ctxLine = `${label(I.ctx, 'ctx')} ${bar(ctxPct, width, CTX_STOPS)} ${pctTxt(ctxPct, CTX_STOPS)}` +
  (size ? paint(C.dim, `  ${fmtTokens(used)} / ${fmtTokens(size)}`) : '');

// ── Límites 5h / 7d ───────────────────────────────────────────────
function limit(icon, name, win, windowSec) {
  if (win?.used_percentage == null) return null;
  const p = Math.round(win.used_percentage);
  const left = win.resets_at ? win.resets_at - now : 0;
  let s = `${label(icon, name)} ${bar(p, width, USE_STOPS)} ${pctTxt(p, USE_STOPS)}`;
  if (left > 0) {
    const expected = ((windowSec - left) / windowSec) * 100;
    if (p > expected + CONFIG.paceMargin) s += ' ' + paint(C.bad, I.up);
    s += paint(C.dim, `  ${I.reset} ${fmtLeft(left)}`);
  }
  return s;
}
const rl = d.rate_limits ?? {};
const lim = [limit(I.h5, '5h', rl.five_hour, 5 * 3600), limit(I.d7, '7d', rl.seven_day, 7 * 86400)].filter(Boolean);

// Contexto en su línea; 5h y 7d lado a lado si caben, si no, uno debajo del otro.
lines.push(ctxLine);
const gap = '    ';
if (lim.length === 2 && visLen(lim[0]) + gap.length + visLen(lim[1]) <= cols) {
  lines.push(lim[0] + gap + lim[1]);
} else {
  lines.push(...lim);
}

process.stdout.write(lines.join('\n') + '\n');
