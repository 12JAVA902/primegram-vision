import { createContext, useContext, useState, ReactNode } from "react";

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  platform: "youtube" | "spotify" | "apple";
  embedUrl: string;
}

interface MusicPlayerContextType {
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  isPlayerVisible: boolean;
  setIsPlayerVisible: (v: boolean) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType>({
  currentTrack: null,
  setCurrentTrack: () => {},
  isPlayerVisible: false,
  setIsPlayerVisible: () => {},
});

export const useMusicPlayer = () => useContext(MusicPlayerContext);

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  const handleSetTrack = (track: Track | null) => {
    setCurrentTrack(track);
    setIsPlayerVisible(!!track);
  };

  return (
    <MusicPlayerContext.Provider
      value={{ currentTrack, setCurrentTrack: handleSetTrack, isPlayerVisible, setIsPlayerVisible }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};
