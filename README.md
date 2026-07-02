# WhatsApp Blast from Google Sheets (PoC)

Small proof-of-concept script that reads phone numbers + messages straight from a Google Sheet and blasts them out on WhatsApp — one command, no clicking through chats one by one.

## Background

This started from a random conversation with my internship supervisor's friend, who's also an Astra Graphia employee (he leads the Sumatra branch). He was just curious if something like this was even possible — send WhatsApp messages straight from a spreadsheet, no manual work. So I built this to actually test it out, and turns out yes, it works. Sharing it here in case anyone else wants to try it or build on top of it.

## What this is (and isn't)

- **Is:** a working demo where `Column A (phone number) + Column B (message)` in a live Google Sheet turns into actual WhatsApp messages sent out with one command.
- **Isn't:** something you should use for real bulk messaging or production stuff. It's built on [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js), which basically automates a hidden WhatsApp Web session instead of using WhatsApp's official Business API. Fine for testing small numbers, but it's **not something WhatsApp officially allows**, and sending at real volume risks getting the number flagged or banned. More on that below.

If you actually need this for real customer messaging, look at the official **WhatsApp Business API** instead (Twilio, Fonnte, 360dialog, etc). This repo is just to prove the concept works, nothing more.

## How it works

1. Your Google Sheet has phone numbers in column A, messages in column B.
2. The script reads that sheet (read-only) using a Google Cloud service account.
3. It also opens a hidden Chromium browser in the background (via Puppeteer) and logs into WhatsApp Web the normal way — you scan a QR code once with your phone.
4. Every time you run it, it grabs whatever's currently in the sheet and sends each message to its matching number, with a delay in between so it doesn't look like an obvious bot.

Nothing's hardcoded — sheet ID, range, all the config lives in a local `.env` file that never gets pushed to git.

## Disclaimer

- This automates WhatsApp Web in a way that's not officially sanctioned by WhatsApp/Meta. Technically against their ToS even for small test runs.
- Only test with numbers you own or people who already know you're testing this. Don't send to random/cold numbers.
- There's no official limit on how many messages is "safe" — WhatsApp's ban detection is based on patterns, not a fixed number. Keep test runs small and space your messages out (this script defaults to a few seconds between sends).
- Use this at your own risk. Not responsible if your number gets flagged or banned — this is meant for controlled testing/demo, not real campaigns.

## Requirements

- Node.js 18+
- A WhatsApp account on your phone (to scan the QR code)
- A Google Cloud project with the Sheets API turned on
- A Google Sheet with your test data, shared with a service account

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
```

### 2. Set up a Google Cloud service account

1. Go to [Google Cloud Console](https://console.cloud.google.com), create or pick a project.
2. Turn on the **Google Sheets API**.
3. Go to **IAM & Admin → Service Accounts → Create Service Account**.
4. Generate a **JSON key** and download it, save it locally as `service-account.json` (this is git-ignored, don't commit it).
5. Open your Google Sheet → **Share** → paste in the service account's email (it's in the JSON file, looks like `xxx@xxx.iam.gserviceaccount.com`) → give it **Viewer** access.

### 3. Set up your environment variables

```bash
cp .env.example .env
```

```env
SPREADSHEET_ID=your-sheet-id-here
SHEET_RANGE=Sheet1!A2:B
GOOGLE_KEY_FILE=./service-account.json
SEND_DELAY_MS=6000
```

- `SPREADSHEET_ID` — the long string in your sheet's URL: `.../d/{THIS_PART}/edit`
- `SHEET_RANGE` — change the tab name if yours isn't "Sheet1"; `A2:B` skips the header row
- `SEND_DELAY_MS` — gap between messages in milliseconds, higher = safer

### 4. Set up your sheet

| A (phone) | B (message) |
|---|---|
| 6281234567890 | Hi, this is a test message. |
| 6289876543210 | Another test message here. |

Numbers need the country code, no `+`, no leading `0` (Indonesian numbers start with `62`, not `08`).

### 5. Run it

```bash
node blast.js
```

First time you run it, a QR code shows up in your terminal — scan it with WhatsApp on your phone (**Settings → Linked Devices → Link a Device**). After that, the session's cached in `.wwebjs_auth/` so you won't need to scan again unless you unlink it or delete that folder.

Once it's connected, it pulls whatever's in the sheet and sends everything automatically.

## Project structure

```
.
├── blast.js              # main script
├── .env.example           # template for env vars, safe to commit
├── .env                    # your actual config, git-ignored
├── service-account.json    # Google service account key, git-ignored
├── .wwebjs_auth/            # cached WhatsApp session, git-ignored
└── package.json
```

## Security notes

- Never commit `.env` or `service-account.json` — both are already in `.gitignore`.
- If a secret ever slips into a commit by accident, rotate it (regenerate the service account key, unlink the WhatsApp device) rather than assuming a force-push cleans it up.
- The service account only needs **read-only** access to the sheet, nothing more.

## License

MIT — do what you want with it, just don't come after me if your number gets banned for spamming strangers.