import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, dismissToast, showSuccess, showError } from "@/utils/toast";
import * as XLSX from 'xlsx';
import { Sheet } from "@/pages/StaffSheets";

interface StaffSheetViewerDialogProps {
  isOpen: boolean;
  onClose: (didSave: boolean) => void;
  sheet: Sheet | null;
}

const StaffSheetViewerDialog = ({ isOpen, onClose, sheet }: StaffSheetViewerDialogProps) => {
  const [fullSheetData, setFullSheetData] = useState<Record<string, any>[]>([]);
  const [bundleOptions, setBundleOptions] = useState<string[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<string>('');
  const [editedData, setEditedData] = useState<Record<string, any>[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [duplicateNumberKey, setDuplicateNumberKey] = useState<string | null>(null);
  const [externalMarkKey, setExternalMarkKey] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    const loadSheetData = async () => {
      if (!isOpen || !sheet) return;

      setLoading(true);
      const toastId = showLoading('Loading sheet data...');
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('sheets')
          .download(sheet.file_path);
        
        if (downloadError) throw downloadError;

        const workbook = XLSX.read(await fileData.arrayBuffer(), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheet found in the file.");
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
        setFullSheetData(jsonData);

        if (jsonData.length > 0) {
            const firstRowKeys = Object.keys(jsonData[0]);
            const attKey = firstRowKeys.find(k => k.toLowerCase() === 'attendance');
            const dupKey = firstRowKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'duplicatenumber');
            const extKey = firstRowKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'externalmark');
            const subjectCode = sheet.subjects?.subject_code;

            if (!dupKey || !extKey || !subjectCode) {
                throw new Error("Sheet is missing required columns (duplicate number, external mark) or subject code.");
            }
            setDuplicateNumberKey(dupKey);
            setExternalMarkKey(extKey);

            const presentStudents = (attKey 
                ? jsonData.filter(row => String(row[attKey]).trim().toLowerCase() === 'present')
                : jsonData
            ).sort((a, b) => (Number(a[dupKey]) || 0) - (Number(b[dupKey]) || 0));

            const subjectCodePrefix = subjectCode.slice(0, 6);
            const bundles = new Set<string>();
            presentStudents.forEach((_, index) => {
                const bundleName = `${subjectCodePrefix}-${String(Math.floor(index / 20) + 1).padStart(2, '0')}`;
                bundles.add(bundleName);
            });
            setBundleOptions(Array.from(bundles));
        }
        dismissToast(toastId);
      } catch (err: any) {
        dismissToast(toastId);
        showError(err.message || 'Failed to load sheet data.');
        onClose(false);
      } finally {
        setLoading(false);
      }
    };

    loadSheetData();

    return () => { // Cleanup on close
      setFullSheetData([]);
      setBundleOptions([]);
      setSelectedBundle('');
      setEditedData([]);
      setHasSaved(false);
    };
  }, [isOpen, sheet]);

  useEffect(() => {
    if (!selectedBundle || fullSheetData.length === 0 || !duplicateNumberKey || !sheet?.subjects?.subject_code) {
      setEditedData([]);
      return;
    }

    const attKey = Object.keys(fullSheetData[0]).find(k => k.toLowerCase() === 'attendance');
    const presentStudents = (attKey 
        ? fullSheetData.filter(row => String(row[attKey]).trim().toLowerCase() === 'present')
        : fullSheetData
    ).sort((a, b) => (Number(a[duplicateNumberKey]) || 0) - (Number(b[duplicateNumberKey]) || 0));

    const subjectCodePrefix = sheet.subjects.subject_code.slice(0, 6);
    const bundleStudents = presentStudents.filter((_, index) => {
        const bundleName = `${subjectCodePrefix}-${String(Math.floor(index / 20) + 1).padStart(2, '0')}`;
        return bundleName === selectedBundle;
    });

    setEditedData(JSON.parse(JSON.stringify(bundleStudents)));
  }, [selectedBundle, fullSheetData, duplicateNumberKey, sheet]);

  const handleMarkChange = (rowIndex: number, value: string) => {
    if (!externalMarkKey) return;
    
    const mark = parseInt(value, 10);
    if (value !== '' && (isNaN(mark) || mark < 0 || mark > 100)) {
      showError("Mark must be a number between 0 and 100.");
      return;
    }

    const newData = [...editedData];
    newData[rowIndex][externalMarkKey] = value === '' ? '' : mark;
    setEditedData(newData);
  };

  const handleSaveChanges = async () => {
    if (!sheet || !externalMarkKey || !duplicateNumberKey) return;

    setIsSaving(true);
    const toastId = showLoading("Saving external marks...");

    try {
      const editedMarksMap = new Map(editedData.map(row => [row[duplicateNumberKey], row[externalMarkKey]]));
      const updatedSheetData = fullSheetData.map(row => {
        const dupNum = row[duplicateNumberKey];
        if (editedMarksMap.has(dupNum)) {
          return { ...row, [externalMarkKey]: editedMarksMap.get(dupNum) };
        }
        return row;
      });

      const newWorksheet = XLSX.utils.json_to_sheet(updatedSheetData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
      
      const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      await supabase.storage.from('sheets').update(sheet.file_path, blob, { upsert: true });

      const allBundlesFinished = updatedSheetData
        .filter(row => row[externalMarkKey] !== undefined)
        .every(row => String(row[externalMarkKey]).trim() !== '');

      if (allBundlesFinished) {
        await supabase.from('sheets').update({ external_marks_added: true }).eq('id', sheet.id);
      }

      setHasSaved(true);
      dismissToast(toastId);
      showSuccess("External marks saved successfully!");
      onClose(true);

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to save the sheet.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(hasSaved)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader><DialogTitle>{sheet?.sheet_name || 'Update Marks'}</DialogTitle></DialogHeader>
        
        {loading ? <p className="text-center py-8">Loading...</p> : (
          <>
            <div className="mb-4">
              <Label>Bundle Number</Label>
              <Select onValueChange={setSelectedBundle} value={selectedBundle} disabled={bundleOptions.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={bundleOptions.length > 0 ? "Select bundle" : "No bundles found"} />
                </SelectTrigger>
                <SelectContent>
                  {bundleOptions.map(bundle => (
                    <SelectItem key={bundle} value={bundle}>{bundle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-grow overflow-hidden min-h-0">
              <ScrollArea className="h-[50vh] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{duplicateNumberKey || 'Duplicate Number'}</TableHead>
                      <TableHead>{externalMarkKey || 'External Mark'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editedData.length > 0 ? editedData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell>{row[duplicateNumberKey]}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={row[externalMarkKey] || ''}
                            onChange={(e) => handleMarkChange(rowIndex, e.target.value)}
                            className="w-24"
                          />
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center h-24">
                          {selectedBundle ? 'This bundle is empty.' : 'Please select a bundle to view students.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onClose(hasSaved)}>Close</Button>
              <Button onClick={handleSaveChanges} disabled={isSaving || editedData.length === 0}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffSheetViewerDialog;