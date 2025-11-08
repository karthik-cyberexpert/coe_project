import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import Sidebar from '@/components/Sidebar';

interface Profile {
  full_name: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const getSessionData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          // Create a fallback profile object if fetching fails
          setProfile({ full_name: null });
        } else {
          setProfile(profileData);
        }
      } else {
        navigate('/login');
      }
    };
    getSessionData();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!user || !profile) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar user={user} profile={profile} onSignOut={handleSignOut} />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-4">Welcome, {profile.full_name || user.email}!</h1>
        <p className="text-gray-600">Your dashboard content goes here.</p>
      </main>
    </div>
  );
};

export default Dashboard;