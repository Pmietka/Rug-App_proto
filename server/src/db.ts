import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'rugmap.db');

export const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    rug_dimension TEXT NOT NULL DEFAULT '5x7',
    bbox_north REAL NOT NULL DEFAULT 0,
    bbox_south REAL NOT NULL DEFAULT 0,
    bbox_east REAL NOT NULL DEFAULT 0,
    bbox_west REAL NOT NULL DEFAULT 0,
    thumbnail TEXT,
    data TEXT NOT NULL DEFAULT '{}'
  );
`);

console.log(`Database initialized at ${DB_PATH}`);
