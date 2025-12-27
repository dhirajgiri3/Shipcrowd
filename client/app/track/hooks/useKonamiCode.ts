'use client';

import { useEffect, useState, useCallback } from 'react';

const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

export function useKonamiCode(callback?: () => void) {
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);

  const activate = useCallback(() => {
    setIsActive(true);
    if (callback) callback();
  }, [callback]);

  const reset = useCallback(() => {
    setIsActive(false);
    setKeySequence([]);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      setKeySequence(prev => {
        const newSequence = [...prev, e.key].slice(-KONAMI_CODE.length);

        // Check if sequence matches Konami code
        if (newSequence.length === KONAMI_CODE.length) {
          const matches = newSequence.every((key, index) => key === KONAMI_CODE[index]);
          if (matches && !isActive) {
            activate();
          }
        }

        return newSequence;
      });
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive, activate]);

  return { isActive, reset, keySequence };
}
