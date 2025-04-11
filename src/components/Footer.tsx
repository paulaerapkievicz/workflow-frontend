import React from 'react';
import styles from '@/styles/Footer.module.scss';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <p>&copy; {new Date().getFullYear()} WorkFlow. Todos os direitos reservados.</p>
    </footer>
  );
};

export default Footer;
