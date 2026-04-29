import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function Scenery() {
  const groupRef = useRef<THREE.Group>(null);
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const itemCount = isMobile ? 20 : 45;

  // Gerar geometrias aleatórias espalhadas pelo espaço (template style 3js)
  const items = useMemo(() => {
    return Array.from({ length: itemCount }).map(() => ({
      position: [
        (Math.random() - 0.5) * 30, // x
        (Math.random() - 0.5) * 30, // y
        (Math.random() - 0.5) * 15 - 5 // z (mais para trás)
      ] as [number, number, number],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ] as [number, number, number],
      scale: Math.random() * 0.8 + 0.3,
      type: Math.floor(Math.random() * 4), // Tipos de formas: 0 a 3
      isWireframe: Math.random() > 0.5 // Algumas sólidas, outras wireframe
    }));
  }, [itemCount]);

  useFrame((state) => {
    if (groupRef.current) {
      // Rotação suave da câmera virtual/grupo
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {items.map((item, i) => (
        <Float key={i} speed={1} rotationIntensity={2} floatIntensity={2}>
          <mesh position={item.position} rotation={item.rotation} scale={item.scale}>
            {item.type === 0 && <icosahedronGeometry args={[1, 0]} />}
            {item.type === 1 && <torusGeometry args={[0.7, 0.2, 16, 32]} />}
            {item.type === 2 && <octahedronGeometry args={[1, 0]} />}
            {item.type === 3 && <tetrahedronGeometry args={[1, 0]} />}
            
            <meshStandardMaterial 
              color={item.isWireframe ? "#a78bfa" : "#0d041a"}
              emissive={item.isWireframe ? "#2e1065" : "#000000"}
              wireframe={item.isWireframe} 
              transparent 
              opacity={item.isWireframe ? 0.35 : 0.9} 
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export function ThreeAbstractBackground() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 45 }} 
        dpr={isMobile ? [1, 1] : [1, 2]}
      >
        <ambientLight intensity={0.5} />
        {/* Luzes direcionais para dar destaque as formas metálicas */}
        <directionalLight position={[10, 10, 10]} intensity={2} color="#a78bfa" />
        <directionalLight position={[-10, -10, -5]} intensity={1.5} color="#2dd4bf" />
        
        <Scenery />
        
        {/* Partículas de fundo para magia sutil */}
        <Sparkles 
          count={isMobile ? 50 : 150} 
          scale={25} 
          size={isMobile ? 1 : 2} 
          speed={0.2} 
          opacity={0.4} 
          color="#a78bfa" 
        />
        
        {/* Fog para os elementos sumirem suavemente na escuridão ao fundo */}
        <fog attach="fog" args={['#050508', 10, 35]} />
      </Canvas>
      {/* Camadas para garantir que o texto seja sempre legível */}
      <div className="absolute inset-0 bg-void/20 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void border-b-0" />
    </div>
  );
}
