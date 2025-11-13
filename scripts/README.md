# Utility Scripts

This directory contains utility scripts to manage your COE project configuration.

## Available Scripts

### 1. Add CORS Origin (`add-cors-origin.js`)

Add a new IP address or origin to the backend's CORS allowedOrigins configuration.

**Usage:**
```bash
npm run add-cors
```

**What it does:**
- Shows current allowed origins
- Prompts for a new IP/origin (e.g., `http://192.168.56.1:8080`)
- Validates the format (must start with http:// or https://)
- Adds it to the `allowedOrigins` array in `migration/backend/server.js`
- Automatically checks for duplicates

**Example:**
```bash
npm run add-cors
# Enter: http://192.168.1.100:8080
```

**Important:** Restart the backend server after adding origins:
```bash
cd migration/backend
npm run dev
```

---

### 2. Change Ports (`change-ports.js`)

Update frontend and backend port configurations across all files.

**Usage:**
```bash
npm run change-ports
```

**What it does:**
- Prompts for new frontend port (default: 8080)
- Prompts for new backend port (default: 3001)
- Updates the following files:
  - `vite.config.ts` - Frontend dev server port
  - `.env.local` - Backend API URL
  - `migration/backend/server.js` - Backend server port and CORS origins
  - `migration/backend/.env` - Backend PORT variable

**Example:**
```bash
npm run change-ports
# Frontend port: 3000
# Backend port: 5000
```

**Important:** Restart both servers after changing ports using `npm run dev-full`

---

### 3. Run Both Servers (`dev-full`)

Start both frontend and backend development servers simultaneously.

**Usage:**
```bash
npm run dev-full
```

**What it does:**
- Starts the Vite frontend dev server (port 8080 by default)
- Starts the Express backend server (port 3001 by default)
- Runs them concurrently with color-coded output:
  - **Cyan** - Frontend logs
  - **Green** - Backend logs

**To stop:** Press `Ctrl+C` once to stop both servers

---

## Quick Setup Guide

### First Time Setup

1. **Install dependencies:**
   ```bash
   # Root (frontend)
   npm install
   
   # Backend
   cd migration/backend
   npm install
   cd ../..
   ```

2. **Configure CORS for your IP:**
   ```bash
   npm run add-cors
   # Enter your IP: http://192.168.56.1:8080
   ```

3. **Start both servers:**
   ```bash
   npm run dev-full
   ```

### Changing Development Ports

If you need to use different ports:

```bash
npm run change-ports
# Frontend: 3000
# Backend: 4000
npm run dev-full
```

---

## Troubleshooting

### CORS Errors

If you get CORS errors:

1. Check your frontend is calling the correct backend URL (`.env.local`)
2. Add your IP to allowed origins: `npm run add-cors`
3. Restart the backend server

### Port Already in Use

If you get "port already in use" error:

1. Change ports using `npm run change-ports`
2. Or kill the process using the port:
   ```powershell
   # Find the process
   netstat -ano | findstr :8080
   
   # Kill it (replace PID with actual process ID)
   taskkill /PID <PID> /F
   ```

### Backend Not Starting

1. Ensure MySQL is running
2. Check database credentials in `migration/backend/.env`
3. Run the database migrations:
   ```bash
   cd migration/backend
   npm run migrate
   ```

---

## Script Development

All scripts are written in Node.js and use:
- `fs` - File system operations
- `path` - Path manipulation
- `readline` - Interactive prompts

To create a new utility script:

1. Create the script in `scripts/` directory
2. Add it to `package.json` scripts section
3. Document it in this README
4. Make it executable with `#!/usr/bin/env node` at the top

---

## Additional Scripts

### Run Scripts Individually

**Frontend only:**
```bash
npm run dev
```

**Backend only:**
```bash
cd migration/backend
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Lint code:**
```bash
npm run lint
```

---

## Environment Variables

### Frontend (`.env.local`)
- `VITE_API_URL` - Backend API URL (e.g., `http://localhost:3001/api`)
- `VITE_APP_NAME` - Application name

### Backend (`migration/backend/.env`)
- `PORT` - Backend server port (default: 3001)
- `DB_HOST` - MySQL host (default: localhost)
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name (default: coe_project)
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - Token expiration (default: 24h)
- `NODE_ENV` - Environment (development/production)

---

## Contact

For issues or questions, check the main project README or contact the development team.

