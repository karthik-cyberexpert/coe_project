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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  duplicates_generated?: boolean;
  // Set to true when staff have finished entering external marks for this sheet
  external_marks_added?: boolean;
  subjects?: {
    subject_code: string;
  } | null;
}

interface SheetViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: Sheet | null;
  sheetData: Record<string, any>[];
  showDuplicateGenerator?: boolean;
  showBundleNumber?: boolean;
  forceGenerate?: boolean;
}

const SheetViewerDialog = ({ 
  isOpen, 
  onClose, 
  sheet, 
  sheetData, 
  showDuplicateGenerator = false,
  showBundleNumber = false,
  forceGenerate = false,
}: SheetViewerDialogProps) => {
  const [displayData, setDisplayData] = useState<Record<string, any>[]>([]);
  const [startNumber, setStartNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [sortOption, setSortOption] = useState('default');
  const [isAttendanceMarked, setIsAttendanceMarked] = useState(false);
  const [currentSheet, setCurrentSheet] = useState<Sheet | null>(null);

  const showBundles = showBundleNumber && currentSheet?.duplicates_generated && currentSheet?.subjects?.subject_code;

  useEffect(() => {
    if (isOpen && sheet) {
      setCurrentSheet(JSON.parse(JSON.stringify(sheet)));
    }
  }, [isOpen, sheet]);

  useEffect(() => {
    if (isOpen) {
      const attendanceKey = sheetData.length > 0 ? Object.keys(sheetData[0]).find(k => k.toLowerCase() === 'attendance') : undefined;

      const presentStudents = attendanceKey 
        ? sheetData.filter(row => String(row[attendanceKey]).trim().toLowerCase() === 'present')
        : [...sheetData];
      
      const absentOrNilStudents = attendanceKey
        ? sheetData.filter(row => String(row[attendanceKey]).trim().toLowerCase() !== 'present')
        : [];

      let processedPresentData = [...presentStudents];

      // Determine keys for sorting once
      const rollNumberKey = processedPresentData.length > 0 ? Object.keys(processedPresentData[0]).find(k => k.toLowerCase().replace(/\s/g, '') === 'rollnumber') : undefined;
      const duplicateNumberKey = processedPresentData.length > 0 ? Object.keys(processedPresentData[0]).find(k => k.toLowerCase().replace(/\s/g, '') === 'duplicatenumber') : undefined;

      // Always apply sorting based on selection
      switch (sortOption) {
        case 'roll_asc':
          if (rollNumberKey) processedPresentData.sort((a, b) => String(a[rollNumberKey]).localeCompare(String(b[rollNumberKey]), undefined, { numeric: true }));
          break;
        case 'roll_desc':
          if (rollNumberKey) processedPresentData.sort((a, b) => String(b[rollNumberKey]).localeCompare(String(a[rollNumberKey]), undefined, { numeric: true }));
          break;
        case 'dup_asc':
          if (duplicateNumberKey) processedPresentData.sort((a, b) => (Number(a[duplicateNumberKey]) || 0) - (Number(b[duplicateNumberKey]) || 0));
          break;
        case 'dup_desc':
          if (duplicateNumberKey) processedPresentData.sort((a, b) => (Number(b[duplicateNumberKey]) || 0) - (Number(a[duplicateNumberKey]) || 0));
          break;
        default:
          break;
      }

      // If bundles are shown, compute bundle labels and row grouping after sorting
      if (showBundles && duplicateNumberKey && currentSheet?.subjects?.subject_code) {
        const subjectCodeFull = currentSheet.subjects.subject_code;
        processedPresentData = processedPresentData.map((row, index) => ({
          ...row,
          __bundleName: `${subjectCodeFull}-${String(Math.floor(index / 20) + 1).padStart(2, '0')}`,
          __isFirstInBundle: index % 20 === 0,
        }));
      }

      setDisplayData([...processedPresentData, ...absentOrNilStudents]);

      if (sheetData.length > 0) {
        if (attendanceKey && sheetData.some(row => row[attendanceKey] && (String(row[attendanceKey]).toLowerCase() === 'present' || String(row[attendanceKey]).toLowerCase() === 'absent'))) {
            setIsAttendanceMarked(true);
        } else {
            setIsAttendanceMarked(false);
        }
      }
    }
  }, [isOpen, sheetData, currentSheet, sortOption, showBundleNumber, showBundles]);

  useEffect(() => {
    if (isOpen) {
      setStartNumber('');
    } else {
      setSortOption('default');
    }
  }, [isOpen]);

  const handleGenerateAndSave = async () => {
    if (!currentSheet) {
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
      const attendanceKey = sheetData.length > 0 ? Object.keys(sheetData[0]).find(k => k.toLowerCase() === 'attendance') : undefined;
      const duplicateNumberKey = (sheetData.length > 0 && Object.keys(sheetData[0]).find(k => k.toLowerCase().replace(/\s/g, '') === 'duplicatenumber')) || 'duplicate number';

      const presentStudents = attendanceKey 
        ? sheetData.filter(row => String(row[attendanceKey]).trim().toLowerCase() === 'present')
        : [...sheetData];
      
      const absentOrNilStudents = attendanceKey
        ? sheetData.filter(row => String(row[attendanceKey]).trim().toLowerCase() !== 'present')
        : [];

      const dataToShuffle = [...presentStudents];

      // Determine group size based on number of present rows.
      // If more than 70 rows, use groups of 10; otherwise use groups of 5.
      const groupSize = dataToShuffle.length > 70 ? 10 : 5;
      const groups: any[][] = [];
      for (let i = 0; i < dataToShuffle.length; i += groupSize) {
        groups.push(dataToShuffle.slice(i, i + groupSize));
      }

      const shuffleArray = (array: any[]) => {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };

      // First shuffle the groups themselves, then shuffle the rows within each group.
      const shuffledGroups = shuffleArray(groups);
      const shuffledData = shuffledGroups.map(group => shuffleArray([...group])).flat();
      
      const updatedPresentStudents = shuffledData.map((row, index) => ({
        ...row,
        [duplicateNumberKey]: startingNum + index,
      }));

      const updatedData = [...updatedPresentStudents, ...absentOrNilStudents];

      const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
      const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      const { error: storageError } = await supabase.storage
        .from('sheets')
        .update(currentSheet.file_path, blob, {
          cacheControl: '0',
          upsert: true,
        });

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('sheets')
        .update({ duplicates_generated: true })
        .eq('id', currentSheet.id);

      if (dbError) throw dbError;

      setDisplayData(updatedData);
      setCurrentSheet(prev => prev ? { ...prev, duplicates_generated: true } : null);

      dismissToast(toastId);
      showSuccess("Duplicate numbers generated and saved successfully!");

    } catch (error: any)
{
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

  if (!currentSheet || !sheetData) {
    return null;
  }
  
  if (sheetData.length === 0) {
    return (
       <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentSheet.sheet_name}</DialogTitle>
          </DialogHeader>
          <p className="py-8 text-center text-muted-foreground">This sheet appears to be empty.</p>
        </DialogContent>
      </Dialog>
    );
  }

  let headerKeyMap: Record<string, string> = {};
  let attendanceKeyForRender: string | undefined;
  let totalKeyForRender: string | undefined;
  const orderedHeaders = (() => {
    if (displayData.length === 0) return [] as string[];
    
    const firstRow = displayData[0] || {};
    // Filter out internal helper keys and any spurious "0" column that can appear in some sheets
    const allKeys = Object.keys(firstRow).filter(h => !h.startsWith('__') && h !== '0');
    const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');
    
    // Find column keys (case-insensitive)
    const registerNumberKey = allKeys.find(k => norm(k) === 'registernumber');
    const rollNumberKey = allKeys.find(k => norm(k) === 'rollnumber');
    const subjectCodeKey = allKeys.find(k => norm(k) === 'subjectcode');
    const attendanceKey = allKeys.find(k => norm(k) === 'attendance');
    const duplicateNumberKey = allKeys.find(k => norm(k) === 'duplicatenumber');
    const totalKey = allKeys.find(k => norm(k) === 'total');
    // Internal mark column (named like "Internal Mark")
    const internalMarkKey = allKeys.find(k => ['internalmark','internalmarks','internal'].includes(norm(k)));
    // Column "2" (two-mark) previously used; we now compute Result instead of reading this
    const twoMarksColumnKey = allKeys.find(k => norm(k) === '2marks');
    
    // Find mark columns (1 to 15) including '2'
    const questionMarkKeys: string[] = [];
    for (let i = 1; i <= 15; i++) {
      const key = allKeys.find(k => k === String(i));
      if (key) questionMarkKeys.push(key);
    }
    questionMarkKeys.sort((a, b) => Number(a) - Number(b));
    
    // Build ordered headers in same order as download dialog
    const headers: string[] = [];
    const seen = new Set<string>();
    const excluded = new Set<string>();
    if (twoMarksColumnKey) excluded.add(twoMarksColumnKey);
    if (totalKey) excluded.add(totalKey); // Will compute Total marks instead
    
    const maxInternalMarkKey = allKeys.find(k => norm(k) === 'maxinternalmark');
    
    const localMap: Record<string, string> = {};
    const add = (k?: string, label?: string) => {
      if (label && !k) {
        headers.push(label);
        localMap[label] = '__computed__';
        return;
      }
      if (k && !seen.has(k) && !excluded.has(k)) {
        const name = label || k;
        headers.push(name);
        seen.add(k);
        localMap[name] = k;
      }
    };
    
    // Fixed order matching EnhancedDownloadDialog
    add(registerNumberKey);
    add(rollNumberKey);
    add(subjectCodeKey);
    add(internalMarkKey);
    add(attendanceKey);
    add(duplicateNumberKey);
    
    // Individual marks 1-15
    questionMarkKeys.forEach(k => add(k));
    
    // Computed columns
    add(undefined, 'External Total');
    add(undefined, 'Converted External Total');
    add(undefined, 'Total marks');
    add(undefined, 'Result');
    
    // Append any remaining columns except excluded ones
    const remaining = allKeys.filter(k => !seen.has(k) && !excluded.has(k));
    remaining.forEach(k => add(k));
    
    headerKeyMap = localMap;
    attendanceKeyForRender = attendanceKey;
    totalKeyForRender = totalKey;
    return headers;
  })();

  const canGenerate = !currentSheet.duplicates_generated; // Cannot regenerate once generated

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{currentSheet.sheet_name}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden min-h-0">
          <ScrollArea className="h-[50vh] w-full rounded-md border">
            <div className="w-max min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showBundles && <TableHead className="sticky left-0 bg-white z-10 border-r">Bundle Number</TableHead>}
                    {orderedHeaders.map((header, idx) => (
                      <TableHead key={`${header}-${idx}`}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {showBundles && row.__isFirstInBundle && (
                        <TableCell 
                          rowSpan={Math.min(20, displayData.length - rowIndex)}
                          className="align-middle text-center font-semibold border-r sticky left-0 bg-white z-10"
                        >
                          {row.__bundleName}
                        </TableCell>
                      )}
                      {orderedHeaders.map((header, colIdx) => {
                        const mapKey = (headerKeyMap && headerKeyMap[header]) ? headerKeyMap[header] : header;
                        
                        // Handle computed columns
                        if (mapKey === '__computed__') {
                          const firstRow = displayData[0] || {};
                          const allKeys = Object.keys(firstRow).filter(h => !h.startsWith('__'));
                          const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');
                          const internalMarkKey = allKeys.find(k => ['internalmark','internalmarks','internal'].includes(norm(k)));
                          const maxInternalMarkKey = allKeys.find(k => norm(k) === 'maxinternalmark');
                          const questionMarkKeys: string[] = [];
                          for (let i = 1; i <= 15; i++) {
                            const key = allKeys.find(k => k === String(i));
                            if (key) questionMarkKeys.push(key);
                          }
                          
                          // Calculate External Total
                          const externalTotal = questionMarkKeys.reduce((sum, key) => {
                            const v = row[key];
                            const n = typeof v === 'number' ? v : parseInt(String(v ?? '').trim() || '0', 10);
                            return sum + (isNaN(n) ? 0 : n);
                          }, 0);
                          
                          // Get max internal mark (default 50)
                          const maxInternalMark = maxInternalMarkKey 
                            ? (typeof row[maxInternalMarkKey] === 'number' 
                                ? row[maxInternalMarkKey] 
                                : parseInt(String(row[maxInternalMarkKey] ?? '').trim() || '50', 10))
                            : 50;
                          const externalMaxMark = 100 - maxInternalMark;
                          const convertedExternalTotal = Math.round((externalTotal / 100) * externalMaxMark);
                          
                          // Get internal mark value
                          const internalVal = internalMarkKey 
                            ? (typeof row[internalMarkKey] === 'number' 
                                ? row[internalMarkKey] 
                                : parseInt(String(row[internalMarkKey] ?? '').trim() || '0', 10))
                            : 0;
                          const totalMarks = Math.round((isNaN(internalVal) ? 0 : internalVal) + convertedExternalTotal);
                          
                          // Calculate result
                          const att = attendanceKeyForRender ? String(row[attendanceKeyForRender] ?? '').trim().toLowerCase() : '';
                          const result = att === 'absent' ? 'AAA' : (externalTotal >= 50 && totalMarks >= 50 ? 'Pass' : 'Fail');
                          const isFinishedByStaff = !!currentSheet?.external_marks_added;
                          
                          if (header === 'External Total') {
                            return <TableCell key={`${rowIndex}-${colIdx}`}>{externalTotal}</TableCell>;
                          } else if (header === 'Converted External Total') {
                            return <TableCell key={`${rowIndex}-${colIdx}`}>{convertedExternalTotal}</TableCell>;
                          } else if (header === 'Total marks') {
                            return <TableCell key={`${rowIndex}-${colIdx}`}>{totalMarks}</TableCell>;
                          } else if (header === 'Result') {
                            // Only show Pass/Fail/AAA once staff have finished the sheet (external marks added)
                            return <TableCell key={`${rowIndex}-${colIdx}`}>{isFinishedByStaff ? result : ''}</TableCell>;
                          }
                        }
                        
                        return (
                          <TableCell key={`${rowIndex}-${colIdx}`}>{String(row[mapKey] ?? '')}</TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
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
                disabled={isSaving || !canGenerate}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-block">
                      <Button onClick={handleGenerateAndSave} disabled={isSaving || !isAttendanceMarked || !canGenerate}>
                        {isSaving ? 'Saving...' : canGenerate ? 'Generate & Save' : 'Generated'}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!isAttendanceMarked && (
                    <TooltipContent>
                      <p>Attendance must be marked before generating numbers.</p>
                    </TooltipContent>
                  )}
                  {!canGenerate && (
                     <TooltipContent>
                      <p>Duplicate numbers have already been generated.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Button variant="outline" onClick={handleReset} disabled={isSaving || !canGenerate}>
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