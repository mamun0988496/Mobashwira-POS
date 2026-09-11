const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Ensure dist-server directory exists
if (!fs.existsSync('dist-server')) {
  fs.mkdirSync('dist-server', { recursive: true });
}

// Copy sql-wasm.wasm next to server.cjs
const wasmSrc = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
if (fs.existsSync(wasmSrc)) {
  fs.copyFileSync(wasmSrc, path.join('dist-server', 'sql-wasm.wasm'));
  console.log('? sql-wasm.wasm copied to dist-server');
}

esbuild.build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist-server/server.cjs',
  // নিচে @aws-sdk/client-s3 যোগ করা হয়েছে
  external: ['electron', 'vite', 'fsevents', '@rollup/*', '@aws-sdk/client-s3'],
  sourcemap: false
}).then(() => {
  console.log('? Server built successfully');
}).catch((err) => {
  console.error('? Build failed:', err);
  process.exit(1);
});