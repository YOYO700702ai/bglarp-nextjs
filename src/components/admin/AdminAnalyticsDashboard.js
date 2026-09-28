'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEVICE_LABELS, SOURCE_LABELS, pageLabel, targetLabel } from '@/lib/analytics/contract.mjs';
import AdminAccessState from './AdminAccessState';
import AdminShell from './AdminShell';
import { AdminApiError, adminRequest } from './adminScriptApi';
import { RefreshIcon } from './AdminIcons';
import adminStyles from './Admin.module.css';
import styles from './Analytics.module.css';

const RANGES = [[1, '今天'], [7, '近 7 天'], [30, '近 30 天'], [90, '近 90 天']];
const NUMBER_FORMAT = new Intl.NumberFormat('zh-TW');

function number(value) {
  return Number.isFinite(value) ? NUMBER_FORMAT.format(value) : '—';
}

function dateLabel(value, { short = false, time = false } = {}) {
  if (!value) return '—';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+08:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    ...(time ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
      : { ...(short ? {} : { year: 'numeric' }), month: 'numeric', day: 'numeric' }),
  }).format(date);
}

function ReportControls({ days, onDaysChange, onRefresh, refreshing, loading }) {
  return (
    <div className={styles.controls}>
      <div className={styles.ranges} role="group" aria-label="統計日期範圍">
        {RANGES.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={days === value} onClick={() => onDaysChange?.(value)}>{label}</button>
        ))}
      </div>
      <button type="button" className={styles.refresh} onClick={onRefresh} disabled={refreshing || loading}>
        <RefreshIcon className={refreshing ? adminStyles.rotating : ''} />
        {refreshing ? '更新中…' : '重新整理'}
      </button>
    </div>
  );
}

