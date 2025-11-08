import UserProfile from "./UserProfile";
import { User } from "@supabase/supabase-js";
import { NavLink } from "react-router-dom";
import { Sheet, Book, Building2 } from "lucide-react";

interface Profile {
  full_name: string | null;
  is_admin: boolean | null;
}

interface SidebarProps {
  user: User;
  profile: Profile;
  onSignOut: () => void;
}

const navItems = [
  { href: "/sheets", icon: Sheet, label: "Sheets" },
  { href: "/subjects", icon: Book, label: "Subjects" },
  { href: "/departments", icon: Building2, label: "Departments" },
];

const Sidebar = ({ user, profile, onSignOut }: SidebarProps) => {
  return (
    <aside className="w-64 h-screen bg-gray-100 border-r flex flex-col flex-shrink-0">
      <UserProfile user={user} profile={profile} onSignOut={onSignOut} />
      {profile.is_admin && (
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-200 ${
                  isActive ? "bg-gray-300 font-semibold" : ""
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;