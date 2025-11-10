import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, dismissToast, showSuccess, showError } from "@/utils/toast";
import * as XLSX from 'xlsx';
import { Sheet } from "@/pages/StaffSheets";
import ExaminerDetailsDialog from "./ExaminerDetailsDialog";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { numberToWords } from "@/utils/numberToWords";

interface ExaminerDetails {
    internal_examiner_name: string;
    internal_examiner_designation: string;
    internal_examiner_department: string;
    internal_examiner_college: string;
    chief_name?: string;
    chief_designation?: string;
    chief_department?: string;
    chief_college?: string;
}

interface StaffSheetViewerDialogProps {
  isOpen: boolean;
  onClose: (didSave: boolean) => void;
  sheet: Sheet | null;
  sheetData?: Record<string, any>[];
}

const StaffSheetViewerDialog = ({ isOpen, onClose, sheet, sheetData }: StaffSheetViewerDialogProps) => {
  const [fullSheetData, setFullSheetData] = useState<Record<string, any>[]>([]);
  const [bundleOptions, setBundleOptions] = useState<string[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<string>('');
  const [editedData, setEditedData] = useState<Record<string, any>[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [duplicateNumberKey, setDuplicateNumberKey] = useState<string | null>(null);
  const [externalMarkKey, setExternalMarkKey] = useState<string | null>(null);
  
  const [view, setView] = useState<'loading' | 'marks' | 'submitted'>('loading');
  const [examinerDetails, setExaminerDetails] = useState<ExaminerDetails | null>(null);
  const [isExaminerFormOpen, setIsExaminerFormOpen] = useState(false);

  const resetState = () => {
    setFullSheetData([]);
    setBundleOptions([]);
    setSelectedBundle('');
    setEditedData([]);
    setIsSaving(false);
    setLoading(false);
    setDuplicateNumberKey(null);
    setExternalMarkKey(null);
    setView('loading');
    setExaminerDetails(null);
    setIsExaminerFormOpen(false);
  };

  useEffect(() => {
    const loadSheetData = async () => {
      if (!isOpen || !sheet) return;
      resetState();
      setLoading(true);

      try {
        let jsonData: Record<string, any>[] = [];
        if (sheetData) {
          jsonData = sheetData;
        } else {
          const { data: fileData, error: downloadError } = await supabase.storage.from('sheets').download(sheet.file_path);
          if (downloadError) throw downloadError;

          const workbook = XLSX.read(await fileData.arrayBuffer(), { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) throw new Error("No sheet found in the file.");
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
        }
        
        setFullSheetData(jsonData);

        if (jsonData.length > 0) {
            const firstRowKeys = Object.keys(jsonData[0]);
            const dupKey = firstRowKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'duplicatenumber');
            const extKey = firstRowKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'externalmark');
            const subjectCode = sheet.subjects?.subject_code;

            if (!dupKey || !extKey || !subjectCode) throw new Error("Sheet is missing required columns or subject code.");
            
            setDuplicateNumberKey(dupKey);
            setExternalMarkKey(extKey);

            const presentStudents = jsonData
                .filter(row => row[dupKey] !== null && row[dupKey] !== undefined && String(row[dupKey]).trim() !== '')
                .sort((a, b) => (Number(a[dupKey]) || 0) - (Number(b[dupKey]) || 0));

            const subjectCodePrefix = subjectCode.slice(0, 6);
            const bundles = new Set<string>();
            presentStudents.forEach((_, index) => {
                bundles.add(`${subjectCodePrefix}-${String(Math.floor(index / 20) + 1).padStart(2, '0')}`);
            });
            setBundleOptions(Array.from(bundles));
            setView('marks');
        } else {
            setView('marks'); // Show empty state
        }
      } catch (err: any) {
        showError(err.message || 'Failed to load sheet data.');
        onClose(false);
      } finally {
        setLoading(false);
      }
    };
    loadSheetData();
  }, [isOpen, sheet, sheetData]);

  useEffect(() => {
    const checkBundleStatus = async () => {
        if (!selectedBundle || !sheet || !duplicateNumberKey) {
            setEditedData([]);
            setView('marks');
            return;
        }

        const { data, error } = await supabase.from('bundle_examiners')
            .select('*').eq('sheet_id', sheet.id).eq('bundle_number', selectedBundle).maybeSingle();
        
        if (error) {
            showError("Could not check bundle status.");
            return;
        }

        const presentStudents = fullSheetData
            .filter(row => row[duplicateNumberKey] !== null && row[duplicateNumberKey] !== undefined && String(row[duplicateNumberKey]).trim() !== '')
            .sort((a, b) => (Number(a[duplicateNumberKey]) || 0) - (Number(b[duplicateNumberKey]) || 0));
        
        const subjectCodePrefix = sheet.subjects?.subject_code?.slice(0, 6);
        const bundleStudents = presentStudents.filter((_, index) => {
            const bundleName = `${subjectCodePrefix}-${String(Math.floor(index / 20) + 1).padStart(2, '0')}`;
            return bundleName === selectedBundle;
        });
        setEditedData(JSON.parse(JSON.stringify(bundleStudents)));

        if (data) {
            setExaminerDetails(data);
            setView('submitted');
        } else {
            setExaminerDetails(null);
            setView('marks');
        }
    };
    checkBundleStatus();
  }, [selectedBundle, sheet, fullSheetData, duplicateNumberKey]);

  const handleMarkChange = (rowIndex: number, value: string) => {
    if (!externalMarkKey) return;
    const mark = parseInt(value, 10);
    if (value !== '' && (isNaN(mark) || mark < 0 || mark > 100)) {
      showError("Mark must be a number between 0 and 100.");
      return;
    }
    const newData = [...editedData];
    newData[rowIndex][externalMarkKey] = value === '' ? '' : mark;
    setEditedData(newData);
  };

  const handleSaveChanges = async () => {
    if (!sheet || !externalMarkKey || !duplicateNumberKey) return;
    setIsSaving(true);
    const toastId = showLoading("Saving marks...");
    try {
      const editedMarksMap = new Map(editedData.map(row => [row[duplicateNumberKey], row[externalMarkKey]]));
      const updatedSheetData = fullSheetData.map(row => {
        const dupNum = row[duplicateNumberKey];
        return editedMarksMap.has(dupNum) ? { ...row, [externalMarkKey]: editedMarksMap.get(dupNum) } : row;
      });

      const newWorksheet = XLSX.utils.json_to_sheet(updatedSheetData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
      const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      await supabase.storage.from('sheets').update(sheet.file_path, blob, { upsert: true });
      setFullSheetData(updatedSheetData); // Update in-memory data
      dismissToast(toastId);
      showSuccess("Marks saved! Please provide examiner details.");
      setIsExaminerFormOpen(true);
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to save marks.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExaminerSuccess = (data: ExaminerDetails) => {
    setExaminerDetails(data);
    setIsExaminerFormOpen(false);
    setView('submitted');
  };

  const handleDownloadPdf = () => {
    if (!sheet || !examinerDetails || !editedData.length || !externalMarkKey || !duplicateNumberKey) {
        showError("Cannot generate PDF. Data is missing.");
        return;
    }
    const doc = new jsPDF();
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text("ADHIYAMAAN COLLEGE OF ENGINEERING", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text("(An Autonomous Institution)", doc.internal.pageSize.getWidth() / 2, 27, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("Affiliated to Anna University, Chennai", doc.internal.pageSize.getWidth() / 2, 34, { align: 'center' });
    doc.setFontSize(9);
    doc.text("Dr. M. G. R. Nagar, Hosur - 635130", doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

    // Sub-header
    doc.setFontSize(11);
    doc.text(`Academic Year: ${sheet.year || 'N/A'}`, 15, 55);
    doc.text(`Semester: ${sheet.batch || 'N/A'}`, 15, 62);
    doc.text(`Subject: ${sheet.subjects?.subject_code || 'N/A'} - ${sheet.subjects?.subject_name || 'N/A'}`, doc.internal.pageSize.getWidth() - 15, 55, { align: 'right' });
    doc.text(`Bundle Number: ${selectedBundle}`, doc.internal.pageSize.getWidth() - 15, 62, { align: 'right' });

    // Table
    const tableData = editedData.map(row => [
        row[duplicateNumberKey],
        row[externalMarkKey],
        numberToWords(parseInt(row[externalMarkKey], 10) || 0)
    ]);
    (doc as any).autoTable({
        startY: 70,
        head: [['Duplicate Number', 'External Mark', 'Mark in Words']],
        body: tableData,
        theme: 'grid',
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.text("Internal Examiner", 15, finalY);
    doc.text("CHIEF", doc.internal.pageSize.getWidth() / 2 + 15, finalY);
    
    doc.setFont('helvetica', 'normal');
    const examinerX = 15;
    const chiefX = doc.internal.pageSize.getWidth() / 2 + 15;
    let currentY = finalY + 7;

    const addDetail = (label: string, value: string, x: number, y: number) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, x, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, x + 30, y);
    };

    addDetail("Name", examinerDetails.internal_examiner_name, examinerX, currentY);
    addDetail("Name", examinerDetails.chief_name || '-', chiefX, currentY);
    currentY += 7;
    addDetail("Designation", examinerDetails.internal_examiner_designation, examinerX, currentY);
    addDetail("Designation", examinerDetails.chief_designation || '-', chiefX, currentY);
    currentY += 7;
    addDetail("Department", examinerDetails.internal_examiner_department, examinerX, currentY);
    addDetail("Department", examinerDetails.chief_department || '-', chiefX, currentY);
    currentY += 7;
    addDetail("College", examinerDetails.internal_examiner_college, examinerX, currentY);
    addDetail("College", examinerDetails.chief_college || '-', chiefX, currentY);

    doc.save(`${selectedBundle}_marks.pdf`);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(view === 'submitted')}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>{sheet?.sheet_name || 'Update Marks'}</DialogTitle></DialogHeader>
          
          {loading ? <p className="text-center py-8">Loading...</p> : (
            <>
              <div className="mb-4">
                <Label>Bundle Number</Label>
                <Select onValueChange={setSelectedBundle} value={selectedBundle} disabled={bundleOptions.length === 0}>
                  <SelectTrigger><SelectValue placeholder={bundleOptions.length > 0 ? "Select bundle" : "No bundles found"} /></SelectTrigger>
                  <SelectContent>{bundleOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="flex-grow overflow-hidden min-h-0">
                <ScrollArea className="h-[50vh] w-full rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{duplicateNumberKey || 'Duplicate Number'}</TableHead>
                        <TableHead>{externalMarkKey || 'External Mark'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editedData.length > 0 ? editedData.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          <TableCell>{row[duplicateNumberKey]}</TableCell>
                          <TableCell>
                            <Input type="number" min="0" max="100" value={row[externalMarkKey] || ''}
                              onChange={(e) => handleMarkChange(rowIndex, e.target.value)}
                              className="w-24" disabled={view === 'submitted'}/>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={2} className="text-center h-24">
                          {selectedBundle ? 'This bundle is empty.' : 'Please select a bundle.'}
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
              <DialogFooter>
                {view === 'submitted' ? (
                  <Button onClick={handleDownloadPdf}>Download PDF</Button>
                ) : (
                  <Button onClick={handleSaveChanges} disabled={isSaving || editedData.length === 0}>
                    {isSaving ? 'Saving...' : 'Save & Finalize'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {sheet && selectedBundle && (
        <ExaminerDetailsDialog
          isOpen={isExaminerFormOpen}
          onClose={() => setIsExaminerFormOpen(false)}
          onSuccess={handleExaminerSuccess}
          sheetId={sheet.id}
          bundleNumber={selectedBundle}
        />
      )}
    </>
  );
};

export default StaffSheetViewerDialog;