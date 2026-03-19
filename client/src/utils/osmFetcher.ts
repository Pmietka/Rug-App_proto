import type { BoundingBox, OSMData, OSMFeature } from '../types';

const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter';

export async function fetchOSMData(
  bbox: BoundingBox,
  onProgress?: (msg: string) => void
): Promise<OSMData> {
  const { south, west, north, east } = bbox;
  const bboxStr = `${south},${west},${north},${east}`;

  // Expand bbox slightly for coastline to ensure full coverage
  const latPad = (north - south) * 0.15;
  const lonPad = (east - west) * 0.15;
  const expandedBbox = `${south - latPad},${west - lonPad},${north + latPad},${east + lonPad}`;

  onProgress?.('Building Overpass query...');

  const query = `
[out:json][timeout:60];
(
  way["highway"~"^(primary|trunk|secondary|tertiary|residential|service|footway|pedestrian|path|cycleway|unclassified)$"](${bboxStr});
  way["building"](${bboxStr});
  way["amenity"](${bboxStr});
  way["leisure"~"^(park|garden|playground|pitch|recreation_ground)$"](${bboxStr});
  way["landuse"~"^(forest|grass|meadow|park|recreation_ground|farmland)$"](${bboxStr});
  way["natural"~"^(water|wood|tree_row)$"](${bboxStr});
  way["waterway"](${bboxStr});
  relation["natural"="water"](${bboxStr});
  node["amenity"~"^(school|hospital|library|fire_station|police|restaurant|cafe|shop)$"](${bboxStr});
  node["shop"](${bboxStr});
  node["tourism"](${bboxStr});
  node["leisure"="playground"](${bboxStr});
  way["natural"="coastline"](${expandedBbox});
);
out body geom;
`.trim();

  onProgress?.('Fetching OSM data from Overpass API...');

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  onProgress?.('Parsing OSM data...');
  const text = await response.text();
  let data: { elements?: unknown[] };
  try {
    data = JSON.parse(text);
  } catch {
    // Overpass returned XML (error or timeout page) — surface a clear message
    const match = text.match(/<p[^>]*>(.*?)<\/p>/i);
    const hint = match ? match[1].replace(/<[^>]+>/g, '') : text.slice(0, 120);
    throw new Error(`Overpass returned non-JSON response: ${hint}`);
  }

  return categorizeFeatures(data.elements || []);
}

function categorizeFeatures(elements: OSMFeature[]): OSMData {
  const osmData: OSMData = {
    roads: [],
    buildings: [],
    greenSpaces: [],
    waterFeatures: [],
    pois: [],
  };

  for (const el of elements) {
    const tags = el.tags || {};

    if (tags.highway) {
      osmData.roads.push(el);
    } else if (tags.natural === 'coastline') {
      // Coastline goes into waterFeatures with its natural tag preserved
      osmData.waterFeatures.push(el);
    } else if (tags.building || tags.amenity === 'school' || tags.amenity === 'hospital' ||
               tags.amenity === 'library' || tags.amenity === 'fire_station' ||
               tags.amenity === 'place_of_worship' || tags.shop) {
      osmData.buildings.push(el);
    } else if (tags.leisure === 'park' || tags.leisure === 'garden' ||
               tags.landuse === 'forest' || tags.landuse === 'grass' ||
               tags.landuse === 'meadow' || tags.natural === 'wood') {
      osmData.greenSpaces.push(el);
    } else if (tags.natural === 'water' || tags.waterway || tags.leisure === 'swimming_pool') {
      osmData.waterFeatures.push(el);
    } else if (tags.amenity || tags.tourism || tags.leisure === 'playground') {
      osmData.pois.push(el);
    }
  }

  return osmData;
}

export function geocodeLocation(query: string): Promise<{
  lat: number; lon: number;
  display_name: string;
  boundingbox: string[];
}[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
  return fetch(url, {
    headers: { 'Accept-Language': 'en' },
  }).then(r => r.json());
}
