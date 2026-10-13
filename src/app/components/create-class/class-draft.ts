export const CLASS_DRAFT_KEY = 'gsl.class-setup.v1';
export interface ClassDraft {
  name: string;
  institutionName: string;
  independentEducator: boolean;
  courseCode: string;
  term: string;
  description: string;
  classId: string;
  ownerUid: string;
  schoolId: string;
  logoImage: string;
  coverImage: string;
}
export function emptyClassDraft(): ClassDraft {
  return { name: '', institutionName: '', independentEducator: false, courseCode: '', term: '', description: '', classId: '', ownerUid: '', schoolId: '', logoImage: '', coverImage: '' };
}
export function readClassDraft(storage: Pick<Storage, 'getItem'>): ClassDraft {
  const draft = emptyClassDraft();
  try {
    const saved = JSON.parse(storage.getItem(CLASS_DRAFT_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return draft;
    for (const key of Object.keys(draft) as (keyof ClassDraft)[]) {
      if (key === 'independentEducator') draft[key] = saved[key] === true;
      else if (key === 'logoImage' || key === 'coverImage') draft[key] = safeImageUrl(saved[key]);
      else if (typeof saved[key] === 'string') draft[key] = saved[key].slice(0, key === 'description' ? 3000 : 200);
    }
  } catch { /* A damaged or unavailable draft must not block setup. */ }
  return draft;
}

// Only images uploaded to this project's storage bucket are restored from a draft.
export function safeImageUrl(value: unknown): string {
  return typeof value === 'string' && value.length <= 2000 && value.startsWith('https://firebasestorage.googleapis.com/') ? value : '';
}
