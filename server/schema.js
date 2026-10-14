/* Field schemas: drive the admin forms and server-side cleaning. */
const { LEGAL_DEFAULTS, NOTIFY_DEFAULTS } = require("./legal-defaults");
const { LEGAL_DEFAULTS_HI } = require("./i18n/hi-legal");

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
      { name: "video", label: "Offers video consultation", type: "boolean", group: "Availability" },
      // profile page (/doctors/<slug>); serverOnly fields are left out of js/data.js
      { name: "slug", label: "Web address", type: "text", group: "Profile page", help: "The page is /doctors/<this>. Leave empty to make one from the name." },
      { name: "bio", label: "About", type: "textarea", rows: 8, group: "Profile page", serverOnly: true, help: "Markdown: blank line between paragraphs, **bold**, - lists, [links](/doctors)." },
      { name: "education", label: "Education and training", type: "list", group: "Profile page", serverOnly: true },
      { name: "awards", label: "Awards and memberships", type: "list", group: "Profile page", serverOnly: true },
      { name: "conditions", label: "Conditions treated", type: "tags", group: "Profile page", serverOnly: true },
      { name: "patientReviews", label: "Patient reviews", type: "json", group: "Profile page", serverOnly: true, help: "[{\"name\":\"Rakesh G.\",\"rating\":5,\"date\":\"2026-08\",\"text\":\"…\"}]. Publish real, consented reviews only." }
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
      { name: "inset", label: "Inset scan", type: "json", advanced: true },
      // speciality page (/specialities/<slug>)
      { name: "slug", label: "Web address", type: "text", group: "Speciality page", help: "The page is /specialities/<this>. Leave empty to make one from the name." },
      { name: "overview", label: "Overview", type: "textarea", rows: 8, group: "Speciality page", serverOnly: true, help: "Markdown: blank line between paragraphs, **bold**, - lists, [links](/doctors)." },
      { name: "conditions", label: "Conditions treated", type: "list", group: "Speciality page", serverOnly: true },
      { name: "treatments", label: "Treatments and procedures", type: "list", group: "Speciality page", serverOnly: true },
      { name: "costs", label: "Indicative costs (₹)", type: "json", group: "Speciality page", serverOnly: true, help: "[{\"item\":\"Angioplasty\",\"from\":180000,\"to\":320000}]. Shown as indicative ranges." },
      { name: "faqs", label: "Questions and answers", type: "json", group: "Speciality page", serverOnly: true, help: "[{\"q\":\"Question?\",\"a\":\"Answer.\"}]" }
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
      { name: "url", label: "External link", type: "text", help: "Only for articles hosted elsewhere. Leave empty to use the article page on this site." },
      { name: "slug", label: "Web address", type: "text", group: "Article page", help: "The page is /library/<this>. Leave empty to make one from the title." },
      { name: "date", label: "Published on", type: "text", group: "Article page", help: "YYYY-MM-DD" },
      { name: "authorDoctor", label: "Author's profile", type: "select", optionsFrom: "doctors", group: "Article page", help: "Links the byline to the doctor's page" },
      { name: "summary", label: "Summary", type: "textarea", rows: 3, group: "Article page", help: "One or two sentences. Used for search engines and link previews." },
      { name: "body", label: "Article", type: "textarea", rows: 18, group: "Article page", help: "Markdown: ## headings, blank line between paragraphs, **bold**, - lists, | tables |, > quotes." }
    ]
  },
  pages: {
    label: "Pages", titleField: "title", subtitleField: "slug", imageField: "image",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Web address", type: "text", help: "The page is /<this>, e.g. careers. Leave empty to make one from the title." },
      { name: "summary", label: "Summary and search description", type: "textarea", rows: 3, help: "Shown under the title, in search results and in link previews." },
      { name: "image", label: "Top image", type: "image", help: "Optional. A wide photo, at least 1600 px across." },
      { name: "imageAlt", label: "Top image description (alt text)", type: "text" },
      { name: "body", label: "Page text", type: "textarea", rows: 20, help: "Markdown: ## headings, blank line between paragraphs, **bold**, - lists, | tables |, [links](/doctors). HTML is not allowed." },
      { name: "showInNav", label: "Show in the top menu", type: "boolean", group: "Where it appears" },
      { name: "showInFooter", label: "Show in the footer", type: "boolean", group: "Where it appears" }
    ]
  }
};

/* ---------- Hindi (हिन्दी) versions of the user-facing text fields ----------
   Each becomes "<field>_hi" in a collapsed "हिन्दी (Hindi)" block of the admin form (lang:"hi").
   Empty means "show the English on Hindi pages". Names, slugs, numbers, photos and degrees are shared. */