function DailyChart({ rows }) {
  const width = Math.max(560, rows.length * 18 + 70);
  const height = 240;
  const left = 52;
  const right = 18;
  const top = 24;
  const bottom = 37;
  const plotHeight = height - top - bottom;
  const step = (width - left - right) / Math.max(rows.length, 1);
  const maximum = Math.max(1, ...rows.filter((row) => !row.unavailable).flatMap((row) => [row.views, row.visitors]));
  const scale = maximum <= 4 ? 4 : Math.ceil(maximum / 4) * 4;
  const barWidth = Math.min(18, step * 0.32);
  const labelEvery = Math.max(1, Math.ceil(rows.length / 8));

  return (
    <>
      <div className={styles.chartLegend} aria-label="圖表圖例">
        <span><i className={styles.viewKey} />瀏覽次數</span>
        <span><i className={styles.visitorKey} />每日訪客估計</span>
        {rows.some((row) => row.unavailable) && <span><i className={styles.unavailableKey} />尚未統計</span>}
      </div>
      <div className={styles.chartScroll} tabIndex={0} role="region" aria-label="每日瀏覽與訪客趨勢圖，可左右捲動；完整數字見下方每日明細">
        <svg className={styles.chart} width={width} height={height} style={{ minWidth: width }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="深藍色為每日瀏覽次數，金色為每日訪客估計；灰色區域尚未開始統計，並非零次">
          <defs>
            <pattern id="analytics-unavailable" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#f3f5f7" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#dce2e9" strokeWidth="2" />
            </pattern>
          </defs>
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = top + plotHeight - plotHeight * tick / 4;
            return <g key={tick}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e5e9ef" />
              <text x={left - 10} y={y + 4} textAnchor="end" fill="#657083" fontSize="11">{number(scale * tick / 4)}</text>
            </g>;
          })}
          {rows.map((row, index) => {
            const x = left + step * (index + 0.5);
            const unavailable = row.unavailable;
            return <g key={row.date}>
              <title>{dateLabel(row.date)}：{unavailable ? '尚未統計' : `瀏覽 ${number(row.views)} 次，訪客估計 ${number(row.visitors)}`}</title>
              {unavailable ? <rect x={left + step * index} y={top} width={step} height={plotHeight} fill="url(#analytics-unavailable)" /> : <>
                <rect x={x - barWidth - 1} y={top + plotHeight * (1 - row.views / scale)} width={barWidth} height={plotHeight * row.views / scale} rx="2" fill="#203550" />
                <rect x={x + 1} y={top + plotHeight * (1 - row.visitors / scale)} width={barWidth} height={plotHeight * row.visitors / scale} rx="2" fill="#b8822c" />
              </>}
              {(index % labelEvery === 0 || index === rows.length - 1) && <text x={x} y={height - 12} textAnchor="middle" fill="#657083" fontSize="11">{dateLabel(row.date, { short: true })}</text>}
            </g>;
          })}
        </svg>
      </div>
      <p className={styles.chartHint}>圖表可左右滑動；每天的實際數字可在下方明細查看。</p>
      <details className={styles.dailyDetails}>
        <summary>每日明細 <span>{rows.length} 天</span></summary>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="每日統計明細，可捲動">
          <table className={styles.dailyTable}>
            <thead><tr><th scope="col">日期（台北）</th><th scope="col">瀏覽</th><th scope="col">訪客估計</th><th scope="col">按鈕點擊</th></tr></thead>
            <tbody>{[...rows].reverse().map((row) => (
              <tr key={row.date} className={row.unavailable ? styles.unavailableRow : undefined}>
                <th scope="row">{dateLabel(row.date)}{row.unavailable && <small>尚未統計</small>}</th>
                <td>{row.unavailable ? '—' : number(row.views)}</td>
                <td>{row.unavailable ? '—' : number(row.visitors)}</td>
                <td>{row.unavailable ? '—' : number(row.clicks)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </>
  );
}

function PageRanking({ title, description, rows, emptyMessage, days }) {
  const ranked = [...rows].sort((a, b) => b.views - a.views).slice(0, 10);
  const maximum = Math.max(1, ...ranked.map((row) => row.views));
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}><h2>{title}</h2><p>{description}</p></div>
      {!ranked.length ? <p className={styles.emptyList}>{emptyMessage}</p> : <>
        <div className={styles.rankHeader}><span>依瀏覽次數排序・前 10 名</span><span>瀏覽 / {days === 1 ? '訪客估計' : '每日訪客合計'}</span></div>
        <ol className={styles.rankList}>{ranked.map((row, index) => (
          <li key={row.path}>
            <span className={styles.rankNumber}>{String(index + 1).padStart(2, '0')}</span>
            <div className={styles.rankIdentity}><strong>{pageLabel(row.path)}</strong><small>{row.path}</small><span className={styles.rankTrack} aria-hidden="true"><i style={{ width: `${100 * row.views / maximum}%` }} /></span></div>
            <span className={styles.rankValue}><strong>{number(row.views)}</strong><small>{number(row.visitors)}</small></span>
          </li>
        ))}</ol>
      </>}
    </section>
  );
}

function ClickRanking({ rows }) {
  const ranked = [...rows].sort((a, b) => b.count - a.count).slice(0, 10);
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}><h2>按鈕點擊排行</h2><p>看看訪客在哪個頁面按下哪個按鈕。</p></div>
      {!ranked.length ? <p className={styles.emptyList}>這段期間還沒有記錄到按鈕點擊。</p> : <>
        <div className={styles.rankHeader}><span>依點擊次數排序・前 10 名</span><span>點擊次數</span></div>
        <ol className={styles.rankList}>{ranked.map((row, index) => (
          <li key={`${row.target}:${row.page}`}>
            <span className={styles.rankNumber}>{String(index + 1).padStart(2, '0')}</span>
            <div className={styles.rankIdentity}><strong>{targetLabel(row.target)}</strong><small>所在頁面：{pageLabel(row.page)}</small></div>
            <span className={styles.rankValue}><strong>{number(row.count)}</strong></span>
          </li>
        ))}</ol>
      </>}
      <p className={styles.panelNote}>預約點擊只代表開啟預約入口，不代表完成訂位。</p>
    </section>
  );
}

