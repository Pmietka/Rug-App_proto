import React, { useState } from 'react';
import { X, Download, AlertCircle } from 'lucide-react';
import type Konva from 'konva';
import { useStore } from '../store/useStore';
import { exportToPNG, exportToTIFF, exportToPDF } from '../utils/exportUtils';
import toast from 'react-hot-toast';

interface ExportModalProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  onClose: () => void;
}

type ExportFormat = 'png' | 'tiff' | 'pdf';

export const ExportModal: React.FC<ExportModalProps> = ({ stageRef, onClose }) => {
  const { project } = useStore();
  const [format, setFormat] = useState<ExportFormat>('png');
  const [exporting, setExporting] = useState(false);

  const DPI = 300;
  const dims: Record<string, { w: number; h: number }> = {
    '4x6': { w: 4, h: 6 },
    '5x7': { w: 5, h: 7 },
    '6x9': { w: 6, h: 9 },
    '8x10': { w: 8, h: 10 },
  };
  const { w, h } = dims[project.rugDimension];

  const handleExport = async () => {
    if (!stageRef.current) { toast.error('Canvas not ready'); return; }
    setExporting(true);
    try {
      const name = project.name.replace(/\s+/g, '-').toLowerCase();
      if (format === 'png') {
        await exportToPNG(stageRef.current, project.rugDimension, name);
      } else if (format === 'tiff') {
        await exportToTIFF(stageRef.current, project.rugDimension, name);
      } else {
        await exportToPDF(stageRef.current, project.rugDimension, name);
      }
      toast.success('Export complete!');
      onClose();
    } catch (err) {
      toast.error('Export failed');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#1e1e2e] border border-[#2e2e3e] rounded-xl w-96 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2e3e]">
          <h2 className="text-white font-semibold">Export Map</h2>
          <button onClick={onClose} className="text-[#6a6a7a] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Dimensions summary */}
          <div className="bg-[#2a2a3a] rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#8a8a9a]">Rug Size</span>
              <span className="text-white font-medium">{project.rugDimension} feet</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8a8a9a]">Resolution</span>
              <span className="text-white font-medium">{w * DPI} × {h * DPI} px</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8a8a9a]">Print DPI</span>
              <span className="text-white font-medium">300 DPI</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8a8a9a]">Color Profile</span>
              <span className="text-white font-medium">sRGB</span>
            </div>
          </div>

          {/* Format selection */}
          <div>
            <label className="text-[#8a8a9a] text-sm mb-2 block">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['png', 'tiff', 'pdf'] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`py-2.5 rounded-lg text-sm font-medium uppercase tracking-wide transition-colors ${
                    format === f
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#2a2a3a] text-[#8a8a9a] hover:bg-[#3a3a4a] hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* CMYK note */}
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <AlertCircle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-amber-300/80 text-xs leading-relaxed">
              Export is in sRGB. For rug manufacturing, convert to CMYK using
              Adobe Photoshop or GIMP before sending to your printer.
            </p>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-[#3a3a4a] text-white font-medium py-3 rounded-lg transition-colors"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Export {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
