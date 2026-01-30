import { Attachment } from '../types/chat';

// File upload constants
export const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25MB

export function joinUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl) return path;
  const a = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const b = path.startsWith('/') ? path : `/${path}`;
  return `${a}${b}`;
}

export function buildUserContent(text: string, attachments: Attachment[]) {
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
}

export async function uploadAttachment(file: File, baseUrl: string | undefined): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(joinUrl(baseUrl, '/api/uploads'), {
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
}

export async function handleFileSelection(
  fileList: FileList | File[] | null,
  baseUrl: string | undefined,
  onError: (error: string) => void,
  onUploading: (uploading: boolean) => void
): Promise<Attachment[]> {
  if (!fileList) return [];
  
  const files = Array.isArray(fileList) ? fileList : Array.from(fileList);
  onUploading(true);

  const uploaded: Attachment[] = [];
  try {
    for (const file of files) {
      if (file.size > MAX_UPLOAD_SIZE) {
        onError(`"${file.name}" exceeds the ${(MAX_UPLOAD_SIZE / (1024 * 1024)).toFixed(0)}MB limit.`);
        continue;
      }

      try {
        const attachment = await uploadAttachment(file, baseUrl);
        uploaded.push(attachment);
      } catch (err: any) {
        console.error('Failed to upload attachment:', err);
        onError(String(err?.message ?? `Failed to upload ${file.name}`));
      }
    }

    return uploaded;
  } finally {
    onUploading(false);
  }
}
