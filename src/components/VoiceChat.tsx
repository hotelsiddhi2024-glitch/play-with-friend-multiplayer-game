"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import socketManager from '@/lib/socket';
import { Socket } from 'socket.io-client';

interface VoiceChatProps {
  roomId: string;
}

interface PeerConnection {
  id: string;
  name: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export default function VoiceChat({ roomId }: VoiceChatProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [peers, setPeers] = useState<PeerConnection[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudiosRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    const socketInstance = socketManager.getSocket();
    setSocket(socketInstance);

    if (socketInstance) {
      initializeVoiceChat(socketInstance);
    }

    return () => {
      cleanup();
    };
  }, [roomId]);

  const initializeVoiceChat = async (socketInstance: Socket) => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setLocalStream(stream);
      setIsConnected(true);
      setError('');

      // Set up WebRTC signaling
      setupWebRTCSignaling(socketInstance, stream);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Microphone access denied. Voice chat will not work.');
      setIsConnected(false);
    }
  };

  const setupWebRTCSignaling = (socketInstance: Socket, stream: MediaStream) => {
    // WebRTC signaling events
    socketInstance.on('voice-offer', async (data: { 
      offer: RTCSessionDescriptionInit; 
      from: string; 
      fromName: string; 
    }) => {
      await handleOffer(data, stream);
    });

    socketInstance.on('voice-answer', async (data: { 
      answer: RTCSessionDescriptionInit; 
      from: string; 
    }) => {
      await handleAnswer(data);
    });

    socketInstance.on('voice-ice-candidate', async (data: { 
      candidate: RTCIceCandidateInit; 
      from: string; 
    }) => {
      await handleIceCandidate(data);
    });

    socketInstance.on('playerJoined', (data: { player: any; players: any[] }) => {
      // When a new player joins, initiate WebRTC connection
      if (data.player.id !== socketInstance.id) {
        createPeerConnection(data.player.id, data.player.name, stream, true);
      }
    });

    socketInstance.on('playerLeft', (data: { playerId: string }) => {
      removePeerConnection(data.playerId);
    });
  };

  const createPeerConnection = (
    peerId: string, 
    peerName: string, 
    stream: MediaStream, 
    isInitiator: boolean = false
  ) => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Add local stream to peer connection
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      playRemoteAudio(peerId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('voice-ice-candidate', {
          candidate: event.candidate,
          to: peerId,
          room: roomId
        });
      }
    };

    // Store peer connection
    const newPeer: PeerConnection = {
      id: peerId,
      name: peerName,
      connection: peerConnection
    };

    setPeers(prev => [...prev.filter(p => p.id !== peerId), newPeer]);

    // If initiator, create and send offer
    if (isInitiator && socket) {
      peerConnection.createOffer().then(offer => {
        return peerConnection.setLocalDescription(offer);
      }).then(() => {
        socket.emit('voice-offer', {
          offer: peerConnection.localDescription,
          to: peerId,
          room: roomId
        });
      }).catch(err => {
        console.error('Error creating offer:', err);
      });
    }

    return peerConnection;
  };

  const handleOffer = async (data: { 
    offer: RTCSessionDescriptionInit; 
    from: string; 
    fromName: string; 
  }, stream: MediaStream) => {
    if (!socket) return;

    const peerConnection = createPeerConnection(data.from, data.fromName, stream, false);
    
    try {
      await peerConnection.setRemoteDescription(data.offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      socket.emit('voice-answer', {
        answer: answer,
        to: data.from,
        room: roomId
      });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const handleAnswer = async (data: { 
    answer: RTCSessionDescriptionInit; 
    from: string; 
  }) => {
    const peer = peers.find(p => p.id === data.from);
    if (peer) {
      try {
        await peer.connection.setRemoteDescription(data.answer);
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    }
  };

  const handleIceCandidate = async (data: { 
    candidate: RTCIceCandidateInit; 
    from: string; 
  }) => {
    const peer = peers.find(p => p.id === data.from);
    if (peer) {
      try {
        await peer.connection.addIceCandidate(data.candidate);
      } catch (err) {
        console.error('Error handling ICE candidate:', err);
      }
    }
  };

  const playRemoteAudio = (peerId: string, stream: MediaStream) => {
    // Create or get audio element for this peer
    if (!remoteAudiosRef.current[peerId]) {
      const audio = new Audio();
      audio.autoplay = true;
      remoteAudiosRef.current[peerId] = audio;
    }
    
    const audio = remoteAudiosRef.current[peerId];
    audio.srcObject = stream;
  };

  const removePeerConnection = (peerId: string) => {
    setPeers(prev => {
      const peer = prev.find(p => p.id === peerId);
      if (peer) {
        peer.connection.close();
      }
      return prev.filter(p => p.id !== peerId);
    });

    // Remove audio element
    if (remoteAudiosRef.current[peerId]) {
      delete remoteAudiosRef.current[peerId];
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const cleanup = () => {
    // Close all peer connections
    peers.forEach(peer => {
      peer.connection.close();
    });

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Clean up audio elements
    Object.values(remoteAudiosRef.current).forEach(audio => {
      audio.srcObject = null;
    });
    remoteAudiosRef.current = {};
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          Voice Chat
          {isConnected && (
            <Badge variant="secondary" className="text-xs">
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {isConnected && (
          <>
            <div className="flex items-center justify-center">
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "default"}
                className="w-full"
              >
                {isMuted ? "Unmute" : "Mute"}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Voice Status:</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Your Mic:</span>
                  <Badge variant={isMuted ? "destructive" : "secondary"}>
                    {isMuted ? "Muted" : "Active"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Connected Peers:</span>
                  <Badge variant="outline">{peers.length}</Badge>
                </div>
              </div>
            </div>

            {peers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Talking with:</h4>
                <div className="space-y-1">
                  {peers.map(peer => (
                    <div key={peer.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                      <span>{peer.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        Connected
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!isConnected && !error && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Requesting microphone access...
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Voice chat uses WebRTC for peer-to-peer communication</p>
          <p>• Make sure to allow microphone access</p>
          <p>• Voice quality depends on your internet connection</p>
        </div>
      </CardContent>

      {/* Hidden audio element for local stream monitoring */}
      <audio ref={localAudioRef} muted style={{ display: 'none' }} />
    </Card>
  );
}
