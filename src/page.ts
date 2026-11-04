/**
 * 乾淨極簡的淺色訂閱著陸頁 (Landing Page)
 */
export function renderLandingPage(): Response {
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>電子報訂閱</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif; }
  </style>
</head>
<body class="bg-[#fcfbf9] text-[#1c1917] flex flex-col min-h-screen antialiased">
  <header class="w-full max-w-4xl mx-auto py-5 px-6 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded bg-stone-900 text-white flex items-center justify-center font-mono font-bold text-xs">
        CF
      </div>
      <span class="font-semibold text-sm text-stone-900 tracking-tight">Autoresponder</span>
    </div>
    <a href="/login" class="text-xs font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-lg transition shadow-2xs">
      管理員登入
    </a>
  </header>

  <div class="flex-1 flex items-center justify-center px-4 py-8">
  <main class="max-w-md w-full bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-stone-200/80">
    <!-- Header -->
    <div class="mb-6">
      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-medium mb-3">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        免費電子信
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-stone-900 mb-2">免費領取實用教學</h1>
      <p class="text-stone-600 text-sm leading-relaxed">
        填寫 Email 即可立刻收到第一封信。接下來幾天，我們會把最實用的經驗直接寄到你的信箱，隨時都能一鍵退訂。
      </p>
    </div>

    <!-- Form -->
    <form id="subscribeForm" class="space-y-4">
      <div>
        <label for="name" class="block text-xs font-semibold text-stone-700 mb-1.5">稱呼 / 姓名</label>
        <input 
          type="text" 
          id="name" 
          name="name" 
          placeholder="王小明" 
          class="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
        />
      </div>
      <!-- Honeypot (防機器人蜜罐欄位) -->
      <div style="display:none;" aria-hidden="true">
        <label for="hp_company">Company</label>
        <input type="text" id="hp_company" name="hp_company" tabindex="-1" autocomplete="off" />
      </div>
      <div>
        <label for="email" class="block text-xs font-semibold text-stone-700 mb-1.5">Email 電子信箱 <span class="text-rose-500">*</span></label>
        <input 
          type="email" 
          id="email" 
          name="email" 
          required 
          placeholder="you@example.com" 
          class="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
        />
      </div>

      <button 
        type="submit" 
        id="submitBtn" 
        class="w-full bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white font-medium py-2.5 rounded-lg text-sm transition shadow-sm"
      >
        立即訂閱
      </button>

      <!-- Feedback Banner -->
      <div id="statusMsg" class="hidden text-center text-sm p-3 rounded-lg"></div>
    </form>

    <footer class="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
      <span>隨時可一鍵取消訂閱</span>
      <span>隱私保證 · 無垃圾郵件</span>
    </footer>
  </main>

  <script>
    const form = document.getElementById('subscribeForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMsg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.innerText = '處理中...';
      statusMsg.className = 'hidden';

      try {
        const payload = {
          name: document.getElementById('name').value,
          email: document.getElementById('email').value,
          hp_company: document.getElementById('hp_company')?.value || '',
        };

        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          statusMsg.className = 'text-center text-sm p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200';
          statusMsg.innerText = data.message || '訂閱成功，請前往信箱查收第一封信。';
          form.reset();
        } else {
          statusMsg.className = 'text-center text-sm p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200';
          statusMsg.innerText = data.error || '訂閱失敗，請檢查 Email 是否正確。';
        }
      } catch (err) {
        statusMsg.className = 'text-center text-sm p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200';
        statusMsg.innerText = '連線失敗，請稍後再試。';
      } finally {
        statusMsg.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.innerText = '立即訂閱';
      }
    });
  </script>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  });
}

/**
 * 管理員登入頁面 (Admin Login Page)
 */
export function renderLoginPage(): Response {
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>管理員登入 - cf-tosend-autoresponder</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif; }
  </style>
