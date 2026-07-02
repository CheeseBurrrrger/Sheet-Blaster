require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = process.env.SHEET_RANGE;
const KEY_FILE = process.env.GOOGLE_KEY_FILE;
const SEND_DELAY_MS = parseInt(process.env.SEND_DELAY_MS, 10) || 6000;

if (!SPREADSHEET_ID || !RANGE || !KEY_FILE) {
  console.error('Missing required .env values. Check SPREADSHEET_ID, SHEET_RANGE, GOOGLE_KEY_FILE.');
  process.exit(1);
}

async function getSheetData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });

  const rows = res.data.values || [];
  return rows
    .filter(row => row[0] && row[1])
    .map(row => ({
      phone: row[0].toString().replace(/\D/g, ''),
      message: row[1],
    }));
}

const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', qr => qrcode.generate(qr, { small: true }));

client.on('ready', async () => {
  console.log('WhatsApp client ready. Fetching sheet data...');
  const contacts = await getSheetData();
  console.log(`Loaded ${contacts.length} contacts. Starting blast...`);

  for (const { phone, message } of contacts) {
    try {
      await client.sendMessage(`${phone}@c.us`, message);
      console.log(`✅ Sent to ${phone}`);
    } catch (err) {
      console.log(`❌ Failed for ${phone}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, SEND_DELAY_MS));
  }

  console.log('Blast complete.');
});

client.initialize();