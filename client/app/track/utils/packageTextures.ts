/**
 * Procedural texture generation utilities for photorealistic 3D package
 *
 * This module generates all textures using Canvas API and simplex noise:
 * - Cardboard base texture with fiber patterns
 * - Wear patterns (scratches, dents, dirt, corner wear)
 * - Corrugation normal maps
 * - Barcodes (UPC-A format)
 * - Shipping labels
 * - Tape bubble and wrinkle effects
 */

import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import {
  CARDBOARD_MATERIAL,
  TAPE_MATERIAL,
  WEAR_PATTERNS,
  BARCODE_SPECS,
  LABEL_PROPERTIES,
  TEXTURE_RESOLUTIONS,
  TextureConfig,
} from '../types/package3d.types';

// ============================================================================
// CARDBOARD BASE TEXTURE
// ============================================================================

/**
 * Generates realistic cardboard base color texture with fiber patterns
 * Uses simplex noise for natural-looking color variation
 */
export function generateCardboardTexture(config?: Partial<TextureConfig>): THREE.CanvasTexture {
  try {
    const width = config?.width || TEXTURE_RESOLUTIONS.cardboardBase.width;
    const height = config?.height || TEXTURE_RESOLUTIONS.cardboardBase.height;
    const baseColor = config?.baseColor || CARDBOARD_MATERIAL.baseColor;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      console.warn('Failed to get canvas context for cardboard texture, using fallback');
      return createFallbackTexture();
    }

    // Base color fill
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    // Apply luminance variation using simplex noise (5-10%)
    const noise2D = createNoise2D();
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Multi-octave noise for natural variation
        const noiseValue =
          noise2D(x * 0.01, y * 0.01) * 0.5 +
          noise2D(x * 0.03, y * 0.03) * 0.3 +
          noise2D(x * 0.08, y * 0.08) * 0.2;

        // Map to 5-10% luminance variation
        const variation = noiseValue * 0.1; // -10% to +10%

        data[idx] = Math.min(255, Math.max(0, data[idx] * (1 + variation))); // R
        data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] * (1 + variation))); // G
        data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] * (1 + variation))); // B
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add fiber direction (horizontal lines with slight variation)
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.1;

    for (let i = 0; i < 200; i++) {
      const y = Math.random() * height;
      const fiberNoise = noise2D(i * 0.1, y * 0.01);
      const opacity = 0.02 + Math.random() * 0.03;

      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = 0.5 + Math.random() * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y + fiberNoise * 20);
      ctx.stroke();
    }

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.needsUpdate = true;

    return texture;
  } catch (error) {
    console.error('Error generating cardboard texture:', error);
    return createFallbackTexture();
  }
}

/**
 * Creates a simple fallback texture when generation fails
 */
function createFallbackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = CARDBOARD_MATERIAL.baseColor;
    ctx.fillRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// ============================================================================
// WEAR PATTERNS
// ============================================================================

/**
 * Adds realistic wear patterns to existing canvas context
 * Includes scratches, dents, dirt smudges, and corner wear
 */
