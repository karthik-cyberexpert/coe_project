import { useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardContext, Profile } from '@/contexts/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';

interface SheetWithDept {
  id: string;
  sheet_name: string;
  attendance_marked: boolean;
  duplicates_generated: boolean;
  external_marks_added: boolean;
  departments: {
    degree: string;
    department_name: string;
  } | null;
}

const DashboardHome = () => {
  const { profile } = useContext(DashboardContext);
  const [sheets, setSheets] = useState<SheetWithDept[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSheets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sheets')
        .select('*, departments(degree, department_name)')
        .order('created_at', { ascending: false });

      if (error) {
        showError('Failed to fetch sheet statuses.');
      } else {
        setSheets(data as any[]);
      }
      setLoading(false);
    };

    fetchSheets();
  }, []);

  const getStatus = (sheet: SheetWithDept, userProfile: Profile) => {
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

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome! Here's the current status of all sheets.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Sheet Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sheet Name</TableHead>
                  <TableHead>Degree</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.length > 0 ? sheets.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell className="font-medium">{sheet.sheet_name}</TableCell>
                    <TableCell>{sheet.departments?.degree || 'N/A'}</TableCell>
                    <TableCell>{sheet.departments?.department_name || 'N/A'}</TableCell>
                    <TableCell>{profile && getStatus(sheet, profile)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No sheets found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;