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
- **3D framing**: `js/stage/specimens.js`. The hero posters (`assets/img/specimens/heart-cover-*.webp`) and the leader-label anchors (`HERO.labels[].at`) match the hero's yaw and offsets. If you change those, re-render the posters and recompute the anchors, or the 3D view will jump when it fades in over the poster. The heart's `.mo.glb` files are cleaned copies (loose fragments, the inferior vena cava stub and the outer lung vessels removed; see `assets/models/CREDITS.md`). If you re-compress from `heart.glb`, clean it again, then re-render the heart posters and stills.
- **Photographs to replace**: the patient care photo (a doctor with a tablet), the operating theatre and the two scanner photos are illustrative stock from other facilities. Swap in CareNova's own photographs when they exist.

> Forms, live status, OTP and booking are front-end demos. Connect them to your backend or CRM before going live.

## CMS and admin panel

The site now runs on a small Node.js server that stores everything in a database file and gives the hospital an admin panel.

```bash
npm install
npm start            # http://localhost:3000  (admin: http://localhost:3000/admin/)
```

First sign-in: **admin@carenova.local / ChangeMe@123** (or set `ADMIN_PASSWORD` before the first start). You are asked to change it.

What the admin panel controls
- **Appointments** booked on the website (real tokens, double-booking blocked), status, notes, manual bookings, CSV export
- **Enquiries**: contact messages, report requests, health check-up call-back requests; **newsletter subscribers**
- **Content**: doctors (with photos), specialities, health check-ups, patient stories, FAQs, symptom finder, chat replies, health library
- **Page text and images**: every heading, paragraph, button label and content image on the home page (about 330 fields), each with "reset to default", in English and in Hindi (see below)
- **Sections**: show or hide any section of the page
- **Settings**: hospital name, phone numbers, WhatsApp, email, map, SEO title/description/share image, brand colour, logo, announcement bar, booking hours/closed days/slot length, social links
- **Live status**: the "Emergency wait right now" panel (manual values or demo mode)
- **Media library**, **users with roles** (admin, editor, reception), **activity log**

Environment variables: `PORT` (3000), `DATA_DIR` (./data), `UPLOAD_DIR` (./uploads), `ADMIN_PASSWORD` (first run only), `COOKIE_SECURE=1` (behind HTTPS), `TRUST_PROXY=1` (behind Nginx/Render/Railway).
Data lives in `data/cms.json` with daily backups in `data/backups/`. Keep `data/` and `uploads/` on persistent storage and out of git.

Hosting: any Node 18+ host (a VPS with PM2 + Nginx, Render, Railway, Hostinger VPS, DigitalOcean). Static hosting (Netlify/GitHub Pages) still works for the public site alone, but then the admin panel and form saving are not available.

## Hindi (हिन्दी)

Every public page also exists in Hindi under `/hi/`: `/hi/` (home), `/hi/doctors…`, `/hi/specialities…`, `/hi/library…`, `/hi/<custom page>`, `/hi/privacy-policy`, `/hi/terms`, `/hi/patient-rights`, `/hi/data-request`, `/hi/manage-booking`. English stays at the existing addresses. Each page has an **English | हिन्दी** switch in the header (and in the phone menu) that opens the same page in the other language, `<link rel="alternate" hreflang="en|hi|x-default">`, and both languages are in `sitemap.xml`. There is no automatic redirect by browser language.

The Hindi is written the way Indian hospitals write for patients: simple Hindi, with the English words people actually use (OPD, ICU, MRI, CT स्कैन, टोकन, WhatsApp, Dr.), Western digits and ₹ amounts. Doctor names, degrees, institutions, brand and insurer names and licence/credit lines stay as written.

How the Hindi is put together
- **Home page text** (the ~330 fields of Admin → Page text): shipped translations in `server/i18n/hi-home.json`, keyed by field key with the English they were made from. Page text has a language switch, **English | हिन्दी**: Hindi edits are stored separately (`textsHi`). On `/hi/` a field shows, in order: the Hindi edit from the admin → the shipped translation (only while its English source still matches `index.html`) → the English (edited or default). The Hindi screen shows the English next to each field and flags fields whose English was edited after the translation was made.
- **Content** (doctors, specialities, check-ups, stories, FAQs, symptoms, chat replies, articles, pages): every patient-facing text field has a Hindi twin (`<field>_hi`) in a collapsed **हिन्दी (Hindi) translations** block at the bottom of each form. Empty = the English is shown on Hindi pages. Speciality and package names stay English inside the data (bookings, links and requests keep using them) and get a Hindi display name. Chat replies take Hindi and Hinglish keywords (`अपॉइंटमेंट`, `doctor se milna`, `बीमा`…); on Hindi pages the English keywords keep working too.
- **Legal pages and consent**: Admin → Settings → *Privacy and legal: हिन्दी (Hindi)*: Hindi Markdown for each legal page, the Hindi consent text (its own consent version) and the grievance officer's name. The shipped Hindi is demo text, like the English: have a lawyer review both before real use. Empty = the English is shown.
- **SEO and announcement**: Settings → *Page title / Description (हिन्दी)* and *Announcement text (हिन्दी)*.
- **Browser scripts**: text written by `js/*.js` (messages, labels, dates) comes from `server/i18n/hi-ui.json` (sent to Hindi pages as `window.I18N`); server-rendered inner-page text and API messages from `server/i18n/hi-strings.json`. Forms on Hindi pages send `lang: "hi"` and get their error messages in Hindi.
- **Not translated**: the admin panel (English only), the SMS/WhatsApp templates (sent in English; the manage link of a booking made on the Hindi site opens the Hindi page), `credits.html`, doctors' education lists (degrees and institutions).
- **Type**: Hindi pages load *Noto Sans Devanagari* (with Atkinson Hyperlegible) and *Noto Serif Devanagari* (with Newsreader) from Google Fonts; the Devanagari rules live in `css/i18n.css` under `:lang(hi)`.

Upgrading an existing site: on the first start the migration `i18n-hi-v1` adds the Hindi demo translations to empty `_hi` fields, but only where the English is still the demo text it was translated from. Anything edited in the admin is left alone (its Hindi stays empty, so Hindi pages show the edited English until someone translates it). It runs once per database.
