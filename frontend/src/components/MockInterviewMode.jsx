import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { User, MessageSquare, Send, Loader2, Star, ChevronRight } from 'lucide-react';
import './MockInterviewMode.css';

const MockInterviewMode = () => {
  const {
    interviewHistory,
    isEvaluatingInterview,
    submitInterviewAnswer,
    nextInterviewQuestion,
    isLoadingQuestions
  } = useStore();

  const [answer, setAnswer] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [interviewHistory, isEvaluatingInterview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim() || isEvaluatingInterview) return;

    const currentQuestion = interviewHistory[interviewHistory.length - 1]?.content;
    const currentAnswer = answer;
    setAnswer('');

    await submitInterviewAnswer(currentQuestion, currentAnswer);
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
                    <span className="evaluation-label">Оценка ответа</span>
                  </div>
                  <div className="evaluation-feedback">{msg.evaluation.feedback}</div>
                  <div className="correct-version">
                    <strong>Рекомендация:</strong>
                    <p>{msg.evaluation.correctVersion}</p>
                  </div>
                  {index === interviewHistory.length - 1 && (
                    <button className="next-question-btn" onClick={nextInterviewQuestion}>
                      <span>Следующий вопрос</span>
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
              <span>Интервьюер анализирует ваш ответ...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="interview-input-area" onSubmit={handleSubmit}>
        <textarea
          placeholder={canAnswer ? "Ваш технический ответ..." : "Нажмите 'Следующий вопрос'"}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
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
          disabled={!canAnswer || !answer.trim() || isEvaluatingInterview}
        >
          {isEvaluatingInterview ? <Loader2 className="spinner" size={20} /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
};

export default MockInterviewMode;
