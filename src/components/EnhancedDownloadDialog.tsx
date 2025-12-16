import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { showError, showSuccess } from "@/utils/toast";

interface EnhancedDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheetData: Record<string, any>[];
  sheetName: string;
  maxInternalMark?: number;
}

export const EnhancedDownloadDialog = ({ 
  isOpen, 
  onClose, 
  sheetData, 
  sheetName,
  maxInternalMark = 50 
}: EnhancedDownloadDialogProps) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<Record<string, boolean>>({});
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (isOpen && sheetData.length > 0) {
      const firstRow = sheetData[0] || {};
      const allKeys = Object.keys(firstRow).filter(h => !h.startsWith('__'));
      const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');
      
      // Find column keys (case-insensitive)
      const registerNumberKey = allKeys.find(k => norm(k) === 'registernumber');
      const rollNumberKey = allKeys.find(k => norm(k) === 'rollnumber');
      const subjectCodeKey = allKeys.find(k => norm(k) === 'subjectcode');
      const attendanceKey = allKeys.find(k => norm(k) === 'attendance');
      const duplicateNumberKey = allKeys.find(k => norm(k) === 'duplicatenumber');
      const bundleNumberKey = allKeys.find(k => norm(k) === 'bundlenumber');
      const totalKey = allKeys.find(k => norm(k) === 'total');
      const internalMarkKey = allKeys.find(k => ['internalmark','internalmarks','internal'].includes(norm(k)));
      const twoMarksColumnKey = allKeys.find(k => norm(k) === '2marks');
      
      // Find mark columns (1 to 15)
      const questionMarkKeys: string[] = [];
      for (let i = 1; i <= 15; i++) {
        const key = allKeys.find(k => k === String(i));
        if (key) questionMarkKeys.push(key);
      }
      questionMarkKeys.sort((a, b) => Number(a) - Number(b));
      
      // Build ordered headers
      const orderedHeaders: string[] = [];
      const seen = new Set<string>();
      const excluded = new Set<string>();
      if (twoMarksColumnKey) excluded.add(twoMarksColumnKey);
      if (totalKey) excluded.add(totalKey);
      
      const add = (k?: string, label?: string) => {
        if (label && !k) {
          orderedHeaders.push(label);
          return;
        }
        if (k && !seen.has(k) && !excluded.has(k)) {
          orderedHeaders.push(k);
          seen.add(k);
        }
      };
      
      add(registerNumberKey);
      add(rollNumberKey);
      add(subjectCodeKey);
      add(internalMarkKey);
      add(attendanceKey);
      add(duplicateNumberKey);
      add(bundleNumberKey);
      
      // Add individual mark columns 1..15 in order
      questionMarkKeys.forEach(k => add(k));
      
      // Computed columns in required order
      add(undefined, 'External Total');
      add(undefined, 'Converted External Total');
      add(undefined, 'Total marks');
      add(undefined, 'Result');
      
      // Append remaining columns
      const remaining = allKeys.filter(k => !seen.has(k) && !excluded.has(k));
      remaining.forEach(k => add(k));
      
      setHeaders(orderedHeaders);
      const initialSelection = orderedHeaders.reduce((acc, header) => {
        acc[header] = true; // Select all by default
        return acc;
      }, {} as Record<string, boolean>);
      setSelectedHeaders(initialSelection);
    }
  }, [isOpen, sheetData]);

  const handleCheckboxChange = (header: string) => {
    setSelectedHeaders(prev => ({
      ...prev,
      [header]: !prev[header],
    }));
  };

  const getFilteredData = (data: Record<string, any>[]) => {
    if (filterType === "all") return data;

    const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');
    const firstRow = data[0] || {};
    const allKeys = Object.keys(firstRow);
    const attendanceKey = allKeys.find(k => norm(k) === 'attendance');
    const internalMarkKey = allKeys.find(k => ['internalmark','internalmarks','internal'].includes(norm(k)));

    // Determine numeric mark columns (1..15)
    const markCols: string[] = [];
    for (let i = 1; i <= 15; i++) {
      const k = allKeys.find(x => x === String(i));
      if (k) markCols.push(k);
    }

    return data.filter(row => {
      const att = attendanceKey ? String(row[attendanceKey] ?? '').trim().toLowerCase() : '';
      const externalTotal = markCols.reduce((sum, col) => {
        const v = Number(row[col] ?? 0);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);
      const externalMaxMark = 100 - maxInternalMark;
      const convertedExternalTotal = Math.round((externalTotal / 100) * externalMaxMark);
      const internalVal = internalMarkKey ? Number(row[internalMarkKey] ?? 0) : 0;
      const totalMarks = Math.round((isNaN(internalVal) ? 0 : internalVal) + convertedExternalTotal);

      switch (filterType) {
        case "pass":
          return att !== 'absent' && externalTotal >= 50 && totalMarks >= 50;
        case "fail":
          return att !== 'absent' && !(externalTotal >= 50 && totalMarks >= 50);
        case "absent":
          return att === 'absent';
        case "marks_gt_50":
          return totalMarks > 50;
        default:
          return true;
      }
    });
  };

  const handleDownload = () => {
    const selected = headers.filter(h => selectedHeaders[h]);
    if (selected.length === 0) {
      showError("Please select at least one column to download.");
      return;
    }

    const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');
    const firstRow = sheetData[0] || {};
    const allKeys = Object.keys(firstRow);
    const attendanceKey = allKeys.find(k => norm(k) === 'attendance');
    const totalKey = allKeys.find(k => norm(k) === 'total');
    const internalMarkKey = allKeys.find(k => ['internalmark','internalmarks','internal'].includes(norm(k)));

    // Get data with filter applied
    const dataSource = getFilteredData(sheetData);
    if (dataSource.length === 0) {
      showError("No data matches the selected filter.");
      return;
    }

    // Determine numeric mark columns (1..15) present, in order
    const markCols: string[] = [];
    for (let i = 1; i <= 15; i++) {
      const k = allKeys.find(x => x === String(i));
      if (k) markCols.push(k);
    }

    const externalMaxMark = 100 - maxInternalMark;

    // Build final headers from selection
    const finalHeaders: string[] = [...selected];

    const dataToExport = dataSource.map(row => {
      const newRow: Record<string, any> = {};
      const externalTotal = markCols.reduce((sum, col) => {
        const v = Number(row[col] ?? 0);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);

      const convertedExternalTotal = Math.round((externalTotal / 100) * externalMaxMark);
      const internalVal = internalMarkKey ? Number(row[internalMarkKey] ?? 0) : 0;
      const totalMarks = Math.round((isNaN(internalVal) ? 0 : internalVal) + convertedExternalTotal);

      finalHeaders.forEach(header => {
        if (header === 'External Total') {
          newRow[header] = externalTotal;
        } else if (header === 'Converted External Total') {
          newRow[header] = convertedExternalTotal;
        } else if (header === 'Total marks') {
          newRow[header] = totalMarks;
        } else if (header === 'Result') {
          const att = attendanceKey ? String(row[attendanceKey] ?? '').trim().toLowerCase() : '';
          if (att === 'absent') {
            newRow[header] = 'AAA';
          } else {
            newRow[header] = externalTotal >= 50 && totalMarks >= 50 ? 'Pass' : 'Fail';
          }
        } else {
          newRow[header] = row[header] ?? "";
        }
      });
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: finalHeaders });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    
    let filename = sheetName;
    if (filterType !== 'all') filename = filename.replace('.xlsx', `_${filterType}.xlsx`);
    
    XLSX.writeFile(workbook, filename);
    showSuccess(`Download completed! (Records: ${dataSource.length})`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Download Options</DialogTitle>
          <DialogDescription>
            Choose download type and configure options
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-grow">
          <div className="space-y-4">
            <div>
              <Label htmlFor="filter-type">Filter Records</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type">
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="pass">Pass Only (Total ≥ 50)</SelectItem>
                  <SelectItem value="fail">Fail Only (Total &lt; 50)</SelectItem>
                  <SelectItem value="absent">Absent Only</SelectItem>
                  <SelectItem value="marks_gt_50">Marks &gt; 50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted p-3 rounded-md text-sm">
              <p>
                <strong>Total records:</strong> {sheetData.length} | <strong>Filtered:</strong> {getFilteredData(sheetData).length}<br/>
                <strong>Max Internal Mark:</strong> {maxInternalMark} | <strong>External out of:</strong> {100 - maxInternalMark}
              </p>
            </div>
          </div>
          <DialogDescription>
            Select columns to include. "External Total" = sum of Q1..Q15 (out of 100). "Converted External Total" = External Total scaled to external maximum. "Total marks" = Internal + Converted External Total. Result = Pass if External Total ≥ 50 AND Total marks ≥ 50.
          </DialogDescription>
          <div className="grid gap-4 py-4 max-h-64 overflow-y-auto border rounded-md p-4">
            {headers.map(header => (
              <div key={header} className="flex items-center space-x-2">
                <Checkbox
                  id={`col-${header}`}
                  checked={!!selectedHeaders[header]}
                  onCheckedChange={() => handleCheckboxChange(header)}
                />
                <Label htmlFor={`col-${header}`} className="font-normal">
                  {header}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={handleDownload}>Download</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

