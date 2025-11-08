import { createContext } from 'react';
import { User } from '@supabase/supabase-js';

export interface Profile {
  full_name: string | null;
  is_admin: boolean | null;
  is_ceo: boolean | null;
}

export interface DashboardContextType {
  user: User | null;
  profile: Profile | null;
}

export const DashboardContext = createContext<DashboardContextType>({ user: null, profile: null });