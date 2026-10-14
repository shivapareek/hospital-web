/* Default copy for the privacy and legal pages, consent text and patient messages.
   DEMO TEXT for a fictional hospital. It is oriented to India's Digital Personal Data Protection Act, 2023,
   but it has not been reviewed by a lawyer. Every value can be edited in Admin → Settings → Privacy and legal.
   Placeholders filled in when the page is shown:
   {hospital} {helpdesk} {email} {dpoName} {dpoEmail} {dpoPhone} {retentionAppointments} {retentionEnquiries} {retentionSubscribers} */

const legalPrivacy = `This policy explains what personal data {hospital} ("we", "us") collects through this website, why we collect it, how long we keep it and the choices you have. It is written with India's Digital Personal Data Protection Act, 2023 (the "DPDP Act") in mind. We are the **Data Fiduciary** for the data described here.

## What we collect

| When you… | We collect |
|---|---|
| Book an appointment | Patient name, mobile number, age, gender, the doctor, date and time you chose and, if you add it, the reason for your visit |
| Send us a message | Name, mobile number, email address and your message |
| Ask for your reports | Your UHID (hospital ID) and registered mobile number |
| Ask about a health check-up | Name, mobile number and the package you chose |
| Subscribe to health tips | Your email address |
| Make a data request | Name, mobile number, email address and the details of your request |

We also keep a short technical log (time, page and IP address) to protect the site from abuse. We do **not** use advertising trackers on this website.

Clinical records created when you are treated at the hospital are covered by the hospital's medical-records policy and the rules for medical records in India, not only by this website policy.

## Why we use it

- To book, confirm, change, remind you about and run your appointment.
- To answer your message or call you back about a health check-up.
- To send your reports to the right person after we check your UHID and mobile number.
- To send the newsletter you asked for (only if you subscribed).
- To meet our legal duties, for example keeping records for regulators or answering a lawful request from an authority.

We rely on your **consent** for these purposes, which you give by ticking the box on each form. For a few purposes the DPDP Act allows us to process data without consent (for example a medical emergency, or to comply with a law); we only do so where the Act allows it.

## Messages we send

When you book, we may send an SMS or WhatsApp message to the mobile number you gave with your token, a link to manage the booking and a reminder before your visit. We do not send marketing messages to that number.

## Who we share it with

- Doctors and staff at {hospital} who need it to care for you.
- Service providers who work for us under contract (for example our hosting company and SMS provider). They may only use the data to provide their service to us.
- Authorities, where the law requires it.

We do not sell your personal data.

## How long we keep it

| Data | Kept for |
|---|---|
| Website appointment requests | {retentionAppointments} after the request, then anonymised |
| Messages, report and check-up requests | {retentionEnquiries} after the request, then anonymised |
| Newsletter subscriptions | {retentionSubscribers} |

Anonymised records keep only non-identifying details (such as the date and doctor) so that we can count visits. Medical records created during treatment are kept for the periods required by law.

## Your rights

Under the DPDP Act you can:

- **Access**: ask for a summary of the personal data we hold about you and how we use it.
- **Correction and completion**: ask us to correct or complete inaccurate data.
- **Erasure**: ask us to delete data we no longer need, unless a law requires us to keep it.
- **Withdraw consent** at any time. This does not affect anything we did before you withdrew it, but we may no longer be able to provide the related service.
- **Grievance redressal**: complain to our Grievance Officer and, if you are not satisfied, to the Data Protection Board of India.
- **Nominate** someone to exercise these rights for you in case of death or incapacity.

Use the [data request form](/data-request) or contact our Grievance Officer. We will check your identity before acting and reply within 30 days.

## Children

If the patient is under 18, a parent or lawful guardian must book and give consent on their behalf.

## Security

Access to submissions is limited to authorised staff with individual accounts, every change is logged, and data is sent over an encrypted connection.

## Grievance Officer

**{dpoName}**
Email: [{dpoEmail}](mailto:{dpoEmail}) · Phone: {dpoPhone}
{hospital}, Plot 21, Health City, NH-48, Sector 44, Gurugram, Haryana 122003

## Changes to this policy

We will post any change on this page and update the date at the top. If a change affects how we use data you have already given us, we will ask for your consent again.`;

