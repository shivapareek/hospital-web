/* =========================================================
   CareNova Hospitals – site content
   Edit this file to update specialities, doctors, packages,
   stories, FAQs, the symptom finder and the assistant.
   Captions, OPD hours and package "covers" are drafts for the
   client to confirm (see README).
   ========================================================= */

const DEPARTMENTS = [
  {
    name: "Cardiology", icon: "i-heart-pulse", desc: "Angioplasty, bypass surgery, TAVI and heart-failure care.",
    specimen: "heart", still: "assets/img/specimens/heart",
    caption: "The heart. The green vessels are the coronary arteries, which carry blood to the heart muscle itself.",
    credit: "Model: BodyParts3D, © DBCLS, CC BY-SA 2.1 JP", creditId: "heart",
    inset: { src: "assets/img/ct-chest-axial-graded-640.webp", label: "CT scan, a slice through the chest" }
  },
  {
    name: "Neurology", icon: "i-brain", desc: "Stroke unit, epilepsy, movement disorders, brain and spine surgery.",
    specimen: "brain", still: "assets/img/specimens/brain",
    caption: "The brain, grouped into lobes. The green frontal lobe handles planning, speech and personality.",
    credit: "Model: Human Reference Atlas (HuBMAP), CC BY 4.0", creditId: "brain",
    inset: { src: "assets/img/mri-brain-axial-graded-800.webp", label: "MRI scan, a slice through the brain" }
  },
  {
    name: "Orthopedics", icon: "i-bone", desc: "Robotic knee and hip replacement, sports injuries, spine care.",
    specimen: "knee", alt: "spine", still: "assets/img/specimens/knee", stillAlt: "assets/img/specimens/spine",
    caption: "The knee joint. The green layers are the cartilage and menisci, the cushions that wear down with arthritis.",
    captionAlt: "The spine, from the neck to the tailbone. The green discs cushion each vertebra.",
    credit: "Model: Human Reference Atlas (HuBMAP), CC BY 4.0", creditId: "knee",
    creditAlt: "Model: BodyParts3D, © DBCLS, CC BY-SA 2.1 JP", creditIdAlt: "spine",
    inset: { src: "assets/img/photo-xray-hand-640.webp", label: "X-ray of a hand" }
  },
  {
    name: "Oncology", icon: "i-ribbon", desc: "Medical, surgical and radiation oncology with weekly tumour boards.",
    view: "image", image: "assets/img/nuclei-graded-1024.webp", still: "assets/img/specimens/oncology",
    caption: "Human cell nuclei under a fluorescence microscope. A few of them are dividing.",
    credit: "Image: CellProfiler examples (Moffat et al.), CC0", creditId: "nuclei"
  },
  {
    name: "Gynecology", icon: "i-baby", desc: "High-risk pregnancy, painless delivery, IVF and laparoscopy.",
    specimen: "uterus", still: "assets/img/specimens/uterus",
    caption: "The uterus with the fallopian tubes. The ovaries are shown in green.",
    credit: "Model: Human Reference Atlas (HuBMAP), CC BY 4.0", creditId: "uterus"
  },
  {
    name: "Pediatrics", icon: "i-users", desc: "Newborn care, vaccinations, child development and surgery.",
    view: "type", still: null, stillText: "0–18",
    caption: "Newborn to eighteen. One children's team, all the way through."
  },
  {
    name: "Gastroenterology", icon: "i-pill", desc: "Endoscopy, liver disease, IBD and minimally invasive GI surgery.",
    specimen: "liver", still: "assets/img/specimens/liver",
    caption: "The liver. It filters the blood, stores energy and makes bile for digestion.",
    credit: "Model: Human Reference Atlas (HuBMAP), CC BY 4.0", creditId: "liver"
  },
  {
    name: "Nephrology", icon: "i-drop", desc: "Dialysis, kidney transplant and chronic kidney disease.",
    specimen: "kidney", still: "assets/img/specimens/kidney",
    caption: "The kidney with its outer layer made see-through. The green cones inside, the renal pyramids, collect urine.",
    credit: "Model: Human Reference Atlas (HuBMAP), CC BY 4.0", creditId: "kidney",
    inset: { src: "assets/img/kidney-fluorescence-graded-512.webp", label: "Kidney tissue (mouse) under a microscope" }
  },
  {
    name: "Pulmonology", icon: "i-lungs", desc: "Asthma, COPD, sleep studies, bronchoscopy and lung rehab.",
    specimen: "lungs", still: "assets/img/specimens/lungs",
    caption: "The lungs, made see-through to show the airways (green) branching from the windpipe.",
    credit: "Model: Human Reference Atlas (HuBMAP), CC BY 4.0", creditId: "lungs",
    inset: { src: "assets/img/ct-chest-coronal-graded-960.webp", label: "CT scan, the chest seen from the front" }
  },
  {
    name: "Ophthalmology", icon: "i-eye", desc: "Bladeless LASIK, cataract, retina and glaucoma.",
    specimen: "eye", still: "assets/img/specimens/eye",
    caption: "The eye. The green ring is the iris; the clear dome in front of it is the cornea.",
    credit: "Model: Human Reference Atlas (HuBMAP), CC BY 4.0", creditId: "eye",
    inset: { src: "assets/img/retina-redfree-graded-800.webp", label: "The retina, photographed in red-free light" }
  },
  {
    name: "Dental", icon: "i-tooth", desc: "Implants, aligners, root canals and cosmetic dentistry.",
    specimen: "tooth", still: "assets/img/specimens/tooth",
    caption: "A lower molar, crown up, with its two roots.",
    credit: "Model: BodyParts3D, © DBCLS, CC BY-SA 2.1 JP", creditId: "tooth"
  },
  {
    name: "General Medicine", icon: "i-steth", desc: "Fever, diabetes, blood pressure, thyroid and preventive care.",
    // a typographic tile like Pediatrics (the stethoscope stock photo read as generic); caption: client to confirm
    view: "type", still: null, stillText: "120/80",
    caption: "Below 120 over 80 counts as normal blood pressure. Our physicians check the basics first: blood pressure, blood sugar and thyroid."
  }
];

