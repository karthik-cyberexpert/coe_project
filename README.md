# COE Management System

## Overview
Center of Excellence (COE) Academic Management System - A full-stack web application for managing academic departments, subjects, and student data sheets.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express.js (Port 3001)
- **Database**: MySQL 8.0
- **Authentication**: JWT-based custom auth
- **UI Framework**: Shadcn/UI + Radix UI + Tailwind CSS

## Tech Stack
- React 18 with TypeScript
- Vite for build tooling
- React Router for routing
- TanStack Query for data fetching
- MySQL database with custom REST API
- JWT authentication
- Shadcn/UI components
- Tailwind CSS for styling

## Features
- Role-based access control (Admin, CEO, Sub-Admin, Staff)
- Department management
- Subject management
- Sheet upload and management
- Excel file import/export
- PDF generation
- Real-time data updates

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or pnpm

### Backend Setup
1. Navigate to backend directory:
```bash
cd migration/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment (.env file is pre-configured):
```
PORT=3001
DB_HOST=localhost
DB_USER=coe_app
DB_PASSWORD=CoeApp@2024
DB_NAME=coe_project
DB_PORT=3306
```

4. Set up MySQL database:
```bash
# Run mysql_schema.sql
# Run seed_data.sql for test data
```

5. Start backend server:
```bash
npm start
```

### Frontend Setup
1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Access application:
- Frontend: http://localhost:5173 (or auto-assigned port)
- Backend API: http://localhost:3001/api

## Test Credentials
Password for all test users: `Test@123`
- Admin: admin@coe.com
- CEO: ceo@coe.com
- Sub-Admin: subadmin@coe.com
- Staff: staff@coe.com

## Project Structure
```
coe_project/
├── migration/
│   ├── backend/              # Express.js API server
│   ├── mysql_schema.sql      # Database schema
│   └── seed_data.sql         # Test data
├── src/
│   ├── components/           # React components
│   ├── pages/               # Page components
│   ├── lib/                 # MySQL client adapter
│   ├── contexts/            # React contexts
│   └── integrations/        # API integrations
└── public/                  # Static assets
```

## Documentation
- `migration/MIGRATION_GUIDE.md` - Complete migration guide
- `migration/MANUAL_MIGRATION_STEPS.md` - Step-by-step setup
- `DEPLOYMENT_SUMMARY.md` - Deployment information

## License
Private project
