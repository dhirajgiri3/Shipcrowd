'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useKonamiCode } from '../hooks/useKonamiCode';

interface EasterEggsProps {
  onEasterEggFound?: (eggName: string) => void;
}

export function EasterEggs({ onEasterEggFound }: EasterEggsProps) {
  const [retro8BitMode, setRetro8BitMode] = useState(false);
  const [matrixMode, setMatrixMode] = useState(false);
  const [eggCount, setEggCount] = useState(0);

  // Konami Code Easter Egg
  const { isActive: konamiActive, reset: resetKonami } = useKonamiCode(() => {
    setRetro8BitMode(true);
    onEasterEggFound?.('konami');
    setEggCount(prev => prev + 1);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF0000', '#00FF00', '#0000FF'],
    });
  });

  // Matrix Mode - detect "MATRIX" typing
  useEffect(() => {
    let sequence: string[] = [];

    const handleKeyPress = (e: KeyboardEvent) => {
      sequence.push(e.key.toUpperCase());
      sequence = sequence.slice(-6);

      if (sequence.join('') === 'MATRIX') {
        setMatrixMode(true);
        onEasterEggFound?.('matrix');
        setEggCount(prev => prev + 1);

        setTimeout(() => setMatrixMode(false), 10000); // 10 seconds
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [onEasterEggFound]);

  // Device Shake Detection (Mobile)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastX: number, lastY: number, lastZ: number;
    let shakeThreshold = 15;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || !acc.x || !acc.y || !acc.z) return;

      const deltaX = Math.abs(lastX - acc.x);
      const deltaY = Math.abs(lastY - acc.y);
      const deltaZ = Math.abs(lastZ - acc.z);

      if (deltaX > shakeThreshold && deltaY > shakeThreshold) {
        onEasterEggFound?.('shake');
        setEggCount(prev => prev + 1);

        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }

      lastX = acc.x;
      lastY = acc.y;
      lastZ = acc.z;
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [onEasterEggFound]);

  return (
    <>
      {/* Retro 8-Bit Mode Overlay */}
      <AnimatePresence>
        {retro8BitMode && (
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Pixelated Border */}
            <div className="absolute inset-0 border-8 border-dashed border-pink-500 animate-pulse" />

            {/* Retro Text */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <div className="bg-black border-4 border-green-400 p-8 font-mono text-green-400 text-2xl">
                <div className="animate-pulse">▲ ▼ ▲ ▼ ◀ ▶ ◀ ▶ B A</div>
                <div className="mt-4 text-lg">RETRO MODE ACTIVATED!</div>
                <button
                  onClick={() => {
                    setRetro8BitMode(false);
                    resetKonami();
                  }}
                  className="mt-4 px-6 py-2 bg-green-400 text-black font-bold hover:bg-green-300 transition-colors pointer-events-auto"
                >
                  [ EXIT ]
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matrix Rain Effect */}
      <AnimatePresence>
        {matrixMode && (
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-none overflow-hidden bg-black bg-opacity-80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MatrixRain />
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center font-mono text-green-400 text-3xl font-bold"
              initial={{ scale: 0, y: -100 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="animate-pulse drop-shadow-[0_0_10px_rgba(0,255,0,0.7)]">
                MATRIX MODE
              </div>
              <div className="text-sm mt-4 opacity-70">Tracking the Matrix...</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Easter Egg Counter Badge */}
      <AnimatePresence>
        {eggCount > 0 && (
          <motion.div
            className="fixed top-4 left-4 z-50 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            🥚 {eggCount} Easter Egg{eggCount !== 1 ? 's' : ''} Found!
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Matrix Rain Component
function MatrixRain() {
  const columns = 50;
  const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

  return (
    <div className="absolute inset-0 flex">
      {[...Array(columns)].map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 text-green-400 font-mono text-xs overflow-hidden"
          style={{
            textShadow: '0 0 5px rgba(0, 255, 0, 0.7)',
          }}
          animate={{
            y: ['0%', '100%'],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 2,
          }}
        >
          {[...Array(50)].map((_, j) => (
            <div key={j} className="opacity-70">
              {characters[Math.floor(Math.random() * characters.length)]}
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}
