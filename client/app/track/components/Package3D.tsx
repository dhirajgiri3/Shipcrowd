'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, useTexture } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

interface Package3DProps {
  status: string;
  className?: string;
}

function PackageBox({ status }: { status: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lidRef = useRef<THREE.Group>(null);

  // Determine lid opening angle based on status
  const getLidAngle = (status: string) => {
    switch (status) {
      case 'delivered':
        return Math.PI * 0.6; // 108 degrees - fully open
      case 'OUT_FOR_DELIVERY':
        return Math.PI * 0.3; // 54 degrees - half open
      case 'IN_TRANSIT':
      case 'ARRIVED_AT_DESTINATION':
        return Math.PI * 0.15; // 27 degrees - slightly open
      default:
        return 0; // Sealed
    }
  };

  const targetAngle = getLidAngle(status);

  // Idle rotation animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }

    // Animate lid opening
    if (lidRef.current) {
      lidRef.current.rotation.x = THREE.MathUtils.lerp(
        lidRef.current.rotation.x,
        -targetAngle,
        0.05
      );
    }
  });

  return (
    <group ref={meshRef}>
      {/* Main box body */}
      <Box args={[2, 2, 2]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#d4a574"
          roughness={0.8}
          metalness={0.1}
        />
      </Box>

      {/* Box lid (animated) */}
      <group ref={lidRef} position={[0, 1, 0]}>
        <Box args={[2.1, 0.2, 2.1]} position={[0, 0.1, 0]}>
          <meshStandardMaterial
            color="#c49563"
            roughness={0.8}
            metalness={0.1}
          />
        </Box>
      </group>

      {/* Tape details */}
      <Box args={[2.2, 0.1, 0.3]} position={[0, 1, 0]}>
        <meshStandardMaterial
          color="#daa520"
          roughness={0.4}
          metalness={0.2}
        />
      </Box>

      {/* Glow effect when delivered */}
      {status === 'delivered' && (
        <pointLight
          position={[0, 1.5, 0]}
          intensity={2}
          color="#ffd700"
          distance={5}
        />
      )}
    </group>
  );
}

export function Package3D({ status, className = '' }: Package3DProps) {
  return (
    <motion.div
      className={`w-full h-full ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: 0.3,
      }}
    >
      <Canvas
        camera={{ position: [4, 3, 4], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <spotLight
            position={[0, 10, 0]}
            angle={0.3}
            penumbra={1}
            intensity={0.5}
            castShadow
          />

          {/* 3D Package */}
          <PackageBox status={status} />

          {/* Controls */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
            autoRotate
            autoRotateSpeed={1}
          />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}
