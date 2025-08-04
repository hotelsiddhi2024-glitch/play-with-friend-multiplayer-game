import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';

export const config = {
  api: {
    bodyParser: false,
  },
};

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: ServerIO;
    };
  };
};

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

const players: Map<string, Player> = new Map();
const rooms: Map<string, Set<string>> = new Map();

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.io server...');
    
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log(`Player connected: ${socket.id}`);

      socket.on('joinRoom', (data: { name: string; roomId: string }) => {
        try {
          const { name, roomId } = data;
          
          // Check room capacity (2-6 players)
          const currentRoom = rooms.get(roomId) || new Set();
          if (currentRoom.size >= 6) {
            socket.emit('error', { message: 'Room is full! Maximum 6 players allowed.' });
            return;
          }

          // Add player to room
          socket.join(roomId);
          currentRoom.add(socket.id);
          rooms.set(roomId, currentRoom);

          // Create player object
          const player: Player = {
            id: socket.id,
            name,
            room: roomId,
            inventory: {
              guns: Math.floor(Math.random() * 3) + 1, // Random 1-3 guns
              ammo: Math.floor(Math.random() * 10) + 5  // Random 5-14 ammo
            },
            position: {
              x: Math.random() * 800,
              y: Math.random() * 600
            }
          };

          players.set(socket.id, player);

          // Notify room about new player
          io.to(roomId).emit('playerJoined', {
            player,
            players: Array.from(currentRoom).map(id => players.get(id)).filter(Boolean)
          });

          console.log(`Player ${name} joined room ${roomId}`);
        } catch (error) {
          console.error('Error in joinRoom:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      socket.on('steal', (data: { targetPlayerId: string }) => {
        try {
          const { targetPlayerId } = data;
          const thief = players.get(socket.id);
          const target = players.get(targetPlayerId);

          if (!thief || !target) {
            socket.emit('error', { message: 'Player not found' });
            return;
          }

          if (thief.room !== target.room) {
            socket.emit('error', { message: 'Players not in same room' });
            return;
          }

          // Steal logic
          let stolenGuns = 0;
          let stolenAmmo = 0;

          if (target.inventory.guns > 0) {
            stolenGuns = Math.min(1, target.inventory.guns);
            target.inventory.guns -= stolenGuns;
            thief.inventory.guns += stolenGuns;
          }

          if (target.inventory.ammo > 0) {
            stolenAmmo = Math.min(3, target.inventory.ammo);
            target.inventory.ammo -= stolenAmmo;
            thief.inventory.ammo += stolenAmmo;
          }

          // Update players
          players.set(socket.id, thief);
          players.set(targetPlayerId, target);

          // Notify room about steal action
          io.to(thief.room).emit('stealAction', {
            thief: thief,
            target: target,
            stolen: { guns: stolenGuns, ammo: stolenAmmo }
          });

          console.log(`${thief.name} stole from ${target.name}: ${stolenGuns} guns, ${stolenAmmo} ammo`);
        } catch (error) {
          console.error('Error in steal:', error);
          socket.emit('error', { message: 'Failed to steal' });
        }
      });

      socket.on('attack', (data: { targetPlayerId: string }) => {
        try {
          const { targetPlayerId } = data;
          const attacker = players.get(socket.id);
          const target = players.get(targetPlayerId);

          if (!attacker || !target) {
            socket.emit('error', { message: 'Player not found' });
            return;
          }

          if (attacker.inventory.guns === 0 || attacker.inventory.ammo === 0) {
            socket.emit('error', { message: 'You need guns and ammo to attack!' });
            return;
          }

          // Use ammo
          attacker.inventory.ammo -= 1;
          players.set(socket.id, attacker);

          // Notify room about attack
          io.to(attacker.room).emit('attackAction', {
            attacker: attacker,
            target: target
          });

          console.log(`${attacker.name} attacked ${target.name}`);
        } catch (error) {
          console.error('Error in attack:', error);
          socket.emit('error', { message: 'Failed to attack' });
        }
      });

      socket.on('movePlayer', (data: { x: number; y: number }) => {
        try {
          const player = players.get(socket.id);
          if (player) {
            player.position = { x: data.x, y: data.y };
            players.set(socket.id, player);
            
            // Broadcast position to room
            socket.to(player.room).emit('playerMoved', {
              playerId: socket.id,
              position: player.position
            });
          }
        } catch (error) {
          console.error('Error in movePlayer:', error);
        }
      });

      socket.on('disconnect', () => {
        try {
          const player = players.get(socket.id);
          if (player) {
            const room = rooms.get(player.room);
            if (room) {
              room.delete(socket.id);
              if (room.size === 0) {
                rooms.delete(player.room);
              } else {
                rooms.set(player.room, room);
              }
              
              // Notify room about player leaving
              socket.to(player.room).emit('playerLeft', {
                playerId: socket.id,
                playerName: player.name
              });
            }
            
            players.delete(socket.id);
            console.log(`Player ${player.name} disconnected`);
          }
        } catch (error) {
          console.error('Error in disconnect:', error);
        }
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
