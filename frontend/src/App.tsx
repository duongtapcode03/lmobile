// @ts-nocheck
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout, AuthLayout } from './layouts';
import { HomePage, LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Main routes with MainLayout */}
        <Route
          path="/"
          element={
            <MainLayout>
              <HomePage />
            </MainLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
