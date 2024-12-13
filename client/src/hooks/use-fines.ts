import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BookWithAuthor } from "@/types";

export type Fine = {
  id: number;
  userId: number;
  checkoutId: number;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: string;
  paidAt: string | null;
  checkout: {
    book: BookWithAuthor;
    checkedOutAt: string;
    dueDate: string;
    returnedAt: string;
  };
};

export function useFines() {
  const queryClient = useQueryClient();

  const { data: fines = [], isLoading } = useQuery<Fine[]>({
    queryKey: ['/api/fines'],
    queryFn: async () => {
      const response = await fetch('/api/fines', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Error fetching fines: ${await response.text()}`);
      }
      return response.json();
    },
  });

  const payFine = async (fineId: number) => {
    const response = await fetch(`/api/fines/${fineId}/pay`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  };

  const payFineMutation = useMutation({
    mutationFn: payFine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fines'] });
    },
  });

  return {
    fines,
    isLoading,
    payFine: payFineMutation.mutateAsync,
  };
}
