import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AddSubjectForm from "@/components/AddSubjectForm";
import EditSubjectForm from "@/components/EditSubjectForm";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import * as XLSX from 'xlsx';
import * as z from 'zod';
import { BulkUploadConfirmationDialog } from "@/components/BulkUploadConfirmationDialog";
import { MoreHorizontal } from "lucide-react";

export interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  department_id: string | null;
  departments: { department_name: string } | null;
}

const subjectSchema = z.object({
  subject_code: z.string({ required_error: "subject_code is required." }).min(1),
  subject_name: z.string({ required_error: "subject_name is required." }).min(1),
  department_code: z.string().optional(),
});

const Subjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [confirmationData, setConfirmationData] = useState<any[]>([]);
  const [subjectsToInsert, setSubjectsToInsert] = useState<any[]>([]);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSubjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subjects")
      .select("*, departments(department_name)")
      .order('created_at', { ascending: false });

    if (error) {
      showError("Failed to fetch subjects.");
    } else {
      setSubjects(data as Subject[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleDelete = async () => {
    if (!subjectToDelete) return;
    const { error } = await supabase.from("subjects").delete().eq("id", subjectToDelete.id);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Subject deleted successfully.");
      fetchSubjects();
    }
    setSubjectToDelete(null);
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { subject_code: "CS101", subject_name: "Introduction to Computer Science", department_code: "CSE" },
      { subject_code: "PH101", subject_name: "Engineering Physics", department_code: "" },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subjects");
    XLSX.utils.sheet_add_aoa(worksheet, [["(Leave department_code empty for Common subjects)"]], { origin: "D1" });
    XLSX.writeFile(workbook, "subject_template.xlsx");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const { data: departmentsData, error: deptError } = await supabase.from('departments').select('id, department_code');
        if (deptError) throw new Error("Could not fetch departments for validation.");
        const departmentCodeToIdMap = new Map(departmentsData.map(dept => [dept.department_code, dept.id]));
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheet found in the file.");
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        const parsedData = z.array(subjectSchema).parse(json);
        if (parsedData.length === 0) throw new Error("The file is empty or doesn't contain valid data.");
        const finalSubjectsToInsert = parsedData.map(subject => {
          const department_code = subject.department_code?.trim();
          const department_id = department_code ? departmentCodeToIdMap.get(department_code) : null;
          if (department_code && department_id === undefined) {
            throw new Error(`Invalid department_code: "${department_code}" for subject "${subject.subject_code}".`);
          }
          return { subject_code: subject.subject_code, subject_name: subject.subject_name, department_id: department_id };
        });
        setConfirmationData(parsedData);
        setSubjectsToInsert(finalSubjectsToInsert);
        setIsConfirmationOpen(true);
      } catch (error) {
        showError(error instanceof Error ? `File processing failed: ${error.message}` : "An unexpected error occurred.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmUpload = async () => {
    setIsUploading(true);
    const toastId = showLoading("Uploading data...");
    try {
      const { error } = await supabase.from('subjects').insert(subjectsToInsert);
      if (error) throw new Error(error.message);
      dismissToast(toastId);
      showSuccess(`${subjectsToInsert.length} subjects uploaded successfully!`);
      fetchSubjects();
      setIsConfirmationOpen(false);
      setConfirmationData([]);
      setSubjectsToInsert([]);
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? `Upload failed: ${error.message}` : "An unexpected error occurred.");
    } finally {
      setIsUploading(false);
    }
  };

  const subjectHeaders = [
    { key: 'subject_code', label: 'Code' },
    { key: 'subject_name', label: 'Name' },
    { key: 'department_code', label: 'Department Code' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Subjects</h1>
        <div className="flex gap-2">
          <Button onClick={handleDownloadTemplate}>Download Template</Button>
          <Button onClick={() => fileInputRef.current?.click()}>Bulk Upload</Button>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx, .xls" />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button>Add Subject</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Subject</DialogTitle></DialogHeader>
              <AddSubjectForm onSuccess={() => { setIsAddDialogOpen(false); fetchSubjects(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <BulkUploadConfirmationDialog isOpen={isConfirmationOpen} onClose={() => setIsConfirmationOpen(false)} onConfirm={handleConfirmUpload} data={confirmationData} headers={subjectHeaders} isUploading={isUploading} />

      <Dialog open={!!subjectToEdit} onOpenChange={(isOpen) => !isOpen && setSubjectToEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Subject</DialogTitle></DialogHeader>
          {subjectToEdit && <EditSubjectForm subject={subjectToEdit} onSuccess={() => { setSubjectToEdit(null); fetchSubjects(); }} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!subjectToDelete} onOpenChange={(isOpen) => !isOpen && setSubjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the subject.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading ? <p>Loading subjects...</p> : (
        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject Code</TableHead>
                <TableHead>Subject Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.length > 0 ? subjects.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.subject_code}</TableCell>
                  <TableCell>{sub.subject_name}</TableCell>
                  <TableCell>{sub.departments?.department_name || "Common"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSubjectToEdit(sub)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSubjectToDelete(sub)} className="text-red-600 hover:!text-red-600 hover:!bg-red-50">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="text-center">No subjects found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Subjects;