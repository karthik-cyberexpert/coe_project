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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, dismissToast, showSuccess, showError } from "@/utils/toast";
import * as XLSX from 'xlsx';

interface Sheet {
  id: string;
  sheet_name: string;
  file_path: string;
  created_at: string;
  attendance_marked?: boolean;
}

interface EditableSheetViewerDialogProps {
  isOpen: boolean;
  onClose: (didSave: boolean) => void;
  sheet: Sheet | null;
  sheetData: Record<string, any>[];
}

const EditableSheetViewerDialog = ({ isOpen, onClose, sheet, sheetData }: EditableSheetViewerDialogProps) => {
  const [editedData, setEditedData] = useState<Record<string, any>[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [attendanceKey, setAttendanceKey] = useState<string | null>(null);
  const [registerNumberKey, setRegisterNumberKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sheetData.length > 0) {
      setEditedData(JSON.parse(JSON.stringify(sheetData))); // Deep copy
      const firstRowKeys = Object.keys(sheetData[0]);
      const attKey = firstRowKeys.find(k => k.toLowerCase() === 'attendance') || null;
      const regKey = firstRowKeys.find(k => k.toLowerCase().replace(/\s/g, '') === 'registernumber') || null;
      setAttendanceKey(attKey);
      setRegisterNumberKey(regKey);
    }
  }, [isOpen, sheetData]);

  const handleAttendanceChange = (rowIndex: number, value: string) => {
    if (!attendanceKey) return;
    const newData = [...editedData];
    newData[rowIndex][attendanceKey] = value === 'null' ? '' : value;
    setEditedData(newData);
  };

  const handleSaveChanges = async () => {
    if (!sheet || !attendanceKey) {
      showError("Sheet information is missing. Cannot save.");
      return;
    }

    setIsSaving(true);
    const toastId = showLoading("Saving attendance...");

    try {
      const newWorksheet = XLSX.utils.json_to_sheet(editedData);
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

      const allMarked = editedData.every(row => 
        row[attendanceKey] && (String(row[attendanceKey]).toLowerCase() === 'present' || String(row[attendanceKey]).toLowerCase() === 'absent')
      );

      const { error: dbError } = await supabase
        .from('sheets')
        .update({ attendance_marked: allMarked })
        .eq('id', sheet.id);

      if (dbError) throw dbError;

      dismissToast(toastId);
      showSuccess("Attendance saved successfully!");
      onClose(true);

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to save the sheet.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!sheet || !sheetData) return null;
  
  const isReadOnly = sheet.attendance_marked;

  if (sheetData.length === 0) {
    return (
       <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{sheet.sheet_name}</DialogTitle></DialogHeader>
          <p className="py-8 text-center text-muted-foreground">This sheet appears to be empty.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const displayHeaders = [registerNumberKey, attendanceKey].filter(Boolean) as string[];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] flex flex-col">
        <DialogHeader><DialogTitle>{sheet.sheet_name}</DialogTitle></DialogHeader>
        <div className="flex-grow overflow-hidden min-h-0">
          <ScrollArea className="h-[60vh] w-full rounded-md border">
            <div className="w-max min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {displayHeaders.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {displayHeaders.map((header) => (
                        <TableCell key={`${rowIndex}-${header}`}>
                          {attendanceKey && header.toLowerCase() === attendanceKey.toLowerCase() ? (
                            <Select
                              value={String(row[header] || 'null')}
                              onValueChange={(value) => handleAttendanceChange(rowIndex, value)}
                              disabled={isReadOnly}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="null">--</SelectItem>
                                <SelectItem value="Present">Present</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            String(row[header])
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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

export default EditableSheetViewerDialog;