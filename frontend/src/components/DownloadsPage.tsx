"use client";

import { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Trash2, 
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface Torrent {
  id: number;
  name: string;
  status: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  eta: number;
  isStalled: boolean;
}

const statusIcons: Record<string, React.ReactNode> = {
  check: <Clock className="w-4 h-4 text-yellow-400" />,
  download: <Download className="w-4 h-4 text-primary-400" />,
  seeding: <CheckCircle className="w-4 h-4 text-green-400" />,
  stopped: <Pause className="w-4 h-4 text-gray-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
};

const statusLabels: Record<string, string> = {
  check: "Checking",
  download: "Downloading",
  seeding: "Seeding",
  stopped: "Stopped",
  error: "Error",
};

export default function DownloadsPage() {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTorrents();
    const interval = setInterval(fetchTorrents, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTorrents = async () => {
    try {
      const res = await fetch("/api/downloads");
      const data = await res.json();
      setTorrents(data.torrents || []);
    } catch (error) {
      console.error("Failed to fetch torrents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: number) => {
    try {
      await fetch(`/api/downloads/${id}/start`, { method: "POST" });
      fetchTorrents();
    } catch (error) {
      console.error("Failed to start torrent:", error);
    }
  };

  const handleStop = async (id: number) => {
    try {
      await fetch(`/api/downloads/${id}/stop`, { method: "POST" });
      fetchTorrents();
    } catch (error) {
      console.error("Failed to stop torrent:", error);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Are you sure you want to remove this download?")) return;
    try {
      await fetch(`/api/downloads/${id}`, { method: "DELETE" });
      fetchTorrents();
    } catch (error) {
      console.error("Failed to remove torrent:", error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatEta = (seconds: number) => {
    if (seconds < 0) return "∞";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const getStatusType = (status: string) => {
    if (status.includes("download")) return "download";
    if (status.includes("check")) return "check";
    if (status.includes("seed")) return "seeding";
    if (status.includes("stop")) return "stopped";
    if (status.includes("error")) return "error";
    return "stopped";
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
        <h2 className="text-2xl font-bold">Downloads</h2>
        <button
          onClick={fetchTorrents}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {torrents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Download className="w-16 h-16 mb-4" />
          <p>No downloads yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {torrents.map((torrent) => (
            <div
              key={torrent.id}
              className="bg-gray-800 rounded-lg p-4 flex items-center gap-4"
            >
              <div className="flex-shrink-0">
                {statusIcons[getStatusType(torrent.status)] || statusIcons.stopped}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{torrent.name}</p>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{statusLabels[getStatusType(torrent.status)] || torrent.status}</span>
                  <span>
                    {formatSize(torrent.downloadedBytes)} / {formatSize(torrent.totalBytes)}
                  </span>
                  {torrent.eta >= 0 && <span>ETA: {formatEta(torrent.eta)}</span>}
                </div>
                <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all"
                    style={{ width: `${torrent.progress * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {torrent.status.includes("stop") || torrent.status === "seeding" ? (
                  <button
                    onClick={() => handleStart(torrent.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Start"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStop(torrent.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Pause"
                  >
                    <Pause className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => handleRemove(torrent.id)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-red-400"
                  title="Remove"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
