"use client";

import { useState } from 'react';
import GameLobby from '@/components/GameLobby';
import GameRoom from '@/components/GameRoom';
import VoiceChat from '@/components/VoiceChat';

interface Player {
  id: string;
  name: string;
  room: string;
  inventory: {
    guns: number;
    ammo: number;
  };
  position: {
    x: number;
    y: number;
  };
}

export default function HomePage() {
  const [gameState, setGameState] = useState<'lobby' | 'playing'>('lobby');
  const [roomId, setRoomId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);

  const handleGameStart = (newRoomId: string, newPlayers: Player[]) => {
    setRoomId(newRoomId);
    setPlayers(newPlayers);
    setGameState('playing');
  };

  const handleLeaveGame = () => {
    setGameState('lobby');
    setRoomId('');
    setPlayers([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {gameState === 'lobby' ? (
        <GameLobby onGameStart={handleGameStart} />
      ) : (
        <div className="relative">
          <GameRoom 
            roomId={roomId} 
            initialPlayers={players} 
            onLeaveGame={handleLeaveGame} 
          />
          
          {/* Voice Chat Overlay */}
          <div className="fixed bottom-4 right-4 z-50">
            <VoiceChat roomId={roomId} />
          </div>
        </div>
      )}
    </div>
  );
}
