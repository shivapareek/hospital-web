/* =========================================================
   CareNova Hospitals – site content
   Edit this file to update departments, doctors, packages,
   testimonials and the symptom finder without touching HTML.
   ========================================================= */

const DEPARTMENTS = [
  { name: "Cardiology", icon: "i-heart-pulse", desc: "Angioplasty, bypass surgery, TAVI and advanced heart-failure care.", stat: "15,000+ cardiac procedures", hue: 355 },
  { name: "Neurology", icon: "i-brain", desc: "Stroke unit, epilepsy, movement disorders and brain & spine surgery.", stat: "24x7 stroke-ready unit", hue: 265 },
  { name: "Orthopedics", icon: "i-bone", desc: "Robotic knee & hip replacement, sports injuries and spine care.", stat: "Walk within 24 hours", hue: 200 },
  { name: "Oncology", icon: "i-ribbon", desc: "Medical, surgical & radiation oncology with tumour boards.", stat: "Comprehensive cancer centre", hue: 330 },
  { name: "Gynecology", icon: "i-baby", desc: "High-risk pregnancy, painless delivery, IVF and laparoscopy.", stat: "Level-3 NICU support", hue: 310 },
  { name: "Pediatrics", icon: "i-users", desc: "Newborn care, vaccinations, child development & paediatric surgery.", stat: "Child-friendly wards", hue: 35 },
  { name: "Gastroenterology", icon: "i-pill", desc: "Endoscopy, liver diseases, IBD and minimally invasive GI surgery.", stat: "Advanced endoscopy suite", hue: 145 },
  { name: "Nephrology", icon: "i-drop", desc: "Dialysis, kidney transplant and management of chronic kidney disease.", stat: "40-station dialysis unit", hue: 190 },
  { name: "Pulmonology", icon: "i-lungs", desc: "Asthma, COPD, sleep studies, bronchoscopy and lung rehab.", stat: "Interventional pulmonology", hue: 170 },
  { name: "Ophthalmology", icon: "i-eye", desc: "Bladeless LASIK, cataract, retina and glaucoma treatments.", stat: "Same-day cataract surgery", hue: 220 },
  { name: "Dental", icon: "i-tooth", desc: "Implants, aligners, root canal and cosmetic dentistry.", stat: "Painless digital dentistry", hue: 50 },
  { name: "General Medicine", icon: "i-steth", desc: "Fever, diabetes, BP, thyroid and preventive health for adults.", stat: "Walk-in OPD all day", hue: 160 }
];

