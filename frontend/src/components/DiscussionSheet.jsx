import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import { useTranslation } from 'react-i18next';
import { MessageSquare, ChevronUp, ArrowUp, ArrowDown, Reply, CheckCircle, Send, X, Code2, Loader2 } from 'lucide-react';
import './DiscussionSheet.css';

const DiscussionThread = ({ disc, questionId, onVote, onReply, onMarkSolution, isOwner, currentUserId }) => {
  const { t } = useTranslation();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyCode, setReplyCode] = useState('');
  const [posting, setPosting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      await onReply(disc.id, replyText, replyCode);
      setReplyText('');
      setReplyCode('');
      setShowReply(false);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={`disc-thread ${disc.is_solution ? 'is-solution' : ''}`}>
      <div className="disc-thread-main">
        <div className="disc-vote-col">
          <button className={`disc-vote-btn ${disc.user_vote === 1 ? 'voted' : ''}`}
            onClick={() => onVote(disc.id, 1)} type="button" aria-label={t('discussions.upvote')}>
            <ArrowUp size={16} />
          </button>
          <span className="disc-vote-count">{disc.upvotes || 0}</span>
          <button className={`disc-vote-btn ${disc.user_vote === -1 ? 'voted-down' : ''}`}
            onClick={() => onVote(disc.id, -1)} type="button" aria-label={t('discussions.downvote')}>
            <ArrowDown size={16} />
          </button>
        </div>
        <div className="disc-body">
          <div className="disc-meta">
            <span className="disc-author">{disc.first_name || disc.username || 'Anonymous'}</span>
            {disc.is_solution && <span className="disc-solution-badge"><CheckCircle size={12} /> {t('discussions.solution')}</span>}
            {isOwner && !disc.is_solution && (
              <button className="disc-mark-solution" onClick={() => onMarkSolution(disc.id)} type="button">
                <CheckCircle size={12} /> {t('discussions.mark_solution')}
              </button>
            )}
          </div>
          <div className="disc-content">{disc.content}</div>
          {disc.code_snippet && (
            <pre className="disc-code"><code>{disc.code_snippet}</code></pre>
          )}
          <div className="disc-actions">
            <button className="disc-reply-btn" onClick={() => setShowReply(!showReply)} type="button">
              <Reply size={12} /> {t('discussions.reply')} {disc.reply_count > 0 && `(${disc.reply_count})`}
            </button>
          </div>

          {showReply && (
            <div className="disc-reply-form">
              <textarea
                className="disc-textarea"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={t('discussions.placeholder')}
                rows={3}
              />
              <input
                className="disc-code-input"
                value={replyCode}
                onChange={e => setReplyCode(e.target.value)}
                placeholder={t('discussions.code_placeholder')}
              />
              <div className="disc-reply-actions">
                <button className="disc-cancel-btn" onClick={() => setShowReply(false)} type="button">{t('discussions.cancel')}</button>
                <button className="disc-post-btn" onClick={handleReply} disabled={!replyText.trim() || posting} type="button">
                  {posting ? <Loader2 size={14} className="spinner" /> : <Send size={14} />} {t('discussions.reply')}
                </button>
              </div>
            </div>
          )}

          {disc.replies?.map(reply => (
            <div key={reply.id} className="disc-reply">
              <div className="disc-vote-col mini">
                <button className={`disc-vote-btn ${reply.user_vote === 1 ? 'voted' : ''}`}
                  onClick={() => onVote(reply.id, 1)} type="button">
                  <ArrowUp size={12} />
                </button>
                <span className="disc-vote-count mini">{reply.upvotes || 0}</span>
                <button className={`disc-vote-btn ${reply.user_vote === -1 ? 'voted-down' : ''}`}
                  onClick={() => onVote(reply.id, -1)} type="button">
                  <ArrowDown size={12} />
                </button>
              </div>
              <div className="disc-body">
                <div className="disc-meta">
                  <span className="disc-author">{reply.first_name || reply.username || 'Anonymous'}</span>
                </div>
                <div className="disc-content">{reply.content}</div>
                {reply.code_snippet && (
                  <pre className="disc-code"><code>{reply.code_snippet}</code></pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DiscussionSheet = ({ questionId, onClose, isOwner }) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useStore();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [newCode, setNewCode] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getDiscussions(questionId);
      setDiscussions(res.discussions || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [questionId]);

  useEffect(() => { load(); }, [load]);

  const handleVote = async (discussionId, vote) => {
    if (!isAuthenticated) return;
    try {
      await apiClient.voteDiscussion(discussionId, vote);
      await load();
    } catch { /* ignore */ }
  };

  const handleReply = async (parentId, content, codeSnippet) => {
    if (!isAuthenticated) return;
    try {
      await apiClient.createDiscussion(questionId, content, codeSnippet, parentId);
      await load();
    } catch { /* ignore */ }
  };

  const handleNewPost = async () => {
    if (!newText.trim() || !isAuthenticated) return;
    setPosting(true);
    try {
      await apiClient.createDiscussion(questionId, newText, newCode || undefined);
      setNewText('');
      setNewCode('');
      await load();
    } finally {
      setPosting(false);
    }
  };

  const handleMarkSolution = async (discussionId) => {
    try {
      await apiClient.markSolution(discussionId);
      await load();
    } catch { /* ignore */ }
  };

  return (
    <div className="disc-overlay" onClick={onClose}>
      <div className="disc-sheet" onClick={e => e.stopPropagation()}>
        <div className="disc-header">
          <div className="disc-header-left">
            <MessageSquare size={18} />
            <h3>{t('discussions.title')}</h3>
          </div>
          <button className="disc-close-btn" onClick={onClose} type="button"><X size={18} /></button>
        </div>

        <div className="disc-body-scroll">
          {loading ? (
            <div className="disc-loading"><Loader2 size={24} className="spinner" /></div>
          ) : discussions.length === 0 ? (
            <div className="disc-empty">
              <MessageSquare size={40} opacity={0.2} />
              <p>{t('discussions.empty')}</p>
            </div>
          ) : (
            discussions.map(disc => (
              <DiscussionThread
                key={disc.id}
                disc={disc}
                questionId={questionId}
                onVote={handleVote}
                onReply={handleReply}
                onMarkSolution={handleMarkSolution}
                isOwner={isOwner}
                currentUserId={user?.telegram_id}
              />
            ))
          )}
        </div>

        {isAuthenticated ? (
          <div className="disc-new-post">
            <textarea
              className="disc-textarea"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder={t('discussions.placeholder')}
              rows={3}
            />
            <input
              className="disc-code-input"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              placeholder={t('discussions.code_placeholder')}
            />
            <button className="disc-post-btn primary" onClick={handleNewPost} disabled={!newText.trim() || posting} type="button">
              {posting ? <Loader2 size={14} className="spinner" /> : <Send size={14} />} {t('discussions.post')}
            </button>
          </div>
        ) : (
          <div className="disc-login-note">{t('discussions.login_to_comment')}</div>
        )}
      </div>
    </div>
  );
};

export default DiscussionSheet;
