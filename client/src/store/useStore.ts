import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Project, CanvasAsset, RoadPath, WaterFeature, GreenArea,
  BoundingBox, RugDimension, OSMData, CanvasState, Tool, HistoryEntry
} from '../types';

const RUG_DIMS: Record<RugDimension, { w: number; h: number }> = {
  '4x6': { w: 4, h: 6 },
  '5x7': { w: 5, h: 7 },
  '6x9': { w: 6, h: 9 },
  '8x10': { w: 8, h: 10 },
};

export const CANVAS_BASE_PX = 900;

export function getCanvasDimensions(dim: RugDimension): { width: number; height: number } {
  const { w, h } = RUG_DIMS[dim];
  const aspect = h / w;
  return { width: CANVAS_BASE_PX, height: Math.round(CANVAS_BASE_PX * aspect) };
}

interface AppState {
  // Project
  project: Project;
  projects: Project[];
  isDirty: boolean;

  // UI State
  selectedAssetId: string | null;
  activeTool: Tool;
  showLabels: boolean;
  canvasState: CanvasState;
  isLoading: boolean;
  loadingMessage: string;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Sidebar
  leftPanelTab: 'assets' | 'area' | 'project';
  rightPanelTab: 'properties' | 'layers';

  // Place tool
  placingAssetType: string | null;

  // Actions
  setProject: (project: Partial<Project>) => void;
  setProjects: (projects: Project[]) => void;
  selectAsset: (id: string | null) => void;
  setActiveTool: (tool: Tool) => void;
  toggleLabels: () => void;
  setCanvasState: (state: Partial<CanvasState>) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setLeftPanelTab: (tab: 'assets' | 'area' | 'project') => void;
  setRightPanelTab: (tab: 'properties' | 'layers') => void;
  setPlacingAssetType: (type: string | null) => void;

  // Asset actions
  addAsset: (asset: CanvasAsset) => void;
  updateAsset: (id: string, updates: Partial<CanvasAsset>) => void;
  deleteAsset: (id: string) => void;
  duplicateAsset: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  // Map data
  setOSMData: (data: OSMData) => void;
  setRoads: (roads: RoadPath[]) => void;
  setWaterFeatures: (features: WaterFeature[]) => void;
  setGreenAreas: (areas: GreenArea[]) => void;
  addRoads: (roads: RoadPath[]) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Rug settings
  setBoundingBox: (bbox: BoundingBox) => void;
  setRugDimension: (dim: RugDimension) => void;
}

const defaultProject: Project = {
  id: 'new',
  name: 'New Rug Map',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  boundingBox: { north: 0, south: 0, east: 0, west: 0 },
  rugDimension: '5x7',
  roads: [],
  waterFeatures: [],
  greenAreas: [],
  assets: [],
};

const defaultCanvasState: CanvasState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  canvasWidth: CANVAS_BASE_PX,
  canvasHeight: Math.round(CANVAS_BASE_PX * 7 / 5),
};

