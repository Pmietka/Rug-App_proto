import type {
  OSMData, OSMFeature, RoadPath, WaterFeature, GreenArea,
  CanvasAsset, BoundingBox, RugDimension, AssetType
} from '../types';

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

export function osmToCanvasElements(
  osmData: OSMData,
  bbox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
): {
  roads: RoadPath[];
  waterFeatures: WaterFeature[];
  greenAreas: GreenArea[];
  assets: CanvasAsset[];
} {
  const roads = extractRoads(osmData.roads, bbox, canvasWidth, canvasHeight);
  const waterFeatures = extractWaterFeatures(osmData.waterFeatures, bbox, canvasWidth, canvasHeight);
  const greenAreas = extractGreenAreas(osmData.greenSpaces, bbox, canvasWidth, canvasHeight);
  const buildingAssets = placeBuildingAssets(osmData.buildings, osmData.pois, bbox, canvasWidth, canvasHeight);
  const decorativeAssets = placeDecorativeAssets(canvasWidth, canvasHeight, greenAreas, waterFeatures);

  return { roads, waterFeatures, greenAreas, assets: [...buildingAssets, ...decorativeAssets] };
}

function extractRoads(
  features: OSMFeature[],
  bbox: BoundingBox,
  cw: number,
  ch: number
): RoadPath[] {
  const roads: RoadPath[] = [];
  let zIndex = 10;

  for (const feature of features) {
    if (!feature.geometry || feature.geometry.length < 2) continue;
    const tags = feature.tags || {};
    const highway = tags.highway;

    const { width, color, centerColor, z } = getRoadStyle(highway);

    const points: number[] = [];
    for (const node of feature.geometry) {
      const [x, y] = projectLatLon(node.lat, node.lon, bbox, cw, ch);
      points.push(x, y);
    }

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
      zIndex++;
    }
  }

  return roads;
}

function getRoadStyle(highway: string): {
  width: number; color: string; centerColor: string; z: number;
} {
  switch (highway) {
    case 'primary':
    case 'trunk':
      return { width: 18, color: '#c8a85a', centerColor: '#fff8e7', z: 15 };
    case 'secondary':
      return { width: 14, color: '#d4b06a', centerColor: '#fff8e7', z: 14 };
    case 'tertiary':
      return { width: 12, color: '#b8b8a0', centerColor: '#ffffff', z: 13 };
    case 'residential':
    case 'unclassified':
      return { width: 10, color: '#c8c8b0', centerColor: '#ffffff', z: 12 };
    case 'service':
      return { width: 7, color: '#d8d8c0', centerColor: 'transparent', z: 11 };
    case 'footway':
    case 'path':
    case 'pedestrian':
    case 'cycleway':
      return { width: 4, color: '#e8d8a0', centerColor: 'transparent', z: 10 };
    default:
      return { width: 8, color: '#c0c0a8', centerColor: '#ffffff', z: 12 };
  }
}