const DOCTORS = [
  { name: "Dr. Ananya Rao", dept: "Cardiology", role: "Senior consultant & head of department", exp: 22, deg: "MD, DM (Cardiology), FACC", rating: 4.9, reviews: 1840, fee: 1200, today: true, video: true, lang: "English, Hindi, Telugu", opd: "Mon–Sat · 10 AM – 2 PM" },
  { name: "Dr. Sameer Khanna", dept: "Neurology", role: "Director, Neurosciences", exp: 19, deg: "MD, DM (Neurology)", rating: 4.9, reviews: 1532, fee: 1400, today: true, video: true, lang: "English, Hindi", opd: "Mon–Fri · 9 AM – 1 PM" },
  { name: "Dr. Kavita Iyer", dept: "Orthopedics", role: "Robotic joint replacement", exp: 17, deg: "MS (Ortho), Fellowship (UK)", rating: 4.8, reviews: 980, fee: 1200, today: true, video: false, lang: "English, Hindi, Tamil", opd: "Mon, Wed, Fri · 10 AM – 4 PM" },
  { name: "Dr. Priya Sharma", dept: "Gynecology", role: "Obstetrics & IVF", exp: 18, deg: "MS (OBG), FRCOG", rating: 4.9, reviews: 2104, fee: 1000, today: true, video: true, lang: "English, Hindi, Marathi", opd: "Mon–Sat · 11 AM – 3 PM" },
  { name: "Dr. Neha Kapoor", dept: "Pediatrics", role: "Paediatrician & neonatologist", exp: 14, deg: "MD (Paeds), Fellowship Neonatology", rating: 4.9, reviews: 1650, fee: 900, today: true, video: true, lang: "English, Hindi", opd: "Mon–Sat · 9 AM – 1 PM, 5 – 7 PM" },
  { name: "Dr. Lakshmi Menon", dept: "Oncology", role: "Medical oncologist", exp: 18, deg: "MD, DM (Medical Oncology)", rating: 4.9, reviews: 930, fee: 1400, today: true, video: true, lang: "English, Malayalam, Hindi", opd: "Tue–Sat · 10 AM – 2 PM" },
  { name: "Dr. Vikram Mehta", dept: "General Medicine", role: "Internal medicine & diabetes", exp: 20, deg: "MD (Medicine)", rating: 4.7, reviews: 2310, fee: 800, today: true, video: true, lang: "English, Hindi, Gujarati", opd: "Mon–Sat · 8 AM – 12 PM, 5 – 8 PM" },
  { name: "Dr. Farhan Siddiqui", dept: "Gastroenterology", role: "Gastroenterology & hepatology", exp: 16, deg: "MD, DM (Gastro)", rating: 4.8, reviews: 870, fee: 1200, today: false, video: true, lang: "English, Hindi, Urdu", opd: "Tue, Thu, Sat · 2 – 6 PM" },
  { name: "Dr. Rajeev Malhotra", dept: "Cardiology", role: "Cardiothoracic surgeon", exp: 25, deg: "MS, MCh (CTVS)", rating: 4.8, reviews: 1210, fee: 1500, today: false, video: false, lang: "English, Hindi, Punjabi", opd: "Wed, Sat · 2 – 5 PM" },
  { name: "Dr. Ishita Banerjee", dept: "Neurology", role: "Brain & spine surgeon", exp: 16, deg: "MS, MCh (Neurosurgery)", rating: 4.8, reviews: 610, fee: 1500, today: false, video: true, lang: "English, Bengali, Hindi", opd: "Mon, Thu · 3 – 7 PM" },
  { name: "Dr. Harpreet Gill", dept: "Orthopedics", role: "Spine & sports medicine", exp: 14, deg: "MS (Ortho), FNB (Spine)", rating: 4.8, reviews: 820, fee: 1100, today: true, video: true, lang: "English, Hindi, Punjabi", opd: "Mon–Fri · 4 – 8 PM" },
  { name: "Dr. Arjun Sethi", dept: "Oncology", role: "Surgical oncologist", exp: 15, deg: "MS, MCh (Surgical Oncology)", rating: 4.9, reviews: 760, fee: 1500, today: false, video: true, lang: "English, Hindi", opd: "Tue, Fri · 10 AM – 1 PM" },
  { name: "Dr. Meera Nair", dept: "Nephrology", role: "Nephrology & transplant", exp: 13, deg: "MD, DNB (Nephrology)", rating: 4.8, reviews: 540, fee: 1100, today: true, video: false, lang: "English, Malayalam, Hindi", opd: "Mon–Sat · 9 AM – 12 PM" },
  { name: "Dr. Rohan Desai", dept: "Pulmonology", role: "Chest & sleep medicine", exp: 12, deg: "MD (Pulmonary Medicine)", rating: 4.7, reviews: 690, fee: 1000, today: false, video: true, lang: "English, Hindi, Marathi", opd: "Mon, Wed, Fri · 5 – 8 PM" },
  { name: "Dr. Sana Qureshi", dept: "Ophthalmology", role: "Cataract & refractive surgeon", exp: 11, deg: "MS (Ophth), FICO", rating: 4.8, reviews: 730, fee: 800, today: true, video: false, lang: "English, Hindi", opd: "Mon–Sat · 10 AM – 1 PM" },
  { name: "Dr. Aditya Verma", dept: "Dental", role: "Implants & cosmetic dentistry", exp: 10, deg: "BDS, MDS (Prosthodontics)", rating: 4.8, reviews: 460, fee: 600, today: true, video: false, lang: "English, Hindi", opd: "Mon–Sat · 11 AM – 7 PM" }
];

