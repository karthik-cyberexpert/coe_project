import { useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardContext, Profile } from '@/contexts/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SheetViewerDialog from '@/components/SheetViewerDialog';
import EditableSheetViewerDialog from '@/components/EditableSheetViewerDialog';
import StaffSheetViewerDialog from '@/components/StaffSheetViewerDialog';
import * as XLSX from 'xlsx';

interface SheetWithRelations {
  id: string;
  sheet_name: string;
  file_path: string;
  attendance_marked: boolean;
  duplicates_generated: boolean;
  external_marks_added: boolean;
  year?: string | null;
  batch?: string | null;
  departments: {
    degree: string;
    department_name: string;
  } | null;
  subjects: {
    subject_code: string;
    subject_name: string;
  } | null;
}

const DashboardHome = () => {
  const { profile } = useContext(DashboardContext);
  const [sheets, setSheets] = useState<SheetWithRelations[]>([]);
  const [filteredSheets, setFilteredSheets] = useState<SheetWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const [yearFilter, setYearFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [quarterOptions, setQuarterOptions] = useState<string[]>([]);

  const [viewingSheet, setViewingSheet] = useState<SheetWithRelations | null>(null);
  const [sheetContent, setSheetContent] = useState<Record<string, any>[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fetchSheets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sheets')
      .select('*, departments(degree, department_name), subjects(subject_code, subject_name)')
      .order('created_at', { ascending: false });

    if (error) {
      showError('Failed to fetch sheet statuses.');
    } else {
      const sheetData = data as any[];
      setSheets(sheetData);
      setFilteredSheets(sheetData);

      if (sheetData.length > 0) {
        const uniqueYears = new Set<string>();
        const uniqueQuarters = new Set<string>();
        sheetData.forEach(sheet => {
          if (sheet.year) {
            const parts = sheet.year.split(' ');
            if (parts.length >= 2) {
              uniqueYears.add(parts[0]);
              uniqueQuarters.add(parts.slice(1).join(' '));
            }
          }
        });
        setYearOptions(['all', ...Array.from(uniqueYears)]);
        setQuarterOptions(['all', ...Array.from(uniqueQuarters)]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSheets();
  }, []);

  useEffect(() => {
    let tempSheets = [...sheets];
    if (yearFilter !== 'all') {
      tempSheets = tempSheets.filter(sheet => sheet.year?.startsWith(yearFilter));
    }
    if (quarterFilter !== 'all') {
      tempSheets = tempSheets.filter(sheet => sheet.year?.endsWith(quarterFilter));
    }
    setFilteredSheets(tempSheets);
  }, [sheets, yearFilter, quarterFilter]);

  const getStatus = (sheet: SheetWithRelations, userProfile: Profile) => {
    let status: 'Pending' | 'Finished' = 'Pending';
    let variant: 'default' | 'secondary' = 'secondary';
    let text = 'Pending';

    if (userProfile.is_admin) {
      if (!sheet.attendance_marked) {
        text = 'Pending Attendance';
      } else if (!sheet.duplicates_generated) {
        text = 'Pending Duplicates';
      } else if (!sheet.external_marks_added) {
        text = 'Pending Marks';
      } else {
        status = 'Finished';
        text = 'Completed';
      }
    } else if (userProfile.is_sub_admin) {
      if (sheet.attendance_marked) status = 'Finished';
    } else if (userProfile.is_ceo) {
      if (sheet.duplicates_generated) status = 'Finished';
    } else if (userProfile.is_staff) {
      if (sheet.external_marks_added) status = 'Finished';
    }

    if (status === 'Finished' || text === 'Completed') {
      variant = 'default';
      text = text === 'Completed' ? text : 'Finished';
    }

    return <Badge variant={variant} className={variant === 'default' ? 'bg-green-500' : 'bg-yellow-500'}>{text}</Badge>;
  };

  const handleRowClick = async (sheet: SheetWithRelations) => {
    if (!profile) return;

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
          
          setSheetContent(json);
          setViewingSheet(sheet);
          setIsViewerOpen(true);
          dismissToast(toastId);
        } catch (parseError: any) {
          dismissToast(toastId);
          showError(`Failed to parse sheet: ${parseError.message}`);
        }
      };
      reader.readAsArrayBuffer(data);
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || 'Failed to download sheet.');
    }
  };

  const handleCloseViewer = (didSave: boolean) => {
    setIsViewerOpen(false);
    setViewingSheet(null);
    setSheetContent([]);
    if (didSave) {
      fetchSheets();
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome! Here's the current status of all sheets.</p>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sheet Status Overview</CardTitle>
            <div className="flex gap-2">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year}>{year === 'all' ? 'All Years' : year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={quarterFilter} onValueChange={setQuarterFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Semester" />
                </SelectTrigger>
                <SelectContent>
                  {quarterOptions.map(quarter => (
                    <SelectItem key={quarter} value={quarter}>{quarter === 'all' ? 'All Semesters' : quarter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sheet Name</TableHead>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Degree</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Academic Term</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSheets.length > 0 ? filteredSheets.map((sheet) => (
                  <TableRow key={sheet.id} onClick={() => handleRowClick(sheet)} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="font-medium">{sheet.sheet_name}</TableCell>
                    <TableCell>{sheet.subjects?.subject_code || 'N/A'}</TableCell>
                    <TableCell>{sheet.subjects?.subject_name || 'N/A'}</TableCell>
                    <TableCell>{sheet.departments?.degree || 'N/A'}</TableCell>
                    <TableCell>{sheet.departments?.department_name || 'N/A'}</TableCell>
                    <TableCell>{sheet.year || 'N/A'}</TableCell>
                    <TableCell>{sheet.batch || 'N/A'}</TableCell>
                    <TableCell>{profile && getStatus(sheet, profile)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No sheets found for the selected filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {profile?.is_admin || profile?.is_ceo ? (
        <SheetViewerDialog
            isOpen={isViewerOpen && !!viewingSheet}
            onClose={() => handleCloseViewer(false)}
            sheet={viewingSheet}
            sheetData={sheetContent}
            showDuplicateGenerator={profile.is_ceo}
            showBundleNumber={profile.is_admin || profile.is_ceo}
        />
      ) : null}
      {profile?.is_sub_admin ? (
        <EditableSheetViewerDialog
            isOpen={isViewerOpen && !!viewingSheet}
            onClose={handleCloseViewer}
            sheet={viewingSheet}
            sheetData={sheetContent}
        />
      ) : null}
      {profile?.is_staff && !profile.is_admin && !profile.is_ceo && !profile.is_sub_admin ? (
        <StaffSheetViewerDialog
            isOpen={isViewerOpen && !!viewingSheet}
            onClose={handleCloseViewer}
            sheet={viewingSheet}
            sheetData={sheetContent}
        />
      ) : null}
    </div>
  );
};

export default DashboardHome;