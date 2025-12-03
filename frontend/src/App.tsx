// @ts-nocheck
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './router';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import { ToastProvider } from './contexts/ToastContext';
import { Toast } from './components/Toast';
import { ChatProvider } from './contexts/ChatContext';
import { ChatWidget } from './components/Chat';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ChatProvider>
          <ScrollToTop />
          <AppRouter />
          <Toast />
          <ChatWidget />
        </ChatProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
