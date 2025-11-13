import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SheetUploadPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (maxInternalMark: number) => void;
  previewData: any[];
  isUploading: boolean;
}

export function SheetUploadPreviewDialog({
  isOpen,
  onClose,
  onConfirm,
  previewData,
  isUploading,
}: SheetUploadPreviewDialogProps) {
  const [maxInternalMark, setMaxInternalMark] = useState<string>('50');
  
  if (!previewData || previewData.length === 0) return null;

  // Use fixed column order instead of Object.keys
  const headers = [
    'register number',
    'roll number',
    'subject code',
    'internal mark',
    'attendance',
    'duplicate number',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '14', '15',
    'total',
    'Result'
  ];
  
  const matchedCount = previewData.filter(row => row._matchStatus === 'matched').length;
  const mismatchedCount = previewData.length - matchedCount;

  const handleConfirm = () => {
    const maxMark = parseInt(maxInternalMark);
    if (isNaN(maxMark) || maxMark <= 0) {
      alert('Please enter a valid maximum internal mark');
      return;
    }
    onConfirm(maxMark);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Preview</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            Found <strong>{matchedCount} matched</strong> rows and <strong>{mismatchedCount} mismatched</strong> rows.
          </p>
          <p>Only the matched rows will be uploaded.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxInternalMark" className="text-sm font-medium">
            Maximum Internal Mark <span className="text-red-500">*</span>
          </Label>
          <Input
            id="maxInternalMark"
            type="number"
            min="1"
            value={maxInternalMark}
            onChange={(e) => setMaxInternalMark(e.target.value)}
            placeholder="Enter maximum internal mark (e.g., 50)"
            required
          />
        </div>
        <div className="flex-grow overflow-hidden min-h-0">
          <ScrollArea className="h-[50vh] w-full rounded-md border">
            <div className="w-max min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-10 border-r">Status</TableHead>
                    {headers.map((header) => (
                      <TableHead key={header} className="capitalize whitespace-nowrap">{header.replace(/_/g, ' ')}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index} className={row._matchStatus === 'mismatched' ? 'bg-red-50/50' : ''}>
                      <TableCell className="sticky left-0 bg-white z-10 border-r">
                        {row._matchStatus === 'matched' ? (
                          <Badge variant="default">Matched</Badge>
                        ) : (
                          <Badge variant="destructive">Mismatched</Badge>
                        )}
                      </TableCell>
                      {headers.map((header) => (
                        <TableCell key={`${index}-${header}`} className="whitespace-nowrap">{String(row[header] || '')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={isUploading || matchedCount === 0 || !maxInternalMark}>
            {isUploading ? "Uploading..." : `Upload ${matchedCount} Rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}