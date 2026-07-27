import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import './CompaniesScreen.css';

function CompaniesScreen({ onBack }) {
  const { t } = useTranslation();
  const { setSelectedCompany } = useStore();
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
        <button className="back-btn" onClick={onBack} type="button">
          ← {t('common.back')}
        </button>
        <h1>{t('header.companies', 'Companies')}</h1>
      </div>

      {loading ? (
        <div className="companies-loading">{t('common.loading')}</div>
      ) : (
        <div className="companies-list">
          {companies.map((name) => (
            <button
              key={name}
              className="company-chip"
              onClick={() => handleCompanySelect(name)}
              type="button"
            >
              {name}
            </button>
          ))}
          {companies.length === 0 && (
            <div className="companies-empty">{t('companies.no_companies')}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompaniesScreen;