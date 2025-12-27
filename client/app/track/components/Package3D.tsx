'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useTexture } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

interface Package3DProps {
  status: string;
  className?: string;
}

function RealisticPackageBox({ status }: { status: string }) {
  const boxRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const tapeRefs = useRef<THREE.Mesh[]>([]);

  // Cardboard material colors
  const cardboardColor = new THREE.Color('#C19A6B');
  const tapeColor = new THREE.Color('#B8860B');
  const labelColor = new THREE.Color('#FFFFFF');

  // Calculate lid opening based on status
  const getLidOpenness = (status: string): number => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'DELIVERED':
        return 1.0; // Fully open (120 degrees)
      case 'OUT_FOR_DELIVERY':
        return 0.6; // 60% open (72 degrees)
      case 'IN_TRANSIT':
      case 'ARRIVED_AT_DESTINATION':
        return 0.3; // 30% open (36 degrees)
      case 'PICKED_UP':
        return 0.15; // Slightly cracked (18 degrees)
      default:
        return 0; // Sealed
    }
  };

  const targetLidAngle = useMemo(() => getLidOpenness(status) * Math.PI * 0.67, [status]);

  // Smooth animation
  useFrame((state, delta) => {
    if (boxRef.current) {
      // Gentle idle rotation
      boxRef.current.rotation.y += delta * 0.15;
    }

    if (lidRef.current) {
      // Smooth lid opening animation
      const currentAngle = lidRef.current.rotation.x;
      const diff = targetLidAngle - currentAngle;
      lidRef.current.rotation.x += diff * 0.05;
    }
  });

  return (
    <group ref={boxRef}>
      {/* Main Box Body */}
      <group position={[0, 0, 0]}>
        {/* Bottom */}
        <mesh position={[0, -1, 0]}>
          <boxGeometry args={[2, 0.1, 1.5]} />
          <meshStandardMaterial
            color={cardboardColor}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

        {/* Front Face */}
        <mesh position={[0, 0, 0.75]}>
          <boxGeometry args={[2, 2, 0.1]} />
          <meshStandardMaterial
            color={cardboardColor}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

        {/* Back Face */}
        <mesh position={[0, 0, -0.75]}>
          <boxGeometry args={[2, 2, 0.1]} />
          <meshStandardMaterial
            color={cardboardColor}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

        {/* Left Face */}
        <mesh position={[-1, 0, 0]}>
          <boxGeometry args={[0.1, 2, 1.5]} />
          <meshStandardMaterial
            color={cardboardColor}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

        {/* Right Face */}
        <mesh position={[1, 0, 0]}>
          <boxGeometry args={[0.1, 2, 1.5]} />
          <meshStandardMaterial
            color={cardboardColor}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

        {/* Vertical Tape Strips on Front */}
        <mesh position={[0, 0, 0.76]}>
          <boxGeometry args={[0.15, 2.1, 0.02]} />
          <meshStandardMaterial
            color={tapeColor}
            roughness={0.3}
            metalness={0.2}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Shipping Label */}
        <mesh position={[0, 0.3, 0.77]}>
          <planeGeometry args={[1.2, 0.8]} />
          <meshStandardMaterial
            color={labelColor}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>

        {/* Barcode on label */}
        <mesh position={[0, 0, 0.771]}>
          <planeGeometry args={[0.9, 0.3]} />
          <meshStandardMaterial color="#000000" />
        </mesh>

        {/* Fragile Icon */}
        <mesh position={[0.6, -0.5, 0.77]}>
          <circleGeometry args={[0.15, 32]} />
          <meshStandardMaterial
            color="#FF0000"
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>

      {/* Animated Lid */}
      <group ref={lidRef} position={[0, 1, 0]}>
        {/* Lid Top */}
        <mesh position={[0, 0.05, -0.75]} rotation={[0, 0, 0]}>
          <boxGeometry args={[2.1, 0.1, 1.6]} />
          <meshStandardMaterial
            color={cardboardColor.clone().multiplyScalar(0.95)}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

        {/* Lid Front Flap */}
        <mesh position={[0, -0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[2.1, 1.5, 0.1]} />
          <meshStandardMaterial
            color={cardboardColor.clone().multiplyScalar(0.92)}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

        {/* Horizontal Tape on Lid */}
        <mesh position={[0, 0.06, -0.75]}>
          <boxGeometry args={[2.2, 0.02, 0.15]} />
          <meshStandardMaterial
            color={tapeColor}
            roughness={0.3}
            metalness={0.2}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Cross Tape */}
        <mesh position={[0, 0.06, -0.3]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[0.15, 0.02, 1.8]} />
          <meshStandardMaterial
            color={tapeColor}
            roughness={0.3}
            metalness={0.2}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* Inner Glow when Delivered */}
      {status.toUpperCase() === 'DELIVERED' && (
        <>
          <pointLight position={[0, 0.5, 0]} intensity={2} color="#FFD700" distance={4} decay={2} />
          <pointLight position={[0, 0.8, 0]} intensity={1.5} color="#FFA500" distance={3} decay={2} />

          {/* Particle effect inside box */}
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.8, 16, 16]} />
            <meshBasicMaterial
              color="#FFD700"
              transparent
              opacity={0.1}
              wireframe
            />
          </mesh>
        </>
      )}

      {/* Confetti particles when delivered */}
      {status.toUpperCase() === 'DELIVERED' && (
        <group>
          {[...Array(20)].map((_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * 2,
                Math.random() * 1.5,
                (Math.random() - 0.5) * 1.5,
              ]}
            >
              <boxGeometry args={[0.05, 0.05, 0.01]} />
              <meshStandardMaterial
                color={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][i % 5]}
                emissive={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][i % 5]}
                emissiveIntensity={0.5}
              />
            </mesh>
          ))}
        </group>
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
        stiffness: 260,
        damping: 20,
        delay: 0.3,
      }}
    >
      <Canvas
        camera={{ position: [3.5, 2.5, 3.5], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        shadows
      >
        {/* Lighting Setup for Realism */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={20}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        <spotLight
          position={[0, 10, 0]}
          angle={0.5}
          penumbra={1}
          intensity={0.8}
          castShadow
        />

        {/* Hemisphere light for ambient realism */}
        <hemisphereLight args={['#ffffff', '#666666', 0.6]} />

        {/* Realistic Package */}
        <RealisticPackageBox status={status} />

        {/* Contact Shadows for depth */}
        <ContactShadows
          position={[0, -1.05, 0]}
          opacity={0.4}
          scale={5}
          blur={2}
          far={4}
        />

        {/* Studio Environment */}
        <Environment preset="studio" />

        {/* Orbit Controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={8}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          autoRotate
          autoRotateSpeed={0.5}
          dampingFactor={0.05}
          rotateSpeed={0.5}
        />
      </Canvas>
    </motion.div>
  );
}
