import UserProfile from "./UserProfile";
import { User } from "@supabase/supabase-js";

interface Profile {
  full_name: string | null;
}

interface SidebarProps {
  user: User;
  profile: Profile;
  onSignOut: () => void;
}

const Sidebar = ({ user, profile, onSignOut }: SidebarProps) => {
  return (
    <aside className="w-64 h-screen bg-gray-100 border-r flex flex-col flex-shrink-0">
      <UserProfile user={user} profile={profile} onSignOut={onSignOut} />
      <nav className="flex-1 p-4">
        {/* Navigation links can be added here in the future */}
      </nav>
    </aside>
  );
};

export default Sidebar;