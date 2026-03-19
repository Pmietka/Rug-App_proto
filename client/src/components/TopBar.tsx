import React, { useState } from 'react';
import {
  Save, Download, Undo2, Redo2, ZoomIn, ZoomOut, Eye, EyeOff,
  MousePointer2, Hand, Layers, Map, ChevronDown
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { saveProject } from '../utils/projectApi';
import toast from 'react-hot-toast';

interface TopBarProps {
  onExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onExport }) => {
  const {
    project, isDirty, activeTool, showLabels, canvasState,
    setActiveTool, toggleLabels, undo, redo, setCanvasState,
    setProject, history, historyIndex,
  } = useStore();

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveProject(project);
      setProject({ id: saved.id });
      toast.success('Project saved!');
    } catch {
      toast.error('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const zoomIn = () => setCanvasState({ scale: Math.min(canvasState.scale * 1.2, 5) });
  const zoomOut = () => setCanvasState({ scale: Math.max(canvasState.scale / 1.2, 0.2) });
  const resetZoom = () => setCanvasState({ scale: 1, offsetX: 0, offsetY: 0 });

  return (
    <div className="h-12 bg-[#1e1e2e] border-b border-[#2e2e3e] flex items-center px-3 gap-2 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-500 rounded-md flex items-center justify-center">
          <Map size={14} className="text-white" />
        </div>
        <span className="text-white font-semibold text-sm">RugMap Studio</span>
      </div>

      {/* Project name */}
      <input
        value={project.name}
        onChange={(e) => setProject({ name: e.target.value })}
        className="bg-[#2e2e3e] text-white text-sm px-2 py-1 rounded border border-transparent hover:border-[#4e4e5e] focus:border-purple-500 focus:outline-none w-48"
      />
      {isDirty && <span className="text-[#6e6e7e] text-xs">●</span>}

      <div className="flex-1" />

      {/* Tools */}
      <div className="flex items-center bg-[#2e2e3e] rounded-md p-0.5 gap-0.5">
        <ToolBtn
          icon={<MousePointer2 size={15} />}
          active={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
          title="Select (V)"
        />
        <ToolBtn
          icon={<Hand size={15} />}
          active={activeTool === 'pan'}
          onClick={() => setActiveTool('pan')}
          title="Pan (H)"
        />
      </div>

      <div className="w-px h-6 bg-[#2e2e3e]" />

      {/* Undo/Redo */}
      <ToolBtn
        icon={<Undo2 size={15} />}
        disabled={historyIndex <= 0}
        onClick={undo}
        title="Undo (Ctrl+Z)"
      />
      <ToolBtn
        icon={<Redo2 size={15} />}
        disabled={historyIndex >= history.length - 1}
        onClick={redo}
        title="Redo (Ctrl+Y)"
      />

      <div className="w-px h-6 bg-[#2e2e3e]" />

      {/* Labels toggle */}
      <ToolBtn
        icon={showLabels ? <Eye size={15} /> : <EyeOff size={15} />}
        onClick={toggleLabels}
        title={showLabels ? 'Hide Labels' : 'Show Labels'}
      />

      {/* Layers */}
      <ToolBtn
        icon={<Layers size={15} />}
        onClick={() => useStore.getState().setRightPanelTab('layers')}
        title="Layers"
      />

      <div className="w-px h-6 bg-[#2e2e3e]" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <ToolBtn icon={<ZoomOut size={15} />} onClick={zoomOut} title="Zoom Out" />
        <button
          onClick={resetZoom}
          className="text-[#a0a0b0] text-xs hover:text-white px-1 w-12 text-center"
          title="Reset zoom"
        >
          {Math.round(canvasState.scale * 100)}%
        </button>
        <ToolBtn icon={<ZoomIn size={15} />} onClick={zoomIn} title="Zoom In" />
      </div>

      <div className="w-px h-6 bg-[#2e2e3e]" />

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 bg-[#2e2e3e] hover:bg-[#3e3e4e] text-[#a0a0b0] hover:text-white text-sm px-3 py-1.5 rounded transition-colors"
      >
        <Save size={14} />
        <span>{saving ? 'Saving...' : 'Save'}</span>
      </button>

      {/* Export */}
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1.5 rounded transition-colors"
      >
        <Download size={14} />
        <span>Export</span>
        <ChevronDown size={12} />
      </button>
    </div>
  );
};

const ToolBtn: React.FC<{
  icon: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}> = ({ icon, onClick, active, disabled, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      active
        ? 'bg-purple-600 text-white'
        : disabled
        ? 'text-[#4e4e5e] cursor-not-allowed'
        : 'text-[#a0a0b0] hover:text-white hover:bg-[#3e3e4e]'
    }`}
  >
    {icon}
  </button>
);
