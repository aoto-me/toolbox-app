'use client';

import {
  type RemixiconComponentType,
  RiAppleFill,
  RiChromeFill,
  RiCloseCircleLine,
  RiCloseLine,
  RiExternalLinkLine,
  RiFirefoxFill,
  RiSafariFill,
  RiSmartphoneFill,
} from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CompatDetail, CompatSuggestion } from '@/lib/actions/compat';
import { getCompatDetail, searchCompat } from '@/lib/actions/compat';
import styles from './index.module.scss';

const BROWSER_ICONS: Record<string, RemixiconComponentType> = {
  chrome: RiChromeFill,
  chrome_android: RiSmartphoneFill,
  firefox: RiFirefoxFill,
  safari: RiSafariFill,
  safari_ios: RiAppleFill,
};

export default function BrowserCompat() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CompatSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [detail, setDetail] = useState<CompatDetail | null>(null);
  const [status, setStatus] = useState<'error' | 'idle' | 'loading'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const justSelectedRef = useRef(false);
  const [dropdownPos, setDropdownPos] = useState<null | {
    left: number;
    maxHeight: number;
    top: number;
    width: number;
  }>(null);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (query.length < 2) return;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const data = await searchCompat(query);
          setSuggestions(data.suggestions);
          setShowDropdown(data.suggestions.length > 0);
        } catch {
          // ignore search errors silently
        }
      })();
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!showDropdown) return;

    function updatePos() {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const available = window.innerHeight - rect.bottom - 8;
        setDropdownPos({
          left: rect.left,
          maxHeight: Math.min(260, Math.max(80, available)),
          top: rect.bottom + 4,
          width: rect.width,
        });
      }
    }

    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [showDropdown]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function focusDropdownItem(index: number) {
    const items = dropdownRef.current?.querySelectorAll('li');
    (items?.[index] as HTMLElement | undefined)?.focus();
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown' || e.key === 'Tab') {
      e.preventDefault();
      focusDropdownItem(0);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent<HTMLLIElement>, index: number, key: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void selectKey(key);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusDropdownItem(index + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index === 0) {
        inputRef.current?.focus();
      } else {
        focusDropdownItem(index - 1);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.focus();
    } else if (e.key === 'Tab') {
      setShowDropdown(false);
    }
  }

  function clearQuery() {
    setQuery('');
    setShowDropdown(false);
    setDetail(null);
    setStatus('idle');
    inputRef.current?.focus();
  }

  async function selectKey(key: string) {
    justSelectedRef.current = true;
    setQuery(key);
    setShowDropdown(false);
    setStatus('loading');
    setDetail(null);
    try {
      const data = await getCompatDetail(key);
      setDetail(data);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className={styles.browserCompat} ref={containerRef}>
      <div className={styles.browserCompat__searchWrapper}>
        <input
          autoComplete="off"
          className={styles.browserCompat__input}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (val.length < 2) {
              setSuggestions([]);
              setShowDropdown(false);
            }
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="例: grid-template-columns, Promise.all"
          ref={inputRef}
          spellCheck={false}
          type="text"
          value={query}
        />
        {query && (
          <button
            aria-label="クリア"
            className={styles.browserCompat__clearButton}
            onClick={clearQuery}
            tabIndex={-1}
          >
            <RiCloseLine size={16} />
          </button>
        )}
        {showDropdown &&
          dropdownPos &&
          createPortal(
            <ul
              className={styles.browserCompat__dropdown}
              ref={dropdownRef}
              style={
                {
                  '--compat-left': `${dropdownPos.left}px`,
                  '--compat-max-height': `${dropdownPos.maxHeight}px`,
                  '--compat-top': `${dropdownPos.top}px`,
                  '--compat-width': `${dropdownPos.width}px`,
                } as React.CSSProperties
              }
            >
              {suggestions.map((s, i) => (
                <li
                  className={styles.browserCompat__dropdownItem}
                  key={s.key}
                  onKeyDown={(e) => {
                    handleItemKeyDown(e, i, s.key);
                  }}
                  onMouseDown={() => selectKey(s.key)}
                  tabIndex={0}
                >
                  <span className={styles.browserCompat__dropdownKey}>{s.key}</span>
                  <span className={styles.browserCompat__dropdownCategory}>{s.category}</span>
                </li>
              ))}
            </ul>,
            document.body
          )}
      </div>

      {status === 'loading' && <p className={styles.browserCompat__message}>読み込み中...</p>}
      {status === 'error' && (
        <p
          className={styles.browserCompat__message + ' ' + styles['browserCompat__message--error']}
        >
          データを取得できませんでした
        </p>
      )}

      {detail && status === 'idle' && (
        <div className={styles.browserCompat__result}>
          <div className={styles.browserCompat__resultHeader}>
            <span className={styles.browserCompat__resultKey}>{detail.key}</span>
            {detail.mdnUrl && (
              <a
                className={styles.browserCompat__mdnLink}
                href={detail.mdnUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                MDN
                <RiExternalLinkLine
                  aria-hidden
                  className={styles.browserCompat__mdnLinkIcon}
                  size={12}
                />
              </a>
            )}
          </div>
          <div className={styles.browserCompat__table}>
            {detail.browsers.map((b) => {
              const BrowserIcon = BROWSER_ICONS[b.id];
              return (
                <div className={styles.browserCompat__row} key={b.id}>
                  <span className={styles.browserCompat__browserName}>
                    {BrowserIcon && (
                      <BrowserIcon className={styles.browserCompat__browserIcon} size={14} />
                    )}
                    {b.name}
                  </span>
                  <span className={styles.browserCompat__supportText}>
                    {b.supported === false ? (
                      <RiCloseCircleLine
                        className={styles.browserCompat__unsupportedIcon}
                        size={16}
                      />
                    ) : (
                      <>
                        {b.text}
                        {b.iphoneLabel && (
                          <span className={styles.browserCompat__iphoneLabel}>{b.iphoneLabel}</span>
                        )}
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
