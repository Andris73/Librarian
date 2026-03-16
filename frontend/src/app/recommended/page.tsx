"use client";

import { useState, useEffect } from "react";
import { Download, BookOpen, RefreshCw, Search } from "lucide-react";

interface LibraryBook {
  id: string;
  title: string;
  authorName?: string;
  coverUrl?: string;
}

interface SearchResult {
  title: string;
  author: string;
  url?: string;
  source: string;
  size?: string;
  seeders?: number;
}

export default function RecommendedPage() {
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [recommendations, setRecommendations] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchLibraryBooks();
  }, []);

  const fetchLibraryBooks = async () => {
    try {
      const res = await fetch("/api/libraries");
      const data = await res.json();
      
      if (data.libraries && data.libraries.length > 0) {
        const booksRes = await fetch(`/api/libraries/${data.libraries[0].id}/books`);
        const booksData = await booksRes.json();
        
        const books = (booksData.results || []).slice(0, 10).map((item: any) => ({
          id: item.id,
          title: item.media?.metadata?.title || item.title,
          authorName: item.media?.metadata?.authorName,
          coverUrl: `/api/abs/items/${item.id}/cover`,
        }));
        
        setLibraryBooks(books);
      }
    } catch (error) {
      console.error("Failed to fetch library books:", error);
    } finally {
      setLoading(false);
    }
  };

  const findRecommendations = async () => {
    setSearching(true);
    setRecommendations([]);
    
    try {
      const allResults: SearchResult[] = [];
      
      for (const book of libraryBooks.slice(0, 5)) {
        const searchQuery = `${book.authorName || ""} ${book.title}`.trim();
        
        try {
          const res = await fetch(`/api/search/jackett?query=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          
          const results = (data.Results || []).slice(0, 3).map((item: any) => ({
            title: item.Title,
            author: book.authorName || "Unknown",
            url: item.Link,
            source: item.Indexer,
            size: item.Size,
            seeders: item.Seeders,
          }));
          
          allResults.push(...results);
        } catch (e) {
          console.error(`Search failed for ${searchQuery}:`, e);
        }
      }
      
      setRecommendations(allResults);
    } catch (error) {
      console.error("Failed to find recommendations:", error);
    } finally {
      setSearching(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Recommended</h2>
        <button
          onClick={findRecommendations}
          disabled={searching || libraryBooks.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 rounded-lg transition-colors"
        >
          {searching ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Find Similar Books
        </button>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Based on your recent books</h3>
        {libraryBooks.length === 0 ? (
          <p className="text-gray-500">No books in your library yet</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {libraryBooks.slice(0, 5).map((book) => (
              <div key={book.id} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-700 rounded flex-shrink-0">
                  {book.coverUrl && (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover rounded" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate text-sm">{book.title}</p>
                  <p className="text-xs text-gray-400 truncate">{book.authorName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Available for Download</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {recommendations.map((result, idx) => (
              <div
                key={idx}
                className="group bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-400 transition-all"
              >
                <div className="relative aspect-square bg-gray-700">
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-gray-600" />
                  </div>
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
                  <h3 className="font-semibold truncate text-sm">{result.title}</h3>
                  <p className="text-xs text-gray-400 truncate">{result.author}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>{result.source}</span>
                    {result.seeders !== undefined && (
                      <span className="text-green-400">{result.seeders} ↓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!searching && recommendations.length === 0 && libraryBooks.length > 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Search className="w-16 h-16 mb-4" />
          <p>Click "Find Similar Books" to search for matches</p>
        </div>
      )}
    </div>
  );
}
