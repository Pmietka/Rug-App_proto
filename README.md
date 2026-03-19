# RugMap Studio

An internal design tool for generating stylized, illustrated, kid-friendly maps for rug manufacturing. Search any real-world neighborhood, pull live OpenStreetMap data, decorate the map with hand-crafted SVG illustrations, and export a print-ready 300 DPI file.

---

## Features

| Feature | Details |
|---|---|
| **Area Search** | Geocode any neighborhood or town via Nominatim, or enter coordinates manually |
| **Live OSM Data** | Fetches roads, buildings, parks, and water bodies from OpenStreetMap via Overpass API |
| **Illustrated Canvas** | Transforms geographic data into a flat, colorful, kid-friendly style on a Konva.js canvas |
| **Asset Library** | 41 hand-crafted SVG illustrations across 5 categories |
| **Interactive Editor** | Click to select; drag to move; resize, rotate, swap, and delete via Properties panel |
| **Label System** | Auto-generated labels from OSM names, individually toggleable per asset |
| **Undo / Redo** | 50-step history for all canvas operations |
| **Project Save / Load** | Full project persistence via SQLite backend |
| **Print Export** | PNG or TIFF at 300 DPI, scaled to your chosen rug size |

---

## Tech Stack

**Frontend**
- [React 19](https://react.dev/) + TypeScript + [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) for UI
- [Konva.js](https://konvajs.org/) / react-konva for canvas rendering
- [Zustand](https://zustand-demo.pmnd.rs/) + [Immer](https://immerjs.github.io/immer/) for state
- [Lucide React](https://lucide.dev/) for icons

**Backend**
- Node.js + [Express](https://expressjs.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for project persistence

**Map Data**
- [OpenStreetMap](https://www.openstreetmap.org/) via [Overpass API](https://overpass-api.de/) (roads, buildings, parks, water)
- [Nominatim](https://nominatim.org/) for geocoding

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone the repo and enter the directory
git clone <https://github.com/Pmietka/Rug-App_proto>
cd Rug-App_proto

# Install all dependencies (root, client, server)
npm run install:all

# Start development servers
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3001](http://localhost:3001)

### Production Build

```bash
npm run build          # builds client into client/dist/
NODE_ENV=production node server/dist/index.js
```

---

## Usage

1. **Search** — Open the **Area** tab, type a location (e.g. `"Williamsburg, Brooklyn"`), and choose a rug size (4×6, 5×7, 6×9, or 8×10 ft).
2. **Generate** — Click **Generate Map**. Roads, parks, water, and buildings populate automatically from real OSM data.
3. **Decorate** — Switch to the **Assets** tab. Click any illustration to drop it on the canvas.
4. **Edit** — Click a placed asset to select it. Drag to reposition. Use the **Properties** panel on the right to:
   - Resize or rotate
   - Swap for a different illustration
   - Toggle or edit its label
   - Delete it
5. **Export** — Click **Export** in the top bar. Choose PNG or TIFF; the file is saved at 300 DPI, sized to your rug dimensions.

---

## Project Structure

```
/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/        # UI panels and canvas
│   │   │   ├── AreaPanel.tsx        # Geocoder + rug size selector
│   │   │   ├── AssetPalette.tsx     # SVG illustration browser
│   │   │   ├── ExportModal.tsx      # Export format + DPI config
│   │   │   ├── LayersPanel.tsx      # Layer visibility controls
│   │   │   ├── MapCanvas.tsx        # Main Konva canvas
│   │   │   ├── PropertiesPanel.tsx  # Selected asset controls
│   │   │   └── TopBar.tsx           # App header + export button
│   │   ├── store/             # Zustand state (canvas, project, history)
│   │   ├── utils/             # OSM fetcher, render engine, export helpers
│   │   └── types/             # Shared TypeScript types
│   └── public/
│       └── assets/            # SVG illustration library (41 files)
│           ├── buildings/     # house-red/blue/yellow, school, church, …
│           ├── nature/        # trees, pond, river, mountain, flowers, …
│           ├── decorative/    # sun, rainbow, balloon, playground, …
│           ├── vehicles/      # car, truck, bus, bicycle
│           └── roads/         # straight, curved, T- and 4-way intersections
├── server/                    # Express API
│   └── src/
│       ├── routes/projects.ts # CRUD endpoints for project JSON
│       ├── db.ts              # SQLite initialization
│       └── index.ts           # App entry point
├── data/                      # SQLite database (auto-created on first run)
└── package.json               # Root workspace scripts
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/projects` | List all saved projects |
| `GET` | `/api/projects/:id` | Load a single project |
| `POST` | `/api/projects` | Create a new project |
| `PUT` | `/api/projects/:id` | Update an existing project |
| `DELETE` | `/api/projects/:id` | Delete a project |

---

## SVG Asset Library

41 illustrations organized into 5 categories, all sized at 100×100 px in a child-friendly flat style.

**Buildings (10):** `house-red`, `house-blue`, `house-yellow`, `school`, `church`, `fire-station`, `hospital`, `library`, `shop`, `barn`

**Nature (9):** `tree-evergreen`, `tree-deciduous`, `tree-cluster`, `park-area`, `pond`, `river-segment`, `mountain`, `hill`, `flowers`

**Decorative (9):** `rainbow`, `hot-air-balloon`, `helicopter`, `clouds`, `sun`, `birds`, `playground`, `bench`, `fence-segment`

**Vehicles (5):** `car-red`, `car-blue`, `truck`, `bus`, `bicycle`

**Roads (8):** `road-straight-h`, `road-straight-v`, `road-curve-tl/tr/bl/br`, `road-intersection-3`, `road-intersection-4`

---

## Export Notes

- Exports are sRGB PNG or TIFF at 300 DPI
- Canvas is scaled to match the selected rug size at print resolution
- **For rug manufacturing:** convert the exported file from sRGB to CMYK using Adobe Photoshop, GIMP, or your RIP software before sending to the printer
- Recommended workflow: export PNG → convert to CMYK → hand to production

---

## Deployment (Vercel + Railway)

The recommended production setup is:
- **Frontend** → [Vercel](https://vercel.com) (free tier)
- **Backend** → [Railway](https://railway.app) (free trial, then ~$5/mo)

### 1. Deploy the backend on Railway

1. Create a new project on Railway and connect this repo.
2. Set the **Root Directory** to `server`.
3. Railway auto-detects Node.js and runs `npm install && npm run build && npm run start` (configured in `server/railway.json`).
4. Add a **Volume** in Railway and mount it at `/data` — this is where the SQLite database lives.
5. Set these environment variables in Railway:

   | Variable | Value |
   |---|---|
   | `DATABASE_DIR` | `/data` |
   | `CORS_ORIGIN` | your Vercel URL (add after step 2, e.g. `https://rugmap.vercel.app`) |

6. Copy the Railway public URL (e.g. `https://rugmap-server.up.railway.app`).

### 2. Deploy the frontend on Vercel

1. Import this repo on Vercel.
2. Set the **Root Directory** to `client`.
3. Framework preset: **Vite** (auto-detected).
4. Add this environment variable in Vercel:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | your Railway URL from step 1 (no trailing slash) |

5. Deploy. Vercel builds with `npm run build` and serves `dist/`.

### 3. Finish wiring CORS

Go back to Railway and update `CORS_ORIGIN` to your Vercel deployment URL. Redeploy the server (Railway does this automatically on env var changes).

### Environment variable reference

**`client/.env.example`**
```
VITE_API_URL=https://your-server.up.railway.app
```

**`server/.env.example`**
```
PORT=3001
CORS_ORIGIN=https://your-app.vercel.app
DATABASE_DIR=/data
```

---

## Contributing

This is an internal prototype. To add new SVG assets:

1. Create a 100×100 px SVG in the appropriate category folder under `client/public/assets/`
2. Register the asset in `client/src/utils/assets.ts` (or equivalent registry file)
3. It will appear automatically in the Asset Palette

---

## License

Internal use only. Not for distribution.
