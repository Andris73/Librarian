"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Library, 
  Search, 
  Download, 
  Settings,
  Headphones,
  Circle
} from "lucide-react";

const navItems = [
  { href: "/", label: "Library", icon: Library },
  { href: "/recommended", label: "Recommended", icon: Headphones },
  { href: "/search", label: "Search", icon: Search },
  { href: "/downloads", label: "Downloads", icon: Download },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface ConnectionStatus {
  abs: "connected" | "disconnected" | "unknown";
  jackett: "connected" | "disconnected" | "unknown";
  transmission: "connected" | "disconnected" | "unknown";
}

export default function Sidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<ConnectionStatus>({
    abs: "unknown",
    jackett: "unknown", 
    transmission: "unknown",
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [absRes, jackettRes, transmissionRes] = await Promise.all([
          fetch("/api/test/abs"),
          fetch("/api/test/jackett"),
          fetch("/api/test/transmission"),
        ]);
        
        const absData = await absRes.json();
        const jackettData = await jackettRes.json();
        const transmissionData = await transmissionRes.json();
        
        setStatus({
          abs: absData.status === "success" ? "connected" : "disconnected",
          jackett: jackettData.status === "success" ? "connected" : "disconnected",
          transmission: transmissionData.status === "success" ? "connected" : "disconnected",
        });
      } catch (e) {
        console.error("Failed to check status:", e);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (s: string) => {
    if (s === "connected") return "text-green-500";
    if (s === "disconnected") return "text-red-500";
    return "text-gray-500";
  };

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Headphones className="w-8 h-8 text-primary-400" />
          <h1 className="text-xl font-bold">Librarian</h1>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary-600 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Circle className={`w-2 h-2 fill-current ${getStatusColor(status.abs)}`} />
          <span className="text-gray-400">Audiobookshelf</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Circle className={`w-2 h-2 fill-current ${getStatusColor(status.jackett)}`} />
          <span className="text-gray-400">Jackett</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Circle className={`w-2 h-2 fill-current ${getStatusColor(status.transmission)}`} />
          <span className="text-gray-400">Transmission</span>
        </div>
      </div>
    </aside>
  );
}
