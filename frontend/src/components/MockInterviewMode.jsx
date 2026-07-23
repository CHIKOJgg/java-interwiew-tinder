import React, { useState, useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { User, MessageSquare, Send, Loader2, Star, ChevronRight, Mic, MicOff } from 'lucide-react';
import './MockInterviewMode.css';

const MockInterviewMode = () => {
  const { t, i18n } = useTranslation();
  const {
    interviewHistory,
    isEvaluatingInterview,
    submitInterviewAnswer,
    nextInterviewQuestion,
    isLoadingQuestions,
    startInterview
  } = useStore();

  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [interviewHistory, isEvaluatingInterview]);

  useEffect(() => {
    if (interviewHistory.length === 0 && !isLoadingQuestions) {
      startInterview();
    }
  }, [interviewHistory.length, isLoadingQuestions, startInterview]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t('interview.voice_not_supported', 'Voice input is not supported in your browser'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map(r => r[0].transcript)
        .join(' ');
      setTranscript(text);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (transcript.trim()) {
        setAnswer(prev => prev ? `${prev} ${transcript}` : transcript);
        setTranscript('');
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, transcript, i18n.language, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const textToSend = isRecording ? transcript : answer;
    if (!textToSend.trim() || isEvaluatingInterview) return;

    const currentQuestion = interviewHistory[interviewHistory.length - 1]?.content;
    setAnswer('');
    setTranscript('');

    await submitInterviewAnswer(currentQuestion, textToSend);
  };

  const lastMessage = interviewHistory[interviewHistory.length - 1];
  const canAnswer = lastMessage?.role === 'interviewer';

  return (
    <div className="mock-interview-mode">
      <div className="interview-chat">
        {interviewHistory.map((msg, index) => (
          <div key={index} className={`message-group ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'interviewer' ? <MessageSquare size={18} /> : <User size={18} />}
            </div>
            <div className="message-bubble">
              <div className="message-content">{msg.content}</div>

              {msg.evaluation && (
                <div className="evaluation-card">
                  <div className="evaluation-header">
                    <div className="score-badge">
                      <Star size={14} fill="currentColor" />
                      <span>{msg.evaluation.score}/10</span>
                    </div>
                    <span className="evaluation-label">{t('interview.evaluation')}</span>
                  </div>
                  <div className="evaluation-feedback">{msg.evaluation.feedback}</div>
                  <div className="correct-version">
                    <strong>{t('interview.recommendation')}</strong>
                    <p>{msg.evaluation.correctVersion}</p>
                  </div>
                  {index === interviewHistory.length - 1 && (
                    <button className="next-question-btn" onClick={nextInterviewQuestion}>
                      <span>{t('interview.next')}</span>
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isEvaluatingInterview && (
          <div className="message-group interviewer">
            <div className="message-avatar">
              <MessageSquare size={18} />
            </div>
            <div className="message-bubble loading">
              <Loader2 className="spinner" size={18} />
              <span>{t('interview.analyzing')}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="voice-controls">
        <button
          className={`voice-btn ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
          disabled={!canAnswer || isEvaluatingInterview}
          type="button"
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-pulse" />
            <span className="recording-text">{t('interview.speaking', 'Speak...')}</span>
          </div>
        )}
      </div>

      <form className="interview-input-area" onSubmit={handleSubmit}>
        <textarea
          placeholder={canAnswer ? t('interview.placeholder_answer') : t('interview.placeholder_wait')}
          value={isRecording ? transcript : answer}
          onChange={(e) => !isRecording && setAnswer(e.target.value)}
          disabled={!canAnswer || isEvaluatingInterview}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!canAnswer || !(isRecording ? transcript : answer).trim() || isEvaluatingInterview}
        >
          {isEvaluatingInterview ? <Loader2 className="spinner" size={20} /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
};

export default MockInterviewMode;
