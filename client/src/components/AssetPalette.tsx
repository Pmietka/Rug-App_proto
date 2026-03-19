import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { AssetCategory, AssetType } from '../types';

interface AssetDef {
  type: AssetType;
  label: string;
  icon: string;
}

const ASSET_LIBRARY: Record<AssetCategory, AssetDef[]> = {
  buildings: [
    { type: 'house-red', label: 'Red House', icon: '/assets/buildings/house-red.svg' },
    { type: 'house-blue', label: 'Blue House', icon: '/assets/buildings/house-blue.svg' },
    { type: 'house-yellow', label: 'Yellow House', icon: '/assets/buildings/house-yellow.svg' },
    { type: 'school', label: 'School', icon: '/assets/buildings/school.svg' },
    { type: 'church', label: 'Church', icon: '/assets/buildings/church.svg' },
    { type: 'fire-station', label: 'Fire Station', icon: '/assets/buildings/fire-station.svg' },
    { type: 'hospital', label: 'Hospital', icon: '/assets/buildings/hospital.svg' },
    { type: 'library', label: 'Library', icon: '/assets/buildings/library.svg' },
    { type: 'shop', label: 'Shop', icon: '/assets/buildings/shop.svg' },
    { type: 'barn', label: 'Barn', icon: '/assets/buildings/barn.svg' },
  ],
  nature: [
    { type: 'tree-evergreen', label: 'Pine Tree', icon: '/assets/nature/tree-evergreen.svg' },
    { type: 'tree-deciduous', label: 'Round Tree', icon: '/assets/nature/tree-deciduous.svg' },
    { type: 'tree-cluster', label: 'Tree Cluster', icon: '/assets/nature/tree-cluster.svg' },
    { type: 'park-area', label: 'Park', icon: '/assets/nature/park-area.svg' },
    { type: 'pond', label: 'Pond', icon: '/assets/nature/pond.svg' },
    { type: 'river-segment', label: 'River', icon: '/assets/nature/river-segment.svg' },
    { type: 'mountain', label: 'Mountain', icon: '/assets/nature/mountain.svg' },
    { type: 'hill', label: 'Hill', icon: '/assets/nature/hill.svg' },
    { type: 'flowers', label: 'Flowers', icon: '/assets/nature/flowers.svg' },
  ],
  decorative: [
    { type: 'rainbow', label: 'Rainbow', icon: '/assets/decorative/rainbow.svg' },
    { type: 'hot-air-balloon', label: 'Balloon', icon: '/assets/decorative/hot-air-balloon.svg' },
    { type: 'helicopter', label: 'Helicopter', icon: '/assets/decorative/helicopter.svg' },
    { type: 'clouds', label: 'Clouds', icon: '/assets/decorative/clouds.svg' },
    { type: 'sun', label: 'Sun', icon: '/assets/decorative/sun.svg' },
    { type: 'birds', label: 'Birds', icon: '/assets/decorative/birds.svg' },
    { type: 'playground', label: 'Playground', icon: '/assets/decorative/playground.svg' },
    { type: 'bench', label: 'Bench', icon: '/assets/decorative/bench.svg' },
    { type: 'fence-segment', label: 'Fence', icon: '/assets/decorative/fence-segment.svg' },
  ],
  vehicles: [
    { type: 'car-red', label: 'Red Car', icon: '/assets/vehicles/car-red.svg' },
    { type: 'car-blue', label: 'Blue Car', icon: '/assets/vehicles/car-blue.svg' },
    { type: 'truck', label: 'Truck', icon: '/assets/vehicles/truck.svg' },
    { type: 'bus', label: 'Bus', icon: '/assets/vehicles/bus.svg' },
    { type: 'bicycle', label: 'Bicycle', icon: '/assets/vehicles/bicycle.svg' },
  ],
  roads: [
    { type: 'road-straight-h', label: 'Road H', icon: '/assets/roads/road-straight-h.svg' },
    { type: 'road-straight-v', label: 'Road V', icon: '/assets/roads/road-straight-v.svg' },
    { type: 'road-curve-tl', label: 'Curve TL', icon: '/assets/roads/road-curve-tl.svg' },
    { type: 'road-curve-tr', label: 'Curve TR', icon: '/assets/roads/road-curve-tr.svg' },
    { type: 'road-curve-bl', label: 'Curve BL', icon: '/assets/roads/road-curve-bl.svg' },
    { type: 'road-curve-br', label: 'Curve BR', icon: '/assets/roads/road-curve-br.svg' },
    { type: 'road-intersection-3', label: 'T-Cross', icon: '/assets/roads/road-intersection-3.svg' },
    { type: 'road-intersection-4', label: '4-Way', icon: '/assets/roads/road-intersection-4.svg' },
  ],
  labels: [],
};

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  buildings: 'Buildings',
  nature: 'Nature',
  decorative: 'Decorative',
  vehicles: 'Vehicles',
  roads: 'Roads',
  labels: 'Labels',
};

