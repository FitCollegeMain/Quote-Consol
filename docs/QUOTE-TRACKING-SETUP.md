# Quote tracking — setup and operation

Stage 2 gives the console a shared, permanent memory. Every quote an advisor
exports is recorded centrally, and management can see, live, what each advisor
has closed and what they still have on the table.

This document covers the one-off setup, then how the day-to-day works.

---

## Why Firestore

The console is a static site on GitHub Pages: there is no server to run, so the
browser has to talk to the database directly. That rules out anything needing a
backend, and it rules out the old approach of writing to a Google Sheet in each
advisor's own Drive, which is why management could never see the whole picture.

Firestore fits because access control runs on Google's servers, not in the
browser. An advisor who opens the developer tools still cannot read a colleague's
quotes, because the rules in `firestore.rules` refuse the request. It also pushes
changes live, so the management report updates the moment an advisor marks a
quote closed, and it caches offline, so a quote exported on a flaky connection is
recorded as soon as signal returns.

Cost: roughly ten advisors issuing a few hundred quotes a month sits inside the
free tier with room to spare.

---

## One-off setup

All of it happens in the [Firebase console](https://console.firebase.google.com/)
in a browser. No terminal is needed. Work through the stages in order, because
each one depends on the one before it. Budget about forty minutes.

Console labels move around between versions. Where this document names a sidebar
item, look for that word rather than the group heading above it.

### Stage 0 — a project you own (done)

The console originally pointed at `industrious-sonar-l7k72`, a project Google AI
Studio created automatically when the app was first built. It sat on a restricted
Starter tier that nobody at the college owned, so the Authentication page refused
edits with "ask a project owner for the necessary permission" and none of the
stages below could be completed there.

It now points at **`fit-college-equote`**, a project the business owns outright,
configured in [`firebase-config.json`](../firebase-config.json). Those values
identify the project rather than granting access to it; the rules in stage 3 are
what protect the data.

Nothing else was tied to the old project — no Gemini calls, no AI Studio APIs —
so swapping that one file was the whole migration.

If you ever need to move projects again: create the project, register a web app
(`</>` on Project Overview, Firebase Hosting left unticked since the console is
served from GitHub Pages), and replace the values in `firebase-config.json` with
the `firebaseConfig` block Firebase shows you.

### Stage 1 — turn on sign-in

1. Open the project from stage 0, then click **Authentication** in the left
   sidebar (it sits under a heading reading either Build or Security).
2. Click **Get started** if it is offered.
3. Open the **Sign-in method** tab.
4. Under **Native providers**, click **Email/Password**.
5. Enable the **first** toggle only. Leave "Email link (passwordless sign-in)"
   off — nothing in the app uses it.
6. **Save**.

Email/Password should now show as `Enabled`.

### Stage 2 — create the database

1. Click **Firestore** in the sidebar (newer consoles group it under Databases &
   Storage; older ones call it Firestore Database). Not Realtime Database, which
   is a different product.
2. **Create database**.
3. Location: **australia-southeast1 (Sydney)**. This is permanent — changing it
   later means building a new database from scratch.
4. If asked for a starting mode, choose **Production mode**. Stage 3 replaces the
   rules anyway, but test mode opens the database to the public after 30 days.
5. If asked for an edition, **Standard**. Most projects are assigned it without
   asking.
6. **Create**.

You should land on an empty **Data** tab for a database named `(default)`.

### Stage 3 — publish the security rules

The rules are the entire access-control model, so nothing works until they are
published.

1. Firestore → **Rules** tab.
2. Select everything in the editor and delete it.
3. Paste the full contents of [`firestore.rules`](../firestore.rules) from this
   repository.
4. **Publish**.

The "last published" timestamp at the top of the tab should update.

### Stage 4 — add the two indexes

Without these, the advisor list and the management report show an index error
instead of data.

1. Firestore → **Indexes** tab → **Composite** → **Create index**.
2. Build both of the following. Collection ID is `quotes` and query scope is
   `Collection` for both. Field names are case sensitive.

   | Index  | Field 1      | Order     | Field 2     | Order      |
   |--------|--------------|-----------|-------------|------------|
   | First  | `advisorUid` | Ascending | `createdAt` | Descending |
   | Second | `issueMonth` | Ascending | `createdAt` | Descending |

3. Wait for both to move from Building to **Enabled**, usually a minute or two.

### Stage 5 — create the people

Each person needs two things: an account so they can sign in, and a profile
saying who they are and what they may see. An account with no profile is refused,
by design.

**Part A, the account.** Authentication → **Users** tab → **Add user**. Enter
their work email and a temporary password of at least six characters, then copy
the **User UID** from their row in the list.

**Part B, the profile.** Firestore → **Data** tab. For the first person, click
**Start collection** and name it `users`; after that, open the existing `users`
collection and click **Add document**. Set the **Document ID** to the User UID
you copied — not Auto-ID; this is the step that most often goes wrong. Then add
four fields:

| Field    | Type    | Value                                          |
|----------|---------|------------------------------------------------|
| `name`   | string  | `Dean Eggins` — must match the advisor list     |
| `email`  | string  | `dean.eggins@fitcollege.edu.au`                 |
| `role`   | string  | `advisor` or `admin`, lower case                |
| `active` | boolean | `true` — the boolean, not the text "true"       |

`name` matters twice over: it prints on the quote PDF, and it is matched against
`ADVISER_CONTACTS` in `src/types.ts` to fill in the advisor's phone number and
booking link. Copy the spelling from there.

Admins can still build and send quotes, so somebody who is both an advisor and a
manager gets one account with `role` set to `admin`, not two.

### Stage 6 — test before announcing it

Sign in as an admin and check the **Management** tab is present. Build a throwaway
quote, export it, and confirm it appears in My Quotes and in Management, that
marking it closed moves the figures immediately, and that exporting it a second
time does not create a duplicate. Delete the test document from Firestore → Data
→ `quotes`. Finally, have one advisor sign in and confirm they see only their own
quotes and have no Management tab.

### Revoking access

Set `active` to `false` on someone's `users` document. They are locked out on
their next action, and their historical quotes stay in the reports.

Nothing in the app can write to `users`. Roles change here, in the Firebase
console, and nowhere else — which is what stops an advisor granting themselves
the management view.

### If something goes wrong

| Symptom | Cause |
|---------|-------|
| "ask a project owner for the necessary permission" | You are in a project you do not own, most likely the AI Studio Starter tier one. See stage 0 |
| "has no console profile yet" | The profile document ID does not match the User UID, or `active` was saved as a string rather than a boolean |
| "Missing or insufficient permissions" | Stage 3 was skipped or the rules did not publish |
| "The query requires an index" | Stage 4 was skipped, is still building, or a field name is misspelled |
| Quotes save, but Management is empty | Your own profile has `role` set to `advisor` |
| Advisor's phone or booking link missing from the PDF | `name` does not match the spelling in `ADVISER_CONTACTS` |
| Sign-in refused, unauthorised domain | Add the hosting domain under Authentication → Settings → Authorised domains |

### Deploying rules from the command line instead

For anyone who would rather not use the console UI, stages 3 and 4 can be done
from the repository root:

```bash
npx firebase-tools login
npx firebase-tools use fit-college-equote
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Stages 1, 2 and 5 still have to be done in the console.

---

## How it works day to day

**Recording.** A quote is recorded when the advisor presses *Export PDF & Record
Quote*. That is the moment it counts as sent. Re-exporting the same quote updates
the existing record rather than creating a second one, so revising a quote for a
student does not inflate the numbers.

**Outcomes.** A quote is one of:

| State      | Meaning                                                     |
|------------|-------------------------------------------------------------|
| **Open**   | Sent, no decision yet, still inside its validity date        |
| **Closed** | The student accepted — the advisor marks this in My Quotes   |
| **Lost**   | The advisor has written it off                               |
| **Lapsed** | No decision, and the validity date has passed                |

Lapsed is worked out from the expiry date when the page loads rather than being
stored, so no scheduled job is needed to keep the data honest.

**Months.** A quote belongs to the month it was issued in, and stays there. A
quote sent on 28 September that closes on 3 October counts towards September, and
September's closed figure moves when it does. The security rules enforce this:
the month stamped on a quote cannot be edited afterwards, by anyone.

---

## The two views

**My Quotes** (every advisor, their own records only): what they have closed this
month, what is still live and could close, and the quotes to chase, soonest
expiry first. A *Last month* toggle shows the same month in review.

**Management** (admins only): the same numbers for the whole team, plus a row per
advisor showing quotes sent, closed, left to close, and what did not close. It
updates live, steps back through previous months, and exports to CSV.

---

## What changed from stage 1

- Records live in Firestore instead of browser local storage and per-advisor
  Google Sheets, so management can see everything and nothing is lost when a
  browser cache is cleared.
- Sign-in is a real account with a real password, and roles are enforced by the
  server. The old name-dropdown with a predictable `initialsFit26` password is
  gone; it could not have protected a management view.
- The demo quotes that seeded themselves into the tracker (Ashley Cole, Peter
  Parker and friends) are gone, so the reports only ever show real activity.
- The QTrak tab and the old dashboard did much the same job. They are now one
  **My Quotes** view.
- Exporting a quote twice used to log it twice. It now updates one record.

Local storage keys from the beta (`fit_advisor`, `fit_local_quotes`,
`fit_global_target`, `fit_advisor_targets`) are no longer read and can be
ignored; browsers will drop them on their own.

---

## Still to come

HubSpot is untouched by design. When it is time to connect them, the natural
route is a small scheduled function that matches a quote's HubSpot deal code to
its deal stage and sets the outcome automatically, so advisors stop marking
quotes closed by hand. The data model already carries the deal code for it.