export const useStore = create<AppState>()(
  immer((set, get) => ({
    project: defaultProject,
    projects: [],
    isDirty: false,
    selectedAssetId: null,
    activeTool: 'select',
    showLabels: true,
    canvasState: defaultCanvasState,
    isLoading: false,
    loadingMessage: '',
    history: [],
    historyIndex: -1,
    leftPanelTab: 'area',
    rightPanelTab: 'properties',
    placingAssetType: null,

    setProject: (updates) => set((state) => {
      Object.assign(state.project, updates, { updatedAt: new Date().toISOString() });
      state.isDirty = true;
    }),

    setProjects: (projects) => set((state) => { state.projects = projects; }),

    selectAsset: (id) => set((state) => {
      state.selectedAssetId = id;
      if (id) state.rightPanelTab = 'properties';
    }),

    setActiveTool: (tool) => set((state) => { state.activeTool = tool; }),

    toggleLabels: () => set((state) => { state.showLabels = !state.showLabels; }),

    setCanvasState: (updates) => set((state) => {
      Object.assign(state.canvasState, updates);
    }),

    setLoading: (loading, message = '') => set((state) => {
      state.isLoading = loading;
      state.loadingMessage = message;
    }),

    setLeftPanelTab: (tab) => set((state) => { state.leftPanelTab = tab; }),
    setRightPanelTab: (tab) => set((state) => { state.rightPanelTab = tab; }),
    setPlacingAssetType: (type) => set((state) => { state.placingAssetType = type; }),

    addAsset: (asset) => {
      get().pushHistory();
      set((state) => {
        state.project.assets.push(asset);
        state.isDirty = true;
      });
    },

    updateAsset: (id, updates) => set((state) => {
      const idx = state.project.assets.findIndex(a => a.id === id);
      if (idx !== -1) {
        Object.assign(state.project.assets[idx], updates);
        state.isDirty = true;
      }
    }),

    deleteAsset: (id) => {
      get().pushHistory();
      set((state) => {
        state.project.assets = state.project.assets.filter(a => a.id !== id);
        if (state.selectedAssetId === id) state.selectedAssetId = null;
        state.isDirty = true;
      });
    },

    duplicateAsset: (id) => {
      get().pushHistory();
      set((state) => {
        const asset = state.project.assets.find(a => a.id === id);
        if (asset) {
          const newAsset = {
            ...asset,
            id: `asset-${Date.now()}`,
            x: asset.x + 20,
            y: asset.y + 20,
            zIndex: Math.max(...state.project.assets.map(a => a.zIndex), 0) + 1,
          };
          state.project.assets.push(newAsset);
          state.selectedAssetId = newAsset.id;
          state.isDirty = true;
        }
      });
    },

    bringForward: (id) => set((state) => {
      const asset = state.project.assets.find(a => a.id === id);
      if (asset) { asset.zIndex += 1; state.isDirty = true; }
    }),

    sendBackward: (id) => set((state) => {
      const asset = state.project.assets.find(a => a.id === id);
      if (asset && asset.zIndex > 0) { asset.zIndex -= 1; state.isDirty = true; }
    }),

    setOSMData: (data) => set((state) => {
      state.project.osmData = data;
      state.isDirty = true;
    }),

    setRoads: (roads) => set((state) => {
      state.project.roads = roads;
      state.isDirty = true;
    }),

    addRoads: (roads) => set((state) => {
      state.project.roads.push(...roads);
      state.isDirty = true;
    }),

    setWaterFeatures: (features) => set((state) => {
      state.project.waterFeatures = features;
      state.isDirty = true;
    }),

    setGreenAreas: (areas) => set((state) => {
      state.project.greenAreas = areas;
      state.isDirty = true;
    }),

    pushHistory: () => set((state) => {
      const entry: HistoryEntry = {
        assets: JSON.parse(JSON.stringify(state.project.assets)),
        roads: JSON.parse(JSON.stringify(state.project.roads)),
        waterFeatures: JSON.parse(JSON.stringify(state.project.waterFeatures)),
        greenAreas: JSON.parse(JSON.stringify(state.project.greenAreas)),
      };
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(entry);
      if (state.history.length > 50) state.history.shift();
      else state.historyIndex++;
    }),

    undo: () => set((state) => {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        const entry = state.history[state.historyIndex];
        state.project.assets = entry.assets;
        state.project.roads = entry.roads;
        state.project.waterFeatures = entry.waterFeatures;
        state.project.greenAreas = entry.greenAreas;
        state.isDirty = true;
      }
    }),

    redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const entry = state.history[state.historyIndex];
        state.project.assets = entry.assets;
        state.project.roads = entry.roads;
        state.project.waterFeatures = entry.waterFeatures;
        state.project.greenAreas = entry.greenAreas;
        state.isDirty = true;
      }
    }),

    setBoundingBox: (bbox) => set((state) => {
      state.project.boundingBox = bbox;
      state.isDirty = true;
    }),

    setRugDimension: (dim) => {
      const { width, height } = getCanvasDimensions(dim);
      set((state) => {
        state.project.rugDimension = dim;
        state.canvasState.canvasWidth = width;
        state.canvasState.canvasHeight = height;
        state.isDirty = true;
      });
    },
  }))
);