</head>
<body class="bg-[#fcfbf9] text-stone-800 flex items-center justify-center min-h-screen px-4 antialiased">
  <main class="max-w-sm w-full bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
    <div class="mb-6 text-center">
      <div class="w-10 h-10 rounded-lg bg-stone-900 text-white flex items-center justify-center font-mono font-bold text-sm mx-auto mb-3">
        CF
      </div>
      <h1 class="text-xl font-bold text-stone-900">後台管理員登入</h1>
      <p class="text-xs text-stone-500 mt-1">請輸入管理金鑰 (ADMIN_API_KEY) 進入控制台</p>
    </div>

    <form id="loginForm" class="space-y-4">
      <div>
        <label for="apiKey" class="block text-xs font-semibold text-stone-700 mb-1.5">管理金鑰 / Token</label>
        <input 
          type="password" 
          id="apiKey" 
          placeholder="本機測試可直接留空或輸入金鑰" 
          class="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
        />
      </div>

      <button 
        type="submit" 
        class="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-sm"
      >
        進入控制台
      </button>

      <div class="text-center pt-2">
        <a href="/" class="text-xs text-stone-400 hover:text-stone-600 transition">返回前台訂閱頁面</a>
      </div>
    </form>
  </main>

  <script>
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const token = document.getElementById('apiKey').value.trim();
      if (token) {
        localStorage.setItem('ADMIN_API_KEY', token);
      }
      window.location.href = '/admin';
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  });
}

export interface UnsubscribePageOptions {
  success: boolean;
  isConfirmed: boolean;
  token?: string;
}

/**
 * 取消訂閱結果頁 (支援防爬蟲誤點確認與退訂結果)
 */
export function renderUnsubscribePage(opts: UnsubscribePageOptions): Response {
  let content = '';

  if (!opts.success && opts.isConfirmed) {
    content = `
      <div class="w-10 h-10 mx-auto mb-4 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center text-sm font-bold font-mono">!</div>
      <h1 class="text-xl font-bold text-stone-900 mb-2">退訂連結無效</h1>
      <p class="text-sm text-stone-600 mb-6">未提供有效的退訂 Token，請確認信件中的連結是否完整。</p>
      <a href="/" class="inline-block text-xs font-semibold text-stone-500 hover:text-stone-900 transition">回到訂閱首頁</a>
    `;
  } else if (!opts.isConfirmed && opts.token) {
    content = `
      <div class="w-10 h-10 mx-auto mb-4 rounded-full bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold font-mono">UNSUB</div>
      <h1 class="text-xl font-bold text-stone-900 mb-2">確定要取消訂閱嗎？</h1>
      <p class="text-sm text-stone-600 mb-6">點擊下方按鈕後，你將不再收到後續的自動跟進郵件。</p>
      <button id="confirmUnsubBtn" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-sm mb-3">
        確認取消訂閱
      </button>
      <div id="statusResult" class="hidden text-sm mb-4"></div>
      <a href="/" class="block text-xs text-stone-400 hover:text-stone-600 transition">保留訂閱並返回</a>

      <script>
        const btn = document.getElementById('confirmUnsubBtn');
        const resDiv = document.getElementById('statusResult');
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.innerText = '處理中...';
          try {
            const res = await fetch('/api/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: '${opts.token}' })
            });
            const data = await res.json();
            if (data.success) {
              resDiv.className = 'text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200';
              resDiv.innerText = '已成功取消訂閱。未來將不再發送信件給您。';
              btn.style.display = 'none';
            } else {
              resDiv.className = 'text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200';
              resDiv.innerText = '取消訂閱失敗或 Token 已失效。';
              btn.disabled = false;
            }
          } catch(e) {
            resDiv.className = 'text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200';
            resDiv.innerText = '連線失敗，請稍後再試。';
            btn.disabled = false;
          }
          resDiv.classList.remove('hidden');
        });
      </script>
    `;
  } else {
    content = `
      <div class="w-10 h-10 mx-auto mb-4 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-sm font-bold font-mono">OK</div>
      <h1 class="text-xl font-bold text-stone-900 mb-2">已成功取消訂閱</h1>
      <p class="text-sm text-stone-600 mb-6">未來你將不會再收到來自此系列的自動跟進信件。</p>
      <a href="/" class="inline-block text-xs font-semibold text-stone-500 hover:text-stone-900 transition">回到訂閱首頁</a>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>取消訂閱通知</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#fcfbf9] text-[#1c1917] flex items-center justify-center min-h-screen px-4 antialiased">
  <div class="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-stone-200 text-center">
    ${content}
  </div>
</body>
</html>`;

  return new Response(html, {
    status: opts.success ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  });
}

import { adminConsoleHtml } from "./adminHtml";

/**
 * 完整中台儀表板與後台控制器頁面 (v2.0 四大模組)
 */
export function renderAdminConsole(): Response {
  return new Response(adminConsoleHtml, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}
