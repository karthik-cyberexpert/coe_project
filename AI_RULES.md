# Tech Stack

## Architecture
- React 18 + TypeScript + Vite
- MySQL 8.0 backend with custom Node.js/Express API
- JWT-based authentication (NO Supabase)
- Custom MySQL adapter provides database access

## Development Guidelines
- You are building a React application with TypeScript
- Use React Router - KEEP routes in src/App.tsx
- Always put source code in the src folder
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include new components
- ALWAYS use shadcn/ui library components
- Tailwind CSS: use for all styling (layout, spacing, colors, etc.)

## Backend Integration
- Backend API runs on http://localhost:3001/api
- Use the MySQL client adapter from `@/integrations/supabase/client`
- The adapter exports `supabase` object with MySQL-compatible API
- Authentication uses JWT tokens (stored in localStorage)
- All database operations go through REST API endpoints

## Database Access Pattern
```typescript
import { supabase } from '@/integrations/supabase/client';

// Auth
supabase.auth.signInWithPassword({ email, password })
supabase.auth.getUser()
supabase.auth.signOut()

// Data queries
supabase.from('table').select('*')
supabase.from('table').insert(data)
supabase.from('table').update(data).eq('id', id)
supabase.from('table').delete().eq('id', id)
```

## Available Packages
- lucide-react - Icons
- shadcn/ui - ALL components already installed
- Radix UI - ALL components already installed
- react-hook-form + zod - Form validation
- xlsx - Excel file processing
- jspdf - PDF generation

## Important Notes
- NO Supabase packages - fully migrated to MySQL
- Use prebuilt shadcn/ui components (don't edit them)
- Make new components if you need custom behavior
- All auth and data flows through custom MySQL adapter
