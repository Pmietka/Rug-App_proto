import React, { useState, useCallback, useRef } from 'react';
import { Search, MapPin, Play, Crop } from 'lucide-react';
import { useStore, getCanvasDimensions } from '../store/useStore';
import { geocodeLocation, fetchOSMData } from '../utils/osmFetcher';
import { osmToCanvasElements, computeSmartCropBbox } from '../utils/renderEngine';
import type { BoundingBox, RugDimension, RoadDetailLevel } from '../types';
import toast from 'react-hot-toast';

const RUG_DIMENSIONS: RugDimension[] = ['4x6', '5x7', '6x9', '8x10'];

const ROAD_DETAIL_OPTIONS: { level: RoadDetailLevel; label: string; desc: string }[] = [
  { level: 'major',    label: 'Major Only',  desc: 'Primary + secondary roads' },
  { level: 'balanced', label: 'Balanced',    desc: 'Adds tertiary + named collectors' },
  { level: 'detailed', label: 'Detailed',    desc: 'All except footways/service' },
];

interface SearchResult {
  lat: string | number;
  lon: string | number;
  display_name: string;
  boundingbox: string[];
}

export const AreaPanel: React.FC = () => {
  const {
    project, setLoading, setOSMData, setRoads, setWaterFeatures,
    setGreenAreas, addAsset, setRugDimension, setBoundingBox, setProject,
    roadDetailLevel, setRoadDetailLevel,
  } = useStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 3) { setResults([]); return; }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await geocodeLocation(q);
        setResults(res.slice(0, 5));
        setShowResults(true);
      } catch {
        toast.error('Geocoding failed');
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectLocation = (result: SearchResult) => {
    setQuery(result.display_name.split(',').slice(0, 2).join(','));
    setShowResults(false);
    setResults([]);
    const [south, north, west, east] = result.boundingbox.map(Number);
    setBoundingBox({ north, south, east, west });
  };

  const handleGenerate = async () => {
    const bbox = project.boundingBox;
    if (!bbox || (bbox.north === 0 && bbox.south === 0)) {
      toast.error('Please select a location first');
      return;
    }

    setLoading(true, 'Connecting to Overpass API...');
    try {
      const osmData = await fetchOSMData(bbox, (msg) => {
        useStore.getState().setLoading(true, msg);
      });

      setOSMData(osmData);
      useStore.getState().setLoading(true, 'Rendering map...');

      const { width, height } = getCanvasDimensions(project.rugDimension);
      const { roads, waterFeatures, greenAreas, assets } = osmToCanvasElements(
        osmData, bbox, width, height, roadDetailLevel
      );

      setRoads(roads);
      setWaterFeatures(waterFeatures);
      setGreenAreas(greenAreas);

      useStore.getState().setProject({ assets: [] });
      for (const asset of assets) {
        addAsset(asset);
      }

      toast.success(`Generated! ${roads.length} roads, ${assets.length} assets placed.`);
      useStore.getState().setLeftPanelTab('assets');
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to fetch OSM data: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartCrop = () => {
    const osmData = project.osmData;
    if (!osmData) {
      toast.error('Generate a map first, then apply Smart Crop');
      return;
    }
    const adjusted = computeSmartCropBbox(osmData, project.boundingBox);
    setBoundingBox(adjusted);
    toast.success('Smart Crop applied — click Generate Map to re-render');
  };

  const hasBbox = project.boundingBox.north !== 0 || project.boundingBox.south !== 0;
  const hasOsmData = !!project.osmData;

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <div className="text-[#a0a0b0] text-xs font-semibold uppercase tracking-wider mb-1">
        Area Selection
      </div>

      {/* Search */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-[#2a2a3a] rounded-md px-2 py-1.5 border border-[#3a3a4a] focus-within:border-purple-500">
          <Search size={14} className="text-[#6a6a7a] flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search neighborhood, town..."
            className="bg-transparent text-white text-sm flex-1 outline-none placeholder-[#5a5a6a]"
          />
          {searching && (
            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {showResults && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#2a2a3a] border border-[#3a3a4a] rounded-md shadow-xl overflow-hidden">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelectLocation(r)}
                className="w-full text-left px-3 py-2 hover:bg-[#3a3a4a] text-[#c0c0d0] text-xs flex items-start gap-2 border-b border-[#3a3a4a] last:border-0"
              >
                <MapPin size={12} className="mt-0.5 flex-shrink-0 text-purple-400" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected location info */}
      {hasBbox && (
        <div className="bg-[#2a2a3a] rounded-md p-2 text-xs text-[#a0a0b0]">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin size={11} className="text-green-400" />
            <span className="text-green-400 font-medium">Area defined</span>
          </div>
          <div className="space-y-0.5 text-[#7a7a8a]">
            <div>N: {project.boundingBox.north.toFixed(4)} S: {project.boundingBox.south.toFixed(4)}</div>
            <div>E: {project.boundingBox.east.toFixed(4)} W: {project.boundingBox.west.toFixed(4)}</div>
          </div>
        </div>
      )}

      {/* Manual bbox inputs */}
      <div>
        <div className="text-[#7a7a8a] text-xs mb-1.5">Or enter coordinates manually:</div>
        <div className="grid grid-cols-2 gap-1.5">
          {(['north', 'south', 'east', 'west'] as const).map((dir) => (
            <div key={dir}>
              <label className="text-[#6a6a7a] text-xs capitalize">{dir}</label>
              <input
                type="number"
                step="0.0001"
                value={project.boundingBox[dir] || ''}
                onChange={(e) => setBoundingBox({ ...project.boundingBox, [dir]: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#2a2a3a] text-white text-xs px-2 py-1 rounded border border-[#3a3a4a] focus:border-purple-500 focus:outline-none mt-0.5"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rug dimensions */}
      <div>
        <label className="text-[#7a7a8a] text-xs block mb-1.5">Rug Dimensions</label>
        <div className="grid grid-cols-2 gap-1.5">
          {RUG_DIMENSIONS.map((dim) => (
            <button
              key={dim}
              onClick={() => setRugDimension(dim)}
              className={`py-1.5 rounded text-xs font-medium transition-colors ${
                project.rugDimension === dim
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#2a2a3a] text-[#a0a0b0] hover:bg-[#3a3a4a] hover:text-white'
              }`}
            >
              {dim} ft
            </button>
          ))}
        </div>
      </div>

      {/* Road Detail Level */}
      <div>
        <label className="text-[#7a7a8a] text-xs block mb-1.5">Road Detail Level</label>
        <div className="flex flex-col gap-1">
          {ROAD_DETAIL_OPTIONS.map(({ level, label, desc }) => (
            <button
              key={level}
              onClick={() => setRoadDetailLevel(level)}
              className={`flex items-start gap-2 px-2.5 py-2 rounded text-xs text-left transition-colors border ${
                roadDetailLevel === level
                  ? 'bg-blue-600/30 border-blue-500 text-white'
                  : 'bg-[#2a2a3a] border-[#3a3a4a] text-[#a0a0b0] hover:bg-[#3a3a4a] hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${
                roadDetailLevel === level ? 'bg-blue-400' : 'bg-[#4a4a5a]'
              }`} />
              <span>
                <span className="font-medium">{label}</span>
                <span className="text-[#7a7a8a] block">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!hasBbox}
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-[#3a3a4a] disabled:to-[#3a3a4a] disabled:text-[#5a5a6a] text-white font-medium py-2.5 rounded-md transition-all text-sm"
      >
        <Play size={14} />
        Generate Map
      </button>

      {/* Smart Crop button — only visible after data is loaded */}
      {hasOsmData && (
        <button
          onClick={handleSmartCrop}
          className="flex items-center justify-center gap-2 bg-[#2a3a2a] hover:bg-[#3a4a3a] border border-green-700/50 text-green-400 font-medium py-2 rounded-md transition-all text-xs"
        >
          <Crop size={13} />
          Smart Crop (minimize dead space)
        </button>
      )}

      {/* Tips */}
      <div className="text-[#5a5a6a] text-xs leading-relaxed">
        <strong className="text-[#7a7a8a]">Tip:</strong> Use <strong className="text-[#8a8a9a]">Balanced</strong> for
        clean illustrated look. After generating, try <strong className="text-green-600/80">Smart Crop</strong> for
        coastal towns to remove lake dead space.
      </div>
    </div>
  );
};