function Breakdown({ title, description, rows, field, labels }) {
  const ranked = [...rows].sort((a, b) => b.views - a.views);
  const total = ranked.reduce((sum, row) => sum + row.views, 0);
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}><h2>{title}</h2><p>{description}</p></div>
      {!ranked.length ? <p className={styles.emptyList}>有瀏覽紀錄後，就會顯示在這裡。</p> : <ul className={styles.breakdownList}>{ranked.map((row) => (
        <li key={row[field]}>
          <div><strong>{labels[row[field]] || row[field]}</strong><span>{number(row.views)} 次 <small>({total ? Math.round(row.views / total * 100) : 0}%)</small></span></div>
          <span className={styles.breakdownTrack} aria-hidden="true"><i style={{ width: `${total ? row.views / total * 100 : 0}%` }} /></span>
        </li>
      ))}</ul>}
    </section>
  );
}

/** Presentation only: authentication and fetching live in the default component. */
export function AnalyticsReportView({ report, days = 7, onDaysChange, onRefresh, refreshing = false, updatedAt = null, status = report ? 'ready' : 'loading', errorMessage = '' }) {
  const loading = status === 'loading' && !report;
  const hasTracking = Boolean(report?.trackedSince);
  const available = hasTracking && report.daily.some((row) => !row.unavailable);
  const visitorLabel = days === 1 ? '每日訪客估計' : '每日訪客合計';
  const metrics = report ? [
    ['頁面瀏覽', report.summary.views, '同一頁再次開啟也會計入'],
    [visitorLabel, report.summary.visitorDays, days === 1 ? '同瀏覽器同一天合併計算' : '每天分別計算，再加總'],
    ['按鈕點擊', report.summary.clicks, '網站上已納入統計的按鈕'],
    ['預約點擊', report.summary.bookingClicks, '點開預約入口的次數'],
  ] : [];

  return (
    <div className={styles.report}>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>WEBSITE INSIGHTS</p><h1>網站數據</h1><p>看看大家怎麼找到 BG、對哪些故事感興趣。</p></div>
        <span className={styles.timezone}>台北時間 · UTC+8</span>
      </header>
      <ReportControls days={days} onDaysChange={onDaysChange} onRefresh={onRefresh} refreshing={refreshing} loading={loading} />
      <div className={styles.periodRow} aria-live="polite">
        <span>{report ? `${dateLabel(report.from)} — ${dateLabel(report.to)}（含今天）` : loading ? '正在取得所選期間的資料…' : '尚未載入統計資料'}</span>
        {updatedAt && report && <span>更新於 {dateLabel(updatedAt, { time: true })}</span>}
      </div>

      {loading ? <div className={styles.stateCard} role="status"><span className={adminStyles.spinner} aria-hidden="true" /><h2>數據整理中</h2><p>正在讀取實際瀏覽與點擊紀錄，請稍候。</p></div>
        : !report ? <div className={styles.stateCard} role="alert"><h2>這次沒有取得數據</h2><p>{errorMessage || '請檢查網路，再按「重新整理」重試。'}</p><p>這不代表瀏覽或點擊次數為零。</p></div>
          : !hasTracking ? <div className={styles.stateCard}><span className={styles.stateEyebrow}>新的觀察，從這裡開始</span><h2>統計即將開始累積</h2><p>統計啟用後，網站的瀏覽與按鈕點擊會出現在這裡。</p><p>上線前的瀏覽紀錄無法回補，因此目前不以 0 表示。</p></div>
            : <>
              <div className={styles.trackingNote}><span className={styles.trackingDot} aria-hidden="true" /><p>自 <strong>{dateLabel(report.trackedSince)}</strong> 開始累積。更早的日期標示「尚未統計」；今天的數據持續增加中。</p></div>
              <section className={styles.metrics} aria-label="期間統計摘要">{metrics.map(([label, value, note]) => (
                <div key={label} className={styles.metric}><span>{label}</span><strong>{available ? number(value) : '—'}</strong><small>{note}</small></div>
              ))}</section>
              <p className={styles.visitorNote}><strong>訪客數怎麼看？</strong>同一瀏覽器、同一天會合併計算；跨天會重新計算。{days > 1 ? '這裡的合計是每天訪客估計相加，不是跨日不重複人數。' : ''}換裝置或瀏覽器可能重複計入，因此不是精準人數。</p>
              <section className={styles.panel} aria-labelledby="daily-trend-title"><div className={styles.panelHeading}><h2 id="daily-trend-title">每天的來訪</h2><p>瀏覽次數與每日訪客估計，一起看熱度變化。</p></div><DailyChart rows={report.daily} /></section>
              <div className={styles.twoColumns}>
                <PageRanking title="熱門頁面" description="網站中最常被開啟的頁面。" rows={report.pages} days={days} emptyMessage="這段期間還沒有記錄到頁面瀏覽。" />
                <PageRanking title="熱門劇本" description="哪些劇本介紹最讓大家好奇？" rows={report.scripts} days={days} emptyMessage="這段期間還沒有記錄到劇本頁瀏覽。" />
              </div>
              <ClickRanking rows={report.clicks} />
              <div className={styles.twoColumns}>
                <Breakdown title="大家從哪裡來" description="依瀏覽紀錄的來源分類，占比以瀏覽次數計算。" rows={report.sources} field="source" labels={SOURCE_LABELS} />
                <Breakdown title="使用哪些裝置" description="依瀏覽時的裝置分類，占比以瀏覽次數計算。" rows={report.devices} field="device" labels={DEVICE_LABELS} />
              </div>
            </>}
    </div>
  );
}

