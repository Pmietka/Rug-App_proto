import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Stage, Layer, Line, Rect, Image as KonvaImage, Text, Group, Circle, Shape
} from 'react-konva';
import type Konva from 'konva';
import { useStore } from '../store/useStore';
import type { CanvasAsset, RoadPath, WaterFeature, GreenArea } from '../types';

interface MapCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// Image cache for SVG assets
const imageCache = new Map<string, HTMLImageElement>();

function useImage(src: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (imageCache.has(src)) {
      setImg(imageCache.get(src)!);
      return;
    }
    const image = new Image();
    image.src = src;
    image.onload = () => {
      imageCache.set(src, image);
      setImg(image);
    };
    image.onerror = () => {
      // Create a fallback colored rectangle
      const canvas = document.createElement('canvas');
      canvas.width = 60;
      canvas.height = 60;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#6272a4';
      ctx.fillRect(5, 5, 50, 50);
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(src.split('/').pop()?.split('.')[0] || '?', 30, 35);
      const fallback = new Image();
      fallback.src = canvas.toDataURL();
      imageCache.set(src, fallback);
      setImg(fallback);
    };
  }, [src]);

  return img;
}

// Green area polygon component
const GreenAreaShape: React.FC<{ area: GreenArea }> = ({ area }) => {
  const color = area.type === 'forest' ? '#5a8f3c' :
                area.type === 'garden' ? '#7ab648' : '#8fc45a';
  const stroke = area.type === 'forest' ? '#4a7f2c' : '#6a9e3a';

  return (
    <Line
      points={area.points}
      closed
      fill={color}
      stroke={stroke}
      strokeWidth={2}
      opacity={0.7}
      listening={false}
    />
  );
};

// Water feature component
const WaterShape: React.FC<{ feature: WaterFeature }> = ({ feature }) => {
  const fillColor = feature.type === 'river' ? '#5b9bd5' : '#4a90d9';
  const strokeColor = '#3a7ac0';

  if (feature.isClosed) {
    return (
      <Line
        points={feature.points}
        closed
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
        opacity={0.85}
        listening={false}
      />
    );
  }
  return (
    <Line
      points={feature.points}
      stroke={fillColor}
      strokeWidth={10}
      lineCap="round"
      lineJoin="round"
      opacity={0.85}
      listening={false}
    />
  );
};

// Road segment component
const RoadSegment: React.FC<{ road: RoadPath }> = ({ road }) => {
  const hasCenterLine = road.centerLineColor !== 'transparent' && road.width >= 10;

  return (
    <Group listening={false}>
      {/* Road base */}
      <Line
        points={road.points}
        stroke={road.color}
        strokeWidth={road.width}
        lineCap="round"
        lineJoin="round"
      />
      {/* Center dashed line */}
      {hasCenterLine && (
        <Line
          points={road.points}
          stroke={road.centerLineColor}
          strokeWidth={1.5}
          lineCap="round"
          lineJoin="round"
          dash={[8, 8]}
          opacity={0.6}
        />
      )}
    </Group>
  );
};

// Asset component with drag support
const AssetItem: React.FC<{
  asset: CanvasAsset;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  showLabels: boolean;
}> = ({ asset, isSelected, onSelect, onDragEnd, showLabels }) => {
  const imgSrc = `/assets/${asset.category}/${asset.type}.svg`;
  const img = useImage(imgSrc);

  if (!img) return null;

  const offsetX = asset.width / 2;
  const offsetY = asset.height / 2;

  return (
    <Group
      x={asset.x + offsetX}
      y={asset.y + offsetY}
      rotation={asset.rotation}
      draggable={!asset.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onDragEnd(asset.id, e.target.x() - offsetX, e.target.y() - offsetY);
      }}
      listening={!asset.locked}
    >
      <KonvaImage
        image={img}
        width={asset.width * asset.scaleX}
        height={asset.height * asset.scaleY}
        offsetX={offsetX * asset.scaleX}
        offsetY={offsetY * asset.scaleY}
        shadowBlur={isSelected ? 8 : 0}
        shadowColor="#bd93f9"
      />
      {/* Selection indicator */}
      {isSelected && (
        <Rect
          x={-offsetX * asset.scaleX - 3}
          y={-offsetY * asset.scaleY - 3}
          width={asset.width * asset.scaleX + 6}
          height={asset.height * asset.scaleY + 6}
          stroke="#bd93f9"
          strokeWidth={2}
          fill="transparent"
          dash={[4, 4]}
          listening={false}
        />
      )}
      {/* Label */}
      {showLabels && asset.labelVisible && asset.label && (
        <Text
          text={asset.label}
          fontSize={10}
          fill="#1a1a2e"
          fontFamily="'Segoe UI', sans-serif"
          fontStyle="bold"
          align="center"
          width={Math.max(asset.width * asset.scaleX + 20, 80)}
          x={-Math.max(asset.width * asset.scaleX + 20, 80) / 2 + offsetX * asset.scaleX - offsetX * asset.scaleX}
          y={asset.height * asset.scaleY / 2 + 2}
          listening={false}
          shadowBlur={3}
          shadowColor="#ffffff"
          shadowOpacity={0.8}
        />
      )}
    </Group>
  );
};

