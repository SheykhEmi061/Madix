# مادیکس | Madix Security Dashboard

داشبورد استاتیک مادیکس، نمایی راست‌به‌چپ برای بررسی وضعیت امنیت مخازن نرم‌افزاری است. این پروژه با HTML، CSS و JavaScript خالص ساخته شده و برای GitHub Pages و میزبانی استاتیک آماده است.

## امکانات

- رابط فارسی و راست‌به‌چپ با فونت Vazirmatn
- طراحی واکنش‌گرا با تم تیره و تأکیدهای بنفش
- امتیاز امنیت، نمودار ریسک و خلاصه آخرین اسکن
- فهرست مخازن با جست‌وجو و فیلتر ریسک
- خط زمانی فعالیت‌های امنیتی
- تنظیمات نمایشی برای MFA، هشدارها و اسکن روزانه؛ وضعیت این گزینه‌ها در مرورگر ذخیره می‌شود
- منوی موبایل، خروجی گزارش متنی، اعلان‌ها و پشتیبانی از کاهش حرکت

## اجرا در محیط محلی

هیچ وابستگی یا مرحله ساختی لازم نیست. فایل `index.html` را باز کنید یا از پوشه پروژه یک وب‌سرور استاتیک اجرا کنید:

```bash
python -m http.server 8000
```

سپس به `http://localhost:8000` بروید. برای بارگذاری فونت Vazirmatn، مرورگر به اینترنت نیاز دارد؛ در حالت آفلاین فونت جایگزین سیستم استفاده می‌شود.

## انتشار در GitHub Pages

1. در تنظیمات مخزن، بخش **Pages** را باز کنید.
2. منبع را روی **Deploy from a branch** قرار دهید.
3. شاخه `main` و پوشه `/ (root)` را انتخاب کنید و ذخیره کنید.
4. پس از انتشار، نشانی Pages مخزن را باز کنید.

پروژه از مسیرهای نسبی استفاده می‌کند و نیازی به build، Node.js یا فریم‌ورک ندارد.

## ربات تلگرام و اتصال به GitHub

بخش `worker/` یک ربات بدون سرور دائمی است که روی Cloudflare Workers اجرا می‌شود و از آدرس رایگان `workers.dev` برای Webhook استفاده می‌کند. وابستگی اجرایی ندارد. Worker پیام‌های خصوصی مجاز را می‌پذیرد و این فرمان‌ها را ارائه می‌کند: `/repos`، `/repo`، `/issues`، `/prs`، `/commits`، `/help` و `/id`.

### راه‌اندازی

1. یک حساب Cloudflare بسازید و Wrangler را در رایانه خود اجرا کنید:

   ```bash
   npx wrangler login
   npx wrangler deploy --config worker/wrangler.jsonc
   ```

2. توکن تازه‌شده ربات را در BotFather بگیرید. توکن را در کد، مخزن، Issue یا گفتگو قرار ندهید. آن را مستقیماً در ورودی امن Wrangler ثبت کنید:

   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN --config worker/wrangler.jsonc
   ```

3. دو مقدار تصادفی طولانی بسازید و با Wrangler به‌عنوان Secret ثبت کنید: `TELEGRAM_WEBHOOK_SECRET` و `SETUP_SECRET`. مقدار Webhook فقط باید شامل حروف انگلیسی، عدد، خط تیره یا زیرخط باشد.

   ```bash
   npx wrangler secret put TELEGRAM_WEBHOOK_SECRET --config worker/wrangler.jsonc
   npx wrangler secret put SETUP_SECRET --config worker/wrangler.jsonc
   ```

4. اگر مخزن خصوصی است، یک Fine-grained GitHub token فقط‌خواندنی و محدود به همان مخزن بسازید؛ دسترسی‌های **Issues: Read**، **Pull requests: Read** و **Contents: Read** کافی هستند. آن را به‌عنوان `GITHUB_TOKEN` ثبت کنید. برای مخزن عمومی مادیکس این Secret لازم نیست.

5. دوباره Worker را منتشر کنید تا Secretها فعال شوند. در Cloudflare، نشانی Worker را ببینید؛ شکل آن `https://madix-telegram-bot.<subdomain>.workers.dev` است.

6. در PowerShell، Secret راه‌اندازی را به‌صورت ورودی پنهان وارد و Webhook را ثبت کنید:

   ```powershell
   $secureSetupSecret = Read-Host "SETUP_SECRET" -AsSecureString
   $setupSecret = [System.Net.NetworkCredential]::new("", $secureSetupSecret).Password
   Invoke-RestMethod -Method Post -Uri "https://madix-telegram-bot.<subdomain>.workers.dev/setup" -Headers @{ Authorization = "Bearer $setupSecret" }
   ```

7. به ربات در گفت‌وگوی خصوصی `/id` بفرستید. شناسه‌ای که برمی‌گرداند را با `npx wrangler secret put ALLOWED_TELEGRAM_USER_IDS --config worker/wrangler.jsonc` ثبت کنید؛ برای چند کاربر، شناسه‌ها را با ویرگول جدا کنید.

فرمان‌های مخزن خصوصی فقط در گفت‌وگوی خصوصی و برای شناسه‌های allowlistشده اجرا می‌شوند. برای محافظت از توکن، آن را revoke/rotate کنید اگر در چت یا جایی عمومی ارسال شده است. `workers.dev` نشانی عمومی است؛ Secret راه‌اندازی و Secret هدر Webhook از دسترسی غیرمجاز به endpointهای مدیریتی جلوگیری می‌کنند.

Cloudflare Worker جایگزین یک VPS است، اما به ایجاد حساب Cloudflare و انتشار اولیه از دستگاه شما نیاز دارد. پلن رایگان فعلی محدودیت روزانه دارد؛ برای استفاده شخصی معمولاً کافی است. [محدودیت‌های Workers](https://developers.cloudflare.com/workers/platform/limits/) و [راهنمای workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

## ساختار پروژه

```text
.
├── index.html
├── assets/
│   ├── css/style.css
│   └── js/app.js
├── README.md
├── SECURITY.md
└── .gitignore
```

## داده‌های داشبورد

اعداد، مخازن، نام‌ها و رویدادهای فعلی داده‌های نمونه برای نمایش رابط هستند. دکمه اسکن وضعیت اجرای نمایشی را نشان می‌دهد و به سامانه اسکن واقعی متصل نیست. برای استفاده عملیاتی، داده‌ها و اجرای اسکن باید به API مورد اعتماد متصل شوند؛ هیچ راز، توکن یا کلید دسترسی را در فایل‌های استاتیک قرار ندهید.

## مجوز

در این مخزن مجوز نرم‌افزاری مشخصی تعریف نشده است. پیش از استفاده مجدد یا انتشار مشتق‌شده، مجوز پروژه را تعیین کنید.
