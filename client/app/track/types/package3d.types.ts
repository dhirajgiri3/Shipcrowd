/**
 * Type definitions and constants for photorealistic 3D package rendering
 *
 * Units: 1 Three.js unit = 10cm in real world
 * Real-world dimensions: 40cm × 30cm × 25cm (L × W × H)
 * Three.js dimensions: 4.0 × 3.0 × 2.5 units
 */

import * as THREE from 'three';

// ============================================================================
// BOX DIMENSIONS
// ============================================================================

/**
 * Primary box dimensions in Three.js units (1 unit = 10cm)
 */
export const BOX_DIMENSIONS = {
  /** Length along X-axis: 40cm */
  length: 4.0,

  /** Width along Z-axis: 30cm */
  width: 3.0,

  /** Height along Y-axis: 25cm */
  height: 2.5,

  /** Wall thickness: 4.5mm average */
  wallThickness: 0.0045,

  /** Corner radius for beveling: 2mm */
  cornerRadius: 0.002,

  /** Single wall cardboard thickness: 0.4mm */
  cardboardThickness: 0.0004,
} as const;

/**
 * Flap dimensions and properties
 */
export const FLAP_DIMENSIONS = {
  /** Front flap: 15cm × 30cm */
  front: {
    width: 1.5,   // 15cm
    length: 3.0,  // 30cm (full box width)
  },

  /** Back flap: 15cm × 30cm */
  back: {
    width: 1.5,
    length: 3.0,
  },

  /** Left flap: 20cm × 40cm */
  left: {
    width: 2.0,   // 20cm
    length: 4.0,  // 40cm (full box length)
  },

  /** Right flap: 20cm × 40cm */
  right: {
    width: 2.0,
    length: 4.0,
  },

  /** Fold line indentation: 0.5mm */
  foldIndent: 0.0005,

  /** Flap taper angle from base to tip: 0.5 degrees */
  taperAngle: 0.5 * (Math.PI / 180),

  /** Thickness: visible cardboard thickness (5mm = 0.05 units) */
  thickness: 0.05,
} as const;

// ============================================================================
// MATERIAL PROPERTIES
// ============================================================================

/**
 * Cardboard material physical properties
 */
export const CARDBOARD_MATERIAL = {
  /** Base kraft brown color */
  baseColor: '#C4A574',

  /** Dark variant for shadows/edges */
  darkColor: '#B8956B',

  /** Luminance variation range: 5-10% */
  luminanceVariation: { min: 0.05, max: 0.10 },

  /** Surface roughness (matte) */
  roughness: { min: 0.85, max: 0.95 },

  /** Metalness (non-metallic) */
  metalness: 0.0,

  /** Specular reflection coefficient */
  specular: 0.05,

  /** Subsurface scattering coefficient */
  subsurface: 0.1,

  /** Corrugation wave properties */
  corrugation: {
    /** Wave frequency: 3-4mm per cycle */
    frequency: 0.35,

    /** Wave depth: 0.3mm */
    depth: 0.0003,
  },

  /** Fiber direction variation: 0.1mm */
  fiberVariation: 0.0001,
} as const;

/**
 * Packing tape material properties
 */
export const TAPE_MATERIAL = {
  /** Tan/brown polypropylene color */
  baseColor: '#D4A86A',

  /** Adhesive yellowing color */
  adhesiveColor: '#E8D5A0',

  /** Transparency: 60% */
  opacity: 0.6,

  /** Tape width: 48mm */
  width: 0.048,

  /** Tape thickness: 0.05mm */
  thickness: 0.00005,

  /** Surface roughness (slightly glossy) */
  roughness: 0.15,

  /** Specular reflection */
  specular: 0.65,

  /** Index of refraction for polypropylene */
  ior: 1.46,

  /** Edge curl height: 0.3-0.5mm */
  edgeCurl: { min: 0.0003, max: 0.0005 },
} as const;

/**
 * Shipping label properties
 */
export const LABEL_PROPERTIES = {
  /** Label dimensions: 15cm × 10cm */
  width: 1.5,
  height: 1.0,

  /** Background color */
  backgroundColor: '#FFFFFF',

  /** Border thickness: 1mm */
  borderThickness: 0.001,

  /** Border color */
  borderColor: '#000000',

  /** Corner radius: 1mm */
  cornerRadius: 0.001,

  /** Label surface roughness (matte paper) */
  roughness: 0.7,

  /** Elevation from box surface: 0.2mm */
  elevation: 0.0002,
} as const;

/**
 * Barcode specifications (UPC-A format)
 */
export const BARCODE_SPECS = {
  /** Barcode dimensions: 8cm × 3cm */
  width: 0.8,
  height: 0.3,

  /** Number of bars in UPC-A */
  barCount: 95,

  /** Bar width range: 0.3mm to 1.2mm */
  barWidth: { min: 0.0003, max: 0.0012 },

  /** Print DPI equivalent */
  dpi: 600,

  /** Ink opacity (shows paper texture) */
  inkOpacity: 0.95,
} as const;

