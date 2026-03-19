import React from 'react';
import { Trash2, Copy, ArrowUp, ArrowDown, RotateCcw, Lock, Unlock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ASSET_LIBRARY } from './AssetPalette';
import type { AssetType, AssetCategory } from '../types';

const ALL_ASSETS = Object.values(ASSET_LIBRARY).flat();

export const PropertiesPanel: React.FC = () => {
  const {
    project, selectedAssetId, updateAsset, deleteAsset, duplicateAsset,
    bringForward, sendBackward, selectAsset
  } = useStore();

  const asset = project.assets.find(a => a.id === selectedAssetId);

  if (!asset) {
    return (
      <div className="p-4 text-center text-[#5a5a6a] text-sm">
        <div className="mt-8 space-y-2">
          <div className="text-3xl">↖</div>
          <div>Select an asset on the canvas to edit its properties</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4 text-sm overflow-y-auto">
      {/* Asset header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-medium capitalize">
            {asset.type.replace(/-/g, ' ')}
          </div>
          <div className="text-[#6a6a7a] text-xs capitalize">{asset.category}</div>
        </div>
        <div className="flex items-center gap-1">
          <ActionBtn icon={<Copy size={13} />} onClick={() => duplicateAsset(asset.id)} title="Duplicate" />
          <ActionBtn
            icon={asset.locked ? <Unlock size={13} /> : <Lock size={13} />}
            onClick={() => updateAsset(asset.id, { locked: !asset.locked })}
            title={asset.locked ? 'Unlock' : 'Lock'}
          />
          <ActionBtn
            icon={<Trash2 size={13} />}
            onClick={() => deleteAsset(asset.id)}
            title="Delete"
            danger
          />
        </div>
      </div>

      {/* Asset swap */}
      <Section title="Asset Style">
        <div className="grid grid-cols-4 gap-1 max-h-36 overflow-y-auto">
          {ALL_ASSETS.map((a) => (
            <button
              key={a.type}
              onClick={() => updateAsset(asset.id, { type: a.type as AssetType })}
              title={a.label}
              className={`p-1 rounded aspect-square flex items-center justify-center transition-colors ${
                asset.type === a.type
                  ? 'bg-purple-600 ring-1 ring-purple-400'
                  : 'bg-[#2a2a3a] hover:bg-[#3a3a4a]'
              }`}
            >
              <img src={a.icon} alt={a.label} className="w-7 h-7 object-contain" />
            </button>
          ))}
        </div>
      </Section>

      {/* Position */}
      <Section title="Position">
        <div className="grid grid-cols-2 gap-2">
          <NumInput
            label="X"
            value={Math.round(asset.x)}
            onChange={(v) => updateAsset(asset.id, { x: v })}
          />
          <NumInput
            label="Y"
            value={Math.round(asset.y)}
            onChange={(v) => updateAsset(asset.id, { y: v })}
          />
        </div>
      </Section>

      {/* Size */}
      <Section title="Size">
        <div className="grid grid-cols-2 gap-2">
          <NumInput
            label="W"
            value={Math.round(asset.width * asset.scaleX)}
            onChange={(v) => updateAsset(asset.id, { scaleX: v / asset.width })}
            min={10}
          />
          <NumInput
            label="H"
            value={Math.round(asset.height * asset.scaleY)}
            onChange={(v) => updateAsset(asset.id, { scaleY: v / asset.height })}
            min={10}
          />
        </div>
      </Section>

      {/* Rotation */}
      <Section title="Rotation">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={-180}
            max={180}
            value={asset.rotation}
            onChange={(e) => updateAsset(asset.id, { rotation: Number(e.target.value) })}
            className="flex-1 accent-purple-500"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={asset.rotation}
              onChange={(e) => updateAsset(asset.id, { rotation: Number(e.target.value) })}
              className="w-14 bg-[#2a2a3a] text-white text-xs px-1.5 py-1 rounded border border-[#3a3a4a] focus:outline-none focus:border-purple-500 text-right"
            />
            <span className="text-[#6a6a7a] text-xs">°</span>
          </div>
          <button
            onClick={() => updateAsset(asset.id, { rotation: 0 })}
            className="text-[#6a6a7a] hover:text-white transition-colors"
            title="Reset rotation"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </Section>

      {/* Label */}
      <Section title="Label">
        <div className="space-y-2">
          <input
            type="text"
            value={asset.label || ''}
            onChange={(e) => updateAsset(asset.id, { label: e.target.value })}
            placeholder="Enter label..."
            className="w-full bg-[#2a2a3a] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a4a] focus:outline-none focus:border-purple-500 placeholder-[#5a5a6a]"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => updateAsset(asset.id, { labelVisible: !asset.labelVisible })}
              className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${
                asset.labelVisible ? 'bg-purple-600' : 'bg-[#3a3a4a]'
              }`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                asset.labelVisible ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
            <span className="text-[#8a8a9a] text-xs">Show label</span>
          </label>
        </div>
      </Section>

      {/* Layer order */}
      <Section title="Layer Order">
        <div className="flex items-center gap-2">
          <button
            onClick={() => sendBackward(asset.id)}
            className="flex items-center gap-1 bg-[#2a2a3a] hover:bg-[#3a3a4a] text-[#a0a0b0] text-xs px-2 py-1.5 rounded transition-colors flex-1 justify-center"
          >
            <ArrowDown size={12} /> Send Back
          </button>
          <button
            onClick={() => bringForward(asset.id)}
            className="flex items-center gap-1 bg-[#2a2a3a] hover:bg-[#3a3a4a] text-[#a0a0b0] text-xs px-2 py-1.5 rounded transition-colors flex-1 justify-center"
          >
            <ArrowUp size={12} /> Bring Fwd
          </button>
        </div>
        <div className="text-[#5a5a6a] text-xs text-center">Z-index: {asset.zIndex}</div>
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="text-[#7a7a8a] text-xs font-semibold uppercase tracking-wider mb-2">{title}</div>
    {children}
  </div>
);

const NumInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}> = ({ label, value, onChange, min }) => (
  <div className="flex items-center gap-1.5 bg-[#2a2a3a] rounded px-2 py-1 border border-[#3a3a4a] focus-within:border-purple-500">
    <span className="text-[#6a6a7a] text-xs w-3">{label}</span>
    <input
      type="number"
      value={value}
      min={min}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 bg-transparent text-white text-xs outline-none text-right w-0"
    />
  </div>
);

const ActionBtn: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}> = ({ icon, onClick, title, danger }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      danger
        ? 'text-[#6a6a7a] hover:text-red-400 hover:bg-red-400/10'
        : 'text-[#6a6a7a] hover:text-white hover:bg-[#3a3a4a]'
    }`}
  >
    {icon}
  </button>
);
