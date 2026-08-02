import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';
import logger from '../config/logger.js';

const MAX_MESSAGE_BYTES = 10 * 1024;
const MAX_ROOM_LENGTH = 120;
const ROOM_RE = /^[A-Za-z0-9_-]+$/;

class PeerToPeerSignaling {
  constructor(wss) {
    this.wss = wss;
    this.rooms = new Map();
    this.peers = new Map();
    wss.on('connection', (ws, req) => this.handleConnection(ws, req));
  }

  handleConnection(ws, req) {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host}`);
    } catch (err) {
      logger.warn({ err, requestId, url: req.url }, 'peer connection rejected: malformed URL');
      ws.close(4400, 'malformed request');
      return;
    }

    // Authenticate before joining any room: the token is a normal JWT
    // (same one used for API requests). Rejected connections never enter
    // the signaling mesh, so no eavesdropping on foreign rooms.
    const token = url.searchParams.get('token');
    let userId = null;
    try {
      const decoded = jwt.verify(token || '', process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      logger.warn({ requestId, path: url.pathname }, 'peer connection rejected: invalid token');
      ws.close(4401, 'unauthorized');
      return;
    }

    const roomId = url.searchParams.get('room');
    const role = url.searchParams.get('role');

    logger.info({ requestId, roomId, role, userId, path: url.pathname }, 'peer connection incoming');

    if (!roomId || !role) {
      logger.warn({ requestId, roomId, role }, 'peer connection rejected: missing room or role');
      ws.close(4001, 'room and role are required');
      return;
    }

    if (roomId.length > MAX_ROOM_LENGTH || !ROOM_RE.test(roomId)) {
      logger.warn({ requestId, roomId }, 'peer connection rejected: invalid room id');
      ws.close(4002, 'invalid room id');
      return;
    }

    if (role !== 'interviewer' && role !== 'candidate') {
      logger.warn({ requestId, role }, 'peer connection rejected: invalid role');
      ws.close(4003, 'invalid role');
      return;
    }

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }

    const room = this.rooms.get(roomId);
    room.add(ws);
    this.peers.set(ws, { roomId, role, requestId, userId });

    const peerCount = room.size;
    const isInterviewer = role === 'interviewer';

    try {
      ws.send(JSON.stringify({ type: 'connected', peerCount, isInterviewer, requestId }));
      logger.info({ requestId, roomId, peerCount, isInterviewer, userId }, 'peer connected successfully');
    } catch (sendErr) {
      logger.error({ err: sendErr, requestId, roomId }, 'Failed to send welcome message to peer');
    }

    if (isInterviewer && peerCount === 2) {
      this.broadcast(roomId, { type: 'interview:start', requestId });
      logger.info({ requestId, roomId }, 'interview session started (2 peers)');
    }

    ws.on('message', (raw, isBinary) => {
      if (!isBinary && raw.length > MAX_MESSAGE_BYTES) {
        logger.warn({ requestId, roomId, bytes: raw.length }, 'peer message too large — closing');
        ws.close(4004, 'message too large');
        return;
      }
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'ice-candidate' || msg.type === 'offer' || msg.type === 'answer') {
          this.forwardToPeer(roomId, ws, msg, requestId);
        } else if (msg.type === 'interview:answer') {
          this.broadcast(roomId, { type: 'interview:answer', text: String(msg.text || '').slice(0, 2000), requestId });
        } else if (msg.type === 'interview:next') {
          this.broadcast(roomId, { type: 'interview:next', requestId });
        } else {
          logger.debug({ requestId, roomId, msgType: msg.type }, 'received unknown message type from peer');
        }
      } catch (parseErr) {
        logger.warn({ err: parseErr, requestId, roomId }, 'peer sent malformed message');
      }
    });

    ws.on('close', () => {
      room.delete(ws);
      const peerInfo = this.peers.get(ws);
      this.peers.delete(ws);
      logger.info({ requestId, roomId, durationMs: Date.now() - startTime, userId }, 'peer disconnected');
      if (room.size === 0) {
        this.rooms.delete(roomId);
        logger.info({ requestId, roomId }, 'room removed (empty)');
      } else {
        this.broadcast(roomId, { type: 'peer:disconnected', peerCount: room.size, requestId });
      }
    });

    ws.on('error', (err) => {
      logger.error({ err, requestId, roomId }, 'peer WebSocket error');
    });
  }

  forwardToPeer(roomId, sender, msg, requestId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const payload = JSON.stringify(msg);
    for (const peer of room) {
      if (peer !== sender && peer.readyState === WebSocket.OPEN) {
        try {
          peer.send(payload);
        } catch (sendErr) {
          logger.error({ err: sendErr, requestId, roomId }, 'failed to forward message to peer');
        }
      }
    }
  }

  broadcast(roomId, msg) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const payload = JSON.stringify(msg);
    for (const peer of room) {
      if (peer.readyState === WebSocket.OPEN) {
        try {
          peer.send(payload);
        } catch (sendErr) {
          logger.error({ err: sendErr, roomId }, 'failed to broadcast message to peer');
        }
      }
    }
  }
}

export default PeerToPeerSignaling;
