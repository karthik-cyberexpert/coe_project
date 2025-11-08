import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Eye, Download } from 'lucide-react';
import SheetViewerDialog from '@/components/SheetViewerDialog';
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

const CoeSheets = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentSheet, setCurrentSheet] = useState<Sheet | null>(null);
  const [currentSheetData, setCurrentSheetData] = useState<Record<string, any>[]>([]);

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
          setCurrentSheet(sheet);
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
      <h1 className="text-3xl font-bold">View Sheets</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Select Department and Subject</CardTitle>
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
      <SheetViewerDialog
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        sheet={currentSheet}
        sheetData={currentSheetData}
        showDuplicateGenerator={true}
      />
    </div>
  );
};

export default CoeSheets;