#!/usr/bin/env node

/**
 * Change Frontend and Backend Ports
 * Updates all port references across the project
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const VITE_CONFIG = path.join(__dirname, '..', 'vite.config.ts');
const ENV_FILE = path.join(__dirname, '..', '.env.local');
const SERVER_FILE = path.join(__dirname, '..', 'migration', 'backend', 'server.js');
const BACKEND_ENV = path.join(__dirname, '..', 'migration', 'backend', '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('=== Change Ports Configuration ===\n');
  
  // Ask for frontend port
  const frontendPort = await question('Enter new FRONTEND port (current: 8080): ');
  if (!frontendPort || isNaN(frontendPort)) {
    console.log('❌ Invalid port number');
    rl.close();
    return;
  }
  
  // Ask for backend port
  const backendPort = await question('Enter new BACKEND port (current: 3001): ');
  if (!backendPort || isNaN(backendPort)) {
    console.log('❌ Invalid port number');
    rl.close();
    return;
  }
  
  console.log('\n📝 Updating configuration files...\n');
  
  // 1. Update vite.config.ts
  let viteConfig = fs.readFileSync(VITE_CONFIG, 'utf8');
  viteConfig = viteConfig.replace(/port:\s*\d+/g, `port: ${frontendPort}`);
  fs.writeFileSync(VITE_CONFIG, viteConfig, 'utf8');
  console.log('✅ Updated vite.config.ts');
  
  // 2. Update .env.local
  let envFile = fs.readFileSync(ENV_FILE, 'utf8');
  envFile = envFile.replace(
    /VITE_API_URL=http:\/\/localhost:\d+\/api/g,
    `VITE_API_URL=http://localhost:${backendPort}/api`
  );
  fs.writeFileSync(ENV_FILE, envFile, 'utf8');
  console.log('✅ Updated .env.local');
  
  // 3. Update server.js
  let serverFile = fs.readFileSync(SERVER_FILE, 'utf8');
  serverFile = serverFile.replace(
    /const PORT = process\.env\.PORT \|\| \d+;/g,
    `const PORT = process.env.PORT || ${backendPort};`
  );
  
  // Update CORS origins with new frontend port
  serverFile = serverFile.replace(
    /http:\/\/localhost:(\d+)/g,
    (match, port) => {
      // Only replace if it looks like a frontend port (not 3001)
      if (port === '3001') return match;
      return `http://localhost:${frontendPort}`;
    }
  );
  
  fs.writeFileSync(SERVER_FILE, serverFile, 'utf8');
  console.log('✅ Updated migration/backend/server.js');
  
  // 4. Create or update backend .env
  let backendEnv = '';
  if (fs.existsSync(BACKEND_ENV)) {
    backendEnv = fs.readFileSync(BACKEND_ENV, 'utf8');
    if (backendEnv.includes('PORT=')) {
      backendEnv = backendEnv.replace(/PORT=\d+/g, `PORT=${backendPort}`);
    } else {
      backendEnv += `\nPORT=${backendPort}\n`;
    }
  } else {
    backendEnv = `PORT=${backendPort}\n`;
  }
  fs.writeFileSync(BACKEND_ENV, backendEnv, 'utf8');
  console.log('✅ Updated migration/backend/.env');
  
  console.log('\n✅ Port configuration updated successfully!\n');
  console.log('New configuration:');
  console.log(`  Frontend: http://localhost:${frontendPort}`);
  console.log(`  Backend:  http://localhost:${backendPort}/api`);
  console.log('\n⚠️  Restart both servers for changes to take effect:');
  console.log('   npm run dev-full\n');
  
  rl.close();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});

