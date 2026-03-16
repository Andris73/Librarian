import Library from "@/components/Library";
import Player from "@/components/Player";

export default function Home() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6">
        <Library />
      </div>
      <Player />
    </div>
  );
}
