# Image credits and licences: `assets/img/`

Every image in this folder is either a **real photograph** or a render made from **real medical or scientific data**. None of it is AI-generated.

All files are WebP. Metadata (EXIF, XMP and ICC) was stripped when they were re-encoded with Pillow 12. Where a file is described as "modified", it was cropped, resized, windowed, colour-graded or rendered from the source data as noted. CC BY requires us to say so, and we do in the attribution lines below.

**Ready-to-paste credits line for the site footer or colophon:**

> Medical imagery: OpenNeuro ds003826 (CC0); LIDC-IDRI, The Cancer Imaging Archive (CC BY 3.0); scikit-image sample data (CC0 / public domain). Photos via Open Images: liz west, Forgemind ArchiMedia, Ryo FUKAsawa, osseous, Bytemarks, Bratislavská župa, Tareq Salahuddin, daveynin, NEC Corporation of America, Trace Meek (all CC BY 2.0). Images modified (resized, cropped, colour-graded or rendered).

We still recommend a link from that line to a full credits page or section that reproduces the per-file table below.

---

## A. Medical and scientific imagery

### A1. Brain MRI scan series (scroll-scrub viewer)

| Files | What it is |
|---|---|
| `scan-brain-frames/00.webp` … `39.webp` (40 frames, 512×512, greyscale on pure black) | Axial T1-weighted MRI slices from the top of the head (00) down to the level of the eyes and midbrain (39), about 2 mm apart. Radiological orientation, with the patient's right on the image left. |
| `scan-brain-sprite.webp` (2048×1280; an 8×5 grid of 256 px tiles in the same order) | The same 40 frames in one file, for a single-request loader or placeholder. |
| `mri-brain-axial-800.webp`, `mri-brain-axial-graded-800.webp` | A single slice at the level of the lateral ventricles, in natural greyscale and graded to the brand greens. Source in-plane resolution is about 1 mm (about 200 px across the head), so it looks soft above roughly 500 px CSS width. |

- **Source:** OpenNeuro dataset **ds003826**, "Structural (t1) images of 136 young healthy adults; study of effects of chronotype, sleep quality and daytime sleepiness on brain structure". File: `sub-02/anat/sub-02_T1w.nii.gz` (Siemens Skyra 3T, MPRAGE).
  Dataset page: https://openneuro.org/datasets/ds003826 · DOI: https://doi.org/10.18112/openneuro.ds003826.v3.0.0
  Fetched from: https://s3.amazonaws.com/openneuro.org/ds003826/sub-02/anat/sub-02_T1w.nii.gz
