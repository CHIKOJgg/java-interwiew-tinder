import React, { useState } from 'react';
import useStore from '../store/useStore';
import { Flag, X, CheckCircle } from 'lucide-react';
import './ReportSheet.css';

const REASONS = [
  'Wrong answer',
  'Outdated',
  'Unclear question',
  'Other'
];

export default function ReportSheet({ questionId, onClose }) {
  const { reportQuestion } = useStore();
  const [reason, setReason] = useState(REASONS[0]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!questionId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await reportQuestion(questionId, reason, comment);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="report-overlay" onClick={onClose} />
      <div className="report-sheet">
        <div className="report-header">
          <Flag size={20} color="#fa5252" />
          <h3>Report Question</h3>
          <button className="close-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="report-success">
            <CheckCircle size={40} color="#40c057" />
            <p>Report submitted successfully.<br/>Thanks for improving our content!</p>
          </div>
        ) : (
          <div className="report-body">
            <label className="report-label">Reason</label>
            <div className="reason-options">
              {REASONS.map(r => (
                <label key={r} className={`reason-radio ${reason === r ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="reportReason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  {r}
                </label>
              ))}
            </div>

            <label className="report-label">Comment (optional)</label>
            <textarea 
              className="report-comment"
              placeholder="Provide more details..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
            />

            <button 
              className="report-submit-btn" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
