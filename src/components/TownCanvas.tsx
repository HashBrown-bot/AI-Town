import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Agent, Building, ActiveInteractionBubble } from '../types/town';
import { ZoomIn, ZoomOut, Maximize2, Compass, Sun, Moon, CloudRain, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../utils/audioSystem';

interface TownCanvasProps {
  agents: Agent[];
  buildings: Building[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string | null) => void;
  activeInteractions: ActiveInteractionBubble[];
  simHour: number;
  simMinute: number;
  weather: 'clear' | 'golden_sunset' | 'rainy' | 'starry_night' | 'misty_morning';
}

export const TownCanvas: React.FC<TownCanvasProps> = ({
  agents,
  buildings,
  selectedAgentId,
  onSelectAgent,
  selectedBuildingId,
  onSelectBuilding,
  activeInteractions,
  simHour,
  weather,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport camera offset & zoom
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [followAgent, setFollowAgent] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(soundEngine.getIsPlaying());

  // Animation frame loop
  const animFrameRef = useRef<number | null>(null);
  const tickRef = useRef<number>(0);

  // Auto center or follow selected agent
  useEffect(() => {
    if (followAgent && selectedAgentId) {
      const targetAgent = agents.find(a => a.id === selectedAgentId);
      if (targetAgent && canvasRef.current) {
        const { width, height } = canvasRef.current;
        setPan({
          x: width / 2 - targetAgent.x * zoom,
          y: height / 2 - targetAgent.y * zoom,
        });
      }
    }
  }, [followAgent, selectedAgentId, agents, zoom]);

  // Center camera initially
  useEffect(() => {
    if (canvasRef.current) {
      const { width, height } = canvasRef.current;
      setPan({
        x: (width - 1000 * zoom) / 2,
        y: (height - 900 * zoom) / 2,
      });
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;
    setZoom(1.0);
    setPan({
      x: (width - 1000) / 2,
      y: (height - 900) / 2,
    });
    setFollowAgent(false);
  }, []);

  const toggleSound = () => {
    const playing = soundEngine.toggleMusic();
    setIsAudioPlaying(playing);
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: { x: number; y: number; speed: number; length: number; opacity: number }[] = [];
    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * 1100,
        y: Math.random() * 1000,
        speed: 1.5 + Math.random() * 3,
        length: 4 + Math.random() * 8,
        opacity: 0.2 + Math.random() * 0.5,
      });
    }

    const render = () => {
      tickRef.current += 1;
      const tick = tickRef.current;

      // Handle canvas resize to client bounds
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Disable anti-aliasing for crisp pixel art edges
      ctx.imageSmoothingEnabled = false;

      // Apply camera Pan & Zoom transform
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 1. Draw World Ground (Lush Grass Base + Stone Paths)
      drawGroundAndPaths(ctx);

      // 2. Draw Decorative Environment (Trees, Lanterns, Benches, Central Fountain)
      drawEnvironmentObjects(ctx, tick);

      // 3. Draw Buildings
      buildings.forEach(b => {
        drawPixelBuilding(ctx, b, b.id === selectedBuildingId, simHour);
      });

      // 4. Draw Characters (Agents) with walk cycles and tags
      // Sort agents by Y coordinate for correct isometric z-indexing!
      const sortedAgents = [...agents].sort((a, b) => a.y - b.y);
      sortedAgents.forEach(agent => {
        drawPixelAgent(ctx, agent, agent.id === selectedAgentId, tick);
      });

      // 5. Draw Speech & Thought Bubbles for active interactions
      activeInteractions.forEach(bubble => {
        drawInteractionSpeechBubble(ctx, bubble, tick);
      });

      // 6. Draw Ambient Particles (Rain or Pollen/Fireflies)
      drawWeatherParticles(ctx, weather, particles, tick);

      // 7. Dynamic Lighting & Time of Day Tint
      drawLightingOverlay(ctx, simHour, weather, 1100, 1000);

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [agents, buildings, selectedAgentId, selectedBuildingId, activeInteractions, zoom, pan, simHour, weather]);

  // Click & Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      setFollowAgent(false);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);

    // If mouse didn't drag far, treat as click to select agent or building
    const dragDistance = Math.hypot(e.clientX - pan.x - dragStart.x, e.clientY - pan.y - dragStart.y);
    if (dragDistance < 6 && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickWorldX = (e.clientX - rect.left - pan.x) / zoom;
      const clickWorldY = (e.clientY - rect.top - pan.y) / zoom;

      // Check click on agents first
      let clickedAgent: Agent | null = null;
      for (const agent of agents) {
        if (Math.hypot(agent.x - clickWorldX, agent.y - clickWorldY) < 24) {
          clickedAgent = agent;
          break;
        }
      }

      if (clickedAgent) {
        onSelectAgent(clickedAgent.id);
        onSelectBuilding(null);
        soundEngine.playClick();
        return;
      }

      // Check click on buildings
      let clickedBuilding: Building | null = null;
      for (const b of buildings) {
        if (
          clickWorldX >= b.x &&
          clickWorldX <= b.x + b.width &&
          clickWorldY >= b.y &&
          clickWorldY <= b.y + b.height
        ) {
          clickedBuilding = b;
          break;
        }
      }

      if (clickedBuilding) {
        onSelectBuilding(clickedBuilding.id);
        onSelectAgent(null);
        soundEngine.playClick();
      } else {
        // Clicked on empty ground
        onSelectAgent(null);
        onSelectBuilding(null);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(2.0, Math.max(0.6, zoom * zoomFactor));

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setPan({
        x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
      });
      setZoom(newZoom);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating HUD Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-1.5 shadow-xl">
        <button
          onClick={() => setZoom(prev => Math.min(2.0, prev + 0.15))}
          title="放大画布"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.6, prev - 0.15))}
          title="缩小画布"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCamera}
          title="重置视角居中"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-700 mx-1" />

        <button
          onClick={() => setFollowAgent(prev => !prev)}
          title={followAgent ? '取消视角跟随' : '视角跟随选中居民'}
          className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-medium ${
            followAgent && selectedAgentId
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span className="hidden sm:inline">跟随</span>
        </button>

        <button
          onClick={toggleSound}
          title={isAudioPlaying ? '静音小镇氛围音效' : '开启小镇轻柔环境背景音'}
          className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-medium ${
            isAudioPlaying
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          {isAudioPlaying ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline">{isAudioPlaying ? '环境音 播发中' : '环境音 静音'}</span>
        </button>
      </div>

      {/* Minimap / Legend Badge */}
      <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl px-3.5 py-2.5 shadow-xl text-xs flex items-center gap-4 text-slate-300">
        <div className="flex items-center gap-2">
          {simHour >= 6 && simHour < 18 ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
          <span className="font-mono text-slate-200 font-semibold">
            {String(simHour).padStart(2, '0')}:00
          </span>
        </div>
        <div className="h-3.5 w-px bg-slate-700" />
        <div className="flex items-center gap-1.5">
          {weather === 'rainy' && <CloudRain className="w-3.5 h-3.5 text-blue-400" />}
          <span className="capitalize text-slate-400">
            {weather === 'rainy' ? '微雨绵绵' : weather === 'golden_sunset' ? '落霞流金' : weather === 'starry_night' ? '星河璀璨' : '天朗气清'}
          </span>
        </div>
        <div className="h-3.5 w-px bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">居民共 <b>{agents.length}</b> 位</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Sub-renderers for Canvas
// ==========================================

function drawGroundAndPaths(ctx: CanvasRenderingContext2D) {
  // Ground grass base with checkered pixel grid
  ctx.fillStyle = '#0f241d';
  ctx.fillRect(0, 0, 1100, 1000);

  // Subtle grass texture tiles
  ctx.fillStyle = '#143026';
  for (let x = 0; x < 1100; x += 32) {
    for (let y = 0; y < 1000; y += 32) {
      if ((x / 32 + y / 32) % 2 === 0) {
        ctx.fillRect(x, y, 32, 32);
      }
    }
  }

  // Draw Cobblestone Main Avenue and Cross-walks
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;

  // Horizontal Cross Avenue
  ctx.fillRect(60, 270, 980, 56);
  ctx.strokeRect(60, 270, 980, 56);

  ctx.fillRect(60, 550, 980, 56);
  ctx.strokeRect(60, 550, 980, 56);

  // Vertical Connecting Avenues
  ctx.fillRect(210, 80, 56, 780);
  ctx.strokeRect(210, 80, 56, 780);

  ctx.fillRect(530, 80, 60, 780);
  ctx.strokeRect(530, 80, 60, 780);

  ctx.fillRect(815, 80, 56, 780);
  ctx.strokeRect(815, 80, 56, 780);

  // Cobblestone Texture Dots
  ctx.fillStyle = '#475569';
  for (let px = 80; px < 1020; px += 24) {
    for (let py = 280; py < 315; py += 12) {
      if ((px + py) % 7 === 0) ctx.fillRect(px, py, 6, 4);
    }
    for (let py = 560; py < 595; py += 12) {
      if ((px + py) % 7 === 0) ctx.fillRect(px, py, 6, 4);
    }
  }
}

function drawEnvironmentObjects(ctx: CanvasRenderingContext2D, tick: number) {
  // Central Park Lake/Fountain
  const cx = 560;
  const cy = 460;

  // Lawn around park
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.roundRect(440, 370, 240, 180, 16);
  ctx.fill();
  ctx.strokeStyle = '#047857';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Fountain Outer Basin (Stone)
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(cx, cy, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Fountain Water (Animated Ripples)
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, Math.PI * 2);
  ctx.fill();

  const rippleRadius = (tick * 0.4) % 36;
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Fountain Center Jet Spout
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  // Park Benches
  drawParkBench(ctx, 470, 420);
  drawParkBench(ctx, 620, 420);
  drawParkBench(ctx, 470, 500);
  drawParkBench(ctx, 620, 500);

  // Streetlamps along intersections
  drawStreetLamp(ctx, 210, 270, tick);
  drawStreetLamp(ctx, 870, 270, tick);
  drawStreetLamp(ctx, 210, 550, tick);
  drawStreetLamp(ctx, 870, 550, tick);
  drawStreetLamp(ctx, 530, 270, tick);
  drawStreetLamp(ctx, 530, 550, tick);

  // Pixel Pine & Oak Trees in courtyards
  drawPixelTree(ctx, 80, 150);
  drawPixelTree(ctx, 70, 720);
  drawPixelTree(ctx, 1000, 140);
  drawPixelTree(ctx, 990, 740);
  drawPixelTree(ctx, 400, 180);
  drawPixelTree(ctx, 690, 180);
}

function drawParkBench(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x, y, 32, 10);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(x + 2, y + 2, 28, 6);
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(x + 3, y + 10, 4, 6);
  ctx.fillRect(x + 25, y + 10, 4, 6);
}

function drawStreetLamp(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  // Post
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x + 6, y - 26, 4, 26);
  // Lantern head
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + 3, y - 32, 10, 7);

  // Warm light flicker
  const flicker = 0.8 + 0.2 * Math.sin(tick * 0.1 + x);
  ctx.fillStyle = `rgba(253, 224, 71, ${0.9 * flicker})`;
  ctx.fillRect(x + 5, y - 30, 6, 5);

  // Soft light radial glow on ground
  const radGrad = ctx.createRadialGradient(x + 8, y, 2, x + 8, y, 35);
  radGrad.addColorStop(0, `rgba(253, 224, 71, ${0.25 * flicker})`);
  radGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(x + 8, y, 35, 0, Math.PI * 2);
  ctx.fill();
}

function drawPixelTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Trunk
  ctx.fillStyle = '#451a03';
  ctx.fillRect(x + 14, y + 28, 10, 16);

  // Leaves foliage (3 layers of pixel green)
  ctx.fillStyle = '#065f46';
  ctx.beginPath();
  ctx.roundRect(x, y + 12, 38, 22, 6);
  ctx.fill();

  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.roundRect(x + 4, y, 30, 20, 5);
  ctx.fill();

  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.roundRect(x + 8, y - 8, 22, 16, 4);
  ctx.fill();
}

