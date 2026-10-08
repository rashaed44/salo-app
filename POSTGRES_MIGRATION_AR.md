# تحويل SALO إلى PostgreSQL

تم تحويل طبقة Drizzle من MySQL إلى PostgreSQL مع الحفاظ على أسماء الجداول والأعمدة ومسارات API.

## ما تم تغييره

- استخدام `pg` و`drizzle-orm/node-postgres`.
- تحويل `mysqlTable` إلى `pgTable`.
- تحويل `mysqlEnum` إلى PostgreSQL enum.
- تحويل الحقول الرقمية ذات الزيادة التلقائية إلى `serial`.
- تحويل `longtext` إلى `text`.
- تحويل `onDuplicateKeyUpdate` إلى `onConflictDoUpdate`.
- إضافة تهيئة آمنة للجداول والفهارس في `server/postgres-schema.ts`.
- إضافة Triggers للحفاظ على تحديث `updatedAt` تلقائياً.
- إزالة تشغيل migrations MySQL القديمة من أمر Render.

## إعداد Render

يجب أن يحتوي Web Service على متغير البيئة:

```text
DATABASE_URL=<Internal Database URL من قاعدة salo-db>
```

لا تضع كلمة المرور داخل GitHub أو ملفات المشروع.

عند تشغيل الخادم، يتم إنشاء الجداول الناقصة باستخدام `CREATE TABLE IF NOT EXISTS`. لا يتم حذف الجداول أو البيانات الموجودة.

## البيانات الموجودة في MySQL

هذا التحويل لا يحذف قاعدة MySQL الأصلية ولا ينقل بياناتها تلقائياً؛ نقل البيانات يحتاج رابط MySQL المصدر ونسخة احتياطية مؤكدة. قبل نقل بيانات حقيقية:

1. خذ Backup من MySQL.
2. تأكد أن PostgreSQL فارغة أو مخصصة للنقل.
3. انقل الجداول بنفس الأسماء والأعمدة.
4. تحقق من عدد الصفوف والمستخدمين والرسائل والستوريات.
5. اختبر تسجيل الدخول قبل تغيير التطبيق نهائياً.
6. لا تحذف MySQL حتى نجاح التحقق.

قاعدة Render PostgreSQL الجديدة ستكون جاهزة لتخزين الحسابات الجديدة بعد ضبط `DATABASE_URL`.
