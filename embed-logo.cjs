const fs = require('fs');
const path = require('path');

const imgPath = path.join(process.cwd(), 'logo.png');
const base64Data = fs.readFileSync(imgPath).toString('base64');
const dataUri = 'data:image/png;base64,' + base64Data;

const htmlContent = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>মোবাশ্বিরা পশু পাখির ওষুধ ঘর</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      color: #14532d;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      user-select: none;
      -webkit-app-region: drag;
      border-radius: 20px;
      border: 3.5px solid #16a34a;
      box-shadow: 0 20px 45px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    .logo-wrapper {
      width: 220px;
      height: 220px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 50%;
    }
    .loader-bar {
      width: 230px;
      height: 6px;
      background: #dcfce7;
      border-radius: 999px;
      overflow: hidden;
      position: relative;
      margin-bottom: 10px;
    }
    .loader-progress {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      background: linear-gradient(90deg, #16a34a, #22c55e);
      width: 45%;
      border-radius: 999px;
      animation: indeterminate 1.3s infinite ease-in-out;
    }
    .loading-text {
      font-size: 13px;
      color: #15803d;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    @keyframes indeterminate {
      0% { left: -45%; width: 45%; }
      50% { left: 30%; width: 55%; }
      100% { left: 100%; width: 45%; }
    }
  </style>
</head>
<body>
  <div class="logo-wrapper">
    <img src="${dataUri}" alt="লোগো" />
  </div>
  <div class="loader-bar">
    <div class="loader-progress"></div>
  </div>
  <div class="loading-text">সফটওয়্যার লোড হচ্ছে, অপেক্ষা করুন...</div>
</body>
</html>`;

fs.writeFileSync('splash.html', htmlContent, 'utf8');
console.log('✅ Logo successfully embedded into splash.html');
