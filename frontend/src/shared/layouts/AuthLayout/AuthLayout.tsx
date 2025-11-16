// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import './AuthLayout.scss';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-content">
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              <h1>LMobile</h1>
            </Link>
            <h2 className="auth-title">{title}</h2>
            <p className="auth-subtitle">{subtitle}</p>
          </div>
          
          <div className="auth-form-wrapper">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;








