import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { CanvasAsset } from '../types';

export const LayersPanel: React.FC = () => {
  const { project, selectedAssetId, selectAsset, updateAsset, deleteAsset } = useStore();

  const sorted = [...project.assets].sort((a, b) => b.zIndex - a.zIndex);

  if (sorted.length === 0) {
    return (
      <div className="p-4 text-center text-sm">
        <div className="mt-4 text-slate-600">No assets yet</div>
        <div className="text-xs mt-1 text-slate-600">Generate a map or place assets from the palette</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-white/[0.07]">
        Layers ({sorted.length})
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((asset) => (
          <LayerItem
            key={asset.id}
            asset={asset}
            isSelected={asset.id === selectedAssetId}
            onSelect={() => selectAsset(asset.id)}
            onToggleVisible={() => updateAsset(asset.id, { locked: !asset.locked })}
            onDelete={() => deleteAsset(asset.id)}
          />
        ))}
      </div>

      {/* Road/water layer info */}
      <div className="border-t border-white/[0.07] p-2">
        <div className="text-slate-600 text-xs">
          <div className="flex items-center justify-between py-0.5">
            <span>Roads</span>
            <span className="text-slate-700">{project.roads.length} segments</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span>Water</span>
            <span className="text-slate-700">{project.waterFeatures.length} features</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span>Green areas</span>
            <span className="text-slate-700">{project.greenAreas.length} areas</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LayerItem: React.FC<{
  asset: CanvasAsset;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
}> = ({ asset, isSelected, onSelect, onToggleVisible, onDelete }) => {
  const iconPath = `/assets/${asset.category}/${asset.type}.svg`;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors border-b border-white/[0.04] ${
        isSelected ? 'bg-purple-600/20 border-l-2 border-l-purple-500' : 'hover:bg-[#21213a]'
      }`}
    >
      <div className="w-6 h-6 flex-shrink-0">
        <img src={iconPath} alt="" className="w-full h-full object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs truncate capitalize">
          {asset.label || asset.type.replace(/-/g, ' ')}
        </div>
        <div className="text-slate-600 text-[10px]">z: {asset.zIndex}</div>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
          className="p-0.5 text-slate-600 hover:text-slate-400 transition-colors"
        >
          {asset.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-0.5 text-slate-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};
