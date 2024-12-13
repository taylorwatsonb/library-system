import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { BookTable } from "@/components/BookTable";
import { SearchBar } from "@/components/SearchBar";
import { ReservationsDialog } from "@/components/ReservationsDialog";
import { FinesDialog } from "@/components/FinesDialog";
import { useState } from "react";
import { BookDialog } from "@/components/BookDialog";
import type { SearchParams } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { user, logout } = useUser();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useState<SearchParams>({ query: "" });
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "Come back soon!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Library Management System</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user?.username}</span>
            <div className="flex gap-2">
              <ReservationsDialog />
              <FinesDialog />
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <SearchBar onSearch={setSearchParams} />
          {(user?.role === 'admin' || user?.role === 'librarian') && (
            <Button onClick={() => setIsBookDialogOpen(true)}>
              Add New Book
            </Button>
          )}
        </div>

        <BookTable searchParams={searchParams} />

        <BookDialog 
          open={isBookDialogOpen} 
          onOpenChange={setIsBookDialogOpen}
        />
      </main>
    </div>
  );
}
