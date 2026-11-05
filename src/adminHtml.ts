export const adminConsoleHtml = `<!DOCTYPE html>
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
    /* 手機漢堡選單項目 */
    .m-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 11px 12px; border-radius: 10px; font-size: 14px; transition: background .15s; }
    .m-active { background: #1c1917; color: #ffffff; font-weight: 600; }
    .m-inactive { color: #44403c; }
    .m-inactive:hover { background: #f5f5f4; }
  </style>
</head>
<body class="bg-[#fcfbf9] text-stone-800 antialiased min-h-screen flex flex-col">
  <!-- 頂部導覽列（手機版直排堆疊，電腦版橫排） -->
  <header class="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 md:px-6 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded bg-stone-900 text-white flex items-center justify-center font-bold text-sm shrink-0">寄</div>
        <div class="min-w-0">
          <h1 class="text-base font-semibold text-stone-900 truncate">好寄</h1>
        </div>
      </div>
      <button onclick="toggleMobileMenu()" class="md:hidden p-2 -mr-2 rounded hover:bg-stone-100" aria-label="開啟選單">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-stone-700"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
      </button>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <button onclick="triggerCronExecution()" id="btn-trigger-cron" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-3 py-1.5 rounded transition flex items-center gap-1.5" title="立即執行一次排程檢查（平時每小時自動執行）">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
        執行排程
      </button>
      <button onclick="logoutAdmin()" class="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 font-medium px-3 py-1.5 rounded transition flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25"/></svg>
        登出
      </button>
    </div>
  </header>

  <!-- 手機版漢堡選單抽屜（一級選單） -->
  <div id="mobile-drawer" class="fixed inset-0 z-40 hidden md:hidden">
    <div class="absolute inset-0 bg-stone-900/40" onclick="toggleMobileMenu()"></div>
    <div class="absolute right-0 top-0 h-full w-64 max-w-[85vw] bg-white shadow-xl p-4 space-y-1 overflow-y-auto">
      <div class="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
        <span class="text-sm font-bold text-stone-900">選單</span>
        <button onclick="toggleMobileMenu()" class="p-1 text-stone-400 hover:text-stone-700 text-xl leading-none">&times;</button>
      </div>
      <button data-tab="dashboard" data-nav-style="menu" class="m-item m-active">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
        數據總覽
      </button>
      <button data-tab="contacts" data-nav-style="menu" class="m-item m-inactive">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
        聯絡人名單
      </button>
      <button data-tab="campaigns" data-nav-style="menu" class="m-item m-inactive">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
        電子報廣播
      </button>
      <button data-tab="automations" data-nav-style="menu" class="m-item m-inactive">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        自動跟進排程
      </button>
      <button data-tab="settings" data-nav-style="menu" class="m-item m-inactive">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        設定
      </button>
      <div class="pt-3 mt-3 border-t border-stone-100">
        <button onclick="switchTab('campaigns')" class="m-item bg-stone-900 text-white font-medium justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/></svg>
          撰寫新廣播信
        </button>
      </div>
    </div>
  </div>

  <div class="flex-1 w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6 px-4 md:px-6 py-6">
    <!-- 左側選單列（電腦版／平板；手機版收進漢堡選單） -->
    <aside class="hidden md:block w-52 shrink-0">
      <div class="sticky top-24 bg-white border border-stone-200 rounded-xl p-3 space-y-1">
        <div class="px-2 pb-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">後台選單</div>
        <button data-tab="dashboard" data-nav-style="menu" id="tab-btn-dashboard" class="m-item m-active">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
          數據總覽
        </button>
        <button data-tab="contacts" data-nav-style="menu" id="tab-btn-contacts" class="m-item m-inactive">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
          聯絡人名單
        </button>
        <button data-tab="campaigns" data-nav-style="menu" id="tab-btn-campaigns" class="m-item m-inactive">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
          電子報廣播
        </button>
        <button data-tab="automations" data-nav-style="menu" id="tab-btn-automations" class="m-item m-inactive">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          自動跟進排程
        </button>
        <button data-tab="settings" data-nav-style="menu" id="tab-btn-settings" class="m-item m-inactive">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          設定
        </button>
        <div class="pt-2 mt-1 border-t border-stone-100">
          <button onclick="switchTab('campaigns')" class="w-full text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-3 py-2 rounded-lg transition flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/></svg>
            撰寫新廣播信
          </button>
        </div>
      </div>
    </aside>

    <main class="flex-1 min-w-0 flex flex-col space-y-6">
      <!-- 設定未完成提示橫幅（derived onboarding_done=0 時顯示，點擊切到設定頁籤） -->
      <div id="onboarding-banner" class="hidden bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-lg cursor-pointer" onclick="switchTab('settings')">
        ⚠ 請先完成初始設定（網域、寄件人、ToSend 金鑰），完成前無法寄信。
      </div>


    <!-- 頁籤 1：數據總覽 (Dashboard) -->
    <section id="tab-dashboard" class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div class="text-xs text-stone-400">有效聯絡人總數</div>
          <div class="text-2xl font-bold font-mono text-stone-900 mt-1" id="dash-active">--</div>
          <div class="text-[11px] text-emerald-700 mt-1">正常排程接收中</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div class="text-xs text-stone-400">ToSend 累計發信量</div>
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
          <h2 class="text-sm font-bold text-stone-900">即時投遞日誌 (Delivery Logs)</h2>
          <button onclick="loadLogsData()" class="text-xs text-stone-500 hover:text-stone-900 transition font-mono">重新整理日誌</button>
        </div>
        <div class="overflow-x-auto text-xs hidden md:block">
          <table class="w-full text-left">
            <thead>
              <tr class="text-stone-400 border-b border-stone-100 pb-2">
                <th class="py-2">收件人 Email</th>
                <th class="py-2">步驟 / 類型</th>
                <th class="py-2">信件主旨</th>
                <th class="py-2">投遞狀態</th>
                <th class="py-2 text-right">記錄時間</th>
              </tr>
            </thead>
            <tbody id="logs-tbody" class="divide-y divide-stone-50 text-stone-700 font-mono">
              <tr>
                <td colspan="5" class="py-4 text-center text-stone-400">載入 D1 資料庫即時日誌中...</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 手機版：日誌卡片列表 -->
        <div id="logs-cards" class="md:hidden space-y-2">
          <div class="py-4 text-center text-stone-400 text-sm">載入 D1 資料庫即時日誌中...</div>
        </div>
      </div>
    </section>

    <!-- 頁籤 2：聯絡人名單 (Contacts) -->
    <section id="tab-contacts" class="hidden space-y-6">
      <div class="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <h2 class="text-sm font-bold text-stone-900">聯絡人名單管理</h2>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center gap-2 text-xs">
              <span class="text-stone-500">標籤分類：</span>
              <select id="filter-tag" onchange="filterContactsByTag(this.value)" class="text-xs px-2.5 py-1.5 rounded border border-stone-300 bg-white focus:outline-none focus:border-stone-900">
                <option value="all">全部名單</option>
              </select>
            </div>
            <button onclick="promptNewSubscriber()" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-3 py-1.5 rounded transition flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"/></svg>
              新增聯絡人
            </button>
            <!-- 更多功能（三點選單）：匯出 / 匯入 -->
            <div class="relative" id="contacts-more-wrap">
              <button onclick="toggleContactsMoreMenu(event)" class="text-xs px-2.5 py-1.5 rounded border border-stone-300 text-stone-700 hover:bg-stone-50 transition" aria-label="更多功能">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"/></svg>
              </button>
              <div id="contacts-more-menu" class="hidden absolute right-0 mt-1 w-40 bg-white border border-stone-200 rounded-lg shadow-lg z-20 text-sm overflow-hidden">
                <button onclick="exportCsv()" class="w-full text-left px-3 py-2 text-stone-700 hover:bg-stone-50 transition flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                  匯出 CSV
                </button>
                <label class="w-full text-left px-3 py-2 text-stone-700 hover:bg-stone-50 transition flex items-center gap-2 cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-16.5-6L12 4.5m0 0l4.5 6M12 4.5v12"/></svg>
                  匯入 CSV
                  <input type="file" accept=".csv,text/csv" class="hidden" onchange="importCsvFile(this)" />
                </label>
              </div>
            </div>
          </div>
        </div>
        <div id="import-result" class="hidden text-xs bg-stone-50 border border-stone-200 rounded p-3"></div>

        <div class="overflow-x-auto text-xs hidden md:block">
          <table class="w-full text-left">
            <thead>
              <tr class="text-stone-400 border-b border-stone-100 pb-2">
                <th class="py-2">Email</th>
                <th class="py-2">稱呼 / 姓名</th>
                <th class="py-2">分類標籤 (Tags)</th>
                <th class="py-2">狀態</th>
                <th class="py-2">訂閱時間</th>
                <th class="py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody id="contacts-tbody" class="divide-y divide-stone-50 text-stone-700">
              <tr>
                <td colspan="6" class="py-4 text-center text-stone-400">載入 D1 聯絡人名單中...</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 手機版：聯絡人卡片列表 -->
        <div id="contacts-cards" class="md:hidden space-y-2">
          <div class="py-4 text-center text-stone-400 text-sm">載入 D1 聯絡人名單中...</div>
        </div>
      </div>
    </section>

    <!-- 頁籤 3：電子報廣播 (Campaigns / 手動群發) -->
    <section id="tab-campaigns" class="hidden space-y-6">
      <div class="bg-white border border-stone-200 rounded-xl p-6 shadow-xs flex flex-col space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h2 class="text-sm font-bold text-stone-900">建立電子報廣播信 (Campaign Broadcast)</h2>
            <p class="text-xs text-stone-500 mt-0.5">選擇受眾名單或分類標籤，撰寫並透過 ToSend REST API 一次性發送廣播信件</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="sendCampaignTestEmail()" class="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium px-3 py-1.5 rounded transition">
              發送單封測試信
            </button>
            <button onclick="executeCampaignBroadcast()" id="btn-campaign-send" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-4 py-1.5 rounded transition">
              確認立即群發
            </button>
          </div>
        </div>

        <!-- 1. 選擇發送受眾對象 (Audience Selector) -->
        <div class="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-3">
          <label class="block text-xs font-semibold text-stone-900">第一步：選擇發信受眾對象</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label class="flex items-start gap-2 p-3 bg-white rounded border border-stone-300 cursor-pointer hover:border-stone-900 transition">
              <input type="radio" name="audience_type" value="all" checked onchange="toggleAudienceFilter(this.value)" class="mt-0.5" />
              <div>
                <span class="font-medium text-stone-900 block">全部有效聯絡人</span>
                <span class="text-[11px] text-stone-500">發送給 D1 資料庫中所有啟用狀態的名單</span>
              </div>
            </label>
            <label class="flex items-start gap-2 p-3 bg-white rounded border border-stone-300 cursor-pointer hover:border-stone-900 transition">
              <input type="radio" name="audience_type" value="tag" onchange="toggleAudienceFilter(this.value)" class="mt-0.5" />
              <div>
                <span class="font-medium text-stone-900 block">指定標籤群體</span>
                <span class="text-[11px] text-stone-500">僅發送給特定標籤分類（例如 VIP 客戶）</span>
              </div>
            </label>
          </div>

          <div id="audience-tag-box" class="hidden pt-2 border-t border-stone-200/60 flex items-center gap-3">
            <span class="text-xs text-stone-600">選擇要發送的標籤：</span>
            <select id="campaign-selected-tag" class="text-xs px-2.5 py-1.5 rounded border border-stone-300 bg-white focus:outline-none focus:border-stone-900">
              <option value="VIP">VIP 會員</option>
              <option value="潛在客戶">潛在客戶</option>
              <option value="一般訂閱">一般訂閱</option>
            </select>
          </div>
        </div>

        <!-- 2. 主旨與寄件資訊 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">廣播活動名稱 (內部識別)</label>
            <input type="text" id="campaign-name" value="2026 年 11 月份產品深度教學特輯" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">信件主旨 (Subject) <span class="text-rose-500">*</span></label>
            <input type="text" id="campaign-subject" value="【特輯】本月最值得關注的 3 個自動化落地案例" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
          </div>
        </div>

        <!-- 3. 視覺化 Email 編輯器 -->
        <div class="flex-1 flex flex-col space-y-2">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label class="text-xs font-semibold text-stone-700">廣播信正文排版</label>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1 bg-stone-100 p-0.5 rounded border border-stone-200 text-xs">
                <button type="button" onclick="setCampaignDeviceWidth('desktop')" id="btn-campaign-device-desktop" class="px-2 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs">桌面版 (600px)</button>
                <button type="button" onclick="setCampaignDeviceWidth('mobile')" id="btn-campaign-device-mobile" class="px-2 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800">手機版 (375px)</button>
              </div>
              <div class="flex items-center gap-1 bg-stone-100 p-0.5 rounded border border-stone-200 text-xs">
                <button type="button" onclick="switchCampaignEditorMode('visual')" id="btn-campaign-mode-visual" class="px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs">視覺畫布</button>
                <button type="button" onclick="switchCampaignEditorMode('html')" id="btn-campaign-mode-html" class="px-2.5 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800">HTML 原始碼</button>
              </div>
            </div>
          </div>

          <!-- 編輯工具列 -->
          <div id="campaign-editor-toolbar" class="flex flex-wrap items-center gap-1 p-2 bg-stone-50 border border-stone-200 rounded-t-lg text-xs">
            <button type="button" onclick="execCampaignCmd('bold')" title="粗體" class="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-200 text-stone-700 font-bold">B</button>
            <button type="button" onclick="execCampaignCmd('italic')" title="斜體" class="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-200 text-stone-700 italic">I</button>
            <button type="button" onclick="execCampaignCmd('underline')" title="底線" class="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-200 text-stone-700 underline">U</button>
            <span class="w-px h-4 bg-stone-300 mx-1"></span>
            <button type="button" onclick="execCampaignFormatBlock('h2')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 font-bold text-[11px]">H2 標題</button>
            <button type="button" onclick="execCampaignFormatBlock('h3')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 font-bold text-[11px]">H3 標題</button>
            <button type="button" onclick="execCampaignFormatBlock('p')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 text-[11px]">一般段落</button>
            <span class="w-px h-4 bg-stone-300 mx-1"></span>
            <button type="button" onclick="execCampaignCmd('insertUnorderedList')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 text-[11px]">項目清單</button>
            <button type="button" onclick="execCampaignCmd('insertHorizontalRule')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 text-[11px]">分隔線</button>
            <span class="w-px h-4 bg-stone-300 mx-1"></span>
            <button type="button" onclick="insertCampaignCtaButton()" class="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white font-medium text-[11px] transition">
              + 插入行動按鈕 (CTA)
            </button>
            <div class="relative inline-block ml-auto">
              <select onchange="insertCampaignVariable(this.value); this.selectedIndex=0;" class="text-[11px] font-medium bg-white border border-stone-300 text-stone-700 px-2 py-1 rounded focus:outline-none focus:border-stone-900">
                <option value="">+ 插入動態變數</option>
                <option value="{{name}}">{{name}} 訂閱者姓名</option>
                <option value="{{email}}">{{email}} 電子信箱</option>
                <option value="{{unsubscribeUrl}}">{{unsubscribeUrl}} 退訂網址</option>
              </select>
            </div>
          </div>

          <!-- 畫布容器 -->
          <div class="bg-stone-100 p-4 rounded-b-lg border-x border-b border-stone-200 flex justify-center min-h-[380px]">
            <div id="campaign-visual-wrapper" class="w-full transition-all duration-200" style="max-width: 600px;">
              <div 
                id="campaign-visual-editor" 
                contenteditable="true" 
                class="bg-white p-8 rounded-lg shadow-xs border border-stone-200 min-h-[340px] text-sm text-stone-800 leading-relaxed focus:outline-none"
              >
                <p>嗨 <strong>{{name}}</strong>，</p>
                <p>這是一封特別發送給我們精選訂閱社群的電子報廣播信。</p>
                <p>本月份我們整理了三篇最實用的自動發信實踐策略，協助你將發信到達率提升至 99% 以上，同時免除任何複雜維護負擔。</p>
                <p style="text-align: center; margin: 24px 0;">
                  <a href="https://example.com/digest" style="background-color: #1c1917; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">閱讀完整特輯指南</a>
                </p>
                <p>祝順心！<br>Autoresponder 團隊</p>
              </div>
            </div>
            <textarea 
              id="campaign-html-editor" 
              class="hidden w-full font-mono text-xs p-4 bg-stone-900 text-stone-100 rounded-lg min-h-[340px] focus:outline-none"
            ></textarea>
          </div>
        </div>
      </div>
    </section>

    <!-- 頁籤 4：自動跟進排程 (Automations / 新訂閱旅程) -->
    <section id="tab-automations" class="hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside class="lg:col-span-4 space-y-3">
        <div class="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">自動跟進排程旅程關卡</div>
        <div onclick="selectAutomationStep(1)" id="step-item-1" class="p-3.5 rounded-lg border border-stone-900 bg-white shadow-xs cursor-pointer transition">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-mono font-bold text-stone-900">關卡 01</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">即時發送 (0h)</span>
          </div>
          <div class="text-sm font-medium text-stone-900 truncate" id="step-title-1">歡迎加入：第一份指南與起步清單</div>
        </div>
        <div onclick="selectAutomationStep(2)" id="step-item-2" class="p-3.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-white cursor-pointer transition">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-mono font-bold text-stone-500">關卡 02</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">訂閱後 24 小時</span>
          </div>
          <div class="text-sm font-medium text-stone-700 truncate" id="step-title-2">第 2 天跟進：核心觀念與最常見盲區</div>
        </div>
        <div onclick="selectAutomationStep(3)" id="step-item-3" class="p-3.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-white cursor-pointer transition">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-mono font-bold text-stone-500">關卡 03</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">訂閱後 72 小時</span>
          </div>
          <div class="text-sm font-medium text-stone-700 truncate" id="step-title-3">第 4 天深度解析：實戰案例分享</div>
        </div>
      </aside>

      <div class="lg:col-span-8 bg-white border border-stone-200 rounded-xl p-6 shadow-xs flex flex-col space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h2 class="text-sm font-bold text-stone-900" id="auto-editor-title">編輯關卡 01：歡迎信件</h2>
            <p class="text-xs text-stone-500 mt-0.5">新訂閱者註冊後，將依排程時間由 Cloudflare Worker 自動派送</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="sendAutoTestEmail()" class="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium px-3 py-1.5 rounded transition">
              發送單封測試信
            </button>
            <button onclick="saveAutomationStep()" id="btn-save-auto" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-4 py-1.5 rounded transition">
              儲存關卡設定
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">觸發延遲時間 (小時)</label>
            <input type="number" id="auto-input-delay" value="0" min="0" class="w-full px-3 py-2 border border-stone-300 rounded text-sm font-mono focus:outline-none focus:border-stone-900" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">啟用狀態</label>
            <select id="auto-select-active" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900">
              <option value="1">正常啟用 (進入自動排程)</option>
              <option value="0">暫停發送 (略過此關卡)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">信件主旨 (Subject)</label>
          <input type="text" id="auto-input-subject" value="" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
        </div>

        <div class="flex-1 flex flex-col space-y-2">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label class="text-xs font-semibold text-stone-700">關卡正文排版</label>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1 bg-stone-100 p-0.5 rounded border border-stone-200 text-xs">
                <button type="button" onclick="setAutoDeviceWidth('desktop')" id="btn-auto-device-desktop" class="px-2 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs">桌面版 (600px)</button>
                <button type="button" onclick="setAutoDeviceWidth('mobile')" id="btn-auto-device-mobile" class="px-2 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800">手機版 (375px)</button>
              </div>
              <div class="flex items-center gap-1 bg-stone-100 p-0.5 rounded border border-stone-200 text-xs">
                <button type="button" onclick="switchAutoEditorMode('visual')" id="btn-auto-mode-visual" class="px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs">視覺畫布</button>
                <button type="button" onclick="switchAutoEditorMode('html')" id="btn-auto-mode-html" class="px-2.5 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800">HTML 原始碼</button>
              </div>
            </div>
          </div>

          <div id="auto-editor-toolbar" class="flex flex-wrap items-center gap-1 p-2 bg-stone-50 border border-stone-200 rounded-t-lg text-xs">
            <button type="button" onclick="execAutoCmd('bold')" title="粗體" class="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-200 text-stone-700 font-bold">B</button>
            <button type="button" onclick="execAutoCmd('italic')" title="斜體" class="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-200 text-stone-700 italic">I</button>
            <button type="button" onclick="execAutoCmd('underline')" title="底線" class="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-200 text-stone-700 underline">U</button>
            <span class="w-px h-4 bg-stone-300 mx-1"></span>
            <button type="button" onclick="execAutoFormatBlock('h2')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 font-bold text-[11px]">H2 標題</button>
            <button type="button" onclick="execAutoFormatBlock('h3')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 font-bold text-[11px]">H3 標題</button>
            <button type="button" onclick="execAutoFormatBlock('p')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 text-[11px]">一般段落</button>
            <span class="w-px h-4 bg-stone-300 mx-1"></span>
            <button type="button" onclick="execAutoCmd('insertUnorderedList')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 text-[11px]">項目清單</button>
            <button type="button" onclick="execAutoCmd('insertHorizontalRule')" class="px-2 py-1 rounded hover:bg-stone-200 text-stone-700 text-[11px]">分隔線</button>
            <span class="w-px h-4 bg-stone-300 mx-1"></span>
            <button type="button" onclick="insertAutoCtaButton()" class="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white font-medium text-[11px] transition">
              + 插入行動按鈕 (CTA)
            </button>
            <div class="relative inline-block ml-auto">
              <select onchange="insertAutoVariable(this.value); this.selectedIndex=0;" class="text-[11px] font-medium bg-white border border-stone-300 text-stone-700 px-2 py-1 rounded focus:outline-none focus:border-stone-900">
                <option value="">+ 插入動態變數</option>
                <option value="{{name}}">{{name}} 訂閱者姓名</option>
                <option value="{{email}}">{{email}} 電子信箱</option>
                <option value="{{unsubscribeUrl}}">{{unsubscribeUrl}} 退訂網址</option>
              </select>
            </div>
          </div>

          <div class="bg-stone-100 p-4 rounded-b-lg border-x border-b border-stone-200 flex justify-center min-h-[340px]">
            <div id="auto-visual-wrapper" class="w-full transition-all duration-200" style="max-width: 600px;">
              <div 
                id="auto-visual-editor" 
                contenteditable="true" 
                class="bg-white p-8 rounded-lg shadow-xs border border-stone-200 min-h-[300px] text-sm text-stone-800 leading-relaxed focus:outline-none"
              >
              </div>
            </div>
            <textarea 
              id="auto-html-editor" 
              class="hidden w-full font-mono text-xs p-4 bg-stone-900 text-stone-100 rounded-lg min-h-[300px] focus:outline-none"
            ></textarea>
          </div>
        </div>
      </div>
    </section>

    <!-- 頁籤 5：設定 (Settings) — 單頁欄位即驗，存檔即生效 -->
    <section id="tab-settings" class="hidden space-y-6 max-w-2xl">
      <div class="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-5">
        <h3 class="text-sm font-bold text-stone-900">基本設定</h3>
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">網域名稱 <span class="text-rose-500">*</span></label>
          <input type="text" id="set-site_domain" placeholder="例如：mail.yourdomain.com" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
          <p class="text-[11px] text-stone-400 mt-1">產生退訂連結與著陸頁網址所用。使用自有網域請先在 ToSend 驗證。</p>
        </div>
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">著陸頁主標題 <span class="text-rose-500">*</span></label>
          <input type="text" id="set-landing_title" placeholder="例如：訂閱我的電子報" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">著陸頁副文案</label>
          <textarea id="set-landing_intro" rows="3" placeholder="一句話介紹你的電子報..." class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"></textarea>
        </div>
        <button onclick="saveSettings(['site_domain','landing_title','landing_intro'])" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-4 py-1.5 rounded transition">儲存基本設定</button>
      </div>

      <div class="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-5">
        <h3 class="text-sm font-bold text-stone-900">寄信設定</h3>
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">寄件人名稱 <span class="text-rose-500">*</span></label>
          <input type="text" id="set-tosend_from_name" placeholder="例如：老魚" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">寄件人信箱 <span class="text-rose-500">*</span></label>
          <input type="email" id="set-tosend_from_email" placeholder="例如：me@yourdomain.com" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
          <p class="text-[11px] text-stone-400 mt-1">必須是在 ToSend 完成網域驗證的信箱。</p>
        </div>
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">ToSend API Key <span class="text-rose-500">*</span></label>
          <div class="flex gap-2">
            <input type="password" id="set-tosend_api_key" placeholder="ts_live_..." class="flex-1 px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
            <button onclick="clearTosendKey()" id="btn-clear-key" class="hidden text-xs px-3 py-2 rounded border border-stone-300 text-stone-500 hover:bg-stone-50 transition">清除重設</button>
          </div>
          <p id="key-status" class="text-[11px] mt-1 hidden"></p>
          <p class="text-[11px] text-stone-400 mt-1">金鑰以 AES-256 加密存放；按下「驗證並儲存」會先寄測試信到上方信箱，成功才寫入。</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="saveSettings(['tosend_from_name','tosend_from_email'])" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-4 py-1.5 rounded transition">儲存寄件人</button>
          <button onclick="verifyAndSaveTosend()" id="btn-verify-tosend" class="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-4 py-1.5 rounded transition">驗證並儲存金鑰</button>
        </div>
        <p id="settings-msg" class="text-xs hidden"></p>
      </div>

      <div class="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <h3 class="text-sm font-bold text-stone-900">安全</h3>
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">目前密碼</label>
          <input type="password" id="set-old-password" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">新密碼（至少 8 字）</label>
          <input type="password" id="set-new-password" class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
        </div>
        <button onclick="changePassword()" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-4 py-1.5 rounded transition">修改密碼</button>
        <p class="text-[11px] text-stone-400">修改後所有已登入裝置會被登出。</p>
      </div>
    </section>
  </main>
  </div>

  <!-- 個別發信 Modal 視窗 -->
  <div id="direct-send-modal" class="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-stone-100">
        <div>
          <h3 class="text-sm font-bold text-stone-900">個別發送郵件 (Direct Send)</h3>
          <p class="text-xs text-stone-500 mt-0.5">單獨寄送一封客製化信件給指定聯絡人</p>
        </div>
        <button onclick="closeDirectSendModal()" class="text-stone-400 hover:text-stone-700 text-lg leading-none">&times;</button>
      </div>

      <div class="space-y-3 text-xs">
        <div>
          <label class="block font-semibold text-stone-700 mb-1">收件者</label>
          <div id="modal-recipient" class="p-2.5 bg-stone-50 rounded border border-stone-200 font-mono text-stone-800"></div>
        </div>
        <div>
          <label class="block font-semibold text-stone-700 mb-1">信件主旨 <span class="text-rose-500">*</span></label>
          <input type="text" id="modal-subject" placeholder="請輸入主旨..." class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
        </div>
        <div>
          <label class="block font-semibold text-stone-700 mb-1">信件正文內容</label>
          <textarea id="modal-content" rows="6" placeholder="請輸入信件內容..." class="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"></textarea>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
        <button onclick="closeDirectSendModal()" class="px-3 py-1.5 rounded text-xs font-medium text-stone-600 hover:bg-stone-100 transition">
          取消
        </button>
        <button onclick="submitDirectSend()" id="btn-submit-direct" class="px-4 py-1.5 rounded text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white transition">
          確認送出
        </button>
      </div>
    </div>
  </div>

  <script>
    // 統一的 API Fetch 工具（使用 Cookie 認證，不需要手動帶 token）
    async function apiFetch(url, options = {}) {
      const res = await fetch(url, Object.assign({ credentials: 'same-origin' }, options));
      if (res.status === 401) {
        window.location.href = '/login';
      }
      return res;
    }

    // 頁籤切換（桌面頁籤與手機漢堡選單共用 data-tab 標記）
    function switchTab(t) {      const tabs = ['dashboard', 'contacts', 'campaigns', 'automations', 'settings'];
      tabs.forEach(tabName => {
        const section = document.getElementById('tab-' + tabName);
        if (tabName === t) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      });
      document.querySelectorAll('[data-tab]').forEach(btn => {
        const isTarget = btn.getAttribute('data-tab') === t;
        if (btn.getAttribute('data-nav-style') === 'tab') {
          btn.classList.toggle('tab-active', isTarget);
          btn.classList.toggle('tab-inactive', !isTarget);
        } else {
          btn.classList.toggle('m-active', isTarget);
          btn.classList.toggle('m-inactive', !isTarget);
        }
      });
      closeMobileMenu();
      if (t === 'dashboard') loadDashboardStats();
      if (t === 'contacts') loadContactsData();
      if (t === 'automations') loadAutomationsData();
      if (t === 'settings') loadSettingsData();
    }

    // 手機漢堡選單開關
    function toggleMobileMenu() {
      document.getElementById('mobile-drawer').classList.toggle('hidden');
    }
    function closeMobileMenu() {
      document.getElementById('mobile-drawer').classList.add('hidden');
    }

    // 聯絡人頁「更多」三點選單（點外面自動收合）
    function toggleContactsMoreMenu(e) {
      if (e) e.stopPropagation();
      document.getElementById('contacts-more-menu').classList.toggle('hidden');
    }
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('contacts-more-menu');
      if (menu && !menu.classList.contains('hidden') && !e.target.closest('#contacts-more-wrap')) {
        menu.classList.add('hidden');
      }
    });


    // 5. 設定頁 API 串接
    const SETTING_KEYS = ['site_domain','landing_title','landing_intro','tosend_from_name','tosend_from_email','tosend_api_key'];

    async function loadSettingsData() {
      try {
        const res = await apiFetch('/api/admin/settings');
        if (!res.ok) return;
        const data = await res.json();
        for (const k of SETTING_KEYS) {
          const el = document.getElementById('set-' + k);
          if (!el) continue;
          if (k === 'tosend_api_key') {
            const set = data.settings[k] && data.settings[k].set;
            document.getElementById('btn-clear-key').classList.toggle('hidden', !set);
            const st = document.getElementById('key-status');
            if (set) {
              st.textContent = '✓ 金鑰已設定（加密存放，不回顯）';
              st.className = 'text-[11px] mt-1 text-emerald-600';
              st.classList.remove('hidden');
            } else {
              st.classList.add('hidden');
            }
            el.value = '';
            el.placeholder = set ? '已設定，輸入新金鑰可覆蓋' : 'ts_live_...';
          } else {
            el.value = (data.settings[k] && data.settings[k].value) || '';
          }
        }
        // onboarding 橫幅（derived）
        document.getElementById('onboarding-banner').classList.toggle('hidden', data.onboarding_done === true);
      } catch (err) {
        console.error('[Settings] Failed:', err);
      }
    }

    function showSettingsMsg(text, ok) {
      const el = document.getElementById('settings-msg');
      el.textContent = text;
      el.className = 'text-xs ' + (ok ? 'text-emerald-600' : 'text-rose-600');
      el.classList.remove('hidden');
    }

    async function saveSettings(keys) {
      showSettingsMsg('儲存中...', true);
      try {
        for (const k of keys) {
          const el = document.getElementById('set-' + k);
          if (!el) continue;
          const res = await apiFetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: k, value: el.value.trim() }),
          });
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            showSettingsMsg('儲存失敗：' + (d.error || k), false);
            return;
          }
        }
        showSettingsMsg('✓ 已儲存', true);
        loadSettingsData();
      } catch (err) {
        showSettingsMsg('儲存失敗：無法連線', false);
      }
    }

    // ToSend 金鑰兩步驟：先驗證（不落庫）→ 成功才寫入
    async function verifyAndSaveTosend() {
      const apiKey = document.getElementById('set-tosend_api_key').value.trim();
      const fromEmail = document.getElementById('set-tosend_from_email').value.trim();
      const fromName = document.getElementById('set-tosend_from_name').value.trim();
      if (!apiKey) { showSettingsMsg('請先輸入 ToSend API Key', false); return; }
      if (!fromEmail) { showSettingsMsg('請先填寫寄件人信箱', false); return; }
      const btn = document.getElementById('btn-verify-tosend');
      btn.disabled = true; btn.innerText = '驗證中...';
      try {
        const vres = await apiFetch('/api/admin/settings/verify-tosend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey, from_email: fromEmail, from_name: fromName }),
        });
        const vd = await vres.json().catch(() => ({}));
        if (!vres.ok) {
          showSettingsMsg('驗證失敗：' + (vd.error || '未知原因') + (vd.detail ? '（' + vd.detail + '）' : ''), false);
          return;
        }
        const sres = await apiFetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'tosend_api_key', value: apiKey }),
        });
        if (!sres.ok) {
          const sd = await sres.json().catch(() => ({}));
          showSettingsMsg('儲存失敗：' + (sd.error || '未知原因'), false);
          return;
        }
        showSettingsMsg('✓ 測試信已寄出，金鑰已加密儲存', true);
        loadSettingsData();
      } finally {
        btn.disabled = false; btn.innerText = '驗證並儲存金鑰';
      }
    }

    // HAOJI_SECRET 重設後的一鍵清除重設
    async function clearTosendKey() {
      if (!confirm('確定要清除已儲存的 ToSend 金鑰嗎？之後需重新驗證。')) return;
      const res = await apiFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'tosend_api_key', value: '' }),
      });
      if (res.ok) { showSettingsMsg('✓ 已清除，請重新輸入並驗證', true); loadSettingsData(); }
    }

    async function changePassword() {
      const oldP = document.getElementById('set-old-password').value;
      const newP = document.getElementById('set-new-password').value;
      const res = await apiFetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldP, new_password: newP }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { showSettingsMsg('✓ 密碼已更新，請重新登入', true); }
      else { showSettingsMsg('修改失敗：' + (d.error || '未知原因'), false); }
    }

    // 1. 數據總覽 API 串接
    async function loadDashboardStats() {
      try {
        const res = await apiFetch('/api/admin/stats');
        if (res.ok) {
          const s = await res.json();
          document.getElementById('dash-active').innerText = s.activeCount ?? 0;
          document.getElementById('dash-sent').innerText = s.sentCount ?? 0;
          document.getElementById('dash-unsub').innerText = s.unsubCount ?? 0;
          document.getElementById('dash-failed').innerText = s.failedCount ?? 0;
        }
      } catch (err) {
        console.error('[Stats] Failed:', err);
      }
      loadLogsData();
    }

    // 載入即時日誌
    async function loadLogsData() {
      const tbody = document.getElementById('logs-tbody');
      const cardsEl = document.getElementById('logs-cards');
      try {
        const res = await apiFetch('/api/admin/logs');
        if (res.ok) {
          const { logs } = await res.json();
          if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-stone-400">目前 D1 資料庫尚無發信日誌</td></tr>';
            cardsEl.innerHTML = '<div class="py-4 text-center text-stone-400 text-sm">目前 D1 資料庫尚無發信日誌</div>';
          } else {
            tbody.innerHTML = logs.map(l =>
              '<tr>' +
                '<td class="py-2.5 font-mono">' + (l.subscriber_email || '--') + '</td>' +
                '<td class="py-2.5">' + (l.sequence_id ? ('關卡 ' + (l.step_number || l.sequence_id)) : '個別/廣播信') + '</td>' +
                '<td class="py-2.5 font-sans">' + (l.sequence_subject || '--') + '</td>' +
                '<td class="py-2.5"><span class="px-2 py-0.5 rounded text-[10px] ' + (l.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200') + '">' + l.status + '</span></td>' +
                '<td class="py-2.5 text-right text-stone-400 font-mono">' + (l.sent_at || '--') + '</td>' +
              '</tr>'
            ).join('');
            // 手機版卡片
            cardsEl.innerHTML = logs.map(l =>
              '<div class="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-1.5">' +
                '<div class="flex items-start justify-between gap-2">' +
                  '<div class="font-mono text-sm font-medium text-stone-900 break-all min-w-0">' + (l.subscriber_email || '--') + '</div>' +
                  '<span class="px-2 py-0.5 rounded text-[11px] shrink-0 ' + (l.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700') + '">' + l.status + '</span>' +
                '</div>' +
                '<div class="text-sm text-stone-700">' + (l.sequence_subject || '--') + '</div>' +
                '<div class="text-xs text-stone-400">' + (l.sequence_id ? ('關卡 ' + (l.step_number || l.sequence_id)) : '個別/廣播信') + ' · ' + (l.sent_at || '--') + '</div>' +
              '</div>'
            ).join('');
          }
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-rose-500">無法連線載入日誌</td></tr>';
        cardsEl.innerHTML = '<div class="py-4 text-center text-rose-500 text-sm">無法連線載入日誌</div>';
      }
    }

    // 2. 聯絡人名單 API 串接
    let allContactsList = [];
    async function loadContactsData() {
      const tbody = document.getElementById('contacts-tbody');
      try {
        const res = await apiFetch('/api/admin/subscribers');
        if (res.ok) {
          const { subscribers } = await res.json();
          allContactsList = subscribers || [];
          renderContactsTable(allContactsList);
          refreshTagFilter();
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-rose-500">無法連線載入名單</td></tr>';
      }
    }

    // 從 /api/admin/tags 動態產生標籤篩選選單
    async function refreshTagFilter() {
      try {
        const res = await apiFetch('/api/admin/tags');
        if (!res.ok) return;
        const { tags } = await res.json();
        const sel = document.getElementById('filter-tag');
        const current = sel.value;
        sel.innerHTML = '<option value="all">全部名單</option>' +
          (tags || []).map(t => '<option value="' + t.name + '">' + t.name + '（' + t.count + '）</option>').join('');
        sel.value = current;
      } catch (e) { console.error('[Tags] Failed:', e); }
    }

    function renderContactsTable(list) {
      const tbody = document.getElementById('contacts-tbody');
      const cardsEl = document.getElementById('contacts-cards');
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-stone-400">目前 D1 資料庫尚無聯絡人名單，可從前台訂閱、匯入 CSV 或點選右上方新增</td></tr>';
        cardsEl.innerHTML = '<div class="py-4 text-center text-stone-400 text-sm">目前尚無聯絡人名單<br>可從前台訂閱、匯入 CSV 或點選「新增聯絡人」</div>';
        return;
      }

      const statusBadge = (sub) => '<span class="px-2 py-0.5 rounded text-[10px] ' + (sub.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200') + '">' + (sub.status === 'active' ? '啟用中' : sub.status === 'bounced' ? '已退信' : sub.status === 'deleted' ? '已刪除' : '已退訂') + '</span>';
      const tagsHtml = (sub) => (sub.tags || ';一般訂閱;').replace(/^;|;$/g, '').split(';').filter(Boolean).map(t =>
        '<span class="inline-block mr-1 mb-1 px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">' + t + '</span>'
      ).join('');
      const actionBtns = (sub) =>
        (sub.status === 'active'
          ? '<button onclick="openDirectSendModal(\\'' + sub.email + '\\', \\'' + (sub.name || '') + '\\')" class="text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium px-2.5 py-1.5 rounded transition">個別發信</button> '
          : '') +
        '<button onclick="editContact(' + sub.id + ')" class="text-xs px-2.5 py-1.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50 transition">編輯</button> ' +
        '<button onclick="deleteContact(' + sub.id + ', \\'' + sub.email + '\\')" class="text-xs px-2.5 py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition">刪除</button>';

      // 電腦版表格
      tbody.innerHTML = list.map(sub => {
        const isUnsub = sub.status !== 'active';
        return '<tr>' +
          '<td class="py-3 font-mono font-medium ' + (isUnsub ? 'text-stone-400 line-through' : 'text-stone-900') + '">' + sub.email + '</td>' +
          '<td class="py-3">' + (sub.name || '--') + '</td>' +
          '<td class="py-3">' + tagsHtml(sub) + '</td>' +
          '<td class="py-3">' + statusBadge(sub) + '</td>' +
          '<td class="py-3 text-stone-400 font-mono">' + (sub.created_at || '--') + '</td>' +
          '<td class="py-3 text-right whitespace-nowrap">' + actionBtns(sub) + '</td>' +
        '</tr>';
      }).join('');

      // 手機版卡片
      cardsEl.innerHTML = list.map(sub => {
        const isUnsub = sub.status !== 'active';
        return '<div class="bg-white border border-stone-200 rounded-lg p-3 space-y-2">' +
          '<div class="flex items-start justify-between gap-2">' +
            '<div class="min-w-0">' +
              '<div class="font-mono text-sm font-medium break-all ' + (isUnsub ? 'text-stone-400 line-through' : 'text-stone-900') + '">' + sub.email + '</div>' +
              '<div class="text-xs text-stone-500 mt-0.5">' + (sub.name || '（未命名）') + ' · 訂閱於 ' + (sub.created_at || '--') + '</div>' +
            '</div>' +
            statusBadge(sub) +
          '</div>' +
          '<div>' + tagsHtml(sub) + '</div>' +
          '<div class="flex flex-wrap gap-2 pt-2 border-t border-stone-100">' + actionBtns(sub) + '</div>' +
        '</div>';
      }).join('');
    }

    function filterContactsByTag(tag) {
      if (tag === 'all') {
        renderContactsTable(allContactsList);
      } else {
        // 正規化分號包裹格式：用分號邊界比對
        const filtered = allContactsList.filter(s => (';' + (s.tags || '') + ';').includes(';' + tag + ';'));
        renderContactsTable(filtered);
      }
    }

    // 編輯聯絡人（名稱 + 標籤，分號分隔多標籤）
    async function editContact(id) {
      const sub = allContactsList.find(s => s.id === id);
      if (!sub) return;
      const name = prompt('稱呼 / 姓名：', sub.name || '');
      if (name === null) return;
      const tags = prompt('標籤（多個用分號分隔，如：VIP;BNI）：', (sub.tags || '').replace(/^;|;$/g, ''));
      if (tags === null) return;
      const res = await apiFetch('/api/admin/subscribers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, tags }),
      });
      if (res.ok) { loadContactsData(); } else { alert('更新失敗'); }
    }

    async function deleteContact(id, email) {
      if (!confirm('確定刪除 ' + email + ' 嗎？（發信紀錄會保留，僅從名單隱藏）')) return;
      const res = await apiFetch('/api/admin/subscribers?id=' + id, { method: 'DELETE' });
      if (res.ok) { loadContactsData(); } else { alert('刪除失敗'); }
    }

    // CSV 匯入（檔案 → POST /api/admin/import → 顯示結果明細）
    async function importCsvFile(input) {
      const file = input.files && input.files[0];
      if (!file) return;
      const box = document.getElementById('import-result');
      box.classList.remove('hidden');
      box.innerText = '匯入中：' + file.name + '...';
      try {
        const res = await apiFetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'text/csv' },
          body: file,
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          box.innerHTML = '<span class="text-rose-600">匯入失敗：' + (d.error || '未知原因') + '</span>';
          return;
        }
        let html = '<div>匯入完成：共 ' + d.total + ' 列，成功 <b>' + d.succeeded + '</b>，失敗 <b>' + d.failed + '</b></div>';
        if (d.errors && d.errors.length) {
          html += '<ul class="mt-2 space-y-1 text-rose-600">' + d.errors.map(e =>
            '<li>第 ' + e.row + ' 列（' + (e.email || '空') + '）：' + e.reason + '</li>'
          ).join('') + '</ul>';
        }
        box.innerHTML = html;
        loadContactsData();
      } catch (e) {
        box.innerHTML = '<span class="text-rose-600">匯入失敗：無法連線</span>';
      }
      input.value = '';
    }

    function exportCsv() {
      window.open('/api/admin/export', '_blank');
    }

    // 手動新增聯絡人
    async function promptNewSubscriber() {
      const email = prompt('請輸入新聯絡人 Email：');
      if (!email) return;
      const name = prompt('請輸入稱呼 / 姓名（選填）：', '') || '';
      const tags = prompt('請輸入分類標籤（例如 VIP、潛在客戶、一般訂閱）：', '一般訂閱') || '一般訂閱';

      try {
        const res = await apiFetch('/api/admin/subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, tags })
        });
        const d = await res.json();
        if (res.ok && d.success) {
          alert('成功新增聯絡人至 D1 資料庫！');
          loadContactsData();
          loadDashboardStats();
        } else {
          alert('新增失敗：' + (d.error || '未知原因'));
        }
      } catch (err) {
        alert('新增失敗：無法連線至 Worker');
      }
    }

    // 個別發信 Modal
    let currentTargetEmail = '';
    let currentTargetName = '';
    function openDirectSendModal(email, name) {
      currentTargetEmail = email;
      currentTargetName = name;
      document.getElementById('modal-recipient').innerText = (name ? name + ' <' + email + '>' : email);
      document.getElementById('modal-subject').value = '';
      document.getElementById('modal-content').value = '嗨 ' + (name || '朋友') + '，\\n\\n';
      document.getElementById('direct-send-modal').classList.remove('hidden');
    }
    function closeDirectSendModal() {
      document.getElementById('direct-send-modal').classList.add('hidden');
    }
    async function submitDirectSend() {
      const subj = document.getElementById('modal-subject').value.trim();
      const content = document.getElementById('modal-content').value.trim();
      if (!subj || !content) {
        alert('請填寫主旨與信件內容！');
        return;
      }

      const btn = document.getElementById('btn-submit-direct');
      btn.disabled = true;
      btn.innerText = '發送中...';

      try {
        const res = await apiFetch('/api/admin/send-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentTargetEmail,
            name: currentTargetName,
            subject: subj,
            content: '<p>' + content.replace(/\\n/g, '</p><p>') + '</p>'
          })
        });
        const d = await res.json();
        if (res.ok && d.success) {
          alert('信件已成功透過 ToSend API 送出！');
          closeDirectSendModal();
          loadDashboardStats();
        } else {
          alert('發送失敗：' + (d.error || '請檢查 Worker 是否配置 TOSEND_API_KEY'));
        }
      } catch (err) {
        alert('發送失敗：連線錯誤');
      } finally {
        btn.disabled = false;
        btn.innerText = '確認送出';
      }
    }

    // 3. 廣播群發功能
    function toggleAudienceFilter(val) {
      const tagBox = document.getElementById('audience-tag-box');
      if (val === 'tag') {
        tagBox.classList.remove('hidden');
      } else {
        tagBox.classList.add('hidden');
      }
    }

    async function executeCampaignBroadcast() {
      const aud = document.querySelector('input[name="audience_type"]:checked').value;
      const tag = document.getElementById('campaign-selected-tag').value;
      const name = document.getElementById('campaign-name').value.trim();
      const subject = document.getElementById('campaign-subject').value.trim();
      const visualEl = document.getElementById('campaign-visual-editor');
      const htmlEl = document.getElementById('campaign-html-editor');
      const content = (campaignMode === 'visual') ? visualEl.innerHTML : htmlEl.value;

      if (!subject || !content) {
        alert('請填寫廣播信主旨與正文內容！');
        return;
      }

      const targetDesc = (aud === 'tag') ? ('指定標籤：' + tag) : '全部有效聯絡人';
      if (!confirm('確定要立即透過 ToSend API 群發廣播信給【' + targetDesc + '】嗎？')) {
        return;
      }

      const btn = document.getElementById('btn-campaign-send');
      btn.disabled = true;
      btn.innerText = '正在透過 ToSend 批次群發中...';

      try {
        const res = await apiFetch('/api/admin/campaigns/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            subject,
            content_html: content,
            target_type: aud,
            target_tag: tag
          })
        });
        const d = await res.json();
        if (res.ok && d.success) {
          alert('廣播發送完成！總發送受眾：' + d.total_targets + ' 人，成功：' + d.sent_success + ' 封，失敗：' + d.sent_failed + ' 封。');
          loadDashboardStats();
          switchTab('dashboard');
        } else {
          alert('群發失敗：' + (d.error || '未知原因'));
        }
      } catch (err) {
        alert('群發連線失敗：請檢查伺服器');
      } finally {
        btn.disabled = false;
        btn.innerText = '確認立即群發';
      }
    }

    async function sendCampaignTestEmail() {
      const email = prompt('請輸入接收測試信的信箱：');
      if (!email) return;
      const subj = '[測試信] ' + document.getElementById('campaign-subject').value;
      const visualEl = document.getElementById('campaign-visual-editor');
      const htmlEl = document.getElementById('campaign-html-editor');
      const content = (campaignMode === 'visual') ? visualEl.innerHTML : htmlEl.value;

      try {
        const res = await apiFetch('/api/admin/send-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: '管理員', subject: subj, content })
        });
        const d = await res.json();
        if (res.ok && d.success) {
          alert('測試廣播信已發送至：' + email);
        } else {
          alert('發送測試信失敗：' + (d.error || '請檢查金鑰'));
        }
      } catch (e) {
        alert('發送測試信失敗');
      }
    }

    // 4. 自動跟進排程 API 串接
    let automationsDbList = {};
    let activeAutoStep = 1;

    async function loadAutomationsData() {
      try {
        const res = await apiFetch('/api/admin/sequences');
        if (res.ok) {
          const { sequences } = await res.json();
          if (sequences && sequences.length > 0) {
            sequences.forEach(seq => {
              automationsDbList[seq.step_number] = seq;
              const titleEl = document.getElementById('step-title-' + seq.step_number);
              if (titleEl) titleEl.innerText = seq.subject;
            });
            renderAutoStepToEditor(activeAutoStep);
          }
        }
      } catch (err) {
        console.error('[Automations] Load failed:', err);
      }
    }

    function renderAutoStepToEditor(stepNum) {
      activeAutoStep = stepNum;
      [1, 2, 3].forEach(s => {
        const item = document.getElementById('step-item-' + s);
        if (s === stepNum) {
          item.className = 'p-3.5 rounded-lg border border-stone-900 bg-white shadow-xs cursor-pointer transition';
        } else {
          item.className = 'p-3.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-white cursor-pointer transition';
        }
      });

      const d = automationsDbList[stepNum] || {
        subject: '歡迎加入！這是你的第一份專屬精選指南',
        delay_hours: 0,
        is_active: 1,
        content_html: '<p>嗨 <strong>{{name}}</strong>，</p><p>感謝你的訂閱！</p>'
      };

      document.getElementById('auto-editor-title').innerText = '編輯關卡 0' + stepNum + '：' + d.subject;
      document.getElementById('auto-input-delay').value = d.delay_hours ?? 0;
      document.getElementById('auto-select-active').value = (d.is_active ?? 1).toString();
      document.getElementById('auto-input-subject').value = d.subject || '';
      document.getElementById('auto-visual-editor').innerHTML = d.content_html || '';
      document.getElementById('auto-html-editor').value = d.content_html || '';
    }

    function selectAutomationStep(stepNum) {
      renderAutoStepToEditor(stepNum);
    }

    async function saveAutomationStep() {
      const visualEl = document.getElementById('auto-visual-editor');
      const htmlEl = document.getElementById('auto-html-editor');
      const content = (autoEditorMode === 'visual') ? visualEl.innerHTML : htmlEl.value;
      const delay = parseInt(document.getElementById('auto-input-delay').value, 10);
      const subject = document.getElementById('auto-input-subject').value.trim();
      const isActive = parseInt(document.getElementById('auto-select-active').value, 10);

      if (!subject || !content) {
        alert('請填寫信件主旨與內容！');
        return;
      }

      const btn = document.getElementById('btn-save-auto');
      btn.disabled = true;
      btn.innerText = '儲存中...';

      try {
        const res = await apiFetch('/api/admin/sequences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step_number: activeAutoStep,
            delay_hours: delay,
            subject,
            content_html: content,
            is_active: isActive
          })
        });
        const d = await res.json();
        if (res.ok && d.success) {
          alert('關卡 0' + activeAutoStep + ' 已成功寫入 Cloudflare D1 資料庫！重新整理將持續保存。');
          loadAutomationsData();
        } else {
          alert('儲存失敗：' + (d.error || '未知原因'));
        }
      } catch (err) {
        alert('儲存失敗：無法連線至 Worker');
      } finally {
        btn.disabled = false;
        btn.innerText = '儲存關卡設定';
      }
    }

    async function sendAutoTestEmail() {
      const email = prompt('請輸入接收測試信的信箱：');
      if (!email) return;
      const subj = '[關卡測試] ' + document.getElementById('auto-input-subject').value;
      const visualEl = document.getElementById('auto-visual-editor');
      const htmlEl = document.getElementById('auto-html-editor');
      const content = (autoEditorMode === 'visual') ? visualEl.innerHTML : htmlEl.value;

      try {
        const res = await apiFetch('/api/admin/send-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: '管理員', subject: subj, content })
        });
        const d = await res.json();
        if (res.ok && d.success) {
          alert('測試信已發送至：' + email);
        } else {
          alert('發送失敗：' + (d.error || '請檢查金鑰'));
        }
      } catch (e) {
        alert('發送測試信失敗');
      }
    }

    // 手動觸發排程派送
    async function triggerCronExecution() {
      const btn = document.getElementById('btn-trigger-cron');
      btn.disabled = true;
      btn.innerText = '檢查中...';
      try {
        const res = await apiFetch('/api/admin/trigger-cron', { method: 'POST' });
        const d = await res.json();
        if (res.ok && d.success) {
          alert('排程檢查執行完畢！本次成功自動派發 ' + (d.sent_count ?? 0) + ' 封郵件。');
          loadDashboardStats();
        } else {
          alert('排程觸發失敗：' + (d.error || '未知原因'));
        }
      } catch (err) {
        alert('排程觸發連線失敗');
      } finally {
        btn.disabled = false;
        btn.innerText = '執行單次排程派送';
      }
    }

    function logoutAdmin() {
      localStorage.removeItem('ADMIN_API_KEY');
      window.location.href = '/login';
    }

    // 編輯器控制：廣播信
    let campaignMode = 'visual';
    function switchCampaignEditorMode(mode) {
      campaignMode = mode;
      const visualWrapper = document.getElementById('campaign-visual-wrapper');
      const visualEl = document.getElementById('campaign-visual-editor');
      const htmlEl = document.getElementById('campaign-html-editor');
      const toolbar = document.getElementById('campaign-editor-toolbar');
      const btnV = document.getElementById('btn-campaign-mode-visual');
      const btnH = document.getElementById('btn-campaign-mode-html');

      if (mode === 'visual') {
        visualEl.innerHTML = htmlEl.value;
        visualWrapper.classList.remove('hidden');
        htmlEl.classList.add('hidden');
        toolbar.classList.remove('hidden');
        btnV.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnH.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      } else {
        htmlEl.value = visualEl.innerHTML;
        visualWrapper.classList.add('hidden');
        htmlEl.classList.remove('hidden');
        toolbar.classList.add('hidden');
        btnH.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnV.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      }
    }

    function setCampaignDeviceWidth(dev) {
      const wrap = document.getElementById('campaign-visual-wrapper');
      const btnD = document.getElementById('btn-campaign-device-desktop');
      const btnM = document.getElementById('btn-campaign-device-mobile');
      if (dev === 'desktop') {
        wrap.style.maxWidth = '600px';
        btnD.className = 'px-2 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnM.className = 'px-2 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      } else {
        wrap.style.maxWidth = '375px';
        btnM.className = 'px-2 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnD.className = 'px-2 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      }
    }

    function execCampaignCmd(cmd, val = null) {
      document.execCommand(cmd, false, val);
      document.getElementById('campaign-html-editor').value = document.getElementById('campaign-visual-editor').innerHTML;
    }
    function execCampaignFormatBlock(tag) {
      document.execCommand('formatBlock', false, tag);
      document.getElementById('campaign-html-editor').value = document.getElementById('campaign-visual-editor').innerHTML;
    }
    function insertCampaignVariable(v) {
      if (!v) return;
      const span = '<span style="background-color: #f5f5f4; border: 1px solid #e7e5e4; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #44403c;">' + v + '</span>&nbsp;';
      document.execCommand('insertHTML', false, span);
    }
    function insertCampaignCtaButton() {
      const txt = prompt('請輸入按鈕文字：', '立即點擊查看');
      if (!txt) return;
      const url = prompt('請輸入按鈕連結網址：', 'https://');
      if (!url) return;
      const btnHtml = '<div style="text-align: center; margin: 24px 0;"><a href="' + url + '" target="_blank" style="background-color: #1c1917; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">' + txt + '</a></div><p></p>';
      document.execCommand('insertHTML', false, btnHtml);
    }

    // 編輯器控制：自動跟進排程
    let autoEditorMode = 'visual';
    function switchAutoEditorMode(mode) {
      autoEditorMode = mode;
      const visualWrapper = document.getElementById('auto-visual-wrapper');
      const visualEl = document.getElementById('auto-visual-editor');
      const htmlEl = document.getElementById('auto-html-editor');
      const toolbar = document.getElementById('auto-editor-toolbar');
      const btnV = document.getElementById('btn-auto-mode-visual');
      const btnH = document.getElementById('btn-auto-mode-html');

      if (mode === 'visual') {
        visualEl.innerHTML = htmlEl.value;
        visualWrapper.classList.remove('hidden');
        htmlEl.classList.add('hidden');
        toolbar.classList.remove('hidden');
        btnV.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnH.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      } else {
        htmlEl.value = visualEl.innerHTML;
        visualWrapper.classList.add('hidden');
        htmlEl.classList.remove('hidden');
        toolbar.classList.add('hidden');
        btnH.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnV.className = 'px-2.5 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      }
    }

    function setAutoDeviceWidth(dev) {
      const wrap = document.getElementById('auto-visual-wrapper');
      const btnD = document.getElementById('btn-auto-device-desktop');
      const btnM = document.getElementById('btn-auto-device-mobile');
      if (dev === 'desktop') {
        wrap.style.maxWidth = '600px';
        btnD.className = 'px-2 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnM.className = 'px-2 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      } else {
        wrap.style.maxWidth = '375px';
        btnM.className = 'px-2 py-0.5 rounded text-[11px] font-medium bg-white text-stone-900 shadow-2xs';
        btnD.className = 'px-2 py-0.5 rounded text-[11px] font-medium text-stone-500 hover:text-stone-800';
      }
    }

    function execAutoCmd(cmd, val = null) {
      document.execCommand(cmd, false, val);
      document.getElementById('auto-html-editor').value = document.getElementById('auto-visual-editor').innerHTML;
    }
    function execAutoFormatBlock(tag) {
      document.execCommand('formatBlock', false, tag);
      document.getElementById('auto-html-editor').value = document.getElementById('auto-visual-editor').innerHTML;
    }
    function insertAutoVariable(v) {
      if (!v) return;
      const span = '<span style="background-color: #f5f5f4; border: 1px solid #e7e5e4; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #44403c;">' + v + '</span>&nbsp;';
      document.execCommand('insertHTML', false, span);
    }
    function insertAutoCtaButton() {
      const txt = prompt('請輸入按鈕文字：', '立即開始閱讀指南');
      if (!txt) return;
      const url = prompt('請輸入按鈕連結網址：', 'https://');
      if (!url) return;
      const btnHtml = '<div style="text-align: center; margin: 24px 0;"><a href="' + url + '" target="_blank" style="background-color: #1c1917; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">' + txt + '</a></div><p></p>';
      document.execCommand('insertHTML', false, btnHtml);
    }

    // 頁面初始化：載入統計與各項數據
    document.addEventListener('DOMContentLoaded', () => {
      // 綁定所有 data-tab 導航按鈕（桌面頁籤＋手機漢堡選單）
      document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
      });
      loadDashboardStats();
    });
    // 保險觸發
    loadDashboardStats();
  </script>
</body>
</html>`;