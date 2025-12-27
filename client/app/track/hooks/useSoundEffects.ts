'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl } from 'howler';
import { SOUND_PATHS, SOUND_VOLUMES, SoundKey } from '../utils/soundLibrary';

export function useSoundEffects() {
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const soundsRef = useRef<Record<SoundKey, Howl>>({} as Record<SoundKey, Howl>);

  useEffect(() => {
    // Check localStorage for saved mute preference
    const savedMuteState = localStorage.getItem('soundMuted');
    if (savedMuteState !== null) {
      setIsMuted(savedMuteState === 'true');
    }

    // Initialize all sounds
    const initializeSounds = () => {
      Object.entries(SOUND_PATHS).forEach(([key, path]) => {
        const soundKey = key as SoundKey;
        soundsRef.current[soundKey] = new Howl({
          src: [path],
          volume: SOUND_VOLUMES[soundKey],
          preload: true,
          html5: true, // Use HTML5 Audio for better mobile support
        });
      });
      setIsLoaded(true);
    };

    initializeSounds();

    // Cleanup
    return () => {
      Object.values(soundsRef.current).forEach(sound => {
        sound.unload();
      });
    };
  }, []);

  const play = useCallback((soundKey: SoundKey, volume?: number) => {
    if (isMuted || !isLoaded) return;

    const sound = soundsRef.current[soundKey];
    if (sound) {
      if (volume !== undefined) {
        sound.volume(volume);
      }
      sound.play();
    }
  }, [isMuted, isLoaded]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMute = !prev;
      localStorage.setItem('soundMuted', String(newMute));
      return newMute;
    });
  }, []);

  const vibrate = useCallback((pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  return {
    play,
    toggleMute,
    vibrate,
    isMuted,
    isLoaded,
  };
}
