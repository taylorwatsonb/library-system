import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SearchParams, BookWithAuthor } from "@/types";

export function useBooks(searchParams: SearchParams) {
  const queryClient = useQueryClient();
  
  const { data: books = [], isLoading } = useQuery<BookWithAuthor[]>({
    queryKey: ['/api/books', searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchParams.query) params.set('query', searchParams.query);
      if (searchParams.genre) params.set('genre', searchParams.genre);
      if (searchParams.available) params.set('available', 'true');
      
      const response = await fetch(`/api/books?${params}`);
      if (!response.ok) {
        throw new Error(`Error fetching books: ${await response.text()}`);
      }
      return response.json();
    },
  });

  const checkoutBook = async (bookId: number) => {
    const response = await fetch(`/api/books/${bookId}/checkout`, {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    return response.json();
  };

  const returnBook = async (bookId: number) => {
    const response = await fetch(`/api/books/${bookId}/return`, {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    return response.json();
  };

  const checkoutMutation = useMutation({
    mutationFn: checkoutBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
    },
  });

  const returnMutation = useMutation({
    mutationFn: returnBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
    },
  });

  return {
    books,
    isLoading,
    checkoutBook: checkoutMutation.mutateAsync,
    returnBook: returnMutation.mutateAsync,
  };
}
