import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Stage, Layer, Line, Rect, Image as KonvaImage, Text, Group, Shape as KonvaShape
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

// ─── Green area shape ─────────────────────────────────────────────────────────

const GREEN_COLORS: Record<string, { fill: string; stroke: string }> = {
  forest:  { fill: '#7a9e5c', stroke: '#5a7e3c' },
  garden:  { fill: '#8aba62', stroke: '#6a9a42' },
  park:    { fill: '#9ac870', stroke: '#7aaa50' },
  grass:   { fill: '#a8cc7c', stroke: '#88ac5c' },
};

const GreenAreaShape: React.FC<{ area: GreenArea }> = ({ area }) => {
  const { fill, stroke } = GREEN_COLORS[area.type] ?? GREEN_COLORS.park;
  return (
    <Line
      points={area.points}
      closed
      fill={fill}
      stroke={stroke}
      strokeWidth={1.5}
      opacity={0.75}
      listening={false}
    />
  );
};

// ─── Water shape ──────────────────────────────────────────────────────────────

const WaterShape: React.FC<{
  feature: WaterFeature;
  canvasW: number;
  canvasH: number;
}> = ({ feature, canvasW, canvasH }) => {
  if (feature.type === 'coastline') {
    const beach = feature.beachPoints ?? feature.points;
    if (beach.length < 4) return null;

    // Determine which side is water from the X values of the beach line.
    // We use min/max X rather than avg to get the actual shore boundary.
    const xVals = beach.filter((_, i) => i % 2 === 0);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const midX = (minX + maxX) / 2;
    const waterOnRight = midX > canvasW * 0.4;

    // Fill rectangle extends 40% of canvas width past the beach line so the
    // lake is always prominent. Land features (green areas, roads) render on
    // top in the Layer below — they naturally cover any inland overshoot.
    const extension  = canvasW * 0.4;
    const fillX      = waterOnRight ? Math.max(0, minX - extension) : 0;
    const fillWidth  = waterOnRight ? canvasW - fillX               : Math.min(canvasW, maxX + extension);
    const waveStartX = waterOnRight ? Math.max(fillX + 5, minX - extension + 10) : fillX + 5;
    const waveEndX   = waterOnRight ? canvasW - 5                   : Math.min(canvasW - 5, maxX + extension - 10);

    return (
      <Group listening={false}>
        {/* Main water fill rectangle */}
        <Rect
          x={fillX}
          y={0}
          width={fillWidth}
          height={canvasH}
          fill="#6aaede"
          opacity={0.88}
        />
        {/* Subtle wave lines */}
        <Group opacity={0.18}>
          {[0.12, 0.27, 0.42, 0.58, 0.73, 0.88].map((t, i) => (
            <Line
              key={i}
              points={[waveStartX, canvasH * t, waveEndX, canvasH * t]}
              stroke="#ffffff"
              strokeWidth={1.5}
              dash={[14, 9]}
              lineCap="round"
              listening={false}
            />
          ))}
        </Group>
        {/* Beach / sand strip along the actual shoreline */}
        <Line
          points={beach}
          stroke="#e0cfa0"
          strokeWidth={14}
          lineCap="round"
          lineJoin="round"
          opacity={0.95}
          listening={false}
        />
        {/* Thin water-edge line on top of sand */}
        <Line
          points={beach}
          stroke="#5a9ed0"
          strokeWidth={3}
          lineCap="round"
          lineJoin="round"
          opacity={0.7}
          listening={false}
        />
      </Group>
    );
  }

  if (feature.type === 'river') {
    return (
      <Line
        points={feature.points}
        stroke="#6aaede"
        strokeWidth={12}
        lineCap="round"
        lineJoin="round"
        opacity={0.85}
        listening={false}
      />
    );
  }

  // Lake / pond — closed polygon
  return (
    <Group listening={false}>
      <Line
        points={feature.points}
        closed
        fill="#6aaede"
        stroke="#4a8ec0"
        strokeWidth={1.5}
        opacity={0.85}
        listening={false}
      />
      <Line
        points={feature.points}
        closed
        fill="transparent"
        stroke="#8cc8f0"
        strokeWidth={1}
        dash={[6, 10]}
        opacity={0.25}
        listening={false}
      />
    </Group>
  );
};

