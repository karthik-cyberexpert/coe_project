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
      const allHeaders = Object.keys(sheetData[0]);
      setHeaders(allHeaders);
      const initialSelection = allHeaders.reduce((acc, header) => {
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
    const finalHeaders = headers.filter(h => selectedHeaders[h]);
    if (finalHeaders.length === 0) {
      showError("Please select at least one column to download.");
      return;
    }

    const dataToExport = sheetData.map(row => {
      const newRow: Record<string, any> = {};
      finalHeaders.forEach(header => {
        newRow[header] = row[header] ?? ""; // Use empty string for null/undefined values
      });
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
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