const legalTerms = `These terms apply when you use the {hospital} website. By using the site you agree to them.

## Information on this site

Health articles, the symptom finder, the health tools and the chat assistant give general information only. They are **not medical advice** and do not replace a consultation with a doctor. In an emergency, call our emergency number or 108 straight away.

## Online appointments

- An online booking reserves a time with the doctor you chose. Please arrive 15 minutes early with a photo ID and any previous reports.
- Consultation fees shown on the site are indicative and are paid at the hospital unless we tell you otherwise.
- You can cancel or change a booking on the [Manage booking](/manage-booking) page up to 2 hours before your time. After that, please call {helpdesk}.
- We may need to move an appointment if a doctor is called to an emergency. We will contact you if this happens.
- Please give accurate details. Bookings made with false details may be cancelled.

## Video consultations

Video consultations follow the Telemedicine Practice Guidelines issued in India. The doctor may ask you to visit in person if a video call is not suitable for your condition.

## Your account and messages

We send booking messages to the mobile number you give us. Keep your token private: anyone with your token and mobile number can change the booking.

## Acceptable use

Do not misuse the site, try to access data that is not yours, send automated requests or upload harmful content.

## Liability

We work to keep the site accurate and available but cannot promise it will always be error-free or online. To the extent the law allows, we are not liable for losses caused by using the site's general information. Nothing in these terms limits liability that cannot be limited by law.

## Law and disputes

These terms are governed by the laws of India. Courts in Gurugram, Haryana have jurisdiction.

## Contact

Email [{email}](mailto:{email}) or call {helpdesk}.`;

const legalPatientRights = `Every patient at {hospital} has rights, and some responsibilities. This charter follows the Charter of Patients' Rights published by the National Human Rights Commission and the Ministry of Health and Family Welfare.

## Your rights

1. **Information.** To know your diagnosis, the treatment proposed, its risks and benefits, and the expected cost, in a language you understand.
2. **Records and reports.** To get copies of your case papers, investigation reports and discharge summary.
3. **Emergency care.** To receive emergency medical care without first being asked to pay.
4. **Informed consent.** To be asked for consent before any major test, treatment or procedure.
5. **Confidentiality, privacy and dignity.** To have your privacy respected during examination, and your information kept confidential.
6. **Second opinion.** To seek a second opinion from a doctor of your choice.
7. **Transparent prices.** To see the rates for services and to get an itemised bill.
8. **Non-discrimination.** To be treated without discrimination on the basis of illness, HIV status, religion, caste, gender, age, sexual orientation, language or place of origin.
9. **Safety and quality.** To be cared for in line with accepted standards and protocols.
10. **Choice of pharmacy and lab.** To buy medicines or get tests done at any registered pharmacy or laboratory.
11. **Referral and transfer.** To be told why you are being referred or transferred, and to have it arranged safely.
12. **Protection in research.** To be protected if you take part in clinical research, and to refuse without affecting your care.
13. **Discharge.** Not to be detained in the hospital over a billing dispute.
14. **Education.** To be told how to look after your health and your condition.
15. **Be heard.** To give feedback and make a complaint, and to have it looked into fairly.

## Your responsibilities

- Give complete and correct information about your health and medicines.
- Follow the treatment plan you agreed to, or tell your doctor if you want to stop.
- Respect staff and other patients, and follow hospital rules.
- Pay the bills for services you received.

## Complaints

Speak to the nurse in charge or the patient care desk first. If the matter is not settled, write to the Patient Relations team at [{email}](mailto:{email}) or call {helpdesk}. For complaints about personal data, contact our Grievance Officer, {dpoName}, at [{dpoEmail}](mailto:{dpoEmail}).`;

const legalDataRequest = `Use this form to exercise your rights under the Digital Personal Data Protection Act, 2023: see the data we hold about you, correct it, ask us to erase it or withdraw your consent.

We will confirm your identity by calling the mobile number you give (we may also ask for your UHID). We reply within **30 days**. Some records, such as clinical records, must be kept by law even after an erasure request; if so, we will tell you which ones and why.

You can also write to our Grievance Officer, {dpoName}, at [{dpoEmail}](mailto:{dpoEmail}) or call {dpoPhone}.`;

const LEGAL_DEFAULTS = {
  dpoName: "Ms. Kavita Menon, Grievance Officer",
  dpoEmail: "privacy@carenovahospitals.com",
  dpoPhone: "+91 98765 43211",
  retentionAppointments: 365,
  retentionEnquiries: 180,
  retentionSubscribers: 0,
  consentText: "I agree that CareNova Hospitals may use these details to handle this request, as set out in the privacy policy.",
  legalUpdated: "14 October 2026",
  legalPrivacy, legalTerms, legalPatientRights, legalDataRequest
};

const NOTIFY_DEFAULTS = {
  notifyOn: true,
  notifyChannel: "sms",
  reminderHours: 24,
  siteUrl: "",
  tplConfirm: "CareNova: Hi {name}, your visit with {doctor} is booked for {date} at {time}. Token {token}. Change or cancel: {link}",
  tplReminder: "CareNova reminder: {name}, you see {doctor} on {date} at {time}. Token {token}. Please arrive 15 min early. Manage: {link}",
  tplCancel: "CareNova: your visit with {doctor} on {date} at {time} (token {token}) is cancelled. To book again: {link}",
  tplReschedule: "CareNova: your visit with {doctor} is now on {date} at {time}. Token {token}. Manage: {link}"
};

module.exports = { LEGAL_DEFAULTS, NOTIFY_DEFAULTS };
