import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Eye, Trash2, Download, Edit3, MoreHorizontal, Calendar, CheckSquare, Hash } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SheetViewerDialog from '@/components/SheetViewerDialog';
import { SheetUploadPreviewDialog } from '@/components/SheetUploadPreviewDialog';
import EditSheetForm from '@/components/EditSheetForm';
import EditableSheetViewerDialog from '@/components/EditableSheetViewerDialog';
import StaffSheetViewerDialog from '@/components/StaffSheetViewerDialog';
import { EnhancedDownloadDialog } from '@/components/EnhancedDownloadDialog';
import BulkDateManagerDialog from '@/components/BulkDateManagerDialog';
import BulkDateTemplate from '@/components/BulkDateTemplate';
import * as XLSX from 'xlsx';

interface Department {
  id: string;
  department_name: string;
}

interface Subject {
  id: string;
  subject_name: string;
  subject_code: string;
  department_id: string | null;
}

export interface Sheet {
  id: string;
  sheet_name: string;
  file_path: string;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
  year?: string | null;
  batch?: string | null;
  maximum_internal_mark?: number | null;
}

const Sheets = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const [academicTerm, setAcademicTerm] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [academicTermOptions, setAcademicTermOptions] = useState<string[]>([]);

  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  
  const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null);
  const [sheetToAssignDate, setSheetToAssignDate] = useState<Sheet | null>(null);
  const [sheetToEditAttendance, setSheetToEditAttendance] = useState<Sheet | null>(null);
  const [sheetToUpdateDuplicates, setSheetToUpdateDuplicates] = useState<Sheet | null>(null);
  const [sheetToUpdateMarks, setSheetToUpdateMarks] = useState<Sheet | null>(null);
  
  const [sheetDataForDialog, setSheetDataForDialog] = useState<Record<string, any>[]>([]);
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentSheet, setCurrentSheet] = useState<Sheet | null>(null);
  const [currentSheetData, setCurrentSheetData] = useState<Record<string, any>[]>([]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadData, setUploadData] = useState<any[]>([]);
  const [originalFileName, setOriginalFileName] = useState('');

  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [sheetToDownload, setSheetToDownload] = useState<Sheet | null>(null);
  const [sheetDataForDownload, setSheetDataForDownload] = useState<Record<string, any>[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSheets = useCallback(async () => {
    if (!selectedSubject) {
      setSheets([]);
      return;
    }
    setLoadingSheets(true);
    const { data, error } = await supabase
      .from('sheets')
      .select('*')
      .eq('subject_id', selectedSubject)
      .order('created_at', { ascending: false });
    
    if (error) {
      showError('Failed to fetch sheets.');
    } else {
      setSheets(data);
    }
    setLoadingSheets(false);
  }, [selectedSubject]);

  useEffect(() => {
    const generateAcademicTerms = () => {
      const terms = [];
      const currentYear = new Date().getFullYear();
      for (let year = currentYear; year >= 2020; year--) {
        terms.push(`${year} Odd Sem`);
        terms.push(`${year} Even Sem`);
      }
      setAcademicTermOptions(terms);

      const currentMonth = new Date().getMonth(); // 0-11
      const defaultTerm = currentMonth >= 5 ? `${currentYear} Odd Sem` : `${currentYear} Even Sem`;
      setAcademicTerm(defaultTerm);
    };
    generateAcademicTerms();

    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      const { data, error } = await supabase.from('departments').select('id, department_name');
      if (error) {
        showError('Failed to fetch departments.');
      } else {
        setDepartments(data);
      }
      setLoadingDepartments(false);
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (!selectedDepartment) {
      setSubjects([]);
      setSelectedSubject('');
      return;
    }

    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      setSelectedSubject('');
      setSheets([]);
      
      const { data, error } = await supabase
        .from('subjects')
        .select('id, subject_name, subject_code, department_id')
        .order('subject_name', { ascending: true });

      if (error) {
        showError('Failed to fetch subjects.');
      } else {
        const allSubjects = (data || []) as Subject[];
        // Only include subjects for the selected department and common subjects (department_id is null)
        const filtered = allSubjects.filter(
          (sub) => sub.department_id === selectedDepartment || sub.department_id === null
        );
        setSubjects(filtered);
      }
      setLoadingSubjects(false);
    };

    fetchSubjects();
  }, [selectedDepartment]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  useEffect(() => {
    const channel = supabase
      .channel('public-sheets-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sheets' },
        () => {
          fetchSheets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSheets]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    if (!file.name.endsWith('.xlsx')) {
        showError("Invalid file type. Please upload an .xlsx file.");
        return;
    }
    setOriginalFileName(file.name);

    const toastId = showLoading('Processing sheet...');

    try {
      const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
      if (!selectedSubjectData) throw new Error('Could not find selected subject details.');
      const selectedSubjectCode = selectedSubjectData.subject_code;
      // Normalize subject code for robust comparison (uppercase, remove spaces and non-alphanumerics)
      const normSelectedSubjectCode = String(selectedSubjectCode ?? '')
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/[^A-Z0-9]/g, '');

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("No sheet found in the file.");
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) throw new Error("The sheet is empty.");

      const headers = Object.keys(jsonData[0]).map(h => h.toLowerCase());
      const requiredHeaders = ['register number', 'subject code', 'internal mark'];
      const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }

      // Define the exact column order we want
      const orderedColumns = [
        'register number',
        'roll number',
        'subject code',
        'internal mark',
        'attendance',
        'duplicate number',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
        '11', '12', '13', '14', '15',
        'total',
        'Result'
      ];

      const processedData = jsonData.map(row => {
        // Detect original keys case-insensitively
        const originalKeys = Object.keys(row);
        const regKey = originalKeys.find(k => k.toLowerCase() === 'register number');
        const subKey = originalKeys.find(k => k.toLowerCase() === 'subject code');
        const internalKey = originalKeys.find(k => k.toLowerCase() === 'internal mark');

        const registerNumber = String(regKey ? row[regKey] : '');
        const subjectCode = String(subKey ? row[subKey] : '');
        const internalMark = internalKey != null ? row[internalKey] : '';
        // Normalized version of subject code from sheet for comparison only
        const normRowSubjectCode = String(subjectCode ?? '')
          .toUpperCase()
          .replace(/\s+/g, '')
          .replace(/[^A-Z0-9]/g, '');

        // Build row as an array of key-value pairs in the exact order
        const orderedRow: Record<string, any> = {};
        
        // Populate in order
        orderedRow['register number'] = registerNumber;
        orderedRow['roll number'] = registerNumber.length >= 4
          ? registerNumber.slice(0, -4) + registerNumber.slice(-3)
          : '';
        orderedRow['subject code'] = subjectCode;
        orderedRow['internal mark'] = internalMark;
        orderedRow['attendance'] = '';
        orderedRow['duplicate number'] = '';

        // Add 15 external mark columns at the end
        for (let i = 1; i <= 15; i++) {
          orderedRow[`${i}`] = '';
        }

        // Add total and Result columns
        orderedRow['total'] = '';
        orderedRow['Result'] = '';

        // Store internal status for filtering (not displayed as Result)
        orderedRow._matchStatus = normRowSubjectCode && normRowSubjectCode === normSelectedSubjectCode ? 'matched' : 'mismatched';
        return orderedRow;
      });

      const matchedRows = processedData
        .filter(row => row._matchStatus === 'matched')
        .map(({ _matchStatus, total, ...rest }) => rest);

      setPreviewData(processedData);
      setUploadData(matchedRows);
      setIsPreviewOpen(true);
      dismissToast(toastId);

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || 'Failed to process sheet.');
    }
  };
  
  const handleConfirmUpload = async (maxInternalMark: number) => {
    if (uploadData.length === 0) {
        showError("No matched rows to upload.");
        return;
    }
    setIsUploading(true);
    const toastId = showLoading('Uploading sheet...');
    try {
        // Determine if the selected subject is a common subject (shared across departments)
        const selectedSubjectObj = subjects.find((s) => s.id === selectedSubject);
        const isCommonSubject = selectedSubjectObj?.department_id === null;

        // For common subjects, we want to use a shared file path so that
        // uploads from multiple departments append into the same sheet.
        const safeTerm = academicTerm.replace(/\s+/g, '-');
        const safeSem = selectedSemester.replace(/\s+/g, '-');
        const sharedFilePath = `common/${selectedSubject}/${safeTerm}-${safeSem}.xlsx`;

        // Default per-department path (existing behaviour)
        const perDeptFilePath = `${selectedDepartment}/${selectedSubject}/${Date.now()}-${originalFileName}`;

        const targetFilePath = isCommonSubject ? sharedFilePath : perDeptFilePath;

        // If this is a common subject and a shared sheet already exists, load
        // existing rows so we can append the new rows instead of overwriting.
        let existingRows: any[] = [];
        let sharedFileExists = false;
        if (isCommonSubject) {
          try {
            const { data: existingFile, error: existingError } = await supabase.storage
              .from('sheets')
              .download(targetFilePath);

            if (!existingError && existingFile) {
              sharedFileExists = true;
              const existingBuffer = await existingFile.arrayBuffer();
              const existingWb = XLSX.read(existingBuffer, { type: 'array' });
              const existingSheetName = existingWb.SheetNames[0];
              if (existingSheetName) {
                const existingWs = existingWb.Sheets[existingSheetName];
                existingRows = XLSX.utils.sheet_to_json(existingWs);
              }
            }
          } catch {
            // If download fails (e.g., file does not exist yet), we simply treat
            // this as the first shared upload.
            sharedFileExists = false;
          }
        }

        const mergedRows = isCommonSubject ? [...existingRows, ...uploadData] : uploadData;

        const newWorksheet = XLSX.utils.json_to_sheet(mergedRows);
        
        // Add merged cells for headers
        if (!newWorksheet['!merges']) newWorksheet['!merges'] = [];
        
        // Find the column indices for the external mark columns
        // Assuming the columns are in order after 'duplicate number'
        const headers = Object.keys(mergedRows[0]);
        const duplicateNumberIndex = headers.indexOf('duplicate number');
        
        // Calculate the starting column for external marks (after 'duplicate number')
        const startCol = duplicateNumberIndex + 1;
        
        // Merge cells for "2 Marks" (columns 1-10)
        newWorksheet['!merges'].push({
          s: { r: 0, c: startCol },      // Start: row 0, column after 'duplicate number'
          e: { r: 0, c: startCol + 9 }   // End: row 0, 10 columns later
        });
        
        // Merge cells for "16 Marks" (columns 11-15)
        newWorksheet['!merges'].push({
          s: { r: 0, c: startCol + 10 }, // Start: row 0, after the 10th column
          e: { r: 0, c: startCol + 14 }  // End: row 0, 5 columns later
        });
        
        // Set the header text for merged cells
        const col2MarksAddress = XLSX.utils.encode_cell({ r: 0, c: startCol });
        const col16MarksAddress = XLSX.utils.encode_cell({ r: 0, c: startCol + 10 });
        newWorksheet[col2MarksAddress] = { t: 's', v: '2 Marks' };
        newWorksheet[col16MarksAddress] = { t: 's', v: '16 Marks' };

        // Clear headers inside merged ranges (except the first cell) to avoid duplicate text
        for (let c = startCol + 1; c <= startCol + 9; c++) {
          const addr = XLSX.utils.encode_cell({ r: 0, c });
          if (newWorksheet[addr]) delete newWorksheet[addr];
        }
        for (let c = startCol + 11; c <= startCol + 14; c++) {
          const addr = XLSX.utils.encode_cell({ r: 0, c });
          if (newWorksheet[addr]) delete newWorksheet[addr];
        }
        
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'ProcessedData');
        const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const processedFile = new File([blob], originalFileName, { type: blob.type });

        // Upload or update the file in storage
        let storageError;
        if (isCommonSubject && sharedFileExists) {
          ({ error: storageError } = await supabase.storage
            .from('sheets')
            .update(targetFilePath, processedFile));
        } else {
          ({ error: storageError } = await supabase.storage
            .from('sheets')
            .upload(targetFilePath, processedFile));
        }
        if (storageError) throw storageError;

        // Always create a sheet record for this department so that filters
        // continue to work, but point to the shared file when subject is common.
        const { error: insertError } = await supabase.from('sheets').insert({
            sheet_name: processedFile.name,
            file_path: targetFilePath,
            department_id: selectedDepartment,
            subject_id: selectedSubject,
            year: academicTerm,
            batch: selectedSemester,
            maximum_internal_mark: maxInternalMark,
        });
        if (insertError) throw insertError;

        dismissToast(toastId);
        showSuccess('Sheet uploaded successfully!');
        fetchSheets();

    } catch (error: any) {
        dismissToast(toastId);
        showError(error.message || 'Failed to upload sheet.');
    } finally {
        setIsUploading(false);
        setIsPreviewOpen(false);
        setPreviewData([]);
        setUploadData([]);
        setOriginalFileName('');
    }
  };

  const handleDeleteSheet = async () => {
    if (!sheetToDelete) return;
    const toastId = showLoading('Deleting sheet...');
    try {
        const { error: storageError } = await supabase.storage.from('sheets').remove([sheetToDelete.file_path]);
        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from('sheets').delete().eq('id', sheetToDelete.id);
        if (dbError) throw dbError;

        dismissToast(toastId);
        showSuccess('Sheet deleted successfully.');
        setSheets(sheets.filter(s => s.id !== sheetToDelete.id));

    } catch (error: any) {
        dismissToast(toastId);
        showError(error.message || 'Failed to delete sheet.');
    } finally {
      setSheetToDelete(null);
    }
  };

  const loadSheetData = async (sheet: Sheet): Promise<Record<string, any>[] | null> => {
    const toastId = showLoading(`Loading ${sheet.sheet_name}...`);
    try {
        const { data, error } = await supabase.storage
            .from('sheets')
            .download(sheet.file_path);

        if (error) throw error;

        const arrayBuffer = await data.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheet found in the file.");
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        dismissToast(toastId);
        return json;
    } catch (error: any) {
        dismissToast(toastId);
        showError(error.message || 'Failed to load sheet.');
        return null;
    }
  };

  const handleViewSheet = async (sheet: Sheet) => {
    const jsonData = await loadSheetData(sheet);
    if (jsonData) {
      setCurrentSheetData(jsonData);
      setCurrentSheet(sheet);
      setIsViewerOpen(true);
    }
  };

  const handleDownloadSheet = async (sheet: Sheet) => {
    const jsonData = await loadSheetData(sheet);
    if (jsonData) {
      setSheetDataForDownload(jsonData);
      setSheetToDownload(sheet);
      setIsColumnSelectorOpen(true);
    }
  };

  const loadSheetDataAndOpenDialog = async (sheet: Sheet, dialogType: 'attendance' | 'duplicates') => {
    const jsonData = await loadSheetData(sheet);
    if (jsonData) {
      setSheetDataForDialog(jsonData);
      if (dialogType === 'attendance') {
          setSheetToEditAttendance(sheet);
      } else if (dialogType === 'duplicates') {
          setSheetToUpdateDuplicates(sheet);
      }
    }
  };

  const semesterOptions = academicTerm.includes('Odd')
    ? ["Sem 1", "Sem 3", "Sem 5", "Sem 7"]
    : ["Sem 2", "Sem 4", "Sem 6", "Sem 8"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sheets</h1>
        <div className="flex gap-2">
          <BulkDateTemplate 
            subjects={subjects} 
            departments={departments} 
          />
          <BulkDateManagerDialog 
            onSuccess={fetchSheets} 
          />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Upload New Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-grow" style={{ minWidth: '180px' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <Select onValueChange={setSelectedDepartment} value={selectedDepartment} disabled={loadingDepartments}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingDepartments ? "Loading..." : "Select a department"} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.department_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-grow" style={{ minWidth: '180px' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedDepartment || loadingSubjects}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingSubjects ? "Loading..." : "Select a subject"} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(sub => (
                    <SelectItem key={sub.id} value={sub.id}>{sub.subject_name} ({sub.subject_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-grow" style={{ minWidth: '180px' }}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Term</label>
              <Select onValueChange={(value) => { setAcademicTerm(value); setSelectedSemester(''); }} value={academicTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an academic term" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {academicTermOptions.map(term => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {academicTerm && (
              <div className="flex-grow" style={{ minWidth: '150px' }}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <Select onValueChange={setSelectedSemester} value={selectedSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesterOptions.map(sem => (
                      <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Button onClick={() => fileInputRef.current?.click()} disabled={!selectedDepartment || !selectedSubject || !academicTerm || !selectedSemester}>Add Sheet</Button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {selectedSubject && (
        <Card>
          <CardHeader>
            <CardTitle>Available Sheets</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSheets ? (
              <p>Loading sheets...</p>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sheet Name</TableHead>
                      <TableHead>Academic Term</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Uploaded At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheets.length > 0 ? (
                      sheets.map(sheet => (
                        <TableRow key={sheet.id}>
                          <TableCell className="font-medium">{sheet.sheet_name}</TableCell>
                          <TableCell>{sheet.year || 'N/A'}</TableCell>
                          <TableCell>{sheet.batch || 'N/A'}</TableCell>
                          <TableCell>{new Date(sheet.created_at).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewSheet(sheet)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  <span>View Sheet</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadSheet(sheet)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  <span>Download</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSheetToAssignDate(sheet)}>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  <span>Assign Date</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => loadSheetDataAndOpenDialog(sheet, 'attendance')}>
                                  <CheckSquare className="mr-2 h-4 w-4" />
                                  <span>Edit Attendance</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => loadSheetDataAndOpenDialog(sheet, 'duplicates')}>
                                  <Hash className="mr-2 h-4 w-4" />
                                  <span>Update Duplicates</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSheetToUpdateMarks(sheet)}>
                                  <Edit3 className="mr-2 h-4 w-4" />
                                  <span>Update Marks</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSheetToDelete(sheet)} className="text-red-600 hover:!text-red-600 focus:text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No sheets found for this subject.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <AlertDialog open={!!sheetToDelete} onOpenChange={(isOpen) => !isOpen && setSheetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the sheet from storage and the database.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSheet} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={!!sheetToAssignDate} onOpenChange={(isOpen) => !isOpen && setSheetToAssignDate(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Assign Sheet Dates</DialogTitle></DialogHeader>
            {sheetToAssignDate && <EditSheetForm sheet={sheetToAssignDate} onSuccess={() => { setSheetToAssignDate(null); fetchSheets(); }} />}
        </DialogContent>
      </Dialog>

      <EditableSheetViewerDialog
          isOpen={!!sheetToEditAttendance}
          onClose={(didSave) => {
              setSheetToEditAttendance(null);
              if (didSave) fetchSheets();
          }}
          sheet={sheetToEditAttendance}
          sheetData={sheetDataForDialog}
          forceEditable={true}
      />

      <SheetViewerDialog
          isOpen={!!sheetToUpdateDuplicates}
          onClose={() => {
            setSheetToUpdateDuplicates(null);
            fetchSheets();
          }}
          sheet={sheetToUpdateDuplicates}
          sheetData={sheetDataForDialog}
          showDuplicateGenerator={true}
          forceGenerate={true}
      />

      <StaffSheetViewerDialog
          isOpen={!!sheetToUpdateMarks}
          onClose={(didSave) => {
              setSheetToUpdateMarks(null);
              if (didSave) fetchSheets();
          }}
          sheet={sheetToUpdateMarks}
          forceEditable={true}
      />

      <SheetViewerDialog
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        sheet={currentSheet}
        sheetData={currentSheetData}
      />
      <SheetUploadPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleConfirmUpload}
        previewData={previewData}
        isUploading={isUploading}
      />
      {sheetToDownload && (
        <EnhancedDownloadDialog
          isOpen={isColumnSelectorOpen}
          onClose={() => setIsColumnSelectorOpen(false)}
          sheetData={sheetDataForDownload}
          sheetName={sheetToDownload.sheet_name}
          maxInternalMark={sheetToDownload.maximum_internal_mark || 50}
        />
      )}
    </div>
  );
};

export default Sheets;