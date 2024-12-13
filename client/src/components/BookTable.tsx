import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useBooks } from "@/hooks/use-books";
import type { SearchParams } from "@/types";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

interface BookTableProps {
  searchParams: SearchParams;
}

export function BookTable({ searchParams }: BookTableProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { books, isLoading, checkoutBook, returnBook } = useBooks(searchParams);

  const handleCheckout = async (bookId: number) => {
    try {
      await checkoutBook(bookId);
      toast({
        title: "Success",
        description: "Book checked out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReturn = async (bookId: number) => {
    try {
      await returnBook(bookId);
      toast({
        title: "Success",
        description: "Book returned successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Genre</TableHead>
          <TableHead>ISBN</TableHead>
          <TableHead>Available</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {books.map((book) => (
          <TableRow key={book.id}>
            <TableCell>{book.title}</TableCell>
            <TableCell>{book.author?.name || "Unknown"}</TableCell>
            <TableCell>{book.genre || "N/A"}</TableCell>
            <TableCell>{book.isbn || "N/A"}</TableCell>
            <TableCell>
              {book.available}/{book.quantity}
            </TableCell>
            <TableCell>
              {book.available > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCheckout(book.id)}
                >
                  Check Out
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReturn(book.id)}
                >
                  Return
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
