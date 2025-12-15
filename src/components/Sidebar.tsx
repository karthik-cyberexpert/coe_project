import UserProfile from "./UserProfile";
import { User } from "@/contexts/DashboardContext";
import { NavLink } from "react-router-dom";
import { Sheet, Book, Building2, LayoutDashboard, Users } from "lucide-react";

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
  { href: "/sheets", icon: Sheet, label: "Manage Sheets" },
  { href: "/subjects", icon: Book, label: "Manage Subjects" },
  { href: "/departments", icon: Building2, label: "Manage Departments" },
  { href: "/users", icon: Users, label: "Manage Users" },
];

const ceoNavItems = [
  { href: "/coe-sheets", icon: Sheet, label: "COE Sheets" },
];

const subAdminNavItems = [
  { href: "/subadmin-sheets", icon: Sheet, label: "Sub-Admin Sheets" },
];

const staffNavItems = [
  { href: "/staff-sheets", icon: Sheet, label: "Staff Sheets" },
];

const Sidebar = ({ user, profile, onSignOut }: SidebarProps) => {
  console.log('🎨 Sidebar - Profile data:', profile);
  console.log('🎨 Sidebar - is_admin:', profile.is_admin);
  console.log('🎨 Sidebar - is_ceo:', profile.is_ceo);
  console.log('🎨 Sidebar - is_sub_admin:', profile.is_sub_admin);
  console.log('🎨 Sidebar - is_staff:', profile.is_staff);
  
  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0 text-sidebar-foreground">
      <UserProfile user={user} profile={profile} onSignOut={onSignOut} />
      <nav className="flex-1 p-4 space-y-2">
        {commonNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md transition-colors duration-200 ${
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"}`} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
        {profile.is_admin && (
          adminNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md transition-colors duration-200 ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))
        )}
        {profile.is_ceo && !profile.is_admin && (
          ceoNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md transition-colors duration-200 ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))
        )}
        {profile.is_sub_admin && !profile.is_admin && !profile.is_ceo && (
          subAdminNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md transition-colors duration-200 ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))
        )}
        {profile.is_staff && !profile.is_admin && !profile.is_ceo && !profile.is_sub_admin && (
          staffNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md transition-colors duration-200 ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70"}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;