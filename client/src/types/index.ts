export type BookWithAuthor = {
  id: number;
  title: string;
  isbn: string | null;
  genre: string | null;
  quantity: number;
  available: number;
  author: {
    id: number;
    name: string;
  } | null;
};

export type SearchParams = {
  query: string;
  genre?: string;
  available?: boolean;
};
