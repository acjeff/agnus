# Pattrn - Development Agent Guide

See `CLAUDE.md` for full project overview, architecture, and dependency flow.

## Cursor Cloud specific instructions

### Services

| Service | Command | Notes |
|---|---|---|
| Vite Dev Server | `npm run dev` | Serves at `http://localhost:5173/` with HMR. This is the only required service. |

### Quick reference

- **Lint**: `npm run lint` — ESLint. The codebase has ~200 pre-existing lint warnings/errors (mostly unused vars and missing hook deps in the ~16k-line `Pattrn.jsx`). These are known and expected.
- **Build**: `npm run build` — Vite production build. Emits a chunk-size warning for the main bundle (>500KB) which is expected.
- **Dev**: `npm run dev` — Starts Vite dev server on port 5173.

### Caveats

- Firebase is **optional**. The app gracefully degrades when no `.env` credentials are provided — all Firebase functions return early/null. Core puzzle gameplay works entirely offline via localStorage.
- The project uses **inline styles only** (no CSS files/modules). All styling lives in JSX.
- `Pattrn.jsx` is ~16k lines and triggers Babel's "deoptimised styling" note during lint/build. This is normal.
- No Docker, no database, no backend server needed for local development.
