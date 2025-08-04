# Play with Friend - Multiplayer Mobile Game

A real-time multiplayer mobile game where 2-6 players compete by stealing guns and ammo from each other before attacking. Features integrated voice chat for real-time communication.

## 🎮 Game Features

### Core Gameplay
- **2-6 Players**: Support for small group multiplayer sessions
- **Stealing Mechanic**: Players must steal guns and ammo from others before they can attack
- **Real-time Action**: All actions happen in real-time across all connected players
- **Mobile-First Design**: Optimized for mobile devices with touch controls

### Voice Chat
- **WebRTC Integration**: Peer-to-peer voice communication
- **Real-time Audio**: Talk with other players during gameplay
- **Mute/Unmute Controls**: Easy audio management
- **No API Keys Required**: Uses browser's native WebRTC capabilities

### Technical Features
- **Socket.io**: Real-time multiplayer communication
- **Next.js 15**: Modern React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern, responsive UI design
- **shadcn/ui**: Beautiful, accessible UI components

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser with WebRTC support

### Installation

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open in Browser**
   - Navigate to `http://localhost:8000`
   - The game will be available on port 8000

### Production Build
```bash
npm run build
npm start
```

## 🎯 How to Play

### Joining a Game
1. Enter your player name
2. Create a new room or join existing room with Room ID
3. Share the Room ID with friends (2-6 players total)
4. Game starts automatically when 2+ players join

### Gameplay Mechanics
1. **Stealing**: Tap on other players to steal their guns and ammo
2. **Moving**: Click anywhere on the game area to move your position
3. **Attacking**: Use the Attack button (requires both guns AND ammo)
4. **Voice Chat**: Use the voice chat panel to communicate with other players

### Game Rules
- You start with random guns (1-3) and ammo (5-14)
- You can only attack if you have both guns and ammo
- Each attack consumes 1 ammo
- Stealing takes guns/ammo from other players
- Voice chat works throughout the entire game

## 🛠️ Technical Architecture

### Backend (Socket.io Server)
- **API Route**: `/api/socket` - Handles all real-time communication
- **Events Handled**:
  - `joinRoom` - Player joins game room
  - `steal` - Player steals from another player
  - `attack` - Player attacks another player
  - `movePlayer` - Player changes position
  - `disconnect` - Player leaves game

### Frontend Components
- **GameLobby**: Room creation and player joining interface
- **GameRoom**: Main gameplay area with player interactions
- **VoiceChat**: WebRTC-based voice communication
- **Socket Manager**: Singleton for managing Socket.io connections

### Voice Chat Implementation
- Uses native WebRTC for peer-to-peer audio
- Socket.io handles WebRTC signaling (offers, answers, ICE candidates)
- Automatic microphone permission requests
- Real-time audio streaming between players

## 🔧 Configuration

### Environment Variables
No environment variables required - the game uses:
- Socket.io for real-time communication (no API key needed)
- WebRTC for voice chat (browser native, no API key needed)

### Port Configuration
- Development: Port 8000 (configured in package.json)
- Production: Configurable via environment

## 📱 Mobile Optimization

### Features
- Touch-optimized controls
- Responsive design for all screen sizes
- Mobile-first UI/UX
- Optimized for portrait and landscape modes
- PWA-ready (can be installed on mobile devices)

### Browser Support
- Chrome/Chromium (recommended)
- Firefox
- Safari (iOS 11+)
- Edge

## 🐛 Troubleshooting

### Common Issues

**Voice Chat Not Working**
- Ensure microphone permissions are granted
- Check if browser supports WebRTC
- Verify you're using HTTPS in production

**Connection Issues**
- Check network connectivity
- Ensure port 8000 is not blocked
- Try refreshing the page

**Game Not Starting**
- Ensure at least 2 players have joined
- Check browser console for errors
- Verify Socket.io connection

### Debug Mode
Open browser developer tools to see:
- Socket.io connection status
- WebRTC connection logs
- Game state changes
- Error messages

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Considerations
- Ensure WebRTC works over HTTPS in production
- Configure proper CORS settings for Socket.io
- Set up proper domain/subdomain for voice chat

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎉 Credits

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Socket.io](https://socket.io/) - Real-time communication
- [WebRTC](https://webrtc.org/) - Voice chat
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components

---

**Play with Friend** - Where strategy meets real-time action! 🎮🎯
