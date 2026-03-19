import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';

const router = Router();

// GET /api/projects - list all projects
router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT id, name, created_at, updated_at, rug_dimension,
           bbox_north, bbox_south, bbox_east, bbox_west, thumbnail
    FROM projects ORDER BY updated_at DESC
  `).all() as any[];

  const projects = rows.map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rugDimension: row.rug_dimension,
    boundingBox: {
      north: row.bbox_north,
      south: row.bbox_south,
      east: row.bbox_east,
      west: row.bbox_west,
    },
    thumbnail: row.thumbnail,
    roads: [],
    waterFeatures: [],
    greenAreas: [],
    assets: [],
  }));

  res.json(projects);
});

// GET /api/projects/:id
router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare(`
    SELECT * FROM projects WHERE id = ?
  `).get(req.params.id) as any;

  if (!row) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  let data: any = {};
  try {
    data = JSON.parse(row.data || '{}');
  } catch { /* ignore */ }

  res.json({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rugDimension: row.rug_dimension,
    boundingBox: {
      north: row.bbox_north,
      south: row.bbox_south,
      east: row.bbox_east,
      west: row.bbox_west,
    },
    thumbnail: row.thumbnail,
    roads: data.roads || [],
    waterFeatures: data.waterFeatures || [],
    greenAreas: data.greenAreas || [],
    assets: data.assets || [],
    osmData: data.osmData,
  });
});

// POST /api/projects - create
router.post('/', (req: Request, res: Response) => {
  const { name, rugDimension, boundingBox, roads, waterFeatures, greenAreas, assets, osmData, thumbnail } = req.body;

  const id = uuidv4();
  const now = new Date().toISOString();
  const data = JSON.stringify({ roads, waterFeatures, greenAreas, assets, osmData });

  db.prepare(`
    INSERT INTO projects (id, name, created_at, updated_at, rug_dimension,
      bbox_north, bbox_south, bbox_east, bbox_west, thumbnail, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name || 'Untitled', now, now,
    rugDimension || '5x7',
    boundingBox?.north || 0,
    boundingBox?.south || 0,
    boundingBox?.east || 0,
    boundingBox?.west || 0,
    thumbnail || null,
    data
  );

  res.json({ id, name, createdAt: now, updatedAt: now });
});

// PUT /api/projects/:id - update
router.put('/:id', (req: Request, res: Response) => {
  const { name, rugDimension, boundingBox, roads, waterFeatures, greenAreas, assets, osmData, thumbnail } = req.body;
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const data = JSON.stringify({ roads, waterFeatures, greenAreas, assets, osmData });

  db.prepare(`
    UPDATE projects SET
      name = ?, updated_at = ?, rug_dimension = ?,
      bbox_north = ?, bbox_south = ?, bbox_east = ?, bbox_west = ?,
      thumbnail = ?, data = ?
    WHERE id = ?
  `).run(
    name, now, rugDimension || '5x7',
    boundingBox?.north || 0,
    boundingBox?.south || 0,
    boundingBox?.east || 0,
    boundingBox?.west || 0,
    thumbnail || null,
    data,
    req.params.id
  );

  res.json({ id: req.params.id, updatedAt: now });
});

// DELETE /api/projects/:id
router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
