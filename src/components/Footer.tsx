import React from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Footer.module.scss';
import { useAuth } from '@/src/hooks/useAuth';

const Footer = () => {
  const router = useRouter();
  const { authenticated } = useAuth();

  // A landing (deslogada), padrão da plataforma ou de uma agência (/p/:id), monta o
  // próprio rodapé completo — evita duplicar rodapé aqui.
  const onLandingRoot = router.pathname === '/' || router.pathname === '/p/[id]';
  if (onLandingRoot && !authenticated) return null;

  return (
    <footer className={styles.footer}>
      <p>&copy; {new Date().getFullYear()} WorkFlow. Todos os direitos reservados.</p>
    </footer>
  );
};

export default Footer;
