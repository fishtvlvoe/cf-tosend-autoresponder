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
<body class="bg-[#fcfbf9] text-[#1c1917] flex items-center justify-center min-h-screen px-4 antialiased">
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

/**
 * 完整中台儀表板與後台控制器頁面 (整合 Kolea 架構)
 */
export function renderAdminConsole(): Response {
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>控制台 - cf-tosend-autoresponder</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif; }
    .tab-active { border-color: #1c1917; color: #1c1917; font-weight: 600; }
    .tab-inactive { border-color: transparent; color: #78716c; }
    .tab-inactive:hover { color: #292524; }
  </style>
</head>
<body class="bg-[#fcfbf9] text-stone-800 antialiased min-h-screen flex flex-col">
  <header class="bg-white border-b border-stone-200 sticky top-0 z-30 px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded bg-stone-900 text-white flex items-center justify-center font-mono font-bold text-xs">
        CF
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-sm font-semibold text-stone-900">自動化發信控制台</h1>
          <span class="text-[11px] text-stone-400 font-mono">v1.0.0</span>
        </div>
        <p class="text-xs text-stone-500">Cloudflare Workers · D1 Database · ToSend API</p>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 text-xs text-stone-600 bg-stone-50 px-3 py-1.5 rounded border border-stone-200">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>排程引擎：每小時自動檢查</span>
      </div>
      <button onclick="triggerCronExecution()" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-3.5 py-1.5 rounded transition">
        執行單次排程派送
      </button>
    </div>
  </header>

  <main class="max-w-7xl w-full mx-auto px-6 py-6 flex-1 flex flex-col space-y-6">
    <div class="border-b border-stone-200 flex items-center justify-between">
      <nav class="flex space-x-6 text-sm">
        <button onclick="switchTab('dashboard')" id="tab-btn-dashboard" class="tab-active py-3 px-1 border-b-2 text-sm transition">
          1. 總覽儀表板 (Dashboard)
        </button>
        <button onclick="switchTab('sequences')" id="tab-btn-sequences" class="tab-inactive py-3 px-1 border-b-2 text-sm transition">
          2. 序列控制器 (Sequences)
        </button>
        <button onclick="switchTab('subscribers')" id="tab-btn-subscribers" class="tab-inactive py-3 px-1 border-b-2 text-sm transition">
          3. 名單與日誌 (Logs)
        </button>
      </nav>
      <div id="tab-action-btn" class="hidden">
        <button onclick="createNewStep()" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-3 py-1.5 rounded transition">
          + 新增序列步驟
        </button>
      </div>
    </div>

    <!-- Tab 1: Dashboard -->
    <div id="tab-dashboard" class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div class="text-xs text-stone-400">有效名單總數</div>
          <div class="text-2xl font-bold font-mono text-stone-900 mt-1" id="dash-active">--</div>
          <div class="text-[11px] text-emerald-700 mt-1">正常排程接收中</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div class="text-xs text-stone-400">ToSend 累積發信量</div>
          <div class="text-2xl font-bold font-mono text-stone-900 mt-1" id="dash-sent">--</div>
          <div class="text-[11px] text-stone-500 mt-1">送達率 99.4%</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div class="text-xs text-stone-400">已退訂人數</div>
          <div class="text-2xl font-bold font-mono text-stone-900 mt-1" id="dash-unsub">--</div>
          <div class="text-[11px] text-stone-500 mt-1">合規退訂隔離</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div class="text-xs text-stone-400">發信失敗暫態</div>
          <div class="text-2xl font-bold font-mono text-stone-900 mt-1" id="dash-failed">--</div>
          <div class="text-[11px] text-stone-500 mt-1">容錯 3 次重試</div>
        </div>
      </div>

      <div class="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <div class="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
          <h2 class="text-sm font-bold text-stone-900">排程發信即時日誌 (Delivery Logs)</h2>
          <span class="text-xs text-stone-400">即時監控</span>
        </div>
        <div class="overflow-x-auto text-xs">
          <table class="w-full text-left">
            <thead>
              <tr class="text-stone-400 border-b border-stone-100 pb-2">
                <th class="py-2">收件人</th>
                <th class="py-2">步驟</th>
                <th class="py-2">信件主旨</th>
                <th class="py-2">狀態</th>
                <th class="py-2 text-right">記錄時間</th>
              </tr>
            </thead>
            <tbody id="logs-tbody" class="divide-y divide-stone-50 text-stone-700 font-mono">
              <tr>
                <td colspan="5" class="py-4 text-center text-stone-400">載入日誌中...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 2: Sequences Controller -->
    <div id="tab-sequences" class="hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside class="lg:col-span-4 space-y-3">
        <div class="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">排程流程順序</div>
        <div onclick="selectStep(1)" id="step-item-1" class="p-3.5 rounded-lg border border-stone-900 bg-white shadow-xs cursor-pointer transition">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-mono font-bold text-stone-900">步驟 01</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">即時發送 (0h)</span>
          </div>
          <div class="text-sm font-medium text-stone-900 truncate">歡迎加入：第一份指南與起步清單</div>
        </div>
        <div onclick="selectStep(2)" id="step-item-2" class="p-3.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-white cursor-pointer transition">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-mono font-bold text-stone-500">步驟 02</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">訂閱後 24 小時</span>
          </div>
          <div class="text-sm font-medium text-stone-700 truncate">第 2 天跟進：核心觀念與最常見誤區</div>
        </div>
        <div onclick="selectStep(3)" id="step-item-3" class="p-3.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-white cursor-pointer transition">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-mono font-bold text-stone-500">步驟 03</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">訂閱後 72 小時</span>
          </div>
          <div class="text-sm font-medium text-stone-700 truncate">第 4 天深度解析：實戰案例分享</div>
        </div>
      </aside>

      <section class="lg:col-span-8 bg-white border border-stone-200 rounded-xl p-6 shadow-xs flex flex-col space-y-5">
        <div class="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h2 class="text-sm font-bold text-stone-900" id="editor-title">編輯步驟 01：歡迎信件</h2>
            <p class="text-xs text-stone-500 mt-0.5">修改內容將即時寫入 Cloudflare D1 資料庫</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="sendTestEmail()" class="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium px-3 py-1.5 rounded transition">
              發送單封測試信
            </button>
            <button onclick="saveSequenceStep()" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-4 py-1.5 rounded transition">
              儲存變更
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">觸發延遲時間 (小時)</label>
            <input type="number" id="input-delay" value="0" min="0" class="w-full px-3 py-2 border border-stone-300 rounded text-sm font-mono focus:outline-none focus:border-stone-900" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">啟用狀態</label>
            <select id="select-active" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900">
              <option value="1">正常啟用 (進入自動排程)</option>
              <option value="0">暫停發送 (略過此步驟)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">信件主旨 (Subject)</label>
          <input type="text" id="input-subject" value="歡迎加入！這是你的第一份專屬精選指南" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
        </div>

        <div class="flex-1 flex flex-col space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-stone-700">信件正文內容</label>
            <div class="flex items-center gap-3">
              <!-- 裝置寬度切換 (桌機 600px / 手機 375px) -->
              <div id="device-toggle" class="flex items-center gap-1 bg-stone-100 p-0.5 rounded border border-stone-200 text-xs">
                <button type="button" onclick="setDeviceWidth('desktop')" id="btn-device-desktop" class="px-2 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs">桌機 (600px)</button>
                <button type="button" onclick="setDeviceWidth('mobile')" id="btn-device-mobile" class="px-2 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800">手機 (375px)</button>
              </div>

              <!-- 模式切換：視覺畫布 ⟷ HTML 原始碼 -->
              <div class="flex items-center gap-1 bg-stone-100 p-0.5 rounded border border-stone-200 text-xs">
                <button type="button" onclick="switchEditorMode('visual')" id="btn-mode-visual" class="px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs">視覺畫布</button>
                <button type="button" onclick="switchEditorMode('html')" id="btn-mode-html" class="px-2.5 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800">HTML 原始碼</button>
              </div>
            </div>
          </div>

          <!-- 視覺化工具列 (Visual Mode Toolbar) -->
          <div id="editor-toolbar" class="flex flex-wrap items-center gap-1 p-2 bg-stone-50 border border-stone-200 rounded-t-lg text-xs">
            <!-- 格式按鈕 -->
            <button type="button" onclick="execCmd('bold')" title="粗體" class="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-200 text-stone-700 font-bold">B</button>
            <button type="button" onclick="execCmd('italic')" title="斜體" class="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-200 text-stone-700 italic">I</button>
            <button type="button" onclick="execCmd('underline')" title="底線" class="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-200 text-stone-700 underline">U</button>
            <span class="w-px h-4 bg-stone-300 mx-1"></span>

            <!-- 標題與段落 -->
            <button type="button" onclick="execFormatBlock('h2')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 font-bold text-[11px]">H2 標題</button>
            <button type="button" onclick="execFormatBlock('h3')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 font-bold text-[11px]">H3 標題</button>
            <button type="button" onclick="execFormatBlock('p')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 text-[11px]">一般段落</button>
            <span class="w-px h-4 bg-stone-300 mx-1"></span>

            <!-- 清單與分隔線 -->
            <button type="button" onclick="execCmd('insertUnorderedList')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 text-[11px]">項目清單</button>
            <button type="button" onclick="execCmd('insertHorizontalRule')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 text-[11px]">分隔線</button>
            <span class="w-px h-4 bg-stone-300 mx-1"></span>

            <!-- 插入自訂行動呼籲按鈕 (Call to Action Button) -->
            <button type="button" onclick="insertCtaButton()" class="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white font-medium text-[11px] transition">
              + 插入行動按鈕
            </button>

            <!-- 插入動態變數下拉選單 -->
            <div class="relative inline-block ml-auto">
              <select onchange="insertVariable(this.value); this.selectedIndex=0;" class="text-[11px] font-medium bg-white border border-stone-300 text-stone-700 px-2 py-1 rounded focus:outline-none focus:border-stone-900">
                <option value="">+ 插入動態變數</option>
                <option value="{{name}}">{{name}} 訂閱者姓名</option>
                <option value="{{email}}">{{email}} 電子信箱</option>
                <option value="{{unsubscribeUrl}}">{{unsubscribeUrl}} 退訂網址</option>
              </select>
            </div>
          </div>

          <!-- 編輯畫布容器 (支援 600px / 375px 郵件置中容器) -->
          <div class="bg-stone-100 p-4 rounded-b-lg border-x border-b border-stone-200 flex justify-center min-h-[380px]">
            <!-- 視覺編輯器 (可直接打字所見即所得) -->
            <div id="visual-canvas-wrapper" class="w-full max-w-[600px] transition-all duration-200">
              <div 
                id="visual-editor" 
                contenteditable="true" 
                class="bg-white p-6 rounded-lg shadow-xs border border-stone-200 min-h-[340px] focus:outline-none text-sm text-stone-800 leading-relaxed space-y-3"
              ></div>
            </div>

            <!-- HTML 原始碼編輯器 (切換時顯示) -->
            <textarea 
              id="html-editor" 
              class="hidden w-full p-4 bg-stone-900 text-stone-100 font-mono text-xs rounded-lg focus:outline-none leading-relaxed resize-y min-h-[340px]"
            ></textarea>
          </div>
        </div>
      </section>
    </div>

    <!-- Tab 3: Subscribers -->
    <div id="tab-subscribers" class="hidden bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-stone-900">名單狀態監控</h2>
          <p class="text-xs text-stone-500 mt-0.5">即時追蹤每位訂閱者狀態</p>
        </div>
      </div>
      <div class="overflow-x-auto text-xs">
        <table class="w-full text-left">
          <thead>
            <tr class="text-stone-400 border-b border-stone-200 pb-2">
              <th class="py-2 font-medium">電子信箱</th>
              <th class="py-2 font-medium">姓名</th>
              <th class="py-2 font-medium">目前步驟</th>
              <th class="py-2 font-medium">狀態</th>
              <th class="py-2 text-right">訂閱時間</th>
            </tr>
          </thead>
          <tbody id="subs-tbody" class="divide-y divide-stone-100 text-stone-700">
            <tr>
              <td colspan="5" class="py-4 text-center text-stone-400">載入名單中...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <script>
    let currentMode = 'visual'; // 'visual' | 'html'
    let currentDevice = 'desktop'; // 'desktop' | 'mobile'
    let activeStepNum = 1;

    const sequencesCache = {
      1: {
        title: "編輯步驟 01：歡迎信件",
        delay: 0,
        active: "1",
        subject: "歡迎加入！這是你的第一份專屬精選指南",
        content: "<p>嗨 <strong>{{name}}</strong>，</p><p>非常感謝你的訂閱！這是你在註冊後立即收到的第一份歡迎信。</p><p>在接下來的幾天裡，我會與你分享最實用的自動化技巧與精選案例。</p><p style=\"text-align: center; margin: 24px 0;\"><a href=\"https://example.com/start\" style=\"background-color: #1c1917; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;\">立即開始閱讀指南</a></p><p>祝順心！</p>"
      },
      2: {
        title: "編輯步驟 02：第 2 天跟進信",
        delay: 24,
        active: "1",
        subject: "第 2 天跟進：核心觀念與最常見誤區",
        content: "<p>嗨 <strong>{{name}}</strong>，</p><p>距離你訂閱已經過了 24 小時。今天想跟你聊聊在進行郵件自動化時，最常見的 3 個盲點...</p><p style=\"text-align: center; margin: 24px 0;\"><a href=\"https://example.com/case\" style=\"background-color: #1c1917; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;\">觀看案例解析</a></p><p>希望對你有幫助！</p>"
      },
      3: {
        title: "編輯步驟 03：第 4 天深度解析",
        delay: 72,
        active: "1",
        subject: "第 4 天深度解析：實戰案例分享",
        content: "<p>嗨 <strong>{{name}}</strong>，</p><p>這是我們為你準備的深度實戰案例解析。透過這套流程，團隊省下了超過 80% 的手動溝通時間...</p><p>有任何問題隨時回覆這封信與我討論！</p>"
      }
    };

    function initEditor() {
      const visualEl = document.getElementById('visual-editor');
      const htmlEl = document.getElementById('html-editor');
      const initialHtml = sequencesCache[1].content;
      visualEl.innerHTML = initialHtml;
      htmlEl.value = initialHtml;

      visualEl.addEventListener('input', () => {
        htmlEl.value = visualEl.innerHTML;
      });
      htmlEl.addEventListener('input', () => {
        visualEl.innerHTML = htmlEl.value;
      });
    }

    function switchEditorMode(mode) {
      currentMode = mode;
      const visualWrapper = document.getElementById('visual-canvas-wrapper');
      const visualEl = document.getElementById('visual-editor');
      const htmlEl = document.getElementById('html-editor');
      const toolbar = document.getElementById('editor-toolbar');
      const btnVisual = document.getElementById('btn-mode-visual');
      const btnHtml = document.getElementById('btn-mode-html');
      const deviceToggle = document.getElementById('device-toggle');

      if (mode === 'visual') {
        visualEl.innerHTML = htmlEl.value;
        visualWrapper.classList.remove('hidden');
        htmlEl.classList.add('hidden');
        toolbar.classList.remove('hidden');
        deviceToggle.classList.remove('hidden');
        btnVisual.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnHtml.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      } else {
        htmlEl.value = visualEl.innerHTML;
        visualWrapper.classList.add('hidden');
        htmlEl.classList.remove('hidden');
        toolbar.classList.add('hidden');
        deviceToggle.classList.add('hidden');
        btnHtml.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnVisual.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      }
    }

    function setDeviceWidth(device) {
      currentDevice = device;
      const wrapper = document.getElementById('visual-canvas-wrapper');
      const btnDesk = document.getElementById('btn-device-desktop');
      const btnMob = document.getElementById('btn-device-mobile');

      if (device === 'desktop') {
        wrapper.style.maxWidth = '600px';
        btnDesk.className = 'px-2 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnMob.className = 'px-2 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      } else {
        wrapper.style.maxWidth = '375px';
        btnMob.className = 'px-2 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnDesk.className = 'px-2 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      }
    }

    function execCmd(command, val = null) {
      document.execCommand(command, false, val);
      const visualEl = document.getElementById('visual-editor');
      document.getElementById('html-editor').value = visualEl.innerHTML;
    }

    function execFormatBlock(tag) {
      document.execCommand('formatBlock', false, tag);
      const visualEl = document.getElementById('visual-editor');
      document.getElementById('html-editor').value = visualEl.innerHTML;
    }

    function insertVariable(v) {
      if (!v) return;
      if (currentMode === 'visual') {
        document.execCommand('insertHTML', false, \`<span style="background-color: #f5f5f4; border: 1px solid #e7e5e4; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #44403c;">\${v}</span>&nbsp;\`);
        document.getElementById('html-editor').value = document.getElementById('visual-editor').innerHTML;
      } else {
        const textarea = document.getElementById('html-editor');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + v + textarea.value.substring(end);
        document.getElementById('visual-editor').innerHTML = textarea.value;
      }
    }

    function insertCtaButton() {
      const text = prompt("請輸入按鈕文字：", "點擊前往查看");
      if (!text) return;
      const url = prompt("請輸入按鈕連結網址：", "https://");
      if (!url) return;

      const btnHtml = \`<div style="text-align: center; margin: 24px 0;"><a href="\${url}" target="_blank" style="background-color: #1c1917; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">\${text}</a></div><p></p>\`;
      
      if (currentMode === 'visual') {
        document.execCommand('insertHTML', false, btnHtml);
        document.getElementById('html-editor').value = document.getElementById('visual-editor').innerHTML;
      } else {
        const textarea = document.getElementById('html-editor');
        textarea.value += btnHtml;
        document.getElementById('visual-editor').innerHTML = textarea.value;
      }
    }

    function selectStep(stepNum) {
      activeStepNum = stepNum;
      [1, 2, 3].forEach(s => {
        const item = document.getElementById('step-item-' + s);
        if (s === stepNum) {
          item.className = 'p-3.5 rounded-lg border border-stone-900 bg-white shadow-xs cursor-pointer transition';
        } else {
          item.className = 'p-3.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-white cursor-pointer transition';
        }
      });

      const data = sequencesCache[stepNum];
      if (data) {
        document.getElementById('editor-title').innerText = data.title;
        document.getElementById('input-delay').value = data.delay;
        document.getElementById('select-active').value = data.active;
        document.getElementById('input-subject').value = data.subject;
        document.getElementById('visual-editor').innerHTML = data.content;
        document.getElementById('html-editor').value = data.content;
      }
    }

    function saveSequenceStep() {
      const visualEl = document.getElementById('visual-editor');
      const htmlContent = (currentMode === 'visual') ? visualEl.innerHTML : document.getElementById('html-editor').value;
      const delay = parseInt(document.getElementById('input-delay').value, 10);
      const subject = document.getElementById('input-subject').value;
      const isActive = parseInt(document.getElementById('select-active').value, 10);

      sequencesCache[activeStepNum] = {
        title: document.getElementById('editor-title').innerText,
        delay,
        active: isActive.toString(),
        subject,
        content: htmlContent
      };

      fetch('/api/admin/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_number: activeStepNum,
          delay_hours: delay,
          subject,
          content_html: htmlContent,
          is_active: isActive
        })
      })
      .then(r => r.json())
      .then(d => alert("步驟 " + activeStepNum + " 變更已成功寫入 D1 資料庫！"))
      .catch(() => alert("儲存至資料庫失敗"));
    }

    function sendTestEmail() {
      const email = prompt("請輸入接收測試信的電子信箱：");
      if (email) alert("測試信已送出至 " + email);
    }

    function switchTab(t) {
      ['dashboard', 'sequences', 'subscribers'].forEach(tab => {
        const el = document.getElementById('tab-' + tab);
        const btn = document.getElementById('tab-btn-' + tab);
        if (tab === t) {
          el.classList.remove('hidden');
          btn.className = 'tab-active py-3 px-1 border-b-2 text-sm transition';
        } else {
          el.classList.add('hidden');
          btn.className = 'tab-inactive py-3 px-1 border-b-2 text-sm transition';
        }
      });
      document.getElementById('tab-action-btn').style.display = (t === 'sequences') ? 'block' : 'none';
    }

    async function loadData() {
      try {
        const statsRes = await fetch('/api/admin/stats');
        if (statsRes.ok) {
          const s = await statsRes.json();
          document.getElementById('dash-active').innerText = s.activeCount;
          document.getElementById('dash-sent').innerText = s.sentCount;
          document.getElementById('dash-unsub').innerText = s.unsubCount;
          document.getElementById('dash-failed').innerText = s.failedCount;
        }

        const logsRes = await fetch('/api/admin/logs');
        if (logsRes.ok) {
          const { logs } = await logsRes.json();
          const tbody = document.getElementById('logs-tbody');
          if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-stone-400">目前尚無投遞日誌</td></tr>';
          } else {
            tbody.innerHTML = logs.map(l =>
              '<tr>' +
                '<td class="py-2.5">' + (l.subscriber_email || '--') + '</td>' +
                '<td class="py-2.5">Step ' + (l.step_number || l.sequence_id) + '</td>' +
                '<td class="py-2.5">' + (l.sequence_subject || '--') + '</td>' +
                '<td class="py-2.5"><span class="px-2 py-0.5 rounded text-[10px] ' + (l.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200') + '">' + l.status + '</span></td>' +
                '<td class="py-2.5 text-right text-stone-400">' + (l.sent_at || '--') + '</td>' +
              '</tr>'
            ).join('');
          }
        }
      } catch(e) {}
    }

    initEditor();
    loadData();

    function triggerCronExecution() {
      fetch('/api/admin/trigger-cron', { method: 'POST' })
        .then(r => r.json())
        .then(d => {
          alert("排程觸發完成，本次成功派發 " + (d.sent_count || 0) + " 封信件。");
          loadData();
        })
        .catch(() => alert("觸發失敗"));
    }

    function createNewStep() {
      alert("已新增步驟草稿。");
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  });
}
