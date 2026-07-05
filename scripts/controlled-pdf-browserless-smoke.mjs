import fs from 'fs';
import path from 'path';

async function runSmoke() {
  console.log('🚀 Starting Controlled PDF Browserless Synthetic Smoke Test...');

  const token = process.env.BROWSERLESS_TOKEN;
  const endpoint = process.env.BROWSERLESS_ENDPOINT || 'https://chrome.browserless.io/pdf';

  if (!token || !token.trim()) {
    console.log('⚠️ BROWSERLESS_TOKEN is not set in the environment.');
    console.log('⏭️ Skipping remote Browserless API request. Smoke test marked as SKIPPED.');
    process.exit(0);
  }

  const startTime = Date.now();
  const syntheticHtml = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>مخطوط تجريبي لتفعيل PDF المنظم</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri&display=swap');
        @page {
          size: A4;
          margin: 20mm;
        }
        body {
          font-family: 'Amiri', serif;
          color: #111;
          line-height: 1.8;
          font-size: 14px;
        }
        h1 {
          text-align: center;
          color: #1a237e;
          font-size: 24px;
          margin-bottom: 30px;
        }
        p {
          text-align: justify;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 8px 12px;
          text-align: right;
        }
        th {
          background-color: #f5f5f5;
        }
      </style>
    </head>
    <body>
      <h1>تقرير فحص التفعيل لـ Controlled PDF</h1>
      <p>هذا المستند عبارة عن نسخة تجريبية يتم إنشاؤها للتحقق من سلامة فحص الاتصال الخارجي بـ Browserless. لا يحتوي هذا الملف على أي معلومات عائلية حقيقية أو بيانات شخصية حساسة.</p>
      
      <table>
        <thead>
          <tr>
            <th>الرقم</th>
            <th>الوصف</th>
            <th>الحالة المتوقعة</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>١</td>
            <td>علم الميزة مفعّل (VITE_ENABLE_CONTROLLED_PDF)</td>
            <td>نعم</td>
          </tr>
          <tr>
            <td>٢</td>
            <td>رمز المصادقة مهيأ (BROWSERLESS_TOKEN)</td>
            <td>نعم</td>
          </tr>
          <tr>
            <td>٣</td>
            <td>رندرة ملف PDF واسترجاعه كـ Blob</td>
            <td>نعم</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  try {
    console.log(`🌐 Dispatching request to ${endpoint}...`);
    const response = await fetch(`${endpoint}?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: syntheticHtml,
        options: {
          printBackground: true,
          format: 'A4',
          preferCSSPageSize: true,
          margin: {
            top: '20mm',
            bottom: '20mm',
            left: '15mm',
            right: '15mm',
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Upstream returned status ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf')) {
      throw new Error(`Invalid content type returned: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new Error('Received an empty PDF buffer');
    }

    const outputPath = path.join(process.cwd(), 'tmp', 'controlled_pdf_synthetic_smoke.pdf');
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    fs.writeFileSync(outputPath, buffer);
    const duration = Date.now() - startTime;

    console.log('✅ Controlled PDF synthetic smoke test PASSED!');
    console.log(`📍 Output written to: ${outputPath}`);
    console.log(`📦 Size: ${(buffer.length / 1024).toFixed(2)} KB`);
    console.log(`⏱️ Duration: ${duration}ms`);
  } catch (error) {
    console.error('❌ Controlled PDF synthetic smoke test FAILED:', error.message);
    process.exit(1);
  }
}

runSmoke();
