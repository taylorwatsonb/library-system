import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BookWithAuthor } from "@/types";

export type Reservation = {
  id: number;
  userId: number;
  bookId: number;
  reservedAt: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  expiresAt: string;
  book: BookWithAuthor;
};

export function useReservations() {
  const queryClient = useQueryClient();

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['/api/reservations'],
    queryFn: async () => {
      const response = await fetch('/api/reservations', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Error fetching reservations: ${await response.text()}`);
      }
      return response.json();
    },
  });

  const reserveBook = async (bookId: number) => {
    const response = await fetch(`/api/books/${bookId}/reserve`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  };

  const cancelReservation = async (reservationId: number) => {
    const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  };

  const reserveMutation = useMutation({
    mutationFn: reserveBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
    },
  });

  return {
    reservations,
    isLoading,
    reserveBook: reserveMutation.mutateAsync,
    cancelReservation: cancelMutation.mutateAsync,
  };
}
