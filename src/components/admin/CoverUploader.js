'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserConnection } from '@/lib/supabase/browser';
import { requestCoverUpload } from './adminScriptApi';
import { ImageIcon, TrashIcon, UploadIcon } from './AdminIcons';
import styles from './Admin.module.css';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function uploadGrant(payload) {
  return payload?.upload || payload?.data || payload || {};
}

export default function CoverUploader({ value, onChange, scriptId, scriptName, disabled = false, onUploadingChange }) {
  const inputRef = useRef(null);
  const objectUrlRef = useRef('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState('crop');
  const [localPreview, setLocalPreview] = useState('');

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  async function upload(file) {
    setError('');
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setError('請上傳 JPG、PNG 或 WebP 圖片。');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('圖片不可超過 8MB，請先縮小後再上傳。');
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setLocalPreview(objectUrlRef.current);
    setUploading(true);
    onUploadingChange?.(true);

    try {
      const grant = uploadGrant(await requestCoverUpload(file, scriptId));
      const bucket = grant.bucket;
      const path = grant.path;
      const token = grant.token;
      if (!bucket || !path || !token) throw new Error('伺服器沒有提供完整的上傳授權。');

      const connection = getSupabaseBrowserConnection();
      if (connection.status !== 'ready') throw new Error('圖片儲存服務尚未完成設定。');

      const { error: uploadError } = await connection.client.storage
        .from(bucket)
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type,
          cacheControl: '31536000',
        });
      if (uploadError) throw uploadError;

      const publicUrl = grant.publicUrl
        || grant.url
        || grant.displayUrl
        || connection.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;

      onChange({
        ...value,
        url: publicUrl,
        path,
        alt: value.alt || (scriptName ? `${scriptName}劇本封面` : file.name.replace(/\.[^.]+$/, '')),
        focalX: Number(value.focalX ?? 50),
        focalY: Number(value.focalY ?? 50),
      });
      setLocalPreview('');
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    } catch (uploadError) {
      setError(uploadError?.message || '封面上傳失敗，請稍後再試。');
      setLocalPreview('');
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (!disabled && !uploading) upload(event.dataTransfer.files?.[0]);
  }

  const previewUrl = localPreview || value.url;
  const objectPosition = `${value.focalX ?? 50}% ${value.focalY ?? 50}%`;

  return (
    <div className={styles.coverEditor}>
      <div className={styles.coverPreviewColumn}>
        <div className={styles.previewToggle} aria-label="封面預覽模式">
          <button type="button" aria-pressed={previewMode === 'crop'} onClick={() => setPreviewMode('crop')}>官網 4:3</button>
          <button type="button" aria-pressed={previewMode === 'full'} onClick={() => setPreviewMode('full')}>完整圖片</button>
        </div>
        <div className={`${styles.coverPreview} ${previewMode === 'full' ? styles.coverPreviewFull : ''}`}>
          {previewUrl ? (
            // The local blob preview and signed storage hosts are intentionally not sent through next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={value.alt || '封面預覽'}
              style={{ objectPosition }}
            />
          ) : (
            <div className={styles.coverPlaceholder}>
              <ImageIcon />
              <span>尚未上傳封面</span>
            </div>
          )}
          {uploading && (
            <div className={styles.uploadOverlay} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              正在直傳圖片…
            </div>
          )}
        </div>
        {previewUrl && previewMode === 'crop' && (
          <div className={styles.focalControls}>
            <label>
              <span>左右焦點 <output>{value.focalX ?? 50}%</output></span>
              <input
                type="range"
                min="0"
                max="100"
                value={value.focalX ?? 50}
                onChange={(event) => onChange({ ...value, focalX: Number(event.target.value) })}
                disabled={disabled || uploading}
              />
            </label>
            <label>
              <span>上下焦點 <output>{value.focalY ?? 50}%</output></span>
              <input
                type="range"
                min="0"
                max="100"
                value={value.focalY ?? 50}
                onChange={(event) => onChange({ ...value, focalY: Number(event.target.value) })}
                disabled={disabled || uploading}
              />
            </label>
          </div>
        )}
      </div>

      <div className={styles.coverUploadColumn}>
        <label
          className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
          }}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => upload(event.target.files?.[0])}
            disabled={disabled || uploading}
          />
          <UploadIcon />
          <strong>{dragging ? '放開以上傳圖片' : value.url ? '更換封面圖片' : '拖放封面到這裡'}</strong>
          <span>或點一下選擇檔案</span>
          <small>JPG、PNG、WebP，最大 8MB</small>
        </label>
        {error && <p className={styles.inlineError} role="alert">{error}</p>}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>圖片替代文字</span>
          <input
            type="text"
            value={value.alt || ''}
            onChange={(event) => onChange({ ...value, alt: event.target.value })}
            placeholder="例：寒門劇本封面"
            disabled={disabled || uploading}
          />
          <small className={styles.fieldHint}>提供給看不到圖片的使用者，請簡短描述封面。</small>
        </label>
        {value.url && (
          <button
            type="button"
            className={styles.removeCoverButton}
            onClick={() => onChange({ url: '', path: '', alt: '', focalX: 50, focalY: 50 })}
            disabled={disabled || uploading}
          >
            <TrashIcon />
            移除目前封面
          </button>
        )}
      </div>
    </div>
  );
}
