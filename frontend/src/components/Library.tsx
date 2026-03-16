"use client";

import { useState, useEffect } from "react";
import { Play, MoreVertical, Clock, BookOpen } from "lucide-react";

interface Book {
  id: string;
  title: string;
  authorName?: string;
  author?: string;
  narratorName?: string;
  description?: string;
  coverUrl?: string;
  duration?: number;
  progress?: number;
  isComplete?: boolean;
}

interface ABSLibraryItem {
  id: string;
  media: {
    metadata: {
      title: string;
      authorName?: string;
      narratorName?: string;
      description?: string;
    };
    duration?: number;
  };
  mediaProgress?: {
    progress: number;
    isComplete: boolean;
  };
}

function parseBookFromABS(item: ABSLibraryItem): Book {
  return {
    id: item.id,
    title: item.media.metadata.title || "Unknown Title",
    authorName: item.media.metadata.authorName,
    narratorName: item.media.metadata.narratorName,
    description: item.media.metadata.description,
    coverUrl: `/api/abs/items/${item.id}/cover`,
    duration: item.media.duration,
    progress: item.mediaProgress?.progress,
    isComplete: item.mediaProgress?.isComplete,
  };
}

interface Library {
  id: string;
  name: string;
  books?: Book[];
}

export default function Library() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<string>("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLibraries();
  }, []);

  useEffect(() => {
    if (selectedLibrary) {
      fetchBooks(selectedLibrary);
    }
  }, [selectedLibrary]);

  const fetchLibraries = async () => {
    try {
      const res = await fetch("/api/libraries");
      const data = await res.json();
      console.log("Libraries response:", data);
      const libs = data.libraries || data.result || [];
      setLibraries(libs);
      if (libs.length > 0) {
        setSelectedLibrary(libs[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch libraries:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBooks = async (libraryId: string) => {
    try {
      const res = await fetch(`/api/libraries/${libraryId}/books`);
      const data = await res.json();
      console.log("Books response:", data);
      const items = data.results || data.result || [];
      setBooks(items.map((item: ABSLibraryItem) => parseBookFromABS(item)));
    } catch (error) {
      console.error("Failed to fetch books:", error);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Library</h2>
        <select
          value={selectedLibrary}
          onChange={(e) => setSelectedLibrary(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
        >
          {libraries.map((lib) => (
            <option key={lib.id} value={lib.id}>
              {lib.name}
            </option>
          ))}
        </select>
      </div>

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <BookOpen className="w-16 h-16 mb-4" />
          <p>No audiobooks found in this library</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {books.map((book) => (
            <div
              key={book.id}
              className="group bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-400 transition-all cursor-pointer"
            >
              <div className="relative aspect-square bg-gray-700">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="bg-primary-500 p-3 rounded-full">
                    <Play className="w-6 h-6 text-white fill-current" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{book.title}</h3>
                <p className="text-sm text-gray-400 truncate">{book.authorName || book.author || "Unknown"}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(book.duration)}
                  </span>
                  {book.progress !== undefined && book.progress > 0 && (
                    <span className="text-primary-400">
                      {Math.round(book.progress * 100)}%
                    </span>
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
