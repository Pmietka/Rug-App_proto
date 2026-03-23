import React, { useRef, useState } from 'react';
import type Konva from 'konva';
import { Toaster } from 'react-hot-toast';
import { MapPin, Layers, Settings, FolderOpen } from 'lucide-react';

import { TopBar } from './components/TopBar';
import { AreaPanel } from './components/AreaPanel';
import { AssetPalette } from './components/AssetPalette';
import { MapCanvas } from './components/MapCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayersPanel } from './components/LayersPanel';
import { ExportModal } from './components/ExportModal';
import { ProjectsModal } from './components/ProjectsModal';
import { useStore } from './store/useStore';
import { fetchProject } from './utils/projectApi';
import toast from 'react-hot-toast';

const LEFT_TABS = [
  { id: 'area' as const, icon: <MapPin size={16} />, label: 'Area' },
  { id: 'assets' as const, icon: <Layers size={16} />, label: 'Assets' },
  { id: 'project' as const, icon: <Settings size={16} />, label: 'Project' },
];

const RIGHT_TABS = [
  { id: 'properties' as const, label: 'Properties' },
  { id: 'layers' as const, label: 'Layers' },
];

export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  const {
    leftPanelTab, rightPanelTab, setLeftPanelTab, setRightPanelTab,
    isLoading, loadingMessage, setProject, setRoads, setWaterFeatures,
    setGreenAreas,
  } = useStore();

  const handleLoadProject = async (id: string) => {
    try {
      const p = await fetchProject(id);
      setProject(p);
      setRoads(p.roads);
      setWaterFeatures(p.waterFeatures);
      setGreenAreas(p.greenAreas);
      toast.success(`Loaded: ${p.name}`);
    } catch {
      toast.error('Failed to load project');
    }
    setShowProjects(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0e0e1c] text-white overflow-hidden">
      <TopBar onExport={() => setShowExport(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 bg-[#16162a] border-r border-white/[0.07] flex flex-col flex-shrink-0">
          <div className="flex border-b border-white/[0.07]">
            {LEFT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLeftPanelTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
                  leftPanelTab === tab.id
                    ? 'text-white border-b-2 border-purple-500 bg-[#21213a]'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {leftPanelTab === 'area' && <AreaPanel />}
            {leftPanelTab === 'assets' && <AssetPalette />}
            {leftPanelTab === 'project' && <ProjectSettingsPanel onShowProjects={() => setShowProjects(true)} />}
          </div>
        </div>

        {/* Center canvas */}
        <MapCanvas stageRef={stageRef} containerRef={containerRef} />

        {/* Right Sidebar */}
        <div className="w-64 bg-[#16162a] border-l border-white/[0.07] flex flex-col flex-shrink-0">
          <div className="flex border-b border-white/[0.07]">
            {RIGHT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightPanelTab(tab.id)}
                className={`flex-1 py-2.5 text-xs transition-colors ${
                  rightPanelTab === tab.id
                    ? 'text-white border-b-2 border-purple-500 bg-[#21213a]'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'properties' && <PropertiesPanel />}
            {rightPanelTab === 'layers' && <LayersPanel />}
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
          <div className="bg-[#1c1c2e] rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-white/[0.07] max-w-sm w-full mx-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 border-4 border-white/[0.1] rounded-full absolute inset-0" />
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin size={20} className="text-purple-400" />
              </div>
            </div>
            <div className="text-white font-medium text-center">Generating Map</div>
            <div className="text-slate-400 text-sm text-center leading-relaxed">
              {loadingMessage || 'Processing...'}
            </div>
            <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <ExportModal stageRef={stageRef} onClose={() => setShowExport(false)} />
      )}
      {showProjects && (
        <ProjectsModal onClose={() => setShowProjects(false)} onLoad={handleLoadProject} />
      )}

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1c1c2e', color: '#ffffff', border: '1px solid rgba(255,255,255,0.07)' },
        }}
      />
    </div>
  );
}

const ProjectSettingsPanel: React.FC<{ onShowProjects: () => void }> = ({ onShowProjects }) => {
  const { project, setProject } = useStore();

  return (
    <div className="p-3 space-y-4">
      <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
        Project Settings
      </div>

      <div>
        <label className="text-slate-500 text-xs block mb-1">Project Name</label>
        <input
          type="text"
          value={project.name}
          onChange={(e) => setProject({ name: e.target.value })}
          className="w-full bg-[#21213a] text-white text-sm px-2 py-1.5 rounded border border-white/[0.07] focus:border-purple-500 focus:outline-none"
        />
      </div>

      <div className="bg-[#21213a] rounded-lg p-3 text-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-500">Assets placed</span>
          <span className="text-white">{project.assets.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Road segments</span>
          <span className="text-white">{project.roads.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Water features</span>
          <span className="text-white">{project.waterFeatures.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Green areas</span>
          <span className="text-white">{project.greenAreas.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Created</span>
          <span className="text-white">{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <button
        onClick={onShowProjects}
        className="w-full flex items-center justify-center gap-2 bg-[#21213a] hover:bg-[#2a2a42] text-slate-400 hover:text-white text-sm py-2 rounded transition-colors"
      >
        <FolderOpen size={14} />
        Open Projects
      </button>
    </div>
  );
};
