import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { Flag, X, CheckCircle } from 'lucide-react';
import './ReportSheet.css';



export default function ReportSheet({ questionId, onClose }) {
  const { t } = useTranslation();
  const { reportQuestion } = useStore();
  
  const REASONS = [
    t('report.reason_wrong', 'Wrong answer'),
    t('report.reason_outdated', 'Outdated'),
    t('report.reason_unclear', 'Unclear question'),
    t('report.reason_other', 'Other')
  ];
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
          <h3>{t('report.title', 'Report Question')}</h3>
          <button className="close-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="report-success">
            <CheckCircle size={40} color="#40c057" />
            <p>{t('report.success_title', 'Report submitted successfully.')}<br/>{t('report.success_desc', 'Thanks for improving our content!')}</p>
          </div>
        ) : (
          <div className="report-body">
            <label className="report-label">{t('report.reason_label', 'Reason')}</label>
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

            <label className="report-label">{t('report.comment_label', 'Comment (optional)')}</label>
            <textarea 
              className="report-comment"
              placeholder={t('report.comment_placeholder', 'Provide more details...')}
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
            />

            <button 
              className="report-submit-btn" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.submitting', 'Submitting...') : t('report.submit', 'Submit Report')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
