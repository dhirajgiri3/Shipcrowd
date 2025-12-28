/**
 * Custom GLSL shaders for photorealistic 3D package materials
 *
 * This module contains:
 * - Cardboard material shaders (vertex + fragment)
 * - Tape material shaders (vertex + fragment)
 * - Helper functions for PBR lighting
 * - Material creation utilities
 */

import * as THREE from 'three';
import type { CardboardUniforms, TapeUniforms } from '../types/package3d.types';

// ============================================================================
// CARDBOARD VERTEX SHADER
// ============================================================================

export const cardboardVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  uniform float time;
  uniform float flapBendAmount;
  uniform vec3 foldLinePosition;
  uniform vec3 foldAxis;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;

    // Apply flap bending along fold line (if applicable)
    vec3 pos = position;

    if (flapBendAmount > 0.001) {
      // Calculate distance from fold line
      float distFromFold = length(position.xz - foldLinePosition.xz);

      // Smooth transition from fold line
      float bendFactor = smoothstep(0.0, 2.0, distFromFold);

      // Rotate around fold axis (simplified rotation for flaps)
      float angle = flapBendAmount * bendFactor;
      float cosA = cos(angle);
      float sinA = sin(angle);

      // Rotation around X-axis for flaps
      pos.y = position.y * cosA - position.z * sinA;
      pos.z = position.y * sinA + position.z * cosA;
    }

    // Calculate world position
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;

    // Calculate view position for Fresnel
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

// ============================================================================
// CARDBOARD FRAGMENT SHADER
// ============================================================================

