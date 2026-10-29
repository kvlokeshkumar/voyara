import React from 'react';

export const Loading = ({ text = 'Loading...' }) => (
  <div className="v-status" role="status" aria-live="polite">
    <div className="v-spinner" aria-hidden="true" />
    <p>{text}</p>
  </div>
);

export const ErrorBox = ({ error, onRetry }) => (
  <div className="v-status v-status-error" role="alert">
    <p>{typeof error === 'string' ? error : error?.message || 'Something went wrong.'}</p>
    {onRetry && (
      <button type="button" className="v-retry" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);

export const Notice = ({ children, kind = 'info' }) =>
  children ? (
    <p className={`v-notice v-notice-${kind}`} role="status">
      {children}
    </p>
  ) : null;