const PACKAGES = [
  { name: "Essential", tag: ["all", "men", "women"], price: 1499, mrp: 2999, tests: 52, covers: ["heart", "liver", "kidney"], items: ["Complete blood count", "Fasting blood sugar", "Lipid profile", "Liver and kidney function", "Urine routine", "Physician review"] },
  { name: "Comprehensive", tag: ["all", "men", "women"], price: 3999, mrp: 7999, tests: 86, popular: true, covers: ["heart", "lungs", "liver", "kidney"], items: ["Everything in Essential", "Thyroid profile", "HbA1c, vitamin D and B12", "ECG and chest X-ray", "Ultrasound abdomen", "Diet and physician consult"] },
  { name: "Women's wellness", tag: ["all", "women"], price: 4499, mrp: 8499, tests: 78, covers: ["uterus"], items: ["Pap smear and breast exam", "Mammography or breast USG", "Thyroid and hormone panel", "Iron studies, vitamin D", "Pelvic ultrasound", "Gynaecologist consult"] },
  { name: "Men's executive", tag: ["all", "men"], price: 4999, mrp: 9499, tests: 82, covers: ["heart", "lungs", "liver"], items: ["PSA prostate screening", "Testosterone and thyroid", "Treadmill stress test", "Liver FibroScan", "Lung function test", "Physician consult"] },
  { name: "Senior care (60+)", tag: ["all", "senior"], price: 5499, mrp: 10999, tests: 94, covers: ["heart", "brain", "eye", "spine", "liver", "kidney"], items: ["Bone density (DEXA)", "Echo and ECG", "Eye and hearing check", "Kidney and liver panel", "Memory screening", "Geriatrician consult"] },
  { name: "Advanced heart", tag: ["all", "heart", "senior"], price: 6999, mrp: 13999, tests: 64, covers: ["heart"], items: ["2D echo and TMT", "CT calcium score", "hs-CRP and Lp(a)", "Advanced lipid profile", "Diabetes panel", "Cardiologist consult"] }
];

