Student Native FIX5
===================

نسخة Native كاملة كأساس اختبار، بدون WebView، مبنية بـ Kotlin + Jetpack Compose.
مرجع الواجهة والسلوك: Student-main الأصلي مع الحفاظ على ألوان Native وزر الرجوع الحالي.

أبرز FIX5:
- الرئيسية قريبة من تصميم Student الأصلي: الهيدر، القصص، المراحل، Student AI، Learn English، والإعلانات، مع Bottom Bar من 4 عناصر.
- كل بطاقات الرئيسية مربوطة بمسارات Native فعلية.
- Stories شاشة كاملة مع swipe يمين/يسار، progress، نص/صورة/فيديو، مشاهدة، ردود وتفاعلات وحذف المالك.
- ضغط الإشعار يدعم توجيه المستخدم إلى الرسائل/المتجر/القصص/التعليم/الملف/الأدمن/AI بحسب link/kind.
- Student AI + ترجمة ذكية عبر Supabase Edge Function، مع سجل، نسخ، ونطق American/British طبيعي/بطيء.
- Learn English ديناميكي من Supabase، مع seed لـ175 مفردة من بنك Student الأصلي، ونطق US/UK.
- إدارة التعليم: اختيار المرحلة/الصف أو الجامعة/الكلية/القسم/المرحلة، إضافة المواد وربطها، ثم إضافة الدروس.
- طلبات المدرسين تظهر للأدمن مع الاسم واليوزر والبريد والمرحلة والمادة والخبرة والملاحظة والتاريخ.
- الإعلانات: اختيار صورة Native ورفعها إلى home-ads، وإعلانات الرئيسية Pager متحرك وسحب يدوي.
- الاقتراحات = اقتراحات متابعة فعلية عبر student_get_profile_suggestions، مع Follow/Unfollow.
- شراء الألماس يعرض بيانات SuperQi، يطلب اسم المحول وآخر 4 أرقام فقط، ينشئ طلبًا على الخادم ويفتح WhatsApp بالتفاصيل.
- Reels غير موجودة حسب القرار السابق.
- Stable applicationId: com.studentiraq.app
- Beta: com.studentiraq.app.beta
- نسخة Beta مخصصة للاختبار وتثبت بجانب Stable، ولا تشاركها بيانات التطبيق المحلية.

قبل الاختبار الحقيقي:
1) نفّذ migrations الموجودة في supabase/migrations بالترتيب، وخصوصًا 20260822_student_native_fix5.sql.
2) Student AI لا يمكن أن يعمل من APK بشكل آمن بدون Backend. انشر supabase/functions/student-ai كـ Edge Function واضبط Secret باسم OPENAI_API_KEY (ويمكن OPENAI_MODEL اختياريًا). لا تضع مفتاح OpenAI داخل APK.
3) تأكد من إعداد Firebase Android النهائي حتى تعمل FCM عند إغلاق التطبيق.
4) ابنِ Stable Debug عبر GitHub Actions ثم اختبر الوظائف ضد Supabase الحالي/RLS/RPC.
5) لتسجيل Google: فعّل Google Provider في Supabase Authentication، وأضف `student://oauth-callback` إلى Redirect URLs المسموحة.

مهم: نجاح Gradle وحده لا يعني أن كل RPC/RLS في قاعدة الإنتاج متوافق؛ الاختبار على الجهاز هو الحكم النهائي.
