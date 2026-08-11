'use client';

import { useState } from 'react';
import { getSupabaseBrowserConnection } from '@/lib/supabase/browser';
import { LockIcon, RefreshIcon, WarningIcon } from './AdminIcons';
import styles from './Admin.module.css';

const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

export default function AdminAccessState({ state, message, onRetry }) {
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function signIn(event) {
    event.preventDefault();
    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedUsername) {
      setSignInError('請輸入帳號。');
      return;
    }
    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setSignInError('帳號只能使用英文小寫、數字、句點、底線或連字號。');
      return;
    }
    if (!password) {
      setSignInError('請輸入密碼。');
      return;
    }

    setSigningIn(true);
    setSignInError('');
    const connection = getSupabaseBrowserConnection();
    if (connection.status !== 'ready') {
      setSignInError('登入服務尚未完成設定，請聯絡管理者。');
      setSigningIn(false);
      return;
    }

    try {
      const { error } = await connection.client.auth.signInWithPassword({
        email: `${normalizedUsername}@auth.bglarp.com`,
        password,
      });
      if (error) {
        setSignInError('帳號或密碼不正確，請再試一次。');
        return;
      }

      setPassword('');
      if (onRetry) await onRetry();
      else window.location.reload();
    } catch {
      setSignInError('登入服務暫時連不上，請稍後再試。');
    } finally {
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
  const showLogin = signedOut || forbidden;

  return (
    <div className={styles.accessCard} role="alert">
      <div className={`${styles.accessIcon} ${forbidden ? styles.accessIconDanger : ''}`}>
        {signedOut ? <LockIcon /> : <WarningIcon />}
      </div>
      <p className={styles.eyebrow}>{signedOut ? 'STAFF SIGN IN' : 'ACCESS CHECK'}</p>
      <h1>{signedOut ? '登入後才能管理劇本' : forbidden ? '這個帳號沒有後台權限' : '後台暫時連不上'}</h1>
      <p>{message || (signedOut
        ? '請輸入共用的員工帳號與密碼。'
        : forbidden
          ? '請改用共用的員工帳號與密碼登入。'
          : '資料沒有遺失。請檢查網路後再重新連線。')}</p>
      {showLogin && (
        <form className={styles.accessLoginForm} onSubmit={signIn} noValidate>
          <label className={styles.accessLoginField}>
            <span>帳號</span>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value.toLowerCase());
                setSignInError('');
              }}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="text"
              placeholder="輸入員工帳號"
              aria-invalid={Boolean(signInError)}
              disabled={signingIn}
            />
          </label>
          <label className={styles.accessLoginField}>
            <span>密碼</span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setSignInError('');
              }}
              autoComplete="current-password"
              placeholder="輸入密碼"
              aria-invalid={Boolean(signInError)}
              disabled={signingIn}
            />
          </label>
          {signInError && <p className={styles.inlineError} role="alert">{signInError}</p>}
          <button type="submit" className={styles.primaryButton} disabled={signingIn}>
            {signingIn ? <span className={styles.spinnerSmall} aria-hidden="true" /> : <LockIcon />}
            {signingIn ? '正在登入…' : '登入後台'}
          </button>
        </form>
      )}
      {onRetry && (
        <div className={styles.accessActions}>
          <button type="button" className={styles.secondaryButton} onClick={onRetry}>
            <RefreshIcon />
            重新連線
          </button>
        </div>
      )}
    </div>
  );
}
