'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminAccessState from './AdminAccessState';
import AdminShell from './AdminShell';
import { AdminApiError, listAdminScripts } from './adminScriptApi';
import { EditIcon, PlusIcon, RefreshIcon, SearchIcon } from './AdminIcons';
import styles from './Admin.module.css';

const STATUS_LABELS = {
  draft: '草稿',
  published: '已發布',
  unpublished: '已下架',
  archived: '已下架',
};

const SYNC_LABELS = {
  synced: '兩邊已同步',
  pending: '等待同步',
  syncing: '同步中',
  error: '同步失敗',
  partial: '部分同步',
  not_synced: '尚未同步',
};

function statusTone(status) {
  if (status === 'published') return styles.badgeSuccess;
  if (status === 'unpublished' || status === 'archived') return styles.badgeMuted;
  return styles.badgeDraft;
}

function syncTone(status) {
  if (status === 'synced') return styles.syncSuccess;
  if (status === 'error' || status === 'partial') return styles.syncError;
  if (status === 'syncing') return styles.syncWorking;
  return styles.syncPending;
}

function formatDate(value) {
  if (!value) return '尚無紀錄';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '尚無紀錄';
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AdminScriptsDashboard() {
  const [scripts, setScripts] = useState([]);
  const [access, setAccess] = useState('loading');
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [syncStatus, setSyncStatus] = useState('all');

  const loadScripts = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setAccess('loading');
    else setRefreshing(true);
    setMessage('');
    try {
      const rows = await listAdminScripts();
      setScripts(rows);
      setAccess('ready');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) setAccess('signedOut');
      else if (error instanceof AdminApiError && error.status === 403) setAccess('forbidden');
      else setAccess('error');
      setMessage(error?.message || '劇本清單載入失敗。');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('zh-Hant');
    return scripts.filter((script) => {
      const searchable = [script.name, script.slug, ...script.genres, ...script.customTags]
        .join(' ')
        .toLocaleLowerCase('zh-Hant');
      const statusMatch = status === 'all'
        || script.status === status
        || (status === 'unpublished' && script.status === 'archived');
      const syncMatch = syncStatus === 'all'
        || script.syncStatus === syncStatus
        || (syncStatus === 'attention' && ['error', 'partial', 'pending', 'not_synced'].includes(script.syncStatus));
      return (!needle || searchable.includes(needle)) && statusMatch && syncMatch;
    });
  }, [query, scripts, status, syncStatus]);

  const totals = useMemo(() => ({
    all: scripts.length,
    published: scripts.filter((script) => script.status === 'published').length,
    draft: scripts.filter((script) => script.status === 'draft').length,
    attention: scripts.filter((script) => ['error', 'partial', 'pending', 'not_synced'].includes(script.syncStatus)).length,
  }), [scripts]);

  if (access !== 'ready') {
    return (
      <div className={styles.adminRoot}>
        <main className={styles.accessPage}>
          <AdminAccessState state={access} message={message} onRetry={loadScripts} />
        </main>
      </div>
    );
  }

  return (
    <AdminShell>
      <section className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>SCRIPT CONTROL ROOM</p>
          <h1>劇本管理</h1>
          <p>新增、編輯與發布都在這裡完成；員工不需要進入 Notion 或 Supabase。</p>
        </div>
        <Link href="/admin/scripts/new" className={styles.primaryButton}>
          <PlusIcon />
          新增劇本
        </Link>
      </section>

      <section className={styles.summaryGrid} aria-label="劇本狀態摘要">
        <div className={styles.summaryCard}>
          <span>全部劇本</span>
          <strong>{totals.all}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>官網已發布</span>
          <strong>{totals.published}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>待完成草稿</span>
          <strong>{totals.draft}</strong>
        </div>
        <div className={`${styles.summaryCard} ${totals.attention ? styles.summaryCardWarning : ''}`}>
          <span>同步待處理</span>
          <strong>{totals.attention}</strong>
        </div>
      </section>

      <section className={styles.listPanel} aria-labelledby="script-list-title">
        <div className={styles.panelTitleRow}>
          <div>
            <h2 id="script-list-title">劇本清單</h2>
            <p aria-live="polite">顯示 {filtered.length} 筆，共 {scripts.length} 筆</p>
          </div>
          <button type="button" className={styles.iconTextButton} onClick={() => loadScripts({ quiet: true })} disabled={refreshing}>
            <RefreshIcon className={refreshing ? styles.rotating : ''} />
            {refreshing ? '更新中' : '重新整理'}
          </button>
        </div>

        <div className={styles.filterBar}>
          <label className={styles.searchBox}>
            <span className={styles.visuallyHidden}>搜尋劇本</span>
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋名稱、類型或標籤"
            />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="清除搜尋">清除</button>}
          </label>
          <label className={styles.selectFieldCompact}>
            <span>發布狀態</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">全部狀態</option>
              <option value="published">已發布</option>
              <option value="draft">草稿</option>
              <option value="unpublished">已下架</option>
            </select>
          </label>
          <label className={styles.selectFieldCompact}>
            <span>同步狀態</span>
            <select value={syncStatus} onChange={(event) => setSyncStatus(event.target.value)}>
              <option value="all">全部同步狀態</option>
              <option value="synced">兩邊已同步</option>
              <option value="attention">需要處理</option>
              <option value="syncing">同步中</option>
            </select>
          </label>
        </div>

        {filtered.length ? (
          <div className={styles.tableScroll}>
            <table className={styles.scriptTable}>
              <thead>
                <tr>
                  <th scope="col">劇本</th>
                  <th scope="col">發布狀態</th>
                  <th scope="col">同步狀態</th>
                  <th scope="col">最後修改</th>
                  <th scope="col"><span className={styles.visuallyHidden}>操作</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((script) => (
                  <tr key={script.id || script.slug || script.name}>
                    <td data-label="劇本">
                      <div className={styles.scriptIdentity}>
                        <div className={styles.coverThumb}>
                          {script.cover.url ? (
                            // Staff covers can use signed storage hosts; bypass Vercel image optimization quota.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={script.cover.url}
                              alt=""
                              style={{ objectPosition: `${script.cover.focalX}% ${script.cover.focalY}%` }}
                            />
                          ) : <span aria-hidden="true">BG</span>}
                        </div>
                        <div>
                          <strong>{script.name || '未命名草稿'}</strong>
                          <small>{script.slug || `草稿版本 v${script.draftVersion || 0}`}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="發布狀態">
                      <span className={`${styles.badge} ${statusTone(script.status)}`}>
                        {STATUS_LABELS[script.status] || script.status}
                      </span>
                    </td>
                    <td data-label="同步狀態">
                      <span className={`${styles.syncState} ${syncTone(script.syncStatus)}`}>
                        <span aria-hidden="true" />
                        {SYNC_LABELS[script.syncStatus] || '等待同步'}
                      </span>
                    </td>
                    <td data-label="最後修改">
                      <span className={styles.updatedAt}>{formatDate(script.updatedAt)}</span>
                    </td>
                    <td className={styles.actionCell}>
                      <Link href={`/admin/scripts/${encodeURIComponent(script.id)}`} className={styles.editButton} aria-label={`編輯 ${script.name || '未命名草稿'}`}>
                        <EditIcon />
                        編輯
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <SearchIcon />
            <h3>找不到符合條件的劇本</h3>
            <p>調整搜尋字詞或篩選條件，再試一次。</p>
            <button type="button" className={styles.secondaryButton} onClick={() => {
              setQuery('');
              setStatus('all');
              setSyncStatus('all');
            }}>清除篩選</button>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
