import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Sheet } from "@/pages/Sheets";

interface BulkDateTemplateProps {
  selectedSubject: string;
  selectedDepartment: string;
  subjects: { id: string; subject_code: string; subject_name: string }[];
  departments: { id: string; department_name: string }[];
}

const BulkDateTemplate = ({ selectedSubject, selectedDepartment, subjects, departments }: BulkDateTemplateProps) => {
  const handleDownloadTemplate = async () => {
    if (!selectedSubject || !selectedDepartment) {
      showError("Please select a Department and Subject first.");
      return;
    }

    const toastId = showLoading("Fetching sheets for template...");
    
    try {
      const { data: sheetsData, error } = await supabase
        .from('sheets')
        .select('id, sheet_name, year, batch')
        .eq('subject_id', selectedSubject)
        .eq('department_id', selectedDepartment)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (sheetsData.length === 0) {
        dismissToast(toastId);
        showError("No sheets found for the selected criteria.");
        return;
      }

      const subjectMap = new Map(subjects.map(s => [s.id, s]));
      const departmentMap = new Map(departments.map(d => [d.id, d]));
      
      const templateData = sheetsData.map((sheet: Sheet & { year: string, batch: string }) => {
        const subject = subjectMap.get(selectedSubject);
        const department = departmentMap.get(selectedDepartment);
        
        return {
          sheet_id: sheet.id,
          sheet_name: sheet.sheet_name,
          subject_code: subject?.subject_code || 'N/A',
          subject_name: subject?.subject_name || 'N/A',
          department_name: department?.department_name || 'N/A',
          academic_term: sheet.year,
          semester: sheet.batch,
          start_date: sheet.start_date ? new Date(sheet.start_date).toISOString().split('T')[0] : '', // YYYY-MM-DD format
          end_date: sheet.end_date ? new Date(sheet.end_date).toISOString().split('T')[0] : '', // YYYY-MM-DD format
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "SheetDates");
      XLSX.writeFile(workbook, "sheet_dates_template.xlsx");
      
      dismissToast(toastId);
      showSuccess("Template downloaded successfully.");

    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to download template.");
    }
  };

  return (
    <Button onClick={handleDownloadTemplate} disabled={!selectedSubject || !selectedDepartment} variant="outline">
      <Download className="w-4 h-4 mr-2" />
      Download Date Template
    </Button>
  );
};

export default BulkDateTemplate;