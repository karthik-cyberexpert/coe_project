import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Eye, Download } from 'lucide-react';
import EditableSheetViewerDialog from '@/components/EditableSheetViewerDialog';
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  start_date?: string | null;
  end_date?: string | null;
  attendance_marked: boolean;
}

const SubAdminSheets = () => {
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

  const fetchSheets = async () => {
    if (!selectedSubject) return;
    setLoadingSheets(true);
    const { data, error } = await supabase
      .from('sheets')
      .select('*, attendance_marked')
      .eq('subject_id', selectedSubject)
      .order('created_at', { ascending: false });
    
    if (error) {
      showError('Failed to fetch sheets.');
    } else {
      setSheets(data);
    }
    setLoadingSheets(false);
  };

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
    fetchSheets();
  }, [selectedSubject]);

  const checkDateAvailability = (sheet: Sheet) => {
    const now = new Date();
    const startDate = sheet.start_date ? new Date(sheet.start_date) : null;
    const endDate = sheet.end_date ? new Date(sheet.end_date) : null;

    if (startDate && now < startDate) {
      showError(`This sheet is not available until ${startDate.toLocaleString()}.`);
      return false;
    }
    if (endDate) {
      endDate.setHours(23, 59, 59, 999); // Make end date inclusive
    }
    if (endDate && now > endDate) {
      showError(`This sheet is no longer available after ${endDate.toLocaleString()}.`);
      return false;
    }
    return true;
  };

  const handleViewSheet = async (sheet: Sheet) => {
    if (!checkDateAvailability(sheet)) return;

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
    if (!checkDateAvailability(sheet)) return;

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

  const handleViewerClose = (didSave: boolean) => {
    setIsViewerOpen(false);
    if (didSave) {
      fetchSheets();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">View & Edit Sheets</h1>
      
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button variant="ghost" size="icon" onClick={() => handleViewSheet(sheet)} disabled={sheet.attendance_marked}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {sheet.attendance_marked && (
                                <TooltipContent>
                                  <p>Attendance already marked and cannot be edited.</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
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
      <EditableSheetViewerDialog
        isOpen={isViewerOpen}
        onClose={handleViewerClose}
        sheet={currentSheet}
        sheetData={currentSheetData}
      />
    </div>
  );
};

export default SubAdminSheets;