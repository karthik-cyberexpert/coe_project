import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Eye, Trash2, Download } from 'lucide-react';
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
import SheetViewerDialog from '@/components/SheetViewerDialog';
import { SheetUploadPreviewDialog } from '@/components/SheetUploadPreviewDialog';
import * as XLSX from 'xlsx';

interface Department {
  id: string;
  department_name: string;
}

interface Subject {
  id: string;
  subject_name: string;
  subject_code: string;
}

interface Sheet {
  id: string;
  sheet_name: string;
  file_path: string;
  created_at: string;
}

const Sheets = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null);
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentSheetData, setCurrentSheetData] = useState<Record<string, any>[]>([]);
  const [currentSheetName, setCurrentSheetName] = useState('');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadData, setUploadData] = useState<any[]>([]);
  const [originalFileName, setOriginalFileName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
        .select('id, subject_name, subject_code')
        .or(`department_id.eq.${selectedDepartment},department_id.is.null`);

      if (error) {
        showError('Failed to fetch subjects.');
      } else {
        setSubjects(data as Subject[]);
      }
      setLoadingSubjects(false);
    };

    fetchSubjects();
  }, [selectedDepartment]);

  useEffect(() => {
    if (!selectedSubject) {
      setSheets([]);
      return;
    }

    const fetchSheets = async () => {
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
    };

    fetchSheets();
  }, [selectedSubject]);

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

      const processedData = jsonData.map(row => {
        const newRow: Record<string, any> = {};
        let rowSubjectCode: string | null = null;
        
        const originalKeys = Object.keys(row);
        const registerNumberKey = originalKeys.find(k => k.toLowerCase() === 'register number')!;
        const subjectCodeKey = originalKeys.find(k => k.toLowerCase() === 'subject code')!;

        for (const key of originalKeys) {
            newRow[key] = row[key];
            if (key.toLowerCase() === 'register number') {
                const registerNumber = String(row[registerNumberKey] || '');
                newRow['roll number'] = registerNumber.length >= 4 
                    ? registerNumber.slice(0, -4) + registerNumber.slice(-3) 
                    : '';
            }
            if (key.toLowerCase() === 'internal mark') {
                newRow['attendance'] = '';
            }
            if (key.toLowerCase() === 'subject code') {
                rowSubjectCode = String(row[subjectCodeKey] || '').trim();
            }
        }
        newRow.status = rowSubjectCode === selectedSubjectCode ? 'matched' : 'mismatched';
        return newRow;
      });

      const matchedRows = processedData
        .filter(row => row.status === 'matched')
        .map(({ status, ...rest }) => rest);

      setPreviewData(processedData);
      setUploadData(matchedRows);
      setIsPreviewOpen(true);
      dismissToast(toastId);

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || 'Failed to process sheet.');
    }
  };
  
  const handleConfirmUpload = async () => {
    if (uploadData.length === 0) {
        showError("No matched rows to upload.");
        return;
    }
    setIsUploading(true);
    const toastId = showLoading('Uploading sheet...');
    try {
        const newWorksheet = XLSX.utils.json_to_sheet(uploadData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'ProcessedData');
        const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const processedFile = new File([blob], originalFileName, { type: blob.type });

        const filePath = `${selectedDepartment}/${selectedSubject}/${Date.now()}-${processedFile.name}`;
        
        const { error: uploadError } = await supabase.storage.from('sheets').upload(filePath, processedFile);
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from('sheets').insert({
            sheet_name: processedFile.name,
            file_path: filePath,
            department_id: selectedDepartment,
            subject_id: selectedSubject,
        });
        if (insertError) throw insertError;

        dismissToast(toastId);
        showSuccess('Sheet uploaded successfully!');
        
        const { data: sheetsData, error: fetchError } = await supabase.from('sheets').select('*').eq('subject_id', selectedSubject).order('created_at', { ascending: false });
        if (!fetchError) setSheets(sheetsData);

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

  const handleViewSheet = async (sheet: Sheet) => {
    const toastId = showLoading(`Loading ${sheet.sheet_name}...`);
    try {
      const { data, error } = await supabase.storage
        .from('sheets')
        .download(sheet.file_path);

      if (error) throw error;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) throw new Error("No sheet found in the file.");
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          
          setCurrentSheetData(json);
          setCurrentSheetName(sheet.sheet_name);
          setIsViewerOpen(true);
          dismissToast(toastId);
        } catch (parseError: any) {
          dismissToast(toastId);
          showError(`Failed to parse sheet: ${parseError.message}`);
        }
      };
      reader.onerror = () => {
        dismissToast(toastId);
        showError('Failed to read the downloaded file.');
      };
      reader.readAsArrayBuffer(data);

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || 'Failed to download sheet.');
    }
  };

  const handleDownloadSheet = async (sheet: Sheet) => {
    const toastId = showLoading(`Preparing ${sheet.sheet_name} for download...`);
    try {
      const { data, error } = await supabase.storage
        .from('sheets')
        .download(sheet.file_path);

      if (error) throw error;

      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = sheet.sheet_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      dismissToast(toastId);
      showSuccess('Download started.');

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || 'Failed to download sheet.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sheets</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Upload New Sheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
            <div>
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
          </div>
          
          {selectedDepartment && selectedSubject && (
            <div className="pt-2">
              <Button onClick={() => fileInputRef.current?.click()}>Add Sheet</Button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx" />
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSubject && (
        <Card>
          <CardHeader>
            <CardTitle>Available Sheets</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSheets ? <p>Loading sheets...</p> : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sheet Name</TableHead>
                      <TableHead>Uploaded At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheets.length > 0 ? sheets.map(sheet => (
                      <TableRow key={sheet.id}>
                        <TableCell className="font-medium">{sheet.sheet_name}</TableCell>
                        <TableCell>{new Date(sheet.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right space-x-2">
                           <Button variant="ghost" size="icon" onClick={() => handleDownloadSheet(sheet)}>
                            <Download className="h-4 w-4" />
                          </Button>
                           <Button variant="ghost" size="icon" onClick={() => handleViewSheet(sheet)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setSheetToDelete(sheet)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">No sheets found for this subject.</TableCell>
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
      <SheetViewerDialog
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        sheetData={currentSheetData}
        sheetName={currentSheetName}
      />
      <SheetUploadPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleConfirmUpload}
        previewData={previewData}
        isUploading={isUploading}
      />
    </div>
  );
};

export default Sheets;