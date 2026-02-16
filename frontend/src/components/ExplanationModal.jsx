import React from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Loader2 } from 'lucide-react';
import './ExplanationModal.css';

const ExplanationModal = ({ isOpen, explanation, isLoading, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎓 Разбор полетов</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="loading-container">
              <Loader2 className="spinner" size={40} />
              <p>AI генерирует объяснение...</p>
            </div>
          ) : (
            <div className="explanation-content">
              <ReactMarkdown
                components={{
                  code: ({ node, inline, ...props }) => (
                    inline ? 
                      <code {...props} /> : 
                      <pre><code {...props} /></pre>
                  )
                }}
              >
                {explanation}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isLoading && (
          <div className="modal-footer">
            <button className="action-button" onClick={onClose}>
              Далее →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplanationModal;
