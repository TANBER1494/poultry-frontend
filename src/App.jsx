import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; 
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';
import SplashScreen from '../src/components/layout/SplashScreen';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider> 
        <BrowserRouter>
          <Toaster 
            position="top-center" 
            toastOptions={{
              duration: 4000,
              style: { fontFamily: 'inherit', fontSize: '1rem' }
            }} 
          />
          {/* تغليف المسارات بالـ SplashScreen لتعمل بسلاسة */}
          <SplashScreen>
            <AppRoutes />
          </SplashScreen>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;