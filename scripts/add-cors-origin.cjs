#!/usr/bin/env node

/**
 * Add IP/Origin to CORS AllowedOrigins
 * This script adds an origin to the server's CORS configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SERVER_FILE = path.join(__dirname, '..', 'migration', 'backend', 'server.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('=== Add CORS Origin ===\n');
  
  // Read the server file
  let serverContent = fs.readFileSync(SERVER_FILE, 'utf8');
  
  // Find the allowedOrigins array (handles .filter(Boolean) style)
  const allowedOriginsRegex = /const\s+allowedOrigins\s*=\s*\[([\s\S]*?)\]\s*\.filter\(Boolean\);/;
  const match = serverContent.match(allowedOriginsRegex);
  
  if (!match) {
    console.error('❌ Could not find allowedOrigins array in server.js');
    rl.close();
    process.exit(1);
  }
  
  // Parse existing origins
  const originsBlock = match[1];
  const existingOrigins = originsBlock
    .split('\n')
    .map(line => line.trim().replace(/,$/, ''))
    .filter(Boolean)
    .map(line => line.replace(/^['"]|['"]$/g, '')) // strip quotes if present
    .filter(Boolean);

  console.log('Current allowed origins:');
  existingOrigins.forEach((origin, i) => console.log(`  ${i + 1}. ${origin}`));
  console.log();
  
  // Ask for new origin
  const newOrigin = (await question('Enter the IP address or origin to allow (e.g., http://192.168.1.100:8080): ')).trim();
  
  if (!newOrigin) {
    console.log('❌ No origin provided. Exiting.');
    rl.close();
    return;
  }
  
  // Validate format
  if (!/^https?:\/\/.+/.test(newOrigin)) {
    console.log('❌ Origin must start with http:// or https://');
    rl.close();
    return;
  }
  
  // Check if already exists
  if (existingOrigins.includes(newOrigin)) {
    console.log(`⚠️  Origin "${newOrigin}" already exists in allowedOrigins`);
    rl.close();
    return;
  }
  
  // Reconstruct array preserving non-quoted entries like process.env.FRONTEND_URL
  const quoted = existingOrigins.filter(o => o.startsWith('http://') || o.startsWith('https://'));
  const nonQuoted = existingOrigins.filter(o => !(o.startsWith('http://') || o.startsWith('https://')));

  // Ensure process.env.FRONTEND_URL stays last if present
  const filteredNonQuoted = nonQuoted.filter(o => o !== 'process.env.FRONTEND_URL');

  const newOriginsArray = [
    ...quoted,
    newOrigin,
    ...filteredNonQuoted,
  ];
  if (nonQuoted.includes('process.env.FRONTEND_URL')) {
    newOriginsArray.push('process.env.FRONTEND_URL');
  }

  const newOriginsBlock = newOriginsArray
    .map(origin => origin.startsWith('http') ? `  '${origin}',` : `  ${origin},`)
    .join('\n')
    .replace(/,\s*$/, ''); // trailing comma safety
  
  const newAllowedOriginsCode = `const allowedOrigins = [\n${newOriginsBlock}\n].filter(Boolean);`;
  
  // Replace in file
  serverContent = serverContent.replace(allowedOriginsRegex, newAllowedOriginsCode);
  
  // Write back
  fs.writeFileSync(SERVER_FILE, serverContent, 'utf8');
  
  console.log(`\n✅ Successfully added "${newOrigin}" to CORS allowed origins`);
  console.log('\n⚠️  Restart the backend server for changes to take effect:');
  console.log('   cd migration/backend && npm run dev\n');
  
  rl.close();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});

