'use client';

import {
  type RemixiconComponentType,
  RiBox3Fill,
  RiFileCodeFill,
  RiFileExcelFill,
  RiFileFill,
  RiFileImageFill,
  RiFilePdf2Fill,
  RiFilePptFill,
  RiFileTextFill,
  RiFileVideoFill,
  RiFileWordFill,
  RiFileZipFill,
  RiFolderForbidLine,
  RiFolderUploadLine,
  RiHtml5Fill,
  RiImageFill,
  RiMarkdownFill,
  RiMusicFill,
  RiShapeFill,
} from '@remixicon/react';
import clsx from 'clsx';
import { useRef, useState } from 'react';
import { type InitialFile, useDashboardData } from '@/components/layout/DashboardDataProvider';
import { useToast } from '@/components/layout/Toast';
import { registerFile } from '@/lib/actions/file';
import { ALLOWED_FILE_TYPES, getFileCategory, validateFile } from '@/lib/file-types';
import { formatSize } from '@/lib/format';
import { isIOSStandalonePWA } from '@/lib/platform';
import { setRefreshBlocked } from '@/lib/refresh-guard';
import styles from './index.module.scss';

const CATEGORY_ICONS: Record<string, RemixiconComponentType> = {
  '3D': RiBox3Fill,
  AI: RiFileImageFill,
  AUDIO: RiMusicFill,
  DOC: RiFileWordFill,
  FILE: RiFileFill,
  HTML: RiHtml5Fill,
  IMG: RiImageFill,
  INDD: RiFileFill,
  JSON: RiFileCodeFill,
  MD: RiMarkdownFill,
  PDF: RiFilePdf2Fill,
  PPT: RiFilePptFill,
  PSD: RiFileImageFill,
  PY: RiFileCodeFill,
  SVG: RiShapeFill,
  TXT: RiFileTextFill,
  VID: RiFileVideoFill,
  XD: RiFileImageFill,
  XLS: RiFileExcelFill,
  XML: RiFileCodeFill,
  YAML: RiFileCodeFill,
  ZIP: RiFileZipFill,
};

type FileRecord = InitialFile;

const MAX_FILES = 5;
const MAX_SIZE = 1024 * 1024 * 1024;

// <input type="file"> のaccept属性用（".jpg,.png,.pdf,..."）
const ACCEPT_ATTR = Object.keys(ALLOWED_FILE_TYPES)
  .map((ext) => `.${ext}`)
  .join(',');

