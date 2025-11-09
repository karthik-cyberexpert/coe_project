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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, dismissToast, showSuccess, showError } from "@/utils/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [sortOption, setSortOption] = useState('default');
  const [isAttendanceMarked, setIsAttendanceMarked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      let data = [...sheetData];
      const rollNumberKey = data.length > 0 ? Object.keys(data[0]).find(k => k.toLowerCase().replace(/\s/g, '') === 'rollnumber') : undefined;
      const duplicateNumberKey = data.length > 0 ? Object.keys(data[0]).find(k => k.toLowerCase().replace(/\s/g, '') === 'duplicatenumber') : undefined;

      switch (sortOption) {
        case 'roll_asc':
          if (rollNumberKey) data.sort((a, b) => String(a[rollNumberKey]).localeCompare(String(b[rollNumberKey]), undefined, { numeric: true }));
          break;
        case 'roll_desc':
          if (rollNumberKey) data.sort((a, b) => String(b[rollNumberKey]).localeCompare(String(a[rollNumberKey]), undefined, { numeric: true }));
          break;
        case 'dup_asc':
          if (duplicateNumberKey) data.sort((a, b) => (Number(a[duplicateNumberKey]) || 0) - (Number(b[duplicateNumberKey]) || 0));
          break;
        case 'dup_desc':
          if (duplicateNumberKey) data.sort((a, b) => (Number(b[duplicateNumberKey]) || 0) - (Number(a[duplicateNumberKey]) || 0));
          break;
        default:
          break;
      }
      setDisplayData(data);

      if (sheetData.length > 0) {
        const attendanceKey = Object.keys(sheetData[0]).find(k => k.toLowerCase() === 'attendance');
        if (attendanceKey && sheetData.some(row => row[attendanceKey] && (String(row[attendanceKey]).toLowerCase() === 'present' || String(row[attendanceKey]).toLowerCase() === 'absent'))) {
            setIsAttendanceMarked(true);
        } else {
            setIsAttendanceMarked(false);
        }
      }
    }
  }, [isOpen, sheetData, sortOption]);

  useEffect(() => {
    if (isOpen) {
      setStartNumber('');
    } else {
      setSortOption('default');
    }
  }, [isOpen]);

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
      const dataToShuffle = [...sheetData];
      const groups = [];
      for (let i = 0; i < dataToShuffle.length; i += 5) {
        groups.push(dataToShuffle.slice(i, i + 5));
      }
      const shuffleArray = (array: any[]) => {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };
      const shuffledGroups = shuffleArray(groups);
      const shuffledData = shuffledGroups.map(group => shuffleArray([...group])).flat();
      const duplicateNumberKey = (sheetData.length > 0 && Object.keys(sheetData[0]).find(k => k.toLowerCase() === 'duplicate number')) || 'duplicate number';
      const updatedData = shuffledData.map((row, index) => ({
        ...row,
        [duplicateNumberKey]: startingNum + index,
      }));

      const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
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

      // "Touch" the database row to trigger the updated_at timestamp and realtime event
      const { error: dbError } = await supabase
        .from('sheets')
        .update({ sheet_name: sheet.sheet_name }) // an arbitrary update
        .eq('id', sheet.id);

      if (dbError) throw dbError;

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
    setStartNumber('');
    setSortOption('default');
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

  const headers = (() => {
    if (displayData.length === 0) return [];
    
    let allHeaders = Object.keys(displayData[0]);
    
    const attendanceKey = allHeaders.find(k => k.toLowerCase() === 'attendance');
    const duplicateNumberKey = allHeaders.find(k => k.toLowerCase().replace(/\s/g, '') === 'duplicatenumber');
    
    const isAttendanceMarked = attendanceKey 
      ? displayData.some(row => row[attendanceKey] && String(row[attendanceKey]).trim() !== '') 
      : false;
      
    const areDuplicatesGenerated = duplicateNumberKey 
      ? displayData.some(row => row[duplicateNumberKey] && String(row[duplicateNumberKey]).trim() !== '') 
      : false;

    if (!isAttendanceMarked || !areDuplicatesGenerated) {
      allHeaders = allHeaders.filter(h => h.toLowerCase() !== 'external mark');
    }
    
    return allHeaders;
  })();

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
        <DialogFooter className="pt-4 border-t flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Order</SelectItem>
                <SelectItem value="roll_asc">Roll Number (Ascending)</SelectItem>
                <SelectItem value="roll_desc">Roll Number (Descending)</SelectItem>
                <SelectItem value="dup_asc">Duplicate Number (Ascending)</SelectItem>
                <SelectItem value="dup_desc">Duplicate Number (Descending)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {showDuplicateGenerator ? (
            <div className="flex items-center gap-2 justify-end">
              <Input
                type="number"
                placeholder="Starting Number"
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                className="w-40"
                disabled={isSaving}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-block">
                      <Button onClick={handleGenerateAndSave} disabled={isSaving || !isAttendanceMarked}>
                        {isSaving ? 'Saving...' : 'Generate & Save'}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!isAttendanceMarked && (
                    <TooltipContent>
                      <p>Attendance must be marked before generating numbers.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                Reset
              </Button>
            </div>
          ) : (
              <div className="text-sm text-muted-foreground">
              Displaying {displayData.length} of {sheetData.length} rows.
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SheetViewerDialog;