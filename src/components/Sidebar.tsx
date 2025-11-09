import UserProfile from "./UserProfile";
import { User } from "@supabase/supabase-js";
import { NavLink } from "react-router-dom";
import { Sheet, Book, Building2, LayoutDashboard } from "lucide-react";

interface Profile {
  full_name: string | null;
  is_admin: boolean | null;
  is_ceo: boolean | null;
  is_sub_admin: boolean | null;
  is_staff: boolean | null;
}

interface SidebarProps {
  user: User;
  profile: Profile;
  onSignOut: () => void;
}

const commonNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
];

const adminNavItems = [
  { href: "/sheets", icon: Sheet, label: "Sheets" },
  { href: "/subjects", icon: Book, label: "Subjects" },
  { href: "/departments", icon: Building2, label: "Departments" },
];

const coeNavItems = [
  { href: "/coe-sheets", icon: Sheet, label: "View Sheets" },
];

const subAdminNavItems = [
  { href: "/subadmin-sheets", icon: Sheet, label: "Sheets" },
];

const staffNavItems = [
  { href: "/staff-sheets", icon: Sheet, label: "Sheets" },
];

const Sidebar = ({ user, profile, onSignOut }: SidebarProps) => {
  return (
    <aside className="w-64 h-screen bg-gray-100 border-r flex flex-col flex-shrink-0">
      <UserProfile user={user} profile={profile} onSignOut={onSignOut} />
      <nav className="flex-1 p-4 space-y-2">
        {commonNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end
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
        {profile.is_admin && (
          adminNavItems.map((item) => (
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
          ))
        )}
        {profile.is_ceo && (
          coeNavItems.map((item) => (
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
          ))
        )}
        {profile.is_sub_admin && (
          subAdminNavItems.map((item) => (
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
          ))
        )}
        {profile.is_staff && !profile.is_admin && !profile.is_ceo && !profile.is_sub_admin && (
          staffNavItems.map((item) => (
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
          ))
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;