const DOCTORS = [
  { name: "Dr. Ananya Rao", dept: "Cardiology", role: "Sr. Consultant & HOD", exp: 22, deg: "MD, DM (Cardiology), FACC", rating: 4.9, reviews: 1840, fee: 1200, today: true, video: true, lang: "English, Hindi, Telugu" },
  { name: "Dr. Rajeev Malhotra", dept: "Cardiology", role: "Cardiothoracic Surgeon", exp: 25, deg: "MS, MCh (CTVS)", rating: 4.8, reviews: 1210, fee: 1500, today: false, video: false, lang: "English, Hindi, Punjabi" },
  { name: "Dr. Sameer Khanna", dept: "Neurology", role: "Director – Neurosciences", exp: 19, deg: "MD, DM (Neurology)", rating: 4.9, reviews: 1532, fee: 1400, today: true, video: true, lang: "English, Hindi" },
  { name: "Dr. Kavita Iyer", dept: "Orthopedics", role: "Robotic Joint Replacement", exp: 17, deg: "MS (Ortho), Fellowship (UK)", rating: 4.8, reviews: 980, fee: 1200, today: true, video: false, lang: "English, Hindi, Tamil" },
  { name: "Dr. Arjun Sethi", dept: "Oncology", role: "Surgical Oncologist", exp: 15, deg: "MS, MCh (Surgical Oncology)", rating: 4.9, reviews: 760, fee: 1500, today: false, video: true, lang: "English, Hindi" },
  { name: "Dr. Priya Sharma", dept: "Gynecology", role: "Obstetrics & IVF Specialist", exp: 18, deg: "MS (OBG), FRCOG", rating: 4.9, reviews: 2104, fee: 1000, today: true, video: true, lang: "English, Hindi, Marathi" },
  { name: "Dr. Neha Kapoor", dept: "Pediatrics", role: "Sr. Paediatrician & Neonatologist", exp: 14, deg: "MD (Paeds), Fellowship Neonatology", rating: 4.9, reviews: 1650, fee: 900, today: true, video: true, lang: "English, Hindi" },
  { name: "Dr. Vikram Mehta", dept: "General Medicine", role: "Internal Medicine & Diabetology", exp: 20, deg: "MD (Medicine)", rating: 4.7, reviews: 2310, fee: 800, today: true, video: true, lang: "English, Hindi, Gujarati" },
  { name: "Dr. Farhan Siddiqui", dept: "Gastroenterology", role: "Gastroenterologist & Hepatologist", exp: 16, deg: "MD, DM (Gastro)", rating: 4.8, reviews: 870, fee: 1200, today: false, video: true, lang: "English, Hindi, Urdu" },
  { name: "Dr. Meera Nair", dept: "Nephrology", role: "Nephrologist & Transplant Physician", exp: 13, deg: "MD, DNB (Nephrology)", rating: 4.8, reviews: 540, fee: 1100, today: true, video: false, lang: "English, Malayalam, Hindi" },
  { name: "Dr. Rohan Desai", dept: "Pulmonology", role: "Chest & Sleep Medicine", exp: 12, deg: "MD (Pulmonary Medicine)", rating: 4.7, reviews: 690, fee: 1000, today: false, video: true, lang: "English, Hindi, Marathi" },
  { name: "Dr. Sana Qureshi", dept: "Ophthalmology", role: "Cataract & Refractive Surgeon", exp: 11, deg: "MS (Ophth), FICO", rating: 4.8, reviews: 730, fee: 800, today: true, video: false, lang: "English, Hindi" },
  { name: "Dr. Aditya Verma", dept: "Dental", role: "Implantologist & Cosmetic Dentist", exp: 10, deg: "BDS, MDS (Prosthodontics)", rating: 4.8, reviews: 460, fee: 600, today: true, video: false, lang: "English, Hindi" },
  { name: "Dr. Harpreet Gill", dept: "Orthopedics", role: "Spine & Sports Medicine", exp: 14, deg: "MS (Ortho), FNB (Spine)", rating: 4.8, reviews: 820, fee: 1100, today: true, video: true, lang: "English, Hindi, Punjabi" },
  { name: "Dr. Lakshmi Menon", dept: "Oncology", role: "Medical Oncologist", exp: 18, deg: "MD, DM (Medical Oncology)", rating: 4.9, reviews: 930, fee: 1400, today: true, video: true, lang: "English, Malayalam, Hindi" },
  { name: "Dr. Ishita Banerjee", dept: "Neurology", role: "Spine & Neurosurgeon", exp: 16, deg: "MS, MCh (Neurosurgery)", rating: 4.8, reviews: 610, fee: 1500, today: false, video: true, lang: "English, Bengali, Hindi" }
];

const PACKAGES = [
  { name: "Essential Health Check", tag: ["all", "men", "women"], price: 1499, mrp: 2999, tests: 52, items: ["Complete Blood Count", "Blood Sugar (Fasting)", "Lipid Profile", "Liver & Kidney Function", "Urine Routine", "Physician Consultation"] },
  { name: "Comprehensive Wellness", tag: ["all", "men", "women"], price: 3999, mrp: 7999, tests: 86, popular: true, items: ["Everything in Essential", "Thyroid Profile", "HbA1c & Vitamin D, B12", "ECG & Chest X-Ray", "Ultrasound Abdomen", "Diet & Physician Consult"] },
  { name: "Women's Wellness", tag: ["all", "women"], price: 4499, mrp: 8499, tests: 78, items: ["Pap Smear & Breast Exam", "Mammography / Breast USG", "Thyroid & Hormone Panel", "Iron Studies & Vitamin D", "Pelvic Ultrasound", "Gynaecologist Consult"] },
  { name: "Men's Executive", tag: ["all", "men"], price: 4999, mrp: 9499, tests: 82, items: ["PSA (Prostate Screening)", "Testosterone & Thyroid", "TMT / Stress Test", "Liver Fibroscan", "Lung Function Test", "Physician Consult"] },
  { name: "Senior Citizen Care", tag: ["all", "senior"], price: 5499, mrp: 10999, tests: 94, items: ["Bone Density (DEXA)", "Echo & ECG", "Eye & Hearing Check", "Kidney & Liver Panel", "Memory Screening", "Geriatrician Consult"] },
  { name: "Advanced Heart Check", tag: ["all", "heart", "senior"], price: 6999, mrp: 13999, tests: 64, items: ["2D Echo & TMT", "CT Calcium Score", "hs-CRP & Lipoprotein(a)", "Advanced Lipid Profile", "Diabetes Panel", "Cardiologist Consult"] }
];