- **Authors:** Michal Rafal Zareba, Magdalena Fafrowicz, Tadeusz Marek, Ewa Beldzik, Halszka Oginska, Aleksandra Domagalik
- **Licence:** **CC0** ("License": "CC0" in the dataset's `dataset_description.json`). No attribution is legally required.
- **Courtesy attribution:** "Brain MRI: OpenNeuro ds003826 (Zareba et al., 2021), CC0. Resliced and graded."
- **Processing:** reoriented to RAS, resampled to 1 mm isotropic, light Gaussian denoise, a soft S-curve for grey-matter/white-matter contrast and background cleanup. Frames stop above the level where the dataset's anonymising "defacing" mask begins, so no cut-off face edge is visible.
- **Note:** this is a de-identified research volunteer, not a CareNova patient. Present it as an illustrative scan.

### A2. Chest CT: axial slice, coronal reformat and 3D rib-cage turntable

| Files | What it is |
|---|---|
| `ct-chest-axial-1024.webp`, `ct-chest-axial-640.webp` | Axial chest CT at the level of the main bronchi, lung window (W1500/L−600), with the scanner table and air outside the body removed to pure black. Native 512 px; the 1024 version is upscaled about 2× (CT upscales cleanly). |
| `ct-chest-axial-graded-1024.webp`, `ct-chest-axial-graded-640.webp` | The same slice mapped to the brand palette: deep green `#0D2621`, then `#0F5C4D`, then mint `#7FE0BE`, then near-white. |
| `ct-chest-coronal-960.webp`, `ct-chest-coronal-640.webp`, `ct-chest-coronal-graded-960.webp`, `ct-chest-coronal-graded-640.webp` | Coronal (front-view) reformat through the trachea, showing the lungs, airway tree, heart and diaphragm. Natural (lung window) and graded. The graded version uses a soft-tissue curve rather than the lung window, so soft tissue sits in the mid greens, and it fades out beyond the chest (the scan's field of view cuts the arms off square). |
| `ct-ribcage-3d/00.webp` … `35.webp` (36 frames, 400×371) | A **real 3D volume rendering** of the same CT. It is front-to-back alpha compositing of bone with gradient lighting and faint mint lung vessels, rotating 360° in 10° steps. Frames are flattened onto brand deep green `#0D2621` (RGB), so place them on a `#0D2621` tile. Suitable for scroll-scrub or autoplay. |
| `ct-ribcage-3d-poster-640.webp` (RGBA, transparent background) | Frame 0 with a real alpha channel, for placing the rib cage over any background. |

- **Source:** **LIDC-IDRI** collection, subject `LIDC-IDRI-0002`, CT series (GE LightSpeed16, 1.25 mm slices). Accessed through the NCI Imaging Data Commons public bucket (series UUID `d24a2c63-a8d6-4292-83a6-1db00ae699cc`, files at `https://s3.amazonaws.com/idc-open-data/d24a2c63-a8d6-4292-83a6-1db00ae699cc/`).
  Collection page / DOI: https://doi.org/10.7937/K9/TCIA.2015.LO9QL9SX
- **Authors:** Armato III, S. G., McLennan, G., Bidaut, L., McNitt-Gray, M. F., Meyer, C. R., Reeves, A. P., Clarke, L. P., et al.
- **Licence:** **CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/), as listed for this collection in the IDC index (`license_short_name`) and by The Cancer Imaging Archive.
- **Required attribution:** "Chest CT data: Armato III, S. G., et al. (2015). *Data From LIDC-IDRI* [Data set]. The Cancer Imaging Archive. https://doi.org/10.7937/K9/TCIA.2015.LO9QL9SX — CC BY 3.0. Modified: windowed, masked, reformatted, volume-rendered and colour-graded."
- **Note:** LIDC-IDRI is a lung-nodule research dataset of de-identified patients. The chosen slices show no annotated lesion, but don't caption them as a "healthy" scan or as a CareNova patient.

### A3. Retina (fundus photograph)

| Files | What it is |
|---|---|
| `retina-1400.webp`, `retina-800.webp` | Colour fundus photograph of a normal left eye, natural colour (orange-red), on black. Includes the camera's orientation notch at the top right. Native 1411 px. |
| `retina-redfree-graded-1400.webp`, `retina-redfree-graded-800.webp` | A "red-free" version: the green channel only, which is a real clinical technique for showing vessels, contrast-enhanced (CLAHE) and mapped to brand greens. |

- **Source:** Wikimedia Commons, "Fundus photograph of normal left eye" (https://commons.wikimedia.org/wiki/File:Fundus_photograph_of_normal_left_eye.jpg), redistributed as `retina.jpg` in the scikit-image sample data (`skimage.data.retina()`, scikit-image 0.26).
- **Author:** Mikael Häggström (*Medical gallery of Mikael Häggström 2014*, WikiJournal of Medicine 1(2), doi:10.15347/wjm/2014.008).
- **Licence:** **CC0 1.0 / public domain**, as stated in the scikit-image docstring.
- **Courtesy attribution:** "Fundus photo: Mikael Häggström, CC0 (via scikit-image)."

### A4. Kidney tissue (confocal fluorescence)

| Files | What it is |
|---|---|
| `kidney-fluorescence-1024.webp`, `kidney-fluorescence-512.webp` | Maximum-intensity projection of a 16-slice confocal z-stack of mouse kidney tissue, in natural fluorescence colours (blue nuclei, green and red stains). |
| `kidney-fluorescence-graded-1024.webp`, `kidney-fluorescence-graded-512.webp` | Same data, with channels screen-blended in brand mint and green on deep green `#0D2621`. |

Native resolution is 512 px. The 1024 versions are 2× Lanczos upscales with light sharpening.

- **Source:** scikit-image data repository, `kidney-tissue-fluorescence.tif` (https://gitlab.com/scikit-image/data/-/raw/2cdc5ce89b334d28f06a58c9f0ca21aa6992a5ba/kidney-tissue-fluorescence.tif; `skimage.data.kidney()`).
- **Author:** Genevieve Buckley, Monash Micro Imaging, 2018 (Nikon C1 confocal).
- **Licence:** **CC0** (stated in the scikit-image data README and the docstring).
- **Courtesy attribution:** "Kidney fluorescence: Genevieve Buckley, Monash Micro Imaging, CC0 (via scikit-image)."
- **Note:** this is **mouse** tissue. Use it as abstract scientific texture, not as "a patient's kidney".

### A5. Skin histology (H&E)

| Files | What it is |
|---|---|
| `skin-he-1024.webp`, `skin-he-640.webp` | H&E-stained slide at 10× of normal epidermis and dermis with a benign intradermal nevus, in natural pink and purple. |
| `skin-he-graded-1024.webp` | A duotone of the same image, from deep green through to the site background `#F4F5F2`. The white slide background blends into the page. |

- **Source:** Wikipedia/Commons file "Normal Epidermis and Dermis with Intradermal Nevus 10x.JPG" (https://en.wikipedia.org/wiki/File:Normal_Epidermis_and_Dermis_with_Intradermal_Nevus_10x.JPG). Redistributed in the scikit-image data repository: https://gitlab.com/scikit-image/data/-/raw/2cdc5ce89b334d28f06a58c9f0ca21aa6992a5ba/Normal_Epidermis_and_Dermis_with_Intradermal_Nevus_10x.JPG (`skimage.data.skin()`).
- **Author:** Kilbad (Wikipedia user).
- **Licence:** **Public domain** (released by the author, as stated in the scikit-image data README and the docstring).
- **Courtesy attribution:** "Skin histology: Kilbad, public domain (via scikit-image)."

### A6. Cell nuclei (fluorescence)

| Files | What it is |
|---|---|
| `nuclei-graded-1024.webp`, `nuclei-graded-512.webp` | Fluorescence micrograph of human cell nuclei, some undergoing mitosis, mapped to mint on deep green. Good as a subtle background texture. Native 512 px; the 1024 version is a 2× upscale. |

- **Source:** CellProfiler example images, `AS_09125_050116030001_D03f00d0.tif` (https://github.com/CellProfiler/examples), redistributed by scikit-image (`skimage.data.human_mitosis()`; https://gitlab.com/scikit-image/data/-/raw/2cdc5ce89b334d28f06a58c9f0ca21aa6992a5ba/AS_09125_050116030001_D03f00d0.tif).
- **Authors:** Jason Moffat / David Root (Broad Institute). From Moffat J. et al. (2006), *Cell* 124(6):1283–98, doi:10.1016/j.cell.2006.01.040.
- **Licence:** **CC0** (scikit-image data README and docstring; https://github.com/CellProfiler/examples/issues/41).
- **Courtesy attribution:** "Cell nuclei: Moffat et al. / CellProfiler examples, CC0 (via scikit-image)."

### Sources we considered but left out (licence not verifiable)

- `skimage.data.immunohistochemistry()` (IHC colon): scikit-image says only "No known copyright restrictions", which is not a licence.
- `skimage.data.cells3d()` (Allen Institute): listed with "licence: Unknown".
- `skimage.data.brain()` (UNC volume data): no licence stated.

---

## B. Photography: CC BY 2.0, via Google Open Images

All photos below come from the **Open Images Dataset V6/V7** (Google). Files were fetched from the dataset's public mirror at `https://s3.amazonaws.com/open-images-dataset/<subset>/<ImageID>.jpg`. The mirror stores images at a maximum of 1024 px on the long edge, so no 1600w versions exist.

Licence, author and source page come from the official Open Images metadata (`oidv6-train-images-with-labels-with-rotation.csv`, `validation-images-with-rotation.csv` and `test-images-with-rotation.csv` at storage.googleapis.com/openimages). Every image listed there has `License = https://creativecommons.org/licenses/by/2.0/`.

**Caveat:** Google notes that it "make[s] no representations or warranties regarding the license status of each image". flickr.com was not reachable from the build sandbox, so we could not re-check each Flickr page. CC licences are irrevocable, but before production please open each Flickr link below and confirm it still shows "Some rights reserved – CC BY 2.0".

Chosen deliberately: **no identifiable faces.** All of these are empty rooms, equipment, still lifes or a torso crop. They are real photos of other real facilities, so don't caption any of them as "our hospital".

**Attribution format** (CC BY 2.0 requires title, author, source link, licence link and a note of changes):
`"<Title>" by <Author> (<Flickr link>), CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/). Resized and re-encoded.`

| File(s) | Description | Title | Author | Source (Flickr) | Open Images ID |
|---|---|---|---|---|---|
| `photo-operating-theatre-1024.webp`, `-640` | Empty, minimal modern operating theatre with a ceiling light strip | 水相設計 - 知美整型外科診所 - Photo 35 手術室 | 準建築人手札網站 Forgemind ArchiMedia | https://www.flickr.com/photos/eager/20532674521 | train/d45b5b46eb45fc84 |
| `photo-procedure-room-1024.webp`, `-640` | Empty white procedure room with an orange treatment chair (same project) | 水相設計 - 知美整型外科診所 - Photo 34 手術室 | 準建築人手札網站 Forgemind ArchiMedia | https://www.flickr.com/photos/eager/20338214260 | train/18e57fbbc847aca2 |
| `photo-stethoscope-coat-1024.webp`, `-640` | Black stethoscope on a white coat, bright still life | Get ready for my clinical practice. | Ryo FUKAsawa | https://www.flickr.com/photos/fukapon/18157286472 | train/075ddcd09d3fdd18 |
| `photo-stethoscope-scrubs-1024.webp`, `-640` | Stethoscope hanging over blue scrubs, torso only, no face | December 20, 2013 | osseous | https://www.flickr.com/photos/osseous/12297326344 | train/d882c5cf33ba85f7 |
| `photo-mri-scanner-1024.webp`, `-640` | White MRI scanner and table, empty room | Big MRI | liz west | https://www.flickr.com/photos/calliope/223220955 | train/f60c381f42ef25a7 |
| `photo-ct-scanner-1024.webp`, `-640` | CT scanner in a teal-walled room (USNS Mercy hospital ship), empty | USNS Mercy | Bytemarks | https://www.flickr.com/photos/bytemarks/4590624145 | test/a877dc68d48d774f |
| `photo-ward-mint-1024.webp`, `-640` | Two beds in a mint-green ward, empty (Malacky hospital, Slovakia) | Nemocnica Malacky má nový centrálny príjem a OAIM | Bratislavská župa | https://www.flickr.com/photos/fotopavolfreso/8187079601 | train/04da47f058b506b1 |
| `photo-icu-1024.webp`, `-640` | ICU bed bay with monitors and ventilator, empty, greenish light | Dedicated Liver ICU | Tareq Salahuddin | https://www.flickr.com/photos/tareqsalahuddin/7272610736 | validation/409019c958741906 |
| `photo-emergency-room-1024.webp`, `-640` | New emergency-department patient room, empty | New UPMC East: Emergency patient room | daveynin | https://www.flickr.com/photos/daveynin/7417095278 | train/27c28417c63557e8 |
| `photo-doctor-tablet-1024.webp`, `-640` | Clinician in a white coat using a tablet; cropped at the chest, face not shown | NEC-Medical-137 | NEC Corporation of America | https://www.flickr.com/photos/neccorp/14445634744 | train/8a6a0d4b309ac55a |
| `photo-dental-chair-1024.webp`, `-640` | Teal dental chair and unit, empty | dentist appointment | liz west | https://www.flickr.com/photos/calliope/45720519 | train/578e3507e4ffa867 |
| `photo-xray-hand-768.webp`, `-640` | Real hand radiograph (X-ray) on black. Native 768 px wide; the dark grey film background levelled to black. | Hand X-Ray | Trace Meek | https://www.flickr.com/photos/tracemeek/5327224133 | test/178b831fe87baa4e |

Author profile URLs: `https://www.flickr.com/people/<id>/`, where `<id>` is the path segment after `/photos/` in each link above.

### What we could not source

We found no stock-licensed (Unsplash, Pexels or CC0) photos of identifiable **doctors, nurses or patients**, Indian or otherwise, that we could verify from a GitHub or GitLab repository. The Unsplash, Pexels and Wikimedia hosts are blocked from the build environment. The Open Images people photos are CC BY only and have no model releases, so we did not use any with recognisable faces. If the site needs people, license proper stock photography (for example Unsplash or Pexels with Indian clinicians), or commission a shoot, and add it here.