export const cardboardFragmentShader = `
  uniform sampler2D baseColorMap;
  uniform sampler2D normalMap;
  uniform sampler2D roughnessMap;
  uniform sampler2D aoMap;

  uniform vec3 baseColor;
  uniform float roughness;
  uniform float metalness;
  uniform float specular;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  // ======== PBR HELPER FUNCTIONS ========

  /**
   * Fresnel-Schlick approximation
   * Calculates reflectance based on viewing angle
   */
  float fresnelSchlick(vec3 viewDir, vec3 normal, float power) {
    float cosTheta = max(dot(viewDir, normal), 0.0);
    return pow(1.0 - cosTheta, power);
  }

  /**
   * Subsurface scattering approximation for cardboard
   * Simulates light penetration through thin material
   */
  vec3 subsurfaceScattering(vec3 lightDir, vec3 normal, vec3 viewDir, float thickness) {
    // Light passing through material (backscattering)
    float backScatter = max(0.0, dot(lightDir, -normal));

    // Warm cardboard subsurface color
    vec3 sssColor = vec3(0.8, 0.6, 0.4);

    return sssColor * backScatter * thickness * 0.3;
  }

  /**
   * Simple Lambert diffuse lighting
   */
  float lambert(vec3 normal, vec3 lightDir) {
    return max(0.0, dot(normal, lightDir));
  }

  /**
   * Blinn-Phong specular highlight
   */
  float blinnPhong(vec3 normal, vec3 lightDir, vec3 viewDir, float shininess) {
    vec3 halfDir = normalize(lightDir + viewDir);
    return pow(max(0.0, dot(normal, halfDir)), shininess);
  }

  // ======== MAIN SHADER ========

  void main() {
    // Sample textures
    vec4 baseColorSample = texture2D(baseColorMap, vUv);
    vec3 normalSample = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    float roughnessSample = texture2D(roughnessMap, vUv).r;
    float aoSample = texture2D(aoMap, vUv).r;

    // Combine base color
    vec3 albedo = baseColor * baseColorSample.rgb;

    // Calculate final normal (combine geometry normal with normal map)
    vec3 normal = normalize(vNormal + normalSample * 0.5);

    // View direction for Fresnel
    vec3 viewDir = normalize(vViewPosition);

    // === LIGHTING CALCULATION ===

    // Main directional light (key light)
    vec3 lightDir = normalize(vec3(4.5, 4.5, 4.5));
    vec3 lightColor = vec3(1.0, 0.98, 0.94); // 5500K warm white

    // Diffuse lighting
    float diff = lambert(normal, lightDir);
    vec3 diffuse = diff * lightColor * albedo;

    // Specular highlight (subtle for cardboard)
    float shininess = mix(2.0, 8.0, 1.0 - roughnessSample);
    float spec = blinnPhong(normal, lightDir, viewDir, shininess) * specular;
    vec3 specularColor = spec * lightColor * 0.1;

    // Ambient lighting
    vec3 ambient = albedo * 0.25;

    // Apply ambient occlusion
    vec3 litColor = (diffuse + ambient) * aoSample + specularColor;

    // === ADVANCED EFFECTS ===

    // Fresnel edge lighting (rim light effect)
    float fresnelFactor = fresnelSchlick(viewDir, normal, 3.0);
    vec3 fresnelColor = vec3(1.0) * fresnelFactor * 0.15;

    // Subsurface scattering (warm glow in thin areas)
    vec3 sss = subsurfaceScattering(lightDir, normal, viewDir, 0.1);

    // Combine all lighting
    vec3 finalColor = litColor + fresnelColor + sss;

    // Tone mapping (simple reinhard)
    finalColor = finalColor / (finalColor + vec3(1.0));

    // Gamma correction (approximate sRGB)
    finalColor = pow(finalColor, vec3(1.0 / 2.2));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ============================================================================
// TAPE VERTEX SHADER
// ============================================================================

export const tapeVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

// ============================================================================
// TAPE FRAGMENT SHADER
// ============================================================================

export const tapeFragmentShader = `
  uniform sampler2D bubbleMap;
  uniform sampler2D wrinkleMap;
  uniform vec3 tapeColor;
  uniform float opacity;
  uniform float ior; // Index of refraction

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  /**
   * Fresnel effect for dielectric materials (polypropylene tape)
   */
  float fresnelDielectric(vec3 viewDir, vec3 normal, float ior) {
    float cosi = max(0.0, dot(viewDir, normal));
    float cost = 1.0 - (1.0 - cosi * cosi) / (ior * ior);

    if (cost < 0.0) return 1.0; // Total internal reflection

    cost = sqrt(cost);

    float Rs = ((ior * cosi - cost) / (ior * cosi + cost));
    float Rp = ((cosi - ior * cost) / (cosi + ior * cost));

    Rs = Rs * Rs;
    Rp = Rp * Rp;

    return (Rs + Rp) * 0.5;
  }

  void main() {
    // Base tape color
    vec3 baseColor = tapeColor;

    // Sample bubble texture (white circles with alpha)
    vec4 bubbles = texture2D(bubbleMap, vUv);

    // Sample wrinkle normal map
    vec3 wrinkles = texture2D(wrinkleMap, vUv).xyz * 2.0 - 1.0;

    // Adjust normal with wrinkles
    vec3 normal = normalize(vNormal + wrinkles * 0.3);

    // View direction
    vec3 viewDir = normalize(vViewPosition);

    // Fresnel effect based on IOR (polypropylene = 1.46)
    float fresnel = fresnelDielectric(viewDir, normal, ior);

    // Reduce opacity where bubbles are present (trapped air)
    float bubbleEffect = bubbles.a * 0.4;
    float finalOpacity = opacity * (1.0 - bubbleEffect);

    // Add slight glossy highlight
    vec3 lightDir = normalize(vec3(4.5, 4.5, 4.5));
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(0.0, dot(normal, halfDir)), 32.0) * 0.5;

    vec3 finalColor = baseColor + vec3(specular);

    // Increase opacity at grazing angles (Fresnel)
    finalOpacity = mix(finalOpacity, finalOpacity * 1.3, fresnel);

    gl_FragColor = vec4(finalColor, finalOpacity);
  }
