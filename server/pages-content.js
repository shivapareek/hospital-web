/* Demo content for the profile, speciality, article and custom pages.
   Used once by the migration in server/pages.js (fresh and existing databases alike):
   it fills only fields that are still empty, so edits made in the admin are never overwritten.
   All of it is placeholder copy for the fictional CareNova Hospitals; replace it with the
   hospital's own text, and use real, consented patient reviews only. */

/* ---------- doctors (matched by name) ---------- */
const DOCTORS = {
  "Dr. Ananya Rao": {
    bio: "Dr. Ananya Rao leads the cardiology department at CareNova. She trained at AIIMS, New Delhi, and spent three years as an interventional fellow in Toronto before returning to Gurugram.\n\nHer clinical work covers complex angioplasty, structural heart disease and heart failure. She runs the Thursday heart-failure clinic, where patients see a cardiologist, a dietitian and a nurse educator in one visit. She prefers to explain the scan on screen before she explains the plan.",
    education: ["MBBS, Maulana Azad Medical College, New Delhi (2002)", "MD (Medicine), AIIMS, New Delhi (2006)", "DM (Cardiology), AIIMS, New Delhi (2009)", "Interventional cardiology fellowship, University of Toronto (2012)"],
    awards: ["Fellow, American College of Cardiology (FACC)", "Member, Cardiological Society of India", "Faculty, India Valve Summit 2024 and 2025"],
    conditions: ["Coronary artery disease", "Heart attack", "Heart failure", "Valve disease", "High blood pressure", "Palpitations"],
    patientReviews: [
      { name: "Rakesh G.", rating: 5, date: "2026-08", text: "She showed us the blocked artery on the screen and explained why one stent was enough. My father was home in two days." },
      { name: "Shalini M.", rating: 5, date: "2026-06", text: "The heart-failure clinic saved us four separate appointments. The dietitian's plan is easy to follow." }
    ]
  },
  "Dr. Sameer Khanna": {
    bio: "Dr. Sameer Khanna directs the neurosciences centre and the 24-hour stroke unit. He set up CareNova's stroke pathway, which brings a patient from the emergency door to a clot-dissolving drug in under 45 minutes on most days.\n\nHe sees adults with epilepsy, Parkinson's disease, migraine and nerve disorders, and he chairs the weekly neuro-radiology meeting where difficult scans are reviewed by the whole team.",
    education: ["MBBS, Armed Forces Medical College, Pune (2004)", "MD (Medicine), PGIMER, Chandigarh (2008)", "DM (Neurology), NIMHANS, Bengaluru (2011)"],
    awards: ["Member, Indian Academy of Neurology", "Member, World Stroke Organization", "Stroke unit certification lead, 2023"],
    conditions: ["Stroke", "Epilepsy", "Parkinson's disease", "Migraine", "Peripheral neuropathy", "Memory loss"],
    patientReviews: [
      { name: "Anil K.", rating: 5, date: "2026-07", text: "My mother had a stroke at 6 AM. By 6:40 she had the injection. Dr. Khanna's team called us every evening of her stay." },
      { name: "Priyanka D.", rating: 5, date: "2026-05", text: "After years of seizures, the new medicine plan has kept me seizure-free for eight months." }
    ]
  },
  "Dr. Kavita Iyer": {
    bio: "Dr. Kavita Iyer is a joint replacement surgeon who has performed more than 3,000 knee and hip replacements, around a third of them with robotic assistance. She trained in arthroplasty at Wrightington Hospital in the UK.\n\nShe asks patients to start walking on the day of surgery and works closely with the physiotherapy team on a written week-by-week recovery plan. She also treats early arthritis without surgery where she can.",
    education: ["MBBS, Madras Medical College, Chennai (2005)", "MS (Orthopaedics), Christian Medical College, Vellore (2009)", "Arthroplasty fellowship, Wrightington Hospital, UK (2012)"],
    awards: ["Member, Indian Society of Hip and Knee Surgeons", "Member, Indian Orthopaedic Association", "Trainer, robotic knee replacement courses, 2024"],
    conditions: ["Knee arthritis", "Hip arthritis", "Failed knee or hip replacement", "Avascular necrosis", "Knee deformity"],
    patientReviews: [
      { name: "Sunita R.", rating: 5, date: "2026-09", text: "I walked to the bathroom the evening after my knee replacement. Six weeks later I am climbing stairs without a stick." },
      { name: "Col. H. Singh (retd.)", rating: 4, date: "2026-04", text: "Clear about risks and recovery time. The printed exercise plan was very useful at home." }
    ]
  },
  "Dr. Priya Sharma": {
    bio: "Dr. Priya Sharma heads obstetrics and the fertility clinic. She looks after high-risk pregnancies, including twins, diabetes in pregnancy and previous caesarean births, and leads the painless delivery programme with the anaesthesia team.\n\nAt the fertility clinic she offers IUI, IVF and egg freezing. She is known for setting realistic expectations at the first visit and for sharing success rates by age group.",
    education: ["MBBS, Grant Government Medical College, Mumbai (2004)", "MS (Obstetrics and Gynaecology), Seth GS Medical College, Mumbai (2008)", "FRCOG, Royal College of Obstetricians and Gynaecologists, London (2019)"],
    awards: ["Fellow, Royal College of Obstetricians and Gynaecologists", "Member, Indian Society for Assisted Reproduction", "Member, FOGSI"],
    conditions: ["High-risk pregnancy", "Infertility", "PCOS", "Fibroids", "Recurrent miscarriage", "Endometriosis"],
    patientReviews: [
      { name: "Megha T.", rating: 5, date: "2026-08", text: "We had two failed IVF cycles elsewhere. Dr. Sharma changed the protocol and our daughter was born in March." },
      { name: "Farah A.", rating: 5, date: "2026-03", text: "Gestational diabetes made me anxious. She and the dietitian checked my sugar charts every week." }
    ]
  },
  "Dr. Neha Kapoor": {
    bio: "Dr. Neha Kapoor is a paediatrician and neonatologist who runs the level III newborn unit. She cares for premature babies from 26 weeks, and for newborns who need breathing support or treatment for jaundice and infection.\n\nIn the outpatient clinic she sees children up to 18 for vaccinations, growth and development checks, asthma and recurrent infections. Parents can message the clinic team with follow-up questions on WhatsApp.",
    education: ["MBBS, Lady Hardinge Medical College, New Delhi (2008)", "MD (Paediatrics), Kalawati Saran Children's Hospital, New Delhi (2011)", "Fellowship in neonatology, Indian Academy of Pediatrics (2013)"],
    awards: ["Member, National Neonatology Forum", "Member, Indian Academy of Pediatrics", "Lactation support trainer, 2022"],
    conditions: ["Premature birth", "Newborn jaundice", "Childhood asthma", "Growth delay", "Recurrent fever", "Vaccination"],
    patientReviews: [
      { name: "Neeraj and Kriti B.", rating: 5, date: "2026-07", text: "Our son was born at 31 weeks and spent 24 days in the NICU. We were allowed in at all hours and taught kangaroo care." },
      { name: "Pooja L.", rating: 5, date: "2026-02", text: "Patient with my daughter and never rushed us. The vaccination reminders are a help." }
    ]
  },
  "Dr. Lakshmi Menon": {
    bio: "Dr. Lakshmi Menon is a medical oncologist who treats breast, lung, ovarian and blood cancers with chemotherapy, targeted therapy and immunotherapy. She presents every new patient at the weekly tumour board, so the surgeon, radiation oncologist and pathologist agree on one plan.\n\nShe runs the day-care chemotherapy unit and a nurse-led symptom line that patients can call between cycles.",
    education: ["MBBS, Government Medical College, Thiruvananthapuram (2004)", "MD (Medicine), JIPMER, Puducherry (2008)", "DM (Medical Oncology), Tata Memorial Centre, Mumbai (2012)"],
    awards: ["Member, Indian Society of Medical and Paediatric Oncology", "Member, European Society for Medical Oncology", "Principal investigator, two multicentre breast cancer trials"],
    conditions: ["Breast cancer", "Lung cancer", "Ovarian cancer", "Lymphoma", "Leukaemia", "Myeloma"],
    patientReviews: [
      { name: "Geeta V.", rating: 5, date: "2026-06", text: "She explained each chemotherapy drug and what side effects to expect, and the symptom line answered at 11 PM." },
      { name: "Arvind P.", rating: 5, date: "2026-01", text: "The tumour board meant I did not have to run between three doctors. One plan, one coordinator." }
    ]
  },
  "Dr. Vikram Mehta": {
    bio: "Dr. Vikram Mehta is a physician in internal medicine with a special interest in diabetes, thyroid disease and high blood pressure. Many of his patients see him for years, and he coordinates their care with other specialists when needed.\n\nHe runs the evening diabetes clinic for working patients and the annual preventive check-up review, where he goes through every result with the patient.",
    education: ["MBBS, BJ Medical College, Ahmedabad (2003)", "MD (General Medicine), BJ Medical College, Ahmedabad (2006)", "Certificate course in diabetes, Public Health Foundation of India (2014)"],
    awards: ["Member, Research Society for the Study of Diabetes in India", "Member, Association of Physicians of India"],
    conditions: ["Type 2 diabetes", "High blood pressure", "Thyroid disorders", "Fever and infections", "High cholesterol", "Fatigue"],
    patientReviews: [
      { name: "Mahesh J.", rating: 5, date: "2026-09", text: "My HbA1c came down from 9.1 to 6.8 in six months without adding insulin. The evening clinic fits my office hours." },
      { name: "Renu C.", rating: 4, date: "2026-05", text: "Thorough and calm. Sometimes a wait in the evening, but he never rushes the consultation." }
    ]
  },
  "Dr. Farhan Siddiqui": {
    bio: "Dr. Farhan Siddiqui is a gastroenterologist and liver specialist. He performs diagnostic and therapeutic endoscopy, including ERCP for bile duct stones and endoscopic ultrasound.\n\nHe treats fatty liver disease, hepatitis B and C, inflammatory bowel disease and long-standing acidity, and he runs a liver clinic for patients waiting for or recovering from a liver transplant at partner centres.",
    education: ["MBBS, Jawaharlal Nehru Medical College, Aligarh (2006)", "MD (Medicine), King George's Medical University, Lucknow (2010)", "DM (Gastroenterology), SGPGI, Lucknow (2013)"],
    awards: ["Member, Indian Society of Gastroenterology", "Member, Indian National Association for Study of the Liver"],
    conditions: ["Fatty liver", "Hepatitis B and C", "Acid reflux", "Ulcerative colitis", "Crohn's disease", "Gallstones"],
    patientReviews: [
      { name: "Imran S.", rating: 5, date: "2026-08", text: "The ERCP was done the same day I was admitted with jaundice. Discharged in 48 hours." },
      { name: "Deepa N.", rating: 5, date: "2026-04", text: "He took the time to explain my fatty liver scan and gave me a realistic plan to reverse it." }
    ]
  },
  "Dr. Rajeev Malhotra": {
    bio: "Dr. Rajeev Malhotra is a cardiothoracic surgeon with 25 years in heart and lung surgery. He has performed more than 6,000 bypass operations, many of them on the beating heart, and he leads the valve repair programme.\n\nHe meets every surgical patient and family before the operation to go through the risks in plain terms, and again on the day of discharge.",
    education: ["MBBS, Government Medical College, Amritsar (1997)", "MS (General Surgery), PGIMER, Chandigarh (2001)", "MCh (Cardiothoracic and Vascular Surgery), AIIMS, New Delhi (2005)"],
    awards: ["Member, Indian Association of Cardiovascular-Thoracic Surgeons", "Visiting faculty, beating-heart surgery workshops, 2018–2025"],
    conditions: ["Multi-vessel coronary disease", "Valve disease", "Aortic aneurysm", "Congenital heart defects in adults", "Lung tumours"],
    patientReviews: [
      { name: "Surinder K.", rating: 5, date: "2026-07", text: "Bypass at 68 and I was walking the corridor on day three. He answered every question my sons had." },
      { name: "Lata B.", rating: 4, date: "2026-02", text: "A very experienced surgeon. The ICU nurses kept us informed every few hours." }
    ]
  },
  "Dr. Ishita Banerjee": {
    bio: "Dr. Ishita Banerjee is a neurosurgeon who operates on the brain and spine. Her work includes brain tumour removal with neuro-navigation, surgery for slipped discs and spinal stenosis, and emergency surgery after head injury.\n\nShe uses minimally invasive spine techniques where they suit the patient, which usually means a shorter stay and an earlier return to work.",
    education: ["MBBS, Medical College, Kolkata (2006)", "MS (General Surgery), IPGMER, Kolkata (2010)", "MCh (Neurosurgery), NIMHANS, Bengaluru (2014)"],
    awards: ["Member, Neurological Society of India", "Member, Neuro Spinal Surgeons Association of India"],
    conditions: ["Brain tumours", "Slipped disc", "Spinal stenosis", "Head injury", "Hydrocephalus", "Trigeminal neuralgia"],
    patientReviews: [
      { name: "Sourav M.", rating: 5, date: "2026-06", text: "Keyhole surgery for my slipped disc. The leg pain was gone when I woke up and I was back at my desk in three weeks." },
      { name: "Kamini S.", rating: 5, date: "2026-03", text: "She drew the tumour's position on paper for us. Honest about risks and very skilled." }
    ]
  },
  "Dr. Harpreet Gill": {
    bio: "Dr. Harpreet Gill treats spine problems and sports injuries. He sees runners, cricketers and weekend players with ligament tears, shoulder dislocations and back pain, and he performs arthroscopic (keyhole) surgery on the knee and shoulder.\n\nMost of his back-pain patients are treated without surgery, with a structured physiotherapy programme and, where needed, image-guided injections.",
    education: ["MBBS, Dayanand Medical College, Ludhiana (2008)", "MS (Orthopaedics), Government Medical College, Patiala (2012)", "FNB (Spine Surgery), Indian Spinal Injuries Centre, New Delhi (2015)"],
    awards: ["Member, Association of Spine Surgeons of India", "Team doctor, Haryana state athletics meet, 2023–2025"],
    conditions: ["Back pain", "Neck pain", "ACL tear", "Meniscus tear", "Shoulder dislocation", "Tennis elbow"],
    patientReviews: [
      { name: "Aman V.", rating: 5, date: "2026-08", text: "ACL reconstruction in May, back to football in November. He and the physio set clear targets for each month." },
      { name: "Ritika J.", rating: 5, date: "2026-05", text: "I came expecting spine surgery and left with an exercise plan that worked." }
    ]
  },
  "Dr. Arjun Sethi": {
    bio: "Dr. Arjun Sethi is a surgical oncologist who operates on cancers of the breast, head and neck, stomach, bowel and pancreas. He performs laparoscopic cancer surgery and breast-conserving surgery where it is safe to do so.\n\nHe works with the medical and radiation oncologists through the weekly tumour board, and he follows up his patients for at least five years after surgery.",
    education: ["MBBS, University College of Medical Sciences, Delhi (2007)", "MS (General Surgery), Lady Hardinge Medical College, New Delhi (2011)", "MCh (Surgical Oncology), Tata Memorial Centre, Mumbai (2015)"],
    awards: ["Member, Indian Association of Surgical Oncology", "Member, Association of Breast Surgeons of India"],
    conditions: ["Breast cancer", "Oral cancer", "Stomach cancer", "Colorectal cancer", "Thyroid cancer", "Pancreatic tumours"],
    patientReviews: [
      { name: "Nisha K.", rating: 5, date: "2026-07", text: "He saved my breast. The scar is small and the follow-up visits are always on time." },
      { name: "Vinod R.", rating: 5, date: "2026-01", text: "Laparoscopic bowel surgery for my father at 72. He was eating on day two." }
    ]
  },
  "Dr. Meera Nair": {
    bio: "Dr. Meera Nair is a nephrologist who looks after people with chronic kidney disease, kidney stones and kidney problems linked to diabetes and high blood pressure. She runs the 18-bed dialysis unit and the kidney transplant programme.\n\nShe focuses on slowing kidney disease early, and she prepares patients and donors for transplant with a single coordinator from first test to discharge.",
    education: ["MBBS, Government Medical College, Kozhikode (2009)", "MD (Medicine), Government Medical College, Kottayam (2013)", "DNB (Nephrology), Sir Ganga Ram Hospital, New Delhi (2016)"],
    awards: ["Member, Indian Society of Nephrology", "Member, Indian Society of Organ Transplantation"],
    conditions: ["Chronic kidney disease", "Kidney failure", "Diabetic kidney disease", "Kidney stones", "Nephrotic syndrome", "Kidney transplant care"],
    patientReviews: [
      { name: "Joseph T.", rating: 5, date: "2026-06", text: "My wife donated a kidney to me in April. Dr. Nair's coordinator handled every test and form." },
      { name: "Harish P.", rating: 4, date: "2026-02", text: "The dialysis unit runs on time and the staff remember your name." }
    ]
  },
  "Dr. Rohan Desai": {
    bio: "Dr. Rohan Desai is a chest physician who treats asthma, COPD, interstitial lung disease, tuberculosis and sleep apnoea. He runs the overnight sleep lab and the pulmonary rehabilitation programme for people recovering from lung illness.\n\nHe performs bronchoscopy, including EBUS for lymph node biopsy, and reads lung function tests with his patients so they understand their numbers.",
    education: ["MBBS, BJ Government Medical College, Pune (2010)", "MD (Pulmonary Medicine), Vallabhbhai Patel Chest Institute, Delhi (2014)", "Fellowship in interventional pulmonology (2016)"],
    awards: ["Member, Indian Chest Society", "Member, Indian Society for Sleep Research"],
    conditions: ["Asthma", "COPD", "Sleep apnoea", "Interstitial lung disease", "Tuberculosis", "Chronic cough"],
    patientReviews: [
      { name: "Prakash S.", rating: 5, date: "2026-08", text: "The sleep study found severe apnoea. With the CPAP machine I sleep through the night for the first time in years." },
      { name: "Anjali W.", rating: 5, date: "2026-04", text: "He changed my inhaler technique, not just the medicine. My asthma has been quiet since." }
    ]
  },
  "Dr. Sana Qureshi": {
    bio: "Dr. Sana Qureshi is an eye surgeon who performs cataract surgery with foldable lens implants and bladeless LASIK for glasses removal. She also manages glaucoma and dry eye.\n\nBefore any surgery she walks patients through their scans and the lens options, including the cost of each, so the choice is made without pressure.",
    education: ["MBBS, Government Medical College, Srinagar (2011)", "MS (Ophthalmology), Dr. RP Centre, AIIMS, New Delhi (2015)", "Fellow, International Council of Ophthalmology (FICO)"],
    awards: ["Member, All India Ophthalmological Society", "Member, Indian Intraocular Implant and Refractive Society"],
    conditions: ["Cataract", "Short or long sight", "Glaucoma", "Dry eye", "Diabetic eye disease", "Squint in adults"],
    patientReviews: [
      { name: "Kamla D.", rating: 5, date: "2026-09", text: "Cataract surgery on both eyes, a week apart. I read the newspaper without glasses now." },
      { name: "Rohit A.", rating: 5, date: "2026-03", text: "Bladeless LASIK, back at work in two days. She explained why I was a good candidate and my friend was not." }
    ]
  },
  "Dr. Aditya Verma": {
    bio: "Dr. Aditya Verma is a prosthodontist who places dental implants, makes crowns and bridges, and plans clear aligner treatment. He uses a 3D scanner instead of impression paste for most patients.\n\nHe gives a written treatment plan with the cost of each step before any work begins, and he sees children and adults for routine dental care as well.",
    education: ["BDS, Maulana Azad Institute of Dental Sciences, New Delhi (2012)", "MDS (Prosthodontics), King George's Medical University, Lucknow (2016)"],
    awards: ["Member, Indian Prosthodontic Society", "Certified provider, clear aligner systems"],
    conditions: ["Missing teeth", "Tooth decay", "Crooked teeth", "Worn or broken teeth", "Gum disease", "Tooth sensitivity"],
    patientReviews: [
      { name: "Siddharth N.", rating: 5, date: "2026-07", text: "Two implants and a clear written cost plan. No surprises at the billing counter." },
      { name: "Aarti M.", rating: 4, date: "2026-02", text: "Aligners took 14 months. Regular checks and very good results." }
    ]
  }
};

