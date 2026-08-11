'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminAccessState from './AdminAccessState';
import AdminShell from './AdminShell';
import ConfirmDialog from './ConfirmDialog';
import CoverUploader from './CoverUploader';
import TagField from './TagField';
import {
  AdminApiError,
  checkAdminAccess,
  createAdminScript,
  createEmptyScript,
  getAdminScript,
  normalizeAdminScript,
  publishAdminScript,
  retryAdminScriptSync,
  toAdminScriptPayload,
  unpublishAdminScript,
  updateAdminScript,
} from './adminScriptApi';
import { ArrowLeftIcon, CheckIcon, PlusIcon, TrashIcon, WarningIcon } from './AdminIcons';
import styles from './Admin.module.css';

const GENRE_SUGGESTIONS = ['推理', '情感', '歡樂', '恐怖', '陣營', '機制', '沉浸', '新手'];

const STATUS_LABELS = {
  draft: '草稿',
  published: '已發布',
  unpublished: '已下架',
  archived: '已下架',
};

const SYNC_LABELS = {
  synced: 'Notion 與 Supabase 已同步',
  pending: '等待同步',
  syncing: '正在同步',
  error: '同步失敗，系統將保留草稿',
  partial: '只有部分平台同步成功',
  not_synced: '尚未同步',
};

function contentFingerprint(script) {
  return JSON.stringify(toAdminScriptPayload(script));
}

function fieldNumber(value) {
  return value === '' || value === null || value === undefined ? '' : Number(value);
}

function validate(script, { publishing = false } = {}) {
  const errors = {};
  if (!script.name.trim()) errors.name = '請先輸入劇本名稱。';
  if (script.playerMin !== '' && Number(script.playerMin) < 1) errors.playerMin = '最少人數必須大於 0。';
  if (script.playerMax !== '' && Number(script.playerMax) < 1) errors.playerMax = '最多人數必須大於 0。';
  if (script.playerMin !== '' && script.playerMax !== '' && Number(script.playerMax) < Number(script.playerMin)) {
    errors.playerMax = '最多人數不可小於最少人數。';
  }
  if (script.durationMinutes !== '' && Number(script.durationMinutes) < 1) errors.durationMinutes = '分鐘數必須大於 0。';
  if (script.priceStatus === 'fixed' && (script.price === '' || Number(script.price) < 0)) {
    errors.price = '固定價格請填入 0 以上的金額。';
  }

  if (publishing) {
    if (!script.synopsis.trim()) errors.synopsis = '發布前請填寫劇情簡介。';
    if (script.playerMin === '') errors.playerMin = '發布前請填寫最少人數。';
    if (script.playerMax === '') errors.playerMax = '發布前請填寫最多人數。';
    if (script.durationMinutes === '' && !script.durationLabel.trim()) errors.durationLabel = '發布前請填寫時長。';
    if (!script.cover.url) errors.cover = '發布前請上傳封面。';
  }
  return errors;
}

function focusFirstError(errors) {
  const first = Object.keys(errors)[0];
  if (!first) return;
  window.requestAnimationFrame(() => {
    document.querySelector(`[data-admin-field="${first}"]`)?.focus();
  });
}

