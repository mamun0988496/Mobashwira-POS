import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getDb, getPendingAlerts, markAlertAsSent } from './server/db';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { registerRoutes } = require('./server/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- Safe Directory for EXE ---
const dataDir = process.env.USER_DATA || process.env.APPDATA || process.cwd();
const wwebjsAuthPath = path.join(dataDir, '.wwebjs_auth');

// --- Find Local Browser ---
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

let executablePath = undefined;
for (const p of browserPaths) {
  if (fs.existsSync(p)) {
    executablePath = p;
    break;
  }
}

// ---------------------------------------------------------
// WhatsApp Alert System Setup
// ---------------------------------------------------------
const OWNER_PHONE_NUMBER = '8801788183164'; // আপনার নাম্বার

const whatsappClient = new Client({
  authStrategy: new LocalAuth({ dataPath: wwebjsAuthPath }),
  puppeteer: {
    headless: true,
    executablePath: executablePath,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage', // মেমরি ক্র্যাশ রোধ করার জন্য
      '--disable-gpu',
      '--no-first-run'
    ]
  }
});

let isWhatsappReady = false;

whatsappClient.on('qr', (qr) => {
  console.log('\n==================================================');
  console.log('অনুগ্রহ করে নিচের QR কোডটি আপনার WhatsApp থেকে স্ক্যান করুন:');
  console.log('==================================================\n');
  qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', async () => {
  console.log('WhatsApp Client is ready!');
  isWhatsappReady = true;
  
  const targetChatId = `${OWNER_PHONE_NUMBER}@c.us`;

  // 🔴 নতুন: কানেক্ট হওয়ার সাথে সাথে একটি টেস্ট মেসেজ পাঠাবে
  try {
    await whatsappClient.sendMessage(targetChatId, '✅ *Nexus ERP:* আপনার হোয়াটসঅ্যাপ অ্যালার্ট সিস্টেম সফলভাবে কানেক্ট হয়েছে!');
    console.log('Startup test message sent successfully!');
  } catch (err) {
    console.error('Failed to send startup message:', err);
  }
  
  console.log('Checking alerts for immediate testing...');
  setTimeout(() => {
    checkAndSendAlerts();
  }, 5000);

  scheduleDailyAlerts(); 
});

whatsappClient.on('disconnected', (reason) => {
  console.log('WhatsApp Client Disconnected! Reason:', reason);
  isWhatsappReady = false;
  console.log('Trying to reconnect...');
  whatsappClient.initialize().catch(err => console.error('Reconnection Error:', err));
});

whatsappClient.on('auth_failure', (msg) => {
  console.error('WhatsApp Auth Failure:', msg);
  isWhatsappReady = false;
});

// Initialize WhatsApp
console.log('Starting WhatsApp Client...');
whatsappClient.initialize().catch(err => console.error('WhatsApp Init Error:', err));

async function checkAndSendAlerts() {
  if (!isWhatsappReady) return;

  const { stockAlerts, expiryAlerts } = getPendingAlerts(45); // 45 দিনের এক্সপায়ারি বা লো স্টক
  const targetChatId = `${OWNER_PHONE_NUMBER}@c.us`;

  console.log(`[Alert Check] Found ${stockAlerts.length} stock alerts and ${expiryAlerts.length} expiry alerts.`);

  if (stockAlerts.length === 0 && expiryAlerts.length === 0) {
    console.log('No pending alerts to send right now.');
    return;
  }

  for (const item of stockAlerts) {
    const msg = `⚠️ *স্টক অ্যালার্ট:*\nআপনার "${item.name}" প্রোডাক্টের স্টক শেষের দিকে। বর্তমান স্টক: ${item.stock}`;
    try {
      await whatsappClient.sendMessage(targetChatId, msg);
      markAlertAsSent(item.id, 'stock');
      console.log(`Stock alert sent for ${item.name}`);
    } catch (e) {
      console.error('Failed to send stock alert', e);
    }
  }

  for (const item of expiryAlerts) {
    const msg = `⏳ *মেয়াদ অ্যালার্ট:*\nআপনার "${item.name}" প্রোডাক্টের মেয়াদ শীঘ্রই শেষ হবে। মেয়াদ আছে: ${item.expire_date} পর্যন্ত।`;
    try {
      await whatsappClient.sendMessage(targetChatId, msg);
      markAlertAsSent(item.id, 'expiry');
      console.log(`Expiry alert sent for ${item.name}`);
    } catch (e) {
      console.error('Failed to send expiry alert', e);
    }
  }
}

function scheduleDailyAlerts() {
  let hasSentToday = false;

  setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours === 0) {
      hasSentToday = false;
    }

    // রাত ৯:০০ (21:00) বাজলে মেসেজ পাঠাবে
    if (hours === 21 && minutes === 0 && !hasSentToday) {
      console.log('Time is 9:00 PM, running daily WhatsApp alerts...');
      checkAndSendAlerts();
      hasSentToday = true;
    }
  }, 60 * 1000); 
  
  console.log('Daily alert scheduler running. Alerts will be sent at 9:00 PM.');
}

// ---------------------------------------------------------
// Backend Server Setup
// ---------------------------------------------------------
async function startServer() {
  console.log('Initializing database...');
  await getDb();
  console.log('Database initialized successfully.');

  if (typeof registerRoutes === 'function') {
    registerRoutes(app);
  } else {
    try {
      const routesModule = await import('./server/routes');
      if (routesModule.registerRoutes) {
        routesModule.registerRoutes(app);
      } else if (routesModule.default) {
        app.use('/api', routesModule.default);
      }
    } catch (e) {
      console.error('Error importing routes module:', e);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      const viteModule = await import('vite');
      const createViteServer = viteModule.createServer;
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log('Running without vite dev middleware');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('Backend server running on port ' + PORT);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});