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
}
export function emptyClassDraft(): ClassDraft {
  return { name: '', institutionName: '', independentEducator: false, courseCode: '', term: '', description: '', classId: '', ownerUid: '', schoolId: '' };
}
export function readClassDraft(storage: Pick<Storage, 'getItem'>): ClassDraft {
  const draft = emptyClassDraft();
  try {
    const saved = JSON.parse(storage.getItem(CLASS_DRAFT_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return draft;
    for (const key of Object.keys(draft) as (keyof ClassDraft)[]) {
      if (key === 'independentEducator') draft[key] = saved[key] === true;
      else if (typeof saved[key] === 'string') draft[key] = saved[key].slice(0, key === 'description' ? 3000 : 200);
    }
  } catch { /* A damaged or unavailable draft must not block setup. */ }
  return draft;
}