// ─── Road segment ─────────────────────────────────────────────────────────────

const RoadSegment: React.FC<{ road: RoadPath }> = ({ road }) => {
  const hasCenterLine = road.centerLineColor !== 'transparent' && road.width >= 10;

  return (
    <Group listening={false}>
      {/* Road casing (subtle outline) */}
      <Line
        points={road.points}
        stroke="#9a9278"
        strokeWidth={road.width + 2}
        lineCap="round"
        lineJoin="round"
        opacity={0.35}
      />
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
          opacity={0.5}
        />
      )}
    </Group>
  );
};

// ─── Asset item ───────────────────────────────────────────────────────────────

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
  const isLandmark = ['school', 'hospital', 'library', 'fire-station', 'church'].includes(asset.type);

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
      {/* Drop shadow for depth */}
      <KonvaImage
        image={img}
        width={asset.width * asset.scaleX}
        height={asset.height * asset.scaleY}
        offsetX={offsetX * asset.scaleX}
        offsetY={offsetY * asset.scaleY}
        shadowBlur={isLandmark ? 8 : 4}
        shadowColor={isSelected ? '#bd93f9' : 'rgba(0,0,0,0.35)'}
        shadowOffsetX={2}
        shadowOffsetY={3}
        shadowOpacity={isSelected ? 0.8 : 0.5}
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
      {/* Label with white halo for readability */}
      {showLabels && asset.labelVisible && asset.label && (
        <>
          <Text
            text={asset.label}
            fontSize={isLandmark ? 11 : 9}
            fill="#ffffff"
            fontFamily="'Segoe UI', Arial, sans-serif"
            fontStyle="bold"
            align="center"
            width={Math.max(asset.width * asset.scaleX + 20, 90)}
            x={-Math.max(asset.width * asset.scaleX + 20, 90) / 2 + offsetX * asset.scaleX - offsetX * asset.scaleX}
            y={asset.height * asset.scaleY / 2 + 2}
            listening={false}
            strokeWidth={3}
            stroke="#ffffff"
          />
          <Text
            text={asset.label}
            fontSize={isLandmark ? 11 : 9}
            fill="#21213a"
            fontFamily="Inter, 'Segoe UI', Arial, sans-serif"
            fontStyle="bold"
            align="center"
            width={Math.max(asset.width * asset.scaleX + 20, 90)}
            x={-Math.max(asset.width * asset.scaleX + 20, 90) / 2 + offsetX * asset.scaleX - offsetX * asset.scaleX}
            y={asset.height * asset.scaleY / 2 + 2}
            listening={false}
          />
        </>
      )}
    </Group>
  );
};

// ─── Ground texture (noise pattern via canvas) ────────────────────────────────

