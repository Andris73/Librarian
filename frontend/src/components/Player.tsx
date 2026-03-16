"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  ListMusic
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  duration: number;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  isMuted: boolean;
}

export default function Player() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    volume: 0.8,
    isMuted: false,
  });

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.isMuted ? 0 : state.volume;
    }
  }, [state.volume, state.isMuted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (state.isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setState((prev) => ({
        ...prev,
        currentTime: audioRef.current!.currentTime,
      }));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setState((prev) => ({ ...prev, volume, isMuted: false }));
  };

  const toggleMute = () => {
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!state.currentTrack) {
    return (
      <div className="h-20 bg-gray-800 border-t border-gray-700 flex items-center justify-center text-gray-500">
        <p>Select an audiobook to play</p>
      </div>
    );
  }

  return (
    <div className="h-24 bg-gray-800 border-t border-gray-700 px-4 flex items-center gap-4">
      <audio
        ref={audioRef}
        src={state.currentTrack?.coverUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setState((prev) => ({ ...prev, isPlaying: false }))}
      />

      <div className="flex items-center gap-3 w-64">
        <div className="w-14 h-14 bg-gray-700 rounded flex-shrink-0">
          {state.currentTrack.coverUrl && (
            <img
              src={state.currentTrack.coverUrl}
              alt={state.currentTrack.title}
              className="w-full h-full object-cover rounded"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{state.currentTrack.title}</p>
          <p className="text-sm text-gray-400 truncate">
            {state.currentTrack.author}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-white transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            className="bg-white text-black rounded-full p-2 hover:scale-105 transition-transform"
          >
            {state.isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current" />
            )}
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full max-w-xl">
          <span className="text-xs text-gray-400 w-10 text-right">
            {formatTime(state.currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={state.currentTrack.duration || 0}
            value={state.currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <span className="text-xs text-gray-400 w-10">
            {formatTime(state.currentTrack.duration)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 w-32">
        <button onClick={toggleMute} className="text-gray-400 hover:text-white">
          {state.isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={state.isMuted ? 0 : state.volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />
      </div>

      <button className="text-gray-400 hover:text-white">
        <ListMusic className="w-5 h-5" />
      </button>
    </div>
  );
}
