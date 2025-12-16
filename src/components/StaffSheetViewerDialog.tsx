import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import autoTable from 'jspdf-autotable';
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
  forceEditable?: boolean;
}

const StaffSheetViewerDialog = ({ isOpen, onClose, sheet, sheetData, forceEditable = false }: StaffSheetViewerDialogProps) => {
  const [fullSheetData, setFullSheetData] = useState<Record<string, any>[]>([]);
  const [bundleOptions, setBundleOptions] = useState<string[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<string>('');
  const [editedData, setEditedData] = useState<Record<string, any>[]>([]);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [duplicateNumberKey, setDuplicateNumberKey] = useState<string | null>(null);
  const [bundleNumberKey, setBundleNumberKey] = useState<string | null>(null);
  
  const [view, setView] = useState<'loading' | 'marks' | 'submitted'>('loading');
  const [examinerDetails, setExaminerDetails] = useState<ExaminerDetails | null>(null);
  const [isExaminerFormOpen, setIsExaminerFormOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const resetState = () => {
    setFullSheetData([]);
    setBundleOptions([]);
    setSelectedBundle('');
    setEditedData([]);
    setIsSaving(false);
    setLoading(false);
    setDuplicateNumberKey(null);
    setBundleNumberKey(null);
    setView('loading');
    setExaminerDetails(null);
    setIsExaminerFormOpen(false);
    setIsReadOnly(false);
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
            const bundleKey = firstRowKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'bundlenumber');
            const subjectCode = sheet.subjects?.subject_code;

            if (!dupKey) throw new Error("Sheet is missing 'Duplicate Number' column.");
            
            setDuplicateNumberKey(dupKey);
            setBundleNumberKey(bundleKey || null);

            const studentsForBundling = jsonData
                .filter(row => row[dupKey] !== null && row[dupKey] !== undefined && String(row[dupKey]).trim() !== '');

            if (studentsForBundling.length > 0) {
              // Check if sheet has Bundle Number column
              if (bundleKey) {
                // Use existing bundle numbers from the sheet
                const bundles = new Set<string>();
                studentsForBundling.forEach(row => {
                  const bundleNum = row[bundleKey];
                  if (bundleNum && String(bundleNum).trim() !== '') {
                    bundles.add(String(bundleNum).trim());
                  }
                });
                setBundleOptions(Array.from(bundles).sort());
              } else {
                // Fall back to auto-generating bundles
                const sortedStudents = studentsForBundling.sort((a, b) => (Number(a[dupKey]) || 0) - (Number(b[dupKey]) || 0));
                const subjectCodeFull = subjectCode;
                const bundles = new Set<string>();
                sortedStudents.forEach((_, index) => {
                    bundles.add(`${subjectCodeFull}-${String(Math.floor(index / 20) + 1).padStart(2, '0')}`);
                });
                setBundleOptions(Array.from(bundles));
              }
            }
            // Don't set view here - let the bundle check effect handle it
        } else {
            // Show empty state
            setView('marks');
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
        const isSheetFinalized = !!sheet?.external_marks_added;
        if (!selectedBundle || !sheet || !duplicateNumberKey) {
            setEditedData([]);
            // Only reset to marks if no bundle is selected
            if (!selectedBundle) {
                // If sheet is finalized, always show read-only view
                setView((isSheetFinalized && !forceEditable) ? 'submitted' : 'marks');
            }
            return;
        }

        console.log('[StaffSheetViewerDialog] Checking bundle status:', { sheet_id: sheet.id, bundle_number: selectedBundle });
        console.log('[StaffSheetViewerDialog] Exact values - sheet.id type:', typeof sheet.id, 'value:', sheet.id);
        console.log('[StaffSheetViewerDialog] Exact values - selectedBundle type:', typeof selectedBundle, 'value:', `'${selectedBundle}'`, 'length:', selectedBundle.length);
        
        try {
            // First, load all bundle examiner rows for this sheet and match in JS with normalization
            const { data: examinerRows, error } = await supabase
                .from('bundle_examiners')
                .select('*')
                .eq('sheet_id', sheet.id);
            
            const normalize = (v: any) => String(v ?? '').trim().toLowerCase();
            const normalizedSelected = normalize(selectedBundle);
            const matched = examinerRows?.find(r => normalize(r.bundle_number) === normalizedSelected) || null;
            const fallbackExaminer = examinerRows && examinerRows.length > 0 ? examinerRows[0] : null;
            
            console.log('[StaffSheetViewerDialog] Bundle examiner query result:', { count: examinerRows?.length || 0, error });
            if (matched) {
                console.log('[StaffSheetViewerDialog] Matched examiner row for bundle:', `'${matched.bundle_number}'`, '=> normalized:', normalize(matched.bundle_number));
            } else if (fallbackExaminer) {
                console.log('[StaffSheetViewerDialog] No exact match found. Using first examiner row as fallback:', fallbackExaminer);
            } else {
                console.log('[StaffSheetViewerDialog] No examiner rows found for this sheet.');
            }
            
            if (error) {
                console.error('[StaffSheetViewerDialog] Error checking bundle status:', error);
                showError("Could not check bundle status.");
                return;
            }

            // Get bundle students data
            const presentStudents = fullSheetData
                .filter(row => row[duplicateNumberKey] !== null && row[duplicateNumberKey] !== undefined && String(row[duplicateNumberKey]).trim() !== '')
                .sort((a, b) => (Number(a[duplicateNumberKey]) || 0) - (Number(b[duplicateNumberKey]) || 0));
            
            let bundleStudents;
            
            // Check if sheet has Bundle Number column
            if (bundleNumberKey) {
                // Filter by actual bundle number from sheet
                bundleStudents = presentStudents.filter(row => {
                    const bundleNum = row[bundleNumberKey];
                    return bundleNum && String(bundleNum).trim() === selectedBundle;
                });
            } else {
                // Fall back to index-based filtering
                const subjectCodeFull = sheet.subjects?.subject_code;
                bundleStudents = presentStudents.filter((_, index) => {
                    const bundleName = `${subjectCodeFull}-${String(Math.floor(index / 20) + 1).padStart(2, '0')}`;
                    return bundleName === selectedBundle;
                });
            }
            
            setEditedData(JSON.parse(JSON.stringify(bundleStudents)));

            // Set view based on whether bundle is finalized or entire sheet is finalized
            const isSheetFinalized = !!sheet?.external_marks_added;
            // Treat bundle as finalized if we have a direct match OR any examiner row for this sheet.
            const isBundleFinalized = !!matched;
            // Once a bundle is saved (has examiner details), it should NEVER be editable again for staff
            // forceEditable only applies to sheet-level finalization (for admins), not bundle-level
            const shouldBeReadOnly = isBundleFinalized || (isSheetFinalized && !forceEditable);
            
            if (shouldBeReadOnly) {
                console.log('[StaffSheetViewerDialog] READ-ONLY MODE ACTIVATED');
                console.log('[StaffSheetViewerDialog] - Bundle finalized:', isBundleFinalized);
                console.log('[StaffSheetViewerDialog] - Sheet finalized:', isSheetFinalized);
                console.log('[StaffSheetViewerDialog] - Selected bundle:', selectedBundle);
                console.log('[StaffSheetViewerDialog] - Examiner data used:', matched || fallbackExaminer || null);
                setExaminerDetails(matched || fallbackExaminer || null);
                setView('submitted');
                setIsReadOnly(true);
            } else {
                console.log('[StaffSheetViewerDialog] EDIT MODE ENABLED');
                console.log('[StaffSheetViewerDialog] - Bundle finalized:', isBundleFinalized);
                console.log('[StaffSheetViewerDialog] - Sheet finalized:', isSheetFinalized);
                console.log('[StaffSheetViewerDialog] - Selected bundle:', selectedBundle);
                setExaminerDetails(null);
                setView('marks');
                setIsReadOnly(false);
            }
        } catch (err) {
            console.error('[StaffSheetViewerDialog] Exception in checkBundleStatus:', err);
        }
    };
    checkBundleStatus();
  }, [selectedBundle, sheet, fullSheetData, duplicateNumberKey, bundleNumberKey, forceEditable, isOpen]);

  const handleMarkChange = (rowIndex: number, columnKey: string, columnIndex: number, value: string) => {
    // Allow empty string
    if (value === '') {
      const newData = [...editedData];
      newData[rowIndex][columnKey] = '';
      setEditedData(newData);
      return;
    }

    const mark = parseInt(value, 10);

    // Determine max value based on column index
    // Columns 1-10: 0-2, Columns 11-15: 0-16
    const maxMark = columnIndex <= 10 ? 2 : 16;

    if (isNaN(mark) || mark < 0 || mark > maxMark) {
      showError(`Mark must be between 0 and ${maxMark} for column ${columnIndex}.`);
      return;
    }
    const newData = [...editedData];
    newData[rowIndex][columnKey] = mark;
    setEditedData(newData);
  };

  const handleSaveClick = () => {
    if (!sheet || !duplicateNumberKey) return;
    
    // Check if bundle is already finalized
    if (examinerDetails) {
      showError('This bundle has already been finalized and cannot be edited.');
      return;
    }
    
    // Prevent saving if sheet is finalized and user is not in forceEditable mode
    if (sheet.external_marks_added && !forceEditable) {
      showError('This sheet is finalized and cannot be edited.');
      return;
    }

    setShowSaveConfirmation(true);
  };

  const performSave = async () => {
    setShowSaveConfirmation(false);
    if (!sheet || !duplicateNumberKey) return;
    
    setIsSaving(true);
    const toastId = showLoading("Saving marks...");
    try {
      // Build a map of duplicate number to the entire edited row
      const editedRowsMap = new Map(editedData.map(row => [row[duplicateNumberKey], row]));
      
      // Update full sheet data by merging edited rows
      let updatedSheetData = fullSheetData.map(row => {
        const dupNum = row[duplicateNumberKey];
        if (editedRowsMap.has(dupNum)) {
          // Merge all fields from edited row (includes all internal marks columns)
          return { ...row, ...editedRowsMap.get(dupNum) };
        }
        return row;
      });

      // Compute External Mark (sum of 1..15) and store in Total column
      if (updatedSheetData.length > 0) {
        const firstRow = updatedSheetData[0] || {};
        const allKeys = Object.keys(firstRow);
        const internalMarkKeys: string[] = [];
        for (let i = 1; i <= 15; i++) {
          const key = allKeys.find(k => k === String(i) || k === `IM${i}` || k === `Internal${i}`);
          if (key) internalMarkKeys.push(key);
        }
        const totalKey = allKeys.find(k => k.toLowerCase() === 'total') || 'Total';

        updatedSheetData = updatedSheetData.map(row => {
          // Sum marks; treat empty/NaN as 0
          const total = internalMarkKeys.reduce((sum, key) => {
            const v = row[key];
            const n = typeof v === 'number' ? v : parseInt(String(v ?? '').trim() || '0', 10);
            return sum + (isNaN(n) ? 0 : n);
          }, 0);
          return { ...row, [totalKey]: total };
        });
      }

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

  const handleExaminerSuccess = async (data: ExaminerDetails) => {
    console.log('[StaffSheetViewerDialog] Examiner details submitted successfully:', data);
    setExaminerDetails(data);
    setIsExaminerFormOpen(false);
    // Always set to submitted after saving bundle, as the bundle is now finalized
    console.log('[StaffSheetViewerDialog] Setting view to submitted after examiner success');
    setView('submitted');
    setIsReadOnly(true);

    // Check if all bundles are now completed
    if (sheet && bundleOptions.length > 0) {
      try {
        // Query how many bundles have examiner details
        const { data: completedBundles, error } = await supabase
          .from('bundle_examiners')
          .select('bundle_number')
          .eq('sheet_id', sheet.id);

        if (error) {
          console.error('Error checking bundle completion:', error);
          return;
        }

        // If all bundles are completed, mark the sheet as external_marks_added = true
        const completedCount = completedBundles?.length || 0;
        if (completedCount >= bundleOptions.length) {
          const { error: updateError } = await supabase
            .from('sheets')
            .update({ external_marks_added: true })
            .eq('id', sheet.id);

          if (updateError) {
            console.error('Error updating sheet status:', updateError);
          } else {
            showSuccess('All bundles completed! Sheet marked as finished.');
          }
        }
      } catch (err) {
        console.error('Error in handleExaminerSuccess:', err);
      }
    }
  };

  const handleDownloadPdf = () => {
    if (!sheet || !editedData.length || !duplicateNumberKey) {
        showError("Cannot generate PDF. Data is missing.");
        return;
    }

    // Use examiner details if available, otherwise fall back to placeholders so
    // PDF generation still works even if examiner info was not captured.
    const safeExaminerDetails: ExaminerDetails = examinerDetails || {
        internal_examiner_name: '-',
        internal_examiner_designation: '-',
        internal_examiner_department: '-',
        internal_examiner_college: '-',
        chief_name: '-',
        chief_designation: '-',
        chief_department: '-',
        chief_college: '-',
    };

    const doc = new jsPDF('landscape'); // Landscape for more columns
    
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

    // Detect keys for internal marks and total
    const firstRow = editedData[0] || {};
    const allKeys = Object.keys(firstRow);
    const internalMarkKeys: string[] = [];
    for (let i = 1; i <= 15; i++) {
      const key = allKeys.find(k => k === String(i) || k === `IM${i}` || k === `Internal${i}`);
      if (key) internalMarkKeys.push(key);
    }
    const totalKey = allKeys.find(k => k.toLowerCase() === 'total') || 'Total';
    const internalMarkKey = allKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'internalmark') || null;
    const maxInternalMarkKey = allKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'maxinternalmark') || null;

    // Max marks: External = 100, Total = 100
    const MAX_EXTERNAL_BASE = 100;
    const MAX_TOTAL = 100;
    
    // Determine max internal mark from the first row (should be same for all students)
    const firstRowMaxInternal = maxInternalMarkKey && editedData[0] 
      ? (typeof editedData[0][maxInternalMarkKey] === 'number' 
          ? editedData[0][maxInternalMarkKey] 
          : parseInt(String(editedData[0][maxInternalMarkKey] ?? '').trim() || '50', 10))
      : 50; // Default to 50 if not found
    
    const maxInternal = firstRowMaxInternal;
    const maxExternal = MAX_TOTAL - maxInternal; // If internal = 40, external = 60
    
    // Build simple PDF table: Duplicate Number, External Mark (out of 100), Mark in Words
    const headers: string[] = [
      'Duplicate Number',
      'External Mark (Out of 100)',
      'Mark in Words'
    ];

    const tableData = editedData.map(row => {
      // Calculate total external mark (sum of columns 1-15)
      const totalExternal = internalMarkKeys.reduce((sum, key) => {
        const v = row[key];
        const n = typeof v === 'number' ? v : parseInt(String(v ?? '').trim() || '0', 10);
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
      
      // Convert mark to words
      const markInWords = numberToWords(totalExternal);
      
      return [
        row[duplicateNumberKey] || '',
        totalExternal,
        markInWords
      ];
    });

    autoTable(doc, {
        startY: 70,
        head: [headers],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202], fontStyle: 'bold', fontSize: 8 },
        columnStyles: { 
          0: { halign: 'center' }, 
          1: { halign: 'center' }, 
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' }
        },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.text("Examiner", 15, finalY);
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

    addDetail("Name", safeExaminerDetails.internal_examiner_name, examinerX, currentY);
    addDetail("Name", safeExaminerDetails.chief_name || '-', chiefX, currentY);
    currentY += 7;
    addDetail("Designation", safeExaminerDetails.internal_examiner_designation, examinerX, currentY);
    addDetail("Designation", safeExaminerDetails.chief_designation || '-', chiefX, currentY);
    currentY += 7;
    addDetail("Department", safeExaminerDetails.internal_examiner_department, examinerX, currentY);
    addDetail("Department", safeExaminerDetails.chief_department || '-', chiefX, currentY);
    currentY += 7;
    addDetail("College", safeExaminerDetails.internal_examiner_college, examinerX, currentY);
    addDetail("College", safeExaminerDetails.chief_college || '-', chiefX, currentY);

    doc.save(`${selectedBundle}_marks.pdf`);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(view === 'submitted')}>
        <DialogContent className="sm:max-w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{sheet?.sheet_name || 'Update Marks'}</DialogTitle>
            <DialogDescription>
              Update external marks for the selected bundle. Finalize by providing examiner details.
            </DialogDescription>
          </DialogHeader>
          
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
                  <div className="w-max min-w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-white z-10">{duplicateNumberKey || 'Duplicate Number'}</TableHead>
                          {(() => {
                            const firstRow = editedData[0] || {};
                            const allKeys = Object.keys(firstRow);
                            const internalMarkKeys: string[] = [];
                            for (let i = 1; i <= 15; i++) {
                              const key = allKeys.find(k => k === String(i) || k === `IM${i}` || k === `Internal${i}`);
                              if (key) internalMarkKeys.push(key);
                            }
                            const heads = internalMarkKeys.map((key, idx) => (
                              <TableHead key={key}>{idx + 1} ({idx < 10 ? '0-2' : '0-16'})</TableHead>
                            ));
                            heads.push(<TableHead key="ext-total">External Total</TableHead>);
                            return heads;
                          })()}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editedData.length > 0 ? editedData.map((row, rowIndex) => {
                          const firstRow = editedData[0] || {};
                          const allKeys = Object.keys(firstRow);
                          const internalMarkKeys: string[] = [];
                          for (let i = 1; i <= 15; i++) {
                            const key = allKeys.find(k => k === String(i) || k === `IM${i}` || k === `Internal${i}`);
                            if (key) internalMarkKeys.push(key);
                          }

                          // Calculate External Total (sum of Q1..Q15)
                          const externalTotal = internalMarkKeys.reduce((sum, key) => {
                            const v = row[key];
                            const n = typeof v === 'number' ? v : parseInt(String(v ?? '').trim() || '0', 10);
                            return sum + (isNaN(n) ? 0 : n);
                          }, 0);

                          return (
                            <TableRow key={rowIndex}>
                              <TableCell className="sticky left-0 bg-white z-10 font-medium">{row[duplicateNumberKey]}</TableCell>
                              {internalMarkKeys.map((key, idx) => {
                                const maxMark = idx < 10 ? 2 : 16;
                                return (
                                  <TableCell key={key}>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={maxMark}
                                      value={row[key] ?? ''}
                                      onChange={(e) => handleMarkChange(rowIndex, key, idx + 1, e.target.value)}
                                      className="w-20"
                                      disabled={isReadOnly || view === 'submitted' || !!examinerDetails}
                                      readOnly={isReadOnly || view === 'submitted' || !!examinerDetails}
                                    />
                                  </TableCell>
                                );
                              })}
                              <TableCell>{externalTotal}</TableCell>
                            </TableRow>
                          );
                        }) : (
                          <TableRow><TableCell colSpan={17} className="text-center h-24">
                            {selectedBundle ? 'This bundle is empty.' : 'Please select a bundle.'}
                          </TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
              <DialogFooter>
                {(isReadOnly || view === 'submitted' || !!examinerDetails) ? (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 w-full">
                    <span className="text-sm text-muted-foreground">This bundle has been finalized and cannot be edited.</span>
                    {/* Allow PDF download whenever there is data, even if the sheet is finalized. */}
                    <Button onClick={handleDownloadPdf} disabled={editedData.length === 0}>Download PDF</Button>
                  </div>
                ) : (
                  <Button onClick={handleSaveClick} disabled={isSaving || editedData.length === 0 || isReadOnly || !!examinerDetails}>
                    {isSaving ? 'Saving...' : 'Save & Finalize'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSaveConfirmation} onOpenChange={setShowSaveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Bundle {selectedBundle}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save marks for <strong>Bundle {selectedBundle}</strong>?
              <br /><br />
              This will update the sheet and allow you to enter examiner details for this bundle.
              Other bundles will remain editable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performSave}>Confirm Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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