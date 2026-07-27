import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { ArrowLeft, Mic, MicOff, Phone, PhoneOff, MessageSquare, Clock } from 'lucide-react';
import './PeerInterviewScreen.css';

function PeerInterviewScreen({ onBack }) {
  const { t } = useTranslation();
  const { token } = useStore();
  const [status, setStatus] = useState('idle');
  const [roomId, setRoomId] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [role, setRole] = useState('interviewee');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connect = useCallback((room) => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`ws://${window.location.host}/ws/peer?room=${encodeURIComponent(room)}&role=${role}&token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setStatus('connected');
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'message') {
          setMessages(prev => [...prev, { role: data.senderRole === 'interviewer' ? 'interviewer' : 'peer', text: data.text, time: new Date(data.timestamp || Date.now()).toLocaleTimeString() }]);
        } else if (data.type === 'connected') {
          setStatus('waiting');
        } else if (data.type === 'partner-joined') {
          setStatus('active');
          setPartnerName(data.partnerName || 'Partner');
        } else if (data.type === 'partner-left') {
          setStatus('ended');
        } else if (data.type === 'signal') {
          // WebRTC signaling - forward to peer connection
          ws.send(JSON.stringify({ type: 'signal', signal: data.signal, to: data.to }));
        }
      } catch (e) { /* ignore parse errors */ }
    };

    ws.onerror = () => setStatus('error');
    ws.onclose = () => setStatus('disconnected');
  }, [role, token]);

  const createRoom = () => {
    const id = 'room-' + Math.random().toString(36).substring(2, 8);
    setRoomId(id);
    setStatus('creating');
    connect(id);
  };

  const joinRoom = () => {
    if (!roomId.trim()) return;
    setStatus('joining');
    connect(roomId.trim());
  };

  const sendMessage = () => {
    if (!inputText.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'message', text: inputText.trim() }));
    setMessages(prev => [...prev, { role: 'me', text: inputText.trim(), time: new Date().toLocaleTimeString() }]);
    setInputText('');
  };

  const leaveRoom = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('idle');
    setMessages([]);
    setPartnerName('');
    setRoomId('');
  };

  const isActive = status === 'connected' || status === 'waiting' || status === 'active';

  return (
    <div className="peer-interview-screen">
      <div className="peer-header">
        <button className="back-btn" onClick={onBack} type="button">
          <ArrowLeft size={20} />
        </button>
        <h1>{t('peer.title', 'Mock Interview')}</h1>
        <div className="peer-status-dot" data-status={status}>●</div>
      </div>

      {status === 'idle' && (
        <div className="peer-idle">
          <div className="peer-icon"><Phone size={48} /></div>
          <h2>{t('peer.start_title', 'Start a Peer Mock Interview')}</h2>
          <p>{t('peer.start_desc', 'Connect with another learner for a simulated interview. Take turns asking and answering questions.')}</p>

          <div className="peer-role-select">
            <button className={`role-btn ${role === 'interviewer' ? 'active' : ''}`} onClick={() => setRole('interviewer')} type="button">
              <Mic size={18} /> {t('peer.interviewer', 'Interviewer')}
            </button>
            <button className={`role-btn ${role === 'interviewee' ? 'active' : ''}`} onClick={() => setRole('interviewee')} type="button">
              <MessageSquare size={18} /> {t('peer.interviewee', 'Interviewee')}
            </button>
          </div>

          <div className="peer-create-join">
            <button className="btn-primary" onClick={createRoom} type="button">
              {t('peer.create_room', 'Create Room')}
            </button>
          </div>

          <div className="peer-join-section">
            <div className="peer-input-row">
              <input className="peer-input" placeholder={t('peer.room_id', 'Room ID')} value={roomId} onChange={e => setRoomId(e.target.value)} />
              <button className="btn-secondary" onClick={joinRoom} type="button">{t('peer.join', 'Join')}</button>
            </div>
          </div>
        </div>
      )}

      {(status === 'creating' || status === 'joining') && (
        <div className="peer-waiting">
          <Clock size={32} className="peer-spin" />
          <p>{status === 'creating' ? t('peer.creating', 'Creating room...') : t('peer.joining', 'Joining room...')}</p>
          <p className="peer-room-id">{roomId}</p>
          <button className="btn-secondary" onClick={leaveRoom} type="button">{t('peer.cancel', 'Cancel')}</button>
        </div>
      )}

      {(status === 'active' || status === 'waiting') && (
        <div className="peer-chat">
          <div className="peer-chat-header">
            <span className="peer-partner">{partnerName || 'Partner'}</span>
            <span className={`peer-badge ${status === 'active' ? 'active' : 'waiting'}`}>{status === 'active' ? t('peer.connected', 'Connected') : t('peer.waiting', 'Waiting...')}</span>
          </div>

          <div className="peer-messages">
            {messages.length === 0 && (
              <div className="peer-empty">{t('peer.no_messages', 'Send a message or start the interview!')}</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`peer-msg ${msg.role === 'me' ? 'mine' : 'theirs'}`}>
                <span className="peer-msg-role">{msg.role === 'interviewer' ? t('peer.interviewer', 'Interviewer') : t('peer.interviewee', 'You')}</span>
                <span className="peer-msg-text">{msg.text}</span>
                <span className="peer-msg-time">{msg.time}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="peer-input-area">
            <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder={t('peer.type_message', 'Type a message...')} rows={2} />
            <div className="peer-input-row-bottom">
              <button className="icon-btn" onClick={() => { /* mic toggle */ }} type="button"><Mic size={18} /></button>
              <button className="btn-primary" onClick={sendMessage} type="button">{t('peer.send', 'Send')}</button>
              <button className="icon-btn" onClick={leaveRoom} type="button"><PhoneOff size={18} /></button>
            </div>
          </div>
        </div>
      )}

      {status === 'ended' && (
        <div className="peer-ended">
          <h2>{t('peer.session_ended', 'Session Ended')}</h2>
          <p>{t('peer.ended_desc', 'The peer has left the session.')}</p>
          <button className="btn-primary" onClick={createRoom} type="button">{t('peer.new_session', 'Start New Session')}</button>
          <button className="btn-secondary" onClick={leaveRoom} type="button">{t('peer.back', 'Back')}</button>
        </div>
      )}

      {status === 'error' && (
        <div className="peer-error">
          <h2>{t('peer.error', 'Connection Error')}</h2>
          <p>{t('peer.error_desc', 'Unable to connect. Please try again.')}</p>
          <button className="btn-primary" onClick={() => setStatus('idle')} type="button">{t('peer.retry', 'Retry')}</button>
        </div>
      )}
    </div>
  );
}

export default PeerInterviewScreen;
