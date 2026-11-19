const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

console.log('=== [1/3] Building Server Room Simulator ===');
execSync('npm install', {
  cwd: path.join(rootDir, 'server-room-simulator'),
  stdio: 'inherit'
});
execSync('npx vite build --base=/datacenter/ --outDir ../dist/datacenter', {
  cwd: path.join(rootDir, 'server-room-simulator'),
  stdio: 'inherit'
});

console.log('=== [2/3] Building EmberGrid AI ===');
execSync('npm install', {
  cwd: path.join(rootDir, 'embergrid'),
  stdio: 'inherit'
});
execSync('npx vite build --base=/embergrid/ --outDir ../dist/embergrid', {
  cwd: path.join(rootDir, 'embergrid'),
  stdio: 'inherit'
});

console.log('=== [3/3] Assembling Unified Studio ===');
fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(
  path.join(rootDir, 'unified-studio', 'index.html'),
  path.join(distDir, 'index.html')
);

console.log('=== Build Complete Successfully! ===');
