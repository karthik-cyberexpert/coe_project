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
import { Input } from "@/components/ui/input";
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
}

interface SheetViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: Sheet | null;
  sheetData: Record<string, any>[];
  showDuplicateGenerator?: boolean;
}

const SheetViewerDialog = ({ isOpen, onClose, sheet, sheetData, showDuplicateGenerator = false }: SheetViewerDialogProps) => {
  const [displayData, setDisplayData] = useState<Record<string, any>[]>([]);
  const [startNumber, setStartNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayData(sheetData);
      setStartNumber('');
    }
  }, [isOpen, sheetData]);

  const handleGenerateAndSave = async () => {
    if (!sheet) {
      showError("Sheet information is missing. Cannot save.");
      return;
    }
    const startingNum = parseInt(startNumber, 10);
    if (isNaN(startingNum)) {
      showError("Please enter a valid starting number.");
      return;
    }

    setIsSaving(true);
    const toastId = showLoading("Generating and saving numbers...");

    try {
      const updatedData = sheetData.map((row, index) => {
        const duplicateNumberKey = Object.keys(row).find(k => k.toLowerCase() === 'duplicate number') || 'duplicate number';
        const newRow = { ...row };
        newRow[duplicateNumberKey] = startingNum + index;
        return newRow;
      });

      const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
      
      const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      const { error } = await supabase.storage
        .from('sheets')
        .update(sheet.file_path, blob, {
          cacheControl: '0',
          upsert: true,
        });

      if (error) throw error;

      setDisplayData(updatedData);
      dismissToast(toastId);
      showSuccess("Duplicate numbers generated and saved successfully!");

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to save the sheet.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDisplayData(sheetData);
    setStartNumber('');
  };

  if (!sheet || !sheetData) {
    return null;
  }
  
  if (sheetData.length === 0) {
    return (
       <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sheet.sheet_name}</DialogTitle>
          </DialogHeader>
          <p className="py-8 text-center text-muted-foreground">This sheet appears to be empty.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const headers = displayData.length > 0 ? Object.keys(displayData[0]) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{sheet.sheet_name}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden min-h-0">
          <ScrollArea className="h-[50vh] w-full rounded-md border">
            <div className="w-max min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {headers.map((header) => (
                        <TableCell key={`${rowIndex}-${header}`}>{String(row[header])}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
        {showDuplicateGenerator && (
          <DialogFooter className="pt-4 border-t flex-col sm:flex-row sm:justify-between">
             <div className="text-sm text-muted-foreground mb-2 sm:mb-0">
              Displaying {displayData.length} of {sheetData.length} original rows.
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Input
                type="number"
                placeholder="Starting Number"
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                className="w-40"
                disabled={isSaving}
              />
              <Button onClick={handleGenerateAndSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Generate & Save'}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                Reset
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SheetViewerDialog;