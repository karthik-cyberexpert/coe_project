import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";

// This interface needs to be exported from the Subjects page
interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  department_id: string | null;
}

const formSchema = z.object({
  subject_code: z.string().min(2, "Subject code is required"),
  subject_name: z.string().min(2, "Subject name is required"),
  department_id: z.string().optional(),
});

interface Department {
  id: string;
  department_name: string;
}

interface EditSubjectFormProps {
  subject: Subject;
  onSuccess: () => void;
}

const EditSubjectForm = ({ subject, onSuccess }: EditSubjectFormProps) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      department_id: subject.department_id || "common",
    },
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase.from("departments").select("id, department_name");
      if (error) {
        showError("Failed to fetch departments for dropdown.");
      } else {
        setDepartments(data);
      }
    };
    fetchDepartments();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const submissionData = {
      ...values,
      department_id: values.department_id === "common" || !values.department_id ? null : values.department_id,
    };

    const { error } = await supabase
      .from("subjects")
      .update(submissionData)
      .eq("id", subject.id);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Subject updated successfully!");
      onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="subject_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g., CS101" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Introduction to Programming" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="department_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.department_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="common">Common</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
};

export default EditSubjectForm;