function extractWaterFeatures(
  features: OSMFeature[],
  bbox: BoundingBox,
  cw: number,
  ch: number
): WaterFeature[] {
  const result: WaterFeature[] = [];

  for (const feature of features) {
    if (!feature.geometry || feature.geometry.length < 2) continue;
    const tags = feature.tags || {};
    const isClosed = feature.geometry[0].lat === feature.geometry[feature.geometry.length - 1].lat;
    const type = tags.natural === 'water' || tags.leisure === 'swimming_pool'
      ? 'lake'
      : tags.waterway === 'river' ? 'river' : 'pond';

    const points: number[] = [];
    for (const node of feature.geometry) {
      const [x, y] = projectLatLon(node.lat, node.lon, bbox, cw, ch);
      points.push(x, y);
    }

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

    const points: number[] = [];
    for (const node of feature.geometry) {
      const [x, y] = projectLatLon(node.lat, node.lon, bbox, cw, ch);
      points.push(x, y);
    }

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

type BuildingCategory = {
  assetType: AssetType;
  label?: string;
};

function getBuildingCategory(tags: Record<string, string>): BuildingCategory {
  const amenity = tags.amenity || '';
  const building = tags.building || '';
  const shop = tags.shop || '';

  if (amenity === 'school' || amenity === 'kindergarten' || building === 'school') {
    return { assetType: 'school', label: tags.name || 'School' };
  }
  if (amenity === 'hospital' || amenity === 'clinic' || building === 'hospital') {
    return { assetType: 'hospital', label: tags.name || 'Hospital' };
  }
  if (amenity === 'library') {
    return { assetType: 'library', label: tags.name || 'Library' };
  }
  if (amenity === 'fire_station') {
    return { assetType: 'fire-station', label: tags.name || 'Fire Station' };
  }
  if (amenity === 'place_of_worship' || building === 'church' || building === 'cathedral') {
    return { assetType: 'church', label: tags.name || 'Church' };
  }
  if (shop || amenity === 'shop' || amenity === 'marketplace' || amenity === 'supermarket') {
    return { assetType: 'shop', label: tags.name || 'Shop' };
  }
  if (amenity === 'restaurant' || amenity === 'cafe' || amenity === 'fast_food') {
    return { assetType: 'shop', label: tags.name || amenity };
  }
  if (building === 'barn' || tags.landuse === 'farmyard') {
    return { assetType: 'barn', label: tags.name };
  }

  // Default houses - cycle through styles
  const houseStyles: AssetType[] = ['house-red', 'house-blue', 'house-yellow'];
  const hash = Math.abs(hashString(tags.name || Math.random().toString())) % 3;
  return { assetType: houseStyles[hash], label: tags.name };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function placeBuildingAssets(
  buildings: OSMFeature[],
  pois: OSMFeature[],
  bbox: BoundingBox,
  cw: number,
  ch: number
): CanvasAsset[] {
  const assets: CanvasAsset[] = [];
  let zIndex = 30;

  const allFeatures = [...buildings, ...pois];
  const usedPositions: Array<[number, number]> = [];

  for (const feature of allFeatures) {
    let lat: number | undefined;
    let lon: number | undefined;

    if (feature.type === 'node') {
      lat = feature.lat;
      lon = feature.lon;
    } else if (feature.geometry && feature.geometry.length > 0) {
      // Use centroid
      let sumLat = 0, sumLon = 0;
      for (const n of feature.geometry) {
        sumLat += n.lat;
        sumLon += n.lon;
      }
      lat = sumLat / feature.geometry.length;
      lon = sumLon / feature.geometry.length;
    } else if (feature.center) {
      lat = feature.center.lat;
      lon = feature.center.lon;
    }

    if (lat === undefined || lon === undefined) continue;

    const [x, y] = projectLatLon(lat, lon, bbox, cw, ch);

    // Skip if out of canvas bounds
    if (x < 0 || x > cw || y < 0 || y > ch) continue;

    // Check for overlap (basic spacing)
    const tooClose = usedPositions.some(([px, py]) =>
      Math.abs(px - x) < 30 && Math.abs(py - y) < 30
    );
    if (tooClose) continue;

    const tags = feature.tags || {};
    const { assetType, label } = getBuildingCategory(tags);

    const size = getAssetSize(assetType);

    assets.push({
      id: `asset-${feature.id}`,
      type: assetType,
      category: 'buildings',
      x: x - size / 2,
      y: y - size / 2,
      width: size,
      height: size,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      label,
      labelVisible: !!label && label.length > 0,
      zIndex: zIndex++,
      osmId: String(feature.id),
      osmType: feature.tags?.amenity || feature.tags?.building || 'building',
    });

    usedPositions.push([x, y]);
  }

  return assets;
}

function getAssetSize(type: AssetType): number {
  switch (type) {
    case 'school': return 70;
    case 'hospital': return 70;
    case 'library': return 60;
    case 'fire-station': return 60;
    case 'church': return 55;
    case 'shop': return 50;
    case 'barn': return 60;
    default: return 48;
  }
}

function placeDecorativeAssets(
  cw: number,
  ch: number,
  _greenAreas: GreenArea[],
  _waterFeatures: WaterFeature[]
): CanvasAsset[] {
  const decoratives: CanvasAsset[] = [];

  // Place sun in top corner
  decoratives.push({
    id: 'deco-sun',
    type: 'sun',
    category: 'decorative',
    x: cw - 80,
    y: 20,
    width: 70,
    height: 70,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex: 100,
  });

  // Clouds
  const cloudPositions = [
    { x: 30, y: 30 },
    { x: cw * 0.4, y: 15 },
    { x: cw * 0.65, y: 35 },
  ];
  cloudPositions.forEach((pos, i) => {
    decoratives.push({
      id: `deco-cloud-${i}`,
      type: 'clouds',
      category: 'decorative',
      x: pos.x,
      y: pos.y,
      width: 80,
      height: 45,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 99,
    });
  });

  // Hot air balloon
  decoratives.push({
    id: 'deco-balloon',
    type: 'hot-air-balloon',
    category: 'decorative',
    x: cw * 0.2,
    y: ch * 0.08,
    width: 60,
    height: 80,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex: 98,
  });

  // Birds
  decoratives.push({
    id: 'deco-birds',
    type: 'birds',
    category: 'decorative',
    x: cw * 0.55,
    y: ch * 0.05,
    width: 50,
    height: 30,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex: 97,
  });

  return decoratives;
}
