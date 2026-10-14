/* Field schemas: drive the admin forms and server-side cleaning. */

const ICONS = ["i-heart-pulse", "i-brain", "i-bone", "i-ribbon", "i-baby", "i-users", "i-pill", "i-drop", "i-lungs", "i-eye", "i-tooth", "i-steth", "i-flask", "i-home", "i-plane", "i-file", "i-video"]
  .map((v) => ({ value: v, label: v.replace("i-", "").replace("-", " ") }));
const SPECIMENS = ["heart", "brain", "knee", "spine", "uterus", "liver", "kidney", "lungs", "eye", "tooth"]
  .map((v) => ({ value: v, label: v }));

const COLLECTIONS = {
  doctors: {
    label: "Doctors", constName: "DOCTORS", titleField: "name", subtitleField: "dept", imageField: "photo",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, help: "Include the title, e.g. Dr. Ananya Rao" },
      { name: "dept", label: "Speciality", type: "select", optionsFrom: "departments", required: true },
      { name: "role", label: "Role", type: "text", required: true, help: "e.g. Senior consultant & head of department" },
      { name: "deg", label: "Degrees", type: "text" },
      { name: "photo", label: "Photo", type: "image", help: "Portrait, 4:5. Leave empty to show initials." },
      { name: "photoAlt", label: "Photo description (alt text)", type: "text" },
      { name: "exp", label: "Years of experience", type: "number", group: "Details" },
      { name: "rating", label: "Rating (out of 5)", type: "number", group: "Details" },
      { name: "reviews", label: "Number of reviews", type: "number", group: "Details" },
      { name: "fee", label: "Consultation fee (₹)", type: "number", group: "Details" },
      { name: "lang", label: "Languages", type: "text", group: "Details", help: "e.g. English, Hindi, Telugu" },
      { name: "opd", label: "OPD days and hours", type: "text", group: "Availability", help: "Format: Mon–Sat · 10 AM – 2 PM" },
      { name: "room", label: "Room number", type: "text", group: "Availability" },
      { name: "today", label: "Available today", type: "boolean", group: "Availability" },
      { name: "video", label: "Offers video consultation", type: "boolean", group: "Availability" }
    ]
  },
  departments: {
    label: "Specialities", constName: "DEPARTMENTS", titleField: "name", subtitleField: "desc",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, help: "Doctors and symptoms refer to this name. Renaming updates them." },
      { name: "desc", label: "Short description", type: "textarea", required: true },
      { name: "icon", label: "Icon", type: "select", options: ICONS },
      { name: "caption", label: "Cabinet caption", type: "textarea", group: "Specimen cabinet" },
      { name: "specimen", label: "3D model", type: "select", options: [{ value: "", label: "None" }, ...SPECIMENS], group: "Specimen cabinet" },
      { name: "credit", label: "Credit line", type: "text", group: "Specimen cabinet" },
      { name: "still", label: "Still image base path", type: "text", group: "Specimen cabinet", advanced: true },
      { name: "creditId", label: "Credits page anchor", type: "text", advanced: true },
      { name: "view", label: "View type", type: "text", advanced: true },
      { name: "stillText", label: "Typographic tile text", type: "text", advanced: true },
      { name: "image", label: "Photo instead of model", type: "image", advanced: true },
      { name: "inset", label: "Inset scan", type: "json", advanced: true }
    ]
  },
  packages: {
    label: "Health check-ups", constName: "PACKAGES", titleField: "name", subtitleField: "price",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "price", label: "Price (₹)", type: "number", required: true },
      { name: "mrp", label: "MRP before discount (₹)", type: "number" },
      { name: "tests", label: "Number of tests", type: "number" },
      { name: "tag", label: "Shown under tabs", type: "tags", help: "Use: all, women, men, senior, heart" },
      { name: "popular", label: "Highlight as most chosen", type: "boolean" },
      { name: "items", label: "What's included", type: "list", help: "One item per line" },
      { name: "covers", label: "Organ icons", type: "tags", advanced: true }
    ]
  },
  testimonials: {
    label: "Patient stories", constName: "TESTIMONIALS", titleField: "name", subtitleField: "meta",
    fields: [
      { name: "name", label: "Patient name", type: "text", required: true },
      { name: "meta", label: "Treatment · City", type: "text" },
      { name: "text", label: "Story", type: "textarea", required: true }
    ]
  },
  faqs: {
    label: "FAQs", constName: "FAQS", titleField: "q", subtitleField: "a",
    fields: [
      { name: "q", label: "Question", type: "text", required: true },
      { name: "a", label: "Answer", type: "textarea", required: true }
    ]
  },
  symptoms: {
    label: "Symptom finder", constName: "SYMPTOMS", titleField: "label", subtitleField: "dept",
    fields: [
      { name: "label", label: "Symptom", type: "text", required: true },
      { name: "dept", label: "Suggest speciality", type: "select", optionsFrom: "departments", required: true },
      { name: "urgent", label: "Show the 'call emergency' warning", type: "boolean" }
    ]
  },
  chatRules: {
    label: "Chat assistant replies", constName: "CHAT_RULES", titleField: "k", subtitleField: "a",
    fields: [
      { name: "k", label: "Keywords", type: "tags", required: true, help: "The reply is used when a message contains any of these words" },
      { name: "a", label: "Reply", type: "textarea", required: true, help: "Plain text; <b> and <a href=\"#section\"> links are allowed" }
    ]
  },
  articles: {
    label: "Health library", titleField: "title", subtitleField: "category", imageField: "image",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "category", label: "Category", type: "text" },
      { name: "author", label: "Author", type: "text" },
      { name: "readTime", label: "Reading time", type: "text", help: "e.g. 5 min" },
      { name: "image", label: "Thumbnail", type: "image" },
      { name: "round", label: "Round thumbnail", type: "boolean" },
      { name: "url", label: "Link", type: "text", help: "Full article URL, or leave empty" }
    ]
  }
};