function formatDate(value) {
  if (!value) return '尚未發布';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '尚無紀錄';
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function ScriptEditor({ scriptId = null, mode = 'edit' }) {
  const router = useRouter();
  const isNew = mode === 'new';
  const [draft, setDraft] = useState(createEmptyScript);
  const [record, setRecord] = useState(createEmptyScript);
  const [baseline, setBaseline] = useState(() => contentFingerprint(createEmptyScript()));
  const [access, setAccess] = useState('loading');
  const [accessMessage, setAccessMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [showUnpublish, setShowUnpublish] = useState(false);

  const dirty = useMemo(() => contentFingerprint(draft) !== baseline, [baseline, draft]);
  const isBusy = Boolean(busyAction) || coverUploading;

  const handleAccessError = useCallback((error) => {
    if (error instanceof AdminApiError && error.status === 401) setAccess('signedOut');
    else if (error instanceof AdminApiError && error.status === 403) setAccess('forbidden');
    else setAccess('error');
    setAccessMessage(error?.message || '後台資料載入失敗。');
  }, []);

  const load = useCallback(async () => {
    setAccess('loading');
    setAccessMessage('');
    try {
      if (isNew) {
        await checkAdminAccess();
        const empty = createEmptyScript();
        setDraft(empty);
        setRecord(empty);
        setBaseline(contentFingerprint(empty));
      } else {
        const script = await getAdminScript(scriptId);
        setDraft(script);
        setRecord(script);
        setBaseline(contentFingerprint(script));
      }
      setAccess('ready');
    } catch (error) {
      handleAccessError(error);
    }
  }, [handleAccessError, isNew, scriptId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function beforeUnload(event) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setNotice('');
  }

  function updateCharacter(index, field, value) {
    setDraft((current) => ({
      ...current,
      characters: current.characters.map((character, characterIndex) => (
        characterIndex === index ? { ...character, [field]: value } : character
      )),
    }));
  }

  function addCharacter() {
    setDraft((current) => ({
      ...current,
      characters: [...current.characters, { name: '', description: '' }],
    }));
  }

  function removeCharacter(index) {
    setDraft((current) => ({
      ...current,
      characters: current.characters.filter((_, characterIndex) => characterIndex !== index),
    }));
  }

  async function saveDraft({ forPublishing = false } = {}) {
    const nextErrors = validate(draft, { publishing: forPublishing });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstError(nextErrors);
      setActionError(forPublishing ? '還有發布必填欄位尚未完成。' : '請先修正標示的欄位。');
      return null;
    }

    setBusyAction('saving');
    setActionError('');
    setNotice('');
    try {
      const saved = isNew || !record.id
        ? await createAdminScript(draft)
        : await updateAdminScript(record.id, draft);
      setDraft(saved);
      setRecord(saved);
      setBaseline(contentFingerprint(saved));
      setNotice('草稿已安全儲存。');
      if ((isNew || !scriptId) && saved.id) {
        router.replace(`/admin/scripts/${encodeURIComponent(saved.id)}`);
      }
      return saved;
    } catch (error) {
      if (error instanceof AdminApiError && [401, 403].includes(error.status)) {
        handleAccessError(error);
      } else {
        setActionError(error?.message || '草稿儲存失敗，原內容仍保留在畫面上。');
      }
      return null;
    } finally {
      setBusyAction('');
    }
  }

  async function publish() {
    const publishErrors = validate(draft, { publishing: true });
    setErrors(publishErrors);
    if (Object.keys(publishErrors).length) {
      focusFirstError(publishErrors);
      setActionError('還有發布必填欄位尚未完成。');
      return;
    }

    let target = draft;
    if (dirty || !record.id) {
      target = await saveDraft({ forPublishing: true });
      if (!target) return;
    }

    setBusyAction('publishing');
    setActionError('');
    setNotice('');
    try {
      const published = await publishAdminScript(target.id, target.draftVersion);
      setDraft(published);
      setRecord(published);
      setBaseline(contentFingerprint(published));
      setNotice(published.syncStatus === 'synced'
        ? '發布完成，Notion 與 Supabase 都已同步。'
        : '發布已送出；系統正在完成另一邊的同步。');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) handleAccessError(error);
      else if (error instanceof AdminApiError && error.status === 403) {
        setActionError('你的帳號可以編輯草稿，但需要 publisher 或 admin 才能發布。');
      } else setActionError(error?.message || '發布失敗；已儲存的草稿不會遺失。');
    } finally {
      setBusyAction('');
    }
  }

  async function unpublish() {
    if (!record.id) return;
    setBusyAction('unpublishing');
    setActionError('');
    try {
      const unpublished = await unpublishAdminScript(record.id, record.publishedVersion);
      setDraft(unpublished);
      setRecord(unpublished);
      setBaseline(contentFingerprint(unpublished));
      setNotice('劇本已下架，資料與歷史版本仍完整保留。');
      setShowUnpublish(false);
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) handleAccessError(error);
      else if (error instanceof AdminApiError && error.status === 403) {
        setActionError('需要 publisher 或 admin 權限才能下架劇本。');
      } else setActionError(error?.message || '下架失敗，官網目前狀態沒有改變。');
    } finally {
      setBusyAction('');
    }
  }

  async function retrySync() {
    if (!record.id) return;
    if (dirty) {
      setActionError('請先儲存目前修改，再重試 Notion 同步。');
      return;
    }

    setBusyAction('syncing');
    setActionError('');
    setNotice('');
    try {
      const synced = await retryAdminScriptSync(record.id);
      setDraft(synced);
      setRecord(synced);
      setBaseline(contentFingerprint(synced));
      setNotice(synced.syncStatus === 'synced'
        ? 'Notion 與 Supabase 已重新同步。'
        : '已檢查並處理同步工作；資料仍安全保留。');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) handleAccessError(error);
      else if (error instanceof AdminApiError && error.status === 403) {
        setActionError('需要 publisher 或 admin 權限才能重試同步。');
      } else setActionError(error?.message || 'Notion 同步重試失敗，請稍後再試。');
    } finally {
      setBusyAction('');
    }
  }

  function onBack(event) {
    if (dirty && !window.confirm('尚有未儲存的修改，確定要離開嗎？')) event.preventDefault();
  }

  if (access !== 'ready') {
    return (
      <div className={styles.adminRoot}>
        <main className={styles.accessPage}>
          <AdminAccessState state={access} message={accessMessage} onRetry={load} />
        </main>
      </div>
    );
  }

  return (
    <AdminShell compact>
      <div className={styles.editorTopbar}>
        <Link href="/admin/scripts" className={styles.backLink} onClick={onBack}>
          <ArrowLeftIcon />
          返回劇本清單
        </Link>
        <div className={styles.editorState} aria-live="polite">
          {dirty ? <><span className={styles.unsavedDot} />尚未儲存</> : <><CheckIcon />變更已儲存</>}
        </div>
      </div>

      <section className={styles.editorHeading}>
        <div>
          <p className={styles.eyebrow}>{isNew ? 'NEW SCRIPT' : 'EDIT SCRIPT'}</p>
          <h1>{isNew ? '新增劇本' : draft.name || '未命名草稿'}</h1>
          <p>{isNew ? '先建立草稿，確認預覽後再發布到官網。' : '修改會先留在草稿；按下發布後才會更新官網。'}</p>
        </div>
        <div className={styles.headingBadges}>
          <span className={`${styles.badge} ${record.status === 'published' ? styles.badgeSuccess : styles.badgeDraft}`}>
            {STATUS_LABELS[record.status] || '草稿'}
          </span>
          {!isNew && <span className={styles.versionBadge}>草稿 v{record.draftVersion || 0}</span>}
        </div>
      </section>

      {(notice || actionError) && (
        <div className={`${styles.actionNotice} ${actionError ? styles.actionNoticeError : styles.actionNoticeSuccess}`} role={actionError ? 'alert' : 'status'}>
          {actionError ? <WarningIcon /> : <CheckIcon />}
          <span>{actionError || notice}</span>
          <button type="button" onClick={() => { setNotice(''); setActionError(''); }} aria-label="關閉通知">×</button>
        </div>
      )}

      <div className={styles.editorLayout}>
        <form className={styles.editorForm} onSubmit={(event) => { event.preventDefault(); saveDraft(); }} noValidate>
          <section className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <span>01</span>
              <div>
                <h2>基本資料</h2>
                <p>玩家在清單與劇本頁最先看到的資訊。</p>
              </div>
            </div>
            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>劇本名稱 <b aria-hidden="true">必填</b></span>
                <input
                  data-admin-field="name"
                  type="text"
                  value={draft.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="輸入官網顯示的完整名稱"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  disabled={isBusy}
                />
                {errors.name && <small id="name-error" className={styles.fieldError}>{errors.name}</small>}
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>劇情簡介</span>
                <textarea
                  data-admin-field="synopsis"
                  rows="7"
                  value={draft.synopsis}
                  onChange={(event) => updateField('synopsis', event.target.value)}
                  placeholder="建議分成 2～4 段，避免劇透。"
                  aria-invalid={Boolean(errors.synopsis)}
                  aria-describedby={errors.synopsis ? 'synopsis-error' : 'synopsis-hint'}
                  disabled={isBusy}
                />
                <span className={styles.textareaMeta} id="synopsis-hint">{draft.synopsis.length} 字</span>
                {errors.synopsis && <small id="synopsis-error" className={styles.fieldError}>{errors.synopsis}</small>}
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>最少人數</span>
                <input
                  data-admin-field="playerMin"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={draft.playerMin}
                  onChange={(event) => updateField('playerMin', fieldNumber(event.target.value))}
                  placeholder="例：6"
                  aria-invalid={Boolean(errors.playerMin)}
                  disabled={isBusy}
                />
                {errors.playerMin && <small className={styles.fieldError}>{errors.playerMin}</small>}
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>最多人數</span>
                <input
                  data-admin-field="playerMax"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={draft.playerMax}
                  onChange={(event) => updateField('playerMax', fieldNumber(event.target.value))}
                  placeholder="例：8"
                  aria-invalid={Boolean(errors.playerMax)}
                  disabled={isBusy}
                />
                {errors.playerMax && <small className={styles.fieldError}>{errors.playerMax}</small>}
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>標準時長（分鐘）</span>
                <input
                  data-admin-field="durationMinutes"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="5"
                  value={draft.durationMinutes}
                  onChange={(event) => updateField('durationMinutes', fieldNumber(event.target.value))}
                  placeholder="例：240"
                  aria-invalid={Boolean(errors.durationMinutes)}
                  disabled={isBusy}
                />
                {errors.durationMinutes && <small className={styles.fieldError}>{errors.durationMinutes}</small>}
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>官網時長文字</span>
                <input
                  data-admin-field="durationLabel"
                  type="text"
                  value={draft.durationLabel}
                  onChange={(event) => updateField('durationLabel', event.target.value)}
                  placeholder="例：約 4～5 小時"
                  aria-invalid={Boolean(errors.durationLabel)}
                  disabled={isBusy}
                />
                {errors.durationLabel && <small className={styles.fieldError}>{errors.durationLabel}</small>}
              </label>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <span>02</span>
              <div>
                <h2>價格與分類</h2>
                <p>正確分類能讓玩家更快找到適合的劇本。</p>
              </div>
            </div>
            <fieldset className={styles.priceFieldset}>
              <legend className={styles.fieldLabel}>價格狀態</legend>
              <div className={styles.segmentedControl}>
                {[
                  ['fixed', '固定價格'],
                  ['free', '免費'],
                  ['tbd', '價格未定'],
                ].map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="priceStatus"
                      value={value}
                      checked={draft.priceStatus === value}
                      onChange={() => updateField('priceStatus', value)}
                      disabled={isBusy}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {draft.priceStatus === 'fixed' && (
              <label className={`${styles.field} ${styles.priceInput}`}>
                <span className={styles.fieldLabel}>每人價格</span>
                <span className={styles.inputPrefixWrap}>
                  <b>NT$</b>
                  <input
                    data-admin-field="price"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="10"
                    value={draft.price}
                    onChange={(event) => updateField('price', fieldNumber(event.target.value))}
                    placeholder="650"
                    aria-invalid={Boolean(errors.price)}
                    disabled={isBusy}
                  />
                </span>
                {errors.price && <small className={styles.fieldError}>{errors.price}</small>}
              </label>
            )}
            <div className={styles.formGrid}>
              <TagField
                label="主要類型"
                hint="例如：推理、情感、歡樂。輸入後按 Enter。"
                value={draft.genres}
                onChange={(value) => updateField('genres', value)}
                suggestions={GENRE_SUGGESTIONS}
                disabled={isBusy}
              />
              <TagField
                label="自訂標籤"
                hint="例如：日式、城限、新手友善。"
                value={draft.customTags}
                onChange={(value) => updateField('customTags', value)}
                disabled={isBusy}
              />
            </div>
            <label className={`${styles.field} ${styles.sortOrderField}`}>
              <span className={styles.fieldLabel}>清單排序</span>
              <input
                type="number"
                inputMode="numeric"
                value={draft.sortOrder}
                onChange={(event) => updateField('sortOrder', fieldNumber(event.target.value))}
                disabled={isBusy}
              />
              <small className={styles.fieldHint}>數字越小越前面；相同時依最新建立排序。</small>
            </label>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionHeadingWithAction}>
              <div className={styles.sectionHeading}>
                <span>03</span>
                <div>
                  <h2>角色資料</h2>
                  <p>每位角色一列；描述可留空。</p>
                </div>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={addCharacter} disabled={isBusy}>
                <PlusIcon />
                新增角色
              </button>
            </div>
            {draft.characters.length ? (
              <div className={styles.characterList}>
                <div className={styles.characterHeader} aria-hidden="true">
                  <span>角色名稱</span><span>角色簡介</span><span />
                </div>
                {draft.characters.map((character, index) => (
                  <div className={styles.characterRow} key={`character-${index}`}>
                    <label>
                      <span className={styles.visuallyHidden}>角色 {index + 1} 名稱</span>
                      <input
                        type="text"
                        value={character.name}
                        onChange={(event) => updateCharacter(index, 'name', event.target.value)}
                        placeholder={`角色 ${index + 1} 名稱`}
                        disabled={isBusy}
                      />
                    </label>
                    <label>
                      <span className={styles.visuallyHidden}>角色 {index + 1} 簡介</span>
                      <textarea
                        rows="2"
                        value={character.description}
                        onChange={(event) => updateCharacter(index, 'description', event.target.value)}
                        placeholder="不劇透的角色介紹"
                        disabled={isBusy}
                      />
                    </label>
                    <button type="button" className={styles.rowDeleteButton} onClick={() => removeCharacter(index)} disabled={isBusy} aria-label={`移除角色 ${character.name || index + 1}`}>
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <button type="button" className={styles.characterEmpty} onClick={addCharacter} disabled={isBusy}>
                <PlusIcon />
                <strong>還沒有角色資料</strong>
                <span>點這裡新增第一位角色</span>
              </button>
            )}
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <span>04</span>
              <div>
                <h2>封面圖片</h2>
                <p>圖片會直接傳到 Supabase，不會經過 Vercel 中轉。</p>
              </div>
            </div>
            <div data-admin-field="cover" tabIndex="-1">
              <CoverUploader
                value={draft.cover}
                onChange={(value) => {
                  setDraft((current) => ({ ...current, cover: value }));
                  setErrors((current) => ({ ...current, cover: undefined }));
                }}
                scriptId={record.id}
                scriptName={draft.name}
                disabled={Boolean(busyAction)}
                onUploadingChange={setCoverUploading}
              />
              {errors.cover && <p className={styles.fieldError}>{errors.cover}</p>}
            </div>
          </section>

          <button type="submit" className={styles.visuallyHidden}>儲存草稿</button>
        </form>

        <aside className={styles.editorSidebar} aria-label="發布控制">
          <div className={styles.publishCard}>
            <div className={styles.publishCardHeading}>
              <span>目前狀態</span>
              <strong>{STATUS_LABELS[record.status] || '草稿'}</strong>
            </div>
            <dl className={styles.recordMeta}>
              <div><dt>草稿版本</dt><dd>v{record.draftVersion || 0}</dd></div>
              <div><dt>已發布版本</dt><dd>{record.publishedVersion ? `v${record.publishedVersion}` : '尚無'}</dd></div>
              <div><dt>發布時間</dt><dd>{formatDate(record.publishedAt)}</dd></div>
            </dl>
            <div className={`${styles.syncBox} ${['error', 'partial'].includes(record.syncStatus) ? styles.syncBoxError : ''}`}>
              <span className={styles.syncDot} aria-hidden="true" />
              <div>
                <strong>同步狀態</strong>
                <p>{SYNC_LABELS[record.syncStatus] || '等待同步'}</p>
              </div>
            </div>
            {record.id && ['error', 'pending', 'syncing'].includes(record.syncStatus) && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={retrySync}
                disabled={isBusy || dirty}
              >
                {busyAction === 'syncing' ? '重試中…' : '重試 Notion 同步'}
              </button>
            )}
            <div className={styles.publishActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => saveDraft()} disabled={isBusy || !dirty}>
                {busyAction === 'saving' ? <span className={styles.spinnerSmall} aria-hidden="true" /> : null}
                {busyAction === 'saving' ? '儲存中…' : dirty ? '儲存草稿' : '草稿已儲存'}
              </button>
              <button type="button" className={styles.primaryButton} onClick={publish} disabled={isBusy}>
                {busyAction === 'publishing' ? <span className={styles.spinnerSmall} aria-hidden="true" /> : <CheckIcon />}
                {busyAction === 'publishing' ? '發布中…' : record.status === 'published' ? '發布最新修改' : '發布到官網'}
              </button>
              {record.status === 'published' && (
                <button type="button" className={styles.unpublishButton} onClick={() => setShowUnpublish(true)} disabled={isBusy}>
                  下架劇本
                </button>
              )}
            </div>
            <p className={styles.publishHint}>發布後，官網會更新這本劇本；同步失敗時草稿與已發布版本都會保留。</p>
          </div>
        </aside>
      </div>

      <div className={styles.mobileActionBar}>
        <span>{dirty ? '有未儲存修改' : '已儲存'}</span>
        <button type="button" className={styles.secondaryButton} onClick={() => saveDraft()} disabled={isBusy || !dirty}>
          儲存
        </button>
        <button type="button" className={styles.primaryButton} onClick={publish} disabled={isBusy}>
          {busyAction === 'publishing' ? '發布中…' : '發布'}
        </button>
      </div>

      <ConfirmDialog
        open={showUnpublish}
        title={`確定下架《${record.name || draft.name}》？`}
        confirmLabel="確認下架"
        busy={busyAction === 'unpublishing'}
        onConfirm={unpublish}
        onCancel={() => setShowUnpublish(false)}
      >
        <p>下架後玩家將無法從官網看到這本劇本，但資料、草稿與歷史版本都會保留，之後可以再次發布。</p>
      </ConfirmDialog>
    </AdminShell>
  );
}
