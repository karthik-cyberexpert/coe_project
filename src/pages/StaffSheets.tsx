import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import StaffSheetViewerDialog from '@/components/StaffSheetViewerDialog';
import { Label } from '@/components/ui/label';

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
  external_marks_added?: boolean;
  year?: string | null;
  batch?: string | null;
  maximum_internal_mark?: number | null;
  duplicates_generated?: boolean;
  attendance_marked?: boolean;
  subjects?: {
    subject_code: string;
    subject_name: string;
  } | null;
}

const StaffSheets = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicTermOptions, setAcademicTermOptions] = useState<string[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [academicTerm, setAcademicTerm] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  
  const [loading, setLoading] = useState({
    departments: true,
    subjects: false,
    sheets: false,
  });

  const [sheetToView, setSheetToView] = useState<Sheet | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fetchSheets = useCallback(async () => {
    if (!selectedDepartment || !selectedSubject || !academicTerm || !selectedSemester) {
      setSheets([]);
      return;
    }

    setLoading(prev => ({ ...prev, sheets: true }));
    const { data, error } = await supabase
      .from('sheets')
      .select('*, subjects(subject_code, subject_name)')
      .eq('department_id', selectedDepartment)
      .eq('subject_id', selectedSubject)
      .eq('year', academicTerm)
      .eq('batch', selectedSemester)
      .eq('duplicates_generated', true)
      .order('created_at', { ascending: false });

    if (error) {
      showError('Failed to fetch sheets.');
      setSheets([]);
    } else {
      const allSheets = (data || []) as (Sheet & { subject_id?: string })[];
      // Extra safety: only keep rows whose subject_id matches the currently selected subject
      const filtered = allSheets.filter((sheet) => sheet.subject_id === selectedSubject);
      setSheets(filtered as Sheet[]);
    }
    setLoading(prev => ({ ...prev, sheets: false }));
  }, [selectedDepartment, selectedSubject, academicTerm, selectedSemester]);

  useEffect(() => {
    const generateAcademicTerms = () => {
      const terms = [];
      const currentYear = new Date().getFullYear();
      for (let year = currentYear; year >= 2020; year--) {
        terms.push(`${year} Odd Sem`);
        terms.push(`${year} Even Sem`);
      }
      setAcademicTermOptions(terms);
    };
    generateAcademicTerms();

    const fetchDepartments = async () => {
      setLoading(prev => ({ ...prev, departments: true }));
      const { data, error } = await supabase.from('departments').select('id, department_name');
      if (error) {
        showError('Failed to fetch departments.');
      } else {
        setDepartments(data);
      }
      setLoading(prev => ({ ...prev, departments: false }));
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
      setLoading(prev => ({ ...prev, subjects: true }));
      setSelectedSubject('');
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
      setLoading(prev => ({ ...prev, subjects: false }));
    };
    fetchSubjects();
  }, [selectedDepartment]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const handleOpenSheet = (sheet: Sheet) => {
    setSheetToView(sheet);
    setIsViewerOpen(true);
  };

  const handleViewerClose = (didSave: boolean) => {
    setIsViewerOpen(false);
    setSheetToView(null);
    if (didSave) {
      fetchSheets();
    }
  };

  const semesterOptions = academicTerm.includes('Odd')
    ? ["Sem 1", "Sem 3", "Sem 5", "Sem 7"]
    : ["Sem 2", "Sem 4", "Sem 6", "Sem 8"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Update Marks</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Select Sheet Criteria</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <div>
            <Label>Department</Label>
            <Select onValueChange={setSelectedDepartment} value={selectedDepartment} disabled={loading.departments}>
              <SelectTrigger>
                <SelectValue placeholder={loading.departments ? "Loading..." : "Select department"} />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.department_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedDepartment || loading.subjects}>
              <SelectTrigger>
                <SelectValue placeholder={loading.subjects ? "Loading..." : "Select subject"} />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.subject_name} ({sub.subject_code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Academic Term</Label>
            <Select onValueChange={(value) => { setAcademicTerm(value); setSelectedSemester(''); }} value={academicTerm}>
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {academicTermOptions.map(term => (
                  <SelectItem key={term} value={term}>{term}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Semester</Label>
            <Select onValueChange={setSelectedSemester} value={selectedSemester} disabled={!academicTerm}>
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {semesterOptions.map(sem => (
                  <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Available Sheets</CardTitle></CardHeader>
        <CardContent>
          {loading.sheets ? <p>Loading sheets...</p> : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sheet Name</TableHead>
                    <TableHead>Uploaded At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheets.length > 0 ? sheets.map(sheet => (
                    <TableRow key={sheet.id}>
                      <TableCell className="font-medium">{sheet.sheet_name}</TableCell>
                      <TableCell>{new Date(sheet.created_at).toLocaleString()}</TableCell>
                      <TableCell>{sheet.external_marks_added ? 'Finished' : 'Pending'}</TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => handleOpenSheet(sheet)}>
                          {sheet.external_marks_added ? 'View Details' : 'Update Marks'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        No sheets found for the selected criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <StaffSheetViewerDialog
        isOpen={isViewerOpen}
        onClose={handleViewerClose}
        sheet={sheetToView}
        forceEditable={!sheetToView?.external_marks_added}
      />
    </div>
  );
};

export default StaffSheets;