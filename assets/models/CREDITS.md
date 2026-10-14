# 3D model and volume credits

Every file in this folder comes from an openly licensed source. The table lists each file's source, author, licence and the attribution line the licence requires. Attribution is mandatory for the CC BY / CC BY-SA files, so the website must show it somewhere reasonable, such as a footer "3D model credits" link or a credits section.

Short line you can paste into the footer:

> 3D anatomy: HuBMAP Human Reference Atlas (CC BY 4.0); BodyParts3D © The Database Center for Life Science (CC BY-SA 2.1 JP); head scan by Lee Perry-Smith / Infinite-Realities (CC BY 3.0); CT sample from imageio (public domain).

---

## heart.glb, heart-lite.glb (BodyParts3D)

- **What:** Anatomical heart with the heart wall, coronary arteries, cardiac veins, aorta and arch branches, venae cavae, pulmonary trunk and arteries, and pulmonary veins.
- **Source:** BodyParts3D v3.0 (20110915), using the binary STL mirror at https://github.com/Kevin-Mattheus-Moerman/BodyParts3D (`assets/BodyParts3D_data/stl/`). The original archive is https://dbarchive.biosciencedbc.jp/en/bodyparts3d/.
  - Parts used (FMA IDs): wall of heart FMA7274; ascending aorta FMA3736; arch of aorta FMA3768; descending aorta FMA3784 (clipped); brachiocephalic artery FMA3932; common carotids FMA3941/FMA4058 (clipped); subclavian arteries FMA3953/FMA4694 (clipped); coronary arteries FMA3802, FMA3818, FMA3840, FMA3862, FMA3895, FMA4685, FMA76994; superior vena cava FMA4720; inferior vena cava FMA10951 (clipped); brachiocephalic veins FMA4751/FMA4761; cardiac veins FMA4707, FMA4713, FMA76751, FMA71567, FMA4706; pulmonary artery FMA66326 (clipped at the hilum); pulmonary vein FMA66643 (clipped at the hilum).
- **Author:** The Database Center for Life Science (DBCLS), Japan. Paper: Mitsuhashi N. et al., "BodyParts3D: 3D structure database for anatomical concepts", Nucleic Acids Res. 2009;37:D782-5.
- **Licence:** CC BY-SA 2.1 Japan, https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
- **Attribution:** "BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan"
- **Changes:** Parts merged and long vessels clipped near the heart. The result was re-oriented to Y-up and simplified. The lite version is a lower level of detail for mobile.
- **ShareAlike:** These GLB files, as adapted works, are also under CC BY-SA 2.1 JP. The rest of the website is not affected.

## spine.glb (BodyParts3D)

- **What:** Vertebral column from C1 to L5, plus the sacrum and the intervertebral discs.
- **Source:** Same BodyParts3D STL mirror as the heart.
  - Parts used (FMA IDs): atlas FMA12519; axis FMA12520; C3–C7 FMA12521–12525; T1–T12 FMA9165, 9187, 9209, 9248, 9922, 9945, 9968, 9991, 10014, 10037, 10059, 10081; L1–L5 FMA13072–13076; sacrum FMA16202; 23 intervertebral discs (FMA25058, 13896–13900, 10458, 13495, 13500–13509, 16033–16037).
- **Author, licence and attribution:** Same as heart.glb (DBCLS, CC BY-SA 2.1 JP).
- **Changes:** Merged by region, re-oriented to Y-up and simplified.

## tooth.glb (BodyParts3D)

- **What:** Left lower first permanent molar.
- **Source:** Same BodyParts3D STL mirror, part FMA55704.
- **Author, licence and attribution:** Same as heart.glb (DBCLS, CC BY-SA 2.1 JP).
- **Changes:** Re-oriented with the crown up and simplified.

## brain.glb, brain-lite.glb (Human Reference Atlas)

