import '../styles/globals.scss';
import '../styles/ThemeToggle.scss';
import type { AppProps } from 'next/app';
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <div style={{ flex: 1, paddingTop: '64px', display: 'flex', flexDirection: 'column' }}>
        <Component {...pageProps} />
      </div>
      <Footer />
    </div>
  );
}

export default MyApp;
