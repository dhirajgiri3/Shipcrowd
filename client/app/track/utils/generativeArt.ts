/**
 * Generative Art System
 * Creates unique visual art based on tracking number as seed
 */

// Simple hash function to convert string to number seed
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded random number generator (deterministic)
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }
}

export interface GeneratedArt {
  seed: number;
  hue: number;
  saturation: number;
  lightness: number;
  pattern: 'circles' | 'lines' | 'waves' | 'organic' | 'geometric';
  shapeCount: number;
  colors: string[];
  shapes: Array<{
    type: 'circle' | 'rect' | 'path';
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    path?: string;
    color: string;
    opacity: number;
  }>;
}

export function generateArt(trackingNumber: string, deliveryData?: {
  distance?: number;
  timeElapsed?: number;
  status?: string;
}): GeneratedArt {
  const seed = hashCode(trackingNumber);
  const rng = new SeededRandom(seed);

  // Generate base color from tracking number
  const hue = rng.int(0, 360);
  const saturation = rng.range(60, 90);
  const lightness = rng.range(50, 70);

  // Determine pattern based on seed
  const patterns: GeneratedArt['pattern'][] = ['circles', 'lines', 'waves', 'organic', 'geometric'];
  const pattern = patterns[rng.int(0, patterns.length)];

  // Generate color palette
  const colors = [
    `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    `hsl(${(hue + 60) % 360}, ${saturation}%, ${lightness + 10}%)`,
    `hsl(${(hue + 120) % 360}, ${saturation - 20}%, ${lightness - 10}%)`,
    `hsl(${(hue + 180) % 360}, ${saturation}%, ${lightness}%)`,
  ];

  // Adjust shape count based on delivery data
  let baseShapeCount = rng.int(8, 15);
  if (deliveryData?.distance) {
    baseShapeCount += Math.min(10, Math.floor(deliveryData.distance / 100));
  }

  // Generate shapes based on pattern
  const shapes: GeneratedArt['shapes'] = [];
  const viewWidth = 400;
  const viewHeight = 300;

  switch (pattern) {
    case 'circles':
      for (let i = 0; i < baseShapeCount; i++) {
        shapes.push({
          type: 'circle',
          x: rng.range(0, viewWidth),
          y: rng.range(0, viewHeight),
          radius: rng.range(10, 80),
          color: colors[rng.int(0, colors.length)],
          opacity: rng.range(0.1, 0.4),
        });
      }
      break;

    case 'lines':
      for (let i = 0; i < baseShapeCount; i++) {
        const x1 = rng.range(0, viewWidth);
        const y1 = rng.range(0, viewHeight);
        const x2 = rng.range(0, viewWidth);
        const y2 = rng.range(0, viewHeight);
        shapes.push({
          type: 'path',
          x: 0,
          y: 0,
          path: `M ${x1} ${y1} L ${x2} ${y2}`,
          color: colors[rng.int(0, colors.length)],
          opacity: rng.range(0.2, 0.5),
        });
      }
      break;

    case 'waves':
      for (let i = 0; i < baseShapeCount; i++) {
        const startX = rng.range(0, viewWidth);
        const startY = rng.range(0, viewHeight);
        const cp1x = rng.range(0, viewWidth);
        const cp1y = rng.range(0, viewHeight);
        const cp2x = rng.range(0, viewWidth);
        const cp2y = rng.range(0, viewHeight);
        const endX = rng.range(0, viewWidth);
        const endY = rng.range(0, viewHeight);

        shapes.push({
          type: 'path',
          x: 0,
          y: 0,
          path: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
          color: colors[rng.int(0, colors.length)],
          opacity: rng.range(0.15, 0.4),
        });
      }
      break;

    case 'organic':
      for (let i = 0; i < baseShapeCount; i++) {
        const centerX = rng.range(50, viewWidth - 50);
        const centerY = rng.range(50, viewHeight - 50);
        const points = [];
        const numPoints = rng.int(5, 8);

        for (let j = 0; j < numPoints; j++) {
          const angle = (j / numPoints) * Math.PI * 2;
          const radius = rng.range(20, 60);
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          points.push(`${j === 0 ? 'M' : 'L'} ${x} ${y}`);
        }
        points.push('Z');

        shapes.push({
          type: 'path',
          x: 0,
          y: 0,
          path: points.join(' '),
          color: colors[rng.int(0, colors.length)],
          opacity: rng.range(0.1, 0.3),
        });
      }
      break;

    case 'geometric':
      for (let i = 0; i < baseShapeCount; i++) {
        shapes.push({
          type: 'rect',
          x: rng.range(0, viewWidth),
          y: rng.range(0, viewHeight),
          width: rng.range(20, 100),
          height: rng.range(20, 100),
          color: colors[rng.int(0, colors.length)],
          opacity: rng.range(0.1, 0.35),
        });
      }
      break;
  }

  return {
    seed,
    hue,
    saturation,
    lightness,
    pattern,
    shapeCount: baseShapeCount,
    colors,
    shapes,
  };
}
