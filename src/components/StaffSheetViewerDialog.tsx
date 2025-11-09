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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, dismissToast, showSuccess, showError } from "@/utils/toast";
import * as XLSX from 'xlsx';

interface Sheet {
  id: string;
  sheet_name: string;
  file_path: string;
  created_at: string;
  external_marks_added?: boolean;
}

interface StaffSheetViewerDialogProps {
  isOpen: boolean;
  onClose: (didSave: boolean) => void;
  sheet: Sheet | null;
  sheetData: Record<string, any>[];
}

const StaffSheetViewerDialog = ({ isOpen, onClose, sheet, sheetData }: StaffSheetViewerDialogProps) => {
  const [editedData, setEditedData] = useState<Record<string, any>[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateNumberKey, setDuplicateNumberKey] = useState<string | null>(null);
  const [externalMarkKey, setExternalMarkKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sheetData.length > 0) {
      const firstRowKeys = Object.keys(sheetData[0]);
      const attendanceKey = firstRowKeys.find(k => k.toLowerCase() === 'attendance');
      
      const presentStudents = attendanceKey
        ? sheetData.filter(row => String(row[attendanceKey]).trim().toLowerCase() === 'present')
        : sheetData;

      setEditedData(JSON.parse(JSON.stringify(presentStudents)));
      
      const dupKey = firstRowKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'duplicatenumber') || null;
      const extKey = firstRowKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'externalmark') || null;
      setDuplicateNumberKey(dupKey);
      setExternalMarkKey(extKey);
    }
  }, [isOpen, sheetData]);

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
    if (!sheet || !externalMarkKey || !duplicateNumberKey) {
      showError("Sheet information is missing or malformed. Cannot save.");
      return;
    }

    setIsSaving(true);
    const toastId = showLoading("Saving external marks...");

    try {
      const originalSheetData = [...sheetData];
      const editedMarksMap = new Map(editedData.map(row => [row[duplicateNumberKey], row[externalMarkKey]]));

      const updatedSheetData = originalSheetData.map(row => {
        const duplicateNumber = row[duplicateNumberKey];
        if (editedMarksMap.has(duplicateNumber)) {
          return { ...row, [externalMarkKey]: editedMarksMap.get(duplicateNumber) };
        }
        return row;
      });

      const newWorksheet = XLSX.utils.json_to_sheet(updatedSheetData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
      
      const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      const { error: storageError } = await supabase.storage
        .from('sheets')
        .update(sheet.file_path, blob, {
          cacheControl: '0',
          upsert: true,
        });

      if (storageError) throw storageError;

      const allMarked = updatedSheetData.every(row => 
        row[externalMarkKey] !== null && row[externalMarkKey] !== undefined && String(row[externalMarkKey]).trim() !== ''
      );

      const { error: dbError } = await supabase
        .from('sheets')
        .update({ external_marks_added: allMarked })
        .eq('id', sheet.id);

      if (dbError) throw dbError;

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

  if (!sheet || !sheetData) return null;
  
  const isReadOnly = sheet.external_marks_added;

  if (sheetData.length === 0 || !duplicateNumberKey || !externalMarkKey) {
    return (
       <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{sheet.sheet_name}</DialogTitle></DialogHeader>
          <p className="py-8 text-center text-muted-foreground">
            This sheet is empty or does not contain 'duplicate number' and 'external mark' columns.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader><DialogTitle>{sheet.sheet_name}</DialogTitle></DialogHeader>
        <div className="flex-grow overflow-hidden min-h-0">
          <ScrollArea className="h-[60vh] w-full rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{duplicateNumberKey}</TableHead>
                  <TableHead>{externalMarkKey}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedData.map((row, rowIndex) => (
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
                        disabled={isReadOnly}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button onClick={handleSaveChanges} disabled={isSaving || isReadOnly}>
            {isSaving ? 'Saving...' : isReadOnly ? 'Saved' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffSheetViewerDialog;