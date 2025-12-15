import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { API_URL } from "@/lib/mysqlClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { showError, showSuccess } from "@/utils/toast";
import { useEffect } from "react";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  role: z.enum(["admin", "ceo", "sub_admin", "staff"]).default("staff"),
});

interface User {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_ceo: boolean;
  is_sub_admin: boolean;
  is_staff: boolean;
}

interface EditUserFormProps {
  user: User;
  onSuccess: () => void;
}

const EditUserForm = ({ user, onSuccess }: EditUserFormProps) => {
  // Determine current role from boolean flags
  const getCurrentRole = () => {
    if (user.is_admin) return "admin";
    if (user.is_ceo) return "ceo";
    if (user.is_sub_admin) return "sub_admin";
    return "staff";
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user.email,
      full_name: user.full_name || "",
      password: "",
      role: getCurrentRole(),
    },
  });

  // Update form when user prop changes
  useEffect(() => {
    const getCurrentRole = () => {
      if (user.is_admin) return "admin";
      if (user.is_ceo) return "ceo";
      if (user.is_sub_admin) return "sub_admin";
      return "staff";
    };

    form.reset({
      email: user.email,
      full_name: user.full_name || "",
      password: "",
      role: getCurrentRole(),
    });
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Map role to boolean flags
      const payload: any = {
        email: values.email,
        full_name: values.full_name,
        is_admin: values.role === "admin",
        is_ceo: values.role === "ceo",
        is_sub_admin: values.role === "sub_admin",
        is_staff: values.role === "staff",
      };

      // Add password only if provided
      if (values.password && values.password !== "") {
        payload.password = values.password;
      }

      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      showSuccess("User updated successfully!");
      onSuccess();
    } catch (error: any) {
      showError(error.message || "Failed to update user");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Leave empty to keep current password" 
                  type="password" 
                  {...field} 
                />
              </FormControl>
              <FormDescription className="text-xs">
                Only fill this if you want to change the password
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Assign Role</FormLabel>
              <FormDescription className="text-sm text-gray-500">
                Select one role for this user
              </FormDescription>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="admin" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Admin - Full system access
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="ceo" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      CEO - CEO dashboard access
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="sub_admin" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Sub-Admin - Limited admin access
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="staff" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Staff - Basic user access
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? "Updating..." : "Update User"}
        </Button>
      </form>
    </Form>
  );
};

export default EditUserForm;

