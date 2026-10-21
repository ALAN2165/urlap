'use client';

import { useLocale } from 'next-intl';

const en = {
  yourOutput: 'Your output',
  expectedOutput: 'Expected output',
  compareHint: 'Red rows are in your result but not expected. Amber rows are expected but missing from yours.',
  rowsShown: 'Showing the first {shown} of {total} rows',
  noRows: 'No rows',
  reasonStructure: "The objects you created don't match what's expected. Compare the tables below: names, data types, constraints and sequences all count.",
  reasonCommit: "Your changes are correct, but they weren't saved permanently. Finish the transaction with COMMIT.",
  bossLabel: 'Master Challenge',
  finalTrial: 'Final trial',
  bossRevealTitle: 'A final trial has appeared',
  bossRevealBody: 'You conquered every challenge in this lab. One last trial awaits the worthy.',
  bossCta: 'Enter the trial',
  bossConquered: 'Conquered',
  bossIntro: 'Only those who cleared the whole lab ever see this challenge.',
  bossVictory: 'MASTER CHALLENGE CONQUERED',
  bossVictoryBody: 'You have cleared every trial in this lab. Legendary work.',
  draftSaved: 'Draft saved',
  resetCode: 'Reset',
  resetConfirm: 'Discard your saved draft and restore the starter code?',
  draftRestored: 'Your saved draft was restored.',
};

const ar: Record<keyof typeof en, string> = {
  yourOutput: 'مخرجاتك',
  expectedOutput: 'المخرجات المتوقعة',
  compareHint: 'الصفوف الحمراء موجودة في نتيجتك وغير متوقعة، والصفوف البرتقالية متوقعة لكنها غير موجودة في نتيجتك.',
  rowsShown: 'عرض أول {shown} من أصل {total} صف',
  noRows: 'لا توجد صفوف',
  reasonStructure: 'العناصر التي أنشأتها لا تطابق المطلوب. قارن الجداول أدناه: الأسماء وأنواع البيانات والقيود والمتسلسلات كلها مهمة.',
  reasonCommit: 'تغييراتك صحيحة لكنها لم تُحفظ بشكل دائم. أنهِ المعاملة بالأمر COMMIT.',
  bossLabel: 'التحدي الأعظم',
  finalTrial: 'الاختبار الأخير',
  bossRevealTitle: 'ظهر اختبار أخير',
  bossRevealBody: 'لقد أتممت جميع تحديات هذا المعمل. بقي اختبار أخير ينتظر المستحقين.',
  bossCta: 'ادخل الاختبار',
  bossConquered: 'تم قهره',
  bossIntro: 'لا يرى هذا التحدي إلا من أتمّ المعمل بأكمله.',
  bossVictory: 'تم قهر التحدي الأعظم',
  bossVictoryBody: 'لقد أنهيت جميع اختبارات هذا المعمل. عمل أسطوري.',
  draftSaved: 'تم حفظ المسودة',
  resetCode: 'إعادة تعيين',
  resetConfirm: 'هل تريد حذف المسودة المحفوظة واستعادة الكود الابتدائي؟',
  draftRestored: 'تمت استعادة مسودتك المحفوظة.',
};

export type ExtraKey = keyof typeof en;

export function useExtra() {
  const locale = useLocale();
  const table: Record<string, string> = locale === 'ar' ? ar : en;
  return (key: ExtraKey, vars?: Record<string, string | number>): string => {
    let s = table[key] || key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.replace(`{${k}}`, String(vars[k])); });
    return s;
  };
}