export function addWearPatterns(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const noise2D = createNoise2D();

  // SCRATCHES (15-25)
  const scratchCount =
    WEAR_PATTERNS.scratches.count.min +
    Math.random() * (WEAR_PATTERNS.scratches.count.max - WEAR_PATTERNS.scratches.count.min);

  for (let i = 0; i < scratchCount; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const length =
      (WEAR_PATTERNS.scratches.length.min +
        Math.random() * (WEAR_PATTERNS.scratches.length.max - WEAR_PATTERNS.scratches.length.min)) *
      (width / 20); // Scale to canvas
    const angle = Math.random() * Math.PI * 2;
    const opacity = 0.05 + Math.random() * 0.1;

    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.lineWidth =
      WEAR_PATTERNS.scratches.lineWidth.min +
      Math.random() * (WEAR_PATTERNS.scratches.lineWidth.max - WEAR_PATTERNS.scratches.lineWidth.min);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
    ctx.stroke();
  }

  // DENTS (30-50 small depressions)
  const dentCount =
    WEAR_PATTERNS.dents.count.min +
    Math.random() * (WEAR_PATTERNS.dents.count.max - WEAR_PATTERNS.dents.count.min);

  for (let i = 0; i < dentCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius =
      WEAR_PATTERNS.dents.diameter.min +
      Math.random() * (WEAR_PATTERNS.dents.diameter.max - WEAR_PATTERNS.dents.diameter.min);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // DIRT SMUDGES (5-10 irregular spots)
  const smudgeCount =
    WEAR_PATTERNS.dirt.count.min +
    Math.random() * (WEAR_PATTERNS.dirt.count.max - WEAR_PATTERNS.dirt.count.min);

  for (let i = 0; i < smudgeCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size =
      WEAR_PATTERNS.dirt.diameter.min +
      Math.random() * (WEAR_PATTERNS.dirt.diameter.max - WEAR_PATTERNS.dirt.diameter.min);
    const opacity =
      WEAR_PATTERNS.dirt.opacity.min +
      Math.random() * (WEAR_PATTERNS.dirt.opacity.max - WEAR_PATTERNS.dirt.opacity.min);

    // Parse dirt color
    const dirtColor = WEAR_PATTERNS.dirt.color;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, dirtColor.replace(')', `, ${opacity})`).replace('rgb', 'rgba'));
    gradient.addColorStop(1, dirtColor.replace(')', ', 0)').replace('rgb', 'rgba'));

    ctx.fillStyle = gradient;

    // Irregular shape using noise
    ctx.beginPath();
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      const noiseFactor = 0.7 + noise2D(Math.cos(angle) * 5 + i, Math.sin(angle) * 5) * 0.3;
      const r = size * noiseFactor;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (angle === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  // CORNER WEAR (10-15% darker at corners)
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ];

  corners.forEach(([cx, cy]) => {
    const radius =
      WEAR_PATTERNS.cornerWear.radius.min +
      Math.random() * (WEAR_PATTERNS.cornerWear.radius.max - WEAR_PATTERNS.cornerWear.radius.min);
    const darkening = WEAR_PATTERNS.cornerWear.darkeningFactor;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${darkening})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Generates complete cardboard texture with wear patterns applied
 */
export function generateCardboardWithWear(): THREE.CanvasTexture {
  const texture = generateCardboardTexture();
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  addWearPatterns(ctx, canvas.width, canvas.height);

  texture.needsUpdate = true;
  return texture;
}

// ============================================================================
// CORRUGATION NORMAL MAP
// ============================================================================

/**
 * Generates normal map for cardboard corrugation pattern
 * Creates realistic wavy ridges with fiber texture
 */
export function generateCorrugationNormalMap(): THREE.CanvasTexture {
  const { width, height } = TEXTURE_RESOLUTIONS.normalMap;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const noise2D = createNoise2D();
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const { frequency, depth } = CARDBOARD_MATERIAL.corrugation;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Horizontal corrugation wave (3-4mm period)
      const waveValue = Math.sin(y * frequency) * depth * 1000; // Scale to normal range

      // Add fiber noise
      const fiberNoise = noise2D(x * 0.02, y * 0.02) * CARDBOARD_MATERIAL.fiberVariation * 1000;

      // Combine
      const heightValue = waveValue + fiberNoise;

      // Convert height to normal (simple finite difference approximation)
      // Normal pointing outward from surface
      const nx = 128; // Flat in X direction
      const ny = Math.min(255, Math.max(0, 128 + heightValue * 20)); // Height variation in Y
      const nz = 255; // Pointing out (positive Z)

      data[idx] = nx; // R = Normal X
      data[idx + 1] = ny; // G = Normal Y
      data[idx + 2] = nz; // B = Normal Z
      data[idx + 3] = 255; // A = Alpha
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;

  return texture;
}

// ============================================================================
// ROUGHNESS MAP
// ============================================================================

/**
 * Generates roughness map with subtle variation
 */
export function generateRoughnessMap(): THREE.CanvasTexture {
  const { width, height } = TEXTURE_RESOLUTIONS.roughness;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const noise2D = createNoise2D();
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const { min, max } = CARDBOARD_MATERIAL.roughness;
  const avgRoughness = (min + max) / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const noiseValue = noise2D(x * 0.05, y * 0.05);
      const roughness = avgRoughness + noiseValue * 0.05; // Subtle variation

      const value = Math.min(255, Math.max(0, roughness * 255));

      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;

  return texture;
}

// ============================================================================
// AMBIENT OCCLUSION MAP
// ============================================================================

/**
 * Generates ambient occlusion map (darker in crevices)
 */
export function generateAOMap(): THREE.CanvasTexture {
  const { width, height } = TEXTURE_RESOLUTIONS.ao;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const noise2D = createNoise2D();
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // AO based on corrugation valleys
      const corrugation = Math.sin(y * CARDBOARD_MATERIAL.corrugation.frequency);
      const ao = 0.9 + corrugation * -0.1; // Darker in valleys

      // Add noise
      const noiseValue = noise2D(x * 0.03, y * 0.03) * 0.05;
      const finalAO = Math.min(1, Math.max(0.5, ao + noiseValue));

      const value = finalAO * 255;

      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;

  return texture;
}

// ============================================================================
// BARCODE GENERATION
// ============================================================================

/**
 * Generates UPC-A barcode
 * Falls back to simple pattern if jsbarcode unavailable
 */
export function generateBarcode(code: string = '012345678905'): HTMLCanvasElement {
  const { width: w, height: h } = TEXTURE_RESOLUTIONS.barcode;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // Simple fallback barcode pattern
  // Real implementation would use jsbarcode library if available
  ctx.fillStyle = '#000000';

  const barWidth = w / BARCODE_SPECS.barCount;
  let x = w * 0.1; // 10% margin

  // Generate alternating bar pattern
  for (let i = 0; i < BARCODE_SPECS.barCount; i++) {
    const isBar = i % 2 === 0;
    const widthVariation = 1 + (Math.sin(i * 0.5) * 0.3); // Variable width

    if (isBar) {
      ctx.fillRect(x, h * 0.15, barWidth * widthVariation, h * 0.65);
    }

    x += barWidth * widthVariation;
  }

  // Add text below
  ctx.fillStyle = '#000000';
  ctx.font = `${h * 0.12}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(code, w / 2, h * 0.92);

  // Ink absorption effect (slight blur)
  ctx.filter = 'blur(0.3px)';
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.filter = 'blur(0.3px)';
  tempCtx.drawImage(canvas, 0, 0);

  return tempCanvas;
}

// ============================================================================
// SHIPPING LABEL
// ============================================================================

/**
 * Generates complete shipping label with ShipCrowd branding and barcode
 */
export function generateShippingLabel(trackingNumber: string = 'SC-2025-00001'): THREE.CanvasTexture {
  const { width, height } = TEXTURE_RESOLUTIONS.label;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = LABEL_PROPERTIES.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Border (1mm = ~4px at this resolution)
  ctx.strokeStyle = LABEL_PROPERTIES.borderColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // ShipCrowd Logo (top third)
  const logoY = 50;
  const logoHeight = 100;

  ctx.fillStyle = '#2525FF';
  ctx.fillRect(50, logoY, width - 100, logoHeight);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SHIPCROWD', width / 2, logoY + 70);

  // Logo accent squares
  ctx.fillRect(width / 2 - 400, logoY + 25, 60, 60);
  ctx.fillRect(width / 2 + 340, logoY + 25, 60, 60);

  // Tagline
  ctx.fillStyle = '#64748B';
  ctx.font = '20px Arial';
  ctx.fillText('Fast, Reliable, Tracked', width / 2, logoY + logoHeight + 35);

  // Address section (middle)
  const addressY = 250;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('TO:', 70, addressY);

  ctx.font = '28px Arial';
  ctx.fillText('John Doe', 70, addressY + 50);
  ctx.fillText('123 Main Street, Apartment 4B', 70, addressY + 85);
  ctx.fillText('Bangalore, Karnataka 560001', 70, addressY + 120);
  ctx.fillText('India', 70, addressY + 155);

  // FROM section
  ctx.font = 'bold 24px Arial';
  ctx.fillText('FROM: ShipCrowd Logistics', width - 500, addressY + 50);
  ctx.font = '20px Arial';
  ctx.fillText('Mumbai Distribution Center', width - 500, addressY + 80);

  // Tracking number (prominent)
  const trackingY = addressY + 220;
  ctx.fillStyle = '#2525FF';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`TRACKING: ${trackingNumber}`, width / 2, trackingY);

  // Barcode (bottom)
  const barcodeCanvas = generateBarcode(trackingNumber.replace(/[^0-9]/g, '').padStart(12, '0').slice(0, 12));
  const barcodeY = height - barcodeCanvas.height - 60;
  const barcodeX = (width - barcodeCanvas.width) / 2;
  ctx.drawImage(barcodeCanvas, barcodeX, barcodeY);

  // Priority badge
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(width - 100, 100, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PRIORITY', width - 100, 108);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

// ============================================================================
// TAPE TEXTURES
// ============================================================================

/**
 * Generates air bubbles texture for tape
 */
export function generateTapeBubbles(): THREE.CanvasTexture {
  const { width, height } = TEXTURE_RESOLUTIONS.tapeBubbles;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Transparent base
  ctx.clearRect(0, 0, width, height);

  // Random air bubbles
  const bubbleCount =
    WEAR_PATTERNS.tapeBubbles.count.min +
    Math.random() * (WEAR_PATTERNS.tapeBubbles.count.max - WEAR_PATTERNS.tapeBubbles.count.min);

  for (let i = 0; i < bubbleCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius =
      WEAR_PATTERNS.tapeBubbles.diameter.min +
      Math.random() * (WEAR_PATTERNS.tapeBubbles.diameter.max - WEAR_PATTERNS.tapeBubbles.diameter.min);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

/**
 * Generates wrinkle normal map for tape
 */
export function generateTapeWrinkles(): THREE.CanvasTexture {
  const { width, height } = TEXTURE_RESOLUTIONS.tapeWrinkles;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const noise2D = createNoise2D();
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Horizontal wrinkle pattern
      const wrinkleValue = noise2D(x * 0.1, y * 0.5) * 0.3;

      // Convert to normal
      const nx = Math.min(255, Math.max(0, 128 + wrinkleValue * 127));
      const ny = 128;
      const nz = 255;

      data[idx] = nx;
      data[idx + 1] = ny;
      data[idx + 2] = nz;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

// ============================================================================
// TEXTURE DISPOSAL UTILITY
// ============================================================================

/**
 * Properly disposes of textures to prevent memory leaks
 */
export function disposeTextures(...textures: (THREE.Texture | null | undefined)[]): void {
  textures.forEach((texture) => {
    if (texture) {
      texture.dispose();
    }
  });
}
