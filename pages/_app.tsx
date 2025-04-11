import '../styles/globals.scss';
import type { AppProps } from 'next/app';
import "bootstrap/dist/css/bootstrap.min.css";
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Header />
      <div style={{ paddingTop: '72px', paddingBottom: '64px' }}>
        <Component {...pageProps} />
      </div>
      <Footer />
    </>
  );
}

export default MyApp;