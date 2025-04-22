'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/Header.module.scss';
import ThemeToggle from './ThemeToggle';

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/logoWorkflow.png"
            alt="Workflow Logo"
            width={100}
            height={40}
          />
        </Link>

        <nav className={styles.nav}>
          <Link href="/login/">Login</Link>
          <Link href="/register">Cadastrar</Link>
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
