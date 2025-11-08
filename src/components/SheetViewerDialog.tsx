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
import { showError } from "@/utils/toast";

interface SheetViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheetData: Record<string, any>[];
  sheetName: string;
  showDuplicateGenerator?: boolean;
}

const SheetViewerDialog = ({ isOpen, onClose, sheetData, sheetName, showDuplicateGenerator = false }: SheetViewerDialogProps) => {
  const [displayData, setDisplayData] = useState<Record<string, any>[]>([]);
  const [startNumber, setStartNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDisplayData(sheetData);
      setStartNumber('');
    }
  }, [isOpen, sheetData]);

  const handleGenerate = () => {
    const startingNum = parseInt(startNumber, 10);
    if (isNaN(startingNum)) {
      showError("Please enter a valid starting number.");
      return;
    }

    const updatedData = sheetData.map((row, index) => {
      const duplicateNumberKey = Object.keys(row).find(k => k.toLowerCase() === 'duplicate number') || 'duplicate number';
      const newRow = { ...row };
      newRow[duplicateNumberKey] = startingNum + index;
      return newRow;
    });
    
    setDisplayData(updatedData);
  };

  const handleReset = () => {
    setDisplayData(sheetData);
    setStartNumber('');
  };

  if (!sheetData || sheetData.length === 0) {
    return (
       <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sheetName}</DialogTitle>
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
          <DialogTitle>{sheetName}</DialogTitle>
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
              />
              <Button onClick={handleGenerate}>Generate</Button>
              <Button variant="outline" onClick={handleReset}>Reset</Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SheetViewerDialog;