const SUBMISSIONS = {
  appointments: {
    label: "Appointments", statuses: ["new", "confirmed", "completed", "cancelled", "no-show"],
    columns: [
      { name: "token", label: "Token", type: "text" }, { name: "patient.name", label: "Patient", type: "text" },
      { name: "patient.phone", label: "Mobile", type: "text" }, { name: "doctor", label: "Doctor", type: "text" },
      { name: "date", label: "Date", type: "date" }, { name: "slot", label: "Time", type: "text" },
      { name: "type", label: "Visit", type: "text" }, { name: "status", label: "Status", type: "status" },
      { name: "createdAt", label: "Received", type: "datetime" }
    ]
  },
  messages: {
    label: "Messages", statuses: ["new", "in-progress", "done", "spam"],
    columns: [{ name: "name", label: "Name", type: "text" }, { name: "phone", label: "Mobile", type: "text" }, { name: "email", label: "Email", type: "text" }, { name: "message", label: "Message", type: "text" }, { name: "status", label: "Status", type: "status" }, { name: "createdAt", label: "Received", type: "datetime" }]
  },
  reports: {
    label: "Report requests", statuses: ["new", "in-progress", "done", "spam"],
    columns: [{ name: "uhid", label: "UHID", type: "text" }, { name: "phone", label: "Mobile", type: "text" }, { name: "status", label: "Status", type: "status" }, { name: "createdAt", label: "Received", type: "datetime" }]
  },
  packages: {
    label: "Check-up requests", statuses: ["new", "in-progress", "done", "spam"],
    columns: [{ name: "package", label: "Package", type: "text" }, { name: "name", label: "Name", type: "text" }, { name: "phone", label: "Mobile", type: "text" }, { name: "status", label: "Status", type: "status" }, { name: "createdAt", label: "Received", type: "datetime" }]
  },
  subscribers: {
    label: "Subscribers", statuses: ["new", "in-progress", "done", "spam"],
    columns: [{ name: "email", label: "Email", type: "text" }, { name: "createdAt", label: "Subscribed", type: "datetime" }]
  }
};

