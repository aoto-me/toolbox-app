import { describe, expect, it } from 'vitest';
import { ALLOWED_EXTENSIONS, getFileCategory, validateFile } from './file-types';

describe('ALLOWED_EXTENSIONS', () => {
  it('主要な拡張子が含まれている', () => {
    const expected = ['jpg', 'png', 'pdf', 'mp4', 'zip', 'csv', 'txt'];
    for (const ext of expected) {
      expect(ALLOWED_EXTENSIONS.has(ext)).toBe(true);
    }
  });
});

describe('validateFile', () => {
  it('許可された拡張子とMIMEタイプならnullを返す', () => {
    expect(validateFile('photo.jpg', 'image/jpeg')).toBeNull();
    expect(validateFile('doc.pdf', 'application/pdf')).toBeNull();
    expect(validateFile('data.csv', 'text/csv')).toBeNull();
  });

  it('複数のMIMEタイプが許可されている拡張子でも正しく判定する', () => {
    expect(validateFile('data.csv', 'text/csv')).toBeNull();
    expect(validateFile('data.csv', 'application/csv')).toBeNull();
    expect(validateFile('data.csv', 'text/plain')).toBeNull();
  });

  it('大文字の拡張子でも判定できる', () => {
    expect(validateFile('PHOTO.JPG', 'image/jpeg')).toBeNull();
    expect(validateFile('image.PNG', 'image/png')).toBeNull();
  });

  it('許可されていない拡張子はエラーメッセージを返す', () => {
    const result = validateFile('virus.exe', 'application/x-msdownload');
    expect(result).toBe('exe はアップロードできません');
  });

  it('許可された拡張子でもMIMEタイプが不正ならエラーメッセージを返す', () => {
    const result = validateFile('image.jpg', 'text/plain');
    expect(result).toBe('このファイル形式はサポートされていません (text/plain)');
  });

  it('拡張子がないファイルはエラーメッセージを返す', () => {
    const result = validateFile('noextension', 'application/octet-stream');
    expect(result).not.toBeNull();
  });

  it('ドットが複数あるファイル名は最後の拡張子で判定する', () => {
    expect(validateFile('archive.tar.zip', 'application/zip')).toBeNull();
    expect(validateFile('my.photo.jpg', 'image/jpeg')).toBeNull();
  });
});

describe('getFileCategory', () => {
  it('SVGはIMGより優先される', () => {
    expect(getFileCategory('image/svg+xml')).toBe('SVG');
  });

  it('画像MIMEタイプはIMGを返す', () => {
    expect(getFileCategory('image/jpeg')).toBe('IMG');
    expect(getFileCategory('image/png')).toBe('IMG');
  });

  it('動画MIMEタイプはVIDを返す', () => {
    expect(getFileCategory('video/mp4')).toBe('VID');
  });

  it('音声MIMEタイプはAUDIOを返す', () => {
    expect(getFileCategory('audio/mpeg')).toBe('AUDIO');
  });

  it('3DモデルMIMEタイプは3Dを返す', () => {
    expect(getFileCategory('model/gltf-binary')).toBe('3D');
  });

  it('PDFはPDFを返す', () => {
    expect(getFileCategory('application/pdf')).toBe('PDF');
  });

  it('JSONはJSONを返す', () => {
    expect(getFileCategory('application/json')).toBe('JSON');
  });

  it('HTMLはHTMLを返す', () => {
    expect(getFileCategory('text/html')).toBe('HTML');
  });

  it('MarkdownはMDを返す', () => {
    expect(getFileCategory('text/markdown')).toBe('MD');
    expect(getFileCategory('text/x-markdown')).toBe('MD');
  });

  it('XMLはXMLを返す', () => {
    expect(getFileCategory('text/xml')).toBe('XML');
    expect(getFileCategory('application/xml')).toBe('XML');
  });

  it('YAMLはYAMLを返す', () => {
    expect(getFileCategory('text/yaml')).toBe('YAML');
    expect(getFileCategory('text/x-yaml')).toBe('YAML');
  });

  it('アーカイブ系はZIPを返す', () => {
    expect(getFileCategory('application/zip')).toBe('ZIP');
    expect(getFileCategory('application/x-7z-compressed')).toBe('ZIP');
    expect(getFileCategory('application/x-rar-compressed')).toBe('ZIP');
  });

  it('Office系はそれぞれのカテゴリを返す', () => {
    expect(getFileCategory('application/vnd.ms-excel')).toBe('XLS');
    expect(getFileCategory('application/vnd.ms-powerpoint')).toBe('PPT');
    expect(getFileCategory('application/msword')).toBe('DOC');
  });

  it('Photoshop MIMEはphotoshopを含むapplication系でPSDを返す', () => {
    expect(getFileCategory('application/photoshop')).toBe('PSD');
  });

  it('image/で始まるPhotoshop MIMEはIMGとして扱われる', () => {
    expect(getFileCategory('image/vnd.adobe.photoshop')).toBe('IMG');
  });

  it('PostScriptはAIを返す', () => {
    expect(getFileCategory('application/postscript')).toBe('AI');
  });

  it('曖昧なMIMEでも拡張子で3Dファイルを判定する', () => {
    expect(getFileCategory('application/octet-stream', 'model.fbx')).toBe('3D');
    expect(getFileCategory('application/octet-stream', 'scene.blend')).toBe('3D');
  });

  it('曖昧なMIMEでも拡張子でデザインファイルを判定する', () => {
    expect(getFileCategory('application/octet-stream', 'design.xd')).toBe('XD');
    expect(getFileCategory('application/octet-stream', 'layout.indd')).toBe('INDD');
    expect(getFileCategory('application/octet-stream', 'image.psd')).toBe('PSD');
  });

  it('MIMEも拡張子も不明ならFILEを返す', () => {
    expect(getFileCategory('application/octet-stream')).toBe('FILE');
    expect(getFileCategory('application/octet-stream', 'data.bin')).toBe('FILE');
  });
});
