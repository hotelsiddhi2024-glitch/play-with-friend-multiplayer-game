"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

interface GameRoomProps {
  roomId: string;
  initialPlayers: Player[];
  onLeaveGame: () => void;
}

export default function GameRoom({ roomId, initialPlayers, onLeaveGame }: GameRoomProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameMessage, setGameMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socketInstance = socketManager.getSocket();
    setSocket(socketInstance);

    if (socketInstance) {
      // Find current player
      const myPlayer = initialPlayers.find(p => p.id === socketInstance.id);
      setCurrentPlayer(myPlayer || null);

      // Socket event listeners
      socketInstance.on('stealAction', (data: {
        thief: Player;
        target: Player;
        stolen: { guns: number; ammo: number };
      }) => {
        const { thief, target, stolen } = data;
        
        // Update players list
        setPlayers(prev => prev.map(p => {
          if (p.id === thief.id) return thief;
          if (p.id === target.id) return target;
          return p;
        }));

        // Update current player if affected
        if (socketInstance.id === thief.id) {
          setCurrentPlayer(thief);
          setGameMessage(`You stole ${stolen.guns} guns and ${stolen.ammo} ammo from ${target.name}!`);
        } else if (socketInstance.id === target.id) {
          setCurrentPlayer(target);
          setGameMessage(`${thief.name} stole ${stolen.guns} guns and ${stolen.ammo} ammo from you!`);
        } else {
          setGameMessage(`${thief.name} stole from ${target.name}!`);
        }

        // Clear message after 3 seconds
        setTimeout(() => setGameMessage(''), 3000);
      });

      socketInstance.on('attackAction', (data: {
        attacker: Player;
        target: Player;
      }) => {
        const { attacker, target } = data;
        
        // Update attacker's ammo
        setPlayers(prev => prev.map(p => {
          if (p.id === attacker.id) return attacker;
          return p;
        }));

        if (socketInstance.id === attacker.id) {
          setCurrentPlayer(attacker);
          setGameMessage(`You attacked ${target.name}!`);
        } else if (socketInstance.id === target.id) {
          setGameMessage(`${attacker.name} attacked you!`);
        } else {
          setGameMessage(`${attacker.name} attacked ${target.name}!`);
        }

        // Clear message after 3 seconds
        setTimeout(() => setGameMessage(''), 3000);
      });

      socketInstance.on('playerMoved', (data: {
        playerId: string;
        position: { x: number; y: number };
      }) => {
        setPlayers(prev => prev.map(p => {
          if (p.id === data.playerId) {
            return { ...p, position: data.position };
          }
          return p;
        }));
      });

      socketInstance.on('playerLeft', (data: {
        playerId: string;
        playerName: string;
      }) => {
        setPlayers(prev => prev.filter(p => p.id !== data.playerId));
        setGameMessage(`${data.playerName} left the game`);
        setTimeout(() => setGameMessage(''), 3000);
      });
    }

    return () => {
      if (socketInstance) {
        socketInstance.off('stealAction');
        socketInstance.off('attackAction');
        socketInstance.off('playerMoved');
        socketInstance.off('playerLeft');
      }
    };
  }, [initialPlayers]);

  const handlePlayerClick = (targetPlayer: Player) => {
    if (!socket || !currentPlayer || targetPlayer.id === currentPlayer.id) return;

    // Steal action
    socket.emit('steal', { targetPlayerId: targetPlayer.id });
  };

  const handleAttack = (targetPlayer: Player) => {
    if (!socket || !currentPlayer || targetPlayer.id === currentPlayer.id) return;

    if (currentPlayer.inventory.guns === 0 || currentPlayer.inventory.ammo === 0) {
      setGameMessage('You need guns and ammo to attack!');
      setTimeout(() => setGameMessage(''), 3000);
      return;
    }

    socket.emit('attack', { targetPlayerId: targetPlayer.id });
  };

  const handleGameAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!socket || !gameAreaRef.current) return;

    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socket.emit('movePlayer', { x, y });
  };

  const getPlayerColor = (playerId: string) => {
    if (!currentPlayer) return 'bg-gray-500';
    if (playerId === currentPlayer.id) return 'bg-blue-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Play with Friend</h1>
            <p className="text-sm text-muted-foreground">Room: {roomId}</p>
          </div>
          <Button variant="outline" onClick={onLeaveGame}>
            Leave Game
          </Button>
        </div>
      </div>

      {/* Game Message */}
      {gameMessage && (
        <div className="p-4">
          <Alert>
            <AlertDescription>{gameMessage}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 flex">
        {/* Main Game Board */}
        <div className="flex-1 relative">
          <div
            ref={gameAreaRef}
            className="w-full h-full bg-muted/20 relative cursor-crosshair"
            onClick={handleGameAreaClick}
            style={{ minHeight: '500px' }}
          >
            {players.map((player) => (
              <div
                key={player.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{
                  left: `${Math.min(Math.max(player.position.x, 40), window.innerWidth - 40)}px`,
                  top: `${Math.min(Math.max(player.position.y, 40), 400)}px`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayerClick(player);
                }}
              >
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full ${getPlayerColor(player.id)} flex items-center justify-center text-white font-bold shadow-lg hover:scale-110 transition-transform`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="mt-1 text-xs font-medium">{player.name}</div>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      {player.inventory.guns}G
                    </Badge>
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {player.inventory.ammo}A
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l p-4 space-y-4">
          {/* Current Player Stats */}
          {currentPlayer && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Your Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Name:</span>
                  <span className="font-bold">{currentPlayer.name}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Guns:</span>
                    <Badge variant="secondary">{currentPlayer.inventory.guns}</Badge>
                  </div>
                  <Progress value={(currentPlayer.inventory.guns / 10) * 100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Ammo:</span>
                    <Badge variant="outline">{currentPlayer.inventory.ammo}</Badge>
                  </div>
                  <Progress value={(currentPlayer.inventory.ammo / 20) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Players List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Players ({players.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`p-3 rounded-lg border ${
                    player.id === currentPlayer?.id ? 'bg-blue-50 border-blue-200' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{player.name}</span>
                    {player.id === currentPlayer?.id && (
                      <Badge variant="default" className="text-xs">You</Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {player.inventory.guns} guns
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {player.inventory.ammo} ammo
                    </Badge>
                  </div>

                  {player.id !== currentPlayer?.id && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex-1"
                        onClick={() => handlePlayerClick(player)}
                      >
                        Steal
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs flex-1"
                        onClick={() => handleAttack(player)}
                        disabled={!currentPlayer || currentPlayer.inventory.guns === 0 || currentPlayer.inventory.ammo === 0}
                      >
                        Attack
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">How to Play</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>• Click on other players to steal their guns/ammo</p>
              <p>• Use "Attack" button to attack with guns and ammo</p>
              <p>• Click on the game area to move your position</p>
              <p>• You need both guns AND ammo to attack</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
