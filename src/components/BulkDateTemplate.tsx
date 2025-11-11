import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Sheet } from "@/pages/Sheets";

interface BulkDateTemplateProps {
  subjects: { id: string; subject_code: string; subject_name: string }[];
  departments: { id: string; department_name: string }[];
}

const BulkDateTemplate = ({ subjects, departments }: BulkDateTemplateProps) => {
  const handleDownloadTemplate = async () => {
    const toastId = showLoading("Fetching all sheets for template...");
    
    try {
      // Fetch all sheets along with their department and subject details
      const { data: sheetsData, error } = await supabase
        .from('sheets')
        .select(`
          id, 
          sheet_name, 
          year, 
          batch, 
          start_date, 
          end_date,
          subjects (subject_code, subject_name),
          departments (department_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (sheetsData.length === 0) {
        dismissToast(toastId);
        showError("No sheets found in the database.");
        return;
      }
      
      const templateData = sheetsData.map((sheet: Sheet & { 
        year: string, 
        batch: string, 
        subjects: { subject_code: string, subject_name: string } | null,
        departments: { department_name: string } | null,
      }) => {
        
        const startDate = sheet.start_date ? new Date(sheet.start_date).toISOString().split('T')[0] : '';
        const endDate = sheet.end_date ? new Date(sheet.end_date).toISOString().split('T')[0] : '';
        
        return {
          sheet_id: sheet.id,
          sheet_name: sheet.sheet_name,
          subject_code: sheet.subjects?.subject_code || 'N/A',
          subject_name: sheet.subjects?.subject_name || 'N/A',
          department_name: sheet.departments?.department_name || 'N/A',
          academic_term: sheet.year || 'N/A',
          semester: sheet.batch || 'N/A',
          start_date: startDate, // YYYY-MM-DD format
          end_date: endDate, // YYYY-MM-DD format
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "SheetDates");
      XLSX.writeFile(workbook, "all_sheet_dates_template.xlsx");
      
      dismissToast(toastId);
      showSuccess("Template downloaded successfully.");

    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to download template.");
    }
  };

  return (
    <Button onClick={handleDownloadTemplate} variant="outline">
      <Download className="w-4 h-4 mr-2" />
      Download Date Template
    </Button>
  );
};

export default BulkDateTemplate;