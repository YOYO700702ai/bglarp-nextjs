'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getSupabaseBrowserConnection } from '@/lib/supabase/browser';
import styles from './Admin.module.css';

const SIGN_OUT_TIMEOUT_MS = 10_000;

async function signOutCurrentSession(client) {
  let timeoutId;

  try {
    return await Promise.race([
      client.auth.signOut({ scope: 'local' }),
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('sign_out_timeout')), SIGN_OUT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function AdminShell({ children, compact = false }) {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  async function signOut() {
    if (signingOut) return;

    setSigningOut(true);
    setSignOutFailed(false);

    try {
      const connection = getSupabaseBrowserConnection();
      if (connection.status !== 'ready') throw new Error('auth_not_configured');

      const { error } = await signOutCurrentSession(connection.client);
      if (error) throw error;

      window.location.replace('/admin/scripts');
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
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
            <button
              type="button"
              className={styles.signOutButton}
              onClick={signOut}
              disabled={signingOut}
              aria-live="polite"
            >
              {signingOut ? '登出中…' : signOutFailed ? '登出失敗，重試' : '登出'}
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
