import { createContext } from 'react';

// Custom User type (replacing Supabase User)
export interface User {
  id: string;
  email: string;
  email_verified: boolean;
}

export interface Profile {
  full_name: string | null;
  is_admin: boolean | null;
  is_ceo: boolean | null;
  is_sub_admin: boolean | null;
  is_staff: boolean | null;
}

export interface DashboardContextType {
  user: User | null;
  profile: Profile | null;
}

export const DashboardContext = createContext<DashboardContextType>({ user: null, profile: null });
