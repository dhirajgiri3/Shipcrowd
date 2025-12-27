'use client';

import { useEffect, useState, useCallback, RefObject } from 'react';

export type CursorMode = 'default' | 'button' | 'card' | 'map' | 'rotate' | 'link';

interface MagneticEffectOptions {
  strength?: number; // How strong the magnetic pull is (0-1)
  radius?: number; // Distance at which magnetism starts
}

export function useMagneticEffect(
  elementRef: RefObject<HTMLElement>,
  options: MagneticEffectOptions = {}
) {
  const { strength = 0.3, radius = 80 } = options;
  const [transform, setTransform] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < radius) {
      const pull = (1 - distance / radius) * strength;
      setTransform({
        x: deltaX * pull,
        y: deltaY * pull,
      });
    } else {
      setTransform({ x: 0, y: 0 });
    }
  }, [elementRef, strength, radius]);

  const handleMouseLeave = useCallback(() => {
    setTransform({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('mousemove', handleMouseMove as any);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove as any);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [elementRef, handleMouseMove, handleMouseLeave]);

  return transform;
}

export function useGlobalCursor() {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [cursorMode, setCursorMode] = useState<CursorMode>('default');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let rafId: number;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!isVisible) setIsVisible(true);
    };

    const animate = () => {
      currentX = lerp(currentX, targetX, 0.15);
      currentY = lerp(currentY, targetY, 0.15);

      setCursorPosition({ x: currentX, y: currentY });
      rafId = requestAnimationFrame(animate);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseenter', handleMouseEnter);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, [isVisible]);

  return { cursorPosition, cursorMode, setCursorMode, isVisible };
}