- **What:** Whole-brain cortical surface, cerebellum and brainstem, grouped into lobes.
- **Source:** HuBMAP Human Reference Atlas (HRA), 3D Reference Organ "Allen Brain, Male", v2.0. File: https://github.com/hubmapconsortium/ccf-releases/blob/main/v2.0/models/3d-vh-m-allen-brain.glb. Library: https://humanatlas.io/3d-reference-library
- **Author:** HuBMAP Human Reference Atlas team (CNS, Indiana University; project lead Katy Börner; 3D reference objects by Kristen Browne et al., NIH). The structures are based on the Allen Human Brain Reference Atlas and fitted to the Visible Human Male (National Library of Medicine).
- **Licence:** CC BY 4.0, https://creativecommons.org/licenses/by/4.0/
- **Attribution:** "3D Reference Organ: Brain (Allen), Male, v2.0 – Human Reference Atlas, HuBMAP (humanatlas.io), CC BY 4.0"
- **Changes:** Only the outer structures are kept (gyri, cerebellum and brainstem); the deep nuclei, white matter and ventricles are dropped. The structures are merged into lobes and simplified.

## lungs.glb (Human Reference Atlas)

- **What:** Right and left lungs, made from the bronchopulmonary segments, plus the trachea and bronchial tree.
- **Source:** HRA 3D Reference Organs, Male, v1.4:
  - `v1.4/models/3d-vh-m-lung.glb`
  - `v1.4/models/3d-vh-m-trachea.glb`
  - `v1.4/models/3d-vh-m-main-bronchus.glb`
  - All at https://github.com/hubmapconsortium/ccf-releases
- **Author:** HuBMAP Human Reference Atlas team, built from Visible Human Male data (NLM).
- **Licence:** CC BY 4.0
- **Attribution:** "3D Reference Organs: Lung, Trachea, Main Bronchus, Male, v1.4 – Human Reference Atlas, HuBMAP (humanatlas.io), CC BY 4.0"
- **Changes:** Merged and simplified.

## knee.glb (Human Reference Atlas)

- **What:** Left knee: distal femur, proximal tibia and fibula, patella, menisci and articular cartilage.
- **Source:** HRA "Knee, Left, Male", v1.3, `v1.3/models/VH_M_Knee_L.glb` in https://github.com/hubmapconsortium/ccf-releases
- **Author:** HuBMAP Human Reference Atlas team, built from Visible Human Male data (NLM).
- **Licence:** CC BY 4.0
- **Attribution:** "3D Reference Organ: Knee, Left, Male, v1.3 – Human Reference Atlas, HuBMAP (humanatlas.io), CC BY 4.0"
- **Changes:** Bone shafts clipped around the joint; the landmark meshes are dropped.

## kidney.glb (Human Reference Atlas)

- **What:** Left kidney: capsule, renal pyramids and papillae, and hilum.
- **Source:** HRA "Kidney, Left, Male", v1.3, `v1.3/models/VH_M_Kidney_L.glb` in https://github.com/hubmapconsortium/ccf-releases
- **Author:** HuBMAP Human Reference Atlas team, built from Visible Human Male data (NLM).
- **Licence:** CC BY 4.0
- **Attribution:** "3D Reference Organ: Kidney, Left, Male, v1.3 – Human Reference Atlas, HuBMAP (humanatlas.io), CC BY 4.0"
- **Changes:** Merged and simplified.

## liver.glb (Human Reference Atlas)

- **What:** Liver, made from its Couinaud segments and the caudate lobe.
- **Source:** HRA "Liver, Male", v1.3, `v1.3/models/VH_M_Liver.glb` in https://github.com/hubmapconsortium/ccf-releases
- **Author:** HuBMAP Human Reference Atlas team, built from Visible Human Male data (NLM).
- **Licence:** CC BY 4.0
- **Attribution:** "3D Reference Organ: Liver, Male, v1.3 – Human Reference Atlas, HuBMAP (humanatlas.io), CC BY 4.0"
- **Changes:** Merged and simplified.

## eye.glb (Human Reference Atlas)

- **What:** Left eye: sclera, cornea, iris, lens and retina.
- **Source:** HRA "Eye, Left, Male", v1.4, `v1.4/models/3d-vh-m-eye-l.glb` in https://github.com/hubmapconsortium/ccf-releases
- **Author:** HuBMAP Human Reference Atlas team, built from Visible Human Male data (NLM).
- **Licence:** CC BY 4.0
- **Attribution:** "3D Reference Organ: Eye, Left, Male, v1.4 – Human Reference Atlas, HuBMAP (humanatlas.io), CC BY 4.0"
- **Changes:** Subset of structures, merged and simplified. The cornea and lens are semi-transparent.