/* ---------- specialities (matched by name) ---------- */
const DEPARTMENTS = {
  Cardiology: {
    overview: "The heart centre brings cardiologists, cardiac surgeons, imaging specialists and cardiac rehabilitation into one department. Two cath labs and a 14-bed cardiac ICU are open around the clock, so a patient with a heart attack can have an angioplasty within 90 minutes of reaching us.\n\nFor planned care, we see patients with chest pain, breathlessness, palpitations, valve disease and heart failure. Most tests, including echocardiography, treadmill tests and CT coronary angiography, are done on the same day as the consultation.",
    conditions: ["Heart attack and chest pain", "Coronary artery disease", "Heart failure", "Valve disease (aortic stenosis, mitral regurgitation)", "Irregular heartbeat (atrial fibrillation)", "High blood pressure that is hard to control"],
    treatments: ["Coronary angiography and angioplasty with stents", "Bypass surgery (CABG), including beating-heart surgery", "TAVI (valve replacement through a leg artery)", "Pacemaker and ICD implantation", "Echocardiography, TMT and Holter monitoring", "Cardiac rehabilitation after a heart event"],
    costs: [{ item: "Coronary angiography", from: 18000, to: 35000 }, { item: "Angioplasty with one stent", from: 180000, to: 320000 }, { item: "Bypass surgery (CABG)", from: 280000, to: 480000 }, { item: "TAVI", from: 1800000, to: 2600000 }],
    faqs: [
      { q: "Do I need a referral to see a cardiologist?", a: "No. You can book directly online or through the helpdesk. Bring any previous ECGs, echo reports and your list of medicines." },
      { q: "How soon after an angioplasty can I go home?", a: "Most patients go home one to two days after a planned angioplasty done through the wrist, and can return to desk work within a week." },
      { q: "Is TAVI suitable for everyone with aortic stenosis?", a: "No. The heart team reviews your CT scan, age and other conditions together. For some patients open valve surgery is the better choice." }
    ]
  },
  Neurology: {
    overview: "The neurosciences centre treats conditions of the brain, spine and nerves. Neurologists, neurosurgeons, a neuro-radiologist and rehabilitation therapists work as one team, and a dedicated stroke unit is staffed 24 hours a day.\n\nWhen someone arrives with signs of stroke, our team is alerted before the ambulance reaches the door. A CT or MRI is done straight away and clot-dissolving treatment or clot removal begins as soon as it is safe.",
    conditions: ["Stroke and mini-stroke (TIA)", "Epilepsy and seizures", "Parkinson's disease and tremor", "Migraine and chronic headache", "Brain and spinal tumours", "Slipped disc and spinal stenosis"],
    treatments: ["Thrombolysis and mechanical thrombectomy for stroke", "Video EEG monitoring", "Botulinum toxin for spasticity and migraine", "Brain tumour surgery with neuro-navigation", "Minimally invasive spine surgery", "Neuro-rehabilitation (physio, speech and occupational therapy)"],
    costs: [{ item: "MRI brain", from: 6500, to: 9500 }, { item: "Video EEG (24 hours)", from: 12000, to: 18000 }, { item: "Stroke thrombolysis (stay included)", from: 75000, to: 160000 }, { item: "Microdiscectomy for slipped disc", from: 140000, to: 260000 }],
    faqs: [
      { q: "What are the warning signs of a stroke?", a: "Remember BE FAST: loss of Balance, Eye (vision) changes, Face drooping, Arm weakness, Speech difficulty, Time to call 1800-123-4567." },
      { q: "Will I need surgery for a slipped disc?", a: "Most people improve with medicines and physiotherapy within six to eight weeks. Surgery is advised when there is weakness, loss of bladder control or pain that does not settle." },
      { q: "Can I drive if I have epilepsy?", a: "Indian rules require you to be seizure-free for a period before driving. Your neurologist will advise you based on your seizure type and control." }
    ]
  },
  Orthopedics: {
    overview: "The bone and joint centre treats arthritis, fractures, sports injuries and spine problems for patients of all ages. Robotic-arm assisted knee and hip replacement lets the surgeon plan the implant position on a 3D model before the operation.\n\nRecovery is planned before surgery. Our physiotherapists meet you in the clinic, teach you the exercises in advance and start them on the day of the operation.",
    conditions: ["Knee and hip arthritis", "Fractures and trauma", "Ligament and meniscus tears", "Shoulder dislocation and frozen shoulder", "Back and neck pain", "Osteoporosis"],
    treatments: ["Robotic knee replacement", "Total hip replacement", "Arthroscopic ACL reconstruction", "Shoulder arthroscopy and repair", "Spine fixation and minimally invasive spine surgery", "Image-guided injections for joint and back pain"],
    costs: [{ item: "Knee replacement, one knee (robotic)", from: 240000, to: 360000 }, { item: "Total hip replacement", from: 260000, to: 420000 }, { item: "ACL reconstruction", from: 110000, to: 180000 }, { item: "Knee arthroscopy", from: 70000, to: 120000 }],
    faqs: [
      { q: "How long does a knee replacement last?", a: "Modern implants last 20 years or more in most patients. Keeping a healthy weight and staying active helps them last longer." },
      { q: "When can I walk after a knee replacement?", a: "Most patients stand and take a few steps with a walker on the day of surgery, and walk with a stick within two to three weeks." },
      { q: "Is robotic surgery done by a robot?", a: "No. The surgeon performs the operation. The robotic arm helps place the implant exactly where it was planned on your scan." }
    ]
  },
  Oncology: {
    overview: "The cancer centre offers medical, surgical and radiation oncology in one place. Every new patient's case is discussed at the weekly tumour board, where the surgeon, oncologist, radiation oncologist, radiologist and pathologist agree on one treatment plan.\n\nA nurse navigator is assigned to each patient to book tests, explain each step and stay in touch between visits. Day-care chemotherapy has 20 recliner chairs and a separate area for patients with low immunity.",
    conditions: ["Breast cancer", "Lung cancer", "Head and neck cancers", "Stomach, bowel and liver cancers", "Gynaecological cancers", "Lymphoma, leukaemia and myeloma"],
    treatments: ["Chemotherapy, targeted therapy and immunotherapy", "Breast-conserving and reconstructive surgery", "Laparoscopic cancer surgery", "IMRT and IGRT radiation therapy", "PET-CT based staging", "Palliative care and pain management"],
    costs: [{ item: "Chemotherapy, per day-care cycle", from: 15000, to: 80000 }, { item: "PET-CT scan", from: 18000, to: 26000 }, { item: "Radiation therapy course (IMRT)", from: 180000, to: 350000 }, { item: "Breast cancer surgery", from: 150000, to: 300000 }],
    faqs: [
      { q: "Can I get a second opinion on my cancer treatment plan?", a: "Yes. Bring your scans, biopsy slides and reports. Our tumour board reviews second-opinion cases every week and shares a written summary." },
      { q: "Will I lose my hair with chemotherapy?", a: "It depends on the drugs. Some cause hair loss, many do not. Your oncologist will tell you what to expect before the first cycle." },
      { q: "Is cancer treatment covered by insurance?", a: "Most health policies cover chemotherapy, radiation and surgery. Our TPA desk checks your cover and arranges cashless approval where possible." }
    ]
  },
  Gynecology: {
    overview: "The women's health centre covers pregnancy, childbirth, fertility and gynaecological surgery. The labour suite has six private birthing rooms, an operating theatre next door and a level III newborn unit on the same floor.\n\nWe look after high-risk pregnancies with a team that includes a fetal medicine specialist, and we offer painless delivery with an epidural for women who want it. The fertility clinic provides IUI, IVF and egg freezing in an on-site laboratory.",
    conditions: ["Normal and high-risk pregnancy", "Infertility", "PCOS and irregular periods", "Fibroids and ovarian cysts", "Endometriosis", "Menopause concerns"],
    treatments: ["Antenatal care and fetal medicine scans", "Painless (epidural) delivery", "Caesarean section", "IUI, IVF and egg freezing", "Laparoscopic hysterectomy and myomectomy", "Hysteroscopy"],
    costs: [{ item: "Normal delivery (2-day stay)", from: 45000, to: 80000 }, { item: "Caesarean delivery (3-day stay)", from: 85000, to: 140000 }, { item: "IVF, one cycle", from: 140000, to: 220000 }, { item: "Laparoscopic hysterectomy", from: 90000, to: 160000 }],
    faqs: [
      { q: "Can my partner stay with me during labour?", a: "Yes. One birth partner can stay with you through labour and delivery in our private birthing rooms." },
      { q: "Is an epidural safe for my baby?", a: "Yes. An epidural is given by an anaesthetist and the medicine reaching the baby is very small. You can discuss it at your 36-week visit." },
      { q: "When should we see a fertility specialist?", a: "After a year of trying if you are under 35, or after six months if you are 35 or older. See us sooner if periods are irregular or there is a known problem." }
    ]
  },
  Pediatrics: {
    overview: "The children's centre looks after babies, children and teenagers up to 18. It includes a paediatric outpatient clinic, a children's ward, a 6-bed paediatric ICU and a 16-bed level III newborn unit.\n\nParents can stay with their child at all times. The clinic follows the Indian Academy of Pediatrics vaccination schedule and sends reminders by SMS before each due date.",
    conditions: ["Premature and low birth weight babies", "Newborn jaundice and infections", "Fever, cough and stomach infections", "Childhood asthma and allergies", "Growth and developmental delay", "Childhood surgery (hernia, undescended testis)"],
    treatments: ["Level III NICU care", "Vaccinations as per IAP schedule", "Growth and development assessment", "Paediatric ICU care", "Day-care paediatric surgery", "Child nutrition and feeding clinic"],
    costs: [{ item: "NICU, per day", from: 8000, to: 18000 }, { item: "Paediatric ward, per day", from: 5000, to: 9000 }, { item: "Paediatric hernia surgery", from: 50000, to: 90000 }],
    faqs: [
      { q: "Can I stay with my child in the hospital?", a: "Yes. One parent can stay with the child at all times, including in the paediatric ICU." },
      { q: "Which vaccines does my baby need?", a: "We follow the Indian Academy of Pediatrics schedule. Your paediatrician will give you a printed card and SMS reminders before each dose." },
      { q: "When should I bring a child with fever to the emergency?", a: "Come in at once if a baby under three months has a fever, or if any child has trouble breathing, a fit, a rash that does not fade, or is very drowsy." }
    ]
  },
  Gastroenterology: {
    overview: "The digestive health centre treats conditions of the food pipe, stomach, intestines, liver, gall bladder and pancreas. The endoscopy suite performs gastroscopy, colonoscopy, ERCP and endoscopic ultrasound, with sedation so the procedure is comfortable.\n\nGastroenterologists and GI surgeons hold a joint clinic every week, so patients who may need an operation get both opinions in one visit.",
    conditions: ["Acidity and acid reflux", "Fatty liver and hepatitis", "Gallstones", "Ulcerative colitis and Crohn's disease", "Pancreatitis", "Blood in stool or vomit"],
    treatments: ["Upper GI endoscopy and colonoscopy", "ERCP for bile duct stones", "Endoscopic ultrasound (EUS)", "FibroScan for liver stiffness", "Laparoscopic gall bladder removal", "Treatment of hepatitis B and C"],
    costs: [{ item: "Upper GI endoscopy", from: 4500, to: 8000 }, { item: "Colonoscopy with sedation", from: 7500, to: 14000 }, { item: "ERCP", from: 45000, to: 85000 }, { item: "Laparoscopic gall bladder removal", from: 75000, to: 130000 }],
    faqs: [
      { q: "Will an endoscopy hurt?", a: "Most patients are given light sedation and remember little of the procedure. A throat spray numbs the throat. It usually takes 10 to 15 minutes." },
      { q: "How do I prepare for a colonoscopy?", a: "You will take a bowel-cleansing solution the evening before and eat only clear fluids that day. The nurse gives you a printed plan when you book." },
      { q: "Can fatty liver be reversed?", a: "In most people, yes. Losing 7 to 10 percent of body weight, being active and controlling sugar can reduce liver fat within months." }
    ]
  },
  Nephrology: {
    overview: "The kidney centre cares for people with kidney disease at every stage, from early protein in the urine to dialysis and transplant. The dialysis unit has 18 stations, including two for patients with hepatitis, and runs three shifts a day.\n\nThe transplant programme performs living-donor kidney transplants. A transplant coordinator guides the patient and donor through tests, legal approvals and recovery.",
    conditions: ["Chronic kidney disease", "Kidney damage from diabetes or high blood pressure", "Acute kidney injury", "Kidney stones", "Nephrotic syndrome", "Kidney failure needing dialysis"],
    treatments: ["Haemodialysis and peritoneal dialysis", "Living-donor kidney transplant", "AV fistula creation for dialysis", "Kidney biopsy", "Lithotripsy and laser for kidney stones (with urology)", "CKD clinic with diet counselling"],
    costs: [{ item: "Haemodialysis, per session", from: 2800, to: 4000 }, { item: "AV fistula surgery", from: 35000, to: 60000 }, { item: "Kidney biopsy", from: 18000, to: 30000 }, { item: "Kidney transplant (living donor)", from: 650000, to: 950000 }],
    faqs: [
      { q: "How often will I need dialysis?", a: "Most patients on haemodialysis need three sessions a week, each about four hours long. Your nephrologist will set the schedule based on your blood tests." },
      { q: "Who can donate a kidney?", a: "Under Indian law, a near relative (parent, sibling, child, spouse, grandparent) can donate after medical tests and approval from the authorisation committee." },
      { q: "Can kidney disease be slowed?", a: "Yes. Controlling blood pressure and sugar, avoiding painkillers like ibuprofen and following a kidney-friendly diet can slow it considerably." }
    ]
  },
  Pulmonology: {
    overview: "The chest and sleep centre diagnoses and treats conditions of the lungs and breathing. It has a lung function laboratory, a bronchoscopy suite with EBUS and a four-bed overnight sleep lab.\n\nPatients recovering from lung illness, including COPD flare-ups and pneumonia, can join an eight-week pulmonary rehabilitation programme of supervised exercise and breathing training.",
    conditions: ["Asthma", "COPD", "Sleep apnoea and snoring", "Interstitial lung disease", "Tuberculosis", "Chronic cough and lung nodules"],
    treatments: ["Pulmonary function tests (spirometry, DLCO)", "Overnight sleep study and CPAP titration", "Bronchoscopy and EBUS biopsy", "Thoracoscopy", "Allergy testing", "Pulmonary rehabilitation"],
    costs: [{ item: "Pulmonary function test", from: 1800, to: 3000 }, { item: "Overnight sleep study", from: 12000, to: 18000 }, { item: "Bronchoscopy", from: 12000, to: 25000 }],
    faqs: [
      { q: "I snore loudly. Do I need a sleep study?", a: "If you also feel sleepy in the day, wake up tired, or someone has noticed you stop breathing in sleep, a sleep study is worth doing." },
      { q: "Are inhalers addictive?", a: "No. Inhalers deliver a small dose straight to the lungs. They are the safest and most effective treatment for asthma and COPD." },
      { q: "Is TB treatment available here?", a: "Yes. We diagnose and treat TB, including drug-resistant TB, and coordinate with the national TB programme for free medicines where eligible." }
    ]
  },
  Ophthalmology: {
    overview: "The eye centre provides cataract surgery, glasses-free vision correction, retina care and glaucoma management. Most cataract and LASIK procedures are done as day care, so you go home the same day.\n\nA full eye check, including scans of the retina and optic nerve, is done in a single visit of about 90 minutes. Diabetic patients can have their yearly retina screening at the same time as their diabetes review.",
    conditions: ["Cataract", "Short sight, long sight and astigmatism", "Glaucoma", "Diabetic retinopathy", "Dry eye", "Retinal detachment"],
    treatments: ["Micro-incision cataract surgery with foldable lens", "Bladeless (femto) LASIK and SMILE", "Intravitreal injections for retina disease", "Laser for diabetic retinopathy", "Glaucoma laser and surgery", "Retina surgery (vitrectomy)"],
    costs: [{ item: "Cataract surgery, one eye (monofocal lens)", from: 28000, to: 55000 }, { item: "Bladeless LASIK, both eyes", from: 75000, to: 110000 }, { item: "Intravitreal injection, per eye", from: 9000, to: 35000 }, { item: "Glaucoma surgery", from: 40000, to: 70000 }],
    faqs: [
      { q: "When should cataract be operated?", a: "When blurred vision starts to affect daily tasks such as reading, driving at night or recognising faces. There is no need to wait for it to 'ripen'." },
      { q: "Am I suitable for LASIK?", a: "You need to be over 18, with stable glasses power for a year and a healthy cornea. A pre-LASIK scan tells us if it is safe for you." },
      { q: "How often should a diabetic get an eye check?", a: "At least once a year, even if vision is fine. Early retina changes have no symptoms and are easier to treat." }
    ]
  },
  Dental: {
    overview: "The dental centre offers general, cosmetic and surgical dentistry for adults and children. It has six dental chairs, digital X-rays with a fraction of the usual radiation and a 3D intraoral scanner.\n\nEvery patient gets a written treatment plan with the cost of each step before work begins. Implant and aligner patients see the same dentist at every visit.",
    conditions: ["Tooth decay and toothache", "Missing teeth", "Crooked or gapped teeth", "Gum disease and bleeding gums", "Broken or worn teeth", "Wisdom tooth pain"],
    treatments: ["Root canal treatment", "Dental implants", "Clear aligners and braces", "Crowns, bridges and veneers", "Wisdom tooth removal", "Scaling, polishing and gum treatment"],
    costs: [{ item: "Root canal treatment, one tooth", from: 4500, to: 9000 }, { item: "Dental implant with crown, one tooth", from: 28000, to: 45000 }, { item: "Clear aligners, full course", from: 110000, to: 240000 }, { item: "Scaling and polishing", from: 1200, to: 2500 }],
    faqs: [
      { q: "Is a root canal painful?", a: "It is done under local anaesthetic and feels much like a filling. Mild soreness for a day or two afterwards is common." },
      { q: "How long does a dental implant take?", a: "Usually three to four months in total: the implant is placed, allowed to fuse with the bone, and then the crown is fitted." },
      { q: "Are clear aligners as good as braces?", a: "For most mild to moderate crowding and spacing, yes. Your dentist will tell you after a 3D scan if braces would work better." }
    ]
  },
  "General Medicine": {
    overview: "The internal medicine department is often the first stop for adults who are unwell or are not sure which specialist to see. Our physicians diagnose and treat fever, infections, diabetes, blood pressure and thyroid problems, and coordinate care when more than one condition is involved.\n\nThe department also runs the preventive health check-up programme. A physician reviews every check-up report with the patient and refers on only when needed.",
    conditions: ["Fever, dengue, typhoid and malaria", "Type 2 diabetes", "High blood pressure", "Thyroid disorders", "High cholesterol", "Unexplained weight loss or fatigue"],
    treatments: ["Diagnosis and treatment of infections", "Diabetes care plans and insulin initiation", "Blood pressure and cholesterol management", "Preventive health check-ups", "Adult vaccination (flu, pneumonia, hepatitis B)", "Inpatient care for medical illness"],
    costs: [{ item: "Physician consultation", from: 800, to: 800 }, { item: "Fever work-up (blood tests)", from: 2500, to: 4500 }, { item: "Diabetes care plan, one year", from: 6500, to: 12000 }, { item: "Ward stay, per day", from: 6000, to: 12000 }],
    faqs: [
      { q: "When should fever be checked by a doctor?", a: "If it lasts more than three days, is above 103°F, or comes with a rash, severe headache, breathlessness or confusion." },
      { q: "How often should I check my HbA1c?", a: "Every three months until your sugar is well controlled, and every six months after that." },
      { q: "Do adults need vaccines?", a: "Yes. A yearly flu shot is advised for most adults, and pneumonia and hepatitis B vaccines for many. Ask your physician which suit you." }
    ]
  }
};

