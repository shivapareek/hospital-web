# CareNova Hospitals – Website

A calm, editorial website for a multi-speciality hospital (fictional client: CareNova Hospitals, Sector 44, Gurugram). Plain HTML, CSS and JavaScript. There is no build step and no framework.

## Run
Run locally with `python3 -m http.server 8000` (or `npx serve`) and open http://localhost:8000. Opening index.html directly works, but without 3D and scan viewers.

Deploy the folder as-is to any static host (GitHub Pages, Netlify, Vercel). Enable gzip or brotli for `.js`, `.css`, `.html` and `.glb`.

## What is on the page
- Hero with a porcelain 3D heart (a still poster first; the 3D view loads after the page on capable computers, or on tap on phones), live emergency wait, next available doctor, rating and ambulance request
- Smart search across doctors, specialities and symptoms (keyboard friendly)
- Specialities index with a specimen cabinet of porcelain organ models
- Specialist finder: tick symptoms, get a speciality and doctors, with an urgent-symptom warning
- Doctors as door plates: availability, languages, OPD hours, fee, book; filters by speciality, "Available today" and "Video consult"
- 3-step appointment booking with a digital token slip and add-to-calendar (.ics)
- Imaging and technology light box: MRI slices you can scroll through, a CT rib cage you can turn, a stent CT volume, and captioned scans
- "Look closer": a retina photograph in red-free and natural colour
- Health check-up price list with filters, patient care services, health tools (BMI, water, due date), patient stories, FAQ, health library, contact form and map
- Assistant chatbot, emergency SOS modal with location sharing, report download modal
- Light and dark themes, text size 100/110/120%, reduced-motion support, Schema.org `Hospital` data

## Files
- `index.html`, `css/style.css`: the page and its design (tokens at the top of the stylesheet)
- `js/data.js`: content (departments, doctors, packages, stories, FAQs, symptoms, assistant answers)
- `js/main.js`: all interactions; works on its own
- `js/plates.js`, `js/stage/*.js`: ES modules that add the scan viewers, light box and 3D views. If they fail to load, posters and plain lists remain.
- `assets/`: images, 3D models and the vendored three.js (r170)
- `credits.html`: source, author and licence for every image and model. Captions link to it, and the footer carries a short credits line.

## Customise
- **Content**: `js/data.js`. Captions, OPD hours and package "covers" are drafts for the client to confirm.
- **Name, phone numbers, address, email**: search and replace in `index.html` (`CareNova`, `1800-123-4567`, `+91 98765 43210`, `care@carenovahospitals.com`, `Sector 44, Gurugram`)
- **Colours and type**: CSS custom properties at the top of `css/style.css`
- **Doctor photos**: add `photo` (an 800×1000 WebP) and `photoAlt` to a doctor in `js/data.js`. Use real, consented photographs only.
- **Map**: replace the `iframe` `src` in the Contact section

> Forms, live status, OTP and booking are front-end demos. Connect them to your backend or CRM before going live.
