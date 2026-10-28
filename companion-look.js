import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// Shared finish for every 3D instance and exported portrait.
// Broad, quiet reflections on matte shells; only the display keeps a soft gloss.
export function createCompanionStudio(renderer, scene) {
  const studio = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .035);
  studio.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = .46;
  scene.add(new THREE.HemisphereLight('#e8f2ff', '#b4b4b7', .38));

  const key = new THREE.DirectionalLight('#fff8ef', 2.45);
  key.position.set(-3.8, 5, 4.5);
  key.target.position.set(0, 1, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left:-3, right:3, top:3.5, bottom:-2, near:.1, far:18});
  key.shadow.normalBias = .009;
  key.shadow.bias = -.00008;
  key.shadow.radius = 4;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight('#e6efff', .65);
  fill.position.set(4, 2, 4);
  scene.add(fill);
  const sunset = new THREE.DirectionalLight('#ffd099', 1.7);
  sunset.position.set(-4, 3, -2.5);
  scene.add(sunset);
  const rim = new THREE.DirectionalLight('#c5e5ff', .55);
  rim.position.set(3, 2.5, -3);
  scene.add(rim);

  return {dispose(){environment.dispose();}};
}

export function prepareCompanionMaterials(model, key) {
  const converted = new Map();
  function convert(source) {
    if (converted.has(source)) return converted.get(source);
    if (!source.isMeshStandardMaterial) return source;
    const material = new THREE.MeshPhysicalMaterial();
    THREE.MeshStandardMaterial.prototype.copy.call(material, source);
    material.name = `${source.name} / ${key} soft matte`;
    material.envMapIntensity = .24;
    material.ior = 1.38;
    material.clearcoat = .06;
    material.clearcoatRoughness = .65;
    material.metalness = 0;
    material.specularIntensity = .24;
    material.roughness = 1;
    material.normalScale.setScalar(.18);
    if (material.map) material.map.anisotropy = 4;
    material.emissiveIntensity = key === 'xunbao' ? .40 : 0;
    if (!material.map) {
      material.color.set('#e7e9ec');
      material.roughness = .78;
    }
    {
      material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 ipLocalPosition;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nipLocalPosition = position;');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 ipLocalPosition;');
        // Classify the existing UV atlas rather than replace or paint over it.
        // Skin and printed eyes retain their source color and detail.
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #include <map_fragment>
          vec3 ipBase = diffuseColor.rgb;
          float ipMax = max(max(ipBase.r, ipBase.g), ipBase.b);
          float ipMin = min(min(ipBase.r, ipBase.g), ipBase.b);
          float ipSaturation = (ipMax - ipMin) / max(ipMax, 0.001);
          float ipLuma = dot(ipBase, vec3(0.2126, 0.7152, 0.0722));
          float ipBlue = smoothstep(0.025, 0.13, ipBase.b - ipBase.r)
            * smoothstep(0.25, 0.55, ipSaturation);
          float ipOrange = smoothstep(0.12, 0.36, ipBase.r - ipBase.b)
            * smoothstep(0.45, 0.70, ipSaturation);
          float ipDisplay = ${key === 'xunbao' ? '1.0' : '0.0'}
            * smoothstep(0.01, 0.10, ipBase.b - ipBase.r)
            * (1.0 - smoothstep(0.055, 0.18, ipLuma));
          float ipSkin = ${key === 'xingzai' ? '1.0' : '0.0'}
            * smoothstep(0.06, 0.18, ipBase.r - ipBase.b)
            * (1.0 - smoothstep(0.52, 0.72, ipSaturation))
            * smoothstep(0.35, 0.65, ipBase.r);
          float ipShell = (1.0 - smoothstep(0.12, 0.32, ipSaturation))
            * smoothstep(0.15, 0.45, ipLuma);
          // Remove the glossy lighting baked into the white atlas while retaining seams/AO.
          vec3 ipShellColor = vec3(0.73, 0.735, 0.72) * mix(0.78, 1.0, smoothstep(0.06, 0.8, ipLuma));
          float ipCloth = ${key === 'xingzai' ? '1.0' : '0.0'} * ipShell
            * (1.0 - smoothstep(0.77, 0.88, ipLocalPosition.y)) * smoothstep(0.10, 0.17, ipLocalPosition.y);
          // Object-space weave follows the skinned model. Fade subpixel fibers to prevent shimmer.
          vec2 ipWeaveUV = vec2(ipLocalPosition.x + ipLocalPosition.z * 0.6, ipLocalPosition.y) * 340.0;
          float ipWeaveAA = 1.0 - smoothstep(0.7, 2.8, max(fwidth(ipWeaveUV.x), fwidth(ipWeaveUV.y)));
          float ipWeave = sin(ipWeaveUV.x) * sin(ipWeaveUV.y) * ipWeaveAA;
          vec3 ipGrainUV = ipLocalPosition * 480.0;
          float ipGrainAA = 1.0 - smoothstep(0.7, 3.0, length(fwidth(ipGrainUV)));
          float ipGrain = sin(ipGrainUV.x + sin(ipGrainUV.z)) * sin(ipGrainUV.y * 1.17) * ipGrainAA;
          vec3 ipColor = mix(ipBase, ipShellColor, ipShell);
          vec3 ipBlueColor = mix(ipBase * vec3(0.32, 0.79, 0.86), vec3(0.075, 0.32, 0.40), 0.32);
          ipColor = mix(ipColor, ipBlueColor, ipBlue * (1.0 - ipDisplay));
          vec3 ipOrangeColor = mix(ipBase * vec3(1.02, 0.82, 0.50), vec3(0.64, 0.30, 0.075), 0.30);
          ipColor = mix(ipColor, ipOrangeColor, ipOrange);
          ipColor *= 1.0 + ipWeave * ipCloth * 0.075 + ipGrain * ipShell * (1.0 - ipCloth) * 0.018;
          vec3 ipSkinColor = mix(vec3(ipLuma), ipBase, 1.12) * vec3(1.0, 0.97, 0.97);
          diffuseColor.rgb = clamp(mix(ipColor, ipSkinColor, ipSkin), 0.0, 1.0);
        `).replace('#include <roughnessmap_fragment>', `
          #include <roughnessmap_fragment>
          float ipMicroRoughness = (roughnessFactor - 0.45) * 0.06;
          roughnessFactor = mix(0.88, 0.76, ipBlue);
          roughnessFactor = mix(roughnessFactor, 0.78, ipOrange);
          roughnessFactor = mix(roughnessFactor, 0.44, ipDisplay);
          roughnessFactor = mix(roughnessFactor, 0.93, ipSkin);
          roughnessFactor = mix(roughnessFactor, 0.98, ipCloth);
          roughnessFactor = clamp(roughnessFactor + ipMicroRoughness, 0.42, 1.0);
        `).replace('#include <normal_fragment_maps>', `
          #include <normal_fragment_maps>
          // Small real surface relief, not a noisy color overlay.
          float ipRelief = ipWeave * ipCloth * 0.00045 + ipGrain * ipShell * (1.0 - ipCloth) * 0.00016;
          vec3 ipSigmaX = dFdx(-vViewPosition), ipSigmaY = dFdy(-vViewPosition);
          vec3 ipRx = cross(ipSigmaY, normal), ipRy = cross(normal, ipSigmaX);
          float ipDet = dot(ipSigmaX, ipRx);
          vec3 ipGradient = sign(ipDet) * (dFdx(ipRelief) * ipRx + dFdy(ipRelief) * ipRy);
          normal = normalize(max(abs(ipDet), 0.0000000001) * normal - ipGradient);

        `).replace('#include <lights_physical_fragment>', `
          #include <lights_physical_fragment>
          material.clearcoat = 0.0;
          material.clearcoat = mix(material.clearcoat, 0.025, ipDisplay);
          material.clearcoat = mix(material.clearcoat, 0.0, ipSkin);
          material.clearcoatRoughness = mix(0.85, 0.50, ipDisplay);
          material.specularColor *= mix(0.38, 0.70, ipDisplay) * mix(1.0, 0.25, max(ipSkin, ipCloth));
        `);
      };
      material.customProgramCacheKey = () => `ip-fabric-mineral-v37-${key}`;
    }
    converted.set(source, material);
    source.dispose();
    return material;
  }
  model.traverse(object => {
    if (!object.isMesh) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(convert) : convert(object.material);
  });
}
