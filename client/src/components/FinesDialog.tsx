import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFines } from "@/hooks/use-fines";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function FinesDialog() {
  const { fines, isLoading, payFine } = useFines();
  const { toast } = useToast();

  const handlePayFine = async (fineId: number) => {
    try {
      await payFine(fineId);
      toast({
        title: "Success",
        description: "Fine paid successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">My Fines</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>My Fines</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-4">
            {fines.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No fines
              </p>
            ) : (
              fines.map((fine) => (
                <div
                  key={fine.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{fine.checkout.book.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(fine.checkout.dueDate), 'PPp')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Returned: {format(new Date(fine.checkout.returnedAt), 'PPp')}
                    </p>
                    <p className="text-sm font-medium mt-1">
                      Amount: {formatAmount(fine.amount)}
                    </p>
                    <p className="text-sm font-medium capitalize">
                      Status: {fine.status}
                    </p>
                  </div>
                  {fine.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePayFine(fine.id)}
                    >
                      Pay Fine
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
