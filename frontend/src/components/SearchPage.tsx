"use client";

import { useState } from "react";
import { Search, Download, BookOpen } from "lucide-react";

interface SearchResult {
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  asin?: string;
  url?: string;
  source: string;
  size?: string;
  seeders?: number;
  leechers?: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/search/jackett?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      console.log("Jackett search response:", data);
      
      const searchResults: SearchResult[] = (data.Results || []).map((item: any) => {
        const title = item.Title || "Unknown";
        let author = "Unknown Author";
        
        const parts = title.split(/[-–—]/);
        if (parts.length > 1) {
          author = parts[0].trim();
        }
        
        return {
          title: title,
          author: author,
          description: item.CategoryDesc || item.Size,
          coverUrl: item.poster || item.image,
          url: item.Link || item.link,
          source: item.Indexer || "Jackett",
          size: item.Size,
          seeders: item.Seeders,
          leechers: item.Leechers,
        };
      });
      
      setResults(searchResults);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (result: SearchResult) => {
    if (!result.url) return;

    try {
      await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: result.url,
          title: result.title,
        }),
      });
      alert("Download started!");
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to start download");
    }
  };

  return (
    <div className="h-full p-6">
      <h2 className="text-2xl font-bold mb-6">Search Audiobooks</h2>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for audiobooks..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </form>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <BookOpen className="w-16 h-16 mb-4" />
          <p>No results found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="group bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-400 transition-all"
            >
              <div className="relative aspect-square bg-gray-700">
                {result.coverUrl ? (
                  <img
                    src={result.coverUrl}
                    alt={result.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleDownload(result)}
                    className="bg-primary-500 p-3 rounded-full hover:bg-primary-600"
                    title="Download"
                  >
                    <Download className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{result.title}</h3>
                <p className="text-sm text-gray-400 truncate">{result.author}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{result.source}</span>
                  {result.size && <span>{result.size}</span>}
                  {result.seeders !== undefined && (
                    <span className="text-green-400">{result.seeders} ↓</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
