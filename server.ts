import express from 'express';
import cors from 'cors';
import { getDb } from './server/db';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

    // Reset sending status exactly at midnight
    if (hours === 0) {
      hasSentToday = false;
    }

    // Run Daily alert at 6:00 PM (18:00)
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log('Backend server running on port ' + PORT);
    console.log('✅ Email Alert System is Active.');

    // 🔴 অ্যাপ রান হওয়ার সাথে সাথে ইমেইল চেক করবে, নতুন জিমেইল থাকলে ওয়েলকাম মেসেজ পাঠাবে
    if (typeof checkAndSendConnectionEmail === 'function') {
      checkAndSendConnectionEmail();
    }
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});