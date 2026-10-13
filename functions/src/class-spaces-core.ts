export interface ClassSetup {
  classId: string;
  name: string;
  institutionName: string;
  independentEducator: boolean;
  courseCode: string;
  term: string;
  description: string;
  schoolId: string;
}

export function parseClassSetup(input: unknown): ClassSetup {
  if (!input || typeof input !== 'object') throw new Error('Please enter your class details.');
  const data = input as Record<string, unknown>;
  const text = (key: string, max: number, required = false): string => {
    const value = typeof data[key] === 'string' ? (data[key] as string).trim() : '';
    if ((required && !value) || value.length > max) throw new Error(`Please check ${key === 'name' ? 'the class name' : key === 'institutionName' ? 'the school or university name' : key}.`);
    return value;
  };
  const classId = text('classId', 20, true);
  if (!/^[a-zA-Z0-9]{20}$/.test(classId)) throw new Error('Please restart class setup.');
  const independentEducator = data.independentEducator === true;
  return {
    classId, independentEducator,
    name: text('name', 140, true),
    institutionName: independentEducator ? '' : text('institutionName', 180, true),
    courseCode: text('courseCode', 40), term: text('term', 80),
    description: text('description', 3000), schoolId: text('schoolId', 100),
  };
}

export function canReadClassSpace(page: Record<string, any>, uid = '', email = '', platformAdmin = false): boolean {
  if (page.classSetupVersion !== 1 || page.isPrivate !== true) return true;
  if (!uid) return false;
  const member = (values: unknown) => Array.isArray(values) && values.includes(email.toLowerCase());
  return platformAdmin || page.authorId === uid ||
    (Array.isArray(page.adminUids) && page.adminUids.includes(uid)) ||
    member(page.adminEmails) || member(page.participants);
}