// ============================================================================
// SURFACE IMPERFECTIONS
// ============================================================================

/**
 * Wear pattern specifications
 */
export const WEAR_PATTERNS = {
  scratches: {
    /** Number of scratches: 15-25 */
    count: { min: 15, max: 25 },

    /** Scratch depth: 0.1-0.5mm */
    depth: { min: 0.0001, max: 0.0005 },

    /** Scratch length: 2-10cm */
    length: { min: 0.2, max: 1.0 },

    /** Line width in pixels */
    lineWidth: { min: 0.5, max: 1.5 },
  },

  dents: {
    /** Number of dents: 30-50 */
    count: { min: 30, max: 50 },

    /** Dent depth: 0.2-0.8mm */
    depth: { min: 0.0002, max: 0.0008 },

    /** Dent diameter: 2-5mm */
    diameter: { min: 2, max: 5 },
  },

  dirt: {
    /** Number of dirt smudges: 5-10 */
    count: { min: 5, max: 10 },

    /** Smudge diameter: 2-5cm */
    diameter: { min: 20, max: 50 },

    /** Dirt color */
    color: '#8B7355',

    /** Opacity range */
    opacity: { min: 0.1, max: 0.3 },
  },

  cornerWear: {
    /** Darkening percentage */
    darkeningFactor: 0.15,

    /** Wear radius: 5-10cm */
    radius: { min: 50, max: 100 },
  },

  tapeBubbles: {
    /** Air bubble count: 30-50 */
    count: { min: 30, max: 50 },

    /** Bubble diameter: 2-8mm */
    diameter: { min: 2, max: 8 },
  },
} as const;

// ============================================================================
// LIGHTING SPECIFICATIONS
// ============================================================================

/**
 * Studio lighting configuration
 * Lumen to Three.js intensity conversion for ~6 unit camera distance
 */
export const LIGHTING_CONFIG = {
  /** Main key light: 800 lumens at 45° */
  keyLight: {
    lumens: 800,
    intensity: 1.8,
    position: [4.5, 4.5, 4.5] as [number, number, number],
    color: '#fffaf0', // 5500K color temperature
    castShadow: true,
  },

  /** Fill light 1: 200 lumens */
  fillLight1: {
    lumens: 200,
    intensity: 0.45,
    position: [-3, 3, -2] as [number, number, number],
    color: '#f0f8ff', // Cool fill
  },

  /** Fill light 2: 150 lumens */
  fillLight2: {
    lumens: 150,
    intensity: 0.35,
    position: [2, 2, -4] as [number, number, number],
    color: '#fff5f0', // Warm fill
  },

  /** Ambient light: 100 lumens */
  ambient: {
    lumens: 100,
    intensity: 0.25,
    color: '#ffffff',
  },

  /** HDRI environment intensity */
  environmentIntensity: 0.3,

  /** Shadow configuration */
  shadows: {
    mapSize: [4096, 4096] as [number, number],
    bias: -0.0001,
    radius: 4, // Soft shadow radius (15% penumbra)
    near: 0.5,
    far: 15,
    cameraSize: 6,
  },
} as const;

// ============================================================================
// CAMERA CONFIGURATION
// ============================================================================

/**
 * Camera setup for optimal viewing
 */
export const CAMERA_CONFIG = {
  /** Camera position in 3D space */
  position: [4.5, 2.8, 4.5] as [number, number, number],

  /** Look-at target (slightly above box center) */
  target: [0, 0.125, 0] as [number, number, number],

  /** Field of view: 45-50° (realistic human eye) */
  fov: 48,

  /** Near clipping plane */
  near: 0.1,

  /** Far clipping plane */
  far: 100,

  /** Depth of field */
  depthOfField: {
    /** Aperture f-stop */
    aperture: 5.6,

    /** Focus distance */
    focusDistance: 0.02,

    /** Focal length */
    focalLength: 0.05,

    /** Bokeh scale */
    bokehScale: 3,
  },
} as const;

// ============================================================================
// ANIMATION PHYSICS
// ============================================================================

/**
 * Spring physics parameters for flap animation
 */
export const SPRING_PHYSICS = {
  /** Spring stiffness constant */
  stiffness: 0.08,

  /** Damping coefficient */
  damping: 0.88,

  /** Overshoot multiplier for bounce */
  overshoot: 1.15,
} as const;

/**
 * Flap opening angles based on shipment status
 */
