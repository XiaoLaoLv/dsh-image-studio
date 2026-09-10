/**
 * dsh-image-studio — browser half (module-table bundle, no build step).
 *
 * The full workbench: a sidebar entry opening a frame-wide overlay with
 * text-to-image / image-to-image (up to 4 reference images) / a canvas editor
 * (zoom, two-phase crop with handles + mask, rotate, flip, filters, undo,
 * compression with live size estimate), a Settings section owning the
 * generation config (auto-saved to ~/.dsh/imgstudio/config.json through the
 * node half), and an invisible composer bridge so edited images can be
 * attached to the current conversation input.
 *
 * Host calls go to this plugin's own authenticated routes under
 * `/api/image-studio/*` (registered by `lib/index.js` through
 * `connection.fetch.register`), so the page only ever talks same-origin.
 */

window.__ModuleLoader__.load({
  id: 'dsh-image-studio',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const React = require('react');
    const ce = React.createElement;

    const DICT_ZH = {
      entry: '图像工坊', title: '图像工坊', txt2img: '文生图', img2img: '图生图', edit: '编辑',
      prompt: '提示词', promptPh: '描述你想生成的画面…', generate: '生成', generating: '生成中…',
      demoHint: '未配置 API Key，点击生成将使用演示模式（本地绘制示意图，不走网络）。',
      baseUrl: '接口地址', apiKey: 'API Key', apiKeyPh: '保存到本地配置文件', model: '模型', size: '尺寸',
      dialect: '接口风格', dialectOpenai: 'OpenAI 兼容', dialectArk: '火山方舟（Seedream）', resetUrl: '恢复默认',
      upload: '上传图片', replace: '换一张图片', useEditor: '使用编辑器图像', clearSource: '清空', removeOne: '移除', source: '源图像（最多 4 张）',
      maxSources: '最多 4 张，超出的已忽略',
      emptyTitle: '还没有图像', emptyHint: '在右侧输入提示词并点击生成，或上传一张图片。',
      loadToEditor: '载入编辑器', download: '下载', undo: '撤销', redo: '重做', resetAll: '还原',
      rotateL: '左旋 90°', rotateR: '右旋 90°', flipH: '水平翻转', flipV: '垂直翻转',
      crop: '裁剪', cropConfirm: '确认裁剪', cropCancel: '取消',
      cropModeHint: '拖拽画框选区；拖动边角把手调整大小，拖动框内移动位置，确认后才裁剪。',
      filters: '滤镜调整', brightness: '亮度', contrast: '对比度', saturate: '饱和度', blur: '模糊',
      grayscale: '黑白', sepia: '复古', filterReset: '重置滤镜', sendToI2i: '用于图生图',
      compress: '图片压缩', fmt: '格式', maxEdge: '最长边', edge0: '原尺寸', quality: '质量', cmpSize: '压缩后',
      zoomIn: '放大', zoomOut: '缩小', fit: '适应窗口',
      close: '关闭', demoTag: '演示', errTitle: '生成失败', editEmpty: '从生成结果载入，或上传一张图片开始编辑。',
      settingsHint: '接口风格、地址、密钥与模型在 设置 → 图像工坊 中配置。',
      setDesc: '配置图像生成的接口风格、地址、密钥与模型。修改后自动保存到本地用户目录 ~/.dsh/imgstudio/config.json（密钥为明文存储，请勿将该文件分享给他人）；未配置密钥时工作台使用演示模式。',
      sendToChat: '发送到对话', sentNote: '已附加到当前对话输入框，可补充文字后发送。',
      errNoChat: '当前没有可用的对话输入框（需要先有一个会话）',
      errBusy: '输入框正忙，暂不接受附件',
      errConv: '会话服务不可用，无法附加附件',
      errHttp: '请求失败',
    };
    const DICT_EN = {
      entry: 'Image Studio', title: 'Image Studio', txt2img: 'Text to Image', img2img: 'Image to Image', edit: 'Edit',
      prompt: 'Prompt', promptPh: 'Describe the image you want…', generate: 'Generate', generating: 'Generating…',
      demoHint: 'No API key configured — Generate uses demo mode (local placeholder art, no network).',
      baseUrl: 'Base URL', apiKey: 'API Key', apiKeyPh: 'saved to local config file', model: 'Model', size: 'Size',
      dialect: 'API style', dialectOpenai: 'OpenAI compatible', dialectArk: 'Volcano Ark (Seedream)', resetUrl: 'Reset',
      upload: 'Upload image', replace: 'Replace image', useEditor: 'Use editor image', clearSource: 'Clear all', removeOne: 'Remove', source: 'Source images (up to 4)',
      maxSources: 'Up to 4 images; extras ignored',
      emptyTitle: 'No image yet', emptyHint: 'Enter a prompt and generate, or upload an image.',
      loadToEditor: 'Load into editor', download: 'Download', undo: 'Undo', redo: 'Redo', resetAll: 'Reset',
      rotateL: 'Rotate left 90°', rotateR: 'Rotate right 90°', flipH: 'Flip horizontal', flipV: 'Flip vertical',
      crop: 'Crop', cropConfirm: 'Apply crop', cropCancel: 'Cancel',
      cropModeHint: 'Drag to select; drag the handles to resize, drag inside to move; applied on confirm.',
      filters: 'Filters', brightness: 'Brightness', contrast: 'Contrast', saturate: 'Saturation', blur: 'Blur',
      grayscale: 'Grayscale', sepia: 'Sepia', filterReset: 'Reset filters', sendToI2i: 'Use for image-to-image',
      compress: 'Compression', fmt: 'Format', maxEdge: 'Max edge', edge0: 'Original', quality: 'Quality', cmpSize: 'Compressed',
      zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit window',
      close: 'Close', demoTag: 'Demo', errTitle: 'Generation failed', editEmpty: 'Load from results or upload an image to start editing.',
      settingsHint: 'Configure API style, base URL, key, and model in Settings → Image Studio.',
      setDesc: 'Configure the image generation API style, base URL, key, and model. Changes auto-save to ~/.dsh/imgstudio/config.json in your home directory (the key is stored in plain text; do not share that file); without a key the workbench runs in demo mode.',
      sendToChat: 'Send to chat', sentNote: 'Attached to the current composer; add text and send.',
      errNoChat: 'No active composer available (a session is required)',
      errBusy: 'The composer is busy and refused the attachment',
      errConv: 'Conversation service unavailable; cannot attach',
      errHttp: 'request failed',
    };

    const ICON_ENTRY = '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.8" cy="9" r="1.6"/><path d="m21 15.5-4.2-4.2a1.4 1.4 0 0 0-2 0L6 20"/>';
    const ICON_TXT = '<path d="M4 7V5h9v2M8.5 5v13M11.5 18h-6M17 9l4.5 12M18.6 16h-3.2"/>';
    const ICON_I2I = '<rect x="3" y="5" width="8" height="8" rx="1.5"/><rect x="13" y="11" width="8" height="8" rx="1.5"/><path d="M11 19H6a3 3 0 0 1-3-3v-1m10-6h5a3 3 0 0 1 3 3v1"/>';
    const ICON_EDIT = '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>';

    const DEFAULTS = {
      openai: 'https://api.openai.com/v1',
      ark: 'https://ark.cn-beijing.volces.com/api/v3',
    };
    const DEF_FILTERS = { brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, sepia: 0 };
    const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
    const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const MAX_SOURCES = 4;

    function filterStr(f) {
      return 'brightness(' + f.brightness + '%) contrast(' + f.contrast + '%) saturate(' + f.saturate + '%)'
        + ' blur(' + f.blur + 'px) grayscale(' + f.grayscale + '%) sepia(' + f.sepia + '%)';
    }

    function humanSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

    function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

    function createStore(initial) {
      let snap = initial;
      const subs = new Set();
      return {
        get: () => snap,
        set(patch) {
          snap = Object.assign({}, snap, patch);
          subs.forEach((fn) => { try { fn(snap) } catch (e) { console.error(e) } });
        },
        subscribe(fn) { subs.add(fn); return () => { subs.delete(fn) }; },
      };
    }

    function svgIcon(d, size) {
      return ce('svg', {
        viewBox: '0 0 24 24', width: size || 16, height: size || 16, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, dangerouslySetInnerHTML: { __html: d },
      });
    }

    function readDataUri(file, cb) {
      const r = new FileReader();
      r.onload = () => cb(String(r.result));
      r.onerror = () => cb(null);
      r.readAsDataURL(file);
    }

    function downloadDataUri(uri, name) {
      const a = document.createElement('a');
      a.href = uri;
      a.download = name || 'image-studio.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function demoArt(prompt) {
      const c = document.createElement('canvas');
      c.width = 768; c.height = 768;
      const g = c.getContext('2d');
      let seed = 2166136261;
      for (const ch of String(prompt || 'demo')) {
        seed = (seed ^ ch.codePointAt(0)) >>> 0;
        seed = Math.imul(seed, 16777619) >>> 0;
      }
      let s = seed;
      const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
      const h1 = Math.floor(rnd() * 360);
      const h2 = (h1 + 70 + Math.floor(rnd() * 160)) % 360;
      const grad = g.createLinearGradient(0, 0, 768, 768);
      grad.addColorStop(0, 'hsl(' + h1 + ',72%,52%)');
      grad.addColorStop(1, 'hsl(' + h2 + ',72%,30%)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 768, 768);
      for (let i = 0; i < 46; i++) {
        const r = 14 + rnd() * 130;
        g.beginPath();
        g.arc(rnd() * 768, rnd() * 768, r, 0, Math.PI * 2);
        g.fillStyle = 'hsla(' + Math.floor(rnd() * 360) + ',80%,' + (55 + rnd() * 25) + '%,' + (0.06 + rnd() * 0.22) + ')';
        g.fill();
      }
      for (let i = 0; i < 9; i++) {
        const x = rnd() * 768, y = rnd() * 768, w = 40 + rnd() * 240;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + w, y + (rnd() - 0.5) * 160);
        g.lineTo(x + w / 2, y + 60 + rnd() * 120);
        g.closePath();
        g.strokeStyle = 'rgba(255,255,255,' + (0.05 + rnd() * 0.16) + ')';
        g.lineWidth = 1.5;
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.94)';
      g.font = '600 26px sans-serif';
      const text = String(prompt || '').slice(0, 84);
      const lines = [];
      let rest = text;
      while (rest.length > 0 && lines.length < 3) {
        lines.push(rest.slice(0, 28));
        rest = rest.slice(28);
      }
      lines.forEach((line, i) => g.fillText(line, 36, 768 - 92 + i * 34));
      g.font = '500 15px sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.62)';
      g.fillText('DEMO · Image Studio', 36, 768 - 104 - lines.length * 34 + 12);
      return c.toDataURL('image/png');
    }

    /** Same-origin base for this plugin's /api routes (null-origin fallback). */
    function hostBase() {
      const origin = globalThis.location ? globalThis.location.origin : undefined;
      return origin !== undefined && origin !== 'null' ? origin : 'http://dsh.internal';
    }

    async function apiPost(path, payload) {
      const res = await fetch(new URL(path, hostBase()), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let body = null;
      try { body = await res.json(); } catch (e) { /* non-JSON body */ }
      if (body === null) throw new Error(t('errHttp') + ': HTTP ' + res.status);
      return body;
    }

    const CSS = [
      '.isx-footbtn{flex:0 0 auto;min-width:0;max-width:100%;display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#5b5e66);',
      'padding:6px 8px;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;}',
      '.isx-footbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#17181c);}',
      '.isx-footbtn.isx-on{color:var(--dsw-alias-label-primary,#17181c);background:var(--dsw-alias-interactive-bg-active,rgba(0,0,0,.08));}',
      '.isx-footlabel{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}',
      '.isx-backdrop{position:fixed;inset:0;background:rgba(12,14,18,.5);display:flex;align-items:center;justify-content:center;pointer-events:auto;z-index:40;}',
      '.isx-panel{width:min(1120px,94vw);height:min(760px,88vh);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#17181c);',
      'border:1px solid var(--dsw-alias-border-l4,rgba(0,0,0,.08));border-radius:14px;box-shadow:var(--dsw-elevation-prominent,0 18px 60px rgba(0,0,0,.35));',
      'display:flex;flex-direction:column;overflow:hidden;font-family:var(--dsw-font-family,inherit);}',
      '.isx-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l4,rgba(0,0,0,.08));flex:0 0 auto;}',
      '.isx-title{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:600;}',
      '.isx-iconbtn{border:0;background:transparent;color:var(--dsw-alias-label-secondary,#5b5e66);cursor:pointer;border-radius:7px;padding:5px 9px;font-size:16px;line-height:1;}',
      '.isx-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#17181c);}',
      '.isx-body{display:flex;flex:1;min-height:0;}',
      '.isx-rail{flex:0 0 148px;border-right:1px solid var(--dsw-alias-border-l4,rgba(0,0,0,.08));padding:10px 8px;display:flex;flex-direction:column;gap:4px;}',
      '.isx-railbtn{display:flex;align-items:center;gap:9px;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#5b5e66);',
      'padding:9px 11px;border-radius:9px;cursor:pointer;font:inherit;font-size:13px;text-align:left;}',
      '.isx-railbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));}',
      '.isx-railbtn.isx-on{background:var(--dsw-alias-interactive-bg-active,rgba(0,0,0,.08));color:var(--dsw-alias-label-primary,#17181c);font-weight:600;}',
      '.isx-view{flex:1;min-width:0;display:flex;min-height:0;}',
      '.isx-stage{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:18px;min-height:0;overflow:hidden;position:relative;}',
      '.isx-viewport{flex:1 1 0;min-height:0;width:100%;overflow:auto;display:flex;position:relative;box-sizing:border-box;padding:16px;}',
      '.isx-side{flex:0 0 300px;border-left:1px solid var(--dsw-alias-border-l4,rgba(0,0,0,.08));padding:14px;display:flex;flex-direction:column;gap:11px;overflow:auto;}',
      '.isx-setpage{max-width:560px;display:flex;flex-direction:column;gap:14px;padding:4px 4px 24px;box-sizing:border-box;}',
      '.isx-lab{font-size:12px;color:var(--dsw-alias-label-tertiary,#7c7f87);margin-bottom:4px;display:block;}',
      '.isx-input,.isx-select,.isx-textarea{width:100%;box-sizing:border-box;background:var(--dsw-specific-input-major,#f6f6f7);color:inherit;',
      'border:1px solid var(--dsw-alias-border-l4,rgba(0,0,0,.08));border-radius:8px;padding:7px 9px;font:inherit;font-size:13px;outline:none;}',
      '.isx-input:focus,.isx-textarea:focus{border-color:var(--dsw-alias-button-info-fill,rgb(65,118,230));}',
      '.isx-textarea{resize:vertical;min-height:84px;}',
      '.isx-btn{border:1px solid var(--dsw-alias-border-l4,rgba(0,0,0,.08));background:transparent;color:inherit;border-radius:8px;',
      'padding:7px 12px;font:inherit;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;justify-content:center;}',
      '.isx-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));}',
      '.isx-btn:disabled{opacity:.45;cursor:default;}',
      '.isx-primary{background:var(--dsw-alias-button-primary-fill,#17181c);color:var(--dsw-alias-label-primary-foreground,#fff);border-color:transparent;}',
      '.isx-primary:hover{background:var(--dsw-alias-button-primary-hover,#33343a);}',
      '.isx-row{display:flex;gap:8px;flex-wrap:wrap;}',
      '.isx-row>*{flex:1 1 auto;}',
      '.isx-hint{font-size:12px;color:var(--dsw-alias-label-tertiary,#7c7f87);line-height:1.5;}',
      '.isx-oknote{font-size:12px;color:var(--dsw-alias-state-success-primary,#2a8f5c);line-height:1.5;}',
      '.isx-errbox{background:var(--dsw-alias-state-error-secondary,rgba(220,60,60,.12));color:var(--dsw-alias-state-error-primary,#c33);',
      'border-radius:9px;padding:9px 11px;font-size:12.5px;line-height:1.5;word-break:break-all;}',
      '.isx-mainimg{max-width:100%;max-height:52vh;border-radius:10px;border:1px solid var(--dsw-alias-border-l4,rgba(0,0,0,.08));box-shadow:var(--dsw-elevation-soft,0 4px 18px rgba(0,0,0,.12));background:',
      'repeating-conic-gradient(rgba(127,127,127,.14) 0% 25%, transparent 0% 50%) 50%/18px 18px;}',
      '.isx-thumbs{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;}',
      '.isx-thumb{width:64px;height:64px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent;background:',
      'repeating-conic-gradient(rgba(127,127,127,.14) 0% 25%, transparent 0% 50%) 50%/14px 14px;}',
      '.isx-thumb.isx-on{border-color:var(--dsw-alias-button-info-fill,rgb(65,118,230));}',
      '.isx-canvaswrap{position:relative;display:inline-flex;max-width:none;max-height:none;border-radius:10px;',
      'background:repeating-conic-gradient(rgba(127,127,127,.14) 0% 25%, transparent 0% 50%) 50%/18px 18px;touch-action:none;}',
      '.isx-canvas{display:block;border-radius:10px;}',
      '.isx-canvas.isx-croppable{cursor:crosshair;}',
      '.isx-croprect{position:absolute;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.55);outline:9999px rgba(0,0,0,.45);',
      'pointer-events:auto;cursor:move;}',
      '.isx-chandle{position:absolute;width:11px;height:11px;background:#fff;border:1px solid rgba(0,0,0,.6);border-radius:2px;box-sizing:border-box;}',
      '.isx-h-nw{left:-6px;top:-6px;cursor:nwse-resize}.isx-h-n{left:calc(50% - 6px);top:-6px;cursor:ns-resize}',
      '.isx-h-ne{right:-6px;top:-6px;cursor:nesw-resize}.isx-h-e{right:-6px;top:calc(50% - 6px);cursor:ew-resize}',
      '.isx-h-se{right:-6px;bottom:-6px;cursor:nwse-resize}.isx-h-s{left:calc(50% - 6px);bottom:-6px;cursor:ns-resize}',
      '.isx-h-sw{left:-6px;bottom:-6px;cursor:nesw-resize}.isx-h-w{left:-6px;top:calc(50% - 6px);cursor:ew-resize}',
      '.isx-srcgrid{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;}',
      '.isx-srccell{position:relative;display:inline-block;}',
      '.isx-srcdel{position:absolute;top:-7px;right:-7px;width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.35);background:#fff;',
      'color:#333;font-size:12px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}',
      '.isx-srcimg{width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--dsw-alias-border-l4,rgba(0,0,0,.08));}',
      '.isx-srcbox{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}',
      '.isx-tag{font-size:10.5px;border:1px solid var(--dsw-alias-border-l4,rgba(0,0,0,.12));color:var(--dsw-alias-label-tertiary,#7c7f87);border-radius:5px;padding:1px 5px;}',
      '.isx-spin{width:26px;height:26px;border-radius:50%;border:3px solid var(--dsw-alias-interactive-bg-active,rgba(0,0,0,.1));border-top-color:var(--dsw-alias-button-info-fill,rgb(65,118,230));animation:isxspin 0.9s linear infinite;}',
      '@keyframes isxspin{to{transform:rotate(360deg)}}',
      '.isx-empty{display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--dsw-alias-label-tertiary,#7c7f87);font-size:13px;}',
      '.isx-range{width:100%;accent-color:var(--dsw-alias-button-info-fill,rgb(65,118,230));}',
      '.isx-flab{display:flex;justify-content:space-between;font-size:12px;color:var(--dsw-alias-label-secondary,#5b5e66);margin:6px 0 2px;}',
      '.isx-zoombtn{flex:0 0 auto;min-width:44px;}',
    ].join('');

    module.exports = {
      inject: ['locale', 'timer'],
      apply(ctx) {
        const slots = ctx.get('slots');
        if (slots === undefined) return;
        const locale = ctx.get('locale');

        const t = (k) => {
          let dict = DICT_ZH;
          try {
            const loc = locale !== undefined && typeof locale.getLocale === 'function' ? locale.getLocale() : null;
            const id = loc && typeof loc.id === 'string' ? loc.id : 'zh';
            if (id.indexOf('en') === 0) dict = DICT_EN;
          } catch (e) { /* locale read failed; keep zh */ }
          return dict[k] !== undefined ? dict[k] : (DICT_EN[k] !== undefined ? DICT_EN[k] : k);
        };

        // Package-owned stylesheet; removed with the plugin's fiber.
        const styleEl = document.createElement('style');
        styleEl.textContent = CSS;
        document.head.appendChild(styleEl);
        ctx.effect(() => () => styleEl.remove(), 'image-studio: styles');

        function useStoreValue(store) {
          const [v, setV] = React.useState(store.get);
          React.useEffect(() => { setV(store.get); return store.subscribe(setV); }, []);
          return v;
        }

        function useLocaleTick() {
          const [, force] = React.useReducer((x) => x + 1, 0);
          React.useEffect(() => {
            if (locale === undefined || typeof locale.subscribe !== 'function') return;
            return locale.subscribe(force);
          }, []);
        }

        const ui = createStore({ open: false });
        const data = createStore({
          cfg: {
            dialect: 'openai',
            baseUrlOpenAI: DEFAULTS.openai,
            baseUrlArk: DEFAULTS.ark,
            apiKey: '',
            model: 'gpt-image-1',
            size: '1024x1024',
          },
          results: [],
          selected: 0,
          editorImage: null,
          sources: [],
        });

        // Load the persisted config once; late arrival merges over defaults.
        fetch(new URL('/api/image-studio/config', hostBase()))
          .then((res) => res.json())
          .then((res) => {
            if (res && res.ok && res.cfg) data.set({ cfg: Object.assign({}, data.get().cfg, res.cfg) });
          })
          .catch((e) => console.error('[dsh-image-studio] config load failed:', e));

        let saveTimer = null;
        function persistCfg(next) {
          if (saveTimer !== null) { saveTimer(); saveTimer = null; }
          saveTimer = ctx.timeout(() => {
            saveTimer = null;
            apiPost('/api/image-studio/config', { cfg: next })
              .then((res) => { if (!res || res.ok !== true) console.error('[dsh-image-studio] config save failed:', res && res.error); })
              .catch((e) => console.error('[dsh-image-studio] config save failed:', e));
          }, 600);
        }

        const inputBridgeRef = { actions: null, sessionId: null };

        function dataUriToFile(uri, name) {
          const comma = uri.indexOf(',');
          const mime = uri.slice(5, uri.indexOf(';')) || 'image/png';
          const bin = atob(uri.slice(comma + 1));
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return new File([bytes], name, { type: mime });
        }

        async function sendToConversation(uri) {
          const bridge = inputBridgeRef;
          if (bridge.actions === null || bridge.sessionId === null) throw new Error(t('errNoChat'));
          const conversation = ctx.get('conversation');
          if (conversation === undefined || typeof conversation.createDrafts !== 'function') throw new Error(t('errConv'));
          const drafts = conversation.createDrafts(bridge.sessionId, [dataUriToFile(uri, 'image-studio.png')]);
          const ok = bridge.actions.addAttachments(drafts.map((a) => a.id));
          if (!ok) throw new Error(t('errBusy'));
        }

        function InputBridge(props) {
          React.useEffect(() => {
            inputBridgeRef.actions = props.inputActions || null;
            inputBridgeRef.sessionId = props.sessionId || null;
            return () => {
              inputBridgeRef.actions = null;
              inputBridgeRef.sessionId = null;
            };
          }, [props.inputActions, props.sessionId]);
          return null;
        }

        function EntryButton(props) {
          useLocaleTick();
          const wide = !!props.wide;
          const st = useStoreValue(ui);
          return ce('button', {
            className: 'isx-footbtn' + (st.open ? ' isx-on' : ''),
            type: 'button',
            onClick: () => ui.set({ open: true }),
            title: t('entry'),
            'aria-label': t('entry'),
          }, svgIcon(ICON_ENTRY, 17), wide ? ce('span', { className: 'isx-footlabel' }, t('entry')) : null);
        }

        function Field(props) {
          return ce('div', null, ce('label', { className: 'isx-lab' }, props.label), props.children);
        }

        function SourceBox(props) {
          const uris = props.uris;
          const full = uris.length >= MAX_SOURCES;
          return ce('div', null,
            uris.length > 0 ? ce('div', { className: 'isx-srcgrid' },
              uris.map((uri, i) => ce('div', { key: i, className: 'isx-srccell' },
                ce('img', { className: 'isx-srcimg', src: uri, alt: String(i + 1) }),
                ce('button', {
                  className: 'isx-srcdel', type: 'button', title: t('removeOne'), 'aria-label': t('removeOne'),
                  onClick: () => props.onRemove(i),
                }, '×')))) : null,
            ce('div', { className: 'isx-srcbox' },
              ce('button', { className: 'isx-btn', type: 'button', disabled: full, onClick: props.onUpload }, t('upload')),
              ce('button', { className: 'isx-btn', type: 'button', disabled: full || !props.editorImage, onClick: () => props.onAdd(props.editorImage) }, t('useEditor')),
              uris.length > 0 ? ce('button', { className: 'isx-btn', type: 'button', onClick: props.onClear }, t('clearSource')) : null));
        }

        function SettingsForm() {
          const d = useStoreValue(data);
          const cfg = d.cfg;
          const setCfg = (patch) => {
            const next = Object.assign({}, d.cfg, patch);
            data.set({ cfg: next });
            persistCfg(next);
          };
          const baseValue = cfg.dialect === 'ark' ? cfg.baseUrlArk : cfg.baseUrlOpenAI;
          const setBase = (v) => setCfg(cfg.dialect === 'ark' ? { baseUrlArk: v } : { baseUrlOpenAI: v });
          return ce('div', null,
            ce(Field, { label: t('dialect') },
              ce('select', {
                className: 'isx-select', value: cfg.dialect,
                onChange: (e) => setCfg({ dialect: e.target.value }),
              },
                ce('option', { value: 'openai' }, t('dialectOpenai')),
                ce('option', { value: 'ark' }, t('dialectArk')))),
            ce(Field, { label: t('baseUrl') },
              ce('div', { className: 'isx-row' },
                ce('input', { className: 'isx-input', value: baseValue, onChange: (e) => setBase(e.target.value), spellCheck: false }),
                ce('button', { className: 'isx-btn', type: 'button', onClick: () => setBase({ [cfg.dialect === 'ark' ? 'baseUrlArk' : 'baseUrlOpenAI']: DEFAULTS[cfg.dialect] }) }, t('resetUrl')))),
            ce(Field, { label: t('apiKey') },
              ce('input', { className: 'isx-input', type: 'password', value: cfg.apiKey, placeholder: t('apiKeyPh'), onChange: (e) => setCfg({ apiKey: e.target.value }) })),
            ce(Field, { label: t('model') },
              ce('input', { className: 'isx-input', value: cfg.model, onChange: (e) => setCfg({ model: e.target.value }), spellCheck: false })),
            ce(Field, { label: t('size') },
              ce('select', {
                className: 'isx-select', value: cfg.size,
                onChange: (e) => setCfg({ size: e.target.value }),
              },
                ce('option', { value: '1024x1024' }, '1024 × 1024'),
                ce('option', { value: '1536x1024' }, '1536 × 1024'),
                ce('option', { value: '1024x1536' }, '1024 × 1536'),
                ce('option', { value: 'auto' }, 'auto'))));
        }

        function SettingsPage() {
          useLocaleTick();
          return ce('div', { className: 'isx-setpage' },
            ce('div', { className: 'isx-hint' }, t('setDesc')),
            ce(SettingsForm, null));
        }

        function GenView(props) {
          const mode = props.mode;
          const d = useStoreValue(data);
          const cfg = d.cfg;
          const [prompt, setPrompt] = React.useState('');
          const [loading, setLoading] = React.useState(false);
          const [error, setError] = React.useState(null);
          const [note, setNote] = React.useState(null);
          const fileRef = React.useRef(null);
          const results = d.results;
          const selected = d.selected;
          const sources = d.sources;

          const pickFile = () => { if (fileRef.current) fileRef.current.click(); };
          const onFiles = (e) => {
            const fs = Array.prototype.slice.call(e.target.files || []);
            e.target.value = '';
            if (fs.length === 0) return;
            const remaining = MAX_SOURCES - sources.length;
            if (fs.length > remaining) setNote(t('maxSources'));
            else setNote(null);
            const take = fs.slice(0, Math.max(0, remaining));
            if (take.length === 0) return;
            let done = 0;
            const collected = [];
            take.forEach((f) => readDataUri(f, (uri) => {
              if (uri) collected.push(uri);
              done += 1;
              if (done === take.length) {
                data.set({ sources: sources.concat(collected).slice(0, MAX_SOURCES) });
              }
            }));
          };

          const doGenerate = async () => {
            if (loading) return;
            setError(null);
            setNote(null);
            if (!cfg.apiKey) {
              data.set({ results: [demoArt(prompt)], selected: 0 });
              return;
            }
            setLoading(true);
            try {
              const res = await apiPost('/api/image-studio/generate', {
                mode,
                dialect: cfg.dialect,
                baseUrl: cfg.dialect === 'ark' ? cfg.baseUrlArk : cfg.baseUrlOpenAI,
                apiKey: cfg.apiKey,
                model: cfg.model,
                prompt,
                size: cfg.size,
                imageDataUris: mode === 'img2img' ? sources : undefined,
              });
              if (!res || res.ok !== true) throw new Error((res && res.error) || '未知错误');
              const uris = (res.images || []).map((im) => 'data:' + (im.mime || 'image/png') + ';base64,' + im.b64);
              if (uris.length === 0) throw new Error('响应中没有图像');
              data.set({ results: uris, selected: 0 });
            } catch (err) {
              setError(String((err && err.message) || err));
            } finally {
              setLoading(false);
            }
          };

          const doSendToChat = async (uri) => {
            setError(null);
            setNote(null);
            try {
              await sendToConversation(uri);
              setNote(t('sentNote'));
            } catch (err) {
              setError(String((err && err.message) || err));
            }
          };

          const current = results[selected] || null;
          return ce('div', { className: 'isx-view' },
            ce('div', { className: 'isx-stage' },
              loading ? ce('div', { className: 'isx-empty' }, ce('div', { className: 'isx-spin' }), t('generating')) : null,
              !loading && current === null ? ce('div', { className: 'isx-empty' },
                svgIcon(ICON_ENTRY, 40), ce('div', null, t('emptyTitle')), ce('div', { className: 'isx-hint' }, t('emptyHint'))) : null,
              !loading && current !== null ? ce('img', { className: 'isx-mainimg', src: current, alt: 'result' }) : null,
              !loading && current !== null ? ce('div', { className: 'isx-row', style: { justifyContent: 'center', flex: '0 1 auto' } },
                ce('button', { className: 'isx-btn', type: 'button', onClick: () => props.onSendToEditor(current) }, svgIcon(ICON_EDIT), t('loadToEditor')),
                ce('button', { className: 'isx-btn', type: 'button', onClick: () => doSendToChat(current) }, t('sendToChat')),
                ce('button', { className: 'isx-btn', type: 'button', onClick: () => downloadDataUri(current) }, t('download'))) : null,
              results.length > 1 ? ce('div', { className: 'isx-thumbs' },
                results.map((uri, i) => ce('img', {
                  key: i, className: 'isx-thumb' + (i === selected ? ' isx-on' : ''), src: uri, alt: 'r' + i,
                  onClick: () => data.set({ selected: i }),
                }))) : null),
            ce('div', { className: 'isx-side' },
              mode === 'img2img' ? ce(Field, { label: t('source') },
                ce(SourceBox, {
                  uris: sources, editorImage: d.editorImage,
                  onUpload: pickFile,
                  onRemove: (i) => data.set({ sources: sources.filter((_, j) => j !== i) }),
                  onAdd: (uri) => { if (uri && sources.length < MAX_SOURCES) data.set({ sources: sources.concat([uri]) }); },
                  onClear: () => data.set({ sources: [] }),
                })) : null,
              ce('input', { ref: fileRef, type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' }, onChange: onFiles }),
              ce(Field, { label: t('prompt') },
                ce('textarea', { className: 'isx-textarea', value: prompt, placeholder: t('promptPh'), onChange: (e) => setPrompt(e.target.value) })),
              ce('button', {
                className: 'isx-btn isx-primary', type: 'button',
                disabled: loading || (mode === 'img2img' && sources.length === 0),
                onClick: doGenerate, style: { marginTop: '2px' },
              }, loading ? t('generating') : t('generate')),
              !cfg.apiKey ? ce('div', { className: 'isx-hint' }, t('demoHint')) : null,
              ce('div', { className: 'isx-hint' }, t('settingsHint')),
              note ? ce('div', { className: 'isx-oknote' }, note) : null,
              error ? ce('div', { className: 'isx-errbox' }, t('errTitle') + '：' + error) : null));
        }

        function EditorView(props) {
          const d = useStoreValue(data);
          const image = d.editorImage;
          const canvasRef = React.useRef(null);
          const imgRef = React.useRef(null);
          const dragRef = React.useRef(null);
          const wrapRef = React.useRef(null);
          const viewportRef = React.useRef(null);
          const [hist, setHist] = React.useState(image ? [image] : []);
          const [hidx, setHidx] = React.useState(image ? 0 : -1);
          const [filters, setFilters] = React.useState(Object.assign({}, DEF_FILTERS));
          const [cropMode, setCropMode] = React.useState(false);
          const [crop, setCrop] = React.useState(null);
          const [dims, setDims] = React.useState(null);
          const [fitScale, setFitScale] = React.useState(1);
          const [zoom, setZoom] = React.useState(100);
          const [fmt, setFmt] = React.useState('image/jpeg');
          const [quality, setQuality] = React.useState(85);
          const [maxEdge, setMaxEdge] = React.useState(2048);
          const [cmpBytes, setCmpBytes] = React.useState(null);
          const [note, setNote] = React.useState(null);
          const [error, setError] = React.useState(null);
          const fileRef = React.useRef(null);
          const filtersRef = React.useRef(filters);
          filtersRef.current = filters;

          const lastOrigin = React.useRef(undefined);
          React.useEffect(() => {
            if (image === lastOrigin.current) return;
            lastOrigin.current = image;
            if (image) {
              setHist([image]); setHidx(0);
              setFilters(Object.assign({}, DEF_FILTERS)); setCrop(null); setCropMode(false);
              setZoom(100);
            }
          }, [image]);

          const current = hidx >= 0 && hidx < hist.length ? hist[hidx] : null;

          const draw = React.useCallback((im, f) => {
            const c = canvasRef.current;
            if (!c || !im) return;
            c.width = im.naturalWidth;
            c.height = im.naturalHeight;
            const g = c.getContext('2d');
            g.filter = filterStr(f);
            g.drawImage(im, 0, 0);
          }, []);

          const applyFit = React.useCallback((natW, natH) => {
            const vp = viewportRef.current;
            if (!vp || !natW || !natH) return;
            const s = Math.min((vp.clientWidth - 36) / natW, (vp.clientHeight - 36) / natH, 1);
            setFitScale(Math.max(0.02, s));
            setZoom(100);
          }, []);

          React.useEffect(() => {
            if (!current) { imgRef.current = null; setDims(null); return; }
            let cancelled = false;
            const im = new Image();
            im.onload = () => {
              if (cancelled) return;
              imgRef.current = im;
              setDims({ w: im.naturalWidth, h: im.naturalHeight });
              applyFit(im.naturalWidth, im.naturalHeight);
              draw(im, filtersRef.current);
            };
            im.src = current;
            return () => { cancelled = true; };
          }, [current, draw, applyFit]);

          React.useEffect(() => {
            if (imgRef.current) draw(imgRef.current, filters);
          }, [filters, dims, draw]);

          const commit = (uri) => {
            const next = hist.slice(0, hidx + 1);
            next.push(uri);
            const capped = next.slice(-25);
            setHist(capped);
            setHidx(capped.length - 1);
            setCrop(null);
          };

          const toNaturalRect = (rect) => {
            const c = canvasRef.current;
            if (!c || !dims) return null;
            const cw = c.clientWidth || 1;
            const scale = dims.w / cw;
            return { x: Math.round(rect.x * scale), y: Math.round(rect.y * scale), w: Math.round(rect.w * scale), h: Math.round(rect.h * scale) };
          };

          const bake = (opts) => {
            const im = imgRef.current;
            if (!im) return;
            const f = filtersRef.current;
            const rot = opts.rot || 0;
            const cropNat = opts.crop ? toNaturalRect(opts.crop) : null;
            const sx = cropNat ? cropNat.x : 0;
            const sy = cropNat ? cropNat.y : 0;
            const sw = cropNat && cropNat.w > 1 ? cropNat.w : im.naturalWidth;
            const sh = cropNat && cropNat.h > 1 ? cropNat.h : im.naturalHeight;
            const swap = rot === 90 || rot === 270;
            const c = document.createElement('canvas');
            c.width = swap ? sh : sw;
            c.height = swap ? sw : sh;
            const g = c.getContext('2d');
            g.filter = filterStr(f);
            g.translate(c.width / 2, c.height / 2);
            if (rot) g.rotate(rot * Math.PI / 180);
            g.scale(opts.fx ? -1 : 1, opts.fy ? -1 : 1);
            g.drawImage(im, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
            commit(c.toDataURL('image/png'));
          };

          const buildCompressed = () => {
            const im = imgRef.current;
            if (!im) return null;
            let w = im.naturalWidth;
            let h = im.naturalHeight;
            if (maxEdge > 0 && Math.max(w, h) > maxEdge) {
              const k = maxEdge / Math.max(w, h);
              w = Math.max(1, Math.round(w * k));
              h = Math.max(1, Math.round(h * k));
            }
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const g = c.getContext('2d');
            g.filter = filterStr(filtersRef.current);
            g.drawImage(im, 0, 0, w, h);
            const url = fmt === 'image/png' ? c.toDataURL('image/png') : c.toDataURL(fmt, quality / 100);
            const bytes = Math.floor((url.length - url.indexOf(',') - 1) * 3 / 4);
            return { url, bytes };
          };

          React.useEffect(() => {
            if (!imgRef.current) { setCmpBytes(null); return; }
            try {
              const r = buildCompressed();
              setCmpBytes(r ? r.bytes : null);
            } catch (e) { setCmpBytes(null); }
          }, [current, filters, dims, fmt, quality, maxEdge]);

          const pointerIn = (e) => {
            const r = wrapRef.current.getBoundingClientRect();
            return { x: clamp(e.clientX - r.left, 0, r.width), y: clamp(e.clientY - r.top, 0, r.height), rw: r.width, rh: r.height };
          };

          const onWrapDown = (e) => {
            if (!cropMode || !dims) return;
            const p = pointerIn(e);
            dragRef.current = { kind: 'draw', ox: p.x, oy: p.y };
            setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
          };
          const onRectDown = (e) => {
            if (!cropMode) return;
            e.stopPropagation();
            const p = pointerIn(e);
            dragRef.current = { kind: 'move', px: p.x, py: p.y, orig: { x: crop.x, y: crop.y, w: crop.w, h: crop.h } };
          };
          const onHandleDown = (e, handle) => {
            if (!cropMode) return;
            e.stopPropagation();
            dragRef.current = { kind: 'resize', handle, orig: { x: crop.x, y: crop.y, w: crop.w, h: crop.h } };
          };
          const onMove = (e) => {
            const dg = dragRef.current;
            if (!dg || !cropMode) return;
            const p = pointerIn(e);
            if (dg.kind === 'draw') {
              setCrop({ x: Math.min(dg.ox, p.x), y: Math.min(dg.oy, p.y), w: Math.abs(p.x - dg.ox), h: Math.abs(p.y - dg.oy) });
            } else if (dg.kind === 'move') {
              setCrop({
                x: clamp(dg.orig.x + (p.x - dg.px), 0, p.rw - dg.orig.w),
                y: clamp(dg.orig.y + (p.y - dg.py), 0, p.rh - dg.orig.h),
                w: dg.orig.w, h: dg.orig.h,
              });
            } else {
              const H = dg.handle;
              let x1 = H.indexOf('w') >= 0 ? p.x : dg.orig.x;
              let y1 = H.indexOf('n') >= 0 ? p.y : dg.orig.y;
              let x2 = H.indexOf('e') >= 0 ? p.x : dg.orig.x + dg.orig.w;
              let y2 = H.indexOf('s') >= 0 ? p.y : dg.orig.y + dg.orig.h;
              x1 = clamp(x1, 0, p.rw); x2 = clamp(x2, 0, p.rw);
              y1 = clamp(y1, 0, p.rh); y2 = clamp(y2, 0, p.rh);
              setCrop({ x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
            }
          };
          const onUp = () => {
            const dg = dragRef.current;
            dragRef.current = null;
            if (dg && dg.kind === 'draw') setCrop((prev) => (prev && prev.w > 6 && prev.h > 6 ? prev : null));
          };

          const setF = (k, v) => setFilters(Object.assign({}, filters, { [k]: v }));
          const pickFile = () => { if (fileRef.current) fileRef.current.click(); };
          const onFile = (e) => {
            const f = e.target.files && e.target.files[0];
            e.target.value = '';
            if (f) readDataUri(f, (uri) => { if (uri) data.set({ editorImage: uri }); });
          };

          const doDownload = () => {
            const r = buildCompressed();
            if (r) downloadDataUri(r.url, 'image-studio.' + EXT[fmt]);
            else downloadDataUri(current);
          };
          const doSendToChat = async () => {
            setError(null);
            setNote(null);
            try {
              const r = buildCompressed();
              await sendToConversation(r ? r.url : current);
              setNote(t('sentNote'));
            } catch (err) {
              setError(String((err && err.message) || err));
            }
          };
          const confirmCrop = () => {
            if (crop && crop.w > 6 && crop.h > 6) bake({ crop });
            setCropMode(false);
            setCrop(null);
          };
          const cancelCrop = () => {
            setCropMode(false);
            setCrop(null);
          };
          const zoomBy = (k) => setZoom((z) => clamp(Math.round(z * k), 20, 800));

          const slider = (key, label, min, max, unit) => ce('div', null,
            ce('div', { className: 'isx-flab' }, ce('span', null, label), ce('span', null, filters[key] + (unit || ''))),
            ce('input', {
              className: 'isx-range', type: 'range', min, max, value: filters[key],
              onChange: (e) => setF(key, Number(e.target.value)),
            }));

          const btn = (label, onClick, disabled) => ce('button', { className: 'isx-btn', type: 'button', onClick, disabled: !!disabled }, label);

          if (!current) {
            return ce('div', { className: 'isx-view' },
              ce('div', { className: 'isx-stage' },
                ce('div', { className: 'isx-empty' },
                  svgIcon(ICON_EDIT, 40),
                  ce('div', null, t('editEmpty')),
                  ce('div', { className: 'isx-row' },
                    ce('button', { className: 'isx-btn', type: 'button', onClick: pickFile }, t('upload')))),
                ce('input', { ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: onFile })));
          }

          const dispW = dims ? Math.max(1, Math.round(dims.w * fitScale * (zoom / 100))) : null;
          const dispH = dims ? Math.max(1, Math.round(dims.h * fitScale * (zoom / 100))) : null;
          const canvasStyle = dispW !== null
            ? { width: dispW + 'px', height: dispH + 'px', maxWidth: 'none', maxHeight: 'none' }
            : undefined;

          return ce('div', { className: 'isx-view' },
            ce('div', { className: 'isx-stage' },
              ce('div', { className: 'isx-row', style: { flex: '0 0 auto', justifyContent: 'center', flexWrap: 'nowrap' } },
                ce('button', { className: 'isx-btn isx-zoombtn', type: 'button', title: t('zoomOut'), 'aria-label': t('zoomOut'), onClick: () => zoomBy(1 / 1.25) }, '－'),
                ce('button', { className: 'isx-btn isx-zoombtn', type: 'button', style: { minWidth: '64px' }, title: t('fit'), onClick: () => applyFit(dims ? dims.w : 0, dims ? dims.h : 0) }, Math.round(zoom) + '%'),
                ce('button', { className: 'isx-btn isx-zoombtn', type: 'button', title: t('zoomIn'), 'aria-label': t('zoomIn'), onClick: () => zoomBy(1.25) }, '＋'),
                ce('button', { className: 'isx-btn', type: 'button', style: { flex: '0 0 auto' }, onClick: () => applyFit(dims ? dims.w : 0, dims ? dims.h : 0) }, t('fit'))),
              cropMode ? ce('div', { className: 'isx-row', style: { flex: '0 0 auto' } },
                ce('button', { className: 'isx-btn isx-primary', type: 'button', onClick: confirmCrop, disabled: !crop || crop.w <= 6 || crop.h <= 6 }, t('cropConfirm')),
                ce('button', { className: 'isx-btn', type: 'button', onClick: cancelCrop }, t('cropCancel'))) : null,
              ce('div', { ref: viewportRef, className: 'isx-viewport' },
                ce('div', {
                  ref: wrapRef,
                  className: 'isx-canvaswrap',
                  style: { margin: 'auto' },
                  onMouseDown: onWrapDown, onMouseMove: onMove, onMouseUp: onUp, onMouseLeave: onUp,
                },
                  ce('canvas', { ref: canvasRef, className: 'isx-canvas' + (cropMode ? ' isx-croppable' : ''), style: canvasStyle }),
                  cropMode && crop ? ce('div', {
                    className: 'isx-croprect',
                    style: { left: crop.x + 'px', top: crop.y + 'px', width: crop.w + 'px', height: crop.h + 'px' },
                    onMouseDown: onRectDown,
                  }, HANDLES.map((h) => ce('div', {
                    key: h,
                    className: 'isx-chandle isx-h-' + h,
                    onMouseDown: (e) => onHandleDown(e, h),
                  }))) : null)),
              ce('div', { className: 'isx-hint', style: { flex: '0 0 auto' } },
                (cropMode ? t('cropModeHint') : '') + (dims ? '  ' + dims.w + ' × ' + dims.h : ''))),
            ce('div', { className: 'isx-side' },
              ce('div', { className: 'isx-row' },
                btn(t('replace'), pickFile)),
              ce('div', { className: 'isx-row' },
                btn(t('undo'), () => setHidx(Math.max(0, hidx - 1)), hidx <= 0),
                btn(t('redo'), () => setHidx(Math.min(hist.length - 1, hidx + 1)), hidx >= hist.length - 1),
                btn(t('resetAll'), () => setHidx(0), hidx === 0)),
              ce('div', { className: 'isx-row' },
                btn(t('rotateL'), () => bake({ rot: 270 })),
                btn(t('rotateR'), () => bake({ rot: 90 })),
                btn(t('flipH'), () => bake({ fx: true })),
                btn(t('flipV'), () => bake({ fy: true }))),
              ce('div', { className: 'isx-row' },
                btn(t('crop'), () => { setCropMode(true); setCrop(null); }, cropMode),
                btn(t('filterReset'), () => setFilters(Object.assign({}, DEF_FILTERS)))),
              ce('div', null, ce('span', { className: 'isx-lab' }, t('filters')),
                slider('brightness', t('brightness'), 20, 200, '%'),
                slider('contrast', t('contrast'), 20, 200, '%'),
                slider('saturate', t('saturate'), 0, 300, '%'),
                slider('blur', t('blur'), 0, 20, 'px'),
                slider('grayscale', t('grayscale'), 0, 100, '%'),
                slider('sepia', t('sepia'), 0, 100, '%')),
              ce('div', null, ce('span', { className: 'isx-lab' }, t('compress')),
                ce('div', { className: 'isx-row' },
                  ce(Field, { label: t('fmt') },
                    ce('select', { className: 'isx-select', value: fmt, onChange: (e) => setFmt(e.target.value) },
                      ce('option', { value: 'image/jpeg' }, 'JPEG'),
                      ce('option', { value: 'image/webp' }, 'WebP'),
                      ce('option', { value: 'image/png' }, 'PNG'))),
                  ce(Field, { label: t('maxEdge') },
                    ce('select', { className: 'isx-select', value: String(maxEdge), onChange: (e) => setMaxEdge(Number(e.target.value)) },
                      ce('option', { value: '0' }, t('edge0')),
                      ce('option', { value: '4096' }, '4096 px'),
                      ce('option', { value: '2048' }, '2048 px'),
                      ce('option', { value: '1024' }, '1024 px')))),
                fmt !== 'image/png' ? ce('div', null,
                  ce('div', { className: 'isx-flab' }, ce('span', null, t('quality')), ce('span', null, quality + '%')),
                  ce('input', { className: 'isx-range', type: 'range', min: 30, max: 100, value: quality, onChange: (e) => setQuality(Number(e.target.value)) })) : null,
                cmpBytes !== null ? ce('div', { className: 'isx-hint' }, t('cmpSize') + '：≈ ' + humanSize(cmpBytes)) : null),
              ce('div', { className: 'isx-row' },
                btn(t('download'), doDownload),
                btn(t('sendToI2i'), () => props.onSendToI2i(current))),
              ce('div', { className: 'isx-row' },
                btn(t('sendToChat'), doSendToChat)),
              note ? ce('div', { className: 'isx-oknote' }, note) : null,
              error ? ce('div', { className: 'isx-errbox' }, error) : null,
              ce('input', { ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: onFile })));
        }

        function WorkbenchBody() {
          useLocaleTick();
          const [mode, setMode] = React.useState('txt2img');
          const tabs = [
            { id: 'txt2img', label: t('txt2img'), icon: ICON_TXT },
            { id: 'img2img', label: t('img2img'), icon: ICON_I2I },
            { id: 'edit', label: t('edit'), icon: ICON_EDIT },
          ];
          return ce('div', { className: 'isx-body' },
            ce('div', { className: 'isx-rail' },
              tabs.map((tab) => ce('button', {
                key: tab.id,
                className: 'isx-railbtn' + (mode === tab.id ? ' isx-on' : ''),
                onClick: () => setMode(tab.id),
                type: 'button',
              }, svgIcon(tab.icon), tab.label))),
            mode === 'edit'
              ? ce(EditorView, {
                onSendToI2i: (uri) => { data.set({ sources: [uri] }); setMode('img2img'); },
              })
              : ce(GenView, {
                mode,
                onSendToEditor: (uri) => { data.set({ editorImage: uri }); setMode('edit'); },
              }));
        }

        function StudioOverlay() {
          const open = useStoreValue(ui).open;
          if (!open) return null;
          return ce('div', { className: 'isx-backdrop' },
            ce('div', { className: 'isx-panel', onClick: (e) => e.stopPropagation(), role: 'dialog', 'aria-label': t('title') },
              ce('div', { className: 'isx-head' },
                ce('div', { className: 'isx-title' }, svgIcon(ICON_ENTRY, 18), t('title')),
                ce('button', { className: 'isx-iconbtn', onClick: () => ui.set({ open: false }), title: t('close'), 'aria-label': t('close') }, '✕')),
              ce(WorkbenchBody, null)));
        }

        slots.inject('sidebar.footer.action', () => slots.register(
          { name: 'sidebar.footer.action', id: 'image-studio-entry', order: -10, label: () => t('entry') },
          (props) => ce(EntryButton, props),
        ));

        slots.inject('shell.overlay', () => slots.register(
          { name: 'shell.overlay', id: 'image-studio-workbench', order: 100, label: () => t('entry') },
          (props) => ce(StudioOverlay, props),
        ));

        slots.inject('settings.section', () => slots.register(
          { name: 'settings.section', id: 'image-studio', order: 50, label: () => t('entry') },
          (props) => ce(SettingsPage, props),
        ));

        slots.inject('conversation.composer.dock', () => slots.register(
          { name: 'conversation.composer.dock', id: 'image-studio-bridge', order: 90 },
          (props) => ce(InputBridge, props),
        ));

        console.log('[dsh-image-studio] client half ready (entry + overlay + settings + composer bridge registered)');
      },
    };
    return module.exports;
  },
});
