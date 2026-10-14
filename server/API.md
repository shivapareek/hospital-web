# CareNova CMS – API contract

Base URL: same origin as the site. All JSON. Admin routes need the `cn_sess` cookie (httpOnly, SameSite=Strict) set by login.
Every admin request that changes data must send `Content-Type: application/json` (or multipart for uploads) **and** the header
`X-Requested-With: cms` (CSRF guard). Errors: HTTP 4xx/5xx with `{ "error": "Human readable message" }`.

Roles: `admin` (everything), `editor` (content, page text, sections, media, settings, live), `reception` (dashboard, submissions, live).
A route the role cannot use returns 403.

## Auth
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | /api/admin/login | `{email, password}` | `{user}` + cookie. 429 after 8 failed tries in 15 min. |
| POST | /api/admin/logout | – | `{ok:true}` |
| GET | /api/admin/me | – | `{user:{id,name,email,role}, mustChangePassword:boolean}` (401 if not logged in) |
| POST | /api/admin/password | `{current, next}` | `{ok:true}` (next ≥ 8 chars) |

## Dashboard
`GET /api/admin/stats` →
```json
{ "appointments": {"today":3,"upcoming":12,"new":5,"total":40},
  "enquiries": {"new":4,"total":19},
  "subscribers": 31,
  "byDay": [{"date":"2026-10-01","count":2}],          // last 14 days of appointments created
  "recentAppointments": [ /* 6 newest appointment items */ ],
  "recentEnquiries": [ /* 6 newest from messages/reports/packages, each has "type" */ ],
  "live": { /* same as /api/admin/live */ } }
```

## Schema (drives generic forms)
`GET /api/admin/schema` →
```json
{ "collections": {
    "doctors": { "label":"Doctors", "titleField":"name", "subtitleField":"dept", "imageField":"photo",
                 "fields":[ {"name":"name","label":"Name","type":"text","required":true,"help":"..."} ] } },
  "submissions": { "appointments": {"label":"Appointments","statuses":["new","confirmed","completed","cancelled","no-show"],
                                     "columns":[{"name":"createdAt","label":"Received","type":"datetime"}] } } }
```
Field `type` values: `text`, `textarea`, `number`, `boolean`, `select` (with `options:[{value,label}]` or `optionsFrom:"departments"` meaning use the `name` of each department), `tags` (array of strings, edited as chips/comma list), `list` (array of strings, one per line), `image` (a URL string; pick from media library or upload), `json` (raw JSON value, edit in a monospace textarea; validate before save), `color`.
Fields may have `group` (section heading inside the form) and `advanced:true` (show inside a collapsed "Advanced" block).
Hindi fields: `{"name":"bio_hi","label":"About (हिन्दी)","lang":"hi","hiOf":"bio", …}`. Every patient-facing text field has one (`<field>_hi`, same type; Markdown ones carry `markdown:true`). The admin shows them in a collapsed "हिन्दी (Hindi) translations" block. Empty means "show the English on Hindi pages".
Collections with Hindi fields: doctors (`role, photoAlt, lang, opd, bio, education, awards, conditions, patientReviews`), departments (`name, desc, caption, captionAlt, insetLabel, overview, conditions, treatments, costs` (a list of item names in the order of the English `costs`; amounts come from the English), `faqs`), packages (`name, items`), testimonials (`meta, text`), faqs (`q, a`), symptoms (`label`), chatRules (`k` (Hindi/Hinglish keywords), `a`), articles (`title, category, readTime, summary, body`), pages (`title, summary, imageAlt, body`).

Content collections: `doctors`, `departments`, `packages`, `testimonials`, `faqs`, `symptoms`, `chatRules`, `articles`.
Every item has `id` (string) and `hidden` (boolean, hides it on the site without deleting).

## Content CRUD
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | /api/admin/content/:col | – | `{items:[...]}` in display order |
| POST | /api/admin/content/:col | item (no id) | `{item}` |
| PUT | /api/admin/content/:col/:id | full item | `{item}` |
| DELETE | /api/admin/content/:col/:id | – | `{ok:true}` |
| POST | /api/admin/content/:col/reorder | `{ids:[...]}` | `{ok:true}` |

