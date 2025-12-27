'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { SoundKey } from '../utils/soundLibrary';

interface SoundContextValue {
  play: (soundKey: SoundKey, volume?: number) => void;
  vibrate: (pattern?: number | number[]) => void;
  isMuted: boolean;
  isLoaded: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const soundEffects = useSoundEffects();

  return (
    <SoundContext.Provider value={soundEffects}>
      {children}
      <MuteToggle />
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within SoundProvider');
  }
  return context;
}

function MuteToggle() {
  const { isMuted, toggleMute, isLoaded } = useSound();

  if (!isLoaded) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={toggleMute}
      className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      <AnimatePresence mode="wait">
        {isMuted ? (
          <motion.div
            key="muted"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <VolumeX className="w-5 h-5 text-gray-400" />
          </motion.div>
        ) : (
          <motion.div
            key="unmuted"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Volume2 className="w-5 h-5 text-[var(--primary-blue)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
          {isMuted ? 'Unmute sounds' : 'Mute sounds'}
        </div>
      </div>
    </motion.button>
  );
}