const TESTIMONIALS = [
  { name: "Ramesh Gupta", meta: "Bypass surgery • Delhi", text: "I was terrified before my bypass. Dr. Malhotra and the cardiac team explained every step, and I was walking on day 3. The nursing staff treated me like family.", rating: 5, hue: 200 },
  { name: "Sneha Patel", meta: "Maternity • Gurugram", text: "From the first scan to delivery, Dr. Priya was amazing. The labour suite felt like a hotel room and the NICU team was incredible with our little one.", rating: 5, hue: 320 },
  { name: "Abdul Rahman", meta: "International patient • Oman", text: "The international desk handled everything — visa letter, airport pickup, interpreter. My knee replacement was robotic and I flew home pain-free in 10 days.", rating: 5, hue: 35 },
  { name: "Kiran Bedi", meta: "Stroke treatment • Faridabad", text: "My father had a stroke at midnight. The ambulance came in minutes and the stroke team was ready at the door. Doctors say those first 60 minutes saved him.", rating: 5, hue: 150 },
  { name: "Ananya Joshi", meta: "Video consultation • Pune", text: "Booked a video consult at 10 PM for my son's fever and spoke to a senior paediatrician within 15 minutes. The e-prescription came straight to WhatsApp.", rating: 5, hue: 265 }
];

/* Symptom → speciality map for the Smart Specialist Finder */
const SYMPTOMS = [
  { label: "Chest pain", dept: "Cardiology", urgent: true },
  { label: "Palpitations", dept: "Cardiology" },
  { label: "Breathlessness", dept: "Pulmonology", urgent: true },
  { label: "Persistent cough", dept: "Pulmonology" },
  { label: "Severe headache", dept: "Neurology" },
  { label: "Numbness / weakness", dept: "Neurology", urgent: true },
  { label: "Dizziness", dept: "Neurology" },
  { label: "Joint / knee pain", dept: "Orthopedics" },
  { label: "Back pain", dept: "Orthopedics" },
  { label: "Stomach pain", dept: "Gastroenterology" },
  { label: "Acidity / indigestion", dept: "Gastroenterology" },
  { label: "Fever", dept: "General Medicine" },
  { label: "High sugar / BP", dept: "General Medicine" },
  { label: "Swelling in feet", dept: "Nephrology" },
  { label: "Blurred vision", dept: "Ophthalmology" },
  { label: "Toothache", dept: "Dental" },
  { label: "Pregnancy care", dept: "Gynecology" },
  { label: "Irregular periods", dept: "Gynecology" },
  { label: "Child unwell", dept: "Pediatrics" },
  { label: "Unexplained lump", dept: "Oncology" }
];

/* Rule-based virtual assistant replies */
const CHAT_RULES = [
  { k: ["appointment", "book", "slot", "consult"], a: "You can book an appointment in under a minute using our <a href=\"#appointment\">online booking form</a>. You'll get an instant token number. Want me to take you there?" },
  { k: ["emergency", "ambulance", "accident", "urgent", "sos"], a: "🚑 For emergencies please call <a href=\"tel:18001234567\"><b>1800-123-4567</b></a> right away (24x7). Our average ambulance response time is 12 minutes." },
  { k: ["report", "lab", "result", "test result"], a: "You can download your lab & radiology reports using your UHID and registered mobile number. <a href=\"#\" data-open=\"reportsModal\">Open report download</a>." },
  { k: ["package", "checkup", "check-up", "health check", "full body"], a: "Our health check-up packages start at just ₹1,499 with free home sample collection. <a href=\"#packages\">See all packages</a>." },
  { k: ["insurance", "cashless", "tpa", "cghs", "ayushman"], a: "We offer cashless treatment with 150+ insurers & TPAs including CGHS, ECHS and Ayushman Bharat. Pre-authorisation usually takes ~30 minutes." },
  { k: ["video", "online", "tele"], a: "Yes! You can consult our senior doctors over HD video in about 15 minutes. Choose <b>Video</b> as the consultation type while <a href=\"#appointment\" data-video-book>booking</a>." },
  { k: ["timing", "time", "open", "hours", "opd"], a: "OPD: Mon–Sat, 8 AM – 8 PM. Emergency, pharmacy & diagnostics are open 24x7." },
  { k: ["visit", "visiting"], a: "Ward visiting hours: 11 AM – 1 PM and 5 PM – 7 PM. ICU: one attendant at 12 PM and 6 PM." },
  { k: ["address", "location", "where", "direction", "map"], a: "We're at Plot 21, Health City, NH-48, Sector 44, Gurugram. <a href=\"#contact\">View map & directions</a>." },
  { k: ["doctor", "specialist", "cardiolog", "neuro", "ortho", "gyn", "child", "paed"], a: "We have 250+ specialists. Use our <a href=\"#doctors\">Find a Doctor</a> tool to search by name or speciality, or try the <a href=\"#symptom\">Smart Specialist Finder</a>." },
  { k: ["price", "fee", "cost", "charges"], a: "Consultation fees range from ₹600 to ₹1,500 depending on the specialist. For surgery estimates, call +91 98765 43210 and our team will share a transparent quote." },
  { k: ["hi", "hello", "hey", "namaste"], a: "Namaste! 🙏 I'm Nova. I can help you book appointments, find doctors, check packages or get emergency help." },
  { k: ["thank"], a: "You're welcome! Wishing you good health 💙" }
];
