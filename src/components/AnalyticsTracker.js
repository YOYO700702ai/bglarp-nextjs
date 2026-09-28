'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { normalizePage, normalizeTarget, sourceFromLocation, taipeiDay, targetFromHref } from '@/lib/analytics/contract.mjs';

const ENDPOINT = '/api/analytics/collect';
const STORAGE_KEY = 'bglarp-analytics-day-v1';
let memoryIdentity;
let visitSource;
let queue = [];
let flushTimer;

function identity() {
  const day = taipeiDay();
  if (memoryIdentity?.day === day) return memoryIdentity.id;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.day === day && /^[\da-f]{8}-[\da-f-]{27}$/i.test(saved.id)) memoryIdentity = saved;
  } catch { /* Tracking also works for this tab when storage is unavailable. */ }
  if (memoryIdentity?.day !== day) {
    memoryIdentity = { day, id: crypto.randomUUID() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryIdentity)); } catch { /* Optional storage. */ }
  }
  return memoryIdentity.id;
}

function source() {
  if (visitSource) return visitSource;
  // Save only a fixed source category, never the referrer or campaign parameters.
  try {
    const stored = JSON.parse(sessionStorage.getItem('bglarp-analytics-source-v1') || 'null');
    if (stored?.day === taipeiDay() && ['direct', 'google', 'facebook', 'instagram', 'line', 'other'].includes(stored.source)) visitSource = stored.source;
  } catch { /* Optional storage. */ }
  if (!visitSource) {
    visitSource = sourceFromLocation(location.href, document.referrer, location.origin);
    try { sessionStorage.setItem('bglarp-analytics-source-v1', JSON.stringify({ day: taipeiDay(), source: visitSource })); } catch { /* Optional storage. */ }
  }
  return visitSource;
}

function device() {
  const ua = navigator.userAgent;
  if (/ipad|tablet/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
  return /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop';
}

function flush() {
  clearTimeout(flushTimer);
  flushTimer = undefined;
  if (!queue.length) return;
  const events = queue.splice(0, 10);
  try {
    const body = JSON.stringify({ visitorId: identity(), events });
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
      void fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, credentials: 'omit' }).catch(() => {});
    }
  } catch { /* Analytics must never interrupt browsing or booking. */ }
  if (queue.length) flushTimer = setTimeout(flush, 500);
}

function track(type, page, target) {
  if (!normalizePage(page)) return;
  try {
    queue.push({ id: crypto.randomUUID(), type, page, ...(target ? { target } : {}), source: source(), device: device() });
    if (queue.length >= 10 || type === 'click') flush();
    else if (!flushTimer) flushTimer = setTimeout(flush, 700);
  } catch { /* Unsupported browsers simply skip analytics. */ }
}

function isRenderedPublicPage(page) {
  return !page.startsWith('/scripts/')
    || normalizePage(document.querySelector('[data-analytics-page]')?.dataset.analyticsPage) === page;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef(null);

  useEffect(() => {
    const page = normalizePage(pathname);
    if (!page) { lastPath.current = null; return; }
    let cancelled = false;
    let observer;
    function recordView() {
      const viewKey = `${taipeiDay()}:${page}`;
      if (cancelled || document.visibilityState !== 'visible' || document.prerendering || lastPath.current === viewKey || !isRenderedPublicPage(page)) return;
      lastPath.current = viewKey;
      track('pageview', page);
      observer?.disconnect();
    }
    recordView();
    if (page.startsWith('/scripts/') && !isRenderedPublicPage(page)) {
      observer = new MutationObserver(recordView);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    document.addEventListener('visibilitychange', recordView);
    document.addEventListener('prerenderingchange', recordView);
    return () => {
      cancelled = true;
      observer?.disconnect();
      document.removeEventListener('visibilitychange', recordView);
      document.removeEventListener('prerenderingchange', recordView);
    };
  }, [pathname]);

  useEffect(() => {
    function click(event) {
      if (event.type === 'auxclick' && event.button !== 1) return;
      const page = normalizePage(location.pathname);
      if (!page || !isRenderedPublicPage(page) || !(event.target instanceof Element)) return;
      const element = event.target.closest('[data-analytics-target], a[href]');
      if (!element) return;
      const target = normalizeTarget(element.dataset.analyticsTarget || targetFromHref(element.href, location.origin));
      if (target) track('click', page, target);
    }
    function visibility() { if (document.visibilityState === 'hidden') flush(); }
    document.addEventListener('click', click, true);
    document.addEventListener('auxclick', click, true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('click', click, true);
      document.removeEventListener('auxclick', click, true);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);
  return null;
}