function validReport(report) {
  const keys = ['daily', 'pages', 'scripts', 'clicks', 'sources', 'devices'];
  return report && report.timezone === 'Asia/Taipei' && report.from && report.to
    && keys.every((key) => Array.isArray(report[key]))
    && ['views', 'visitorDays', 'clicks', 'bookingClicks'].every((key) => Number.isFinite(report.summary?.[key]))
    && report.daily.every((row) => row.date && (row.unavailable || ['views', 'visitors', 'clicks'].every((key) => Number.isFinite(row[key]))));
}

export default function AdminAnalyticsDashboard() {
  const [days, setDays] = useState(7);
  const [report, setReport] = useState(null);
  const [access, setAccess] = useState('loading');
  const [status, setStatus] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const controller = useRef(null);
  const requestId = useRef(0);

  const load = useCallback(async (range, { quiet = false } = {}) => {
    const id = ++requestId.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 20_000);
    setStatus('loading');
    setRefreshing(quiet);
    setMessage('');
    if (!quiet) setReport(null);
    try {
      const payload = await adminRequest(`/api/admin/analytics?days=${range}`, { signal: abort.signal });
      if (id !== requestId.current) return;
      if (!validReport(payload)) throw new Error('invalid_report');
      setReport(payload);
      setAccess('ready');
      setStatus('ready');
      setUpdatedAt(new Date().toISOString());
    } catch (error) {
      if (id !== requestId.current) return;
      setReport(null);
      setStatus('error');
      if (error instanceof AdminApiError && error.status === 401) {
        setAccess('signedOut');
        setMessage('請輸入員工帳號與密碼，即可查看網站數據。');
      } else if (error instanceof AdminApiError && error.status === 403) {
        setAccess('forbidden');
        setMessage('這個帳號沒有網站數據的存取權限，請使用員工帳號登入。');
      } else {
        setAccess((current) => current === 'ready' ? 'ready' : 'error');
        setMessage(abort.signal.aborted ? '讀取時間較久，請稍後重新整理。' : '網站數據暫時無法載入，請稍後重新整理。');
      }
    } finally {
      window.clearTimeout(timeout);
      if (id === requestId.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(days);
    return () => { requestId.current += 1; controller.current?.abort(); };
  }, [days, load]);

  if (access !== 'ready') {
    return <div className={adminStyles.adminRoot}><main className={adminStyles.accessPage}>
      <AdminAccessState state={access} message={message} onRetry={() => load(days)} loginTitle="登入後查看網站數據" loadingMessage="請稍候，我們正在確認權限並讀取網站數據。" />
    </main></div>;
  }

  return <AdminShell><AnalyticsReportView report={report} days={days} onDaysChange={setDays} onRefresh={() => load(days, { quiet: Boolean(report) })} refreshing={refreshing} updatedAt={updatedAt} status={status} errorMessage={message} /></AdminShell>;
}
