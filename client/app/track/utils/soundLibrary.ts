/**
 * Sound Library for Track Page
 * Manages audio assets and provides a centralized sound registry
 */

export const SOUND_PATHS = {
  whoosh: '/sounds/whoosh.mp3',
  chime: '/sounds/chime.mp3',
  tick: '/sounds/tick.mp3',
  ping: '/sounds/ping.mp3',
  ding: '/sounds/ding.mp3',
  error: '/sounds/error.mp3',
  click: '/sounds/click.mp3',
  tada: '/sounds/tada.mp3',
} as const;

export type SoundKey = keyof typeof SOUND_PATHS;

export const SOUND_VOLUMES: Record<SoundKey, number> = {
  whoosh: 0.25,
  chime: 0.3,
  tick: 0.15,
  ping: 0.3,
  ding: 0.35,
  error: 0.2,
  click: 0.1,
  tada: 0.4,
};

export const SOUND_DESCRIPTIONS: Record<SoundKey, string> = {
  whoosh: 'Search submit scanning effect',
  chime: 'Results appear success tone',
  tick: 'Timeline scroll progress indicator',
  ping: 'Status update notification',
  ding: 'Delivery complete achievement',
  error: 'Error feedback',
  click: 'Button hover micro-interaction',
  tada: 'Easter egg discovery',
};