function drawPixelBuilding(
  ctx: CanvasRenderingContext2D,
  b: Building,
  isSelected: boolean,
  simHour: number
) {
  const isNight = simHour < 6 || simHour >= 19;

  // Building Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(b.x + 8, b.y + b.height - 4, b.width, 14);

  // Building Main Wall
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x, b.y + 30, b.width, b.height - 30);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.strokeRect(b.x, b.y + 30, b.width, b.height - 30);

  // Roof (Steep Gable or Hip Roof)
  ctx.fillStyle = b.roofColor;
  ctx.beginPath();
  ctx.moveTo(b.x - 10, b.y + 32);
  ctx.lineTo(b.x + b.width / 2, b.y);
  ctx.lineTo(b.x + b.width + 10, b.y + 32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Chimney & Smoke
  ctx.fillStyle = '#334155';
  ctx.fillRect(b.x + b.width - 32, b.y + 4, 14, 22);

  // Roof Ridge highlight
  ctx.strokeStyle = b.accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(b.x + b.width / 2 - 20, b.y + 10);
  ctx.lineTo(b.x + b.width / 2 + 20, b.y + 10);
  ctx.stroke();

  // Door
  const doorWidth = 24;
  const doorHeight = 36;
  const doorX = b.x + b.width / 2 - doorWidth / 2;
  const doorY = b.y + b.height - doorHeight;

  ctx.fillStyle = '#1c1917';
  ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 2;
  ctx.strokeRect(doorX, doorY, doorWidth, doorHeight);

  // Door Knob
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(doorX + doorWidth - 6, doorY + doorHeight / 2, 3, 3);

  // Windows (Glowing at night, light blue by day)
  const windowColor = isNight ? '#fde047' : '#93c5fd';
  const winW = 18;
  const winH = 22;

  // Left Window
  ctx.fillStyle = windowColor;
  ctx.fillRect(b.x + 18, b.y + 50, winW, winH);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x + 18, b.y + 50, winW, winH);

  // Right Window
  ctx.fillStyle = windowColor;
  ctx.fillRect(b.x + b.width - 18 - winW, b.y + 50, winW, winH);
  ctx.strokeRect(b.x + b.width - 18 - winW, b.y + 50, winW, winH);

  // Building Title Signboard
  ctx.fillStyle = '#0f172a';
  ctx.roundRect(b.x + 10, b.y + 24, b.width - 20, 20, 4);
  ctx.fill();
  ctx.strokeStyle = b.accentColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Sign Text & Icon
  ctx.fillStyle = '#f8fafc';
  ctx.font = '10px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${b.icon} ${b.name}`, b.x + b.width / 2, b.y + 38);

  // Selected Building Highlight Border
  if (isSelected) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8);
    ctx.setLineDash([]);
  }
}