const SETTINGS = [
  { group: "Hospital", fields: [
    { name: "name", label: "Hospital name", type: "text", help: "Replaces 'CareNova Hospitals' everywhere" },
    { name: "shortName", label: "Short name / logo text", type: "text", help: "Replaces 'CareNova' everywhere" },
    { name: "logo", label: "Logo image (optional)", type: "image", help: "Shown instead of the green cross mark" }
  ] },
  { group: "Contact", fields: [
    { name: "helpdesk", label: "Helpdesk phone", type: "text" },
    { name: "emergency", label: "Emergency number", type: "text" },
    { name: "whatsapp", label: "WhatsApp number", type: "text" },
    { name: "email", label: "Email", type: "text" },
    { name: "mapQuery", label: "Google Maps search text", type: "text", help: "e.g. Sector 44 Gurugram Haryana" }
  ] },
  { group: "Search engines and sharing", fields: [
    { name: "seoTitle", label: "Page title", type: "text" },
    { name: "seoDescription", label: "Description", type: "textarea" },
    { name: "ogImage", label: "Share image", type: "image" }
  ] },
  { group: "Brand", fields: [
    { name: "accent", label: "Accent colour", type: "color", help: "Buttons, links and highlights in light mode" }
  ] },
  { group: "Announcement bar", fields: [
    { name: "announcementOn", label: "Show announcement", type: "boolean" },
    { name: "announcementText", label: "Text", type: "text" },
    { name: "announcementLink", label: "Link (optional)", type: "text" }
  ] },
  { group: "Online booking", fields: [
    { name: "bookingOn", label: "Accept online bookings", type: "boolean" },
    { name: "closedDays", label: "OPD closed on", type: "tags", help: "Day names, e.g. Sunday" },
    { name: "slotStart", label: "First slot", type: "text", help: "24h, e.g. 09:00" },
    { name: "slotEnd", label: "Last slot", type: "text", help: "24h, e.g. 19:30" },
    { name: "slotMinutes", label: "Slot length (minutes)", type: "number" },
    { name: "breakStart", label: "Break from", type: "text", help: "24h, e.g. 13:00" },
    { name: "breakEnd", label: "Break until", type: "text", help: "24h, e.g. 14:00" },
    { name: "perSlot", label: "Patients per doctor per slot", type: "number" }
  ] },
  { group: "Social links", fields: [
    { name: "facebook", label: "Facebook", type: "text" }, { name: "instagram", label: "Instagram", type: "text" },
    { name: "youtube", label: "YouTube", type: "text" }, { name: "linkedin", label: "LinkedIn", type: "text" }, { name: "x", label: "X (Twitter)", type: "text" }
  ] }
];

const DEFAULT_SETTINGS = {
  name: "CareNova Hospitals", shortName: "CareNova", logo: "",
  helpdesk: "+91 98765 43210", emergency: "1800-123-4567", whatsapp: "+91 98765 43210", email: "care@carenovahospitals.com",
  mapQuery: "Sector 44 Gurugram Haryana",
  seoTitle: "", seoDescription: "", ogImage: "",
  accent: "#0F5C4D",
  announcementOn: false, announcementText: "", announcementLink: "",
  bookingOn: true, closedDays: ["Sunday"], slotStart: "09:00", slotEnd: "19:30", slotMinutes: 30, breakStart: "13:00", breakEnd: "14:00", perSlot: 1,
  facebook: "", instagram: "", youtube: "", linkedin: "", x: ""
};

module.exports = { COLLECTIONS, SUBMISSIONS, SETTINGS, DEFAULT_SETTINGS };
