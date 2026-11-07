# 5-minute demo (all data synthetic; password for every demo account: `Demo@12345`)
Accounts: `patient1..5@demo.medibridge.dev`, `doctor1..4@…`, `hospital@…`, `admin@…`, `reviewer@…`

1. **Patient** (`patient1`) → Dashboard shows sample reports. Open *Reports* → the "poor scan" CBC: `1O.5` and the missing WBC unit are flagged *Check value*, never auto-fixed.
2. *Timeline* → HGB: neutral wording "Value changed from … to …", every point labelled Unverified.
3. *Navigator* → type "heart palpitation" → cards with reasons, "Not confirmed" fees, budget toggle only reorders suitable doctors. Now type "বুকে তীব্র ব্যথা, শ্বাসকষ্ট" → emergency banner replaces everything.
4. *Directory* → open a doctor → provenance, stale warning, unverified badge. Request an appointment with "share my reports" ticked.
5. **Doctor** (`doctor1`) → confirm the request → open the chart (only possible because consent exists) → verify a value, AI summary (with "AI draft" banner), draft + sign a note (locks it).
6. **Patient** → *Consent & Sharing*: see the doctor's views in the access log → Revoke → the doctor's next open of the chart is denied (and logged).
7. **Admin** (`admin`) → Verification queue: approving needs a reason **and** evidence; Audit logs → export CSV.
