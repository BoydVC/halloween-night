# Halloween Night

Warm Halloween night planner for the **Boyd house** in Millersville — sunset countdown (sunrise-sunset.org for Springbloom coords), costume checklists for Char & Vic, candy inventory, and a labeled **EXAMPLE** trick-or-treat street route (not surveyed GPS). Family-friendly orange/purple theme. TokenMax burn build.

## Screens

1. **Tonight** — hero, sunset countdown, stats, tips  
2. **Costumes** — editable EXAMPLE checklists (localStorage)  
3. **Candy** — stock in / hand-outs  
4. **Route** — 6 EXAMPLE stops near Springbloom  
5. **About** — print sheet + export  

Hash routes: `#tonight` · `#costumes` · `#candy` · `#route` · `#about`

## Run

```bash
./run.sh          # build + serve http://127.0.0.1:4321/
./run.sh --shots  # + screenshots/
```

Offline single file: `dist/halloween-night.html`

## Layout

- `web/` — index.html, app.css, app.js  
- `data/halloween.json` — sunset, costumes, candy, EXAMPLE route (embedded into dist)  
- `build.py` / `server.py` / `tests/screenshot.sh`


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/halloween-night` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
- Personal details (emails, phone numbers, home street address) were replaced with `[redacted-…]` placeholders.
