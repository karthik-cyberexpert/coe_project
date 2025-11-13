import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "@/contexts/DashboardContext";

interface Profile {
  full_name: string | null;
}

interface UserProfileProps {
  user: User;
  profile: Profile;
  onSignOut: () => void;
}

const UserProfile = ({ user, profile, onSignOut }: UserProfileProps) => {
  const getInitials = (name: string | null) => {
    if (!name) return user.email ? user.email.charAt(0).toUpperCase() : "?";
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex flex-col items-center p-4 border-b">
      <Avatar className="w-16 h-16 mb-2">
        <AvatarImage src="" alt={profile.full_name || user.email || ''} />
        <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
      </Avatar>
      <p className="text-lg font-semibold text-gray-900">{profile.full_name || 'User'}</p>
      <Button variant="ghost" size="sm" className="mt-4" onClick={onSignOut}>
        Sign Out
      </Button>
    </div>
  );
};

export default UserProfile;