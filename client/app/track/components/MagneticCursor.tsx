'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalCursor, CursorMode } from '../hooks/useMagneticEffect';

export function MagneticCursor() {
  const { cursorPosition, cursorMode, isVisible } = useGlobalCursor();
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect touch device
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Hide default cursor
    document.body.style.cursor = 'none';
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      (el as HTMLElement).style.cursor = 'none';
    });

    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  // Don't render on touch devices
  if (isTouchDevice) return null;

  const getCursorSize = () => {
    switch (cursorMode) {
      case 'button':
        return { width: 60, height: 60 };
      case 'card':
        return { width: 40, height: 40 };
      case 'map':
        return { width: 48, height: 48 };
      case 'rotate':
        return { width: 56, height: 56 };
      case 'link':
        return { width: 32, height: 32 };
      default:
        return { width: 20, height: 20 };
    }
  };

  const getCursorContent = () => {
    switch (cursorMode) {
      case 'button':
        return (
          <div className="text-xs font-bold text-white">Click</div>
        );
      case 'rotate':
        return (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'map':
        return (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      default:
        return null;
    }
  };

  const size = getCursorSize();

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Main cursor */}
          <motion.div
            className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
            style={{
              x: cursorPosition.x,
              y: cursorPosition.y,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative"
              style={{
                width: size.width,
                height: size.height,
                x: -size.width / 2,
                y: -size.height / 2,
              }}
              animate={size}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                mass: 0.5,
              }}
            >
              {/* Outer ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white flex items-center justify-center"
                animate={{
                  scale: cursorMode !== 'default' ? 1 : 0.5,
                  borderColor: cursorMode === 'button' ? '#2525FF' : '#FFFFFF',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                }}
              >
                {getCursorContent()}
              </motion.div>

              {/* Inner dot */}
              <AnimatePresence>
                {cursorMode === 'default' && (
                  <motion.div
                    className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full"
                    style={{ x: '-50%', y: '-50%' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Particle trail */}
          <motion.div
            className="fixed top-0 left-0 pointer-events-none z-[9998]"
            style={{
              x: cursorPosition.x,
              y: cursorPosition.y,
            }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-30"
                style={{
                  x: -2,
                  y: -2,
                }}
                animate={{
                  scale: [1, 0],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.05,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to set cursor mode on hover
export function useCursorMode(mode: CursorMode) {
  useEffect(() => {
    const handleMouseEnter = () => {
      window.dispatchEvent(new CustomEvent('cursorMode', { detail: mode }));
    };

    const handleMouseLeave = () => {
      window.dispatchEvent(new CustomEvent('cursorMode', { detail: 'default' }));
    };

    const elements = document.querySelectorAll(`[data-cursor="${mode}"]`);
    elements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      elements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [mode]);
}
