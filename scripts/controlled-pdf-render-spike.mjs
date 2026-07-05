import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function runSpike() {
  console.log('🚀 Starting Controlled PDF rendering spike...');
  const startTime = Date.now();

  const syntheticHtml = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>تصدير مخطوطة تجريبية</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri&display=swap');
        body {
          font-family: 'Amiri', serif;
          margin: 40px;
          color: #333;
          line-height: 1.6;
        }
        h1 {
          text-align: center;
          color: #1b5e20;
        }
        .card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          background: #fafafa;
          page-break-inside: avoid;
        }
        .footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 10px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <h1>كتاب العائلة التجريبي</h1>
      <div class="card">
        <h2>أحمد بن محمد القحطاني</h2>
        <p>ولد في الرياض عام ١٣٩٠ هـ. له من الأولاد خمسة.</p>
      </div>
      <div class="card">
        <h2>فاطمة بنت عبد العزيز آل سعود</h2>
        <p>ولدت في مكة المكرمة عام ١٣٩٥ هـ. مراجع التوثيق: المصدر التاريخي الأول.</p>
      </div>
      <div class="footer">صفحة تجريبية - Jozor</div>
    </body>
    </html>
  `;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(syntheticHtml, { waitUntil: 'networkidle' });

    const outputPath = path.join(process.cwd(), 'tmp', 'synthetic_spike.pdf');
    // Ensure tmp exists
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
    });

    fs.writeFileSync(outputPath, pdfBuffer);
    const duration = Date.now() - startTime;
    console.log(`✅ PDF successfully generated!`);
    console.log(`📍 Path: ${outputPath}`);
    console.log(`📦 Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`⏱️ Duration: ${duration}ms`);
  } catch (error) {
    console.error('❌ Spike execution failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runSpike();
