import express from 'express';
import cors from 'cors';
import os from 'os'; // 🔴 নতুন যুক্ত করা হয়েছে (IP বের করার জন্য)
import { getDb } from './server/db';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===============================================
// 🔴 অটোমেটিক পিসির IP বের করার ফাংশন
// ===============================================
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (iface) {
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        // শুধুমাত্র IPv4 এবং লোকালহোস্ট ছাড়া আসল আইপিটা নিবে
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return '0.0.0.0'; // যদি না পায় তবে ডিফল্ট
}

// 🔴 ফোনের স্ক্যানারের জন্য QR কোড ডাটা API
app.get('/api/server-info', (req, res) => {
  res.json({
    ip: getLocalIP(),
    port: PORT,
    key: 'mobashwira123'
  });
});
// ===============================================

// ---------------------------------------------------------
// Backend Server Setup
// ---------------------------------------------------------
async function startServer() {
  console.log('Initializing database...');
  await getDb();
  console.log('Database initialized successfully.');

  let runDailyEmailAlerts: any = null;
  let checkAndSendConnectionEmail: any = null;

  try {
    const routesModule = await import('./server/routes');
    if (routesModule.registerRoutes) {
      routesModule.registerRoutes(app);
    } else if (routesModule.default) {
      app.use('/api', routesModule.default);
    }
    if (routesModule.runDailyEmailAlerts) {
      runDailyEmailAlerts = routesModule.runDailyEmailAlerts;
    }
    if (routesModule.checkAndSendConnectionEmail) {
      checkAndSendConnectionEmail = routesModule.checkAndSendConnectionEmail;
    }
  } catch (e) {
    console.error('Error importing routes module via ESM, trying CJS:', e);
    const routesModule = require('./server/routes');
    if (routesModule.registerRoutes) {
      routesModule.registerRoutes(app);
    } else if (routesModule.default) {
      app.use('/api', routesModule.default);
    }
    if (routesModule.runDailyEmailAlerts) {
      runDailyEmailAlerts = routesModule.runDailyEmailAlerts;
    }
    if (routesModule.checkAndSendConnectionEmail) {
      checkAndSendConnectionEmail = routesModule.checkAndSendConnectionEmail;
    }
  }

  // ===============================================
  // Daily 6 PM Email Scheduler
  // ===============================================
  let hasSentToday = false;
  setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours === 0) {
      hasSentToday = false;
    }

    if (hours === 18 && minutes === 0 && !hasSentToday) {
      console.log('[Scheduler] Time is 6:00 PM. Running daily email alerts...');
      if (typeof runDailyEmailAlerts === 'function') {
        runDailyEmailAlerts();
      }
      hasSentToday = true;
    }
  }, 60 * 1000); 

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

  // 🔴 '0.0.0.0' ব্যবহার করা হয়েছে যেন বাইরের ফোন পিসিকে খুঁজে পায়
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://${getLocalIP()}:${PORT}`);
    console.log('✅ Email Alert System is Active.');

    if (typeof checkAndSendConnectionEmail === 'function') {
      checkAndSendConnectionEmail();
    }
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});