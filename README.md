# Metra Coach Cleaning QC: Inspection Log (self-hosted)

The same Inspection Log as the claude.ai version (grading, Before/After stage, corrective actions, Live Stats, Full Dashboard, beacon, SharePoint exports), running on **GitHub Pages + Firebase**.

| File | What it is |
|---|---|
| `index.html` | The Inspection Log page |
| `full-dashboard.html`, `component.js` | The Full Dashboard tab |
| `firebase-config.js` | **The only file you edit.** Paste your Firebase settings here |
| `firebase-shim.js` | Connects the page to Firebase (sign-in, database, photos, downloads) |
| `firestore.rules`, `storage.rules` | Security rules you paste into the Firebase console |

---

## One-time setup (about 15 minutes)

### 1. Create the Firebase project
1. Go to **console.firebase.google.com** and click **Add project**. Name it something like `metra-qc`. Google Analytics is not needed.
2. **Build > Firestore Database > Create database.** Choose **production mode** and the `us-central` location.
3. **Build > Authentication > Get started > Email/Password > Enable.**
4. **Optional, for photos:** **Build > Storage > Get started.** Storage now requires the Blaze (pay-as-you-go) plan, which has a free tier that covers this use. If you skip Storage, photos are still saved, just compressed and stored in the database instead.

### 2. Paste your settings
1. **Project settings (gear icon) > General > Your apps > Web (`</>`)**. Register an app named `inspection-log`. Hosting is not needed.
2. Copy the values from the `firebaseConfig` block into `firebase-config.js`, replacing each `PASTE_...` placeholder.

### 3. Lock it down
1. **Firestore Database > Rules:** replace everything with the contents of `firestore.rules`, then **Publish**.
2. **Storage > Rules** (if you enabled Storage): paste `storage.rules`, then **Publish**.
3. **Authentication > Settings > Authorized domains > Add domain:** add `YOUR-GITHUB-USERNAME.github.io`.

Under these rules, only signed-in users can see or add data. Inspections can't be edited or deleted from the app, which keeps the audit trail clean.

### 4. Create user accounts
**Authentication > Users > Add user.** Add an email and temporary password for yourself and for each inspector, including your QA staff and Alma's inspectors. There is no public sign-up.

### 5. Publish on GitHub Pages
1. In your repo, go to **Add file > Upload files**, drag in **all files from this folder**, then **Commit**. This replaces the old versions.
2. **Settings > Pages > Source: Deploy from a branch > `main` / root > Save.**
3. Your site is at `https://YOUR-GITHUB-USERNAME.github.io/REPO-NAME/` within a minute or two.

---

## Updating later
Upload the changed files to the repo the same way. Users get the new version on their next reload. `firebase-config.js` never needs to change again.

## Good to know
- **Weak signal:** if a phone has no connection when an inspection is submitted, it's saved on the device and syncs automatically when signal returns. The status line keeps saying "Transmitting…" until it syncs, so leave the page open.
- **Beacon:** goes green once you're signed in and connected. Amber or red means check your signal or sign in again.
- **Data on claude.ai does not move automatically.** Use **Export for SharePoint** there first if you need to keep anything logged in that version.
- **Capacity:** Firestore's free tier covers about 50,000 reads and 20,000 writes per day. That's far more than one district team uses.
- **SharePoint:** the Log tab's **Export for SharePoint** file feeds the Power Automate import, the same as in the claude.ai version.
