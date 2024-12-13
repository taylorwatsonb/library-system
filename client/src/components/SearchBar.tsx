import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState } from "react";
import type { SearchParams } from "@/types";

interface SearchBarProps {
  onSearch: (params: SearchParams) => void;
}

const genres = [
  "All",
  "Fiction",
  "Non-Fiction",
  "Science Fiction",
  "Mystery",
  "Romance",
  "Biography",
];

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("All");
  const [showAvailable, setShowAvailable] = useState(false);

  const handleSearch = () => {
    onSearch({
      query,
      genre: genre === "All" ? undefined : genre,
      available: showAvailable,
    });
  };

  return (
    <div className="flex gap-4 items-center">
      <Input
        placeholder="Search books..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-[300px]"
      />
      
      <Select value={genre} onValueChange={setGenre}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select genre" />
        </SelectTrigger>
        <SelectContent>
          {genres.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={() => {
          setShowAvailable(!showAvailable);
          handleSearch();
        }}
      >
        {showAvailable ? "Show All" : "Available Only"}
      </Button>

      <Button onClick={handleSearch}>Search</Button>
    </div>
  );
}
