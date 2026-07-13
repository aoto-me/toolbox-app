export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  '3ds': ['application/octet-stream'],
  '7z': ['application/x-7z-compressed'],
  aac: ['audio/aac'],
  ai: ['application/postscript', 'application/illustrator', 'application/octet-stream'],
  aiff: ['audio/aiff', 'audio/x-aiff'],
  avi: ['video/x-msvideo', 'video/avi'],
  blend: ['application/octet-stream'],
  bmp: ['image/bmp'],
  csv: ['text/csv', 'application/csv', 'text/plain'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  eps: ['application/postscript', 'application/eps', 'application/octet-stream'],
  fbx: ['application/octet-stream'],
  flac: ['audio/flac', 'audio/x-flac'],
  gif: ['image/gif'],
  glb: ['model/gltf-binary'],
  gltf: ['model/gltf+json'],
  htm: ['text/html'],
  html: ['text/html'],
  indd: ['application/x-indesign', 'application/octet-stream'],
  jpeg: ['image/jpeg'],
  jpg: ['image/jpeg'],
  json: ['application/json', 'text/plain'],
  m4a: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
  md: ['text/markdown', 'text/plain', 'text/x-markdown'],
  mkv: ['video/x-matroska', 'video/mkv'],
  mov: ['video/quicktime', 'video/mp4'],
  mp3: ['audio/mpeg'],
  mp4: ['video/mp4'],
  obj: ['model/obj', 'application/octet-stream'],
  ogg: ['audio/ogg'],
  pdf: ['application/pdf'],
  png: ['image/png'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  psd: [
    'image/vnd.adobe.photoshop',
    'image/x-photoshop',
    'application/photoshop',
    'application/octet-stream',
  ],
  py: ['text/x-python', 'text/plain', 'application/x-python-code'],
  rar: ['application/x-rar-compressed', 'application/vnd.rar', 'application/octet-stream'],
  stl: ['model/stl', 'application/sla', 'application/octet-stream'],
  svg: ['image/svg+xml'],
  tiff: ['image/tiff'],
  txt: ['text/plain'],
  wav: ['audio/wav', 'audio/x-wav'],
  webm: ['video/webm'],
  webp: ['image/webp'],
  xd: ['application/octet-stream'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  xml: ['text/xml', 'application/xml'],
  yaml: ['text/yaml', 'text/x-yaml', 'application/x-yaml', 'text/plain'],
  yml: ['text/yaml', 'text/x-yaml', 'application/x-yaml', 'text/plain'],
  zip: ['application/zip', 'application/x-zip-compressed', 'application/x-zip'],
};

export const ALLOWED_EXTENSIONS = new Set(Object.keys(ALLOWED_FILE_TYPES));

export function getFileCategory(mimeType: string, filename?: string): string {
  const ext = filename?.split('.').pop()?.toLowerCase();

  if (mimeType === 'image/svg+xml') return 'SVG';
  if (mimeType.startsWith('image/')) return 'IMG';
  if (mimeType.startsWith('video/')) return 'VID';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.startsWith('model/')) return '3D';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'application/json') return 'JSON';
  if (mimeType === 'text/html') return 'HTML';
  if (mimeType === 'text/markdown' || mimeType === 'text/x-markdown') return 'MD';
  if (mimeType === 'text/xml' || mimeType === 'application/xml') return 'XML';
  if (mimeType === 'text/yaml' || mimeType === 'text/x-yaml' || mimeType === 'application/x-yaml')
    return 'YAML';
  if (mimeType === 'application/x-7z-compressed') return 'ZIP';
  if (mimeType === 'application/x-rar-compressed' || mimeType === 'application/vnd.rar')
    return 'ZIP';
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('ms-excel')
  )
    return 'XLS';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPT';
  if (
    mimeType.includes('word') ||
    mimeType.includes('msword') ||
    mimeType.includes('wordprocessing')
  )
    return 'DOC';
  if (mimeType.includes('zip')) return 'ZIP';
  if (mimeType.includes('photoshop')) return 'PSD';
  if (mimeType === 'application/postscript') return 'AI';
  if (mimeType.includes('indesign')) return 'INDD';
  if (mimeType.includes('python') || mimeType === 'text/x-python') return 'PY';

  if (ext) {
    if (['3ds', 'blend', 'fbx', 'glb', 'gltf', 'obj', 'stl'].includes(ext)) return '3D';
    if (ext === 'xd') return 'XD';
    if (ext === 'ai' || ext === 'eps') return 'AI';
    if (ext === 'indd') return 'INDD';
    if (ext === 'psd') return 'PSD';
    if (ext === 'json') return 'JSON';
    if (ext === 'svg') return 'SVG';
    if (ext === 'md') return 'MD';
    if (ext === 'html' || ext === 'htm') return 'HTML';
    if (ext === 'txt') return 'TXT';
    if (ext === 'xml') return 'XML';
    if (ext === 'yaml' || ext === 'yml') return 'YAML';
    if (ext === 'rar' || ext === '7z') return 'ZIP';
  }

  return 'FILE';
}

export function validateFile(filename: string, mimeType: string): null | string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const allowed = ALLOWED_FILE_TYPES[ext];
  if (!allowed) return `${ext || 'このファイル'} はアップロードできません`;
  if (!allowed.includes(mimeType)) return `このファイル形式はサポートされていません (${mimeType})`;
  return null;
}
