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

interface Header {
  key: string;
  label: string;
}

interface BulkUploadConfirmationDialogProps<T> {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: T[];
  headers: Header[];
  isUploading: boolean;
}

export function BulkUploadConfirmationDialog<T extends Record<string, any>>({
  isOpen,
  onClose,
  onConfirm,
  data,
  headers,
  isUploading,
}: BulkUploadConfirmationDialogProps<T>) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Confirm Bulk Upload</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Please review the {data.length} rows below before uploading.
        </p>
        <ScrollArea className="h-72 w-full rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header.key}>{header.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  {headers.map((header) => (
                    <TableCell key={`${index}-${header.key}`}>{row[header.key]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={onConfirm} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}