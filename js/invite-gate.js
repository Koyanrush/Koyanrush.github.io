/**
 * invite-gate 客户端 —— 受限文章邀请码验证弹窗
 * 由 scripts/invite-gate.js 在构建时注入到 restricted: true 的文章页。
 *
 * 无服务器验证：构建时页面内嵌各周邀请码的 PBKDF2 哈希（#invite-gate-data），
 * 浏览器本地推导比对，零网络请求——国内裸网环境同样可用。
 *
 * 防护层次（弹窗期间生效，验证通过全部解除）：
 *   1. 正文从 DOM 摘除，存于闭包变量 —— Elements 面板翻不到
 *   2. 拦截 F12 / Ctrl+Shift+I/J/C/K / Ctrl+U/S/P / Cmd+Opt 系快捷键与右键菜单
 *   3. 控制台掩护：DevTools 探测 + console.clear + 横幅 + debugger 陷阱
 * 注意：初始 HTML 响应（view-source:、Network 面板、部署仓库）仍含明文，此为遮罩型防护。
 */
(function () {
  // debugger 陷阱：DevTools 打开时每秒断一次。调试自己站点时可改为 false
  var ANTI_DEBUG = true;

  var STORAGE_KEY = 'invite-gate-unlock';

  // 手动重新上锁：文章 URL 后加 #relock 即清除本机解锁缓存（测试/演示用），
  // 清完顺手抹掉 hash，刷新不会反复触发
  if (location.hash === '#relock') {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  var lockedNodes = Array.prototype.slice.call(document.querySelectorAll('.invite-gate-locked'));
  if (!lockedNodes.length) return;
  if (document.getElementById('invite-gate-mask')) return;

  // 构建时嵌入的验证数据：{ anchor, period, iters, hashes: { 周序号: pbkdf2十六进制 } }
  var GATE = null;
  try {
    GATE = JSON.parse(document.getElementById('invite-gate-data').textContent);
  } catch (e) { /* 数据缺失时 fail-closed：弹窗仍出现，提交时提示配置错误 */ }

  function isUnlocked() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && typeof saved.expiresAt === 'number' && Date.now() < saved.expiresAt;
    } catch (e) {
      return false;
    }
  }

  // 已在有效期内：直接显示，不走摘除流程
  if (isUnlocked()) {
    lockedNodes.forEach(function (el) { el.style.display = ''; });
    return;
  }

  // ---------- 第 1 层：正文摘除 ----------
  // 记录每个节点的原位置（父节点 + 后继），验证通过后原位插回
  var anchors = lockedNodes.map(function (el) {
    var slot = { parent: el.parentNode, next: el.nextSibling };
    el.parentNode.removeChild(el);
    return slot;
  });

  function restoreContent() {
    lockedNodes.forEach(function (el, i) {
      el.style.display = '';
      anchors[i].parent.insertBefore(el, anchors[i].next);
    });
    // 内容是初始化后才插回的，需让主题重新绑定 lazyload/灯箱/代码块等
    if (typeof window.refreshFn === 'function') {
      try { window.refreshFn(); } catch (e) {}
    }
  }

  // ---------- 弹窗 ----------
  if (!document.getElementById('invite-gate-style')) {
    var style = document.createElement('style');
    style.id = 'invite-gate-style';
    style.textContent =
      '#invite-gate-mask{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
      'animation:invite-gate-fade .25s ease-out;transition:opacity .35s}' +
      '#invite-gate-mask.invite-gate-pass{opacity:0}' +
      '@keyframes invite-gate-fade{from{opacity:0}to{opacity:1}}' +
      '.invite-gate-card{width:min(420px,calc(100vw - 48px));padding:36px 32px 26px;border-radius:16px;' +
      'background:var(--anzhiyu-card-bg,#fff);color:var(--anzhiyu-fontcolor,#363636);' +
      'border:var(--style-border,1px solid #e3e8f7);box-shadow:0 12px 40px rgba(0,0,0,.25);' +
      'text-align:center;animation:invite-gate-pop .3s ease-out}' +
      '@keyframes invite-gate-pop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}' +
      '.invite-gate-card.invite-gate-shake{animation:invite-gate-shake .4s}' +
      '@keyframes invite-gate-shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}' +
      '30%,50%,70%{transform:translateX(-6px)}40%,60%{transform:translateX(6px)}}' +
      '.invite-gate-icon{color:var(--anzhiyu-main,#425aef);margin-bottom:12px}' +
      '.invite-gate-title{font-size:18px;font-weight:700;margin-bottom:6px}' +
      '.invite-gate-desc{font-size:14px;opacity:.75;margin-bottom:20px}' +
      '.invite-gate-row{display:flex;gap:10px}' +
      '.invite-gate-row input{flex:1;min-width:0;padding:10px 14px;border-radius:8px;font-size:15px;' +
      'letter-spacing:2px;font-family:Consolas,Monaco,monospace;outline:none;' +
      'border:1px solid var(--anzhiyu-card-border,#e3e8f7);background:var(--anzhiyu-secondbg,#f7f7f9);color:inherit}' +
      '.invite-gate-row input:focus{border-color:var(--anzhiyu-main,#425aef)}' +
      '.invite-gate-row button{padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-size:14px;' +
      'white-space:nowrap;background:var(--anzhiyu-main,#425aef);color:#fff;transition:opacity .2s}' +
      '.invite-gate-row button:disabled{opacity:.6;cursor:not-allowed}' +
      '.invite-gate-msg{min-height:20px;margin-top:10px;font-size:13px;color:#e64545}' +
      '.invite-gate-foot{margin-top:12px;font-size:12px;opacity:.6}' +
      '.invite-gate-foot a{color:inherit;text-decoration:underline}';
    document.head.appendChild(style);
  }

  var mask = document.createElement('div');
  mask.id = 'invite-gate-mask';
  mask.innerHTML =
    '<div class="invite-gate-card">' +
    '<div class="invite-gate-icon">' +
    '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
    '</div>' +
    '<div class="invite-gate-title">本篇内容被设置为限制访问</div>' +
    '<div class="invite-gate-desc">请输入邀请码后继续</div>' +
    '<div class="invite-gate-row">' +
    '<input type="text" maxlength="8" placeholder="请输入 8 位邀请码" autocomplete="off" spellcheck="false">' +
    '<button type="button">验 证</button>' +
    '</div>' +
    '<div class="invite-gate-msg"></div>' +
    '<div class="invite-gate-foot">邀请码区分大小写 · 每 7 天更换一次 · <a href="/">返回首页</a></div>' +
    '</div>';
  document.body.appendChild(mask);
  document.body.style.overflow = 'hidden';

  // ---------- 第 2 层：快捷键与右键拦截 ----------
  function keyBlocker(e) {
    var k = (e.key || '').toUpperCase();
    var blocked =
      e.key === 'F12' ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'I' || k === 'J' || k === 'C' || k === 'K')) ||
      ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (k === 'U' || k === 'S' || k === 'P')) ||
      (e.metaKey && e.altKey && (k === 'I' || k === 'J' || k === 'C' || k === 'U'));
    if (blocked) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  function ctxBlocker(e) {
    // 弹窗内部放行，保证输入框右键粘贴可用
    if (mask.contains(e.target)) return;
    e.preventDefault();
  }
  document.addEventListener('keydown', keyBlocker, true);
  document.addEventListener('contextmenu', ctxBlocker, true);

  // ---------- 第 3 层：控制台掩护 ----------
  function consoleBanner() {
    try {
      console.log(
        '%c🔒 邀请码保护中',
        'padding:8px 18px;font-size:20px;font-weight:bold;color:#fff;' +
        'background:linear-gradient(90deg,#425aef,#8e6df0);border-radius:8px'
      );
      console.log(
        '%c本篇内容需要邀请码才能查看。绕过弹窗没有用哦，正文并不在这个页面里 :)',
        'font-size:13px;color:#888'
      );
    } catch (e) {}
  }
  consoleBanner();

  var dtTimer = setInterval(function () {
    var opened =
      window.outerWidth - window.innerWidth > 200 ||
      window.outerHeight - window.innerHeight > 240;
    if (ANTI_DEBUG) {
      var t0 = performance.now();
      debugger;
      if (performance.now() - t0 > 120) opened = true;
    }
    if (opened) {
      try { console.clear(); } catch (e) {}
      consoleBanner();
    }
  }, 1000);

  // ---------- 解除与清理 ----------
  function cleanup() {
    document.body.style.overflow = '';
    mask.remove();
    document.removeEventListener('keydown', keyBlocker, true);
    document.removeEventListener('contextmenu', ctxBlocker, true);
    clearInterval(dtTimer);
  }
  // pjax 跳转离开时只清理防护，不回填内容（旧页面 DOM 会被整体替换）
  document.addEventListener('pjax:send', cleanup, { once: true });

  var card = mask.querySelector('.invite-gate-card');
  var input = mask.querySelector('input');
  var btn = mask.querySelector('button');
  var msg = mask.querySelector('.invite-gate-msg');
  var busy = false;

  function shake() {
    card.classList.remove('invite-gate-shake');
    void card.offsetWidth;
    card.classList.add('invite-gate-shake');
  }

  // 浏览器本地 PBKDF2（WebCrypto），参数与构建端 crypto.pbkdf2Sync 完全一致
  function pbkdf2Hex(code, weekIndex, iters) {
    var enc = new TextEncoder();
    return Promise.resolve()
      .then(function () {
        return crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
      })
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('invite-gate:v1:' + weekIndex), iterations: iters },
          key,
          256
        );
      })
      .then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      });
  }

  function submit() {
    if (busy) return;
    var code = input.value.trim();
    if (!code) {
      msg.textContent = '请输入邀请码';
      shake();
      input.focus();
      return;
    }
    if (!GATE || !GATE.hashes) {
      msg.textContent = '验证数据缺失，请联系博主';
      shake();
      return;
    }
    var idx = Math.floor((Date.now() - GATE.anchor) / GATE.period);
    var expected = GATE.hashes[String(idx)];
    if (!expected) {
      msg.textContent = '邀请码数据已过期，请联系博主更新';
      shake();
      return;
    }
    busy = true;
    btn.disabled = true;
    btn.textContent = '验证中…';
    msg.textContent = '';
    pbkdf2Hex(code, idx, GATE.iters)
      .then(function (hex) {
        if (hex === expected) {
          var expiresAt = GATE.anchor + (idx + 1) * GATE.period;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ expiresAt: expiresAt }));
          } catch (e) { /* 隐私模式下写入失败也不阻断本次阅读 */ }
          mask.classList.add('invite-gate-pass');
          setTimeout(function () {
            cleanup();
            restoreContent();
          }, 350);
        } else {
          msg.textContent = '邀请码错误或已过期，请确认后重试';
          shake();
          input.select();
        }
      })
      .catch(function () {
        msg.textContent = '本地验证失败，请更换现代浏览器后重试';
        shake();
      })
      .finally(function () {
        busy = false;
        btn.disabled = false;
        btn.textContent = '验 证';
      });
  }

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') submit();
  });
  setTimeout(function () { input.focus(); }, 100);
})();
