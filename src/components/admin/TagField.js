'use client';

import { useId, useState } from 'react';
import { PlusIcon } from './AdminIcons';
import styles from './Admin.module.css';

export default function TagField({ label, hint, value = [], onChange, suggestions = [], disabled = false }) {
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const listId = `${inputId}-suggestions`;

  function addValues(rawValue) {
    const additions = String(rawValue || '')
      .split(/[,、/\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!additions.length) return;
    onChange(Array.from(new Set([...value, ...additions])));
    setDraft('');
  }

  function onKeyDown(event) {
    if (['Enter', ',', '、'].includes(event.key)) {
      event.preventDefault();
      addValues(draft);
    }
    if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={styles.tagField}>
      <label htmlFor={inputId} className={styles.fieldLabel}>{label}</label>
      {hint && <p className={styles.fieldHint}>{hint}</p>}
      <div className={styles.tagInputWrap}>
        {value.map((tag) => (
          <span className={styles.tagChip} key={tag}>
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              aria-label={`移除 ${tag}`}
              disabled={disabled}
            >×</button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addValues(draft)}
          placeholder={value.length ? '繼續輸入' : '輸入後按 Enter'}
          list={suggestions.length ? listId : undefined}
          disabled={disabled}
        />
        {draft && (
          <button type="button" className={styles.tagAddButton} onClick={() => addValues(draft)} aria-label="加入標籤">
            <PlusIcon />
          </button>
        )}
      </div>
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((suggestion) => <option value={suggestion} key={suggestion} />)}
        </datalist>
      )}
    </div>
  );
}
