import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventEmitter from 'events';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';
import PeerToPeerSignaling from '../src/services/peerToPeer.js';

class MockWebSocket extends EventEmitter {
  constructor(protocol = '') {
    super();
    this.protocol = protocol;
    this.readyState = WebSocket.OPEN;
    this.send = vi.fn();
    this.close = vi.fn();
  }
}

describe('PeerToPeerSignaling', () => {
  const JWT_SECRET = 'test-secret-key-123456';
  let signaling;

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    signaling = new PeerToPeerSignaling({});
  });

  const generateToken = (userId = 123) => {
    return jwt.sign({ userId }, JWT_SECRET);
  };

  describe('handleConnection', () => {
    it('rejects connection if URL is malformed', () => {
      const ws = new MockWebSocket();
      const req = { url: 'http://', headers: {} }; // invalid host/url

      signaling.handleConnection(ws, req);
      expect(ws.close).toHaveBeenCalledWith(4400, 'malformed request');
    });

    it('rejects connection if token is missing or invalid', () => {
      const ws = new MockWebSocket();
      const req = { url: '/ws?room=test&role=interviewer', headers: { host: 'localhost' } };

      signaling.handleConnection(ws, req);
      expect(ws.close).toHaveBeenCalledWith(4401, 'unauthorized');
    });

    it('rejects connection if room or role is missing', () => {
      const ws = new MockWebSocket(generateToken());
      const req = { url: '/ws?room=&role=', headers: { host: 'localhost' } };

      signaling.handleConnection(ws, req);
      expect(ws.close).toHaveBeenCalledWith(4001, 'room and role are required');
    });

    it('rejects connection if room id is invalid or too long', () => {
      const ws = new MockWebSocket(generateToken());
      const longRoom = 'a'.repeat(150);
      const req = { url: `/ws?room=${longRoom}&role=interviewer`, headers: { host: 'localhost' } };

      signaling.handleConnection(ws, req);
      expect(ws.close).toHaveBeenCalledWith(4002, 'invalid room id');

      const invalidChars = 'room!@#$';
      const req2 = { url: `/ws?room=${invalidChars}&role=interviewer`, headers: { host: 'localhost' } };
      signaling.handleConnection(ws, req2);
      expect(ws.close).toHaveBeenCalledWith(4002, 'invalid room id');
    });

    it('rejects connection if role is neither interviewer nor candidate', () => {
      const ws = new MockWebSocket(generateToken());
      const req = { url: '/ws?room=valid_room&role=spectator', headers: { host: 'localhost' } };

      signaling.handleConnection(ws, req);
      expect(ws.close).toHaveBeenCalledWith(4003, 'invalid role');
    });

    it('successfully connects first peer (candidate) and sends welcome message', () => {
      const ws = new MockWebSocket(generateToken(1));
      const req = { url: '/ws?room=room_1&role=candidate', headers: { host: 'localhost' } };

      signaling.handleConnection(ws, req);
      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"connected"')
      );
      expect(signaling.rooms.get('room_1').size).toBe(1);
    });

    it('connects second peer (interviewer) and broadcasts interview:start', () => {
      const candidateWs = new MockWebSocket(generateToken(1));
      const candidateReq = { url: '/ws?room=room_2&role=candidate', headers: { host: 'localhost' } };
      signaling.handleConnection(candidateWs, candidateReq);

      const interviewerWs = new MockWebSocket(generateToken(2));
      const interviewerReq = { url: '/ws?room=room_2&role=interviewer', headers: { host: 'localhost' } };
      signaling.handleConnection(interviewerWs, interviewerReq);

      expect(candidateWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"interview:start"')
      );
      expect(interviewerWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"interview:start"')
      );
    });
  });

  describe('messages and forwarding', () => {
    it('closes connection if message exceeds max byte limit', () => {
      const ws = new MockWebSocket(generateToken());
      const req = { url: '/ws?room=room_msg&role=candidate', headers: { host: 'localhost' } };
      signaling.handleConnection(ws, req);

      const oversizedMsg = 'a'.repeat(15 * 1024);
      ws.emit('message', oversizedMsg, false);

      expect(ws.close).toHaveBeenCalledWith(4004, 'message too large');
    });

    it('safely ignores malformed JSON messages', () => {
      const ws = new MockWebSocket(generateToken());
      const req = { url: '/ws?room=room_msg&role=candidate', headers: { host: 'localhost' } };
      signaling.handleConnection(ws, req);

      // Emitting invalid JSON shouldn't throw or crash
      expect(() => {
        ws.emit('message', 'invalid json string', false);
      }).not.toThrow();
    });

    it('forwards offer, answer, and ice-candidate to the other peer', () => {
      const ws1 = new MockWebSocket(generateToken(1));
      const ws2 = new MockWebSocket(generateToken(2));
      signaling.handleConnection(ws1, { url: '/ws?room=room_rtc&role=candidate', headers: { host: 'localhost' } });
      signaling.handleConnection(ws2, { url: '/ws?room=room_rtc&role=interviewer', headers: { host: 'localhost' } });

      const offerMsg = JSON.stringify({ type: 'offer', sdp: 'mock-sdp' });
      ws1.emit('message', offerMsg, false);
      expect(ws2.send).toHaveBeenCalledWith(offerMsg);

      const candidateMsg = JSON.stringify({ type: 'ice-candidate', candidate: 'mock-cand' });
      ws2.emit('message', candidateMsg, false);
      expect(ws1.send).toHaveBeenCalledWith(candidateMsg);
    });

    it('broadcasts interview:answer and interview:next to all peers in room', () => {
      const ws1 = new MockWebSocket(generateToken(1));
      const ws2 = new MockWebSocket(generateToken(2));
      signaling.handleConnection(ws1, { url: '/ws?room=room_int&role=candidate', headers: { host: 'localhost' } });
      signaling.handleConnection(ws2, { url: '/ws?room=room_int&role=interviewer', headers: { host: 'localhost' } });

      ws1.emit('message', JSON.stringify({ type: 'interview:answer', text: 'My solution' }), false);
      expect(ws1.send).toHaveBeenCalledWith(expect.stringContaining('"type":"interview:answer"'));
      expect(ws2.send).toHaveBeenCalledWith(expect.stringContaining('"type":"interview:answer"'));

      ws2.emit('message', JSON.stringify({ type: 'interview:next' }), false);
      expect(ws1.send).toHaveBeenCalledWith(expect.stringContaining('"type":"interview:next"'));
      expect(ws2.send).toHaveBeenCalledWith(expect.stringContaining('"type":"interview:next"'));
    });
  });

  describe('disconnection and cleanup', () => {
    it('notifies remaining peer when one peer disconnects and deletes room when empty', () => {
      const ws1 = new MockWebSocket(generateToken(1));
      const ws2 = new MockWebSocket(generateToken(2));
      signaling.handleConnection(ws1, { url: '/ws?room=room_disc&role=candidate', headers: { host: 'localhost' } });
      signaling.handleConnection(ws2, { url: '/ws?room=room_disc&role=interviewer', headers: { host: 'localhost' } });

      // First peer disconnects
      ws1.emit('close');
      expect(ws2.send).toHaveBeenCalledWith(expect.stringContaining('"type":"peer:disconnected"'));
      expect(signaling.rooms.get('room_disc').size).toBe(1);

      // Second peer disconnects
      ws2.emit('close');
      expect(signaling.rooms.has('room_disc')).toBe(false);
    });

    it('handles ws error event without throwing', () => {
      const ws = new MockWebSocket(generateToken());
      signaling.handleConnection(ws, { url: '/ws?room=room_err&role=candidate', headers: { host: 'localhost' } });

      expect(() => {
        ws.emit('error', new Error('Network reset'));
      }).not.toThrow();
    });
  });
});
