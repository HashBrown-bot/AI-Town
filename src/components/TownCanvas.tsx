import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Agent, Building, ActiveInteractionBubble } from '../types/town';
import { ZoomIn, ZoomOut, Maximize2, Compass, Sun, Moon, CloudRain, Volume2, VolumeX, Sparkles, Feather, Coffee } from 'lucide-react';
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
  simMinute,
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
        x: (width - 1100 * zoom) / 2,
        y: (height - 950 * zoom) / 2,
      });
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;
    setZoom(1.0);
    setPan({
      x: (width - 1100) / 2,
      y: (height - 950) / 2,
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

    // Environmental particles: leaves, petals, fireflies
    const ambientParticles: { x: number; y: number; speedX: number; speedY: number; size: number; color: string; rotation: number }[] = [];
    for (let i = 0; i < 45; i++) {
      ambientParticles.push({
        x: Math.random() * 1150,
        y: Math.random() * 1000,
        speedX: -0.3 - Math.random() * 0.7,
        speedY: 0.4 + Math.random() * 0.8,
        size: 2.5 + Math.random() * 2.5,
        color: ['#f28cb1', '#ffc97a', '#71c68b', '#ffe8c2'][Math.floor(Math.random() * 4)],
        rotation: Math.random() * Math.PI * 2
      });
    }

    // Chimney smoke particles
    const smokePuffs: { x: number; y: number; originX: number; originY: number; size: number; alpha: number; age: number; maxAge: number }[] = [];
    const chimneyOrigins = [
      { x: 300, y: 395 }, // Cafe chimney
      { x: 420, y: 700 }, // Bakery chimney
      { x: 890, y: 690 }, // Cottages chimney
      { x: 670, y: 110 }, // Town Hall chimney
    ];

    const render = () => {
      tickRef.current += 1;
      const tick = tickRef.current;

      // Handle canvas resize
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Disable blurry smoothing for crisp pixel aesthetics
      ctx.imageSmoothingEnabled = false;

      // Apply camera Pan & Zoom transform
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 1. Draw World Ground (Cozy Grass, River, Wooden Bridge, Stone Paths)
      drawCozyGroundAndWaters(ctx, tick);

      // 2. Draw Decorative Environment (Fountain, Benches, Flowerbeds, Trees, Lampposts, Little Animals)
      drawCozyEnvironment(ctx, tick, simHour);

      // 3. Draw Chimney Smoke (behind high roof elements)
      updateAndDrawSmoke(ctx, smokePuffs, chimneyOrigins, tick);

      // 4. Draw Buildings (Rich architectural pixel art)
      buildings.forEach(b => {
        drawFantasyBuilding(ctx, b, b.id === selectedBuildingId, simHour, tick);
      });

      // 5. Draw Characters (Agents) sorted by Y coordinate for correct depth layering
      const sortedAgents = [...agents].sort((a, b) => a.y - b.y);
      sortedAgents.forEach(agent => {
        drawFantasyAgent(ctx, agent, agent.id === selectedAgentId, tick);
      });

      // 6. Draw Speech & Thought Bubbles for active interactions
      activeInteractions.forEach(bubble => {
        drawCozyInteractionBubble(ctx, bubble, tick);
      });

      // 7. Ambient Floating Particles (Petals, Leaves, Rain, Fireflies)
      drawAmbientParticles(ctx, weather, ambientParticles, tick, simHour);

      // 8. Soft Atmosphere Lighting & Day/Night Celestial Overlay
      drawCelestialLighting(ctx, simHour, weather, 1150, 1000);

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

  // Mouse Interaction Handlers for Panning & Inspecting
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
    setFollowAgent(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.max(0.6, Math.min(2.2, zoom * zoomFactor));

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

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;

    // Check hit on agents (radius ~ 22px)
    let hitAgent = false;
    for (let i = agents.length - 1; i >= 0; i--) {
      const a = agents[i];
      const dist = Math.hypot(a.x - clickX, (a.y - 4) - clickY);
      if (dist < 24) {
        soundEngine.playClick();
        onSelectAgent(a.id);
        onSelectBuilding(null);
        hitAgent = true;
        break;
      }
    }

    if (hitAgent) return;

    // Check hit on buildings
    let hitBuilding = false;
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if (
        clickX >= b.x - 8 &&
        clickX <= b.x + b.width + 8 &&
        clickY >= b.y - 12 &&
        clickY <= b.y + b.height + 8
      ) {
        soundEngine.playClick();
        onSelectBuilding(b.id);
        onSelectAgent(null);
        hitBuilding = true;
        break;
      }
    }

    if (!hitBuilding) {
      onSelectAgent(null);
      onSelectBuilding(null);
    }
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#151d33]">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Floating Game HUD Controls (Top Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 game-panel p-2 shadow-xl z-10">
        <button
          onClick={() => {
            soundEngine.playClick();
            setZoom(z => Math.min(2.0, z + 0.15));
          }}
          title="放大视角"
          className="p-2 rounded-xl text-[#c9c5d1] hover:text-[#fff1d6] hover:bg-[#344672]/50 transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setZoom(z => Math.max(0.65, z - 0.15));
          }}
          title="缩小视角"
          className="p-2 rounded-xl text-[#c9c5d1] hover:text-[#fff1d6] hover:bg-[#344672]/50 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-[#4a5f8c]/40" />

        <button
          onClick={() => {
            soundEngine.playClick();
            handleResetCamera();
          }}
          title="镜头重置居中"
          className="p-2 rounded-xl text-[#c9c5d1] hover:text-[#fff1d6] hover:bg-[#344672]/50 transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            setFollowAgent(!followAgent);
          }}
          disabled={!selectedAgentId}
          title={selectedAgentId ? '视角锁定跟随该居民' : '请先选中小镇居民'}
          className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
            followAgent && selectedAgentId
              ? 'bg-[#ffb86b]/20 text-[#ffc97a] border border-[#ffb86b]/40 shadow-xs'
              : 'text-[#8f93a8] hover:text-[#f8f2e7] hover:bg-[#344672]/50 disabled:opacity-30'
          }`}
        >
          <Compass className={`w-4 h-4 ${followAgent ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">镜头追踪</span>
        </button>

        <div className="h-4 w-px bg-[#4a5f8c]/40" />

        <button
          onClick={toggleSound}
          title={isAudioPlaying ? '静音治愈氛围音' : '开启小镇治愈环境音'}
          className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold ${
            isAudioPlaying
              ? 'bg-[#71c68b]/20 text-[#91d69d] border border-[#71c68b]/40'
              : 'text-[#8f93a8] hover:text-[#f8f2e7] hover:bg-[#344672]/50'
          }`}
        >
          {isAudioPlaying ? <Volume2 className="w-4 h-4 text-[#71c68b]" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline">{isAudioPlaying ? '氛围音 演奏中' : '静音'}</span>
        </button>
      </div>

      {/* Cozy Town Status Pill (Bottom Left) */}
      <div className="absolute bottom-5 left-5 game-panel px-4 py-2.5 shadow-2xl text-xs flex items-center gap-3.5 text-[#c9c5d1] z-10 border border-[#485e8a]/40">
        <div className="flex items-center gap-2">
          {simHour >= 6 && simHour < 18 ? (
            <Sun className="w-4 h-4 text-[#ffc97a] animate-pulse" />
          ) : (
            <Moon className="w-4 h-4 text-[#b9a6ff]" />
          )}
          <span className="font-mono text-[#f8f2e7] font-bold text-xs tracking-wider">
            {String(simHour).padStart(2, '0')}:{String(simMinute).padStart(2, '0')}
          </span>
        </div>

        <div className="h-3.5 w-px bg-[#4a5f8c]/40" />

        <div className="flex items-center gap-1.5 text-[#fff1d6]">
          <Sparkles className="w-3.5 h-3.5 text-[#ffc97a]" />
          <span className="font-medium">
            {weather === 'rainy' ? '微雨润物' : weather === 'golden_sunset' ? '落霞流金' : weather === 'starry_night' ? '星河璀璨' : weather === 'misty_morning' ? '晨雾微光' : '天朗气清'}
          </span>
        </div>

        <div className="h-3.5 w-px bg-[#4a5f8c]/40" />

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#71c68b] shadow-[0_0_8px_#71c68b]" />
          <span className="text-[#c9c5d1]">
            居民 <strong className="text-[#f8f2e7] font-bold">{agents.length}</strong> 位
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Cozy Ground & Meandering Waterway Painting
// ==========================================

function drawCozyGroundAndWaters(ctx: CanvasRenderingContext2D, tick: number) {
  // Base lush grass field
  ctx.fillStyle = '#204834';
  ctx.fillRect(0, 0, 1150, 1000);

  // Soft textured grass patches with rich meadow green variations
  ctx.fillStyle = '#25543c';
  for (let x = 0; x < 1150; x += 40) {
    for (let y = 0; y < 1000; y += 40) {
      if ((Math.sin(x * 0.05) + Math.cos(y * 0.05)) > 0.2) {
        ctx.fillRect(x, y, 40, 40);
      }
    }
  }

  // Scattered clover tufts & tiny wildflowers
  ctx.fillStyle = '#3a7554';
  for (let i = 0; i < 90; i++) {
    const fx = (i * 123 + 47) % 1130;
    const fy = (i * 241 + 19) % 970;
    ctx.fillRect(fx, fy, 4, 3);
    ctx.fillRect(fx + 2, fy - 2, 3, 3);
  }

  // Draw Meandering Stream (Flowing from x: 130, y: 0 down to x: 200, y: 1000)
  ctx.save();
  // River Bed Shadow
  ctx.strokeStyle = '#183828';
  ctx.lineWidth = 48;
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.bezierCurveTo(100, 260, 200, 480, 150, 720);
  ctx.bezierCurveTo(120, 840, 180, 920, 200, 1000);
  ctx.stroke();

  // Water Surface (Crystal Cyan / Deep Teal)
  ctx.strokeStyle = '#2d848a';
  ctx.lineWidth = 42;
  ctx.stroke();

  // Sparkling animated river current lines
  ctx.strokeStyle = 'rgba(126, 225, 207, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 28]);
  ctx.lineDashOffset = -tick * 0.8;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 36]);
  ctx.lineDashOffset = -tick * 1.2;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Lily pads in the river with tiny flowers
  drawLilyPad(ctx, 130, 210, tick);
  drawLilyPad(ctx, 160, 440, tick + 20);
  drawLilyPad(ctx, 145, 680, tick + 40);
  drawLilyPad(ctx, 185, 870, tick + 60);

  // River Pebble banks
  ctx.fillStyle = '#6b7d6a';
  const pebbles = [
    [105, 120], [170, 140], [115, 350], [195, 380], 
    [125, 590], [180, 610], [130, 810], [215, 840]
  ];
  pebbles.forEach(([px, py]) => {
    ctx.beginPath();
    ctx.ellipse(px, py, 4, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Cobblestone Main Avenues (Warm Slate Gray with Organic Flags)
  ctx.fillStyle = '#414d66';
  ctx.strokeStyle = '#323c52';
  ctx.lineWidth = 2;

  // Horizontal Cross Avenue
  ctx.fillRect(70, 270, 980, 52);
  ctx.strokeRect(70, 270, 980, 52);

  ctx.fillRect(70, 550, 980, 52);
  ctx.strokeRect(70, 550, 980, 52);

  // Vertical Connecting Avenues
  ctx.fillRect(210, 80, 52, 790);
  ctx.strokeRect(210, 80, 52, 790);

  ctx.fillRect(530, 80, 58, 790);
  ctx.strokeRect(530, 80, 58, 790);

  ctx.fillRect(815, 80, 52, 790);
  ctx.strokeRect(815, 80, 52, 790);

  // Decorative Cobblestone Paving Stones
  ctx.fillStyle = '#596885';
  for (let px = 85; px < 1030; px += 26) {
    for (let py = 278; py < 316; py += 14) {
      if ((px * 3 + py * 7) % 5 === 0) {
        ctx.fillRect(px, py, 7, 5);
      }
    }
    for (let py = 558; py < 596; py += 14) {
      if ((px * 3 + py * 7) % 5 === 0) {
        ctx.fillRect(px, py, 7, 5);
      }
    }
  }

  // Wooden Arched Footbridge Crossing the River at (x: 105 ~ 170, y: 265 ~ 325)
  drawWoodenBridge(ctx, 100, 260, 75, 72);
}

function drawLilyPad(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  const bobY = Math.sin(tick * 0.05) * 1.5;
  ctx.fillStyle = '#2b7852';
  ctx.beginPath();
  ctx.arc(x, y + bobY, 7, 0.3, Math.PI * 1.85);
  ctx.lineTo(x, y + bobY);
  ctx.closePath();
  ctx.fill();

  // Pink mini lotus flower
  ctx.fillStyle = '#ff9ec4';
  ctx.beginPath();
  ctx.arc(x - 1, y - 2 + bobY, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe8c2';
  ctx.beginPath();
  ctx.arc(x - 1, y - 2 + bobY, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawWoodenBridge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Bridge Shadow
  ctx.fillStyle = 'rgba(10, 25, 20, 0.45)';
  ctx.fillRect(x, y + h - 6, w, 10);

  // Bridge Planks
  ctx.fillStyle = '#784d2b';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#4e3019';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Planks lines
  ctx.strokeStyle = '#5c3a1e';
  ctx.lineWidth = 1.5;
  for (let px = x + 8; px < x + w; px += 9) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
    ctx.stroke();
  }

  // Wooden Handrails Top & Bottom
  ctx.fillStyle = '#9c663b';
  ctx.fillRect(x - 2, y - 3, w + 4, 6);
  ctx.fillRect(x - 2, y + h - 3, w + 4, 6);
  ctx.strokeStyle = '#4e3019';
  ctx.strokeRect(x - 2, y - 3, w + 4, 6);
  ctx.strokeRect(x - 2, y + h - 3, w + 4, 6);

  // Railing Posts
  for (let px = x; px <= x + w; px += 24) {
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(px, y - 5, 4, 8);
    ctx.fillRect(px, y + h - 3, 4, 8);
  }
}

// ==========================================
// Cozy Environment Props (Plaza, Trees, Flowers, Lamps)
// ==========================================

function drawCozyEnvironment(ctx: CanvasRenderingContext2D, tick: number, simHour: number) {
  const isNight = simHour < 6 || simHour >= 19;

  // 1. Central Plaza (Paved stone courtyard)
  const cx = 560;
  const cy = 460;

  // Circular Cobblestone Courtyard Plaza
  ctx.fillStyle = '#485573';
  ctx.beginPath();
  ctx.arc(cx, cy, 95, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#63749c';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner flagstone pattern
  ctx.strokeStyle = '#38435c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 68, 0, Math.PI * 2);
  ctx.stroke();

  // Tiered Stone Fountain
  // Outer Basin
  ctx.fillStyle = '#566585';
  ctx.beginPath();
  ctx.arc(cx, cy, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8093bd';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Basin Water
  ctx.fillStyle = '#3296a8';
  ctx.beginPath();
  ctx.arc(cx, cy, 41, 0, Math.PI * 2);
  ctx.fill();

  // Animated Water Ripples
  const rippleRadius = (tick * 0.45) % 36;
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Upper Pedestal
  ctx.fillStyle = '#6b7c9e';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9eb1db';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Jet Spout with Sparkling water droplets
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();

  for (let a = 0; a < 4; a++) {
    const angle = (tick * 0.08) + (a * Math.PI / 2);
    const dropDist = 12 + Math.sin(tick * 0.15 + a) * 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * dropDist, cy + Math.sin(angle) * dropDist, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Plaza Flowerbeds (North, South, East, West)
  drawFlowerBed(ctx, cx - 110, cy - 25, 20, 50, '#ff9ec4', '#f7a76c');
  drawFlowerBed(ctx, cx + 90, cy - 25, 20, 50, '#9d8cff', '#7ce1cf');

  // Cozy Park Benches
  drawCozyBench(ctx, cx - 65, cy - 75, true);
  drawCozyBench(ctx, cx + 35, cy - 75, true);
  drawCozyBench(ctx, cx - 65, cy + 65, false);
  drawCozyBench(ctx, cx + 35, cy + 65, false);

  // Streetlamps with warm ambient glow
  const lamps = [
    [210, 270], [815, 270], [530, 270],
    [210, 550], [815, 550], [530, 550],
    [380, 270], [680, 270]
  ];
  lamps.forEach(([lx, ly]) => {
    drawFantasyLamp(ctx, lx, ly, tick, isNight);
  });

  // Trees & Flowering Foliage
  // Cherry Blossom Pink Tree
  drawSakuraTree(ctx, 360, 160, tick);
  drawSakuraTree(ctx, 720, 160, tick + 15);
  // Lush Apple / Oak Trees
  drawCozyOakTree(ctx, 75, 140, tick);
  drawCozyOakTree(ctx, 65, 730, tick + 30);
  drawCozyOakTree(ctx, 1010, 130, tick + 10);
  drawCozyOakTree(ctx, 1000, 750, tick + 25);
  // Pine Trees in upper courtyards
  drawPineTree(ctx, 420, 130);
  drawPineTree(ctx, 640, 130);

  // Wooden garden fence sections
  drawWoodFence(ctx, 880, 640, 70);
  drawWoodFence(ctx, 290, 345, 60);

  // Directional Signpost at Main Crossroads
  drawTownSignpost(ctx, 510, 260);

  // Little hopping bunny in the grass
  drawPixelBunny(ctx, 430, 480, tick);
  // Bird perched on fence
  drawPixelBird(ctx, 895, 635, tick);
}

function drawCozyBench(ctx: CanvasRenderingContext2D, x: number, y: number, facingDown: boolean) {
  // Bench Slats (Warm honey wood)
  ctx.fillStyle = '#8a532d';
  ctx.fillRect(x, y, 32, 10);
  ctx.fillStyle = '#b87742';
  ctx.fillRect(x + 2, y + 2, 28, 6);
  // Cast Iron Armrests
  ctx.fillStyle = '#262f40';
  ctx.fillRect(x, y, 3, 14);
  ctx.fillRect(x + 29, y, 3, 14);
}

function drawFlowerBed(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c1: string, c2: string) {
  // Rich Soil Bed
  ctx.fillStyle = '#302217';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = '#543b29';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Green Foliage
  ctx.fillStyle = '#2b6e44';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 4);
  ctx.fill();

  // Blossoms
  for (let py = y + 6; py < y + h - 4; py += 10) {
    ctx.fillStyle = (py % 2 === 0) ? c1 : c2;
    ctx.beginPath();
    ctx.arc(x + w / 2 - 2, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe8c2';
    ctx.beginPath();
    ctx.arc(x + w / 2 - 2, py, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFantasyLamp(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number, isNight: boolean) {
  // Ornamental Iron Post
  ctx.fillStyle = '#1e2638';
  ctx.fillRect(x + 6, y - 28, 4, 28);
  ctx.fillRect(x + 4, y - 30, 8, 3);

  // Lantern Glass Enclosure
  ctx.fillStyle = '#2d3a54';
  ctx.fillRect(x + 3, y - 36, 10, 8);

  // Warm Golden Light & Soft Glow
  const flicker = 0.85 + 0.15 * Math.sin(tick * 0.12 + x);
  const glowAlpha = isNight ? 0.35 : 0.15;

  ctx.fillStyle = `rgba(255, 201, 122, ${0.95 * flicker})`;
  ctx.fillRect(x + 5, y - 34, 6, 5);

  // Radial Ambient Light on ground
  const radGrad = ctx.createRadialGradient(x + 8, y, 2, x + 8, y, 42);
  radGrad.addColorStop(0, `rgba(255, 184, 107, ${glowAlpha * flicker})`);
  radGrad.addColorStop(1, 'rgba(255, 184, 107, 0)');
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(x + 8, y, 42, 0, Math.PI * 2);
  ctx.fill();
}

function drawSakuraTree(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  // Tree Trunk (Curved weathered wood)
  ctx.fillStyle = '#4a2c1a';
  ctx.fillRect(x + 16, y + 30, 10, 22);

  // Foliage Sway
  const sway = Math.sin(tick * 0.03 + x) * 2;

  // Pink Blossom Cloud (3 layered tiers)
  ctx.fillStyle = '#f28cb1';
  ctx.beginPath();
  ctx.roundRect(x + sway, y + 14, 44, 24, 8);
  ctx.fill();

  ctx.fillStyle = '#ff9ec4';
  ctx.beginPath();
  ctx.roundRect(x + 4 + sway, y + 2, 36, 22, 8);
  ctx.fill();

  ctx.fillStyle = '#ffe0ec';
  ctx.beginPath();
  ctx.roundRect(x + 8 + sway, y - 8, 28, 18, 6);
  ctx.fill();
}

function drawCozyOakTree(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  // Trunk
  ctx.fillStyle = '#382214';
  ctx.fillRect(x + 16, y + 32, 12, 22);

  const sway = Math.sin(tick * 0.025 + y) * 1.8;

  // Deep Forest Foliage
  ctx.fillStyle = '#1d5e38';
  ctx.beginPath();
  ctx.roundRect(x + sway, y + 14, 46, 26, 9);
  ctx.fill();

  ctx.fillStyle = '#2f7d4e';
  ctx.beginPath();
  ctx.roundRect(x + 5 + sway, y + 2, 36, 24, 8);
  ctx.fill();

  ctx.fillStyle = '#449c66';
  ctx.beginPath();
  ctx.roundRect(x + 9 + sway, y - 8, 28, 20, 7);
  ctx.fill();
}

function drawPineTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#2a1a0f';
  ctx.fillRect(x + 10, y + 36, 6, 16);

  // 3 Triangular Tiers
  ctx.fillStyle = '#17402c';
  drawTriangle(ctx, x + 13, y + 12, 18, 24);
  ctx.fillStyle = '#22593d';
  drawTriangle(ctx, x + 13, y + 2, 15, 20);
  ctx.fillStyle = '#317350';
  drawTriangle(ctx, x + 13, y - 8, 12, 16);
}

function drawTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + w, cy);
  ctx.lineTo(cx - w, cy);
  ctx.closePath();
  ctx.fill();
}

function drawWoodFence(ctx: CanvasRenderingContext2D, x: number, y: number, len: number) {
  ctx.fillStyle = '#855633';
  // Horizontal rails
  ctx.fillRect(x, y + 4, len, 3);
  ctx.fillRect(x, y + 12, len, 3);
  // Vertical pickets
  for (let px = x + 4; px < x + len; px += 14) {
    ctx.fillRect(px, y, 4, 18);
    // Picket top point
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px + 2, y - 3);
    ctx.lineTo(px + 4, y);
    ctx.fill();
  }
}

function drawTownSignpost(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Post
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(x, y, 4, 22);

  // Sign boards
  ctx.fillStyle = '#ffc97a';
  ctx.fillRect(x - 14, y + 2, 16, 6);
  ctx.fillRect(x + 2, y + 10, 16, 6);

  ctx.fillStyle = '#17223b';
  ctx.fillRect(x - 12, y + 4, 10, 2);
  ctx.fillRect(x + 4, y + 12, 10, 2);
}

function drawPixelBunny(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  const hop = Math.sin(tick * 0.08) > 0.8 ? -4 : 0;
  // Bunny Body (White/Cream)
  ctx.fillStyle = '#f8f2e7';
  ctx.fillRect(x, y + hop, 8, 6);
  ctx.fillRect(x + 5, y - 4 + hop, 5, 5); // Head
  // Ears
  ctx.fillStyle = '#ff9ec4';
  ctx.fillRect(x + 5, y - 8 + hop, 2, 4);
  ctx.fillRect(x + 8, y - 8 + hop, 2, 4);
  // Pink nose dot
  ctx.fillStyle = '#f28cb1';
  ctx.fillRect(x + 9, y - 2 + hop, 1, 1);
}

function drawPixelBird(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  const wing = Math.sin(tick * 0.15) > 0.5 ? -2 : 0;
  ctx.fillStyle = '#73c7e8';
  ctx.fillRect(x, y, 7, 5);
  ctx.fillStyle = '#ffc97a';
  ctx.fillRect(x + 6, y + 1, 2, 2); // Beak
  ctx.fillStyle = '#53a8c7';
  ctx.fillRect(x + 2, y + wing, 4, 3); // Wing
}

// ==========================================
// Chimney Smoke Particles
// ==========================================

function updateAndDrawSmoke(
  ctx: CanvasRenderingContext2D,
  puffs: { x: number; y: number; originX: number; originY: number; size: number; alpha: number; age: number; maxAge: number }[],
  origins: { x: number; y: number }[],
  tick: number
) {
  if (tick % 16 === 0) {
    origins.forEach(orig => {
      puffs.push({
        x: orig.x,
        y: orig.y,
        originX: orig.x,
        originY: orig.y,
        size: 3.5,
        alpha: 0.55,
        age: 0,
        maxAge: 85
      });
    });
  }

  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.age++;
    p.y -= 0.65;
    p.x += Math.sin(p.age * 0.08) * 0.45 - 0.25; // drift gently left
    p.size += 0.12;
    p.alpha = Math.max(0, 0.55 * (1 - p.age / p.maxAge));

    if (p.age >= p.maxAge) {
      puffs.splice(i, 1);
      continue;
    }

    ctx.fillStyle = `rgba(235, 230, 222, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ==========================================
// Rich Fantasy Buildings Drawing
// ==========================================

function drawFantasyBuilding(
  ctx: CanvasRenderingContext2D,
  b: Building,
  isSelected: boolean,
  simHour: number,
  tick: number
) {
  const isNight = simHour < 6 || simHour >= 19;
  const isSunset = simHour >= 17 && simHour < 19;

  // Soft Ground Shadow
  ctx.fillStyle = 'rgba(12, 19, 36, 0.42)';
  ctx.beginPath();
  ctx.roundRect(b.x + 4, b.y + b.height - 4, b.width + 6, 16, 6);
  ctx.fill();

  switch (b.id) {
    case 'cafe':
      drawStarlightCafe(ctx, b, isNight, isSelected, tick);
      break;
    case 'bakery':
      drawSunbeamBakery(ctx, b, isNight, isSelected, tick);
      break;
    case 'library':
      drawArcaneLibrary(ctx, b, isNight, isSelected, tick);
      break;
    case 'observatory':
      drawCelestialObservatory(ctx, b, isNight, isSelected, tick);
      break;
    case 'clinic':
      drawHerbsClinic(ctx, b, isNight, isSelected, tick);
      break;
    case 'town_hall':
      drawTownHallPalace(ctx, b, isNight, isSelected, tick);
      break;
    case 'cottages':
      drawCozyCottages(ctx, b, isNight, isSelected, tick);
      break;
    default:
      drawDefaultFantasyBuilding(ctx, b, isNight, isSelected);
      break;
  }

  // Selected Building Highlight Aura
  if (isSelected) {
    ctx.strokeStyle = '#ffc97a';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.lineDashOffset = -tick * 0.5;
    ctx.strokeRect(b.x - 6, b.y - 8, b.width + 12, b.height + 14);
    ctx.setLineDash([]);
  }
}

// 1. 咖啡馆 (Starlight Café)
function drawStarlightCafe(ctx: CanvasRenderingContext2D, b: Building, isNight: boolean, isSelected: boolean, tick: number) {
  // Main Timber Wall
  ctx.fillStyle = '#3a2b23';
  ctx.fillRect(b.x, b.y + 28, b.width, b.height - 28);
  ctx.strokeStyle = '#221914';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(b.x, b.y + 28, b.width, b.height - 28);

  // Terracotta Shingle Roof
  ctx.fillStyle = '#b85c38';
  drawGableRoof(ctx, b.x - 8, b.y + 28, b.width + 16, 32);

  // Chimney
  ctx.fillStyle = '#4a3b32';
  ctx.fillRect(b.x + b.width - 28, b.y - 2, 14, 26);
  ctx.fillStyle = '#2b211a';
  ctx.fillRect(b.x + b.width - 30, b.y - 4, 18, 4);

  // Striped Outdoor Awning (Cream & Terracotta)
  const awningY = b.y + 58;
  const awningW = b.width - 16;
  const stripeW = 9;
  for (let i = 0; i < Math.floor(awningW / stripeW); i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ffb86b' : '#fff1d6';
    ctx.fillRect(b.x + 8 + i * stripeW, awningY, stripeW, 14);
  }

  // Warm Amber Glowing Windows
  const winGlow = isNight ? '#ffc97a' : '#ffe8c2';
  ctx.fillStyle = winGlow;
  ctx.fillRect(b.x + 18, b.y + 76, 26, 24);
  ctx.fillRect(b.x + b.width - 44, b.y + 76, 26, 24);

  // Window Panes
  ctx.strokeStyle = '#221914';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x + 18, b.y + 76, 26, 24);
  ctx.strokeRect(b.x + b.width - 44, b.y + 76, 26, 24);

  // Door
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(b.x + b.width / 2 - 14, b.y + b.height - 38, 28, 38);
  ctx.strokeRect(b.x + b.width / 2 - 14, b.y + b.height - 38, 28, 38);
  ctx.fillStyle = '#ffc97a';
  ctx.fillRect(b.x + b.width / 2 + 6, b.y + b.height - 20, 3, 3); // Knob

  // Café Blackboard Sign
  ctx.fillStyle = '#17223b';
  ctx.fillRect(b.x + b.width / 2 - 28, b.y + 36, 56, 18);
  ctx.strokeStyle = '#ffc97a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + b.width / 2 - 28, b.y + 36, 56, 18);

  ctx.fillStyle = '#fff1d6';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('☕ 星光咖啡馆', b.x + b.width / 2, b.y + 49);

  // Outdoor Café Patio Table & Umbrella
  drawCafePatioTable(ctx, b.x - 30, b.y + b.height - 18, tick);
}

function drawCafePatioTable(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  // Umbrella pole
  ctx.fillStyle = '#4a3b32';
  ctx.fillRect(x + 12, y - 24, 3, 24);
  // Umbrella Canopy
  ctx.fillStyle = '#ffb86b';
  ctx.beginPath();
  ctx.arc(x + 13, y - 24, 16, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#b85c38';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Small round table
  ctx.fillStyle = '#fff1d6';
  ctx.beginPath();
  ctx.ellipse(x + 13, y - 2, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b85c38';
  ctx.stroke();

  // Steaming tiny coffee mug
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 11, y - 6, 4, 4);
}

// 2. 面包店 (Sunbeam Bakery)
function drawSunbeamBakery(ctx: CanvasRenderingContext2D, b: Building, isNight: boolean, isSelected: boolean, tick: number) {
  // Buttercream Stucco Wall
  ctx.fillStyle = '#fff1d6';
  ctx.fillRect(b.x, b.y + 26, b.width, b.height - 26);
  ctx.strokeStyle = '#5a3d28';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(b.x, b.y + 26, b.width, b.height - 26);

  // Warm Apricot Roof
  ctx.fillStyle = '#f7a76c';
  drawGableRoof(ctx, b.x - 8, b.y + 26, b.width + 16, 30);

  // Brick Chimney
  ctx.fillStyle = '#b85c38';
  ctx.fillRect(b.x + 18, b.y - 2, 16, 26);
  ctx.fillStyle = '#7a3b22';
  ctx.fillRect(b.x + 16, b.y - 4, 20, 4);

  // Display Windows with Pastries
  const winGlow = isNight ? '#ffc97a' : '#ffe8c2';
  ctx.fillStyle = winGlow;
  ctx.fillRect(b.x + 14, b.y + 60, 34, 28);
  ctx.fillRect(b.x + b.width - 48, b.y + 60, 34, 28);
  ctx.strokeStyle = '#5a3d28';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x + 14, b.y + 60, 34, 28);
  ctx.strokeRect(b.x + b.width - 48, b.y + 60, 34, 28);

  // Pastry silhouettes inside window
  ctx.fillStyle = '#b85c38';
  ctx.beginPath();
  ctx.arc(b.x + 24, b.y + 76, 5, 0, Math.PI * 2);
  ctx.arc(b.x + 36, b.y + 76, 4, 0, Math.PI * 2);
  ctx.fill();

  // Bakery Door
  ctx.fillStyle = '#784429';
  ctx.fillRect(b.x + b.width / 2 - 14, b.y + b.height - 38, 28, 38);
  ctx.strokeRect(b.x + b.width / 2 - 14, b.y + b.height - 38, 28, 38);

  // Hanging Pretzel / Bread Signboard
  ctx.fillStyle = '#3a2b23';
  ctx.fillRect(b.x + b.width / 2 - 30, b.y + 36, 60, 18);
  ctx.strokeStyle = '#f7a76c';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + b.width / 2 - 30, b.y + 36, 60, 18);

  ctx.fillStyle = '#fff1d6';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🍞 暖阳面包工坊', b.x + b.width / 2, b.y + 49);
}