const ASSET_DEFAULT_SIZES: Partial<Record<AssetType, { w: number; h: number }>> = {
  school: { w: 70, h: 70 },
  hospital: { w: 70, h: 70 },
  library: { w: 65, h: 65 },
  'fire-station': { w: 65, h: 65 },
  church: { w: 55, h: 70 },
  barn: { w: 65, h: 65 },
  mountain: { w: 80, h: 60 },
  rainbow: { w: 100, h: 60 },
  'hot-air-balloon': { w: 60, h: 80 },
  helicopter: { w: 80, h: 50 },
  bus: { w: 65, h: 28 },
  truck: { w: 55, h: 25 },
};

export const AssetPalette: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('buildings');
  const { addAsset, canvasState, setActiveTool, setPlacingAssetType } = useStore();

  const categories = Object.keys(ASSET_LIBRARY).filter(
    (c) => c !== 'labels' && ASSET_LIBRARY[c as AssetCategory].length > 0
  ) as AssetCategory[];

  const handleAssetClick = (asset: AssetDef) => {
    // Place asset in center of current canvas view
    const { canvasWidth, canvasHeight } = canvasState;
    const size = ASSET_DEFAULT_SIZES[asset.type] || { w: 50, h: 50 };
    const x = canvasWidth / 2 - size.w / 2;
    const y = canvasHeight / 2 - size.h / 2;

    addAsset({
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: asset.type,
      category: activeCategory,
      x, y,
      width: size.w,
      height: size.h,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 50 + useStore.getState().project.assets.length,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Category tabs */}
      <div className="flex overflow-x-auto border-b border-[#2e2e3e] flex-shrink-0">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-2 text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
              activeCategory === cat
                ? 'text-white border-b-2 border-purple-500 bg-[#2a2a3a]'
                : 'text-[#6a6a7a] hover:text-[#a0a0b0]'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Asset grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-1.5">
          {ASSET_LIBRARY[activeCategory].map((asset) => (
            <button
              key={asset.type}
              onClick={() => handleAssetClick(asset)}
              title={`Add ${asset.label}`}
              className="asset-palette-item bg-[#2a2a3a] hover:bg-[#3a3a4a] rounded-md p-1.5 flex flex-col items-center gap-1 transition-colors group"
            >
              <div className="w-12 h-12 flex items-center justify-center">
                <img
                  src={asset.icon}
                  alt={asset.label}
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              </div>
              <span className="text-[#8a8a9a] group-hover:text-[#c0c0d0] text-[10px] text-center leading-tight">
                {asset.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 border-t border-[#2e2e3e] text-[#5a5a6a] text-xs text-center">
        Click to place in center · Drag on canvas to reposition
      </div>
    </div>
  );
};

export { ASSET_LIBRARY, ASSET_DEFAULT_SIZES };
