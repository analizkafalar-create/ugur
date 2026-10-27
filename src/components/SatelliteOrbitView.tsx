/**
 * TerraScan AI - 3D Satellite Model & Live Orbital Pass Visualizer
 * Renders the active satellite in orbit with solar panels, sensors, and ground scanning beam
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RemoteSensingSatellite, Coordinates } from '../types';
import { 
  Satellite as SatIcon, 
  Eye, 
  Maximize2, 
  Minimize2, 
  Radio, 
  Compass, 
  ShieldCheck, 
  Layers,
  ChevronRight,
  Activity
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface SatelliteOrbitViewProps {
  satellite: RemoteSensingSatellite;
  targetCoords: Coordinates;
  isScanning: boolean;
  onClose?: () => void;
}

export const SatelliteOrbitView: React.FC<SatelliteOrbitViewProps> = ({
  satellite,
  targetCoords,
  isScanning,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [camMode, setCamMode] = useState<'ORBIT' | 'NADIR'>('ORBIT');

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const satGroupRef = useRef<THREE.Group | null>(null);
  const beamMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(7, 4, 9);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(15, 20, 10);
    scene.add(sunLight);

    const earthReflectionLight = new THREE.DirectionalLight(0x22d3ee, 0.8);
    earthReflectionLight.position.set(-10, -15, -5);
    scene.add(earthReflectionLight);

    // 3. Stars background particles
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 300;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 80;
      starPositions[i + 1] = (Math.random() - 0.5) * 80;
      starPositions[i + 2] = (Math.random() - 0.5) * 80;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.7 });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // 4. Earth Curved Surface in the background (horizon below)
    const earthGeo = new THREE.SphereGeometry(30, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.1,
      wireframe: false,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(0, -33.5, 0);
    scene.add(earthMesh);

    // Earth atmosphere glow rim
    const atmoGeo = new THREE.SphereGeometry(30.6, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    atmoMesh.position.set(0, -33.5, 0);
    scene.add(atmoMesh);

    // 5. Build 3D Satellite Model
    const satGroup = new THREE.Group();
    satGroupRef.current = satGroup;

    // Main Bus Body (Gold Thermal MLI Insulation Foil)
    const bodyGeo = new THREE.BoxGeometry(2.0, 1.4, 1.4);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x713f12,
      emissiveIntensity: 0.2,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, goldMat);
    satGroup.add(bodyMesh);

    // Bus Silver accents
    const busAccentGeo = new THREE.BoxGeometry(0.8, 1.42, 1.42);
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    });
    const busAccent = new THREE.Mesh(busAccentGeo, silverMat);
    satGroup.add(busAccent);

    // Solar Arrays (Left & Right Panels with blue silicon cell look)
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      metalness: 0.6,
      roughness: 0.3,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.3,
    });
    const solarFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

    // Left Solar Wing
    const leftWingGroup = new THREE.Group();
    const leftArmGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2);
    const leftArm = new THREE.Mesh(leftArmGeo, silverMat);
    leftArm.rotation.z = Math.PI / 2;
    leftArm.position.x = -1.5;
    leftWingGroup.add(leftArm);

    const leftPanelGeo = new THREE.BoxGeometry(3.2, 0.05, 1.6);
    const leftPanel = new THREE.Mesh(leftPanelGeo, solarMat);
    leftPanel.position.x = -3.4;
    leftWingGroup.add(leftPanel);

    // Left solar panel grid borders
    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.06, 1.64), solarFrameMat);
    leftFrame.position.x = -3.4;
    leftWingGroup.add(leftFrame);
    satGroup.add(leftWingGroup);

    // Right Solar Wing
    const rightWingGroup = new THREE.Group();
    const rightArmGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2);
    const rightArm = new THREE.Mesh(rightArmGeo, silverMat);
    rightArm.rotation.z = Math.PI / 2;
    rightArm.position.x = 1.5;
    rightWingGroup.add(rightArm);

    const rightPanelGeo = new THREE.BoxGeometry(3.2, 0.05, 1.6);
    const rightPanel = new THREE.Mesh(rightPanelGeo, solarMat);
    rightPanel.position.x = 3.4;
    rightWingGroup.add(rightPanel);

    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.06, 1.64), solarFrameMat);
    rightFrame.position.x = 3.4;
    rightWingGroup.add(rightFrame);
    satGroup.add(rightWingGroup);

    // High-Gain Parabolic Communications Dish
    const dishGeo = new THREE.SphereGeometry(0.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.rotation.x = Math.PI;
    dishMesh.position.set(0.6, 0.9, 0.5);
    satGroup.add(dishMesh);

    const dishFeedGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5);
    const dishFeed = new THREE.Mesh(dishFeedGeo, silverMat);
    dishFeed.position.set(0.6, 1.3, 0.5);
    satGroup.add(dishFeed);

    // Optical Aperture / Synthetic Aperture Radar (SAR) Antennas
    const sensorGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.6, 24);
    const sensorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const sensorMesh = new THREE.Mesh(sensorGeo, sensorMat);
    sensorMesh.position.set(-0.4, -0.9, 0);
    satGroup.add(sensorMesh);

    // Optical Lens Glass (Glowing Cyan / Ruby depending on sensor)
    const lensGeo = new THREE.CircleGeometry(0.42, 24);
    const lensMat = new THREE.MeshBasicMaterial({ 
      color: satellite.iconType === 'radar_sar' ? 0x10b981 : 0x06b6d4, 
      side: THREE.DoubleSide 
    });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.rotation.x = Math.PI / 2;
    lensMesh.position.set(-0.4, -1.21, 0);
    satGroup.add(lensMesh);

    // 6. Ground Scanning Radar / Laser Beam Cone (Projecting down to Earth!)
    const beamGeo = new THREE.ConeGeometry(3.5, 7.5, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: satellite.iconType === 'radar_sar' ? 0x10b981 : 0x06b6d4,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(-0.4, -4.8, 0);
    beamMesh.rotation.x = Math.PI;
    satGroup.add(beamMesh);
    beamMeshRef.current = beamMesh;

    // Scanning target ground reticle circle
    const reticleGeo = new THREE.RingGeometry(3.2, 3.4, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    reticleMesh.rotation.x = Math.PI / 2;
    reticleMesh.position.set(-0.4, -8.5, 0);
    satGroup.add(reticleMesh);

    scene.add(satGroup);

    // Mouse Drag Orbit interaction inside satellite view
    let isUserDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isUserDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isUserDragging || !satGroupRef.current) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      satGroupRef.current.rotation.y += dx * 0.01;
      satGroupRef.current.rotation.x += dy * 0.01;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isUserDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Slow orbital drift
      if (satGroupRef.current && !isUserDragging) {
        satGroupRef.current.rotation.y = Math.sin(elapsed * 0.3) * 0.2 + 0.3;
        satGroupRef.current.position.y = Math.sin(elapsed * 0.8) * 0.15;
      }

      // Pulse the scanning beam
      if (beamMeshRef.current) {
        beamMeshRef.current.scale.set(
          1 + Math.sin(elapsed * 3) * 0.08,
          1,
          1 + Math.sin(elapsed * 3) * 0.08
        );
        (beamMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 
          isScanning ? 0.5 + Math.sin(elapsed * 8) * 0.2 : 0.28 + Math.sin(elapsed * 2) * 0.08;
      }

      // Earth rotation below
      earthMesh.rotation.y += 0.0008;
      atmoMesh.rotation.y += 0.0008;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
    };
  }, [satellite, isScanning]);

  // Toggle Camera Angle (Orbit View vs Nadir Downward View)
  const handleToggleCam = () => {
    sound.playScanBeep();
    if (!cameraRef.current) return;
    if (camMode === 'ORBIT') {
      // Look from top looking down onto earth (Nadir look)
      cameraRef.current.position.set(0, 9, 3);
      cameraRef.current.lookAt(0, -3, 0);
      setCamMode('NADIR');
    } else {
      cameraRef.current.position.set(7, 4, 9);
      cameraRef.current.lookAt(0, 0, 0);
      setCamMode('ORBIT');
    }
  };

  return (
    <div 
      className={`transition-all duration-300 pointer-events-auto select-none font-sans z-30 ${
        isExpanded 
          ? 'fixed inset-4 sm:inset-10 bg-slate-950/95 border border-cyan-500/80 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.4)] backdrop-blur-2xl flex flex-col'
          : 'relative w-full h-full bg-slate-950/90 border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden'
      }`}
    >
      {/* Visualizer Top Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-xs text-white flex items-center gap-1.5">
            <SatIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>{satellite.name}</span>
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-semibold">
            {satellite.orbitType.split(' ')[0]} ({satellite.altitudeKm} km)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle Camera Angle */}
          <button
            onClick={handleToggleCam}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Kamera Bakış Açısını Değiştir (Nadir / Yörünge)"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Minimize */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isExpanded ? 'Küçült' : 'Tam Ekran'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div 
        ref={mountRef} 
        className="w-full flex-1 min-h-[190px] relative cursor-grab active:cursor-grabbing overflow-hidden"
      >
        {/* Floating Telemetry Overlay inside 3D viewer */}
        <div className="absolute top-2 left-2 pointer-events-none flex flex-col gap-1 text-[10px] font-mono">
          <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-cyan-300 flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>RADAR/SPEKTRAL IŞIN: AKTİF</span>
          </div>
          <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
            HIZ: 7.52 km/sn · ÇÖZÜNÜRLÜK: {satellite.resolutionMeters}m
          </div>
        </div>

        {/* Target Ground Track Indicator */}
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none flex items-center justify-between text-[10px] font-mono px-2 py-1 rounded bg-slate-950/85 border border-slate-800/80 text-slate-400">
          <div className="flex items-center gap-1 truncate">
            <span className="text-cyan-400 font-bold">HEDEF:</span>
            <span className="text-slate-200">{targetCoords.lat.toFixed(6)}°N, {targetCoords.lng.toFixed(6)}°E</span>
          </div>
          <div className="text-emerald-400 font-bold shrink-0">
            {isScanning ? 'TARANIYOR' : 'KİLİTLENDİ'}
          </div>
        </div>

        {/* Drag rotation hint */}
        <div className="absolute top-2 right-2 pointer-events-none text-[9px] text-slate-500 font-mono bg-slate-950/70 px-1.5 py-0.5 rounded">
          3B Döndür
        </div>
      </div>

    </div>
  );
};