function drawPixelAgent(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  isSelected: boolean,
  tick: number
) {
  const x = agent.x;
  const y = agent.y;

  // Walk cycle bobbing
  const bobY = agent.isMoving ? Math.sin(tick * 0.3) * 2 : 0;
  const legOffset = agent.isMoving ? Math.sin(tick * 0.3) * 3 : 0;

  // Selected aura ring
  if (isSelected) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 18, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Small pulsing indicator dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(x, y - 26, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Agent Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (Pants/Shoes)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x - 5, y + 4 + bobY, 4, 8 + legOffset);
  ctx.fillRect(x + 1, y + 4 + bobY, 4, 8 - legOffset);

  // Torso / Shirt (Custom resident color!)
  ctx.fillStyle = agent.spriteColor || '#3b82f6';
  ctx.fillRect(x - 7, y - 8 + bobY, 14, 13);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 7, y - 8 + bobY, 14, 13);

  // Head (Skin Tone)
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(x - 6, y - 20 + bobY, 12, 12);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 6, y - 20 + bobY, 12, 12);

  // Hair style / Hat
  ctx.fillStyle = agent.gender === '女' ? '#92400e' : '#451a03';
  ctx.fillRect(x - 7, y - 22 + bobY, 14, 5);
  if (agent.gender === '女') {
    ctx.fillRect(x - 8, y - 18 + bobY, 3, 8); // Hair side tuft
    ctx.fillRect(x + 5, y - 18 + bobY, 3, 8);
  }

  // Eyes facing direction
  ctx.fillStyle = '#0f172a';
  if (agent.direction === 'right') {
    ctx.fillRect(x + 1, y - 16 + bobY, 2, 3);
  } else if (agent.direction === 'left') {
    ctx.fillRect(x - 4, y - 16 + bobY, 2, 3);
  } else {
    ctx.fillRect(x - 3, y - 16 + bobY, 2, 2);
    ctx.fillRect(x + 1, y - 16 + bobY, 2, 2);
  }

  // Name Tag above head
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.roundRect(x - 28, y - 36, 56, 15, 4);
  ctx.fill();
  ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(agent.name, x, y - 25);

  // Selected Agent Action & Goal Indicator Tag
  if (isSelected && (agent.goal || agent.currentActivity)) {
    const actionLabel = agent.goal?.title || agent.currentActivity;
    const shortLabel = actionLabel.length > 15 ? actionLabel.slice(0, 14) + '…' : actionLabel;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.roundRect(x - 52, y - 53, 104, 14, 4);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🎯 ${shortLabel}`, x, y - 43);
  }
}

function drawInteractionSpeechBubble(
  ctx: CanvasRenderingContext2D,
  bubble: ActiveInteractionBubble,
  tick: number
) {
  const x = bubble.x;
  const y = bubble.y - 45;

  const bubbleWidth = 160;
  const bubbleHeight = 44;

  // Bubble background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.beginPath();
  ctx.roundRect(x - bubbleWidth / 2, y - bubbleHeight, bubbleWidth, bubbleHeight, 8);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Speech bubble pointer triangle pointing down
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x, y + 8);
  ctx.closePath();
  ctx.fill();

  // Speaker name
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(bubble.speakerName || '交流中', x - bubbleWidth / 2 + 10, y - bubbleHeight + 14);

  // Topic badge
  ctx.fillStyle = '#94a3b8';
  ctx.font = '8px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(bubble.topic, x + bubbleWidth / 2 - 10, y - bubbleHeight + 14);

  // Spoken text line or ellipsis
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';

  const speechText = bubble.currentSpeech
    ? (bubble.currentSpeech.length > 20 ? bubble.currentSpeech.slice(0, 19) + '…' : bubble.currentSpeech)
    : '💬 正在交换心声' + '.'.repeat((Math.floor(tick / 15) % 4));

  ctx.fillText(speechText, x - bubbleWidth / 2 + 10, y - bubbleHeight + 30);
}

function drawWeatherParticles(
  ctx: CanvasRenderingContext2D,
  weather: string,
  particles: { x: number; y: number; speed: number; length: number; opacity: number }[],
  tick: number
) {
  if (weather === 'rainy') {
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
    ctx.lineWidth = 1.5;
    particles.forEach(p => {
      p.y += p.speed;
      p.x -= 0.6; // slight diagonal wind
      if (p.y > 1000) p.y = 0;
      if (p.x < 0) p.x = 1100;

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 2, p.y + p.length);
      ctx.stroke();
    });
  } else {
    // Gentle floating pollen / fireflies
    particles.slice(0, 25).forEach((p, idx) => {
      const floatX = p.x + Math.sin(tick * 0.02 + idx) * 15;
      const floatY = (p.y - tick * 0.3) % 1000;
      const alpha = 0.3 + 0.3 * Math.sin(tick * 0.05 + idx);

      ctx.fillStyle = weather === 'starry_night'
        ? `rgba(253, 224, 71, ${alpha})`
        : `rgba(240, 253, 250, ${alpha * 0.5})`;

      ctx.beginPath();
      ctx.arc(floatX, floatY < 0 ? floatY + 1000 : floatY, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function drawLightingOverlay(
  ctx: CanvasRenderingContext2D,
  hour: number,
  weather: string,
  width: number,
  height: number
) {
  // Compute lighting overlay color based on time of day
  let tintColor = 'rgba(0, 0, 0, 0)';

  if (hour >= 20 || hour < 5) {
    // Deep midnight indigo
    tintColor = 'rgba(10, 15, 35, 0.52)';
  } else if (hour >= 5 && hour < 7) {
    // Dawn gentle pink/amber
    tintColor = 'rgba(251, 146, 60, 0.18)';
  } else if (hour >= 17 && hour < 20) {
    // Sunset orange glow
    tintColor = 'rgba(180, 83, 9, 0.25)';
  } else if (weather === 'rainy') {
    // Overcast grey-blue
    tintColor = 'rgba(30, 41, 59, 0.28)';
  }

  if (tintColor !== 'rgba(0, 0, 0, 0)') {
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, width, height);
  }
}