export const FLAP_ANGLES: Record<string, FlapAngles> = {
  DELIVERED: {
    front: Math.PI * 0.9,
    back: Math.PI * 0.9,
    left: Math.PI * 0.85,
    right: Math.PI * 0.85,
  },
  OUT_FOR_DELIVERY: {
    front: Math.PI * 0.6,
    back: Math.PI * 0.5,
    left: Math.PI * 0.55,
    right: Math.PI * 0.55,
  },
  IN_TRANSIT: {
    front: Math.PI * 0.3,
    back: Math.PI * 0.25,
    left: Math.PI * 0.3,
    right: Math.PI * 0.3,
  },
  ARRIVED_AT_DESTINATION: {
    front: Math.PI * 0.4,
    back: Math.PI * 0.35,
    left: Math.PI * 0.4,
    right: Math.PI * 0.4,
  },
  PICKED_UP: {
    front: Math.PI * 0.25,
    back: Math.PI * 0.2,
    left: Math.PI * 0.25,
    right: Math.PI * 0.25,
  },
  ORDER_CREATED: {
    front: 0,
    back: 0,
    left: 0,
    right: 0,
  },
  // Default: sealed box
  DEFAULT: {
    front: 0,
    back: 0,
    left: 0,
    right: 0,
  },
};

// ============================================================================
// TEXTURE RESOLUTION CONFIGURATION
// ============================================================================

/**
 * Texture resolutions optimized for quality/performance balance
 */
export const TEXTURE_RESOLUTIONS = {
  /** Base cardboard color texture */
  cardboardBase: { width: 2048, height: 2048 },

  /** Corrugation normal map */
  normalMap: { width: 2048, height: 2048 },

  /** Roughness map */
  roughness: { width: 1024, height: 1024 },

  /** Ambient occlusion map */
  ao: { width: 1024, height: 1024 },

  /** Shipping label */
  label: { width: 1500, height: 1000 },

  /** Barcode */
  barcode: { width: 800, height: 300 },

  /** Tape bubble texture */
  tapeBubbles: { width: 512, height: 512 },

  /** Tape wrinkle normal map */
  tapeWrinkles: { width: 512, height: 512 },
} as const;

// ============================================================================
// TYPE INTERFACES
// ============================================================================

/**
 * Flap rotation angles for all four flaps
 */
export interface FlapAngles {
  front: number;
  back: number;
  left: number;
  right: number;
}

/**
 * Physics state for individual flap animation
 */
export interface FlapPhysicsState {
  /** Current rotation angle (radians) */
  currentAngle: number;

  /** Angular velocity */
  velocity: number;

  /** Target angle to animate towards */
  targetAngle: number;
}

/**
 * Texture generation configuration
 */
export interface TextureConfig {
  width: number;
  height: number;
  baseColor?: string;
  luminanceVariation?: number;
}

/**
 * Main Package3D component props
 */
export interface Package3DProps {
  /** Current shipment status (determines box opening) */
  status: string;

  /** Optional CSS class for container */
  className?: string;

  /** Optional: Override box dimensions */
  customDimensions?: Partial<typeof BOX_DIMENSIONS>;

  /** Performance/quality mode */
  quality?: 'low' | 'medium' | 'high';
}

/**
 * Shader uniform types
 */
export interface CardboardUniforms {
  baseColorMap: { value: THREE.Texture | null };
  normalMap: { value: THREE.Texture | null };
  roughnessMap: { value: THREE.Texture | null };
  aoMap: { value: THREE.Texture | null };
  baseColor: { value: THREE.Color };
  roughness: { value: number };
  metalness: { value: number };
  specular: { value: number };
  flapBendAmount: { value: number };
  time: { value: number };
  [uniform: string]: { value: any };
}

export interface TapeUniforms {
  bubbleMap: { value: THREE.Texture | null };
  wrinkleMap: { value: THREE.Texture | null };
  tapeColor: { value: THREE.Color };
  opacity: { value: number };
  ior: { value: number };
  [uniform: string]: { value: any };
}

/**
 * Status-based color mapping for inner glow
 */
export type StatusColorMap = Record<string, string>;

export const STATUS_COLORS: StatusColorMap = {
  DELIVERED: '#FFD700',           // Gold
  OUT_FOR_DELIVERY: '#2525FF',    // ShipCrowd Blue
  IN_TRANSIT: '#60A5FA',          // Light Blue
  ARRIVED_AT_DESTINATION: '#60A5FA',
  PICKED_UP: '#3B82F6',           // Blue
  ORDER_CREATED: '#94A3B8',       // Gray
  DEFAULT: '#94A3B8',
};

/**
 * Performance configuration based on device capabilities
 */
export interface PerformanceConfig {
  /** Enable post-processing effects */
  enablePostProcessing: boolean;

  /** Texture resolution multiplier (0.5 for mobile, 1.0 for desktop) */
  textureScale: number;

  /** Shadow map resolution */
  shadowMapSize: number;

  /** Enable ambient occlusion */
  enableAO: boolean;

  /** Maximum device pixel ratio */
  maxDpr: number;
}

/**
 * Get performance config based on device detection
 */
export function getPerformanceConfig(): PerformanceConfig {
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency < 4 : false;

  if (isMobile || isLowEnd) {
    return {
      enablePostProcessing: false,
      textureScale: 0.5,
      shadowMapSize: 2048,
      enableAO: false,
      maxDpr: 1.5,
    };
  }

  return {
    enablePostProcessing: true,
    textureScale: 1.0,
    shadowMapSize: 4096,
    enableAO: true,
    maxDpr: 2,
  };
}