/* ---------- articles (matched by title) ---------- */
const ARTICLES = {
  "Seven early signs of a heart attack people ignore": {
    slug: "early-signs-of-a-heart-attack", date: "2026-09-22", authorDoctor: "Dr. Ananya Rao",
    summary: "Not every heart attack starts with crushing chest pain. These are the quieter warning signs our cardiologists see patients wait too long with.",
    body: "Many people picture a heart attack as sudden, crushing chest pain. In our emergency department we see a different picture just as often: a vague discomfort that comes and goes for hours or days before the patient decides to come in. By then, heart muscle may already be lost.\n\nHere are seven signs worth taking seriously.\n\n## 1. Pressure or tightness, not pain\n\nPatients often say it feels like a weight on the chest, or a tight band, rather than pain. It may last a few minutes, go away and come back.\n\n## 2. Discomfort in the jaw, neck, back or left arm\n\nThe heart shares nerve pathways with these areas. A dull ache in the jaw or between the shoulder blades, especially with exertion, can come from the heart.\n\n## 3. Breathlessness doing ordinary things\n\nIf climbing one flight of stairs suddenly leaves you short of breath, and that is new for you, get it checked.\n\n## 4. Indigestion that does not settle\n\nA burning feeling in the upper stomach that does not ease with an antacid, particularly in someone with diabetes, deserves an ECG.\n\n## 5. Unusual tiredness\n\nWomen in particular describe days of heavy fatigue before a heart attack. If you cannot explain it, mention it to your doctor.\n\n## 6. Cold sweat and light-headedness\n\nSweating without heat or effort, with nausea or dizziness, is a warning sign on its own.\n\n## 7. Symptoms that wake you at night\n\nChest discomfort or breathlessness that wakes you from sleep needs the same day review.\n\n## What to do\n\n- Call **1800-123-4567** or 108. Do not drive yourself.\n- Chew one 300 mg aspirin if you are not allergic and a doctor has not told you to avoid it.\n- Sit down and stay calm until help arrives.\n\nPeople with diabetes, high blood pressure, high cholesterol, a smoking habit or a family history of early heart disease should have a heart check every year, even without symptoms.\n\n> Every 30 minutes of delay costs heart muscle. If in doubt, come in. A normal ECG is a good outcome, not a wasted trip."
  },
  "Keeping blood sugar steady through the festive season": {
    slug: "blood-sugar-in-the-festive-season", date: "2026-10-02", authorDoctor: "Dr. Vikram Mehta",
    summary: "Sweets, late dinners and broken routines make October and November hard for people with diabetes. A few simple habits help.",
    body: "Between Navratri, Diwali and the wedding season, many of our patients with diabetes see their sugar climb. The reasons are familiar: sweets at every visit, late dinners, missed walks and forgotten tablets. You do not have to skip the celebrations. A little planning goes a long way.\n\n## Plan the sweets\n\n- Choose one sweet you really enjoy instead of tasting everything on the plate.\n- Have it after a meal, not on an empty stomach, so the sugar rise is smaller.\n- Sugar-free sweets are not free of calories. Many are made with khoya and ghee.\n\n## Keep meal times steady\n\nLate dinners push sugar up overnight. If you are out, eat a small, protein-rich snack such as roasted chana or paneer at your usual dinner time.\n\n## Do not stop your medicines\n\nNever skip insulin or tablets because you plan to eat less. If you take insulin or a sulphonylurea and are fasting, speak to your doctor about adjusting the dose to avoid low sugar.\n\n## Keep moving\n\nA 15-minute walk after the main meal lowers the sugar spike noticeably. Dancing at a garba counts.\n\n## Check more often\n\nCheck your fasting sugar and one reading two hours after the largest meal at least three times a week through the season.\n\n| Reading | Target for most adults |\n|---|---|\n| Fasting | 80–130 mg/dL |\n| 2 hours after a meal | Below 180 mg/dL |\n| HbA1c | Below 7% |\n\nCall your doctor if fasting sugar stays above 250 mg/dL, or if you feel shaky, sweaty or confused, which can be signs of low sugar.\n\nOur evening diabetes clinic runs Monday to Saturday from 5 PM to 8 PM."
  },
  "A trimester-by-trimester checklist for expecting parents": {
    slug: "pregnancy-checklist-by-trimester", date: "2026-08-14", authorDoctor: "Dr. Priya Sharma",
    summary: "The tests, scans and decisions in each stage of pregnancy, in one list you can keep on the fridge.",
    body: "Pregnancy brings a long list of tests, scans and decisions. This checklist puts them in order, so you know what is coming at each stage. Your doctor may add to it depending on your health.\n\n## First trimester (weeks 1 to 13)\n\n- Confirm the pregnancy with a scan between 6 and 8 weeks.\n- Start folic acid if you have not already.\n- Blood tests: blood group, haemoglobin, thyroid, sugar, HIV, hepatitis B, syphilis and rubella.\n- NT scan and double marker test between 11 and 13 weeks to screen for Down syndrome.\n- Tell your doctor about any regular medicines.\n\n## Second trimester (weeks 14 to 27)\n\n- Anomaly scan (level II) at 18 to 20 weeks to check the baby's organs.\n- Glucose tolerance test at 24 to 28 weeks for gestational diabetes.\n- Tetanus-diphtheria vaccine.\n- Start iron and calcium tablets.\n- Join an antenatal class. Ours run on Saturday mornings.\n\n## Third trimester (week 28 to birth)\n\n- Growth scan around 32 weeks.\n- Whooping cough (Tdap) vaccine between 27 and 36 weeks.\n- Count kicks daily from 28 weeks. Call us if movements reduce.\n- Discuss your birth plan, including pain relief options such as an epidural.\n- Pack the hospital bag by 36 weeks.\n- Complete pre-admission paperwork and insurance approval.\n\n## Come in straight away if you have\n\n- Bleeding or leaking fluid\n- Severe headache, blurred vision or swelling of the face\n- Reduced baby movements\n- Regular painful contractions before 37 weeks\n\nThe labour suite is open 24 hours. Call **1800-123-4567** and we will tell the team you are coming."
  },
  "Knee replacement: what recovery looks like week by week": {
    slug: "knee-replacement-recovery-week-by-week", date: "2026-07-30", authorDoctor: "Dr. Kavita Iyer",
    summary: "A realistic timeline for walking, stairs, driving and getting back to work after knee replacement surgery.",
    body: "Most people who have a knee replacement want to know two things: when will I walk, and when will the pain go? Recovery is different for everyone, but this is what a typical timeline looks like for our patients.\n\n## Day of surgery\n\nAfter the anaesthesia wears off, the physiotherapist will help you stand and take a few steps with a walker. Moving early reduces the risk of blood clots and stiffness.\n\n## Days 2 to 4\n\nYou will walk to the bathroom and along the corridor, and practise bending the knee. Most patients go home on day three or four.\n\n## Weeks 1 and 2\n\n- Walk several times a day with a walker or stick.\n- Do your exercises three times a day.\n- Use ice packs for swelling.\n- Stitches or clips are removed at about two weeks.\n\n## Weeks 3 to 6\n\nMost patients change from a walker to a stick, and start climbing stairs one step at a time. Aim to bend the knee to 90 degrees by week six.\n\n## Weeks 6 to 12\n\nYou can usually drive an automatic car after six weeks if it was your left knee, or when you can brake firmly. Office work is possible from about six weeks.\n\n## Three months and beyond\n\nSwelling and warmth can continue for three to six months. Most people are walking without a stick and doing daily activities without pain by three months. Full recovery can take up to a year.\n\n## When to call us\n\n- Increasing redness, discharge or fever\n- Calf pain or swelling\n- Sudden breathlessness\n\nYour physiotherapist will give you a written plan before you leave the hospital. Keep it, and bring it to every follow-up visit."
  }
};