## uterus.glb (Human Reference Atlas)

- **What:** Uterus with the fallopian tubes and ovaries.
- **Source:** HRA Female, v1.3, files in `v1.3/models/` of https://github.com/hubmapconsortium/ccf-releases:
  - `VH_F_Uterus.glb`
  - `VH_F_Fallopian_Tube_L.glb`
  - `VH_F_Fallopian_Tube_R.glb`
  - `VH_F_Ovary_L.glb`
  - `VH_F_Ovary_R.glb`
- **Author:** HuBMAP Human Reference Atlas team, built from Visible Human Female data (NLM).
- **Licence:** CC BY 4.0
- **Attribution:** "3D Reference Organs: Uterus, Fallopian Tubes, Ovaries, Female, v1.3 – Human Reference Atlas, HuBMAP (humanatlas.io), CC BY 4.0"
- **Changes:** Merged and simplified.

## head.glb (Lee Perry-Smith head scan)

- **What:** Head-and-shoulders 3D scan with a tangent-space normal map embedded.
- **Source:** three.js examples:
  - Mesh: https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb
  - Normal map: `Infinite-Level_02_Tangent_SmoothUV.jpg` in the same folder
  - Licence file: `LeePerrySmith_License.txt` in the same folder
- **Author:** Lee Perry-Smith, Infinite-Realities (www.ir-ltd.net). Based on a work at www.triplegangers.com.
- **Licence:** CC BY 3.0 Unported, https://creativecommons.org/licenses/by/3.0/
- **Attribution:** "Infinite, 3D Head Scan by Lee Perry-Smith is licensed under a Creative Commons Attribution 3.0 Unported License. Based on a work at www.triplegangers.com."
- **Changes:** Re-centred and scaled, with the normal map embedded. The skin colour texture was left out on purpose, so the material is a neutral sculpture.
- **Note:** This is a scan of a real person. Use it only as an abstract bust, never as a CareNova patient or doctor.

## ct-stent.nrrd (CT volume)

- **What:** CT volume of a stented abdominal aorta with the lumbar spine. It is 128 × 128 × 256 voxels, uint8, gzip-encoded NRRD.
- **Source:** `stent.nrrd` from the three.js examples (https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/nrrd/stent.nrrd). It was converted from `stent.npz` in the imageio standard images (https://imageio.readthedocs.io/en/stable/user_guide/standardimages.html).
- **Licence:** Public domain, as stated in the three.js `examples/models/nrrd/README.txt` and the imageio documentation ("to the best of our knowledge … public domain"). No attribution is required; the credit is a courtesy.
- **Changes:** Converted from float32 (0..1) to uint8 (0..255). The conversion is lossless, because the source values are in steps of 1/32.

---

### Technical notes

| File | Size | Triangles | Meshes |
| --- | --- | --- | --- |
| heart.glb | 1.3 MB | 94k | 7 |
| heart-lite.glb | 0.5 MB | 37k | 7 |
| brain.glb | 1.5 MB | 105k | 8 lobes |
| brain-lite.glb | 0.7 MB | 47k | 8 lobes |
| lungs.glb | 0.6 MB | 44k | 3 |
| spine.glb | 0.9 MB | 67k | 5 |
| head.glb | 0.4 MB | 18k | 1, with normal map |
| kidney.glb | 0.3 MB | 19k | 3 |
| eye.glb | 0.3 MB | 22k | 5 |
| liver.glb | 0.2 MB | 16k | 1 |
| uterus.glb | 0.2 MB | 16k | 3 |
| knee.glb | 0.1 MB | 9k | 6 |
| tooth.glb | 0.1 MB | 6k | 1 |

- **Orientation and scale:** All models are Y-up, with the anatomical front facing +Z (toward a default three.js camera). Each is centred at the origin and fitted to 2 units on its longest side (or 2 units tall).
- **Encoding:** Geometry uses `KHR_mesh_quantization`. three.js `GLTFLoader` reads it with no decoder; there is no Draco or meshopt compression.
- **Materials:** Each mesh is named after its anatomy and has a named PBR material, so the materials can be restyled in code. All files pass the Khronos glTF Validator with no errors.
- **Processing tools:** glTF-Transform and meshoptimizer, both MIT-licensed.
