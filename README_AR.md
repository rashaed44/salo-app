# SALO Flutter — النسخة التجريبية المستقلة

هذه نسخة Flutter مستقلة تم إنشاؤها دون حذف أو تعديل مشروع SALO الحالي.

- المشروع الأصلي محفوظ في `../dardshti_all_features_20260926`.
- Package ID التجريبي: `com.dardshti.salo_flutter`.
- لا توجد أي ترحيلات Database أو Firebase في هذه المرحلة.
- طبقة الشبكة مهيأة لاستخدام API الحالي عبر `SALO_API_BASE_URL`.
- طبقة التخزين تستخدم Secure Storage للجلسة وShared Preferences للتفضيلات.

تشغيل:

```bash
export PATH=/home/ubuntu/flutter/bin:$PATH
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```
