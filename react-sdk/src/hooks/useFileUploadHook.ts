import { useState, useRef, useCallback } from 'react';
import { Attachment } from '../types/chat';
import { joinUrl } from '../utils/file-upload';
import { useHsafa } from '../providers/HsafaProvider';

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25MB

export function useFileUpload(baseUrl?: string) {
  const { baseUrl: providerBaseUrl } = useHsafa();
  const effectiveBaseUrl = baseUrl || providerBaseUrl || '';
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatBytes = useCallback((bytes: number) => {
    if (!bytes || Number.isNaN(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
  }, []);

  const uploadAttachment = useCallback(async (file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(joinUrl(effectiveBaseUrl, '/api/uploads'), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `Failed to upload ${file.name}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name || file.name,
      url: data.url,
      mimeType: data.mimeType || file.type || 'application/octet-stream',
      size: typeof data.size === 'number' ? data.size : file.size,
    };
  }, [effectiveBaseUrl]);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  }, []);

  const handleFileSelection = useCallback(async (fileList: FileList | File[] | null, setError: (error: string | null) => void) => {
    if (!fileList) return;
    const files = Array.isArray(fileList) ? fileList : Array.from(fileList);
    setError(null);
    setUploading(true);

    const uploaded: Attachment[] = [];
    try {
      for (const file of files) {
        if (file.size > MAX_UPLOAD_SIZE) {
          setError(`"${file.name}" exceeds the ${formatBytes(MAX_UPLOAD_SIZE)} limit.`);
          continue;
        }

        try {
          const attachment = await uploadAttachment(file);
          uploaded.push(attachment);
        } catch (err: any) {
          console.error('Failed to upload attachment:', err);
          setError(String(err?.message ?? `Failed to upload ${file.name}`));
        }
      }

      if (uploaded.length) {
        setAttachments(prev => [...prev, ...uploaded]);
      }
    } finally {
      setUploading(false);
    }
  }, [uploadAttachment, formatBytes]);

  const buildUserContent = useCallback((text: string, attachments: Attachment[]) => {
    const parts: any[] = [];
    const t = (text || '').trim();
    if (t) parts.push({ type: 'text', text: t });
    for (const a of (attachments || [])) {
      const mt = a.mimeType || 'application/octet-stream';
      if (mt.startsWith('image/')) {
        parts.push({ type: 'image', image: new URL(a.url), mediaType: mt });
      } else {
        parts.push({ type: 'file', data: a.url, mediaType: mt, name: a.name });
      }
    }
    return parts;
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  return {
    attachments,
    uploading,
    fileInputRef,
    formatBytes,
    handleRemoveAttachment,
    handleFileSelection,
    buildUserContent,
    clearAttachments,
    setAttachments,
    MAX_UPLOAD_SIZE
  };
}
