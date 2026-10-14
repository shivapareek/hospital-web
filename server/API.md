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
Types: `appointments`, `messages`, `reports`, `packages`, `subscribers`.
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
Statuses: appointments `new|confirmed|completed|cancelled|no-show`; others `new|in-progress|done|spam`.

## Media library
`GET /api/admin/media` → `{items:[{name,url,size,type,width?,height?,uploadedAt}]}`
`POST /api/admin/media` multipart, field `file` (jpg, png, webp, gif, avif, pdf; ≤ 8 MB) → `{item}`
`DELETE /api/admin/media/:name` → `{ok:true}`

## Users
`GET /api/admin/users` → `{items:[{id,name,email,role,createdAt,lastLogin}]}` (admin only)
`POST /api/admin/users` `{name,email,password,role}` · `PUT /api/admin/users/:id` `{name?,role?,password?}` · `DELETE /api/admin/users/:id` (cannot delete yourself or the last admin)

## Activity log
`GET /api/admin/audit?limit=200` → `{items:[{at,user,action,target}]}`

## Public endpoints (used by the website)
- `GET /api/live`
- `GET /api/slots?doctor=<name>&date=YYYY-MM-DD` → `{taken:["10:30 AM", ...]}`
- `POST /api/submit/appointment` · `/api/submit/message` · `/api/submit/report` · `/api/submit/package` · `/api/submit/subscribe` → `{ok:true, token?}` or 400 `{error}`; 429 when rate-limited.
- `GET /js/data.js` is generated from the database (same `const DEPARTMENTS = …` globals as the static file).
