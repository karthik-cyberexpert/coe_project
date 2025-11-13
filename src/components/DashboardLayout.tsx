import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { DashboardContext, User, Profile } from '@/contexts/DashboardContext';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSessionData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 DashboardLayout - User data:', user);
      
      if (user) {
        setUser(user);
        
        // Profile data is included in the user object from MySQL adapter
        // @ts-ignore - profile exists in our custom user object
        if (user.profile) {
          // @ts-ignore
          console.log('✅ Profile found:', user.profile);
          setProfile(user.profile);
        } else {
          // Fallback: derive profile fields from flat user object (MySQL adapter)
          console.warn('⚠️ No profile found in user object, deriving from user flags');
          const anyUser: any = user as any;
          const derived: Profile = {
            full_name: anyUser.full_name ?? null,
            is_admin: !!anyUser.is_admin,
            is_ceo: !!anyUser.is_ceo,
            is_sub_admin: !!anyUser.is_sub_admin,
            is_staff: anyUser.is_staff !== undefined ? !!anyUser.is_staff : true,
          };
          setProfile(derived);
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    };
    getSessionData();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading || !user || !profile) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <DashboardContext.Provider value={{ user, profile }}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar user={user} profile={profile} onSignOut={handleSignOut} />
        <main className="flex-1 p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </DashboardContext.Provider>
  );
};

export default DashboardLayout;