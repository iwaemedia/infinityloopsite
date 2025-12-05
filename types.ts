export type AccessType = 'none' | 'trial' | 'full';

export interface Chapter {
  id: string; // unique identifier
  title: string;
  label?: string; // Short label for sidebar
  badge?: string;
  content: string; // Or filename if loading externally
  isLocked?: boolean; // Base lock state (overridden by license)
  section: 'front' | 'chapter' | 'back';
  chapterNumber: number; // 0 for front/back matter
}

export interface Book {
  title: string;
  frontMatter: Chapter[];
  chapters: Chapter[];
  backMatter: Chapter[];
}

export interface Bookmark {
  chapterId: string;
  progress: number;
  timestamp: string;
  label: string;
}

export interface ReadingProgress {
  currentChapterId: string;
  chapterProgress: number; // 0-100
  completedChapterIds: string[];
  totalChapters: number; // Count of actual numbered chapters
  bookmarks: Record<string, Bookmark>; // Map chapterId to bookmark
}

export interface UserState {
  email: string | null;
  name: string | null;
  accessType: AccessType;
  licenseKey: string | null;
  trialStartDate: string | null;
}
