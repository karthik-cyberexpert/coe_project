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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";

const formSchema = z.object({
  internal_examiner_name: z.string().min(1, "Name is required"),
  internal_examiner_designation: z.string().min(1, "Designation is required"),
  internal_examiner_department: z.string().min(1, "Department is required"),
  internal_examiner_college: z.string().min(1, "College is required"),
  chief_name: z.string().optional(),
  chief_designation: z.string().optional(),
  chief_department: z.string().optional(),
  chief_college: z.string().optional(),
});

interface ExaminerDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: z.infer<typeof formSchema>) => void;
  sheetId: string;
  bundleNumber: string;
}

const ExaminerDetailsDialog = ({ isOpen, onClose, onSuccess, sheetId, bundleNumber }: ExaminerDetailsDialogProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      internal_examiner_name: "",
      internal_examiner_designation: "",
      internal_examiner_department: "",
      internal_examiner_college: "",
      chief_name: "",
      chief_designation: "",
      chief_department: "",
      chief_college: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const toastId = showLoading("Saving examiner details...");
    try {
      // Check if examiner details already exist
      const { data: existing, error: checkError } = await supabase
        .from("bundle_examiners")
        .select('*')
        .eq('sheet_id', sheetId)
        .eq('bundle_number', bundleNumber)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existing) {
        dismissToast(toastId);
        showError("Examiner details already exist for this bundle.");
        return;
      }

      const { error } = await supabase.from("bundle_examiners").insert({
        sheet_id: sheetId,
        bundle_number: bundleNumber,
        ...values,
      });

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Details saved successfully!");
      onSuccess(values);
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to save details.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Submit Examiner Details</DialogTitle>
          <DialogDescription>
            Please provide the following details. This action is final and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="text-lg font-semibold">Internal Examiner</h3>
                <FormField control={form.control} name="internal_examiner_name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="internal_examiner_designation" render={({ field }) => (
                  <FormItem><FormLabel>Designation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="internal_examiner_department" render={({ field }) => (
                  <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="internal_examiner_college" render={({ field }) => (
                  <FormItem><FormLabel>College</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="text-lg font-semibold">Chief (Optional)</h3>
                <FormField control={form.control} name="chief_name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="chief_designation" render={({ field }) => (
                  <FormItem><FormLabel>Designation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="chief_department" render={({ field }) => (
                  <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="chief_college" render={({ field }) => (
                  <FormItem><FormLabel>College</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Submitting..." : "Submit and Finalize"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ExaminerDetailsDialog;