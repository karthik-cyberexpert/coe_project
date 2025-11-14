import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Eye, Download } from 'lucide-react';
import SheetViewerDialog from '@/components/SheetViewerDialog';
import { EnhancedDownloadDialog } from '@/components/EnhancedDownloadDialog';
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

interface Sheet {
  id: string;
  sheet_name: string;
  file_path: string;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
  duplicates_generated: boolean;
  maximum_internal_mark?: number | null;
  year?: string | null;
  batch?: string | null;
  subjects: {
    subject_code: string;
    subject_name: string;
  } | null;
  departments: {
    department_name: string;
  } | null;
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

  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [sheetToDownload, setSheetToDownload] = useState<Sheet | null>(null);
  const [sheetDataForDownload, setSheetDataForDownload] = useState<Record<string, any>[]>([]);

  const fetchSheets = useCallback(async () => {
    if (!selectedSubject) {
      setSheets([]);
      return;
    }
    setLoadingSheets(true);
    const { data, error } = await supabase
      .from('sheets')
      .select('*, duplicates_generated, subjects(subject_code, subject_name), departments(department_name)')
      .eq('subject_id', selectedSubject)
      .eq('attendance_marked', true)
      .order('created_at', { ascending: false});
    
    if (error) {
      showError('Failed to fetch sheets.');
    } else {
      setSheets(data as Sheet[]);
    }
    setLoadingSheets(false);
  }, [selectedSubject]);

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
      .channel('public-sheets-coe')
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
    if (!checkDateAvailability(sheet)) return;
    const jsonData = await loadSheetData(sheet);
    if (jsonData) {
      setCurrentSheetData(jsonData);
      setCurrentSheet(sheet);
      setIsViewerOpen(true);
    }
  };

  const handleDownloadSheet = async (sheet: Sheet) => {
    if (!checkDateAvailability(sheet)) return;
    const jsonData = await loadSheetData(sheet);
    if (jsonData) {
      setSheetDataForDownload(jsonData);
      setSheetToDownload(sheet);
      setIsColumnSelectorOpen(true);
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
                      <TableHead>Subject Code</TableHead>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Uploaded At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheets.length > 0 ? sheets.map(sheet => (
                      <TableRow key={sheet.id}>
                        <TableCell className="font-medium">{sheet.sheet_name}</TableCell>
                        <TableCell>{sheet.subjects?.subject_code || 'N/A'}</TableCell>
                        <TableCell>{sheet.subjects?.subject_name || 'N/A'}</TableCell>
                        <TableCell>{sheet.departments?.department_name || 'N/A'}</TableCell>
                        <TableCell>{sheet.year || 'N/A'}</TableCell>
                        <TableCell>{sheet.batch || 'N/A'}</TableCell>
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
                        <TableCell colSpan={8} className="text-center">No sheets found for this subject.</TableCell>
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
        showBundleNumber={true}
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

export default CoeSheets;