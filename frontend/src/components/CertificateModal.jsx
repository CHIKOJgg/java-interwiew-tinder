import React from 'react';
import { useTranslation } from 'react-i18next';
import { Award, X } from 'lucide-react';
import './CertificateModal.css';

const CertificateModal = ({ isOpen, onClose, certificate }) => {
  const { t } = useTranslation();

  if (!isOpen || !certificate) return null;

  return (
    <div className="cert-modal-overlay" onClick={onClose}>
      <div className="cert-modal" onClick={e => e.stopPropagation()}>
        <button className="cert-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="cert-content">
          <div className="cert-icon">
            <Award size={48} />
          </div>
          <h2>{t('certificate.congratulations', 'Congratulations!')}</h2>
          <p className="cert-title">{certificate.title}</p>
          <div className="cert-score">{certificate.score}%</div>
          <p className="cert-date">
            {t('certificate.issued', 'Issued')}: {new Date(certificate.issuedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateModal;