const TESTIMONIALS = [
  { name: "Ramesh Gupta", meta: "Bypass surgery · Delhi", text: "I was terrified before my bypass. The cardiac team explained every step, and I was walking on day three. The nurses treated me like family." },
  { name: "Sneha Patel", meta: "Maternity · Gurugram", text: "From the first scan to delivery, Dr. Priya was calm and clear. When our daughter needed the NICU, they kept us informed every few hours." },
  { name: "Abdul Rahman", meta: "Knee replacement · Muscat", text: "The international desk sorted my visa letter, airport pickup and an Arabic interpreter. I flew home ten days after a robotic knee replacement." },
  { name: "Kiran Bedi", meta: "Stroke care · Faridabad", text: "My father had a stroke at midnight. The ambulance came in minutes and the stroke team was waiting at the door. Those first sixty minutes saved him." },
  { name: "Ananya Joshi", meta: "Video consult · Pune", text: "I booked a video consult at 10 PM for my son's fever and spoke to a senior paediatrician fifteen minutes later. The prescription came on WhatsApp." }
];

const FAQS = [
  { q: "How do I book an appointment?", a: "Use the booking form on this page, call +91 98765 43210, message us on WhatsApp or visit the OPD registration desk. Online bookings get a digital token, so you walk in at your time." },
  { q: "Do you offer cashless treatment?", a: "Yes. We work with 150+ insurers and TPAs, including CGHS, ECHS and Ayushman Bharat. Our insurance desk handles pre-authorisation, usually within 30 minutes." },
  { q: "What should I bring for my first visit?", a: "A photo ID, your insurance card if you have one, previous reports and prescriptions, and a list of the medicines you take." },
  { q: "How do I get my lab reports?", a: "We send them by SMS and WhatsApp. You can also download them here using your UHID and registered mobile number." },
  { q: "What are the visiting hours?", a: "Wards: 11 AM to 1 PM and 5 to 7 PM. ICU: one attendant at 12 PM and 6 PM, to keep infection risk low." },
  { q: "Is there parking?", a: "Yes. Multi-level parking for 800+ cars, with free valet for senior citizens and patients with disabilities." }
];

