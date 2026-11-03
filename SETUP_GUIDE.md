# Test Quest – setup guide (about 15 minutes)

There are two steps:

1. **Make the ranking sheet.** A Google Sheet stores every student's score.
2. **Put the website online.** GitHub Pages hosts it for free.

You only do this once.

---

## Step 1 – Make the ranking sheet (Google Sheets)

1. Open <https://sheets.google.com> and create a **blank spreadsheet**. Name it, for example, *Test Quest Ranking*.
2. In the menu, choose **Extensions → Apps Script**.
3. Delete the code that is already there. Open the file `apps-script/Code.gs` from this folder, copy all of it, and paste it in. Click **Save** (the disk icon).
4. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
   - Click **Deploy**. Google asks you to authorise the script: choose your account → **Advanced** → **Go to … (unsafe)** → **Allow**. This message is normal for your own scripts.
5. Copy the **Web app URL**. It ends with `/exec`.
6. Open `js/config.js` in this folder with Notepad (or any text editor). Paste the URL between the quotes:

   ```js
   SHEET_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```

   Save the file.

The sheet makes three tabs by itself the first time a student plays:

| Tab | What it shows you |
|---|---|
| **Players** | Each student's ID, name, total XP, stars and badges, plus their PIN key and saved progress. |
| **Attempts** | Every finished quiz, game or reading, with the score and the time. |
| **Missed** | Every question students got wrong, and how many times. Sort by "Times missed" to see what to revise in class. |

Only the name and score appear on the website. Student IDs and PINs stay in your sheet (PINs are stored in a coded form, not as the real numbers).

> **Already deployed an older version of the script?** Paste the new `Code.gs`, then go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The web app URL stays the same.

---

## Step 2 – Put the website online (GitHub Pages)

1. Create a free account at <https://github.com> (skip this if you have one).
2. Click **+ → New repository**. Name it, for example, `test-quest`, set it to **Public**, and click **Create repository**.
3. Click **uploading an existing file**. Drag **all the files and folders inside this `site` folder** into the page. These are `index.html` and the `css`, `js` and `apps-script` folders. Click **Commit changes**.
4. Go to **Settings → Pages**. Under "Branch", choose **main** and **/ (root)**, then click **Save**.
5. Wait 1–2 minutes and refresh the page. GitHub shows the link to your site, like `https://your-name.github.io/test-quest/`. Share this link with your students.

**To change something later**, edit `js/config.js` on GitHub with the pencil icon, then click **Commit changes**. The site updates in about a minute.

---

## Settings in `js/config.js`

| Setting | What it does |
|---|---|
| `SHEET_URL` | The link from Step 1. If it is empty, the site still works, but the class ranking is not shared. |
| `COURSE` | The course name shown on the home page. |

---

## Good to know

- **All levels are open.** Students can start with any test on the map, in any order.

- **Using several devices:** students sign in with their **student ID and a 4-digit PIN** that they choose the first time. Their progress is saved in the Google Sheet, so they can sign in on another phone or computer with the same ID and PIN and continue where they stopped. On shared computers, they should use **Sign out of this device** (on their profile page) when they finish.
- **Forgotten PIN:** in the **Players** tab, delete the text in that student's **PIN key** cell. The next PIN the student types becomes their new PIN, and their progress is kept. Do not edit the **Progress** column.
- **Scoring:** only the **best** result of each activity counts, so repeating an easy quiz does not add more points.
- **Cheating:** scores are calculated on the students' devices, so a very determined student could fake one. Check the **Attempts** tab if a score looks strange.
- **Reading passages:** the six passages come from *IELTS Reading Actual Test 6* (Tests 3 and 4), a published practice book. A GitHub Pages site is public, so share the link only with your class.
- **Starting a new class:** make a new Google Sheet (repeat Step 1), or delete the rows in the three tabs.

---

## If you click "Unpublish" by mistake

Your files are still in the repository. To put the site back online:

1. Open your repository on GitHub → **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set **Branch** to **main** and the folder to **/ (root)**, then click **Save**.
4. Wait 1–2 minutes and refresh the page. The same link appears again.
