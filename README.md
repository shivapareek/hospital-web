# CareNova Hospitals – Website

A modern, fully responsive multi-speciality hospital website. Pure HTML/CSS/JS — no build step, no framework.

## Run
Open `index.html` in a browser, or serve the folder (`npx serve .`). Deploy as-is to GitHub Pages, Netlify, Vercel or any static host.

## Features
- Hero with smart search, animated ECG and quick-action bar
- **Live hospital status** (ER wait, beds, ICU, OPD token)
- **Smart Specialist Finder** (symptom → speciality + doctors, urgent-symptom warning)
- Doctor directory with search, speciality filter, "available today" and "video consult" toggles
- **3-step appointment booking**: doctor → date/slot → details, digital token, add-to-calendar (.ics)
- Centres of excellence, technology showcase, patient services
- Health check-up packages with category tabs
- Video consultation section with app links
- Health tools: BMI, water intake, pregnancy due-date calculators
- Testimonials slider (auto-play + swipe), insurance partner marquee, health blog, FAQ
- Contact form, Google Map, newsletter
- **Virtual assistant chatbot**, WhatsApp button, **Emergency SOS** modal with location sharing, report download modal
- Dark mode, text-size controls (A- / A / A+), reduced-motion support, SEO meta + Schema.org `Hospital` data

## Customise
- **Content** (departments, doctors, packages, testimonials, symptoms, chatbot answers): `js/data.js`
- **Name, phone numbers, address, email**: search & replace in `index.html` (`CareNova`, `1800-123-4567`, `+91 98765 43210`, `care@carenovahospitals.com`, `Sector 44, Gurugram`)
- **Colours**: CSS variables at the top of `css/style.css`
- **Map**: replace the `iframe` `src` in the Contact section

> Forms, live status, OTP and booking are front-end demos. Connect them to your backend/CRM (or a service like Formspree / WhatsApp API) before going live.
