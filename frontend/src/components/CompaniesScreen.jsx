import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import './CompaniesScreen.css';

function CompaniesScreen({ onBack }) {
  const { t } = useTranslation();
  const { setSelectedCompany, selectedCompany } = useStore();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getCompanies().then((data) => {
      setCompanies(data.companies || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCompanySelect = (name) => {
    setSelectedCompany(name);
    onBack();
  };

  return (
    <div className="companies-screen">
      <div className="companies-header">
        <button className="back-btn" onClick={onBack} type="button" aria-label={t('common.back', 'Back')}>
          ←
        </button>
        <h1>{t('header.companies', 'Companies')}</h1>
      </div>

      {loading ? (
        <div className="companies-loading">{t('common.loading')}</div>
      ) : (
        <div className="companies-list">
          <button
            className={`company-chip ${!selectedCompany ? 'selected' : ''}`}
            onClick={() => handleCompanySelect(null)}
            type="button"
          >
            {t('companies.all', 'Все компании')}
          </button>
          {companies.map((company) => {
            const companyName = typeof company === 'string' ? company : company?.name || 'Unknown';
            const count = typeof company === 'object' && company?.question_count !== undefined ? company.question_count : null;
            const isSelected = selectedCompany === companyName;
            return (
              <button
                key={companyName}
                className={`company-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => handleCompanySelect(companyName)}
                type="button"
              >
                <span className="company-name">{companyName}</span>
                {count !== null && count > 0 && (
                  <span className="company-count">{count}</span>
                )}
              </button>
            );
          })}
          {companies.length === 0 && (
            <div className="companies-empty">{t('companies.no_companies')}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompaniesScreen;