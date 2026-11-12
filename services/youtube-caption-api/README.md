# Student YouTube Caption API

خدمة FastAPI خفيفة تجلب مسارات YouTube بالترتيب التالي:

1. المسار الإنجليزي اليدوي.
2. المسار الإنجليزي التلقائي.
3. أي مسار يدوي متاح.
4. أي مسار تلقائي متاح.

لا تحتاج الخدمة إلى مفتاح YouTube API. استخدمها خلف HTTPS ومحدد معدل طلبات/Reverse Proxy في بيئة الإنتاج.

## التشغيل المحلي

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080
```

اختبار:

```bash
curl 'http://127.0.0.1:8080/v1/transcript?video_id=https%3A%2F%2Fyoutu.be%2FVIDEO_ID'
```

## Docker

```bash
docker build -t student-youtube-caption-api .
docker run --rm -p 8080:8080 student-youtube-caption-api
```

## ربط Android

ضع عنوان الخدمة العام في `StudentConfig.YOUTUBE_CAPTION_API_URL` مثل:

```kotlin
const val YOUTUBE_CAPTION_API_URL = "https://captions.example.com"
```

إذا بقي العنوان فارغًا، يستخدم التطبيق fallback المحلي الموجود في Android. هذا يمنع تعطل الميزة عند توقف الخدمة، لكنه لا يلغي قيود YouTube على الفيديوهات التي لا تملك أي مسار Caption أو تمنع الوصول الخارجي.