/* Symptom → speciality map for the specialist finder */
const SYMPTOMS = [
  { label: "Chest pain", dept: "Cardiology", urgent: true },
  { label: "Palpitations", dept: "Cardiology" },
  { label: "Breathlessness", dept: "Pulmonology", urgent: true },
  { label: "Persistent cough", dept: "Pulmonology" },
  { label: "Severe headache", dept: "Neurology" },
  { label: "Numbness or weakness", dept: "Neurology", urgent: true },
  { label: "Dizziness", dept: "Neurology" },
  { label: "Knee or joint pain", dept: "Orthopedics" },
  { label: "Back pain", dept: "Orthopedics" },
  { label: "Stomach pain", dept: "Gastroenterology" },
  { label: "Acidity", dept: "Gastroenterology" },
  { label: "Fever", dept: "General Medicine" },
  { label: "High sugar or BP", dept: "General Medicine" },
  { label: "Swollen feet", dept: "Nephrology" },
  { label: "Blurred vision", dept: "Ophthalmology" },
  { label: "Toothache", dept: "Dental" },
  { label: "Pregnancy", dept: "Gynecology" },
  { label: "Irregular periods", dept: "Gynecology" },
  { label: "Child unwell", dept: "Pediatrics" },
  { label: "Unexplained lump", dept: "Oncology" }
];

/* Rule-based assistant replies */
const CHAT_RULES = [
  { k: ["appointment", "book", "slot", "consult"], a: "You can book in under a minute with our <a href=\"#book\">online booking form</a>. You'll get a digital token straight away." },
  { k: ["emergency", "ambulance", "accident", "urgent", "sos"], a: "For an emergency, call <b>1800-123-4567</b> now. We answer 24x7, and our ambulances reach most of Gurugram in about 12 minutes." },
  { k: ["report", "lab", "result"], a: "Download lab and scan reports with your UHID and registered mobile. <a href=\"#\" data-open=\"reportsModal\">Open reports</a>." },
  { k: ["package", "checkup", "check-up", "health check", "full body"], a: "Health check-ups start at ₹1,499, with free home sample collection above ₹1,999. <a href=\"#packages\">See packages</a>." },
  { k: ["insurance", "cashless", "tpa", "cghs", "ayushman"], a: "We're cashless with 150+ insurers and TPAs, including CGHS, ECHS and Ayushman Bharat. Pre-authorisation usually takes about 30 minutes." },
  { k: ["video", "online", "tele"], a: "Yes. Choose <b>Video call</b> while <a href=\"#book\" data-video-book>booking</a> and a senior doctor will usually see you within 15 minutes." },
  { k: ["whatsapp"], a: "Message us on WhatsApp at <a href=\"https://wa.me/919876543210\" target=\"_blank\" rel=\"noopener\">+91 98765 43210</a>." },
  { k: ["timing", "time", "open", "hours", "opd"], a: "OPD runs Monday to Saturday, 8 AM to 8 PM. Emergency, pharmacy and diagnostics are open 24x7." },
  { k: ["visit", "visiting"], a: "Ward visiting hours are 11 AM to 1 PM and 5 to 7 PM. ICU: one attendant at 12 PM and 6 PM." },
  { k: ["address", "location", "where", "direction", "map"], a: "We're at Plot 21, Health City, NH-48, Sector 44, Gurugram. <a href=\"#contact\">Get directions</a>." },
  { k: ["doctor", "specialist", "cardio", "neuro", "ortho", "gyn", "child", "paed"], a: "Browse <a href=\"#doctors\">our doctors</a> by speciality, or try the <a href=\"#symptom\">specialist finder</a> if you're not sure who to see." },
  { k: ["price", "fee", "cost", "charges"], a: "Consultations cost ₹600 to ₹1,500 depending on the doctor. For a surgery estimate, call +91 98765 43210 and we'll send a written quote." },
  { k: ["hi", "hello", "hey", "namaste"], a: "Namaste. I'm Nova. I can help you book a visit, find a doctor, check packages or reach emergency." },
  { k: ["thank"], a: "You're welcome. Take care." }
];
