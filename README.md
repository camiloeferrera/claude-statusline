# claude-statusline

Statusline para [Claude Code](https://code.claude.com) con barras en degradado para el
contexto y los límites de uso. Un solo archivo, sin dependencias.

```
󰚩 Opus 5.5 ◐   elga-app   main ●3  $3.21
󰍛 ctx  ━━━━━━╸━━━━━━━━━  42%  420k / 1M
󱑂 5h   ━━━━━━━━━━━━━━━━  63%  󰑓 1h 24m    󰃭 7d   ━━━━━━━━━━━━━╸━━  81% ▲  󰑓 3d
```

- **Contexto**: barra verde → amarillo → rojo, porcentaje y tokens usados del total.
- **Límites 5h y 7d**: barra azul → violeta → rojo y tiempo hasta el reinicio.
- **Ritmo**: `▲` cuando gastas un límite más rápido de lo que alcanza hasta el reinicio.
- **Git**: rama, `●N` archivos modificados y `↑↓` commits adelante o atrás del remoto.
- Modelo con su nivel de esfuerzo (`○ ◐ ●`) y costo de la sesión.
- Barras con resolución de media celda; se achican en terminales angostas y el 5h y 7d
  pasan a líneas separadas si no caben juntos.

## Requisitos

- Node 18+ o Bun.
- Una terminal con truecolor.
- Una [Nerd Font](https://www.nerdfonts.com) para los íconos (opcional, ver abajo).

## Instalación

```bash
git clone https://github.com/camiloeferrera/claude-statusline.git
```

En `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /ruta/a/claude-statusline/statusline.mjs",
    "padding": 0
  }
}
```

Con Bun arranca más rápido: `"command": "bun /ruta/a/claude-statusline/statusline.mjs"`.

## Ajustes

Arriba de `statusline.mjs`:

- `CONFIG.barWidth`: largo de las barras (16 por defecto).
- `CONFIG.paceMargin`: puntos por encima del ritmo ideal para mostrar `▲`.
- `C`: la paleta de colores en RGB.

Sin Nerd Font, usa símbolos Unicode simples:

```json
"command": "HUD_ICONS=0 node /ruta/a/claude-statusline/statusline.mjs"
```

## Probarla sin Claude Code

```bash
echo '{"model":{"display_name":"Opus 5.5"},"context_window":{"context_window_size":1000000,"used_percentage":42},"rate_limits":{"five_hour":{"used_percentage":63,"resets_at":'$(($(date +%s)+5000))'}}}' | node statusline.mjs
```

## Licencia

MIT
