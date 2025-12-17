
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Download, RefreshCw, Archive, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { mysqlClient } from '@/lib/mysqlClient';
import { EnhancedDownloadDialog } from '@/components/EnhancedDownloadDialog';
import * as XLSX from 'xlsx';

interface Sheet {
  id: string;
  sheet_name: string;
  file_path: string;
  created_at: string;
  year?: string;
  batch?: string; // Semester
  external_marks_added: boolean;
  is_downloaded: boolean;
  subjects: {
    subject_code: string;
    subject_name: string;
  } | null;
  departments: {
    department_name: string;
  } | null;
  maximum_internal_mark?: number;
}

const CompletedSheets = () => {
  const [completedSheets, setCompletedSheets] = useState<Sheet[]>([]);
  const [downloadedSheets, setDownloadedSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);
  const [currentTab, setCurrentTab] = useState("completed");

  // Single download state
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [sheetToDownload, setSheetToDownload] = useState<Sheet | null>(null);
  const [sheetDataForDownload, setSheetDataForDownload] = useState<Record<string, any>[]>([]);

  const fetchSheets = useCallback(async () => {
    setLoading(true);
    // Fetch all sheets that are finalized
    const { data, error } = await supabase
      .from('sheets')
      .select('*, subjects(subject_code, subject_name), departments(department_name)')
      .eq('external_marks_added', true)
      .order('created_at', { ascending: false });

    if (error) {
      showError('Failed to fetch completed sheets.');
    } else {
      const all: Sheet[] = (data || []).map((s: any) => ({
        ...s,
        // Ensure is_downloaded is treated as boolean
        is_downloaded: !!s.is_downloaded
      }));
      setCompletedSheets(all.filter(s => !s.is_downloaded));
      setDownloadedSheets(all.filter(s => s.is_downloaded));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const handleBulkArchive = async () => {
    if (completedSheets.length === 0) {
      showError("No sheets to archive.");
      return;
    }

    setIsArchiving(true);
    const toastId = showLoading(`Archiving ${completedSheets.length} sheets to C:\\COE\\Sheets...`);

    try {
      const response = await mysqlClient.post<{success: boolean, count: number, message: string}>('/admin/bulk-archive', {});
      
      dismissToast(toastId);
      if (response.error) {
        throw response.error;
      }

      if (response.data && response.data.success) {
        showSuccess(response.data.message || `Successfully archived ${response.data.count} sheets.`);
        // Refresh list
        fetchSheets();
      } else {
        showError("Archival finished with warnings. Check server logs.");
        fetchSheets();
      }
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to archive sheets.");
    } finally {
      setIsArchiving(false);
    }
  };

  // Manual Download Logic (reused)
  const loadSheetData = async (sheet: Sheet) => {
    const toastId = showLoading(`Loading ${sheet.sheet_name}...`);
    try {
      // Use mysqlClient directly as we might need auth header for storage
      const { data, error } = await mysqlClient.storage.from('sheets').download(sheet.file_path);
      if (error) throw error;
      if (!data) throw new Error("No data received");

      const arrayBuffer = await data.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      // Inject bundle number
      const subjectCode = sheet.subjects?.subject_code || 'CODE';
      const enriched = json.map((row: any, idx: number) => ({
        ...row,
        'Bundle Number': `${subjectCode}-${String(Math.ceil((idx + 1) / 20)).padStart(2, '0')}`
      }));
      
      dismissToast(toastId);
      return enriched;
    } catch (e: any) {
      dismissToast(toastId);
      showError(e.message || "Download failed");
      return null;
    }
  };

  const handleManualDownload = async (sheet: Sheet) => {
    const data = await loadSheetData(sheet);
    if (data) {
      setSheetDataForDownload(data);
      setSheetToDownload(sheet);
      setIsColumnSelectorOpen(true);
    }
  };

  const SheetsTable = ({ sheets, isDownloadedTab }: { sheets: Sheet[], isDownloadedTab: boolean }) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sheet Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Year</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sheets.length > 0 ? sheets.map(sheet => (
            <TableRow key={sheet.id}>
              <TableCell className="font-medium">
                {sheet.sheet_name}
                {isDownloadedTab && <CheckCircle className="inline h-3 w-3 ml-2 text-green-500" />}
              </TableCell>
              <TableCell>{sheet.departments?.department_name || 'N/A'}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{sheet.subjects?.subject_name}</span>
                  <span className="text-xs text-muted-foreground">{sheet.subjects?.subject_code}</span>
                </div>
              </TableCell>
              <TableCell>{sheet.batch || '-'}</TableCell>
              <TableCell>{sheet.year || '-'}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleManualDownload(sheet)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No sheets found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Completed Sheets</h1>
          <p className="text-muted-foreground mt-1">Manage finalized sheets and archival status.</p>
        </div>
        <Button variant="outline" onClick={fetchSheets} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="completed">
            Pending Archive
            <Badge variant="secondary" className="ml-2">{completedSheets.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="downloaded">
            Archived
            <Badge variant="secondary" className="ml-2">{downloadedSheets.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="completed" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Archives</CardTitle>
                <CardDescription>Sheets that are finalized but not yet archived to local server.</CardDescription>
              </div>
              {completedSheets.length > 0 && (
                <Button onClick={handleBulkArchive} disabled={isArchiving}>
                  <Archive className="h-4 w-4 mr-2" />
                  {isArchiving ? 'Archiving...' : 'Download All (To Server)'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? <p>Loading...</p> : <SheetsTable sheets={completedSheets} isDownloadedTab={false} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="downloaded" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Archived Sheets</CardTitle>
              <CardDescription>Sheets successfully saved to C:\COE\Sheets.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <p>Loading...</p> : <SheetsTable sheets={downloadedSheets} isDownloadedTab={true} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

export default CompletedSheets;
