import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReservations } from "@/hooks/use-reservations";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function ReservationsDialog() {
  const { reservations, isLoading, cancelReservation } = useReservations();
  const { toast } = useToast();

  const handleCancel = async (reservationId: number) => {
    try {
      await cancelReservation(reservationId);
      toast({
        title: "Success",
        description: "Reservation cancelled successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">My Reservations</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>My Reservations</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-4">
            {reservations.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No active reservations
              </p>
            ) : (
              reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{reservation.book.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Reserved: {format(new Date(reservation.reservedAt), 'PPp')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires: {format(new Date(reservation.expiresAt), 'PPp')}
                    </p>
                    <p className="text-sm font-medium mt-1 capitalize">
                      Status: {reservation.status}
                    </p>
                  </div>
                  {reservation.status === 'pending' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancel(reservation.id)}
                    >
                      Cancel
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
