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

### 1. Turn on the two Firebase services

In the [Firebase console](https://console.firebase.google.com/) for project
**industrious-sonar-l7k72**:

- **Build → Authentication → Sign-in method** → enable **Email/Password**.
- **Build → Firestore Database** → **Create database** → production mode →
  location `australia-southeast1`.

### 2. Publish the security rules

The rules are the whole access-control model, so they must be deployed before
anyone signs in. From the repository root:

```bash
npx firebase-tools login
npx firebase-tools use industrious-sonar-l7k72
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

You can also paste `firestore.rules` into **Firestore → Rules** in the console
and publish from there, but the indexes in `firestore.indexes.json` still need
creating (Firestore will offer a one-click link the first time a report runs
without them).

### 3. Create the accounts

For each advisor and each administrator:

1. **Authentication → Users → Add user.** Enter their work email and a starting
   password. Copy the **User UID** it generates.
2. **Firestore → Data →** collection `users` → add a document whose **ID is that
   UID**, with these fields:

   | Field    | Type    | Value                                         |
   |----------|---------|-----------------------------------------------|
   | `name`   | string  | `Dean Eggins` — must match the advisor list    |
   | `email`  | string  | `dean.eggins@fitcollege.edu.au`                |
   | `role`   | string  | `advisor` or `admin`                           |
   | `active` | boolean | `true`                                         |

`name` matters: it is what appears on the printed quote and in the management
report, and it is matched against the contact list in `src/types.ts` to fill in
the advisor's phone and booking link. Spell it exactly as it appears there.

Nothing in the app can write to `users`. Roles are changed in the Firebase
console and nowhere else, which is what stops an advisor granting themselves the
management view.

### 4. Revoking access

Set `active` to `false` on someone's `users` document. They are locked out on
their next action, and their historical quotes stay in the reports.

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
