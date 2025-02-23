import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { CodeCollabMessage } from "@shared/schema";
import { storage } from "./storage";

type Room = {
  participants: Map<number, WebSocket>;
};

type ConnectionStats = {
  totalConnections: number;
  activeRooms: number;
  lastPingTime: Date;
};

function logConnectionStats(stats: ConnectionStats) {
  console.log(`WebSocket Stats:
    - Total Connections: ${stats.totalConnections}
    - Active Rooms: ${stats.activeRooms}
    - Last Ping: ${stats.lastPingTime.toISOString()}`
  );
}

export function setupWebSocket(server: Server) {
  const rooms = new Map<string, Room>();
  const wss = new WebSocketServer({ server, path: "/ws" });
  const connections = new Set<WebSocket>();
  let lastStats: ConnectionStats = {
    totalConnections: 0,
    activeRooms: 0,
    lastPingTime: new Date()
  };

  wss.on("connection", async (ws) => {
    console.log("WebSocket client connected");
    connections.add(ws);
    lastStats.totalConnections = connections.size;
    lastStats.activeRooms = rooms.size;
    logConnectionStats(lastStats);

    let userId: number | null = null;
    let currentRoomId: string | null = null;

    // Setup heartbeat with error handling
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
          lastStats.lastPingTime = new Date();
        } catch (error) {
          console.error("Failed to send ping:", error);
          ws.terminate();
        }
      }
    }, 30000);

    ws.on("pong", () => {
      console.log("Client heartbeat received");
    });

    ws.on("message", async (data) => {
      try {
        const message: CodeCollabMessage = JSON.parse(data.toString());
        console.log("Received message:", message.type);

        switch (message.type) {
          case "join_room": {
            userId = message.userId;
            currentRoomId = message.roomId;

            if (!rooms.has(currentRoomId)) {
              rooms.set(currentRoomId, { participants: new Map() });
              console.log(`New room created: ${currentRoomId}`);
            }

            const room = rooms.get(currentRoomId)!;
            room.participants.set(userId, ws);

            console.log(`User ${userId} joined room ${currentRoomId}. Total participants: ${room.participants.size}`);

            room.participants.forEach((participant, participantId) => {
              if (participantId !== userId && participant.readyState === WebSocket.OPEN) {
                participant.send(JSON.stringify({
                  type: "join_room",
                  roomId: currentRoomId,
                  userId: message.userId,
                  username: message.username,
                }));
              }
            });
            break;
          }

          case "code_update": {
            if (!currentRoomId || !userId) {
              console.warn("Received code update without room context");
              break;
            }
            const room = rooms.get(currentRoomId);
            if (!room) {
              console.error(`Room ${currentRoomId} not found for code update`);
              break;
            }

            room.participants.forEach((participant, participantId) => {
              if (participantId !== userId && participant.readyState === WebSocket.OPEN) {
                try {
                  participant.send(JSON.stringify(message));
                } catch (error) {
                  console.error(`Failed to send code update to user ${participantId}:`, error);
                }
              }
            });
            break;
          }

          case "cursor_update": {
            if (!currentRoomId || !userId) {
              console.warn("Received cursor update without room context");
              break;
            }
            const room = rooms.get(currentRoomId);
            if (!room) {
              console.error(`Room ${currentRoomId} not found for cursor update`);
              break;
            }

            room.participants.forEach((participant, participantId) => {
              if (participantId !== userId && participant.readyState === WebSocket.OPEN) {
                try {
                  participant.send(JSON.stringify(message));
                } catch (error) {
                  console.error(`Failed to send cursor update to user ${participantId}:`, error);
                }
              }
            });
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "error",
            message: "Failed to process message"
          }));
        }
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      connections.delete(ws);
      clearInterval(pingInterval);
      lastStats.totalConnections = connections.size;

      if (currentRoomId && userId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          room.participants.delete(userId);
          console.log(`User ${userId} left room ${currentRoomId}. Remaining participants: ${room.participants.size}`);

          if (room.participants.size === 0) {
            rooms.delete(currentRoomId);
            console.log(`Room ${currentRoomId} removed due to no participants`);
          } else {
            room.participants.forEach((participant) => {
              if (participant.readyState === WebSocket.OPEN) {
                participant.send(JSON.stringify({
                  type: "leave_room",
                  roomId: currentRoomId,
                  userId,
                }));
              }
            });
          }
        }
      }

      lastStats.activeRooms = rooms.size;
      logConnectionStats(lastStats);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      connections.delete(ws);
      clearInterval(pingInterval);
      lastStats.totalConnections = connections.size;
      logConnectionStats(lastStats);
    });
  });

  // Log connection stats every minute
  setInterval(() => {
    logConnectionStats(lastStats);
  }, 60000);

  return wss;
}