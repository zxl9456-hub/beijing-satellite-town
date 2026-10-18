import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// The IP turnarounds use neutral softboxes: white satin shells, enamel trim,
// and a deep blue display. Keep sunset warmth on the silhouette, off the face.
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
    material.name = `${source.name} / ${key} reference satin`;
    material.envMapIntensity = .85;
    material.ior = 1.46;
    material.clearcoat = .22;
    material.clearcoatRoughness = .30;
    material.metalness = 0;
    material.roughness = 1;
    material.normalScale.setScalar(.45);
    if (material.map) material.map.anisotropy = 4;
    material.emissiveIntensity = key === 'xunbao' ? 1.05 : 0;
    if (!material.map) {
      material.color.set('#e7e9ec');
      material.roughness = .48;
    } else {
      material.onBeforeCompile = shader => {
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
          vec3 ipShellColor = ipBase + (vec3(1.0) - ipBase) * 0.34;
          vec3 ipColor = mix(ipBase, ipShellColor, ipShell);
          ipColor = mix(ipColor, ipBase * vec3(0.08, 0.80, 0.95), ipBlue);
          ipColor = mix(ipColor, ipBase * vec3(1.32, 0.76, 0.18), ipOrange);
          vec3 ipSkinColor = mix(vec3(ipLuma), ipBase, 1.38) * vec3(1.0, 0.97, 0.97);
          diffuseColor.rgb = clamp(mix(ipColor, ipSkinColor, ipSkin), 0.0, 1.0);
        `).replace('#include <roughnessmap_fragment>', `
          #include <roughnessmap_fragment>
          float ipMicroRoughness = (roughnessFactor - 0.45) * 0.12;
          roughnessFactor = mix(0.46, 0.29, ipBlue);
          roughnessFactor = mix(roughnessFactor, 0.27, ipOrange);
          roughnessFactor = mix(roughnessFactor, 0.19, ipDisplay);
          roughnessFactor = mix(roughnessFactor, 0.59, ipSkin);
          roughnessFactor = clamp(roughnessFactor + ipMicroRoughness, 0.16, 0.55);
        `).replace('#include <lights_physical_fragment>', `
          #include <lights_physical_fragment>
          material.clearcoat = mix(0.16, 0.36, max(ipBlue, ipOrange));
          material.clearcoat = mix(material.clearcoat, 0.28, ipDisplay);
          material.clearcoat = mix(material.clearcoat, 0.02, ipSkin);
          material.clearcoatRoughness = mix(0.30, 0.18, ipDisplay);
          material.specularColor *= mix(1.0, 0.62, max(ipDisplay, ipSkin));
        `);
      };
      material.customProgramCacheKey = () => `ip-reference-satin-v15-${key}`;
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
