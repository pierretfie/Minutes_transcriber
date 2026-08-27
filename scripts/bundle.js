const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const BUNDLE_DIR = path.join(ROOT_DIR, 'bundle');

console.log('=== Minutes Transcriber Bundle Script ===\n');

if (!fs.existsSync(path.join(SERVER_DIR, 'dist', 'index.js'))) {
  console.log('1. Building server...');
  execSync('npx tsc', { cwd: SERVER_DIR, stdio: 'inherit' });
} else {
  console.log('1. Server dist exists, skipping build...');
}

if (!fs.existsSync(path.join(CLIENT_DIR, 'dist', 'index.html'))) {
  console.log('\n2. Building client...');
  execSync('npx vite build', { cwd: CLIENT_DIR, stdio: 'inherit' });
} else {
  console.log('2. Client dist exists, skipping build...');
}

console.log('\n3. Creating bundle directory...');
if (fs.existsSync(BUNDLE_DIR)) {
  fs.rmSync(BUNDLE_DIR, { recursive: true });
}
fs.mkdirSync(BUNDLE_DIR, { recursive: true });

console.log('4. Copying server files...');
copyDirSync(path.join(SERVER_DIR, 'dist'), path.join(BUNDLE_DIR, 'server', 'dist'));

const serverPkg = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'package.json'), 'utf8'));
delete serverPkg.devDependencies;
fs.writeFileSync(
  path.join(BUNDLE_DIR, 'server', 'package.json'),
  JSON.stringify(serverPkg, null, 2)
);

console.log('   Installing production dependencies...');
execSync('npm install --omit=dev --ignore-scripts', { 
  cwd: path.join(BUNDLE_DIR, 'server'), 
  stdio: 'inherit' 
});

fs.copyFileSync(
  path.join(SERVER_DIR, 'package.json'),
  path.join(BUNDLE_DIR, 'server', 'package.json')
);

console.log('5. Copying client build...');
copyDirSync(path.join(CLIENT_DIR, 'dist'), path.join(BUNDLE_DIR, 'client', 'dist'));

console.log('6. Creating startup script...');
const startScript = `#!/bin/bash
cd "$(dirname "$0")/server"
node dist/index.js
`;
fs.writeFileSync(path.join(BUNDLE_DIR, 'start.sh'), startScript, { mode: 0o755 });

const startBat = `@echo off
cd /d "%~dp0\\server"
node dist/index.js
`;
fs.writeFileSync(path.join(BUNDLE_DIR, 'start.bat'), startBat);

console.log('7. Creating README...');
const readme = `# Minutes Transcriber

## Quick Start

### Linux/Mac:
\`\`\`bash
./start.sh
\`\`\`

### Windows:
\`\`\`cmd
start.bat
\`\`\`

### Manual:
\`\`\`bash
cd server
node dist/index.js
\`\`\`

## Access

Open your browser and go to:
- Local: http://localhost:3000
- Network: http://YOUR_IP:3000

## Configuration

Edit \`server/config/settings.json\` to configure:
- Webhook URL
- Request timeout

## Notes

- The app serves the UI on port 3000
- Make sure Node.js is installed on the target machine
- For network access, ensure port 3000 is open
`;
fs.writeFileSync(path.join(BUNDLE_DIR, 'README.md'), readme);

console.log('\n=== Bundle Complete! ===');
console.log(`Output: ${BUNDLE_DIR}`);
console.log('\nTo run:');
console.log('  cd bundle');
console.log('  ./start.sh    (Linux/Mac)');
console.log('  start.bat     (Windows)');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
