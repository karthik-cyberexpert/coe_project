import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface SheetViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheetData: Record<string, any>[];
  sheetName: string;
}

const SheetViewerDialog = ({ isOpen, onClose, sheetData, sheetName }: SheetViewerDialogProps) => {
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

  const headers = Object.keys(sheetData[0]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{sheetName}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden min-h-0">
          <ScrollArea className="h-full w-full rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheetData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {headers.map((header) => (
                      <TableCell key={`${rowIndex}-${header}`}>{String(row[header])}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SheetViewerDialog;