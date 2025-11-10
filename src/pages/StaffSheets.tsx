import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import StaffSheetViewerDialog from '@/components/StaffSheetViewerDialog';
import * as XLSX from 'xlsx';
import { Label } from '@/components/ui/label';

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
  external_marks_added: boolean;
  subjects: {
    subject_code: string;
  } | null;
}

const StaffSheets = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicTermOptions, setAcademicTermOptions] = useState<string[]>([]);
  const [bundleOptions, setBundleOptions] = useState<string[]>([]);
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [academicTerm, setAcademicTerm] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedBundle, setSelectedBundle] = useState<string>('');
  
  const [loading, setLoading] = useState({
    departments: true,
    subjects: false,
    sheet: false,
    bundles: false,
  });

  const [activeSheet, setActiveSheet] = useState<Sheet | null>(null);
  const [fullSheetData, setFullSheetData] = useState<Record<string, any>[]>([]);
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [bundleDataForViewer, setBundleDataForViewer] = useState<Record<string, any>[]>([]);

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
        .select('id, subject_name, subject_code')
        .or(`department_id.eq.${selectedDepartment},department_id.is.null`);
      if (error) {
        showError('Failed to fetch subjects.');
      } else {
        setSubjects(data as Subject[]);
      }
      setLoading(prev => ({ ...prev, subjects: false }));
    };
    fetchSubjects();
  }, [selectedDepartment]);

  useEffect(() => {
    const findSheetAndPrepareBundles = async () => {
      setActiveSheet(null);
      setFullSheetData([]);
      setBundleOptions([]);
      setSelectedBundle('');

      if (!selectedDepartment || !selectedSubject || !academicTerm || !selectedSemester) {
        return;
      }

      setLoading(prev => ({ ...prev, sheet: true, bundles: true }));
      const toastId = showLoading('Finding matching sheet...');

      try {
        const { data: sheetData, error } = await supabase
          .from('sheets')
          .select('*, subjects(subject_code)')
          .eq('department_id', selectedDepartment)
          .eq('subject_id', selectedSubject)
          .eq('year', academicTerm)
          .eq('batch', selectedSemester)
          .maybeSingle();

        if (error) throw error;
        if (!sheetData) {
          throw new Error('No sheet found for the selected criteria. Please check your selections.');
        }
        
        const foundSheet = sheetData as Sheet;
        setActiveSheet(foundSheet);

        dismissToast(toastId);
        const downloadToastId = showLoading('Loading sheet data...');

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('sheets')
          .download(foundSheet.file_path);
        
        if (downloadError) throw downloadError;

        const workbook = XLSX.read(await fileData.arrayBuffer(), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheet found in the file.");
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
        setFullSheetData(jsonData);

        if (jsonData.length > 0) {
            const firstRowKeys = Object.keys(jsonData[0]);
            const attendanceKey = firstRowKeys.find(k => k.toLowerCase() === 'attendance');
            const duplicateNumberKey = firstRowKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'duplicatenumber');
            const subjectCode = foundSheet.subjects?.subject_code;

            if (!duplicateNumberKey || !subjectCode) {
                throw new Error("Sheet is missing 'duplicate number' column or subject code is unavailable.");
            }

            const presentStudents = (attendanceKey 
                ? jsonData.filter(row => String(row[attendanceKey]).trim().toLowerCase() === 'present')
                : jsonData
            ).sort((a, b) => (Number(a[duplicateNumberKey]) || 0) - (Number(b[duplicateNumberKey]) || 0));

            const subjectCodePrefix = subjectCode.slice(0, 6);
            const bundles = new Set<string>();
            presentStudents.forEach((_, index) => {
                const bundleName = `${subjectCodePrefix}-${String(Math.floor(index / 20) + 1).padStart(2, '0')}`;
                bundles.add(bundleName);
            });
            setBundleOptions(Array.from(bundles));
        }

        dismissToast(downloadToastId);
      } catch (err: any) {
        dismissToast(toastId);
        showError(err.message || 'An error occurred.');
        setActiveSheet(null);
        setFullSheetData([]);
        setBundleOptions([]);
        setSelectedBundle('');
      } finally {
        setLoading(prev => ({ ...prev, sheet: false, bundles: false }));
      }
    };

    findSheetAndPrepareBundles();
  }, [selectedDepartment, selectedSubject, academicTerm, selectedSemester]);

  const handleEditMarks = () => {
    if (!selectedBundle || !activeSheet || fullSheetData.length === 0) return;

    const firstRowKeys = Object.keys(fullSheetData[0]);
    const attendanceKey = firstRowKeys.find(k => k.toLowerCase() === 'attendance');
    const duplicateNumberKey = firstRowKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'duplicatenumber');
    const subjectCode = activeSheet.subjects?.subject_code;

    if (!duplicateNumberKey || !subjectCode) {
        showError("Cannot determine bundle data. Sheet is missing required columns.");
        return;
    }

    const presentStudents = (attendanceKey 
        ? fullSheetData.filter(row => String(row[attendanceKey]).trim().toLowerCase() === 'present')
        : fullSheetData
    ).sort((a, b) => (Number(a[duplicateNumberKey]) || 0) - (Number(b[duplicateNumberKey]) || 0));

    const subjectCodePrefix = subjectCode.slice(0, 6);
    const bundleStudents = presentStudents.filter((_, index) => {
        const bundleName = `${subjectCodePrefix}-${String(Math.floor(index / 20) + 1).padStart(2, '0')}`;
        return bundleName === selectedBundle;
    });

    setBundleDataForViewer(bundleStudents);
    setIsViewerOpen(true);
  };

  const handleViewerClose = (didSave: boolean) => {
    setIsViewerOpen(false);
    if (didSave) {
      setSelectedBundle('');
      setBundleOptions([]);
      setActiveSheet(null);
      setSelectedSemester('');
    }
  };

  const semesterOptions = academicTerm.includes('Odd')
    ? ["Sem 1", "Sem 3", "Sem 5", "Sem 7"]
    : ["Sem 2", "Sem 4", "Sem 6", "Sem 8"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Update External Marks</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Select Sheet and Bundle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <Label>Bundle Number</Label>
              <Select onValueChange={setSelectedBundle} value={selectedBundle} disabled={!activeSheet || loading.bundles}>
                <SelectTrigger>
                  <SelectValue placeholder={loading.bundles ? "Loading..." : "Select bundle"} />
                </SelectTrigger>
                <SelectContent>
                  {bundleOptions.map(bundle => (
                    <SelectItem key={bundle} value={bundle}>{bundle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleEditMarks} disabled={!selectedBundle || !!activeSheet?.external_marks_added}>
              {activeSheet?.external_marks_added ? 'Marks Already Added' : 'Edit Marks'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <StaffSheetViewerDialog
        isOpen={isViewerOpen}
        onClose={handleViewerClose}
        sheet={activeSheet}
        sheetData={bundleDataForViewer}
        fullSheetData={fullSheetData}
      />
    </div>
  );
};

export default StaffSheets;