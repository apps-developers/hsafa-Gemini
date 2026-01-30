export type TranslationKeys = {
  // Chat Header
  'header.maximize': string;
  'header.minimize': string;
  'header.new': string;
  'header.history': string;
  'header.close': string;
  
  // Chat Input
  'input.placeholder': string;
  'input.attachFiles': string;
  'input.insertLink': string;
  'input.send': string;
  'input.stop': string;
  'input.uploadingFiles': string;
  'input.previewImage': string;
  'input.removeFile': string;
  
  // Message Editor
  'editor.cancel': string;
  'editor.saveAndRegenerate': string;
  'editor.clickToEdit': string;
  
  // Message List
  'messages.empty': string;
  'messages.error': string;
  
  // Chat History
  'history.search': string;
  'history.noChatsFound': string;
  'history.untitledChat': string;
  'history.deleteChat': string;
  
  // General
  'general.agent': string;
};

export type Translations = {
  [K in keyof TranslationKeys]: string;
};

export const translations: Record<string, Translations> = {
  en: {
    // Chat Header
    'header.maximize': 'Maximize',
    'header.minimize': 'Minimize',
    'header.new': 'New',
    'header.history': 'History',
    'header.close': 'Close chat',
    
    // Chat Input
    'input.placeholder': 'Ask your question...',
    'input.attachFiles': 'Attach files',
    'input.insertLink': 'Insert link',
    'input.send': 'Send',
    'input.stop': 'Stop',
    'input.uploadingFiles': 'Uploading files...',
    'input.previewImage': 'Preview image',
    'input.removeFile': 'Remove file',
    
    // Message Editor
    'editor.cancel': 'Cancel',
    'editor.saveAndRegenerate': 'Save & Regenerate',
    'editor.clickToEdit': 'Click to edit',
    
    // Message List
    'messages.empty': 'Start by sending a message to the agent.',
    'messages.error': 'An error occurred',
    
    // Chat History
    'history.search': 'Search',
    'history.noChatsFound': 'No chats found.',
    'history.untitledChat': 'Untitled chat',
    'history.deleteChat': 'Delete chat',
    
    // General
    'general.agent': 'Agent',
  },
  
  ar: {
    // Chat Header
    'header.maximize': 'تكبير',
    'header.minimize': 'تصغير',
    'header.new': 'جديد',
    'header.history': 'السجل',
    'header.close': 'إغلاق المحادثة',
    
    // Chat Input
    'input.placeholder': 'اطرح سؤالك...',
    'input.attachFiles': 'إرفاق ملفات',
    'input.insertLink': 'إدراج رابط',
    'input.send': 'إرسال',
    'input.stop': 'إيقاف',
    'input.uploadingFiles': 'جاري رفع الملفات...',
    'input.previewImage': 'معاينة الصورة',
    'input.removeFile': 'حذف الملف',
    
    // Message Editor
    'editor.cancel': 'إلغاء',
    'editor.saveAndRegenerate': 'حفظ وإعادة توليد',
    'editor.clickToEdit': 'انقر للتعديل',
    
    // Message List
    'messages.empty': 'ابدأ بإرسال رسالة إلى الوكيل.',
    'messages.error': 'حدث خطأ',
    
    // Chat History
    'history.search': 'بحث',
    'history.noChatsFound': 'لم يتم العثور على محادثات.',
    'history.untitledChat': 'محادثة بدون عنوان',
    'history.deleteChat': 'حذف المحادثة',
    
    // General
    'general.agent': 'الوكيل',
  },
};

export type SupportedLanguage = 'en' | 'ar';

export function getTranslation(
  lang: SupportedLanguage,
  key: keyof TranslationKeys
): string {
  return translations[lang]?.[key] || translations['en'][key] || key;
}
