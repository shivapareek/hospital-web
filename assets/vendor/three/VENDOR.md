# Vendored: three.js r170

- Package: `three@0.170.0` from registry.npmjs.org (published 2024-10-31), fetched with `npm pack three@0.170.0`.
- Tarball sha256: `4a608a355dcaba72e0e5383cdc814303f5b6060b43c238cdf6932dceb699238d`
- `three.module.min.js` is `build/three.module.min.js` unmodified (self-contained, no imports; sha256 `08fd7545d13d2c7fb65ab691530a802dafefd638596501854f267d0fb13c39e7`).
- `addons/` is a subset of `examples/jsm/`, unmodified, same relative layout, plus every file those addons import (transitive closure; all relative imports verified to resolve).

## Use

Put this import map in `<head>` before any `<script type="module">`:

```html
<script type="importmap">
{
  "imports": {
    "three": "./assets/vendor/three/three.module.min.js",
    "three/addons/": "./assets/vendor/three/addons/"
  }
}
</script>
```

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
// .glb/.gltf with KHR_draco_mesh_compression -> gltf decoder; standalone .drc -> default decoder (addons/libs/draco/)
const draco = new DRACOLoader().setDecoderPath('./assets/vendor/three/addons/libs/draco/gltf/');
const gltfLoader = new GLTFLoader().setDRACOLoader(draco);
```

ES modules do not load from `file://` in Chromium (CORS, origin "null"); serve the site over http.

## Included addons

loaders: GLTFLoader, DRACOLoader (+ decoders: libs/draco/gltf/ wasm+wrapper+JS fallback for glTF; libs/draco/ wasm+wrapper for .drc), NRRDLoader, RGBELoader, STLLoader, OBJLoader, PLYLoader;
environments/RoomEnvironment; utils/BufferGeometryUtils, utils/SkeletonUtils; libs/meshopt_decoder.module.js, libs/fflate.module.js;
shaders/VolumeShader, misc/Volume, misc/VolumeSlice; controls/OrbitControls; objects/MarchingCubes; geometries/RoundedBoxGeometry; math/SimplexNoise;
postprocessing: EffectComposer, RenderPass, ShaderPass, MaskPass, Pass, UnrealBloomPass, OutputPass (+ shaders CopyShader, LuminosityHighPassShader, OutputShader).

## Licenses

| Component | License | Notice |
|---|---|---|
| three.js core and addons | MIT | `LICENSE` (Copyright 2010-2024 three.js authors) |
| fflate 0.8.2 (`addons/libs/fflate.module.js`) | MIT | header in file, https://github.com/101arrowz/fflate |
| meshoptimizer decoder (`addons/libs/meshopt_decoder.module.js`) | MIT | header in file, Copyright 2016-2022 Arseny Kapoulkine |
| Draco decoders (`addons/libs/draco/*`, `addons/libs/draco/gltf/*`) | Apache-2.0 | `addons/libs/draco/LICENSE` (from https://github.com/google/draco) |
