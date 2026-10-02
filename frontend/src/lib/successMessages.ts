const MESSAGES_EN = [
  'Query Executed Flawlessly!',
  'System Hacked: Challenge Cleared!',
  'Level Up!',
  'Database Conquered!',
  'Syntax Mastery Achieved!',
  'Access Granted: Challenge Solved!',
  'Clean Execution. Zero Errors.',
  'You Out-Queried the Machine!',
  'Root Access to Victory!',
  'Another One Bytes the Dust!',
];

const MESSAGES_AR = [
  'تم تنفيذ الاستعلام بإتقان!',
  'تم اختراق النظام: التحدي مكتمل!',
  'ترقية المستوى!',
  'قاعدة البيانات تحت السيطرة!',
  'إتقان الصياغة البرمجية!',
  'تم منح الوصول: التحدي محلول!',
  'تنفيذ نظيف. صفر أخطاء.',
  'تفوّقت على الآلة بامتياز!',
  'وصول كامل إلى الانتصار!',
  'بايت آخر يسقط أمامك!',
];

export function getRandomSuccessMessage(locale: string): string {
  const pool = locale === 'ar' ? MESSAGES_AR : MESSAGES_EN;
  return pool[Math.floor(Math.random() * pool.length)];
}