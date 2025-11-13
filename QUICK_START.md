# Quick Start Guide

## 🎯 Your CORS Issue is Fixed!

I've already added `http://192.168.56.1:8080` to your backend's allowed origins. Just restart your backend server:

```bash
cd migration/backend
npm run dev
```

Or use the new unified command from the project root:

```bash
npm run dev-full
```

---

## 🚀 New Utility Scripts

### 1. Start Both Servers (Frontend + Backend)

```bash
npm run dev-full
```

This starts:
- **Frontend** on http://localhost:8080 (cyan output)
- **Backend** on http://localhost:3001 (green output)

Press `Ctrl+C` once to stop both.

---

### 2. Add CORS Origin (for new IPs)

```bash
npm run add-cors
```

**When to use:** When you access your app from a different IP address and get CORS errors.

**Example:**
```
Enter IP: http://192.168.1.50:8080
✅ Successfully added to CORS
```

---

### 3. Change Ports

```bash
npm run change-ports
```

**When to use:** When you need to use different ports (e.g., port conflict).

**Example:**
```
Frontend port: 3000
Backend port: 5000
✅ Updated all config files
```

---

## 📁 Project Structure

```
coe_project/
├── scripts/              # Utility scripts
│   ├── add-cors-origin.js
│   ├── change-ports.js
│   └── README.md
├── migration/
│   └── backend/         # Backend server
│       └── server.js
├── src/                 # Frontend React app
├── vite.config.ts       # Frontend config
├── .env.local           # Frontend environment
└── package.json         # Root scripts
```

---

## 🛠️ Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev-full` | Start both servers |
| `npm run dev` | Frontend only |
| `npm run add-cors` | Add IP to CORS |
| `npm run change-ports` | Change all ports |
| `npm run build` | Build for production |

---

## 🐛 Troubleshooting

### Still getting CORS errors?

1. Make sure backend is running: `cd migration/backend && npm run dev`
2. Check backend console for "✓ Server running on port 3001"
3. Verify your IP in the allowed list: Look for line 49-55 in `migration/backend/server.js`
4. Restart the backend after adding IPs

### Port already in use?

```bash
npm run change-ports
# Enter new ports when prompted
```

### Backend won't start?

1. Check MySQL is running
2. Verify database credentials in `migration/backend/.env`
3. Check the database exists: `mysql -u root -p -e "SHOW DATABASES;"`

---

## 📚 More Info

See `scripts/README.md` for detailed documentation on all utility scripts.

---

## ✅ What Was Done

1. ✅ Added `http://192.168.56.1:8080` to CORS allowed origins
2. ✅ Created `npm run dev-full` - runs both servers simultaneously
3. ✅ Created `npm run add-cors` - interactive IP address addition
4. ✅ Created `npm run change-ports` - bulk port configuration
5. ✅ Installed `concurrently` package for running multiple servers
6. ✅ Comprehensive documentation in `scripts/README.md`

**You're all set! Just run `npm run dev-full` and start developing. 🎉**

