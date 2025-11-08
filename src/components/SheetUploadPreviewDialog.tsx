import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SheetUploadPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
  if (!previewData || previewData.length === 0) return null;

  const headers = Object.keys(previewData[0]).filter(key => key !== 'status');
  const matchedCount = previewData.filter(row => row.status === 'matched').length;
  const mismatchedCount = previewData.length - matchedCount;

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
        <div className="flex-grow overflow-hidden min-h-0">
          {/* Added overflow-x-auto wrapper for horizontal scrolling */}
          <ScrollArea className="h-full w-full rounded-md border">
            <div className="w-max min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    {headers.map((header) => (
                      <TableHead key={header} className="capitalize">{header.replace(/_/g, ' ')}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index} className={row.status === 'mismatched' ? 'bg-red-50/50' : ''}>
                      <TableCell>
                        {row.status === 'matched' ? (
                          <Badge variant="default">Matched</Badge>
                        ) : (
                          <Badge variant="destructive">Mismatched</Badge>
                        )}
                      </TableCell>
                      {headers.map((header) => (
                        <TableCell key={`${index}-${header}`}>{String(row[header])}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={onConfirm} disabled={isUploading || matchedCount === 0}>
            {isUploading ? "Uploading..." : `Upload ${matchedCount} Rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}