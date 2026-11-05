// 好寄 UI 冒煙測試（Playwright）
// 涵蓋「零基礎學員 1 小時劇本」的 UI 關鍵步驟：
//   /login 渲染 → 建密碼流程 → /admin 四頁籤+設定頁渲染 → 前台著陸頁訂閱表單
// 注意：此測試對本機 wrangler dev（預設 127.0.0.1:8787）執行；DB 為本機 D1。
// 執行：node tests/e2e-smoke.mjs
import { chromium } from '/opt/homebrew/lib/node_modules/omniroute/node_modules/playwright/index.mjs';

const BASE = process.env.HAOJI_BASE || 'http://127.0.0.1:8787';
const PASSWORD = 'e2e-pass-12345';
const results = [];
const check = (name, ok) => { results.push([name, ok]); console.log((ok ? '✓' : '✗') + ' ' + name); };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

// 1. 未登入 /admin → 導向 /login
await page.goto(BASE + '/admin');
await page.waitForURL('**/login', { timeout: 8000 });
check('未登入訪問 /admin 導向 /login', page.url().includes('/login'));

// 2. 密碼狀態自適應：已設定→直接登入；未設定→登入失敗自動切建密碼模式
await page.fill('#password', PASSWORD);
await page.click('#loginForm button[type="submit"]');
const authState = await Promise.race([
  page.waitForURL('**/admin', { timeout: 8000 }).then(() => 'logged-in'),
  page.waitForSelector('#setupForm:not(.hidden)', { timeout: 8000 }).then(() => 'setup'),
]);
check('登入狀態辨識（' + authState + '）', ['logged-in', 'setup'].includes(authState));

// 3. 若未建密碼：建立密碼 → 進後台
if (authState === 'setup') {
  await page.fill('#newPassword', PASSWORD);
  await page.fill('#confirmPassword', PASSWORD);
  await page.click('#setupForm button[type="submit"]');
  await page.waitForURL('**/admin', { timeout: 8000 });
}
check('進入 /admin', page.url().includes('/admin'));

// 4. 五個頁籤皆可切換
for (const tab of ['contacts', 'campaigns', 'automations', 'settings', 'dashboard']) {
  await page.click('#tab-btn-' + tab);
  await page.waitForTimeout(300);
  const visible = await page.evaluate(t => !document.getElementById('tab-' + t).classList.contains('hidden'), tab);
  check('頁籤切換：' + tab, visible);
}

// 5. 設定頁：切過去 → 填欄位 → 存檔
await page.click('#tab-btn-settings');
await page.waitForTimeout(500);
await page.fill('#set-site_domain', 'e2e.example.com');
await page.fill('#set-landing_title', 'E2E 測試電子報');
await page.click('#tab-settings button:has-text("儲存")');
await page.waitForTimeout(600);
const msg = await page.evaluate(() => document.getElementById('settings-msg')?.textContent || '');
check('設定存檔回饋', msg.includes('已儲存'));

// 6. 名單頁：匯出按鈕存在、動態標籤選單存在
await page.click('#tab-btn-contacts');
await page.waitForTimeout(500);
check('匯出 CSV 按鈕存在', (await page.$('text=匯出')) !== null);
check('匯入按鈕存在', (await page.$('text=匯入')) !== null);

// 7. 前台著陸頁：訂閱表單可用
await page.goto(BASE + '/');
const hasForm = await page.evaluate(() => !!document.querySelector('form, input[type="email"]'));
check('前台著陸頁訂閱表單存在', hasForm);

check('全程無 JS 錯誤', errors.length === 0);
if (errors.length) console.log('JS errors:', errors.slice(0, 3));

await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(`\n${results.length - failed}/${results.length} 通過`);
process.exit(failed ? 1 : 0);