`;

// ============================================================================
// MATERIAL CREATION UTILITIES
// ============================================================================

/**
 * Creates cardboard material with custom shaders
 */
export function createCardboardMaterial(
  baseColorMap: THREE.Texture,
  normalMap: THREE.Texture,
  roughnessMap: THREE.Texture,
  aoMap: THREE.Texture,
  baseColor: string = '#C4A574'
): THREE.ShaderMaterial {
  const uniforms: CardboardUniforms = {
    baseColorMap: { value: baseColorMap },
    normalMap: { value: normalMap },
    roughnessMap: { value: roughnessMap },
    aoMap: { value: aoMap },
    baseColor: { value: new THREE.Color(baseColor) },
    roughness: { value: 0.90 },
    metalness: { value: 0.0 },
    specular: { value: 0.05 },
    flapBendAmount: { value: 0.0 },
    time: { value: 0.0 },
  };

  return new THREE.ShaderMaterial({
    vertexShader: cardboardVertexShader,
    fragmentShader: cardboardFragmentShader,
    uniforms,
    side: THREE.DoubleSide,
    transparent: false,
  });
}

/**
 * Creates tape material with transparency and IOR
 */
export function createTapeMaterial(
  bubbleMap: THREE.Texture,
  wrinkleMap: THREE.Texture,
  tapeColor: string = '#D4A86A',
  opacity: number = 0.6
): THREE.ShaderMaterial {
  const uniforms: TapeUniforms = {
    bubbleMap: { value: bubbleMap },
    wrinkleMap: { value: wrinkleMap },
    tapeColor: { value: new THREE.Color(tapeColor) },
    opacity: { value: opacity },
    ior: { value: 1.46 }, // Polypropylene IOR
  };

  return new THREE.ShaderMaterial({
    vertexShader: tapeVertexShader,
    fragmentShader: tapeFragmentShader,
    uniforms,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false, // Important for transparency sorting
  });
}

/**
 * Creates fallback material using MeshStandardMaterial
 * Used when shader compilation fails
 */
export function createFallbackCardboardMaterial(
  baseColorMap: THREE.Texture,
  normalMap: THREE.Texture,
  roughnessMap: THREE.Texture,
  aoMap: THREE.Texture
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: baseColorMap,
    normalMap: normalMap,
    roughnessMap: roughnessMap,
    aoMap: aoMap,
    color: '#C4A574',
    roughness: 0.90,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
}

/**
 * Creates fallback tape material
 */
export function createFallbackTapeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#D4A86A',
    roughness: 0.15,
    metalness: 0.0,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/**
 * Safely creates cardboard material with fallback
 */
export function createSafeCardboardMaterial(
  baseColorMap: THREE.Texture,
  normalMap: THREE.Texture,
  roughnessMap: THREE.Texture,
  aoMap: THREE.Texture
): THREE.ShaderMaterial | THREE.MeshStandardMaterial {
  try {
    return createCardboardMaterial(baseColorMap, normalMap, roughnessMap, aoMap);
  } catch (error) {
    console.warn('Shader compilation failed, using fallback material:', error);
    return createFallbackCardboardMaterial(baseColorMap, normalMap, roughnessMap, aoMap);
  }
}

/**
 * Safely creates tape material with fallback
 */
export function createSafeTapeMaterial(
  bubbleMap: THREE.Texture,
  wrinkleMap: THREE.Texture
): THREE.ShaderMaterial | THREE.MeshStandardMaterial {
  try {
    return createTapeMaterial(bubbleMap, wrinkleMap);
  } catch (error) {
    console.warn('Tape shader compilation failed, using fallback:', error);
    return createFallbackTapeMaterial();
  }
}

// ============================================================================
// SHADER UNIFORM UPDATE HELPERS
// ============================================================================

/**
 * Updates time uniform for animations
 */
export function updateTimeUniform(material: THREE.ShaderMaterial, time: number): void {
  if (material.uniforms.time) {
    material.uniforms.time.value = time;
  }
}

/**
 * Updates flap bend amount for animation
 */
export function updateFlapBend(material: THREE.ShaderMaterial, bendAmount: number): void {
  if (material.uniforms.flapBendAmount) {
    material.uniforms.flapBendAmount.value = bendAmount;
  }
}

/**
 * Batch update multiple uniforms
 */
export function updateMaterialUniforms(
  material: THREE.ShaderMaterial,
  updates: Partial<Record<string, any>>
): void {
  Object.entries(updates).forEach(([key, value]) => {
    if (material.uniforms[key]) {
      material.uniforms[key].value = value;
    }
  });
}
