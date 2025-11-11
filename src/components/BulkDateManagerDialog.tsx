import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useState, useRef } from "react";
import * as XLSX from 'xlsx';
import * as z from 'zod';
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { BulkUploadConfirmationDialog } from "@/components/BulkUploadConfirmationDialog";
import { supabase } from "@/integrations/supabase/client";

const dateSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().nullable().transform(e => e === "" ? null : e),
  z.null(),
  z.undefined(),
]);

const uploadSchema = z.object({
  sheet_id: z.string().uuid("sheet_id must be a valid UUID."),
  sheet_name: z.string(),
  subject_code: z.string(),
  subject_name: z.string(),
  department_name: z.string(),
  academic_term: z.string(),
  semester: z.string(),
  start_date: dateSchema,
  end_date: dateSchema,
});

interface BulkDateManagerDialogProps {
  onSuccess: () => void;
  selectedSubject: string;
}

const BulkDateManagerDialog = ({ onSuccess, selectedSubject }: BulkDateManagerDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [updatesToApply, setUpdatesToApply] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const toastId = showLoading("Processing uploaded file...");
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheet found in the file.");
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        const parsedData = z.array(uploadSchema).parse(json);
        if (parsedData.length === 0) throw new Error("The file is empty or doesn't contain valid data.");

        const updates = parsedData
          .filter(row => row.sheet_id && row.subject_code)
          .map(row => ({
            id: row.sheet_id,
            start_date: row.start_date,
            end_date: row.end_date,
          }));

        if (updates.length === 0) throw new Error("No valid sheet IDs found for update.");

        setPreviewData(parsedData.map(row => ({ ...row, status: 'matched' })));
        setUpdatesToApply(updates);
        setIsConfirmationOpen(true);
        dismissToast(toastId);
      } catch (error) {
        dismissToast(toastId);
        showError(error instanceof Error ? `File processing failed: ${error.message}` : "An unexpected error occurred during file processing.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmUpload = async () => {
    if (updatesToApply.length === 0) return;
    setIsUploading(true);
    const toastId = showLoading(`Updating ${updatesToApply.length} sheets...`);

    try {
      // Perform bulk update using a transaction-like approach (Supabase RPC or multiple updates)
      // Since Supabase doesn't support bulk UPDATE with different WHERE clauses easily, we iterate.
      // For simplicity and robustness, we'll use a single RPC call if available, but since we don't have a custom RPC, we iterate.
      
      const updatePromises = updatesToApply.map(update => 
        supabase.from('sheets')
          .update({ start_date: update.start_date, end_date: update.end_date })
          .eq('id', update.id)
      );

      const results = await Promise.all(updatePromises);
      const failedUpdates = results.filter(r => r.error);

      if (failedUpdates.length > 0) {
        throw new Error(`${failedUpdates.length} updates failed. Check console for details.`);
      }

      dismissToast(toastId);
      showSuccess(`${updatesToApply.length} sheets updated successfully!`);
      onSuccess();
      setIsConfirmationOpen(false);
      setIsDialogOpen(false);
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? `Bulk update failed: ${error.message}` : "An unexpected error occurred during update.");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmationHeaders = [
    { key: 'sheet_name', label: 'Sheet Name' },
    { key: 'subject_code', label: 'Subject Code' },
    { key: 'academic_term', label: 'Academic Term' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
  ];

  return (
    <>
      <Button onClick={() => fileInputRef.current?.click()} disabled={!selectedSubject}>
        <Upload className="w-4 h-4 mr-2" />
        Bulk Upload Dates
      </Button>
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx, .xls" />

      <BulkUploadConfirmationDialog 
        isOpen={isConfirmationOpen} 
        onClose={() => setIsConfirmationOpen(false)} 
        onConfirm={handleConfirmUpload} 
        data={previewData} 
        headers={confirmationHeaders} 
        isUploading={isUploading} 
      />
    </>
  );
};

export default BulkDateManagerDialog;