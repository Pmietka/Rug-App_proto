import React, { useEffect } from 'react';
import { X, Plus, Trash2, FolderOpen } from 'lucide-react';
import { useStore } from '../store/useStore';
import { fetchProjects, deleteProject } from '../utils/projectApi';
import toast from 'react-hot-toast';

interface ProjectsModalProps {
  onClose: () => void;
  onLoad: (id: string) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({ onClose, onLoad }) => {
  const { projects, setProjects } = useStore();

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => toast.error('Failed to load projects'));
  }, [setProjects]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const handleNew = () => {
    useStore.getState().setProject({
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
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#1c1c2e] border border-white/[0.07] rounded-xl w-[600px] max-h-[80vh] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <h2 className="text-white font-semibold">Projects</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* New project */}
          <button
            onClick={handleNew}
            className="w-full flex items-center gap-3 border-2 border-dashed border-white/[0.1] hover:border-purple-500/50 rounded-lg p-4 mb-4 text-slate-500 hover:text-purple-400 transition-colors"
          >
            <Plus size={20} />
            <span>New Project</span>
          </button>

          {/* Project list */}
          {projects.length === 0 ? (
            <div className="text-center text-slate-600 py-8">
              No saved projects yet
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onLoad(p.id)}
                  className="bg-[#21213a] hover:bg-[#2a2a42] rounded-lg p-3 cursor-pointer transition-colors group relative"
                >
                  {/* Thumbnail */}
                  <div className="w-full aspect-video bg-[#2a2a42] rounded-md mb-3 overflow-hidden flex items-center justify-center">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-700 text-xs">No preview</div>
                    )}
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white text-sm font-medium truncate">{p.name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {p.rugDimension} · {new Date(p.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-0.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
