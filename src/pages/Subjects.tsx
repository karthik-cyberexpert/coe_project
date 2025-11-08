import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AddSubjectForm from "@/components/AddSubjectForm";
import { showError } from "@/utils/toast";

interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  departments: { department_name: string } | null;
}

const Subjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchSubjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subjects")
      .select("*, departments(department_name)")
      .order('created_at', { ascending: false });

    if (error) {
      showError("Failed to fetch subjects.");
      console.error(error);
    } else {
      setSubjects(data as Subject[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Subjects</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Subject</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
            </DialogHeader>
            <AddSubjectForm
              onSuccess={() => {
                setIsDialogOpen(false);
                fetchSubjects();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p>Loading subjects...</p>
      ) : (
        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject Code</TableHead>
                <TableHead>Subject Name</TableHead>
                <TableHead>Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.length > 0 ? (
                subjects.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.subject_code}</TableCell>
                    <TableCell>{sub.subject_name}</TableCell>
                    <TableCell>{sub.departments?.department_name || "Common"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No subjects found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Subjects;