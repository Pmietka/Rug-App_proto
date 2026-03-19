import type {
  OSMData, OSMFeature, RoadPath, WaterFeature, GreenArea,
  CanvasAsset, BoundingBox, AssetType, RoadDetailLevel
} from '../types';

// ─── Coordinate projection ────────────────────────────────────────────────────

export function projectLatLon(
  lat: number,
  lon: number,
  bbox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number
): [number, number] {
  const x = ((lon - bbox.west) / (bbox.east - bbox.west)) * canvasWidth;
  const y = (1 - (lat - bbox.south) / (bbox.north - bbox.south)) * canvasHeight;
  return [x, y];
}

// ─── Douglas-Peucker line simplification ─────────────────────────────────────

function perpendicularDistance(
  pt: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return Math.sqrt((pt[0] - lineStart[0]) ** 2 + (pt[1] - lineStart[1]) ** 2);
  }
  return Math.abs(dx * (lineStart[1] - pt[1]) - (lineStart[0] - pt[0]) * dy) / len;
}

function dpRecurse(pts: [number, number][], epsilon: number): [number, number][] {
  if (pts.length <= 2) return pts;
  let maxDist = 0;
  let maxIdx = 0;
  const end = pts.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(pts[i], pts[0], pts[end]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = dpRecurse(pts.slice(0, maxIdx + 1), epsilon);
    const right = dpRecurse(pts.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [pts[0], pts[end]];
}

function simplifyPoints(points: number[], epsilon: number): number[] {
  if (points.length < 6) return points;
  const pts: [number, number][] = [];
  for (let i = 0; i < points.length; i += 2) pts.push([points[i], points[i + 1]]);
  return dpRecurse(pts, epsilon).flatMap(p => p);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function osmToCanvasElements(
  osmData: OSMData,
  bbox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
  roadDetailLevel: RoadDetailLevel = 'balanced',
): {
  roads: RoadPath[];
  waterFeatures: WaterFeature[];
  greenAreas: GreenArea[];
  assets: CanvasAsset[];
} {
  const roads = extractRoads(osmData.roads, bbox, canvasWidth, canvasHeight, roadDetailLevel);
  const waterFeatures = extractWaterFeatures(osmData.waterFeatures, bbox, canvasWidth, canvasHeight);
  const greenAreas = extractGreenAreas(osmData.greenSpaces, bbox, canvasWidth, canvasHeight);
  const buildingAssets = placeBuildingAssets(osmData.buildings, osmData.pois, bbox, canvasWidth, canvasHeight, roads);
  const decorativeAssets = placeDecorativeAssets(canvasWidth, canvasHeight, greenAreas, waterFeatures);

  return { roads, waterFeatures, greenAreas, assets: [...buildingAssets, ...decorativeAssets] };
}

// ─── Smart crop ───────────────────────────────────────────────────────────────

export function computeSmartCropBbox(
  osmData: OSMData,
  currentBbox: BoundingBox
): BoundingBox {
  const roadLats: number[] = [];
  const roadLons: number[] = [];

  for (const road of osmData.roads) {
    if (!road.geometry) continue;
    const hw = road.tags?.highway || '';
    if (['primary', 'secondary', 'tertiary', 'residential'].includes(hw)) {
      for (const node of road.geometry) {
        roadLats.push(node.lat);
        roadLons.push(node.lon);
      }
    }
  }

  if (roadLats.length === 0) return currentBbox;

  const minLat = Math.min(...roadLats);
  const maxLat = Math.max(...roadLats);
  const minLon = Math.min(...roadLons);
  const maxLon = Math.max(...roadLons);

  const latPad = (maxLat - minLat) * 0.12;
  const lonPad = (maxLon - minLon) * 0.12;

  let adjusted: BoundingBox = {
    north: maxLat + latPad,
    south: minLat - latPad,
    east: maxLon + lonPad,
    west: minLon - lonPad,
  };

  // Coastline adjustment: shift so coast sits at ~15% from the water-side edge
  const coastlineFeatures = osmData.waterFeatures.filter(f => f.tags?.natural === 'coastline');
  if (coastlineFeatures.length > 0) {
    const coastLons: number[] = [];
    for (const f of coastlineFeatures) {
      if (f.geometry) f.geometry.forEach(n => coastLons.push(n.lon));
    }
    if (coastLons.length > 0) {
      const coastAvgLon = coastLons.reduce((a, b) => a + b, 0) / coastLons.length;
      const bboxWidth = adjusted.east - adjusted.west;
      const bboxCenter = (adjusted.east + adjusted.west) / 2;

      if (coastAvgLon > bboxCenter) {
        // Water is east — push so coastline lands at ~85% from west
        const targetCoastLon = adjusted.west + 0.85 * bboxWidth;
        const shift = coastAvgLon - targetCoastLon;
        adjusted.east += shift;
        adjusted.west += shift;
      } else {
        // Water is west — push so coastline lands at ~15% from west
        const targetCoastLon = adjusted.west + 0.15 * bboxWidth;
        const shift = coastAvgLon - targetCoastLon;
        adjusted.east += shift;
        adjusted.west += shift;
      }
    }
  }

  return adjusted;
}

// ─── Road extraction ──────────────────────────────────────────────────────────

function shouldIncludeRoad(highway: string, name: string | undefined, level: RoadDetailLevel): boolean {
  if (level === 'major') {
    return ['primary', 'trunk', 'secondary'].includes(highway);
  }
  if (level === 'balanced') {
    if (['primary', 'trunk', 'secondary', 'tertiary'].includes(highway)) return true;
    if (highway === 'residential' && name) return true; // named collector streets only
    return false;
  }
  // detailed: everything except low-priority pedestrian infrastructure
  return !['service', 'footway', 'path', 'cycleway', 'track'].includes(highway);
}

function getRoadStyle(highway: string): {
  width: number; color: string; centerColor: string; z: number; epsilon: number;
} {
  switch (highway) {
    case 'primary':
    case 'trunk':
      return { width: 16, color: '#b8a878', centerColor: '#e8d8b0', z: 15, epsilon: 1.5 };
    case 'secondary':
      return { width: 12, color: '#bfaf86', centerColor: '#e8d8b0', z: 14, epsilon: 2 };
    case 'tertiary':
      return { width: 9, color: '#b0a888', centerColor: 'transparent', z: 13, epsilon: 2.5 };
    case 'residential':
    case 'unclassified':
      return { width: 7, color: '#b2ab92', centerColor: 'transparent', z: 12, epsilon: 3 };
    case 'pedestrian':
      return { width: 5, color: '#c0b89a', centerColor: 'transparent', z: 11, epsilon: 3 };
    default:
      return { width: 7, color: '#b2ab92', centerColor: 'transparent', z: 12, epsilon: 3 };
  }
}

function extractRoads(
  features: OSMFeature[],
  bbox: BoundingBox,
  cw: number,
  ch: number,
  level: RoadDetailLevel
): RoadPath[] {
  const roads: RoadPath[] = [];

  for (const feature of features) {
    if (!feature.geometry || feature.geometry.length < 2) continue;
    const tags = feature.tags || {};
    const highway = tags.highway;

    if (!shouldIncludeRoad(highway, tags.name, level)) continue;

    const { width, color, centerColor, z, epsilon } = getRoadStyle(highway);

    const rawPoints: number[] = [];
    for (const node of feature.geometry) {
      const [x, y] = projectLatLon(node.lat, node.lon, bbox, cw, ch);
      rawPoints.push(x, y);
    }

    const points = simplifyPoints(rawPoints, epsilon);

    if (points.length >= 4) {
      roads.push({
        id: `road-${feature.id}`,
        points,
        width,
        color,
        centerLineColor: centerColor,
        osmName: tags.name,
        osmType: highway,
        zIndex: z,
      });
    }
  }

  return roads;
}

// ─── Coastline chaining ───────────────────────────────────────────────────────

function chainCoastlineWays(features: OSMFeature[]): Array<{ lat: number; lon: number }> {
  const segments = features
    .filter(f => f.geometry && f.geometry.length >= 2)
    .map(f => f.geometry!);

  if (segments.length === 0) return [];
  if (segments.length === 1) return segments[0];

  const chained: Array<{ lat: number; lon: number }> = [...segments[0]];
  const remaining = segments.slice(1);

  while (remaining.length > 0) {
    const last = chained[chained.length - 1];
    let found = false;
    for (let i = 0; i < remaining.length; i++) {
      const seg = remaining[i];
      const startDist = Math.abs(seg[0].lat - last.lat) + Math.abs(seg[0].lon - last.lon);
      const endDist = Math.abs(seg[seg.length - 1].lat - last.lat) + Math.abs(seg[seg.length - 1].lon - last.lon);
      if (startDist < 0.0002) {
        chained.push(...seg.slice(1));
        remaining.splice(i, 1);
        found = true;
        break;
      } else if (endDist < 0.0002) {
        chained.push(...[...seg].reverse().slice(1));
        remaining.splice(i, 1);
        found = true;
        break;
      }
    }
    if (!found) {
      // Append closest remaining segment
      chained.push(...remaining.shift()!);
    }
  }

  return chained;
}

// ─── Water feature extraction ─────────────────────────────────────────────────

function extractWaterFeatures(
  features: OSMFeature[],
  bbox: BoundingBox,
  cw: number,
  ch: number
): WaterFeature[] {
  const result: WaterFeature[] = [];

  const coastlineFeatures = features.filter(f => f.tags?.natural === 'coastline');
  const waterFeatures = features.filter(f => f.tags?.natural !== 'coastline');

  // Handle coastline: stitch ways and create fill polygon
  if (coastlineFeatures.length > 0) {
    const coastChain = chainCoastlineWays(coastlineFeatures);
    if (coastChain.length >= 2) {
      const projected = coastChain.map(p => projectLatLon(p.lat, p.lon, bbox, cw, ch));
      // Apply Douglas-Peucker to smooth the coastline
      const simplifiedFlat = simplifyPoints(projected.flatMap(p => p), 2);
      const simplifiedPts: [number, number][] = [];
      for (let i = 0; i < simplifiedFlat.length; i += 2) {
        simplifiedPts.push([simplifiedFlat[i], simplifiedFlat[i + 1]]);
      }

      // Sort by Y for consistent top-to-bottom ordering
      const sortedPts = [...simplifiedPts].sort((a, b) => a[1] - b[1]);

      const avgX = sortedPts.reduce((s, p) => s + p[0], 0) / sortedPts.length;
      const waterOnRight = avgX > cw * 0.35; // coastline not far left → water is east

      const topY = sortedPts[0][1];
      const bottomY = sortedPts[sortedPts.length - 1][1];
      const beachFlat = sortedPts.flatMap(p => p);

      let polyPoints: number[];
      if (waterOnRight) {
        polyPoints = [
          ...beachFlat,
          cw, Math.min(bottomY + 50, ch),
          cw, ch,
          cw, 0,
          cw, Math.max(topY - 50, 0),
        ];
      } else {
        polyPoints = [
          ...beachFlat,
          0, Math.min(bottomY + 50, ch),
          0, ch,
          0, 0,
          0, Math.max(topY - 50, 0),
        ];
      }

      result.push({
        id: 'coastline-fill',
        type: 'coastline',
        points: polyPoints,
        isClosed: true,
        zIndex: 4,
        beachPoints: beachFlat,
      });
    }
  }

  // Handle regular water features
  for (const feature of waterFeatures) {
    if (!feature.geometry || feature.geometry.length < 2) continue;
    const tags = feature.tags || {};
    const isClosed = feature.geometry[0].lat === feature.geometry[feature.geometry.length - 1].lat;
    const type = tags.natural === 'water' || tags.leisure === 'swimming_pool'
      ? 'lake'
      : tags.waterway === 'river' ? 'river' : 'pond';

    const rawPoints: number[] = [];
    for (const node of feature.geometry) {
      const [x, y] = projectLatLon(node.lat, node.lon, bbox, cw, ch);
      rawPoints.push(x, y);
    }

    const points = simplifyPoints(rawPoints, 1.5);

    if (points.length >= 4) {
      result.push({
        id: `water-${feature.id}`,
        type,
        points,
        isClosed: isClosed || type !== 'river',
        zIndex: 5,
      });
    }
  }

  return result;
}

// ─── Green area extraction ────────────────────────────────────────────────────

function extractGreenAreas(
  features: OSMFeature[],
  bbox: BoundingBox,
  cw: number,
  ch: number
): GreenArea[] {
  const result: GreenArea[] = [];

  for (const feature of features) {
    if (!feature.geometry || feature.geometry.length < 3) continue;
    const tags = feature.tags || {};
    const type = tags.landuse === 'forest' || tags.natural === 'wood'
      ? 'forest'
      : tags.leisure === 'garden' ? 'garden'
      : 'park';

    const rawPoints: number[] = [];
    for (const node of feature.geometry) {
      const [x, y] = projectLatLon(node.lat, node.lon, bbox, cw, ch);
      rawPoints.push(x, y);
    }

    const points = simplifyPoints(rawPoints, 2);

    if (points.length >= 6) {
      result.push({
        id: `green-${feature.id}`,
        type,
        points,
        zIndex: 3,
      });
    }
  }

  return result;
}

// ─── Building placement ───────────────────────────────────────────────────────

type BuildingCategory = {
  assetType: AssetType;
  label?: string;
  isLandmark: boolean;
};

function getBuildingCategory(tags: Record<string, string>): BuildingCategory {
  const amenity = tags.amenity || '';
  const building = tags.building || '';
  const shop = tags.shop || '';

  if (amenity === 'school' || amenity === 'kindergarten' || building === 'school') {
    return { assetType: 'school', label: tags.name || 'School', isLandmark: true };
  }
  if (amenity === 'hospital' || amenity === 'clinic' || building === 'hospital') {
    return { assetType: 'hospital', label: tags.name || 'Hospital', isLandmark: true };
  }
  if (amenity === 'library') {
    return { assetType: 'library', label: tags.name || 'Library', isLandmark: true };
  }
  if (amenity === 'fire_station') {
    return { assetType: 'fire-station', label: tags.name || 'Fire Station', isLandmark: true };
  }
  if (amenity === 'place_of_worship' || building === 'church' || building === 'cathedral') {
    return { assetType: 'church', label: tags.name || 'Church', isLandmark: true };
  }
  if (shop || amenity === 'shop' || amenity === 'marketplace' || amenity === 'supermarket') {
    return { assetType: 'shop', label: tags.name || 'Shop', isLandmark: false };
  }
  if (amenity === 'restaurant' || amenity === 'cafe' || amenity === 'fast_food') {
    return { assetType: 'shop', label: tags.name || amenity, isLandmark: false };
  }
  if (building === 'barn' || tags.landuse === 'farmyard') {
    return { assetType: 'barn', label: tags.name, isLandmark: false };
  }

  // Residential houses — cycle through 3 styles + size variation (6 visual combos)
  const houseStyles: AssetType[] = ['house-red', 'house-blue', 'house-yellow'];
  const hash = Math.abs(hashString(tags.name || tags['addr:housenumber'] || Math.random().toString()));
  return { assetType: houseStyles[hash % 3], label: undefined, isLandmark: false };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAssetSize(type: AssetType, hash: number): number {
  switch (type) {
    case 'school': return 72;
    case 'hospital': return 72;
    case 'library': return 64;
    case 'fire-station': return 62;
    case 'church': return 58;
    case 'shop': return 50;
    case 'barn': return 56;
    default: {
      // Vary house sizes: small (36), medium (42), large (48)
      const sizeVariants = [36, 40, 44, 48];
      return sizeVariants[hash % 4];
    }
  }
}

/** Find the closest road point to a given x,y position */
function nearestRoadDistance(x: number, y: number, roads: RoadPath[]): number {
  let minDist = Infinity;
  for (const road of roads) {
    const pts = road.points;
    for (let i = 0; i < pts.length - 2; i += 2) {
      const dx = pts[i] - x;
      const dy = pts[i + 1] - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

function placeBuildingAssets(
  buildings: OSMFeature[],
  pois: OSMFeature[],
  bbox: BoundingBox,
  cw: number,
  ch: number,
  roads: RoadPath[]
): CanvasAsset[] {
  const assets: CanvasAsset[] = [];
  let zIndex = 30;

  // Separate landmarks and regular buildings for priority placement
  const landmarks: OSMFeature[] = [];
  const regular: OSMFeature[] = [];

  for (const f of [...buildings, ...pois]) {
    const tags = f.tags || {};
    const { isLandmark } = getBuildingCategory(tags);
    if (isLandmark) landmarks.push(f);
    else regular.push(f);
  }

  const usedPositions: Array<[number, number, boolean]> = []; // [x, y, isLandmark]

  const LANDMARK_SPACING = 80;
  const REGULAR_SPACING = 65;
  // Max regular houses to place — target 30-50 for visual clarity
  const MAX_REGULAR = 50;
  let regularCount = 0;

  const processFeature = (feature: OSMFeature, isLandmark: boolean) => {
    if (!isLandmark && regularCount >= MAX_REGULAR) return;

    let lat: number | undefined;
    let lon: number | undefined;

    if (feature.type === 'node') {
      lat = feature.lat;
      lon = feature.lon;
    } else if (feature.geometry && feature.geometry.length > 0) {
      let sumLat = 0, sumLon = 0;
      for (const n of feature.geometry) { sumLat += n.lat; sumLon += n.lon; }
      lat = sumLat / feature.geometry.length;
      lon = sumLon / feature.geometry.length;
    } else if (feature.center) {
      lat = feature.center.lat;
      lon = feature.center.lon;
    }

    if (lat === undefined || lon === undefined) return;

    const [x, y] = projectLatLon(lat, lon, bbox, cw, ch);

    // Skip if out of canvas bounds with margin
    if (x < 10 || x > cw - 10 || y < 10 || y > ch - 10) return;

    // For regular buildings: only place near roads
    if (!isLandmark && roads.length > 0) {
      const roadDist = nearestRoadDistance(x, y, roads);
      if (roadDist > 80) return; // too far from any road
    }

    const spacing = isLandmark ? LANDMARK_SPACING : REGULAR_SPACING;
    const tooClose = usedPositions.some(([px, py, pIsLandmark]) => {
      const minDist = (isLandmark || pIsLandmark) ? LANDMARK_SPACING : spacing;
      return Math.abs(px - x) < minDist && Math.abs(py - y) < minDist;
    });
    if (tooClose) return;

    const tags = feature.tags || {};
    const { assetType, label } = getBuildingCategory(tags);
    const hash = hashString(String(feature.id));
    const size = getAssetSize(assetType, hash);

    // Slight random rotation for houses (not landmarks)
    const rotation = isLandmark ? 0 : ((hash % 11) - 5); // -5 to +5 degrees

    assets.push({
      id: `asset-${feature.id}`,
      type: assetType,
      category: 'buildings',
      x: x - size / 2,
      y: y - size / 2,
      width: size,
      height: size,
      rotation,
      scaleX: 1,
      scaleY: 1,
      label,
      labelVisible: !!label && label.length > 0,
      zIndex: zIndex++,
      osmId: String(feature.id),
      osmType: feature.tags?.amenity || feature.tags?.building || 'building',
    });

    usedPositions.push([x, y, isLandmark]);
    if (!isLandmark) regularCount++;
  };

  // Place landmarks first, then regular buildings
  for (const f of landmarks) processFeature(f, true);
  for (const f of regular) processFeature(f, false);

  return assets;
}

// ─── Decorative asset placement ───────────────────────────────────────────────

function placeDecorativeAssets(
  cw: number,
  ch: number,
  greenAreas: GreenArea[],
  waterFeatures: WaterFeature[]
): CanvasAsset[] {
  const decoratives: CanvasAsset[] = [];

  // Determine if there's a coastline/water on the right side — put decoratives away from it
  const hasCoastlineRight = waterFeatures.some(w => {
    if (w.type !== 'coastline') return false;
    const avgX = w.points.reduce((s, v, i) => i % 2 === 0 ? s + v : s, 0) / (w.points.length / 2);
    return avgX > cw * 0.6;
  });

  // Sun — top-left if water is on the right, otherwise top-right
  const sunX = hasCoastlineRight ? 20 : cw - 90;
  decoratives.push({
    id: 'deco-sun',
    type: 'sun',
    category: 'decorative',
    x: sunX,
    y: 20,
    width: 70,
    height: 70,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex: 100,
  });

  // Clouds — avoid water-side
  const cloudXPositions = hasCoastlineRight
    ? [30, cw * 0.25, cw * 0.45]
    : [cw * 0.1, cw * 0.4, cw * 0.65];

  cloudXPositions.forEach((cx, i) => {
    decoratives.push({
      id: `deco-cloud-${i}`,
      type: 'clouds',
      category: 'decorative',
      x: cx,
      y: 20 + i * 8,
      width: 85,
      height: 48,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 99,
    });
  });

  // Hot air balloon — over a green area if possible, otherwise mid-left
  let balloonX = cw * 0.2;
  let balloonY = ch * 0.1;
  if (greenAreas.length > 0) {
    const ga = greenAreas[0].points;
    if (ga.length >= 4) { balloonX = ga[0] - 20; balloonY = ga[1] - 50; }
  }
  decoratives.push({
    id: 'deco-balloon',
    type: 'hot-air-balloon',
    category: 'decorative',
    x: Math.max(10, Math.min(cw - 80, balloonX)),
    y: Math.max(10, Math.min(ch * 0.3, balloonY)),
    width: 60,
    height: 80,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex: 98,
  });

  // Birds — upper area, away from other decoratives
  decoratives.push({
    id: 'deco-birds',
    type: 'birds',
    category: 'decorative',
    x: hasCoastlineRight ? cw * 0.4 : cw * 0.55,
    y: ch * 0.06,
    width: 50,
    height: 30,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex: 97,
  });

  return decoratives;
}
