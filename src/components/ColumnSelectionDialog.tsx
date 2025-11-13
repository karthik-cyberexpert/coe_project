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
import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { showError } from "@/utils/toast";

interface ColumnSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheetData: Record<string, any>[];
  sheetName: string;
}

export const ColumnSelectionDialog = ({ isOpen, onClose, sheetData, sheetName }: ColumnSelectionDialogProps) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<Record<string, boolean>>({});

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
      // Replace individual 1..15 with a single "External Marks" option
      if (questionMarkKeys.length > 0) {
        add(undefined, 'External Marks');
        // Mark all numeric columns as seen so they don't appear again
        questionMarkKeys.forEach(k => seen.add(k));
      }
      add(totalKey);
      add(undefined, 'Result'); // computed result column
      
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

    // Determine numeric mark columns (1..15) present, in order
    const markCols: string[] = [];
    for (let i = 1; i <= 15; i++) {
      const k = allKeys.find(x => x === String(i));
      if (k) markCols.push(k);
    }

    // Expand selection: replace "External Marks" with actual numeric columns
    const finalHeaders: string[] = [];
    selected.forEach(h => {
      if (h === 'External Marks') {
        finalHeaders.push(...markCols);
      } else {
        finalHeaders.push(h);
      }
    });

    const dataToExport = sheetData.map(row => {
      const newRow: Record<string, any> = {};
      finalHeaders.forEach(header => {
        if (header === 'Result') {
          // Compute Result based on attendance and total
          const att = attendanceKey ? String(row[attendanceKey] ?? '').trim().toLowerCase() : '';
          if (att === 'absent') {
            newRow[header] = 'AAA';
          } else {
            const totalVal = totalKey ? Number(row[totalKey] ?? 0) : NaN;
            newRow[header] = !isNaN(totalVal) && totalVal >= 50 ? 'Pass' : 'Fail';
          }
        } else {
          newRow[header] = row[header] ?? ""; // Use empty string for null/undefined values
        }
      });
      return newRow;
    });

    // Enforce column order explicitly to avoid numeric-key reordering in objects
    const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: finalHeaders });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, sheetName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Columns to Download</DialogTitle>
          <DialogDescription>
            Choose the columns you want to include in the XLSX file.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-80 overflow-y-auto">
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
      </DialogContent>
    </Dialog>
  );
};