import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";

interface UserProfileProps {
  user: User;
  onSignOut: () => void;
}

const UserProfile = ({ user, onSignOut }: UserProfileProps) => {
  const getInitials = (email: string) => {
    return email ? email.charAt(0).toUpperCase() : "?";
  };

  return (
    <div className="flex flex-col items-center p-4 border-b">
      <Avatar className="w-16 h-16 mb-2">
        <AvatarImage src="" alt={user.email} />
        <AvatarFallback>{getInitials(user.email || '')}</AvatarFallback>
      </Avatar>
      <p className="text-sm font-medium text-gray-800 break-all">{user.email}</p>
      <Button variant="ghost" size="sm" className="mt-4" onClick={onSignOut}>
        Sign Out
      </Button>
    </div>
  );
};

export default UserProfile;