export type RugDimension = '4x6' | '5x7' | '6x9' | '8x10';

export type RoadDetailLevel = 'major' | 'balanced' | 'detailed';

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type AssetCategory = 'roads' | 'buildings' | 'nature' | 'decorative' | 'vehicles' | 'labels';

export type AssetType =
  // Roads
  | 'road-straight-h' | 'road-straight-v' | 'road-curve-tl' | 'road-curve-tr'
  | 'road-curve-bl' | 'road-curve-br' | 'road-intersection-3' | 'road-intersection-4'
  // Buildings
  | 'house-red' | 'house-blue' | 'house-yellow' | 'school' | 'church'
  | 'fire-station' | 'hospital' | 'library' | 'shop' | 'barn'
  // Nature
  | 'tree-evergreen' | 'tree-deciduous' | 'tree-cluster' | 'park-area'
  | 'pond' | 'river-segment' | 'mountain' | 'hill' | 'flowers'
  // Decorative
  | 'rainbow' | 'hot-air-balloon' | 'helicopter' | 'clouds' | 'sun'
  | 'birds' | 'playground' | 'bench' | 'fence-segment'
  // Vehicles
  | 'car-red' | 'car-blue' | 'truck' | 'bus' | 'bicycle'
  // Label
  | 'label';

export interface CanvasAsset {
  id: string;
  type: AssetType;
  category: AssetCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  label?: string;
  labelVisible?: boolean;
  zIndex: number;
  osmId?: string;
  osmType?: string;
  locked?: boolean;
}

export interface RoadPath {
  id: string;
  points: number[];
  width: number;
  color: string;
  centerLineColor: string;
  osmName?: string;
  osmType: string;
  zIndex: number;
}

export interface WaterFeature {
  id: string;
  type: 'river' | 'lake' | 'pond' | 'coastline';
  points: number[];
  isClosed: boolean;
  zIndex: number;
  beachPoints?: number[]; // Coastline-only points for beach strip rendering
}

export interface GreenArea {
  id: string;
  type: 'park' | 'forest' | 'garden' | 'grass';
  points: number[];
  zIndex: number;
}

export interface OSMFeature {
  id: string;
  type: 'node' | 'way' | 'relation';
  tags: Record<string, string>;
  lat?: number;
  lon?: number;
  nodes?: number[];
  geometry?: Array<{ lat: number; lon: number }>;
  center?: { lat: number; lon: number };
}

export interface OSMData {
  roads: OSMFeature[];
  buildings: OSMFeature[];
  greenSpaces: OSMFeature[];
  waterFeatures: OSMFeature[];
  pois: OSMFeature[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  boundingBox: BoundingBox;
  rugDimension: RugDimension;
  osmData?: OSMData;
  roads: RoadPath[];
  waterFeatures: WaterFeature[];
  greenAreas: GreenArea[];
  assets: CanvasAsset[];
  thumbnail?: string;
}

export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
  canvasWidth: number;
  canvasHeight: number;
}

export type Tool = 'select' | 'pan' | 'place';

export interface HistoryEntry {
  assets: CanvasAsset[];
  roads: RoadPath[];
  waterFeatures: WaterFeature[];
  greenAreas: GreenArea[];
}
