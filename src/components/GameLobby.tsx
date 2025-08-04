"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import socketManager from '@/lib/socket';
import { Socket } from 'socket.io-client';

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

interface GameLobbyProps {
  onGameStart: (roomId: string, players: Player[]) => void;
}

export default function GameLobby({ onGameStart }: GameLobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = socketManager.connect();
    setSocket(socketInstance);

    // Generate random room ID if not provided
    if (!roomId) {
      setRoomId(Math.random().toString(36).substring(2, 8).toUpperCase());
    }

    // Socket event listeners
    socketInstance.on('playerJoined', (data: { player: Player; players: Player[] }) => {
      setPlayers(data.players);
      setError('');
      
      // Start game if we have at least 2 players
      if (data.players.length >= 2) {
        setTimeout(() => {
          onGameStart(roomId, data.players);
        }, 1000);
      }
    });

    socketInstance.on('error', (data: { message: string }) => {
      setError(data.message);
      setIsConnecting(false);
    });

    return () => {
      socketInstance.off('playerJoined');
      socketInstance.off('error');
    };
  }, [roomId, onGameStart]);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    if (!socket) {
      setError('Connection not established');
      return;
    }

    setIsConnecting(true);
    setError('');

    socket.emit('joinRoom', {
      name: playerName.trim(),
      roomId: roomId.trim().toUpperCase()
    });
  };

  const generateNewRoomId = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomId);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Play with Friend</CardTitle>
          <p className="text-muted-foreground">
            Multiplayer shooting game where you steal guns and ammo to attack!
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="playerName" className="text-sm font-medium">
                Your Name
              </label>
              <Input
                id="playerName"
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={isConnecting}
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="roomId" className="text-sm font-medium">
                Room ID
              </label>
              <div className="flex gap-2">
                <Input
                  id="roomId"
                  type="text"
                  placeholder="Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  disabled={isConnecting}
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateNewRoomId}
                  disabled={isConnecting}
                >
                  New
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this Room ID with friends to play together
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isConnecting || !playerName.trim() || !roomId.trim()}
            >
              {isConnecting ? 'Joining...' : 'Join Game'}
            </Button>
          </form>

          {players.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Players in Room ({players.length}/6)</h3>
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src="https://placehold.co/40x40?text=Player+Avatar+Gaming+Profile"
                        alt={`${player.name} avatar`}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://placehold.co/40x40?text=P";
                        }}
                      />
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="secondary">
                        {player.inventory.guns} guns
                      </Badge>
                      <Badge variant="outline">
                        {player.inventory.ammo} ammo
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              {players.length >= 2 && (
                <Alert>
                  <AlertDescription>
                    Game will start automatically! Get ready to steal and attack!
                  </AlertDescription>
                </Alert>
              )}
              
              {players.length < 2 && (
                <p className="text-sm text-muted-foreground text-center">
                  Waiting for more players... (Need at least 2 players)
                </p>
              )}
            </div>
          )}

          <div className="text-center space-y-2">
            <h4 className="font-medium text-sm">How to Play:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Tap other players to steal their guns and ammo</p>
              <p>• You need guns AND ammo to attack</p>
              <p>• Use voice chat to coordinate with friends</p>
              <p>• 2-6 players can play together</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