export default function FileUpload() {
  const { showToast } = useToast();
  const { initialFiles } = useDashboardData();
  const [fileList, setFileList] = useState<FileRecord[]>(initialFiles);
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    const error = validateFile(file.name, file.type);
    if (error) {
      showToast(error);
      return;
    }

    if (file.size > MAX_SIZE) {
      showToast('ファイルサイズが上限（1GB）を超えています');
      return;
    }

    setStatus('loading');
    setUploadProgress(0);
    setRefreshBlocked('upload', true);

    try {
      // 署名付きURL取得
      const presignRes = await fetch('/api/files/presign', {
        body: JSON.stringify({ filename: file.name, mimeType: file.type, size: file.size }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      if (!presignRes.ok) {
        const body = (await presignRes.json().catch(() => ({ error: 'エラーが発生しました' }))) as {
          error: string;
        };
        throw new Error(body.error);
      }
      const { key, url } = (await presignRes.json()) as { key: string; url: string };

      // S3に直接アップロード（XHRを使ってプログレスバーを表示）
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`アップロードに失敗しました (${xhr.status})`));
        };
        xhr.onerror = () => {
          reject(new Error('ネットワークエラーが発生しました'));
        };
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // DBにメタデータ登録
      const newFile = await registerFile({
        filename: file.name,
        mimeType: file.type,
        s3Key: key,
        size: file.size,
      });
      setFileList((prev) => [...prev, newFile]);
      setStatus('idle');
      setUploadProgress(0);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'アップロードに失敗しました');
      setUploadProgress(0);
      setStatus('idle');
    } finally {
      setRefreshBlocked('upload', false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: 'エラーが発生しました' }))) as {
          error: string;
        };
        throw new Error(body.error);
      }
      setFileList((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : '削除に失敗しました');
    }
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      const res = await fetch(`/api/files/${file.id}/download`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: 'エラーが発生しました' }))) as {
          error: string;
        };
        throw new Error(body.error);
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error('ダウンロードURLの取得に失敗しました');

      if (isIOSStandalonePWA()) {
        try {
          if (await shareFile(data.url, file.filename, file.mimeType)) return;
        } catch (shareError) {
          // ユーザーが共有シートをキャンセルした場合は何もしない
          if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
          // それ以外の失敗時は通常のダウンロードにフォールバックする
        }
      }

      window.location.assign(data.url);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'ダウンロードに失敗しました');
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (fileList.length >= MAX_FILES || status === 'loading') return;

    const files = Array.from(e.dataTransfer.files);
    const remaining = MAX_FILES - fileList.length;
    const filesToUpload = files.slice(0, remaining);
    const skippedCount = files.length - filesToUpload.length;

    for (const file of filesToUpload) {
      await handleUpload(file);
    }

    if (skippedCount > 0) {
      showToast(`${skippedCount}件は上限（${MAX_FILES}件）を超えるためスキップしました`);
    }
  };

  const isLimitReached = fileList.length >= MAX_FILES;

  const dropzoneClass = clsx(styles.fileUpload__dropzone, {
    [styles['fileUpload__dropzone--disabled']]: isLimitReached,
    [styles['fileUpload__dropzone--dragging']]: !isLimitReached && isDragging,
  });

  const hasFiles = fileList.length > 0;

  const dropArea =
    status === 'loading' ? (
      <div className={styles.fileUpload__uploading}>
        <p className={styles.fileUpload__uploadingText}>アップロード中... {uploadProgress}%</p>
        <progress className={styles.fileUpload__progress} max={100} value={uploadProgress} />
      </div>
    ) : (
      <div
        aria-label="ファイルを選択"
        className={dropzoneClass}
        onClick={() => !isLimitReached && inputRef.current?.click()}
        onDragLeave={() => {
          setIsDragging(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isLimitReached) setIsDragging(true);
        }}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isLimitReached) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={isLimitReached ? -1 : 0}
      >
        <input
          accept={ACCEPT_ATTR}
          className={styles.fileUpload__input}
          disabled={isLimitReached}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = '';
          }}
          ref={inputRef}
          style={{ display: 'none' }}
          type="file"
        />
        {isLimitReached ? (
          <>
            <RiFolderForbidLine aria-hidden className={styles.fileUpload__limitIcon} size={24} />
            <p className={styles.fileUpload__limitMessage}>
              上限（{MAX_FILES}件）に達しました。
              <br />
              アップロードするには、ファイルを削除してください。
            </p>
          </>
        ) : (
          <>
            <RiFolderUploadLine aria-hidden className={styles.fileUpload__hintIcon} size={24} />
            <p className={styles.fileUpload__hint}>ファイルをドロップ、またはタップして選択</p>
          </>
        )}
        <span
          className={`${styles.fileUpload__counter}${isLimitReached ? ` ${styles['fileUpload__counter--limit']}` : ''}`}
        >
          {fileList.length} / {MAX_FILES} 件
        </span>
      </div>
    );

  return (
    <div className={clsx(styles.fileUpload, { [styles['fileUpload--hasFiles']]: hasFiles })}>
      {hasFiles ? (
        <>
          <div className={styles.fileUpload__left}>{dropArea}</div>
          <ul className={styles.fileUpload__list}>
            {fileList.map((file) => {
              const category = getFileCategory(file.mimeType, file.filename);
              const FileIcon = CATEGORY_ICONS[category] ?? RiFileFill;
              return (
                <li className={styles.fileUpload__item} key={file.id}>
                  <FileIcon aria-hidden className={styles.fileUpload__fileIcon} size={15} />
                  <button
                    className={styles.fileUpload__filename}
                    onClick={() => handleDownload(file)}
                  >
                    {file.filename}
                  </button>
                  <span className={styles.fileUpload__size}>{formatSize(file.size)}</span>
                  <button
                    aria-label={`${file.filename} を削除`}
                    className={styles.fileUpload__deleteButton}
                    onClick={() => handleDelete(file.id)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        dropArea
      )}
    </div>
  );
}

async function shareFile(url: string, filename: string, mimeType: string): Promise<boolean> {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }

  const blob = await (await fetch(url)).blob();
  const file = new File([blob], filename, { type: mimeType || blob.type });

  if (!navigator.canShare({ files: [file] })) return false;

  await navigator.share({ files: [file] });
  return true;
}