const HI_GROUP = "हिन्दी (Hindi)";
const HI_FIELDS = {
  doctors: [["role", "Role"], ["photoAlt", "Photo description (alt text)"], ["lang", "Languages", { help: "e.g. अंग्रेज़ी, हिन्दी, तेलुगु" }],
    ["opd", "OPD days and hours", { help: "Keep the format: सोम–शनि · 10 AM – 2 PM" }],
    ["bio", "About", { type: "textarea", rows: 8, serverOnly: true, markdown: true, help: "Markdown, like the English." }],
    ["education", "Education and training", { type: "list", serverOnly: true, help: "Degrees and institutions can stay in English." }],
    ["awards", "Awards and memberships", { type: "list", serverOnly: true }],
    ["conditions", "Conditions treated", { type: "tags", serverOnly: true }],
    ["patientReviews", "Patient reviews", { type: "json", serverOnly: true, help: "Same shape as the English list: [{\"name\":\"Rakesh G.\",\"rating\":5,\"date\":\"2026-08\",\"text\":\"…\"}]. Translations of real, consented reviews only." }]],
  departments: [["name", "Name", { help: "Shown on Hindi pages. Doctors and symptoms still refer to the English name." }], ["desc", "Short description", { type: "textarea" }],
    ["caption", "Cabinet caption", { type: "textarea" }], ["captionAlt", "Second model caption (e.g. Spine)", { type: "textarea" }],
    ["insetLabel", "Inset scan label"],
    ["overview", "Overview", { type: "textarea", rows: 8, serverOnly: true, markdown: true, help: "Markdown, like the English." }],
    ["conditions", "Conditions treated", { type: "list", serverOnly: true }], ["treatments", "Treatments and procedures", { type: "list", serverOnly: true }],
    ["costs", "Indicative costs: item names", { type: "list", serverOnly: true, help: "One per line, in the same order as the English costs. Amounts come from the English list." }],
    ["faqs", "Questions and answers", { type: "json", serverOnly: true, help: "[{\"q\":\"सवाल?\",\"a\":\"जवाब।\"}]" }]],
  packages: [["name", "Name", { help: "Shown on Hindi pages; requests still use the English name." }], ["items", "What's included", { type: "list" }]],
  testimonials: [["meta", "Treatment · City"], ["text", "Story", { type: "textarea" }]],
  faqs: [["q", "Question"], ["a", "Answer", { type: "textarea" }]],
  symptoms: [["label", "Symptom"]],
  chatRules: [["k", "Keywords", { type: "tags", help: "Hindi and Hinglish words, e.g. अपॉइंटमेंट, doctor se milna, बीमा. On Hindi pages these and the English keywords both work." }],
    ["a", "Reply", { type: "textarea", help: "Plain text; <b> and <a href=\"#section\"> links are allowed" }]],
  articles: [["title", "Title"], ["category", "Category"], ["readTime", "Reading time", { help: "e.g. 5 मिनट" }],
    ["summary", "Summary", { type: "textarea", rows: 3 }], ["body", "Article", { type: "textarea", rows: 18, markdown: true, help: "Markdown, like the English." }]],
  pages: [["title", "Title"], ["summary", "Summary and search description", { type: "textarea", rows: 3 }], ["imageAlt", "Top image description (alt text)"],
    ["body", "Page text", { type: "textarea", rows: 20, markdown: true, help: "Markdown, like the English." }]]
};
for (const [col, list] of Object.entries(HI_FIELDS)) {
  for (const [name, label, extra = {}] of list) {
    COLLECTIONS[col].fields.push({ name: name + "_hi", label: `${label} (हिन्दी)`, type: "text", group: HI_GROUP, lang: "hi", hiOf: name, ...extra });
  }
}

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
  },
  dataRequests: {
    label: "Data requests", statuses: ["new", "verifying", "completed", "rejected"],
    columns: [{ name: "name", label: "Name", type: "text" }, { name: "phone", label: "Mobile", type: "text" }, { name: "email", label: "Email", type: "text" }, { name: "requestType", label: "Request", type: "text" }, { name: "status", label: "Status", type: "status" }, { name: "createdAt", label: "Received", type: "datetime" }]
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
    { name: "seoTitleHi", label: "Page title (हिन्दी)", type: "text", help: "Home page at /hi/. Empty = the built-in Hindi title." },
    { name: "seoDescriptionHi", label: "Description (हिन्दी)", type: "textarea" },
    { name: "ogImage", label: "Share image", type: "image" }
  ] },
  { group: "Brand", fields: [
    { name: "accent", label: "Accent colour", type: "color", help: "Buttons, links and highlights in light mode" }
  ] },
  { group: "Announcement bar", fields: [
    { name: "announcementOn", label: "Show announcement", type: "boolean" },
    { name: "announcementText", label: "Text", type: "text" },
    { name: "announcementTextHi", label: "Text (हिन्दी)", type: "text", help: "Shown on Hindi pages. Empty = the English text." },
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
  ] },
  { group: "Privacy and legal", fields: [
    { name: "dpoName", label: "Grievance officer / data protection officer", type: "text", help: "Name and title, shown on the legal pages" },
    { name: "dpoEmail", label: "Grievance officer email", type: "text" },
    { name: "dpoPhone", label: "Grievance officer phone", type: "text" },
    { name: "retentionAppointments", label: "Keep appointment requests for (days)", type: "number", help: "Older website appointments are anonymised by a daily job. 0 = keep" },
    { name: "retentionEnquiries", label: "Keep messages, report and check-up requests for (days)", type: "number", help: "0 = keep" },
    { name: "retentionSubscribers", label: "Keep newsletter subscribers for (days)", type: "number", help: "0 = until they unsubscribe or ask to be removed" },
    { name: "consentText", label: "Consent text on forms", type: "textarea", rows: 3, max: 600, help: "Shown next to the tick box on every form. A link to the privacy policy is added after it. Changing it starts a new consent version." },
    { name: "legalUpdated", label: "Legal pages last updated", type: "text", help: "e.g. 14 October 2026" },
    { name: "legalPrivacy", label: "Privacy policy (Markdown)", type: "textarea", rows: 16, max: 40000, help: "Markdown: ## heading, **bold**, - list, [link](/page), | tables |. Placeholders: {hospital} {dpoName} {dpoEmail} {dpoPhone} {helpdesk} {email} {retentionAppointments} {retentionEnquiries} {retentionSubscribers}" },
    { name: "legalTerms", label: "Terms of use (Markdown)", type: "textarea", rows: 12, max: 40000 },
    { name: "legalPatientRights", label: "Patient rights (Markdown)", type: "textarea", rows: 12, max: 40000 },
    { name: "legalDataRequest", label: "Data request page intro (Markdown)", type: "textarea", rows: 6, max: 10000 }
  ] },
  { group: "Privacy and legal: हिन्दी (Hindi)", fields: [
    { name: "consentTextHi", label: "Consent text on forms (हिन्दी)", type: "textarea", rows: 3, max: 600, help: "Shown on Hindi pages. Changing it starts a new consent version, like the English." },
    { name: "dpoNameHi", label: "Grievance officer (हिन्दी)", type: "text", help: "Empty = the English name and title." },
    { name: "legalUpdatedHi", label: "Legal pages last updated (हिन्दी)", type: "text", help: "e.g. 14 अक्टूबर 2026" },
    { name: "legalPrivacyHi", label: "Privacy policy (हिन्दी, Markdown)", type: "textarea", rows: 16, max: 40000, help: "Same placeholders as the English. Empty = the English policy is shown on the Hindi page." },
    { name: "legalTermsHi", label: "Terms of use (हिन्दी, Markdown)", type: "textarea", rows: 12, max: 40000 },
    { name: "legalPatientRightsHi", label: "Patient rights (हिन्दी, Markdown)", type: "textarea", rows: 12, max: 40000 },
    { name: "legalDataRequestHi", label: "Data request page intro (हिन्दी, Markdown)", type: "textarea", rows: 6, max: 10000 }
  ] },
  { group: "Patient messages (SMS / WhatsApp)", fields: [
    { name: "notifyOn", label: "Send booking messages and reminders", type: "boolean", help: "Demo: messages go to the outbox (Admin → Notifications). Set SMS_WEBHOOK_URL on the server to deliver them. The templates are sent in English, also for bookings made on the Hindi site." },
    { name: "notifyChannel", label: "Channel", type: "select", options: [{ value: "sms", label: "SMS" }, { value: "whatsapp", label: "WhatsApp" }] },
    { name: "reminderHours", label: "Send the reminder this many hours before the visit", type: "number" },
    { name: "siteUrl", label: "Public website address", type: "text", help: "Used for the manage-booking link, e.g. https://www.carenovahospitals.com. Empty = the address the site was opened at." },
    { name: "tplConfirm", label: "Booking confirmed", type: "textarea", rows: 3, max: 600, help: "Placeholders: {name} {token} {doctor} {date} {time} {link}" },
    { name: "tplReminder", label: "Reminder", type: "textarea", rows: 3, max: 600 },
    { name: "tplCancel", label: "Cancelled", type: "textarea", rows: 3, max: 600 },
    { name: "tplReschedule", label: "Rescheduled", type: "textarea", rows: 3, max: 600 }
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
  facebook: "", instagram: "", youtube: "", linkedin: "", x: "",
  seoTitleHi: "", seoDescriptionHi: "", announcementTextHi: "",
  ...LEGAL_DEFAULTS, ...NOTIFY_DEFAULTS, ...LEGAL_DEFAULTS_HI
};

module.exports = { COLLECTIONS, SUBMISSIONS, SETTINGS, DEFAULT_SETTINGS };
