'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowserConnection } from '@/lib/supabase/browser';
import styles from './Admin.module.css';

export default function AdminShell({ children, compact = false }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const connection = getSupabaseBrowserConnection();
    if (connection.status === 'ready') await connection.client.auth.signOut();
    router.replace('/admin/scripts');
    router.refresh();
  }

  return (
    <div className={styles.adminRoot}>
      <a href="#admin-main" className={styles.skipLink}>跳到主要內容</a>
      <header className={styles.adminHeader}>
        <div className={styles.headerInner}>
          <Link href="/admin/scripts" className={styles.brand} aria-label="BGLARP 劇本後台首頁">
            <span className={styles.brandMark} aria-hidden="true">BG</span>
            <span>
              <strong>BGLARP</strong>
              <small>劇本上架後台</small>
            </span>
          </Link>
          <div className={styles.headerActions}>
            <a href="/" target="_blank" rel="noopener noreferrer" className={styles.headerLink}>
              查看官網
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M7 4h9v9M16 4 8 12M14 11v5H4V6h5" />
              </svg>
            </a>
            <button type="button" className={styles.signOutButton} onClick={signOut} disabled={signingOut}>
              {signingOut ? '登出中…' : '登出'}
            </button>
          </div>
        </div>
      </header>
      <main id="admin-main" className={`${styles.adminMain} ${compact ? styles.adminMainCompact : ''}`}>
        {children}
      </main>
      <footer className={styles.adminFooter}>
        <span>只在確認內容後發布；每次發布都會留下版本紀錄。</span>
      </footer>
    </div>
  );
}
