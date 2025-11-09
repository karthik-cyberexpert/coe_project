import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import Sidebar from '@/components/Sidebar';
import { DashboardContext, Profile } from '@/contexts/DashboardContext';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSessionData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('full_name, is_admin, is_ceo, is_sub_admin, is_staff')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfile({ full_name: null, is_admin: false, is_ceo: false, is_sub_admin: false, is_staff: false });
        } else {
          setProfile(profileData);
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