// 3. 图书馆 (Grand Arcane Library)
function drawArcaneLibrary(ctx: CanvasRenderingContext2D, b: Building, isNight: boolean, isSelected: boolean, tick: number) {
  // Stone Wall (Deep Slate Violet)
  ctx.fillStyle = '#2a3554';
  ctx.fillRect(b.x, b.y + 30, b.width, b.height - 30);
  ctx.strokeStyle = '#182038';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(b.x, b.y + 30, b.width, b.height - 30);

  // Majestic High-Spire Roof (Royal Indigo)
  ctx.fillStyle = '#3b4371';
  ctx.beginPath();
  ctx.moveTo(b.x - 8, b.y + 30);
  ctx.lineTo(b.x + b.width / 2, b.y - 14);
  ctx.lineTo(b.x + b.width + 8, b.y + 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#182038';
  ctx.stroke();

  // Brass Book Weathervane at Spire Tip
  ctx.fillStyle = '#ffc97a';
  ctx.fillRect(b.x + b.width / 2 - 1.5, b.y - 24, 3, 10);
  ctx.fillRect(b.x + b.width / 2 - 6, b.y - 28, 12, 6);

  // Grand Arched Stained Glass Windows
  const winGlow = isNight ? '#ffc97a' : '#73c7e8';
  drawArchedWindow(ctx, b.x + 20, b.y + 50, 24, 36, winGlow);
  drawArchedWindow(ctx, b.x + b.width - 44, b.y + 50, 24, 36, winGlow);

  // Central Grand Double Doors
  ctx.fillStyle = '#1c2438';
  ctx.fillRect(b.x + b.width / 2 - 16, b.y + b.height - 44, 32, 44);
  ctx.strokeStyle = '#ffc97a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + b.width / 2 - 16, b.y + b.height - 44, 32, 44);

  // Signboard
  ctx.fillStyle = '#151d33';
  ctx.fillRect(b.x + b.width / 2 - 32, b.y + 34, 64, 18);
  ctx.strokeStyle = '#9d8cff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + b.width / 2 - 32, b.y + 34, 64, 18);

  ctx.fillStyle = '#f8f2e7';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📖 晨光典籍馆', b.x + b.width / 2, b.y + 47);
}

// 4. 观星台 (Celestial Observatory)
function drawCelestialObservatory(ctx: CanvasRenderingContext2D, b: Building, isNight: boolean, isSelected: boolean, tick: number) {
  // Stone Cylindrical Base
  ctx.fillStyle = '#242a4a';
  ctx.fillRect(b.x + 6, b.y + 32, b.width - 12, b.height - 32);
  ctx.strokeStyle = '#14182e';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(b.x + 6, b.y + 32, b.width - 12, b.height - 32);

  // Indigo-Violet Celestial Dome
  ctx.fillStyle = '#413c75';
  ctx.beginPath();
  ctx.arc(b.x + b.width / 2, b.y + 32, b.width / 2 - 4, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#b9a6ff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Polished Brass Telescope Barrel pointing upward to the stars
  ctx.save();
  ctx.translate(b.x + b.width / 2, b.y + 24);
  ctx.rotate(-0.55); // angled up towards heavens
  ctx.fillStyle = '#ffc97a';
  ctx.fillRect(-6, -34, 12, 34);
  ctx.fillStyle = '#f7a76c';
  ctx.fillRect(-8, -38, 16, 5); // lens rim
  // Glowing blue lens glass
  ctx.fillStyle = isNight ? '#7ce1cf' : '#73c7e8';
  ctx.fillRect(-6, -39, 12, 2);
  ctx.restore();

  // Runic Star glyphs on dome that glow at night
  if (isNight) {
    const starGlow = 0.5 + 0.5 * Math.sin(tick * 0.1);
    ctx.fillStyle = `rgba(185, 166, 255, ${starGlow})`;
    ctx.beginPath();
    ctx.arc(b.x + b.width / 2 - 20, b.y + 26, 2.5, 0, Math.PI * 2);
    ctx.arc(b.x + b.width / 2 + 20, b.y + 26, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Observatory Door
  ctx.fillStyle = '#181d33';
  ctx.fillRect(b.x + b.width / 2 - 12, b.y + b.height - 36, 24, 36);
  ctx.strokeStyle = '#b9a6ff';
  ctx.strokeRect(b.x + b.width / 2 - 12, b.y + b.height - 36, 24, 36);

  // Signboard
  ctx.fillStyle = '#151d33';
  ctx.fillRect(b.x + b.width / 2 - 28, b.y + 40, 56, 18);
  ctx.strokeStyle = '#b9a6ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + b.width / 2 - 28, b.y + 40, 56, 18);

  ctx.fillStyle = '#f8f2e7';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔭 苍穹观星台', b.x + b.width / 2, b.y + 53);
}

// 5. 诊所 (Whispering Herbs Clinic)
function drawHerbsClinic(ctx: CanvasRenderingContext2D, b: Building, isNight: boolean, isSelected: boolean, tick: number) {
  // Sage Mint Wood Structure
  ctx.fillStyle = '#2f4f3e';
  ctx.fillRect(b.x, b.y + 26, b.width, b.height - 26);
  ctx.strokeStyle = '#183024';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(b.x, b.y + 26, b.width, b.height - 26);

  // Forest Green Roof
  ctx.fillStyle = '#427856';
  drawGableRoof(ctx, b.x - 6, b.y + 26, b.width + 12, 28);

  // Botanical Glass Greenhouse Annex on the side
  ctx.fillStyle = 'rgba(101, 214, 196, 0.35)';
  ctx.fillRect(b.x + b.width - 36, b.y + 48, 32, 42);
  ctx.strokeStyle = '#7ce1cf';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + b.width - 36, b.y + 48, 32, 42);

  // Green plant pots inside conservatory
  ctx.fillStyle = '#b85c38';
  ctx.fillRect(b.x + b.width - 30, b.y + 76, 8, 8);
  ctx.fillStyle = '#71c68b';
  ctx.beginPath();
  ctx.arc(b.x + b.width - 26, b.y + 72, 6, 0, Math.PI * 2);
  ctx.fill();

  // Clinic Cross Sign
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(b.x + 16, b.y + 50, 14, 14);
  ctx.fillStyle = '#71c68b';
  ctx.fillRect(b.x + 21, b.y + 52, 4, 10);
  ctx.fillRect(b.x + 18, b.y + 55, 10, 4);

  // Door
  ctx.fillStyle = '#1e382b';
  ctx.fillRect(b.x + 42, b.y + b.height - 36, 24, 36);
  ctx.strokeStyle = '#71c68b';
  ctx.strokeRect(b.x + 42, b.y + b.height - 36, 24, 36);

  // Signboard
  ctx.fillStyle = '#17223b';
  ctx.fillRect(b.x + b.width / 2 - 28, b.y + 34, 56, 18);
  ctx.strokeStyle = '#71c68b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + b.width / 2 - 28, b.y + 34, 56, 18);

  ctx.fillStyle = '#f8f2e7';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌿 草药愈心诊所', b.x + b.width / 2, b.y + 47);
}

// 6. 市政议事堂 (Town Hall Palace)
function drawTownHallPalace(ctx: CanvasRenderingContext2D, b: Building, isNight: boolean, isSelected: boolean, tick: number) {
  // Noble Slate Blue Walls
  ctx.fillStyle = '#2f3b57';
  ctx.fillRect(b.x, b.y + 34, b.width, b.height - 34);
  ctx.strokeStyle = '#182033';
  ctx.lineWidth = 3;
  ctx.strokeRect(b.x, b.y + 34, b.width, b.height - 34);

  // Grand Central Clock Tower
  const towerW = 44;
  const towerX = b.x + b.width / 2 - towerW / 2;
  ctx.fillStyle = '#3a4a6e';
  ctx.fillRect(towerX, b.y - 18, towerW, 52);
  ctx.strokeStyle = '#182033';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(towerX, b.y - 18, towerW, 52);

  // Tower Pointed Spire
  ctx.fillStyle = '#ffc97a';
  ctx.beginPath();
  ctx.moveTo(towerX - 4, b.y - 18);
  ctx.lineTo(towerX + towerW / 2, b.y - 42);
  ctx.lineTo(towerX + towerW + 4, b.y - 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f7a76c';
  ctx.stroke();

  // Clock Face
  ctx.fillStyle = '#fff1d6';
  ctx.beginPath();
  ctx.arc(towerX + towerW / 2, b.y - 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffc97a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Clock Hands (Tick animated!)
  const handAngle = tick * 0.05;
  ctx.strokeStyle = '#17223b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(towerX + towerW / 2, b.y - 2);
  ctx.lineTo(towerX + towerW / 2 + Math.cos(handAngle) * 6, b.y - 2 + Math.sin(handAngle) * 6);
  ctx.stroke();

  // Grand Entrance Steps & Pillars
  ctx.fillStyle = '#4d5d85';
  ctx.fillRect(b.x + b.width / 2 - 28, b.y + b.height - 12, 56, 12); // Steps
  ctx.fillStyle = '#ffc97a';
  ctx.fillRect(b.x + b.width / 2 - 24, b.y + 60, 5, 42); // Left pillar
  ctx.fillRect(b.x + b.width / 2 + 19, b.y + 60, 5, 42); // Right pillar

  // Double Oak Doors
  ctx.fillStyle = '#1c2538';
  ctx.fillRect(b.x + b.width / 2 - 16, b.y + b.height - 42, 32, 32);
  ctx.strokeStyle = '#ffc97a';
  ctx.strokeRect(b.x + b.width / 2 - 16, b.y + b.height - 42, 32, 32);

  // Fluttering Banners
  ctx.fillStyle = '#ffb86b';
  ctx.fillRect(b.x + 20, b.y + 40, 10, 24);
  ctx.fillRect(b.x + b.width - 30, b.y + 40, 10, 24);

  // Signboard
  ctx.fillStyle = '#17223b';
  ctx.fillRect(b.x + b.width / 2 - 32, b.y + 36, 64, 18);
  ctx.strokeStyle = '#ffc97a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + b.width / 2 - 32, b.y + 36, 64, 18);

  ctx.fillStyle = '#f8f2e7';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏛️ 市政议事堂', b.x + b.width / 2, b.y + 49);
}

// 7. 住宅区 (Cozy Cottages)
function drawCozyCottages(ctx: CanvasRenderingContext2D, b: Building, isNight: boolean, isSelected: boolean, tick: number) {
  // Warm Cedar Log Timber Wall
  ctx.fillStyle = '#422c1d';
  ctx.fillRect(b.x, b.y + 26, b.width, b.height - 26);
  ctx.strokeStyle = '#24170e';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(b.x, b.y + 26, b.width, b.height - 26);

  // Log siding lines
  ctx.strokeStyle = '#543926';
  ctx.lineWidth = 1.5;
  for (let ly = b.y + 38; ly < b.y + b.height - 6; ly += 12) {
    ctx.beginPath();
    ctx.moveTo(b.x + 2, ly);
    ctx.lineTo(b.x + b.width - 2, ly);
    ctx.stroke();
  }

  // Terracotta Tile Roof
  ctx.fillStyle = '#b85333';
  drawGableRoof(ctx, b.x - 8, b.y + 26, b.width + 16, 28);

  // Chimney
  ctx.fillStyle = '#543b2d';
  ctx.fillRect(b.x + b.width - 26, b.y - 2, 14, 26);

  // Cozy Lit Windows with Flowerboxes
  const winGlow = isNight ? '#ffc97a' : '#ffe8c2';
  ctx.fillStyle = winGlow;
  ctx.fillRect(b.x + 18, b.y + 56, 24, 22);
  ctx.fillRect(b.x + b.width - 42, b.y + 56, 24, 22);
  ctx.strokeStyle = '#24170e';
  ctx.strokeRect(b.x + 18, b.y + 56, 24, 22);
  ctx.strokeRect(b.x + b.width - 42, b.y + 56, 24, 22);

  // Window Flowerbox
  ctx.fillStyle = '#7a4220';
  ctx.fillRect(b.x + 16, b.y + 78, 28, 6);
  ctx.fillRect(b.x + b.width - 44, b.y + 78, 28, 6);
  // Flowers in box
  ctx.fillStyle = '#ff9ec4';
  ctx.fillRect(b.x + 18, b.y + 75, 4, 3);
  ctx.fillRect(b.x + 26, b.y + 75, 4, 3);
  ctx.fillRect(b.x + b.width - 40, b.y + 75, 4, 3);
  ctx.fillRect(b.x + b.width - 32, b.y + 75, 4, 3);

  // Cottage Door
  ctx.fillStyle = '#2b1a10';
  ctx.fillRect(b.x + b.width / 2 - 13, b.y + b.height - 36, 26, 36);
  ctx.strokeStyle = '#ffc97a';
  ctx.strokeRect(b.x + b.width / 2 - 13, b.y + b.height - 36, 26, 36);

  // Swaying Clothesline next to cottage
  drawClothesline(ctx, b.x + b.width + 6, b.y + 52, 42, tick);

  // Signboard
  ctx.fillStyle = '#17223b';
  ctx.fillRect(b.x + b.width / 2 - 28, b.y + 34, 56, 18);
  ctx.strokeStyle = '#ffb86b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + b.width / 2 - 28, b.y + 34, 56, 18);

  ctx.fillStyle = '#f8f2e7';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏡 暖木旅居舍', b.x + b.width / 2, b.y + 47);
}

function drawClothesline(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, tick: number) {
  // Posts
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(x, y, 3, 26);
  ctx.fillRect(x + len, y, 3, 26);

  // Sagging rope
  ctx.strokeStyle = '#d4c7b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 4);
  ctx.quadraticCurveTo(x + len / 2, y + 10, x + len, y + 4);
  ctx.stroke();

  // Swaying laundry shirts
  const sway = Math.sin(tick * 0.08) * 1.5;
  ctx.fillStyle = '#73c7e8';
  ctx.fillRect(x + 10, y + 8, 8, 10 + sway);
  ctx.fillStyle = '#ff9ec4';
  ctx.fillRect(x + 24, y + 9, 9, 11 - sway);
}

function drawDefaultFantasyBuilding(ctx: CanvasRenderingContext2D, b: Building, isNight: boolean, isSelected: boolean) {
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x, b.y + 28, b.width, b.height - 28);
  ctx.strokeStyle = '#17223b';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(b.x, b.y + 28, b.width, b.height - 28);

  ctx.fillStyle = b.roofColor;
  drawGableRoof(ctx, b.x - 6, b.y + 28, b.width + 12, 28);

  ctx.fillStyle = '#17223b';
  ctx.fillRect(b.x + 10, b.y + 34, b.width - 20, 18);
  ctx.strokeStyle = b.accentColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + 10, b.y + 34, b.width - 20, 18);

  ctx.fillStyle = '#f8f2e7';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${b.icon} ${b.name}`, b.x + b.width / 2, b.y + 47);
}

function drawGableRoof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w / 2, y - h);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#182033';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawArchedWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, glowColor: string) {
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + w / 2);
  ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#182033';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ==========================================
// 16-bit / HD Pixel Character Custom Drawing
// ==========================================

function drawFantasyAgent(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  isSelected: boolean,
  tick: number
) {
  const x = agent.x;
  const y = agent.y;

  // Gentle breathing idle bobbing + walk bobbing
  const walkBob = agent.isMoving ? Math.sin(tick * 0.35) * 2.2 : 0;
  const idleBreathing = !agent.isMoving ? Math.sin(tick * 0.08 + x) * 0.8 : 0;
  const bobY = walkBob + idleBreathing;
  const legOffset = agent.isMoving ? Math.sin(tick * 0.35) * 3.5 : 0;

  // Selected Radiant Ring & Arrow Indicator
  if (isSelected) {
    ctx.strokeStyle = '#ffc97a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 20, 9, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Pulsing diamond cursor above head
    const pointerBounce = Math.sin(tick * 0.15) * 3;
    ctx.fillStyle = '#ffc97a';
    ctx.beginPath();
    ctx.moveTo(x, y - 48 + pointerBounce);
    ctx.lineTo(x - 5, y - 56 + pointerBounce);
    ctx.lineTo(x + 5, y - 56 + pointerBounce);
    ctx.closePath();
    ctx.fill();
  }

  // Soft Drop Shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 13, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Character Identification & Gear rendering based on resident
  renderResidentCostume(ctx, agent, x, y, bobY, legOffset, tick);

  // Resident Name Plate (Game HUD Style)
  ctx.fillStyle = 'rgba(23, 34, 59, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x - 30, y - 36, 60, 16, 5);
  ctx.fill();
  ctx.strokeStyle = isSelected ? '#ffc97a' : 'rgba(100, 125, 175, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#f8f2e7';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(agent.name, x, y - 24);

  // Active Goal / Activity Emote Chip
  if (isSelected && (agent.goal || agent.currentActivity)) {
    const actionLabel = agent.goal?.title || agent.currentActivity;
    const shortLabel = actionLabel.length > 14 ? actionLabel.slice(0, 13) + '…' : actionLabel;

    ctx.fillStyle = 'rgba(31, 40, 68, 0.95)';
    ctx.beginPath();
    ctx.roundRect(x - 56, y - 56, 112, 16, 6);
    ctx.fill();
    ctx.strokeStyle = '#ffc97a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#ffc97a';
    ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`✨ ${shortLabel}`, x, y - 44);
  }
}

function renderResidentCostume(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  x: number,
  y: number,
  bobY: number,
  legOffset: number,
  tick: number
) {
  // Legs (Pants/Boots)
  ctx.fillStyle = '#27344d';
  ctx.fillRect(x - 5, y + 4 + bobY, 4, 8 + legOffset);
  ctx.fillRect(x + 1, y + 4 + bobY, 4, 8 - legOffset);

  // Head Skin Tone
  ctx.fillStyle = '#ffe0bd';
  ctx.fillRect(x - 6, y - 20 + bobY, 12, 12);
  ctx.strokeStyle = '#271f18';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 6, y - 20 + bobY, 12, 12);

  // Eyes (Direction facing + occasional blink)
  const isBlinking = (Math.floor(tick / 60) % 8 === 0) && (tick % 8 < 2);
  ctx.fillStyle = '#17223b';
  if (!isBlinking) {
    if (agent.direction === 'right') {
      ctx.fillRect(x + 2, y - 16 + bobY, 2, 3);
    } else if (agent.direction === 'left') {
      ctx.fillRect(x - 4, y - 16 + bobY, 2, 3);
    } else {
      ctx.fillRect(x - 3, y - 16 + bobY, 2, 2.5);
      ctx.fillRect(x + 1, y - 16 + bobY, 2, 2.5);
    }
  } else {
    // Closed eye line during blink
    ctx.fillRect(x - 3, y - 15 + bobY, 6, 1.5);
  }

  // Resident Specific Clothing & Gear
  switch (agent.id) {
    case 'agent-1': // 艾琳 (Elena - Barista)
      // Auburn hair bun
      ctx.fillStyle = '#9c4221';
      ctx.fillRect(x - 7, y - 23 + bobY, 14, 6);
      ctx.fillRect(x + 4, y - 26 + bobY, 5, 5); // bun
      // Terracotta Dress + Apron
      ctx.fillStyle = '#b85c38';
      ctx.fillRect(x - 7, y - 8 + bobY, 14, 13);
      ctx.fillStyle = '#fff1d6';
      ctx.fillRect(x - 4, y - 6 + bobY, 8, 11); // White barista apron
      // Coffee mug in hand
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 6, y - 3 + bobY, 4, 4);
      break;

    case 'agent-2': // 卢卡斯 (Lucas - Scholar)
      // Dark navy hair + glasses
      ctx.fillStyle = '#262f4d';
      ctx.fillRect(x - 7, y - 23 + bobY, 14, 5);
      // Gold glasses rim
      ctx.strokeStyle = '#ffc97a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 4, y - 17 + bobY, 8, 3);
      // Scholar deep purple coat
      ctx.fillStyle = '#4c3f78';
      ctx.fillRect(x - 7, y - 8 + bobY, 14, 13);
      // Ancient grimoire book in arm
      ctx.fillStyle = '#b85c38';
      ctx.fillRect(x - 9, y - 4 + bobY, 4, 8);
      break;

    case 'agent-3': // 莉莉 (Lily - Baker)
      // Golden blonde hair + White Chef Toque Hat
      ctx.fillStyle = '#f7c86a';
      ctx.fillRect(x - 7, y - 21 + bobY, 14, 5);
      // Baker's Toque Hat
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 6, y - 28 + bobY, 12, 8);
      // Cream clothes + apron
      ctx.fillStyle = '#f7a76c';
      ctx.fillRect(x - 7, y - 8 + bobY, 14, 13);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 4, y - 5 + bobY, 8, 10);
      break;

    case 'agent-4': // 索菲亚 (Sophia - Doctor)
      // Brown braid with flower
      ctx.fillStyle = '#5c3822';
      ctx.fillRect(x - 7, y - 23 + bobY, 14, 5);
      ctx.fillStyle = '#ff9ec4';
      ctx.fillRect(x + 5, y - 21 + bobY, 3, 3); // flower hairpin
      // Mint green medicinal coat
      ctx.fillStyle = '#65d6c4';
      ctx.fillRect(x - 7, y - 8 + bobY, 14, 13);
      // Satchel bag
      ctx.fillStyle = '#855633';
      ctx.fillRect(x + 5, y - 2 + bobY, 4, 6);
      break;

    case 'agent-5': // 托马斯 (Thomas - Mechanic)
      // Brown hair + Brass Goggles on forehead
      ctx.fillStyle = '#4a301d';
      ctx.fillRect(x - 7, y - 23 + bobY, 14, 5);
      // Goggles
      ctx.fillStyle = '#ffc97a';
      ctx.fillRect(x - 6, y - 22 + bobY, 12, 3);
      ctx.fillStyle = '#73c7e8';
      ctx.fillRect(x - 4, y - 21 + bobY, 3, 2);
      ctx.fillRect(x + 1, y - 21 + bobY, 3, 2);
      // Leather work vest + toolbelt
      ctx.fillStyle = '#784d2b';
      ctx.fillRect(x - 7, y - 8 + bobY, 14, 13);
      ctx.fillStyle = '#2c1e14';
      ctx.fillRect(x - 7, y + 2 + bobY, 14, 3); // belt
      break;

    case 'agent-6': // 亚瑟 (Arthur - Secretary)
      // Neat dark hair + Formal municipal coat
      ctx.fillStyle = '#222938';
      ctx.fillRect(x - 7, y - 23 + bobY, 14, 5);
      // Navy Blue Formal Suit + Gold Accent
      ctx.fillStyle = '#28385e';
      ctx.fillRect(x - 7, y - 8 + bobY, 14, 13);
      ctx.fillStyle = '#ffc97a';
      ctx.fillRect(x - 1, y - 6 + bobY, 2, 7); // gold tie / chain
      break;

    case 'agent-7': // 塞拉 (Sera - Bard)
      // Flowing wavy hair + Bard's Feathered Cap
      ctx.fillStyle = '#823854';
      ctx.fillRect(x - 7, y - 22 + bobY, 14, 5);
      // Feathered Cap
      ctx.fillStyle = '#71c68b';
      ctx.fillRect(x - 6, y - 27 + bobY, 12, 5);
      ctx.fillStyle = '#ff9ec4';
      ctx.fillRect(x + 5, y - 31 + bobY, 2, 5); // feather
      // Bard's traveling emerald cloak
      ctx.fillStyle = '#3a875a';
      ctx.fillRect(x - 7, y - 8 + bobY, 14, 13);
      // Lute on back
      ctx.fillStyle = '#c4823d';
      ctx.fillRect(x - 9, y - 6 + bobY, 4, 8);
      break;

    default:
      ctx.fillStyle = agent.spriteColor || '#ffb86b';
      ctx.fillRect(x - 7, y - 8 + bobY, 14, 13);
      break;
  }
}

// ==========================================
// Cozy Interaction Speech Bubble
// ==========================================

function drawCozyInteractionBubble(
  ctx: CanvasRenderingContext2D,
  bubble: ActiveInteractionBubble,
  tick: number
) {
  const x = bubble.x;
  const y = bubble.y - 48;

  const bubbleW = 168;
  const bubbleH = 46;

  // Floating bounce
  const floatY = Math.sin(tick * 0.08) * 2;

  // Bubble Box (Game HUD Glass)
  ctx.fillStyle = 'rgba(23, 34, 59, 0.94)';
  ctx.beginPath();
  ctx.roundRect(x - bubbleW / 2, y - bubbleH + floatY, bubbleW, bubbleH, 10);
  ctx.fill();
  ctx.strokeStyle = '#ffc97a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pointer Triangle pointing down to speaker
  ctx.fillStyle = 'rgba(23, 34, 59, 0.94)';
  ctx.beginPath();
  ctx.moveTo(x - 6, y + floatY);
  ctx.lineTo(x + 6, y + floatY);
  ctx.lineTo(x, y + 8 + floatY);
  ctx.closePath();
  ctx.fill();

  // Speaker Tag
  ctx.fillStyle = '#ffc97a';
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(bubble.speakerName || '小镇心声', x - bubbleW / 2 + 10, y - bubbleH + 15 + floatY);

  // Topic Badge
  ctx.fillStyle = '#73c7e8';
  ctx.font = '8px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`✨ ${bubble.topic}`, x + bubbleW / 2 - 10, y - bubbleH + 15 + floatY);

  // Spoken Text Line
  ctx.fillStyle = '#f8f2e7';
  ctx.font = '9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';

  const speechText = bubble.currentSpeech
    ? (bubble.currentSpeech.length > 21 ? bubble.currentSpeech.slice(0, 20) + '…' : bubble.currentSpeech)
    : '💬 正在交流心声' + '.'.repeat((Math.floor(tick / 15) % 4));

  ctx.fillText(speechText, x - bubbleW / 2 + 10, y - bubbleH + 32 + floatY);
}

// ==========================================
// Ambient Floating Particles (Petals, Fireflies, Rain)
// ==========================================

function drawAmbientParticles(
  ctx: CanvasRenderingContext2D,
  weather: string,
  particles: { x: number; y: number; speedX: number; speedY: number; size: number; color: string; rotation: number }[],
  tick: number,
  simHour: number
) {
  const isNight = simHour < 6 || simHour >= 19;

  if (weather === 'rainy') {
    // Gentle soft rain lines
    ctx.strokeStyle = 'rgba(115, 199, 232, 0.42)';
    ctx.lineWidth = 1.5;
    particles.forEach(p => {
      p.y += p.speedY * 3.5;
      p.x -= 0.8;
      if (p.y > 1000) p.y = 0;
      if (p.x < 0) p.x = 1150;

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 2, p.y + 10);
      ctx.stroke();
    });
  } else if (isNight || weather === 'starry_night') {
    // Floating magical fireflies with glowing halos
    particles.slice(0, 28).forEach((p, idx) => {
      const floatX = p.x + Math.sin(tick * 0.03 + idx) * 18;
      const floatY = (p.y - tick * 0.4) % 1000;
      const actualY = floatY < 0 ? floatY + 1000 : floatY;
      const glow = 0.4 + 0.4 * Math.sin(tick * 0.08 + idx);

      // Firefly halo
      const grad = ctx.createRadialGradient(floatX, actualY, 1, floatX, actualY, 7);
      grad.addColorStop(0, `rgba(255, 201, 122, ${glow})`);
      grad.addColorStop(1, 'rgba(255, 201, 122, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(floatX, actualY, 7, 0, Math.PI * 2);
      ctx.fill();

      // Firefly core
      ctx.fillStyle = '#fff1d6';
      ctx.beginPath();
      ctx.arc(floatX, actualY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    // Gentle floating flower petals and autumn leaves drifting in breeze
    particles.slice(0, 24).forEach((p, idx) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += 0.03;

      if (p.y > 1000) p.y = 0;
      if (p.x < 0) p.x = 1150;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}

// ==========================================
// Celestial Day & Night Overlay Lighting
// ==========================================

function drawCelestialLighting(
  ctx: CanvasRenderingContext2D,
  hour: number,
  weather: string,
  width: number,
  height: number
) {
  let tintColor = 'rgba(0, 0, 0, 0)';

  if (hour >= 21 || hour < 5) {
    // Deep starry midnight indigo
    tintColor = 'rgba(18, 24, 48, 0.48)';
  } else if (hour >= 5 && hour < 7) {
    // Dawn rose & amber mist
    tintColor = 'rgba(242, 140, 177, 0.12)';
  } else if (hour >= 17 && hour < 20) {
    // Golden sunset amber
    tintColor = 'rgba(247, 167, 108, 0.18)';
  } else if (weather === 'rainy') {
    // Overcast cozy grey-teal
    tintColor = 'rgba(32, 46, 68, 0.22)';
  } else if (weather === 'misty_morning') {
    // Soft dreamy morning mist
    tintColor = 'rgba(235, 240, 255, 0.12)';
  }

  if (tintColor !== 'rgba(0, 0, 0, 0)') {
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, width, height);
  }
}
