/**
 * UserLayout (Customer Layout)
 * Layout cho khách hàng - tương đương MainLayout cũ
 */

import React from 'react';
import { Header, Footer } from '../../components';
import './UserLayout.scss';

interface UserLayoutProps {
  children: React.ReactNode;
}

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  return (
    <div className="user-layout">
      <Header />
      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserLayout;
















