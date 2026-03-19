# RugMap Studio

An internal design tool for generating stylized, illustrated, kid-friendly maps for rug manufacturing.

## Features

- **Area Selection**: Search any neighborhood/town via Nominatim geocoding, or enter coordinates manually
- **OSM Data Import**: Fetches real roads, buildings, parks, and water from OpenStreetMap via Overpass API
- **Illustrated Rendering**: Transforms raw geographic data into a kid-friendly flat illustration style
- **Interactive Editor**: Drag, resize, rotate, swap, and delete map assets on a Konva.js canvas
- **Asset Library**: 40+ SVG illustrations across buildings, nature, decorative, vehicles, and road types
- **Label System**: Auto-generated labels from OSM names, individually toggleable
- **Export Pipeline**: PNG/TIFF at 300 DPI for print-ready rug manufacturing files
- **Project Management**: Save/load projects via SQLite backend

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Canvas**: Konva.js / react-konva for interactive illustrated layer
- **State**: Zustand with Immer middleware
- **Backend**: Node.js + Express
- **Database**: SQLite via better-sqlite3
- **Map Data**: OpenStreetMap via Overpass API + Nominatim geocoding

## Setup & Development

```bash
# Install all dependencies
npm run install:all

# Start dev servers (frontend on :5173, backend on :3001)
npm run dev
```

## Project Structure

```
/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── store/       # Zustand state management
│   │   ├── utils/       # OSM fetcher, render engine, export
│   │   └── types/       # TypeScript types
│   └── public/
│       └── assets/      # SVG illustration library
│           ├── buildings/
│           ├── nature/
│           ├── decorative/
│           ├── vehicles/
│           └── roads/
├── server/              # Express backend
│   └── src/
│       ├── routes/      # API routes
│       └── db.ts        # SQLite setup
└── data/                # SQLite database (auto-created)
```

## Usage

1. Open the **Area** tab in the left sidebar
2. Search for a neighborhood or town (e.g. "Brooklyn Heights, New York")
3. Choose your rug dimensions (4x6, 5x7, 6x9, or 8x10 ft)
4. Click **Generate Map** — this fetches OSM data and renders the map
5. Switch to the **Assets** tab to add items from the library
6. Click any asset to select it; drag to reposition; use the Properties panel to adjust
7. Use **Export** (top right) to save a 300 DPI PNG/TIFF for print

## Rug Export Notes

- All exports are in sRGB color space
- For rug manufacturing, convert to CMYK using Adobe Photoshop or GIMP before sending to the printer
- Recommended: Export PNG at 300 DPI, then process with your preferred color management tool