export const MapCanvas: React.FC<MapCanvasProps> = ({ stageRef, containerRef }) => {
  const {
    project, canvasState, selectedAssetId, activeTool, showLabels,
    selectAsset, updateAsset, setCanvasState
  } = useStore();

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Observe container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setStageSize({ width, height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [containerRef]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAssetId) useStore.getState().deleteAsset(selectedAssetId);
      }
      if (e.key === 'Escape') selectAsset(null);
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') useStore.getState().undo();
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) useStore.getState().redo();
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedAssetId) {
        e.preventDefault();
        useStore.getState().duplicateAsset(selectedAssetId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedAssetId, selectAsset]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.08;
    const oldScale = canvasState.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - canvasState.offsetX) / oldScale,
      y: (pointer.y - canvasState.offsetY) / oldScale,
    };

    const newScale = e.evt.deltaY < 0
      ? Math.min(oldScale * scaleBy, 6)
      : Math.max(oldScale / scaleBy, 0.15);

    setCanvasState({
      scale: newScale,
      offsetX: pointer.x - mousePointTo.x * newScale,
      offsetY: pointer.y - mousePointTo.y * newScale,
    });
  }, [canvasState, setCanvasState, stageRef]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'pan' || e.evt.button === 1) {
      isPanning.current = true;
      lastPos.current = { x: e.evt.clientX, y: e.evt.clientY };
    }
    if (e.target === stageRef.current || e.target.getLayer() === e.target.getStage()?.getLayers()[0]) {
      selectAsset(null);
    }
  }, [activeTool, selectAsset, stageRef]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning.current) return;
    const dx = e.evt.clientX - lastPos.current.x;
    const dy = e.evt.clientY - lastPos.current.y;
    lastPos.current = { x: e.evt.clientX, y: e.evt.clientY };
    setCanvasState({
      offsetX: canvasState.offsetX + dx,
      offsetY: canvasState.offsetY + dy,
    });
  }, [canvasState, setCanvasState]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    updateAsset(id, { x, y });
  }, [updateAsset]);

  // Sort assets by zIndex
  const sortedAssets = [...project.assets].sort((a, b) => a.zIndex - b.zIndex);

  const canvasW = canvasState.canvasWidth;
  const canvasH = canvasState.canvasHeight;

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="flex-1 overflow-hidden canvas-wrapper relative"
      style={{ cursor: activeTool === 'pan' ? 'grab' : 'default' }}
    >
      <Stage
        ref={stageRef as React.RefObject<Konva.Stage>}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={canvasState.scale}
        scaleY={canvasState.scale}
        x={canvasState.offsetX}
        y={canvasState.offsetY}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        draggable={false}
      >
        {/* Base layer - canvas background */}
        <Layer listening={false}>
          {/* Canvas background (rug surface) */}
          <Rect
            x={0}
            y={0}
            width={canvasW}
            height={canvasH}
            fill="#e8f0d8"
            cornerRadius={8}
          />
          {/* Rug border */}
          <Rect
            x={0}
            y={0}
            width={canvasW}
            height={canvasH}
            stroke="#c8a870"
            strokeWidth={12}
            fill="transparent"
            cornerRadius={8}
          />
          {/* Inner border */}
          <Rect
            x={8}
            y={8}
            width={canvasW - 16}
            height={canvasH - 16}
            stroke="#d4b880"
            strokeWidth={4}
            fill="transparent"
            cornerRadius={4}
          />

          {/* Green areas */}
          {project.greenAreas.map((area) => (
            <GreenAreaShape key={area.id} area={area} />
          ))}

          {/* Water features */}
          {project.waterFeatures.map((water) => (
            <WaterShape key={water.id} feature={water} />
          ))}

          {/* Roads - sorted by zIndex */}
          {[...project.roads]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((road) => (
              <RoadSegment key={road.id} road={road} />
            ))
          }
        </Layer>

        {/* Interactive asset layer */}
        <Layer>
          {sortedAssets.map((asset) => (
            <AssetItem
              key={asset.id}
              asset={asset}
              isSelected={asset.id === selectedAssetId}
              onSelect={() => selectAsset(asset.id)}
              onDragEnd={handleDragEnd}
              showLabels={showLabels}
            />
          ))}
        </Layer>
      </Stage>

      {/* Canvas info overlay */}
      <div className="absolute bottom-2 left-2 bg-[#1e1e2e]/80 text-[#6a6a7a] text-xs px-2 py-1 rounded flex items-center gap-3">
        <span>{canvasW} × {canvasH}px</span>
        <span>{project.rugDimension} ft</span>
        <span>{project.roads.length} roads</span>
        <span>{project.assets.length} assets</span>
      </div>
    </div>
  );
};