function createGroundTexture(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // Use a small tile that repeats
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, 200, 200);
  // Subtle stipple
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 200;
    const y = Math.random() * 200;
    const alpha = Math.random() * 0.06 + 0.01;
    ctx.fillStyle = `rgba(80, 70, 40, ${alpha})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  return canvas;
}

// ─── Main canvas component ────────────────────────────────────────────────────

export const MapCanvas: React.FC<MapCanvasProps> = ({ stageRef, containerRef }) => {
  const {
    project, canvasState, selectedAssetId, activeTool, showLabels,
    selectAsset, updateAsset, setCanvasState
  } = useStore();

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [groundTexture, setGroundTexture] = useState<HTMLCanvasElement | null>(null);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

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

  // Generate ground texture once
  useEffect(() => {
    const tex = createGroundTexture(canvasState.canvasWidth, canvasState.canvasHeight);
    setGroundTexture(tex);
  }, [canvasState.canvasWidth, canvasState.canvasHeight]);

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

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    updateAsset(id, { x, y });
  }, [updateAsset]);

  const sortedAssets = [...project.assets].sort((a, b) => a.zIndex - b.zIndex);
  const canvasW = canvasState.canvasWidth;
  const canvasH = canvasState.canvasHeight;

  // Border dimensions
  const BORDER_OUTER = 14;
  const BORDER_MID = 20;
  const BORDER_INNER = 26;

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
        {/* ── Layer 1: Background, map content ── */}
        <Layer listening={false}>
          {/* Rug background — sage green */}
          <Rect
            x={0}
            y={0}
            width={canvasW}
            height={canvasH}
            fill="#c8d4a8"
            cornerRadius={6}
          />

          {/* Ground texture overlay */}
          {groundTexture && (
            <KonvaShape
              sceneFunc={(ctx, shape) => {
                const pattern = ctx._context.createPattern(groundTexture, 'repeat');
                if (pattern) {
                  ctx._context.fillStyle = pattern;
                  ctx._context.fillRect(0, 0, canvasW, canvasH);
                }
                shape.getLayer()?.batchDraw();
              }}
              opacity={0.45}
              listening={false}
            />
          )}

          {/* Coastline water fill — rendered FIRST so land features paint over inland overshoot */}
          {project.waterFeatures
            .filter(w => w.type === 'coastline')
            .map(water => (
              <WaterShape key={water.id} feature={water} canvasW={canvasW} canvasH={canvasH} />
            ))}

          {/* Green areas (on top of coastline water) */}
          {project.greenAreas.map((area) => (
            <GreenAreaShape key={area.id} area={area} />
          ))}

          {/* Rivers, lakes, ponds (after green areas) */}
          {project.waterFeatures
            .filter(w => w.type !== 'coastline')
            .map(water => (
              <WaterShape key={water.id} feature={water} canvasW={canvasW} canvasH={canvasH} />
            ))}

          {/* Roads — sorted by zIndex */}
          {[...project.roads]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((road) => (
              <RoadSegment key={road.id} road={road} />
            ))
          }
        </Layer>

        {/* ── Layer 2: Interactive assets ── */}
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

        {/* ── Layer 3: Decorative border (always on top) ── */}
        <Layer listening={false}>
          {/* Outer border */}
          <Rect
            x={0}
            y={0}
            width={canvasW}
            height={canvasH}
            stroke="#8a7848"
            strokeWidth={BORDER_OUTER}
            fill="transparent"
            cornerRadius={6}
          />
          {/* Mid border */}
          <Rect
            x={BORDER_MID / 2}
            y={BORDER_MID / 2}
            width={canvasW - BORDER_MID}
            height={canvasH - BORDER_MID}
            stroke="#c8a870"
            strokeWidth={3}
            fill="transparent"
            cornerRadius={4}
          />
          {/* Inner decorative line */}
          <Rect
            x={BORDER_INNER / 2}
            y={BORDER_INNER / 2}
            width={canvasW - BORDER_INNER}
            height={canvasH - BORDER_INNER}
            stroke="#d4bc88"
            strokeWidth={1.5}
            fill="transparent"
            cornerRadius={3}
            dash={[6, 4]}
            opacity={0.7}
          />
        </Layer>
      </Stage>

      {/* Canvas info overlay */}
      <div className="absolute bottom-2 left-2 bg-[#1c1c2e]/80 text-slate-500 text-xs px-2 py-1 rounded flex items-center gap-3">
        <span>{canvasW} × {canvasH}px</span>
        <span>{project.rugDimension} ft</span>
        <span>{project.roads.length} roads</span>
        <span>{project.assets.length} assets</span>
      </div>
    </div>
  );
};