/* ---------- custom pages ---------- */
const PAGES = [
  {
    title: "Careers", slug: "careers", showInNav: false, showInFooter: true, image: "assets/img/photo-ward-mint-1024.webp", imageAlt: "A hospital ward with mint-green walls",
    summary: "Nursing, medical, technical and support roles at CareNova Hospitals, Gurugram. See current openings and how to apply.",
    body: "We are a 350-bed hospital in Sector 44, Gurugram, with about 1,600 staff. We hire nurses, doctors, technicians, pharmacists and support teams, and we train our own people through a structured programme each year.\n\n## Why people stay\n\n- Fixed shift rosters published four weeks in advance\n- Paid study leave and sponsorship for nursing and technician certifications\n- Free health check-up every year for staff and their families\n- Subsidised meals and a staff transport service from Gurugram and Delhi metro stations\n- Day-care centre for children of staff\n\n## Current openings\n\n| Role | Department | Experience |\n|---|---|---|\n| Staff nurse (ICU) | Critical care | 2+ years, GNM or BSc Nursing |\n| Staff nurse (labour room) | Obstetrics | 1+ year |\n| Cath lab technician | Cardiology | 2+ years |\n| Dialysis technician | Nephrology | 1+ year, certified |\n| Pharmacist | Pharmacy | DPharm or BPharm |\n| Front office executive | Patient services | Freshers welcome |\n\n## How to apply\n\nEmail your CV to **careers@carenovahospitals.com** with the role in the subject line. Our HR team replies to every application within ten working days.\n\nWalk-in interviews for nursing roles are held every Saturday from 10 AM to 1 PM at the HR office, ground floor, Block B. Bring your registration certificate and a photo ID.\n\nCareNova does not charge any fee at any stage of recruitment. If someone asks you for money in our name, please report it to us."
  },
  {
    title: "International patients", slug: "international-patients", showInNav: false, showInFooter: true, image: "assets/img/photo-doctor-tablet-1024.webp", imageAlt: "A doctor reviewing results on a tablet",
    summary: "Help with medical visas, travel, interpreters, cost estimates and stay for patients travelling to CareNova Hospitals from abroad.",
    body: "Each year we treat patients from more than 30 countries, most often for heart surgery, joint replacement, cancer care and kidney transplant. Our international patient desk takes care of the arrangements, so you can focus on treatment.\n\n## Before you travel\n\n1. Send your reports and scans to **international@carenovahospitals.com**.\n2. Within 48 hours, a specialist reviews them and we send a treatment plan with a written cost estimate.\n3. We issue a visa invitation letter for the patient and up to two attendants.\n4. We help you book a guest house or serviced apartment near the hospital.\n\n## When you arrive\n\n- Free airport pick-up from Indira Gandhi International Airport (about 25 minutes away)\n- A named coordinator for your whole stay\n- Interpreters for Arabic, Russian, French, Swahili, Dari, Bengali and Burmese\n- Foreign currency exchange and a local SIM card at the desk\n- Halal, Jain and vegetarian meals on request\n\n## After you go home\n\nYour doctor stays in touch through video follow-ups, and we send a full discharge summary and all reports in English.\n\n## Payment\n\nWe accept international cards, wire transfer and approved international insurance. All cost estimates are given in writing before admission, and you will receive an itemised bill.\n\nThe desk is open every day from 8 AM to 10 PM India time. WhatsApp: **+91 98765 43210**."
  },
  {
    title: "Insurance and TPA", slug: "insurance-and-tpa", showInNav: false, showInFooter: true, image: "",
    summary: "Cashless treatment, reimbursement claims and the insurers and TPAs empanelled with CareNova Hospitals.",
    body: "CareNova Hospitals is empanelled with most major health insurers and third-party administrators (TPAs) in India, as well as CGHS and several corporate schemes. Our insurance desk on the ground floor helps you with approvals and paperwork.\n\n## Cashless treatment for planned admissions\n\n1. Bring your insurance card or policy number, a photo ID and the doctor's admission note to the insurance desk at least 48 hours before admission.\n2. We send the pre-authorisation request to your insurer or TPA.\n3. Most approvals come within 6 to 24 hours. We will call you with the result.\n4. At discharge, we send the final bill for approval. You pay only for items your policy does not cover, such as consumables or room upgrades.\n\n## Emergency admissions\n\nFor emergencies, treatment starts first. Inform the insurance desk within 24 hours and we will send the request on your behalf.\n\n## Reimbursement\n\nIf your insurer is not on our list, you pay the bill and claim it back. We give you the itemised bill, discharge summary, reports and prescriptions you need for the claim.\n\n## Empanelled insurers and TPAs (partial list)\n\n- Star Health and Allied Insurance\n- HDFC ERGO General Insurance\n- ICICI Lombard General Insurance\n- Niva Bupa Health Insurance\n- Care Health Insurance\n- Aditya Birla Health Insurance\n- New India Assurance, National Insurance, Oriental Insurance and United India Insurance\n- Medi Assist, Paramount, MDIndia, Health India and Vidal Health TPAs\n- CGHS, ECHS and selected PSU schemes\n\nThe list changes from time to time. Call the insurance desk on **+91 98765 43210** to confirm before admission.\n\n*Cover, waiting periods and room rent limits depend on your policy. Please read your policy documents or ask your insurer.*"
  },
  {
    title: "News", slug: "news", showInNav: false, showInFooter: true, image: "",
    summary: "Announcements, new services and community programmes from CareNova Hospitals.",
    body: "## Free heart screening camp for auto-rickshaw drivers\n\n*28 September 2026*\n\nOn World Heart Day, our cardiology team screened 412 auto-rickshaw and cab drivers at the Sector 44 and IFFCO Chowk stands. Each driver had a blood pressure check, a sugar test and an ECG. Sixty-three were referred for further tests at no charge.\n\n## New 18-station dialysis unit opens\n\n*4 August 2026*\n\nThe kidney centre has moved to a larger unit on the second floor with 18 dialysis stations, two isolation stations and a waiting area for families. The unit now runs three shifts a day, six days a week.\n\n## CareNova re-accredited by NABH\n\n*12 June 2026*\n\nAfter a three-day assessment, the National Accreditation Board for Hospitals and Healthcare Providers renewed our accreditation for another four years. The assessors noted our hand hygiene compliance and the speed of our stroke pathway.\n\n## Stroke awareness talks in schools\n\n*10 March 2026*\n\nOur neurology nurses visited 14 schools in Gurugram to teach students the BE FAST signs of stroke. Children are often the first to notice symptoms in grandparents at home.\n\nFor media enquiries, email **media@carenovahospitals.com**."
  },
  {
    title: "Locations", slug: "locations", showInNav: false, showInFooter: true, image: "assets/img/photo-emergency-room-1024.webp", imageAlt: "The emergency department entrance",
    summary: "CareNova's main hospital in Sector 44, Gurugram, and its clinics in Sohna Road and Dwarka Expressway, with addresses and timings.",
    body: "## CareNova Hospitals, Sector 44 (main hospital)\n\nPlot 21, Health City, NH-48, Sector 44, Gurugram, Haryana 122003\n\n- 350 beds, 24x7 emergency, all specialities\n- OPD: Monday to Saturday, 8 AM to 8 PM\n- Visiting hours: 11 AM to 1 PM and 5 PM to 7 PM\n- Nearest metro: HUDA City Centre (Millennium City Centre), 2.5 km\n- Parking: basement parking for 400 cars; free valet for senior citizens\n\n## CareNova Clinic, Sohna Road\n\nUnit 4, Ground floor, Vipul Trade Centre, Sohna Road, Sector 48, Gurugram 122018\n\n- Consultations in general medicine, paediatrics, gynaecology and orthopaedics\n- Blood collection, ECG, X-ray and ultrasound\n- Monday to Saturday, 8 AM to 9 PM; Sunday, 9 AM to 1 PM\n\n## CareNova Clinic, Dwarka Expressway\n\nShop 12–14, Elan Town Centre, Sector 106, Gurugram 122006\n\n- Consultations in general medicine, cardiology, dental and eye care\n- Health check-ups and blood collection\n- Monday to Saturday, 9 AM to 8 PM\n\n## Emergency\n\nOnly the Sector 44 hospital has an emergency department. In an emergency, call **1800-123-4567** for an ambulance. Our ambulances reach most of Gurugram in about 12 minutes.\n\nThe clinics share your records with the main hospital, so reports and prescriptions from any location appear in one place."
  },
  {
    title: "Contact us", slug: "contact", showInNav: false, showInFooter: false, image: "",
    summary: "Phone numbers, email addresses and desk timings for appointments, reports, billing, insurance and feedback at CareNova Hospitals.",
    body: "For a medical emergency, call **1800-123-4567** at any time.\n\n## Phone and email\n\n| Desk | Phone | Hours |\n|---|---|---|\n| Appointments and helpdesk | +91 98765 43210 | 8 AM – 10 PM, all days |\n| Emergency and ambulance | 1800-123-4567 | 24x7 |\n| Reports | +91 98765 43210 (option 3) | 8 AM – 8 PM |\n| Billing and insurance | +91 98765 43210 (option 4) | 9 AM – 7 PM, Mon–Sat |\n| International patients | +91 98765 43210 (option 5) | 8 AM – 10 PM, all days |\n\nGeneral email: **care@carenovahospitals.com**\n\n## Address\n\nCareNova Hospitals, Plot 21, Health City, NH-48, Sector 44, Gurugram, Haryana 122003\n\n## Feedback and complaints\n\nWe read every message. Write to **feedback@carenovahospitals.com**, or ask any nurse for a feedback form. If you are not satisfied with the response, you can write to our medical director at the same address. We reply to complaints within seven working days.\n\nYou can also [send us a message](/#contact) through the form on the home page."
  }
];

module.exports = { DOCTORS, DEPARTMENTS, ARTICLES, PAGES };
