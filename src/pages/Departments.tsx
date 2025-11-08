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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AddDepartmentForm from "@/components/AddDepartmentForm";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import * as XLSX from 'xlsx';
import * as z from 'zod';
import { BulkUploadConfirmationDialog } from "@/components/BulkUploadConfirmationDialog";

interface Department {
  id: string;
  degree: string;
  department_code: string;
  department_name: string;
}

const departmentSchema = z.object({
  degree: z.string({ required_error: "degree is required." }).min(1),
  department_code: z.string({ required_error: "department_code is required." }).min(1),
  department_name: z.string({ required_error: "department_name is required." }).min(1),
});

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any[]>([]);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDepartments = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("departments").select("*").order('created_at', { ascending: false });
    if (error) {
      showError("Failed to fetch departments.");
      console.error(error);
    } else {
      setDepartments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { degree: "B.Tech", department_code: "CSE", department_name: "Computer Science" },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Departments");
    XLSX.writeFile(workbook, "department_template.xlsx");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheet found in the file.");
        
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const parsedData = z.array(departmentSchema).parse(json);
        if (parsedData.length === 0) throw new Error("The file is empty or doesn't contain valid data.");
        
        setConfirmationData(parsedData);
        setIsConfirmationOpen(true);
      } catch (error) {
        if (error instanceof z.ZodError) {
          showError(`Validation failed: ${error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ')}`);
        } else if (error instanceof Error) {
          showError(`File processing failed: ${error.message}`);
        } else {
          showError("An unexpected error occurred during file processing.");
        }
        console.error(error);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmUpload = async () => {
    setIsUploading(true);
    const toastId = showLoading("Uploading data...");

    try {
      const { error } = await supabase.from('departments').insert(confirmationData);
      if (error) throw new Error(error.message);

      dismissToast(toastId);
      showSuccess(`${confirmationData.length} departments uploaded successfully!`);
      fetchDepartments();
      setIsConfirmationOpen(false);
      setConfirmationData([]);
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? `Upload failed: ${error.message}` : "An unexpected error occurred during upload.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const departmentHeaders = [
    { key: 'degree', label: 'Degree' },
    { key: 'department_code', label: 'Code' },
    { key: 'department_name', label: 'Name' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Departments</h1>
        <div className="flex gap-2">
          <Button onClick={handleDownloadTemplate}>Download Template</Button>
          <Button onClick={() => fileInputRef.current?.click()}>Bulk Upload</Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".xlsx, .xls"
          />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Department</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Department</DialogTitle>
              </DialogHeader>
              <AddDepartmentForm
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                  fetchDepartments();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <BulkUploadConfirmationDialog
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={handleConfirmUpload}
        data={confirmationData}
        headers={departmentHeaders}
        isUploading={isUploading}
      />

      {loading ? (
        <p>Loading departments...</p>
      ) : (
        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Degree</TableHead>
                <TableHead>Department Code</TableHead>
                <TableHead>Department Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length > 0 ? (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>{dept.degree}</TableCell>
                    <TableCell>{dept.department_code}</TableCell>
                    <TableCell>{dept.department_name}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No departments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Departments;