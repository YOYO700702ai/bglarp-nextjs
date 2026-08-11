'use client';

import { useState } from 'react';
import { getSupabaseBrowserConnection } from '@/lib/supabase/browser';
import { LockIcon, RefreshIcon, WarningIcon } from './AdminIcons';
import styles from './Admin.module.css';

export default function AdminAccessState({ state, message, onRetry }) {
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  async function signIn() {
    setSigningIn(true);
    setSignInError('');
    const connection = getSupabaseBrowserConnection();
    if (connection.status !== 'ready') {
      setSignInError('登入服務尚未完成設定，請聯絡管理者。');
      setSigningIn(false);
      return;
    }

    const next = window.location.pathname + window.location.search;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await connection.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setSignInError('登入沒有完成，請稍後再試。');
      setSigningIn(false);
    }
  }

  if (state === 'loading') {
    return (
      <div className={styles.accessCard} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <h1>正在確認員工權限</h1>
        <p>請稍候，我們正在安全地開啟劇本後台。</p>
      </div>
    );
  }

  const signedOut = state === 'signedOut';
  const forbidden = state === 'forbidden';

  return (
    <div className={styles.accessCard} role="alert">
      <div className={`${styles.accessIcon} ${forbidden ? styles.accessIconDanger : ''}`}>
        {signedOut ? <LockIcon /> : <WarningIcon />}
      </div>
      <p className={styles.eyebrow}>{signedOut ? 'STAFF SIGN IN' : 'ACCESS CHECK'}</p>
      <h1>{signedOut ? '登入後才能管理劇本' : forbidden ? '這個帳號沒有後台權限' : '後台暫時連不上'}</h1>
      <p>{message || (signedOut
        ? '請使用已登記的員工 Google 帳號登入。'
        : forbidden
          ? '如果你是新加入的員工，請請管理者將你的帳號加入允許名單。'
          : '資料沒有遺失。請檢查網路後再重新連線。')}</p>
      {signInError && <p className={styles.inlineError}>{signInError}</p>}
      <div className={styles.accessActions}>
        {signedOut && (
          <button type="button" className={styles.primaryButton} onClick={signIn} disabled={signingIn}>
            {signingIn ? <span className={styles.spinnerSmall} aria-hidden="true" /> : <LockIcon />}
            {signingIn ? '正在前往登入…' : '使用 Google 登入'}
          </button>
        )}
        {!forbidden && onRetry && (
          <button type="button" className={styles.secondaryButton} onClick={onRetry}>
            <RefreshIcon />
            重新連線
          </button>
        )}
      </div>
    </div>
  );
}
