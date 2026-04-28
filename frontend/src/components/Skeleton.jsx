import React from 'react';
import './Skeleton.css';

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-badge shimmer" />
      <div className="skeleton-title shimmer" />
      <div className="skeleton-line shimmer" />
      <div className="skeleton-line short shimmer" />
      <div className="skeleton-line shimmer" />
      <div className="skeleton-actions">
        <div className="skeleton-btn shimmer" />
        <div className="skeleton-btn shimmer" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3, width }) {
  return (
    <div className="skeleton-text-block">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton-line shimmer ${i === lines - 1 ? 'short' : ''}`} style={width ? { width } : {}} />
      ))}
    </div>
  );
}

export function SkeletonExplanation() {
  return (
    <div className="skeleton-explanation">
      <div className="skeleton-title shimmer" />
      <div className="skeleton-line shimmer" />
      <div className="skeleton-line shimmer" />
      <div className="skeleton-line short shimmer" />
      <div className="skeleton-line shimmer" />
      <div className="skeleton-line short shimmer" />
    </div>
  );
}