## Page text and images (every visible text block and image on the home page)
`GET /api/admin/texts` →
```json
{ "groups": [ { "id":"top", "label":"Hero", "fields": [
   {"key":"t:top:h1:0","type":"text","label":"H1 · Specialist care, without…","default":"Specialist care, without the wait.","value":null},
   {"key":"t:book:p:3","type":"html","label":"…","default":"Choose a doctor… <a href=\"tel:…\">…</a>","value":"…"},
   {"key":"i:top:img:0","type":"image","label":"Image · heart poster","default":{"src":"assets/…","alt":"…"},"value":null} ] } ] }
```
`value:null` means "using the default". `type:"html"` allows only inline tags (a, em, strong, b, i, span, br, small, abbr, sup).
`PUT /api/admin/texts` body `{values:{ "<key>": "new text" | {src,alt} | null }}` (null resets to default) → `{ok:true}`.

**Hindi**: add `?lang=hi` to both. The values are the Hindi overrides (`db.textsHi`), separate from the English. In the GET response each field also has
`english` (what the English page shows now), `englishEdited` (the English was changed in the admin), `shipped` (a built-in translation exists) and `stale`
(the built-in translation was made from English that no longer matches index.html); `default` is the built-in Hindi, or the English when there is none.
A Hindi image value with an empty `src` keeps following the English image (only the alt text is Hindi).
Resolution on `/hi/`: Hindi override → built-in translation (`server/i18n/hi-home.json`) → English (override or default).

## Sections
`GET /api/admin/sections` → `{items:[{id:"doctors",label:"Doctors",visible:true}]}` (page order)
`PUT /api/admin/sections` body `{items:[{id,visible}]}` → `{ok:true}`

## Settings
`GET /api/admin/settings` → `{values:{...}, schema:[{group:"Hospital",fields:[{name,label,type,help}]}]}` (same field types as above)
`PUT /api/admin/settings` body `{values:{...}}` → `{ok:true}`

## Live status (hero "Emergency wait right now" panel)
`GET /api/admin/live` → `{mode:"manual"|"demo", erWait:8, beds:42, icu:7, token:"A-114", updatedAt:"ISO"}`
`PUT /api/admin/live` same shape (partial ok) → saved object. Public read: `GET /api/live`.

## Submissions (data that comes in from the website)
Types: `appointments`, `messages`, `reports`, `packages`, `subscribers`, `dataRequests`.
| Method | Path | Notes |
|---|---|---|
| GET | /api/admin/submissions/:type?status=&q=&from=YYYY-MM-DD&to=YYYY-MM-DD | `{items:[...]}` newest first |
| POST | /api/admin/submissions/appointments | manual booking (same fields as public) |
| PATCH | /api/admin/submissions/:type/:id | `{status?, note?}` |
| DELETE | /api/admin/submissions/:type/:id | |
| GET | /api/admin/export/:type.csv | CSV download (same filters as list) |

Appointment item: `{id, token, createdAt, status, note, patient:{name, phone, age, gender}, reason, doctor, dept, date:"YYYY-MM-DD", slot:"10:30 AM", type:"In-clinic"|"Video", fee, source:"website"|"admin"}`
Message item: `{id, createdAt, status, note, name, phone, email, message}`
Report item: `{id, createdAt, status, note, uhid, phone}`
Package item: `{id, createdAt, status, note, package, name?, phone?}`
Subscriber item: `{id, createdAt, status, email}`
Data request item: `{id, createdAt, status, note, name, phone, email, requestType:"access"|"correction"|"deletion"|"withdraw-consent", details, dueBy:"YYYY-MM-DD"}`
Every public submission also has `consent:{given:true, at:"ISO", textVersion:"c-…"}` (the text of each version is kept in `db.consentVersions`).
Appointments may have `history:[{at, action:"rescheduled"|"cancelled"|"status", from, to, by:"patient"|<staff email>, reason?, tokenFrom?, tokenTo?}]`, `cancelReason`, `reminderSentAt`.
Records cleared by the retention job or by "find and delete" have `anonymisedAt` (name → "Removed", phone/email/message/reason/note blanked).
Statuses: appointments `new|confirmed|completed|cancelled|no-show`; data requests `new|verifying|completed|rejected`; others `new|in-progress|done|spam`.

## Media library
`GET /api/admin/media` → `{items:[{name,url,size,type,width?,height?,uploadedAt}]}`
`POST /api/admin/media` multipart, field `file` (jpg, png, webp, gif, avif, pdf; ≤ 8 MB) → `{item}`
`DELETE /api/admin/media/:name` → `{ok:true}`

## Users
`GET /api/admin/users` → `{items:[{id,name,email,role,createdAt,lastLogin}]}` (admin only)
`POST /api/admin/users` `{name,email,password,role}` · `PUT /api/admin/users/:id` `{name?,role?,password?}` · `DELETE /api/admin/users/:id` (cannot delete yourself or the last admin)

## Activity log
`GET /api/admin/audit?limit=200` → `{items:[{at,user,action,target}]}`

## Languages (public site)
English at the existing paths, Hindi under `/hi/`: `/hi/` (and `/hi/index.html`; `/hi` redirects), `/hi/doctors`, `/hi/doctors/:slug`, `/hi/specialities`, `/hi/specialities/:slug`, `/hi/library`, `/hi/library/:slug`, `/hi/<custom page slug>`, `/hi/privacy-policy`, `/hi/terms`, `/hi/patient-rights`, `/hi/data-request`, `/hi/manage-booking`; other `/hi/…` paths get the Hindi 404. `/hi/assets/*` serves the same files as `/assets/*` (page scripts build some image paths relative to the page).
Every page carries `<html lang>`, `<link rel="alternate" hreflang="en|hi|x-default">` and a header link to the same page in the other language (`[data-lang-switch]`). `sitemap.xml` lists both languages with `xhtml:link` alternates.
Hindi pages get `window.CMS.lang = "hi"`, `window.CMS.home = "/hi/"` and `window.I18N` (the browser strings, `server/i18n/hi-ui.json`).

**Messages in the page's language**: the public POST endpoints below take an optional `lang: "hi"` in the body (or the header `X-Lang: hi`; without either, a `Referer` under `/hi/` counts as Hindi). Validation errors, booking look-up/cancel/reschedule errors and lock reasons then come back in Hindi, and the booking view has Hindi `dateLabel` and `dept`. Stored data stays the same in both languages (English speciality, package and gender values; cancellation reasons in English); an appointment booked from a Hindi page is marked `lang:"hi"` and its consent `textVersion` is the version of the Hindi consent text. Notification templates are sent in English (a Hindi booking's manage link points to `/hi/manage-booking`).

## Public endpoints (used by the website)
- `GET /api/live`
- `GET /api/slots?doctor=<name>&date=YYYY-MM-DD` → `{taken:["10:30 AM", ...]}`
- `POST /api/submit/appointment` · `/api/submit/message` · `/api/submit/report` · `/api/submit/package` · `/api/submit/subscribe` · `/api/submit/datarequest` → `{ok:true, token?}` or 400 `{error}`; 429 when rate-limited.
  Every body must include `consent: true` (400 otherwise). Appointment returns `{ok, token, manage:"/manage-booking?token=…", notify:boolean, channel, reminderHours}`.
  Data request body: `{name, phone, email?, requestType, details?, consent:true}`.
- `GET /api/privacy/config` → `{consentText, consentVersion, privacyUrl, notify:{on, channel, reminderHours}}` (the home page also gets this as `window.CMS_PRIVACY`). `?lang=hi`: the Hindi consent text and its version, `privacyUrl:"/hi/privacy-policy"`.
- `GET /js/data.js` is generated from the database (same `const DEPARTMENTS = …` globals as the static file). `GET /js/data.js?lang=hi` (also `/hi/js/data.js`): the Hindi values (`_hi` fields, English where empty). Department and package `name` stay English (identity); their display name is `label` (also present, equal to `name`, in the English file). Chat rules get the Hindi and the English keywords.

## Privacy and legal pages (HTML, server-rendered with the site header and footer)
`GET /privacy-policy`, `/terms`, `/patient-rights`, `/data-request` (Markdown from Settings → Privacy and legal, sanitised), `GET /manage-booking` (noindex). The same under `/hi/…` from the Hindi settings (`legalPrivacyHi` …; English when empty).

## Manage booking (public, patient self-service)
All take `{token, phone}`; rate-limited (30 calls / 15 min per IP, and 429 after 8 failed look-ups). A wrong token or phone always returns the same 404 `{error}`.
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | /api/booking/lookup | `{token, phone}` | `{booking}` |
| POST | /api/booking/cancel | `{token, phone, reason}` | `{booking}` (status → cancelled, slot freed) |
| POST | /api/booking/reschedule | `{token, phone, date:"YYYY-MM-DD", slot:"10:30 AM"}` | `{booking}`; 409 if the slot was just taken |

`booking` = `{token, patient (first name), doctor, dept, date, dateLabel, slot, type, status, fee, canChange, lockReason, history:[{at, action, from, to}], rules:{closedDays, slots:[…], today, nowMinutes, days:14, leadMinutes:30}, notify}`.
Rules: no change to a cancelled/completed/no-show booking or within 2 hours of it; the new date must be within 14 days, not a closed day, a listed slot, at least 30 minutes ahead and free (perSlot). Times are India time (+05:30).
If the token is already used on the new date a new token is issued (`history[].tokenTo`). Each change is added to the appointment history, the activity log and the outbox.

## Notifications (outbox; demo unless SMS_WEBHOOK_URL is set)
Outbox item: `{id, at, channel:"sms"|"whatsapp"|"email", to, template:"confirm"|"reminder"|"cancel"|"reschedule", text, status:"queued"|"sent"|"failed"|"logged", related:{type,id,token}, attempts, sentAt?, error?}` (stored in `db.notifications`).
Sender: if env `SMS_WEBHOOK_URL` is set, each message is POSTed as JSON `{to, text, channel}` (timeout `SMS_WEBHOOK_TIMEOUT_MS`, default 8000) → `sent`/`failed`; otherwise it is marked `logged`.
A scheduler runs every minute and queues one reminder per appointment when it is within `reminderHours`.
| Method | Path | Notes (roles: admin, reception) |
|---|---|---|
| GET | /api/admin/notifications?status=&channel=&template=&q=&limit= | `{items, total, webhook:boolean, notifyOn:boolean}` newest first |
| POST | /api/admin/notifications/:id/resend | `{item}` |
| POST | /api/admin/notifications/run-reminders | `{count}` reminders queued now |

## Personal data tools
| Method | Path | Notes |
|---|---|---|
| GET | /api/admin/privacy/search?phone=&email= | admin only. `{items:[{type, id, label, summary, createdAt, anonymised}]}` across all submissions and the outbox |
| POST | /api/admin/privacy/erase | admin only. `{phone, email, mode:"anonymise"|"delete", items:[{type,id}], requestId?}` → `{count, mode}`. Only records matching the phone/email can be erased; subscribers are always deleted. With `requestId` the data request is marked completed. Writes an activity-log entry (masked phone/email). |
| POST | /api/admin/privacy/retention/run | admin only. Runs the retention job now → `{total, counts}` |
| GET | /api/admin/privacy/status | admin, reception. `{retentionLastRun, retention, openRequests, consentVersion, consentVersions}` |

Retention job: runs on start and daily; anonymises appointments older than `retentionAppointments` days, messages/reports/check-up requests older than `retentionEnquiries`, deletes subscribers older than `retentionSubscribers` (0 = keep), anonymises outbox messages older than `retentionAppointments`; logs "Retention job anonymised old records" (user `system`).

Hindi settings (Settings → "Privacy and legal: हिन्दी (Hindi)", "Search engines and sharing", "Announcement bar"): `consentTextHi, dpoNameHi, legalUpdatedHi, legalPrivacyHi, legalTermsHi, legalPatientRightsHi, legalDataRequestHi, seoTitleHi, seoDescriptionHi, announcementTextHi` (defaults: demo Hindi from `server/i18n/hi-legal.js`; empty = English).
`GET /api/admin/privacy/status` also returns `consentVersionHi`; `db.consentVersions[v].lang` is `"hi"` for Hindi consent texts.

New settings (Settings → Privacy and legal / Patient messages): `dpoName, dpoEmail, dpoPhone, retentionAppointments (365), retentionEnquiries (180), retentionSubscribers (0), consentText, legalUpdated, legalPrivacy, legalTerms, legalPatientRights, legalDataRequest` (Markdown; placeholders {hospital} {dpoName} {dpoEmail} {dpoPhone} {helpdesk} {email} {retention…}), `notifyOn (true), notifyChannel ("sms"), reminderHours (24), siteUrl, tplConfirm, tplReminder, tplCancel, tplReschedule` (placeholders {name} {token} {doctor} {date} {time} {link}). Settings fields may carry `max` (max length saved).

## Migrations
`db.migrations` records each one-time migration with the time it ran. `pages-v1` (server/pages.js): pages collection and English demo profile/speciality/article text. `i18n-hi-v1` (server/i18n/migrate.js): adds `db.textsHi` and fills empty `<field>_hi` content fields with the Hindi demo translations, only where the English field still equals the demo text the translation was made from (admin edits are never overwritten and never get a stale translation).
