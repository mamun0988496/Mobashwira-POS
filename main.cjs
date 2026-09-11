const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { fork, spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const { google } = require('googleapis');

let mainWindow = null;
let splashWindow = null;
let serverProcess = null;
let store;

const CLIENT_ID = '612852801276-jvjb4e8l4r56n4mjvqdus5g0kg813c9t.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3030/oauth2callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

function getDbPath() {
  return path.join(app.getPath('userData'), 'shop_database.db');
}

// উইন্ডোজে আটকে থাকা সার্ভার জোরপূর্বক কিল করার ফাংশন
function killServer() {
  if (serverProcess) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${serverProcess.pid} /T /F`);
      } else {
        serverProcess.kill('SIGKILL');
      }
    } catch (e) {
      console.log('Server kill process:', e.message);
    }
    serverProcess = null;
  }
}

async function authenticateGoogle() {
  return new Promise((resolve, reject) => {
    let token = store.get('google_token');
    if (token) {
      oauth2Client.setCredentials(token);
      return resolve(oauth2Client);
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.appdata'],
    });

    shell.openExternal(authUrl);

    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.startsWith('/oauth2callback')) {
          const url = new URL(req.url, 'http://localhost:3030');
          const code = url.searchParams.get('code');
          
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h2 style="color:green; text-align:center; margin-top:50px;">Login Successful!</h2><p style="text-align:center;">You can close this browser tab and go back to the app.</p>');
          server.close();

          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          store.set('google_token', tokens);
          resolve(oauth2Client);
        }
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
      reject(err);
    });

    server.listen(3030);
  });
}

ipcMain.handle('upload-to-drive', async () => {
  try {
    const auth = await authenticateGoogle();
    const drive = google.drive({ version: 'v3', auth });
    const dbPath = getDbPath();

    const media = {
      mimeType: 'application/octet-stream',
      body: fs.createReadStream(dbPath)
    };

    const existing = await drive.files.list({ spaces: 'appDataFolder', fields: 'files(id)', pageSize: 1 });

    if (existing.data.files.length > 0) {
      // আগের ফাইল ডিলিট করে দিচ্ছি যেন ক্যাশে আটকে না থাকে
      await drive.files.delete({ fileId: existing.data.files[0].id });
    }
    
    // একদম ফ্রেশ ডাটাবেস আপলোড করা হচ্ছে
    await drive.files.create({
      resource: { name: 'shop_database.db', parents: ['appDataFolder'] },
      media: media,
      fields: 'id'
    });
    
    return { success: true, message: 'Google Drive এ ব্যাকআপ সফল হয়েছে!' };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'ব্যাকআপ ফেইল হয়েছে!' };
  }
});

ipcMain.handle('download-from-drive', async () => {
  try {
    const auth = await authenticateGoogle();
    const drive = google.drive({ version: 'v3', auth });
    const dbPath = getDbPath();

    const response = await drive.files.list({ spaces: 'appDataFolder', fields: 'files(id)', pageSize: 1 });
    if (response.data.files.length === 0) return { success: false, message: 'কোনো ব্যাকআপ পাওয়া যায়নি!' };

    const fileId = response.data.files[0].id;

    // ১. আগের সার্ভার পুরোপুরি ধ্বংস করা হচ্ছে!
    killServer();

    const res = await drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' });
    const dest = fs.createWriteStream(dbPath);

    return new Promise((resolve, reject) => {
      res.data.pipe(dest);

      dest.on('finish', () => {
        dest.close();
        
        // ২. ফাইল সেভ হওয়ার ২ সেকেন্ড পর একদম ফ্রেশ সার্ভার চালু করা হচ্ছে
        setTimeout(() => {
          startBackend();
          resolve({ success: true, message: 'ডাটা সফলভাবে রিস্টোর হয়েছে!' });
        }, 2000);
      });

      dest.on('error', (err) => {
        reject({ success: false, message: 'রিস্টোর ফেইল হয়েছে!' });
      });
    });
  } catch (error) {
    console.error(error);
    return { success: false, message: 'রিস্টোর ফেইল হয়েছে!' };
  }
});

function startBackend() {
  const logFile = path.join(app.getPath('userData'), 'server.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  if (app.isPackaged) {
    const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist-server', 'server.cjs');
    const fallbackPath = path.join(__dirname, 'dist-server', 'server.cjs');
    const finalPath = fs.existsSync(unpackedPath) ? unpackedPath : fallbackPath;

    serverProcess = fork(finalPath, [], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3000',
        APP_ROOT: app.getAppPath(),
        USER_DATA: app.getPath('userData')
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    serverProcess.stdout.pipe(logStream);
    serverProcess.stderr.pipe(logStream);
  } else {
    const tsxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    serverProcess = spawn(tsxCmd, ['tsx', path.join(__dirname, 'server.ts')], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'development', PORT: '3000', USER_DATA: app.getPath('userData') },
      shell: true,
      stdio: 'inherit'
    });
  }

  serverProcess.on('error', (err) => {
    fs.appendFileSync(logFile, 'Server Process Error: ' + err.message + '\n');
  });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480, height: 380, frame: false, transparent: true, alwaysOnTop: true, center: true, resizable: false, show: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 700, title: 'Shop Manager POS & ERP', icon: path.join(__dirname, 'icon.ico'), autoHideMenuBar: true, show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
      mainWindow.show();
      mainWindow.focus();
    }, 2200);
  });
}

app.whenReady().then(async () => {
  const StoreModule = await import('electron-store');
  const Store = StoreModule.default;
  store = new Store();
  createSplashWindow();
  startBackend();
  createMainWindow();
});

app.on('will-quit', () => {
  killServer(); // অ্যাপ কাটার সময়ও নিশ্চিত করছি সার্ভার যেন মরে যায়
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});