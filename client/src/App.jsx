import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './socket/SocketContext';
import { Navbar } from './components/ui/Navbar';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import AppRoutes from './routes';
import { setQueryClient } from './api/axios';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

// Allow axios interceptor to clear query cache on 401
setQueryClient(queryClient);

export const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <BrowserRouter>
                <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
                  <Navbar />
                  <main className="flex-1">
                    <AppRoutes />
                  </main>
                  <Toaster
                    position="bottom-right"
                    toastOptions={{
                      duration: 3500,
                      style: {
                        borderRadius: '16px',
                        background: '#1e293b',
                        color: '#f8fafc',
                        fontSize: '13px',
                        fontWeight: '500',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                      },
                      success: {
                        iconTheme: {
                          primary: '#10b981',
                          secondary: '#ffffff',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: '#ef4444',
                          secondary: '#ffffff',
                        },
                      },
                    }}
                  />
                </div>
              </BrowserRouter>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
