(function () {
  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var script = doc.currentScript;
  if (!body || !root.animate) {
    root.classList.remove('lx-pre');
    return;
  }

  var ds = (script && script.dataset) || {};
  var user = window.AgenticBuildIntro || {};

  function opt(k, d) {
    if (user[k] != null) return user[k];
    if (ds[k] != null && ds[k] !== '') return ds[k];
    return d;
  }

  function list(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim()) return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return null;
  }

  var CFG = {
    name: String(opt('name', doc.title || '')).trim(),
    initials: opt('initials', ''),
    title: String(opt('title', '')).trim(),
    location: String(opt('location', '')).trim(),
    timezone: opt('timezone', ''),
    clock: String(opt('clock', 'true')) !== 'false',
    cta: opt('cta', 'Initiate Portfolio Build'),
    skip: opt('skip', 'Skip to site'),
    agents: parseInt(opt('agents', ''), 10),
    colors: list(opt('colors', '')),
    holdUntil: opt('holdUntil', ''),
    rampFrom: opt('rampFrom', ''),
    rampMid: parseFloat(opt('rampMid', 1.2)) || 1,
    rampEnd: parseFloat(opt('rampEnd', 1.5)) || 1,
    replay: String(opt('replay', 'true')) !== 'false',
    replayLabel: opt('replayLabel', 'Replay animation'),
    replayBefore: opt('replayBefore', '')
  };
  if (!CFG.initials) {
    CFG.initials = CFG.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (w) { return w.charAt(0); })
      .join('')
      .toUpperCase();
  }

  var narrow = window.matchMedia('(max-width: 820px)').matches || window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AGENTS = CFG.agents > 0 ? (narrow ? Math.max(4, Math.round(CFG.agents / 2)) : CFG.agents) : narrow ? 14 : 30;
  var SKIP = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, BR: 1, SOURCE: 1, TRACK: 1, NOSCRIPT: 1, TEMPLATE: 1, SVG: 1, PATH: 1, HR: 1, WBR: 1 };
  var REPLACED = { IMG: 1, VIDEO: 1, CANVAS: 1, IFRAME: 1 };
  var CONTROL = { BUTTON: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1 };
  var SEMANTIC = { SECTION: 1, NAV: 1, HEADER: 1, FOOTER: 1, MAIN: 1, ARTICLE: 1, ASIDE: 1, FORM: 1 };

  function el(tag, id, cls) {
    var n = doc.createElement(tag);
    if (id) n.id = id;
    if (cls) n.className = cls;
    return n;
  }

  var building = false;
  var plan = [];
  var vw = window.innerWidth;
  var vh = window.innerHeight;

  function isOverlay(n) {
    return n.id === 'lx-build' || n.id === 'lx-replay' || n.id === 'lx-rslot' || n.classList.contains('lx-scan');
  }

  function offsetOf(n) {
    var x = 0;
    var y = 0;
    var p = n;
    while (p && p !== body) {
      x += p.offsetLeft;
      y += p.offsetTop;
      p = p.offsetParent;
    }
    return p === body ? { x: x, y: y } : null;
  }

  function alpha(c) {
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return c === 'transparent' ? 0 : 1;
    var p = m[1].split(/[ ,\/]+/).filter(Boolean);
    return p.length > 3 ? parseFloat(p[3]) : 1;
  }

  function hasText(n) {
    for (var c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3 && c.nodeValue.trim()) return true;
    }
    return false;
  }

  function analyze() {
    var found = [];

    function walk(node, parent, depth) {
      for (var c = node.firstElementChild; c; c = c.nextElementSibling) {
        if (SKIP[c.tagName.toUpperCase()] || isOverlay(c)) continue;
        var cs = getComputedStyle(c);
        if (cs.display === 'none' || cs.display === 'contents' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
          if (cs.display === 'contents') walk(c, parent, depth);
          continue;
        }
        if (c.offsetParent === null) continue;
        var pos = offsetOf(c);
        var w = c.offsetWidth;
        var h = c.offsetHeight;
        var inline = cs.display === 'inline';
        var tag = c.tagName;
        if (pos && w >= 6 && h >= 6 && !(inline && c.getClientRects().length > 1)) {
          var text = hasText(c);
          var repl = REPLACED[tag] || CONTROL[tag];
          var visual =
            alpha(cs.backgroundColor) > 0.02 ||
            cs.backgroundImage !== 'none' ||
            cs.boxShadow !== 'none' ||
            (parseFloat(cs.borderTopWidth) > 0 && alpha(cs.borderTopColor) > 0.02) ||
            (parseFloat(cs.borderBottomWidth) > 0 && alpha(cs.borderBottomColor) > 0.02);
          var layer = !!(repl || SEMANTIC[tag] || text || visual);
          if (layer && !repl && !text && parent && parent.depth > 0) {
            if (Math.abs(parent.x - pos.x) <= 1 && Math.abs(parent.y - pos.y) <= 1 && Math.abs(parent.w - w) <= 1 && Math.abs(parent.h - h) <= 1) layer = false;
          }
          if (layer) {
            var item = { el: c, x: pos.x, y: pos.y, w: w, h: h, depth: depth + 1, parent: parent };
            found.push(item);
            if (!REPLACED[tag] && !CONTROL[tag]) walk(c, item, item.depth);
            continue;
          }
        }
        if (!REPLACED[tag]) walk(c, parent, depth);
      }
    }

    walk(body, { depth: 0, x: 0, y: 0, w: body.offsetWidth, h: body.offsetHeight }, 0);
    plan = found;
  }

  var COLORS = CFG.colors || ['#ff28ea', '#ff5fd2', '#ffd075', '#ff9a3c', '#cbceea', '#a79bff', '#22d3ee', '#a3e635', '#fde047', '#ff4d5e', '#ff3d7f', '#38bdf8'];

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }

  body.querySelectorAll('img[loading="lazy"]').forEach(function (im) {
    im.loading = 'eager';
  });

  var BKEY = 'lx-built';
  var TAGN = { A: 'Link', BUTTON: 'Button', IMG: 'Img', VIDEO: 'Video', NAV: 'Nav', SECTION: 'Section', P: 'P', LI: 'Li', UL: 'List', OL: 'List', HEADER: 'Header', FOOTER: 'Footer', MAIN: 'Main', FORM: 'Form', INPUT: 'Input', ARTICLE: 'Article', ASIDE: 'Aside', SPAN: 'Span', DIV: 'Div', IFRAME: 'Frame', CANVAS: 'Canvas', LABEL: 'Label' };
  var CURSOR = '<svg viewBox="0 0 20 25" aria-hidden="true"><path d="M1.2 1.2v18.6l5-4.6 3.5 7.8 3.4-1.6-3.5-7.7 6.6-.5z" fill="CLR" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  var gateEl = null;
  var gateStop = null;
  var scanId = 0;
  var introTimer = 0;
  var handoff = null;
  var wireLayer = null;
  var wires = new Map();
  var bOverlay = null;
  var bItems = [];
  var bAgents = [];
  var bLive = [];
  var bNext = 0;
  var bFront = 0;
  var bStart = 0;
  var bLast = 0;
  var bCap = 40;
  var bGoalT = 20;
  var bConc = 0.7;
  var bHurry = 0;
  var bWait = 0;
  var bSp = 1;
  var bVT = 0;
  var bY2 = 0;
  var bY3 = 0;
  var bPos = 0;
  var bVel = 0;
  var bGoal = 0;
  var bSetY = 0;
  var bReduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var bDone = 0;
  var bGuides = 0;
  var skipEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function wantBuild() {
    var q = location.search;
    if (/[?&]build=0/.test(q) || reduced) return false;
    if (/[?&]build=1/.test(q)) return true;
    try {
      if (sessionStorage.getItem(BKEY) && (function(){try{var n=performance.getEntriesByType('navigation')[0];if(n&&n.type==='reload')return 0;if(n&&n.type==='back_forward')return 1;var r=document.referrer;return r&&new URL(r).origin===location.origin?1:0}catch(e){return 0}})()) return false;
    } catch (e) {}
    return true;
  }

  function shuffled(a) {
    var b = a.slice();
    for (var i = b.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = b[i];
      b[i] = b[j];
      b[j] = t;
    }
    return b;
  }

  var PALETTE = CFG.colors || ['#ff5fa2', '#ffb347', '#ffd075', '#ff28ea', '#cbceea', '#a99bff', '#7ee0c3', '#79c8ff', '#ff8a6b', '#f3b6ff'];
  var PTR = '<svg viewBox="0 0 18 20"><path d="M1.6 1.4 16 9.3 9.5 10.8 6.5 17.6Z"/></svg>';

  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  function tr(x, y, s) {
    return 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + (s == null ? 1 : s) + ')';
  }

  function lineSlots(f, n) {
    var inset = Math.min(24, f.width * 0.04);
    var usable = f.width - inset * 2;
    var twoRows = usable / n < 24;
    var perRow = twoRows ? Math.ceil(n / 2) : n;
    var step = usable / (perRow - (twoRows ? 0.5 : 1));
    var out = [];
    for (var i = 0; i < n; i++) {
      var row = twoRows ? i % 2 : 0;
      var col = twoRows ? Math.floor(i / 2) : i;
      out.push({ x: f.left + inset + col * step + (row ? step / 2 : 0), dy: row ? 16 : 0, s: twoRows ? 0.8 : 1 });
    }
    return out;
  }

  function leaveGate(cls) {
    var g = gateEl;
    gateEl = null;
    if (!g) return;
    if (gateStop) gateStop();
    gateStop = null;
    g.classList.add(cls);
    setTimeout(function () {
      g.remove();
    }, 850);
  }

  function dropWires() {
    if (wireLayer) wireLayer.remove();
    wireLayer = null;
    wires = new Map();
  }

  function dropWire(node) {
    var w = wires.get(node);
    if (!w) return;
    wires.delete(node);
    w.classList.add('lx-wo');
    setTimeout(function () {
      w.remove();
    }, 600);
  }

  function syncWires() {
    wires.forEach(function (w, node) {
      var r = node.getBoundingClientRect();
      w.style.transform = 'translate3d(' + (r.left + window.scrollX).toFixed(1) + 'px,' + (r.top + window.scrollY).toFixed(1) + 'px,0)';
      w.style.width = r.width.toFixed(1) + 'px';
      w.style.height = r.height.toFixed(1) + 'px';
    });
  }

  function buildWires(list, sweepMs, top0, span) {
    dropWires();
    wireLayer = el('div', 'lx-wire');
    root.appendChild(wireLayer);
    var shown = 0;
    for (var i = 0; i < list.length && shown < 120; i++) {
      var it = list[i];
      var r = it.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
      if (r.width >= vw - 2 && r.height >= vh * 0.9) continue;
      var w = el('div', '', 'lx-wb' + (it.kind === 'text' ? ' lx-wt' : it.kind === 'media' ? ' lx-wm' : ''));
      var br = getComputedStyle(it.el).borderRadius;
      if (br && parseFloat(br) > 0) w.style.borderRadius = br;
      w.style.transform = 'translate3d(' + (r.left + window.scrollX).toFixed(1) + 'px,' + (r.top + window.scrollY).toFixed(1) + 'px,0)';
      w.style.width = r.width.toFixed(1) + 'px';
      w.style.height = r.height.toFixed(1) + 'px';
      wireLayer.appendChild(w);
      wires.set(it.el, w);
      shown++;
      var f = clamp((r.top - top0) / span, 0, 1);
      var dur = clamp(Math.sqrt(r.width * r.height) * 2.1, 260, 700);
      w.animate(
        [
          { opacity: 0, clipPath: 'inset(0 100% 100% 0)' },
          { opacity: 1, clipPath: 'inset(0 0% 0% 0)' }
        ],
        { duration: dur, delay: f * sweepMs, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'backwards' }
      );
    }
    return shown;
  }

  async function scan(g, id, pre) {
    var q = function (c) {
      return g.querySelector('.gx-' + c);
    };
    var btn = q('primary');
    var core = q('core');
    var ripple = q('ripple');
    var veil = q('veil');
    var frame = q('frame');
    var beam = q('beam');
    var readout = q('readout');
    var status = q('status');
    var say = q('txt');
    var meta = q('meta');
    var layer = q('agents');
    var corners = frame.querySelectorAll('.gx-corner');
    var alive = function () {
      return id === scanId;
    };
    var N = AGENTS;
    var list = pre;

    var b = btn.getBoundingClientRect();
    var ox = b.left + b.width / 2;
    var oy = b.top + b.height / 2;
    var cx = vw / 2;
    var cy = vh / 2;
    var f = frame.getBoundingClientRect();

    async function sayText(text, ok) {
      say.classList.add('gx-swap');
      await wait(180);
      say.textContent = text;
      say.classList.remove('gx-swap');
      status.classList.toggle('gx-ok', !!ok);
    }

    btn.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.86)' }], { duration: 320, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
    g.classList.add('gx-building');
    veil.classList.add('gx-on');
    core.style.transform = tr(ox, oy, 0);
    core.animate(
      [
        { opacity: 0, transform: tr(ox, oy, 0.2) },
        { opacity: 1, transform: tr(ox, oy, 1.4), offset: 0.3 },
        { opacity: 1, transform: tr(cx, cy, 1) }
      ],
      { duration: 820, easing: 'cubic-bezier(0.6, 0, 0.2, 1)', fill: 'forwards' }
    );
    await wait(820);
    if (!alive()) return null;

    ripple.animate([{ opacity: 0.9, transform: tr(cx, cy, 0.4) }, { opacity: 0, transform: tr(cx, cy, 18) }], { duration: 1100, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' });
    core.animate(
      [
        { opacity: 1, transform: tr(cx, cy, 1) },
        { opacity: 1, transform: tr(cx, cy, 2.2), offset: 0.25 },
        { opacity: 0, transform: tr(cx, cy, 0.2) }
      ],
      { duration: 700, easing: 'ease-out', fill: 'forwards' }
    );
    corners.forEach(function (c, i) {
      c.animate([{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 520, delay: 80 + i * 60, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' });
    });
    readout.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 420, fill: 'forwards' });
    q('chipa').textContent = Math.round(vw) + ' \u00d7 ' + Math.round(vh);
    status.classList.add('gx-show');

    var slots = lineSlots(f, N);
    var topY = f.top - 2;
    var agents = [];
    for (var i = 0; i < N; i++) {
      var it = list[i];
      var hasSpot = it && it.top < vh * 1.1;
      var rr = hasSpot ? it.el.getBoundingClientRect() : null;
      var color = PALETTE[i % PALETTE.length];
      var label = it ? labelFor(it) : 'Div';
      if (it) it.label = label;
      var n = el('div', '', 'gx-sa');
      n.style.setProperty('--c', color);
      n.innerHTML = '<span class="gx-glow"></span>' + CURSOR.replace('CLR', color) + '<span class="gx-stag"></span>';
      n.lastChild.textContent = label;
      n.style.opacity = '0';
      layer.appendChild(n);
      var spot = hasSpot
        ? { x: clamp(rr.left, 4, vw - 22), y: clamp(rr.top, 4, vh - 30) }
        : { x: rnd(0.08, 0.92) * (vw - 40), y: rnd(0.2, 0.8) * (vh - 40) };
      agents.push({ n: n, slot: slots[i], spot: spot, c: color, label: label, el: hasSpot ? it.el : null });
    }
    handoff = agents;

    var base = rnd(0, Math.PI * 2);
    await Promise.all(
      agents.map(function (a, i) {
        var ang = base + (i / N) * Math.PI * 2;
        var r = Math.min(f.width, f.height) * rnd(0.18, 0.26);
        var mx = cx + Math.cos(ang) * r;
        var my = cy + Math.sin(ang) * r;
        var tx = a.slot.x;
        var ty = topY + a.slot.dy;
        a.n.style.opacity = '1';
        a.n.style.transform = tr(tx, ty);
        return a.n
          .animate(
            [
              { opacity: 0, transform: tr(cx, cy, 0.2) },
              { opacity: 1, transform: tr(mx, my, 1.05), offset: 0.42 },
              { opacity: 1, transform: tr(tx, ty, a.slot.s) }
            ],
            { duration: 1150, delay: 40 + (i % 10) * 26 + Math.floor(i / 10) * 40, easing: 'cubic-bezier(0.55, 0, 0.15, 1)' }
          )
          .finished.catch(function () {});
      })
    );
    if (!alive()) return null;

    await sayText('Scanning page');
    if (!alive()) return null;
    agents.forEach(function (a) {
      a.n.classList.add('gx-lit');
    });
    var sweep = 1900;
    var span = f.height;
    var layers = buildWires(list, sweep, f.top, span);
    q('chipb').textContent = layers + ' layers';
    beam.style.opacity = '1';
    beam.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + (span + 2) + 'px)' }], { duration: sweep, easing: 'linear', fill: 'forwards' });
    agents.forEach(function (a, i) {
      var y0 = topY + a.slot.dy;
      var y1 = f.bottom - 2 + a.slot.dy;
      var ph = (i / N) * Math.PI * 2;
      var kf = [];
      for (var k = 0; k <= 10; k++) {
        var tt = k / 10;
        var w = Math.sin(ph + tt * Math.PI * 2) * 5 * Math.sin(tt * Math.PI);
        kf.push({ transform: tr(a.slot.x, y0 + (y1 - y0) * tt + w, a.slot.s), offset: tt });
      }
      a.n.style.transform = tr(a.slot.x, y1, a.slot.s);
      a.n.animate(kf, { duration: sweep, delay: 0, easing: 'linear' });
    });

    var t0 = performance.now();
    var msg = 0;
    await new Promise(function (res) {
      (function step(now) {
        if (!alive()) {
          res();
          return;
        }
        var p = Math.min(1, (now - t0) / sweep);
        meta.textContent = 'y ' + String(Math.round(p * vh)).padStart(3, '0');
        if (p > 0.45 && msg === 0) {
          msg = 1;
          sayText('Mapping layout');
        }
        if (p < 1) requestAnimationFrame(step);
        else res();
      })(t0);
    });
    if (!alive()) return null;

    beam.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
    await sayText('Assigning ' + N + ' agents', true);
    await wait(160);
    if (!alive()) return null;

    await Promise.all(
      agents.map(function (a, i) {
        a.n.classList.remove('gx-lit');
        var x0 = a.slot.x;
        var y0 = f.bottom - 2 + a.slot.dy;
        var bx = (x0 + a.spot.x) / 2 + rnd(-60, 60);
        var by = Math.min(y0, a.spot.y) - rnd(30, 90);
        a.n.style.transform = tr(a.spot.x, a.spot.y);
        setTimeout(function () {
          a.n.classList.add('gx-tagged');
        }, 260 + i * 22);
        return a.n
          .animate(
            [
              { transform: tr(x0, y0, a.slot.s) },
              { transform: tr(bx, by, 1.08), offset: 0.45 },
              { transform: tr(a.spot.x, a.spot.y) }
            ],
            { duration: 900, delay: i * 22, easing: 'cubic-bezier(0.6, 0, 0.2, 1)' }
          )
          .finished.catch(function () {});
      })
    );
    await wait(260);
    return alive();
  }

  function startIntro(g) {
    root.classList.add('lx-pre');
    gateEl = g;
    var id = ++scanId;
    skipEvents.forEach(function (ev) {
      window.addEventListener(ev, introSkip, { passive: true, capture: true });
    });
    vw = window.innerWidth;
    vh = window.innerHeight;
    var pre = prepareList();
    scan(g, id, pre).then(function (ok) {
      if (!ok) return;
      var t0 = performance.now();
      (function ready() {
        if (id !== scanId) return;
        if (doc.readyState === 'complete' || performance.now() - t0 > 3000) {
          beginBuild();
          return;
        }
        introTimer = setTimeout(ready, 60);
      })();
    });
  }

  function introSkip(e) {
    if (e.repeat) return;
    if (e.type === 'keydown' && /^(Shift|Control|Alt|Meta)$/.test(e.key)) return;
    cancelIntro();
  }

  function cancelIntro() {
    scanId++;
    skipEvents.forEach(function (ev) {
      window.removeEventListener(ev, introSkip, true);
    });
    clearTimeout(introTimer);
    dropWires();
    handoff = null;
    leaveGate('gx-leaving');
    root.classList.remove('lx-pre');
  }

  function collectTexts(it, set) {
    var out = [];
    var tw = doc.createTreeWalker(it.el, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = tw.nextNode())) {
      if (!n.data.trim()) continue;
      var p = n.parentElement;
      var bad = false;
      while (p && p !== it.el) {
        if (set.has(p) || p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.tagName === 'svg' || p.tagName === 'SVG') {
          bad = true;
          break;
        }
        p = p.parentElement;
      }
      if (!bad) out.push({ n: n, full: n.data, len: n.data.length, k: -1, ghost: null });
    }
    return out;
  }

  function labelFor(it) {
    if (it.label) return it.label;
    var tag = it.el.tagName;
    if (it.chars && Math.random() < 0.5) {
      var m = it.texts[0].full.trim().match(/[A-Za-z][A-Za-z0-9'-]{1,11}/);
      if (m) return m[0];
    }
    if (/^H[1-6]$/.test(tag)) return tag;
    return TAGN[tag] || tag.charAt(0) + tag.slice(1).toLowerCase();
  }

  function prepareList() {
    analyze();
    window.scrollTo(0, 0);
    var sy = window.scrollY;
    var set = new Set();
    plan.forEach(function (it) {
      set.add(it.el);
    });
    var list = plan.slice();
    var hs = CFG.holdUntil ? doc.querySelector(CFG.holdUntil) : null;
    var hdrY = 0;
    if (hs) hdrY = hs.getBoundingClientRect().top + sy;
    else {
      doc.querySelectorAll('header, nav, [role="banner"]').forEach(function (n) {
        if (n.closest('#lx-gate')) return;
        var q = n.getBoundingClientRect();
        if (q.height > 0 && q.top + sy < vh) hdrY = Math.max(hdrY, q.bottom + sy);
      });
    }
    list.forEach(function (it, i) {
      var r = it.el.getBoundingClientRect();
      it.top = r.top + sy;
      var pe = it.parent && it.parent.el ? it.parent.eff : 0;
      it.eff = Math.max(it.top, pe || 0);
      it.ord = i;
      it.base = parseFloat(getComputedStyle(it.el).opacity);
      if (isNaN(it.base)) it.base = 1;
      it.pi = it.parent && it.parent.el ? it.parent : null;
      it.texts = REPLACED[it.el.tagName] ? [] : collectTexts(it, set);
      it.chars = it.texts.reduce(function (s, t) {
        return s + t.len;
      }, 0);
      it.kind = REPLACED[it.el.tagName] ? 'media' : it.chars ? 'text' : 'box';
      it.typeDur = clamp(it.chars * 0.015 + 0.2, 0.4, 1.4);
      it.state = 0;
      it.prep = false;
      it.hdr = it.top < hdrY - 1 && !(hs && hs.contains(it.el));
    });
    var rf = CFG.rampFrom ? doc.querySelectorAll(CFG.rampFrom) : [];
    var docH = Math.max(root.scrollHeight, body.scrollHeight);
    if (rf.length) {
      bY3 = rf[0].getBoundingClientRect().top + sy;
      bY2 = Math.max(0, bY3 - vh * 0.8);
    } else {
      bY2 = docH * 0.35;
      bY3 = docH * 0.5;
    }
    if (bY3 <= bY2) bY3 = bY2 + 1;
    list.sort(function (a, b) {
      return a.eff - b.eff || a.depth - b.depth || a.ord - b.ord;
    });
    return list;
  }

  function beginBuild() {
    hideReplay();
    clearTimeout(introTimer);
    skipEvents.forEach(function (ev) {
      window.removeEventListener(ev, introSkip, true);
    });
    var list = prepareList();
    var carry = handoff;
    handoff = null;
    if (carry) {
      carry.forEach(function (h, i) {
        if (list[i] && h.el && list[i].el === h.el) list[i].label = h.label;
      });
    }
    syncWires();
    bItems = list;
    bCap = 40;
    bGoalT = narrow ? 19 : 20;
    bConc = 0.7;
    bHurry = 0;
    bWait = 0;
    try {
      sessionStorage.setItem(BKEY, '1');
    } catch (e) {}
    list.forEach(function (it) {
      it.el.classList.add('lx-b');
    });
    root.classList.add('lx-build');
    root.classList.remove('lx-pre');
    bOverlay = el('div', 'lx-build');
    body.appendChild(bOverlay);
    var cols = shuffled(COLORS);
    bAgents = [];
    for (var i = 0; i < AGENTS; i++) {
      var n = el('div', '', 'lx-c');
      var h = carry && carry[i];
      var color = h ? h.c : cols[i % cols.length];
      n.innerHTML = CURSOR.replace('CLR', color) + '<span class="lx-lab"></span>';
      n.style.setProperty('--c', color);
      var ang = (i / AGENTS) * Math.PI * 2;
      var a = { n: n, lab: n.lastChild, c: color, x: h ? h.spot.x : vw / 2 + Math.cos(ang) * 46, y: h ? h.spot.y : vh / 2 + Math.sin(ang) * 46, st: 0, it: null, t: 0, dur: 0.3, sx: 0, sy: 0, tx: 0, ty: 0, wait: 0 };
      if (h) a.lab.textContent = h.label;
      n.style.transform = 'translate3d(' + a.x + 'px,' + a.y + 'px,0)';
      bOverlay.appendChild(n);
      bAgents.push(a);
    }
    building = true;
    bNext = 0;
    bFront = 0;
    bDone = 0;
    bLive = [];
    bPos = window.scrollY;
    bVel = 0;
    bGoal = bPos;
    bSetY = bPos;
    bLast = 0;
    bStart = performance.now() / 1000;
    bSp = 1;
    bVT = 0;
    leaveGate('gx-fade');
    skipEvents.forEach(function (ev) {
      window.addEventListener(ev, skipBuild, { passive: true, capture: true });
    });
    requestAnimationFrame(bframe);
  }

  function skipBuild(e) {
    if (e.type === 'keydown' && /^(Shift|Control|Alt|Meta)$/.test(e.key)) return;
    if (building) finishBuild(true);
  }

  function makeBox(color) {
    var b = el('div', '', 'lx-box');
    b.style.setProperty('--c', color);
    var h = '';
    var pts = [[0, 0], [50, 0], [100, 0], [0, 50], [100, 50], [0, 100], [50, 100], [100, 100]];
    for (var i = 0; i < pts.length; i++) h += '<i style="left:' + pts[i][0] + '%;top:' + pts[i][1] + '%"></i>';
    h += '<span class="lx-dim"></span>';
    b.innerHTML = h;
    bOverlay.appendChild(b);
    return b;
  }

  function spawnGuide(r) {
    if (bGuides > 5) return;
    bGuides++;
    var horiz = Math.random() < 0.5;
    var g = el('div', '', 'lx-guide ' + (horiz ? 'lx-gh ' : 'lx-gv ') + (Math.random() < 0.5 ? 'lx-gr' : 'lx-gb'));
    var edge = Math.random() < 0.5;
    if (horiz) g.style.transform = 'translate3d(0,' + (edge ? r.top : r.bottom).toFixed(1) + 'px,0)';
    else g.style.transform = 'translate3d(' + (edge ? r.left : r.right).toFixed(1) + 'px,0,0)';
    bOverlay.appendChild(g);
    setTimeout(function () {
      g.remove();
      bGuides--;
    }, 800);
  }

  function prepTexts(it) {
    it.prep = true;
    it.texts.forEach(function (t) {
      var w = doc.createElement('span');
      w.className = 'lx-tw';
      t.toks = [];
      var re = /\S+\s*|\s+/g;
      var m;
      while ((m = re.exec(t.full))) {
        var sp = doc.createElement('span');
        sp.className = 'lx-g';
        sp.textContent = m[0];
        w.appendChild(sp);
        t.toks.push({ s: m[0], a: m.index, n: sp, st: 0 });
      }
      t.n.data = '';
      t.n.parentNode.insertBefore(w, t.n.nextSibling);
      t.ghost = w;
      t.k = 0;
    });
    it.caret = el('span', '', 'lx-caret');
    it.caret.style.setProperty('--c', it.ag ? it.ag.c : '#fff');
  }

  function setTok(tk, kk, caret) {
    var d = kk - tk.a;
    if (d <= 0) {
      if (tk.st !== 0) {
        tk.st = 0;
        tk.n.className = 'lx-g';
        tk.n.textContent = tk.s;
      }
      return;
    }
    if (d >= tk.s.length) {
      if (tk.st !== 2) {
        tk.st = 2;
        tk.n.className = '';
        tk.n.textContent = tk.s;
      }
      return;
    }
    tk.st = 1;
    tk.n.className = '';
    tk.n.textContent = tk.s.slice(0, d);
    tk.n.appendChild(caret);
    var g = doc.createElement('span');
    g.className = 'lx-g';
    g.textContent = tk.s.slice(d);
    tk.n.appendChild(g);
  }

  function typeTo(it, p) {
    var k = Math.floor(p * it.chars);
    var off = 0;
    var placed = false;
    for (var i = 0; i < it.texts.length; i++) {
      var t = it.texts[i];
      var kk = clamp(k - off, 0, t.len);
      if (kk !== t.k) {
        for (var j = 0; j < t.toks.length; j++) {
          var tk = t.toks[j];
          if (tk.a + tk.s.length >= Math.min(kk, t.k) && tk.a <= Math.max(kk, t.k)) setTok(tk, kk, it.caret);
        }
        t.k = kk;
      }
      if (!placed && kk < t.len) {
        placed = true;
        var cur = null;
        for (var q = 0; q < t.toks.length; q++) {
          if (t.toks[q].a + t.toks[q].s.length > kk) {
            cur = t.toks[q];
            break;
          }
        }
        if (cur && cur.st !== 1 && it.caret.nextSibling !== cur.n) cur.n.parentNode.insertBefore(it.caret, cur.n);
      }
      off += t.len;
    }
    if (!placed && it.texts.length) {
      var lg = it.texts[it.texts.length - 1].ghost;
      if (it.caret.parentNode !== lg || it.caret.nextSibling) lg.appendChild(it.caret);
    }
  }

  function restoreTexts(it) {
    if (!it.prep) return;
    it.prep = false;
    it.texts.forEach(function (t) {
      t.n.data = t.full;
      if (t.ghost) t.ghost.remove();
      t.ghost = null;
    });
    if (it.caret) it.caret.remove();
  }

  function revealItem(it, r) {
    it.state = 2;
    if (it.kind === 'text') prepTexts(it);
    it.el.classList.remove('lx-b');
    if (!it.el.animate) return;
    if (it.kind === 'media') {
      it.el.animate([
        { opacity: it.base, clipPath: 'inset(0 0 100% 0)', filter: 'grayscale(1) contrast(1.6) brightness(1.4)' },
        { opacity: it.base, clipPath: 'inset(0 0 0% 0)', filter: 'grayscale(1) contrast(1.6) brightness(1.4)', offset: 0.7 },
        { opacity: it.base, clipPath: 'inset(0 0 0% 0)', filter: 'none' }
      ], { duration: Math.round(1133 / bSp), easing: 'steps(14, end)' });
      var sc = el('div', '', 'lx-scan');
      sc.style.cssText = 'left:' + (r.left + window.scrollX) + 'px;top:' + (r.top + window.scrollY) + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
      if (it.ag) sc.style.setProperty('--c', it.ag.c);
      sc.style.setProperty('--sp', bSp.toFixed(3));
      body.appendChild(sc);
      setTimeout(function () { sc.remove(); }, Math.round(1200 / bSp));
      return;
    }
    it.el.animate([{ opacity: 0 }, { opacity: it.base }], { duration: it.kind === 'box' ? 380 : 200, easing: 'ease-out' });
  }

  function releaseBox(it) {
    dropWire(it.el);
    if (it.box) {
      var b = it.box;
      it.box = null;
      b.classList.add('lx-box-out');
      setTimeout(function () {
        b.remove();
      }, 500);
    }
    var i = bLive.indexOf(it);
    if (i >= 0) bLive.splice(i, 1);
  }

  function easeIO(p) {
    return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  }

  function maxScroll() {
    return Math.max(0, Math.max(root.scrollHeight, body.scrollHeight) - window.innerHeight);
  }

  function dropItem(it) {
    if (it.state === 3) return;
    restoreTexts(it);
    it.el.classList.remove('lx-b');
    it.state = 3;
    bDone++;
    dropWire(it.el);
  }

  function nearestIdle(r) {
    var best = null;
    var bd = Infinity;
    var tx = clamp(r.left, 4, vw - 22);
    var ty = clamp(r.top, 4, vh - 30);
    for (var i = 0; i < bAgents.length; i++) {
      var a = bAgents[i];
      if (a.it || (a.rest || 0) > 0) continue;
      var dx = tx - a.x;
      var dy = ty - a.y;
      var d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    return best;
  }

  function claim(a, it, r) {
    it.state = 1;
    it.ag = a;
    it.box = null;
    a.it = it;
    a.st = 1;
    a.t = 0;
    a.sx = a.x;
    a.sy = a.y;
    a.lab.textContent = labelFor(it);
    a.n.classList.remove('lx-idle');
    bLive.push(it);
    var dx = clamp(r.left, 4, vw - 22) - a.x;
    var dy = clamp(r.top, 4, vh - 30) - a.y;
    a.dur = Math.max(0.5, clamp(Math.sqrt(dx * dx + dy * dy) / 1500, 0.5, 0.7) - bHurry * 0.1);
  }

  function bframe(ts) {
    if (!building) return;
    var now = ts / 1000;
    var rdt = Math.min(0.05, bLast ? now - bLast : 0.016);
    bLast = now;
    var el_s = now - bStart;
    var cy = bPos + vh * 0.6;
    var yF = Math.max(bY3 + 1, maxScroll() + vh * 0.6);
    var tsp = cy <= bY2 ? 1 : cy < bY3 ? 1 + (CFG.rampMid - 1) * easeIO((cy - bY2) / (bY3 - bY2)) : CFG.rampMid + (CFG.rampEnd - CFG.rampMid) * easeIO(clamp((cy - bY3) / (yF - bY3), 0, 1));
    bSp += (tsp - bSp) * Math.min(1, rdt * 3);
    rdt *= bSp;
    bVT += rdt;
    if (el_s > bCap) {
      finishBuild(true);
      return;
    }
    var sy = window.scrollY;
    if (Math.abs(sy - bSetY) > 1) {
      bPos = sy;
      bGoal = Math.max(bGoal, sy);
    }
    var maxS = maxScroll();
    var len = bItems.length;

    var frac = len ? bDone / len : 1;
    var lag = clamp(bVT / bGoalT, 0, 1) - frac;
    bConc = clamp(bConc + (lag > 0.03 ? 0.6 : lag < -0.05 ? -0.4 : 0) * rdt, 0.35, 1);
    bHurry = clamp((lag - 0.03) / 0.15, 0, 1);
    var maxActive = Math.max(3, Math.round(AGENTS * bConc));
    var restMul = 0.6 + (1 - bConc) * 2.4;

    var rects = new Map();
    for (var i = 0; i < bLive.length; i++) {
      var lr = bLive[i].el.getBoundingClientRect();
      rects.set(bLive[i], lr);
      bLive[i].top = lr.top + sy;
    }

    var win = vh * (0.9 + bHurry * 0.06);
    var atBottom = bPos >= maxS - 2;
    var blocked = false;
    while (bLive.length < maxActive) {
      while (bNext < len && bItems[bNext].state !== 0) bNext++;
      var nx = bItems[bNext];
      if (!nx) break;
      if (!nx.el.isConnected) {
        dropItem(nx);
        continue;
      }
      var nr = nx.el.getBoundingClientRect();
      nx.top = nr.top + sy;
      if (nr.width < 1 && nr.height < 1) {
        dropItem(nx);
        continue;
      }
      if (!(nr.top < win || (atBottom && nr.top < vh + 2) || bWait > 2.5)) {
        blocked = true;
        break;
      }
      var ag = nearestIdle(nr);
      if (!ag) break;
      claim(ag, nx, nr);
      rects.set(nx, nr);
      bWait = 0;
    }
    bWait = blocked ? bWait + rdt : 0;

    for (var ai = 0; ai < bAgents.length; ai++) {
      var a = bAgents[ai];
      var it = a.it;
      if (!it) {
        if ((a.rest || 0) > 0) a.rest -= rdt;
        a.n.classList.add('lx-idle');
        a.wt = (a.wt || 0) - rdt;
        if (a.wt <= 0) {
          a.wx = rnd(0.06, 0.94) * vw;
          a.wy = rnd(0.1, 0.8) * vh;
          a.wt = rnd(1.1, 2.6);
        }
        var wk = Math.min(1, rdt * 1.7);
        a.x += (a.wx - a.x) * wk;
        a.y += (a.wy - a.y) * wk;
        continue;
      }
      var r = rects.get(it);
      if (a.st === 1) {
        a.t += rdt;
        var e1 = easeIO(Math.min(1, a.t / a.dur));
        a.x = a.sx + (clamp(r.left, 4, vw - 22) - a.sx) * e1;
        a.y = a.sy + (clamp(r.top, 4, vh - 30) - a.sy) * e1;
        if (a.t >= a.dur) {
          a.st = 2;
          a.t = 0;
          a.dd = 0.6 + Math.min(0.2, (r.width * r.height) / 1500000) * (1 - bHurry);
          it.box = makeBox(a.c);
          if (Math.random() < 0.28) spawnGuide(r);
        }
      } else if (a.st === 2) {
        a.t += rdt;
        var e2 = easeIO(Math.min(1, a.t / a.dd));
        a.x = clamp(r.left + r.width * e2, 4, vw - 22);
        a.y = clamp(r.top + r.height * e2, 4, vh - 30);
        if (a.t >= a.dd) {
          a.st = 3;
          a.t = 0;
        }
      } else if (a.st === 3) {
        a.x = clamp(r.right, 4, vw - 22);
        a.y = clamp(r.bottom, 4, vh - 30);
        if (!it.pi || it.pi.state >= 2) {
          revealItem(it, r);
          a.st = 4;
          a.t = 0;
        }
      } else if (a.st === 4) {
        a.t += rdt;
        a.x = clamp(r.right, 4, vw - 22);
        a.y = clamp(r.bottom, 4, vh - 30);
        var fd = it.kind === 'text' ? it.typeDur : it.kind === 'media' ? 1.133 : 0.4;
        if (it.kind === 'text') typeTo(it, Math.min(1, a.t / fd));
        if (a.t >= fd * (it.kind === 'media' ? 0.7 : 1)) it.settled = true;
        if (a.t >= fd + (it.kind === 'text' ? 0.42 - bHurry * 0.2 : 0.1)) {
          restoreTexts(it);
          it.state = 3;
          bDone++;
          releaseBox(it);
          a.it = null;
          a.st = 0;
          a.rest = rnd(0.12, 0.18) * restMul;
        }
      }
    }

    for (var li = 0; li < bLive.length; li++) {
      var lit = bLive[li];
      var b = lit.box;
      if (!b) continue;
      var rc = rects.get(lit);
      var w = rc.width;
      var h = rc.height;
      var ag2 = lit.ag;
      if (ag2.st === 2) {
        var pp = easeIO(Math.min(1, ag2.t / ag2.dd));
        w *= pp;
        h *= pp;
      }
      b.style.transform = 'translate3d(' + rc.left.toFixed(1) + 'px,' + rc.top.toFixed(1) + 'px,0)';
      b.style.width = w.toFixed(1) + 'px';
      b.style.height = h.toFixed(1) + 'px';
      if (ag2.st <= 2) b.lastChild.textContent = Math.round(w) + ' × ' + Math.round(h);
    }

    for (var bi = 0; bi < bAgents.length; bi++) {
      var ba = bAgents[bi];
      ba.n.style.transform = 'translate3d(' + ba.x.toFixed(1) + 'px,' + ba.y.toFixed(1) + 'px,0)';
    }

    if (bDone >= len) {
      finishBuild(false);
      return;
    }

    while (bFront < len && bItems[bFront].state === 3) bFront++;
    while (bNext < len && bItems[bNext].state !== 0) bNext++;
    var want = maxS;
    var nxt = bItems[bNext];
    if (nxt) want = nxt.top - vh * (0.62 - bHurry * 0.12);
    var fi = bFront;
    while (fi < len && (bItems[fi].state === 3 || bItems[fi].settled)) fi++;
    var fr = bItems[fi];
    if (fr) {
      var frr = rects.get(fr) || fr.el.getBoundingClientRect();
      var cap = frr.top + sy + Math.min(frr.height, vh) * (fr.kind === 'media' ? 0.65 : fr.kind === 'box' ? 0.5 : 0.4) - vh * 0.03;
      want = Math.min(want, cap);
    }
    for (var hi = 0; hi < len; hi++) {
      if (bItems[hi].hdr && bItems[hi].state !== 3) {
        want = 0;
        break;
      }
    }
    want = clamp(want, 0, maxS);
    if (want > bGoal + 8 || (want > bGoal && want >= maxS - 1)) bGoal = want;
    bGoal = Math.min(bGoal, maxS);

    if (bReduce) {
      bPos = bGoal;
      bVel = 0;
    } else {
      var k = 7;
      var acc = k * (bGoal - bPos) - 2 * Math.sqrt(k) * bVel;
      bVel = clamp(bVel + acc * rdt, -vh * 0.9, vh * 0.9);
      bPos += bVel * rdt;
      if (Math.abs(bGoal - bPos) < 0.5 && Math.abs(bVel) < 4) {
        bPos = bGoal;
        bVel = 0;
      }
    }
    bPos = clamp(bPos, 0, maxS);
    if (Math.abs(bPos - sy) > 0.4) window.scrollTo(0, bPos);
    bSetY = window.scrollY;

    requestAnimationFrame(bframe);
  }

  function finishBuild(instant) {
    if (!building) return;
    building = false;
    skipEvents.forEach(function (ev) {
      window.removeEventListener(ev, skipBuild, true);
    });
    bItems.forEach(function (it) {
      restoreTexts(it);
      it.el.classList.remove('lx-b');
      it.box = null;
    });
    dropWires();
    bOverlay.querySelectorAll('.lx-box, .lx-guide').forEach(function (n) {
      n.remove();
    });
    bLive = [];
    bGuides = 0;
    bOverlay.classList.add('lx-det');
    bAgents.forEach(function (a) {
      var ang = Math.random() * Math.PI * 2;
      var sp = rnd(70, 170);
      a.vx = Math.cos(ang) * sp;
      a.vy = Math.sin(ang) * sp;
    });
    var dur = instant ? 0.35 : 1.4;
    var t0 = 0;
    function dloop(ts) {
      var t = ts / 1000;
      if (!t0) t0 = t;
      var k = (t - t0) / dur;
      var dd = Math.min(0.05, 0.016);
      bAgents.forEach(function (a) {
        a.x += a.vx * dd;
        a.y += a.vy * dd;
        a.n.style.transform = 'translate3d(' + a.x.toFixed(1) + 'px,' + a.y.toFixed(1) + 'px,0)';
      });
      if (k < 1) {
        requestAnimationFrame(dloop);
        return;
      }
      bOverlay.remove();
      bOverlay = null;
      root.classList.remove('lx-build');
      showReplay();
    }
    requestAnimationFrame(dloop);
  }

  var replayBtn = null;

  function replayOn() {
    if (!replayBtn) return;
    replayBtn.classList.add('lx-rp-on');
  }

  function replaySlot() {
    var sl = doc.getElementById('lx-rslot');
    if (sl) return sl;
    sl = el('div', 'lx-rslot');
    var ends = doc.querySelectorAll(CFG.replayBefore || 'footer, [role="contentinfo"]');
    var end = ends[ends.length - 1];
    if (end) end.parentNode.insertBefore(sl, end);
    else body.appendChild(sl);
    return sl;
  }

  function showReplay() {
    if (replayBtn || building || reduced || !CFG.replay) return;
    replayBtn = el('button', 'lx-replay', 'lx-replay');
    replayBtn.type = 'button';
    replayBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2.5v3h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    replayBtn.appendChild(doc.createTextNode(CFG.replayLabel));
    replaySlot().appendChild(replayBtn);
    requestAnimationFrame(function () {
      requestAnimationFrame(replayOn);
    });
    replayBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      replay();
    });
  }

  function hideReplay() {
    if (!replayBtn) return;
    var b = replayBtn;
    replayBtn = null;
    b.classList.remove('lx-rp-on');
    b.disabled = true;
    setTimeout(function () {
      b.remove();
    }, 400);
  }

  function replay() {
    if (building) return;
    hideReplay();
    var t0 = performance.now();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    function waitTop() {
      if (window.scrollY > 1 && performance.now() - t0 < 2500) {
        requestAnimationFrame(waitTop);
        return;
      }
      window.scrollTo(0, 0);
      setTimeout(beginBuild, 120);
    }
    requestAnimationFrame(waitTop);
  }

  window.addEventListener('resize', function () {
    vw = window.innerWidth;
    vh = window.innerHeight;
  });

  if (wantBuild()) {
    replaySlot();
    showGate();
  }
  else root.classList.remove('lx-pre');

  function showGate() {
    root.classList.add('lx-pre');
    var g = el('section', 'lx-gate', 'lx-gate');
    g.setAttribute('aria-label', 'Start screen');
    g.setAttribute('role', 'dialog');
    var agent = function (cls, c, label) {
      return '<div class="gx-agent ' + cls + '" style="--c:' + c + '">' + PTR + '<span class="gx-tag">' + label + '</span></div>';
    };
    g.innerHTML =
      '<div class="gx-bg" aria-hidden="true"><span class="gx-blob gx-blob-a"></span><span class="gx-blob gx-blob-b"></span></div>' +
      '<div class="gx-veil" aria-hidden="true"></div>' +
      '<header class="gx-bar"><div class="gx-mark" aria-hidden="true"></div>' +
      '<div class="gx-loc"><span class="gx-dot" aria-hidden="true"></span><span class="gx-place"></span><span class="gx-rule" aria-hidden="true"></span><time class="gx-clock" aria-hidden="true"></time></div></header>' +
      '<div class="gx-ambient" aria-hidden="true">' +
      agent('gx-a1', '#ffd075', 'Grid') +
      agent('gx-a2', '#ff28ea', 'Motion') +
      agent('gx-a3', '#7ee0c3', 'QA') +
      agent('gx-a4', '#cbceea', 'Copy') +
      '</div>' +
      '<div class="gx-intro"><div class="gx-sel">' +
      '<span class="gx-selbox" aria-hidden="true"></span>' +
      '<span class="gx-hd gx-tl" aria-hidden="true"></span><span class="gx-hd gx-tr" aria-hidden="true"></span><span class="gx-hd gx-bl" aria-hidden="true"></span><span class="gx-hd gx-br" aria-hidden="true"></span>' +
      '<span class="gx-dims" aria-hidden="true"><b>H1</b><span class="gx-dimval"></span></span>' +
      '<h1 class="gx-title"></h1>' +
      '<div class="gx-agent" style="--c:#ff5fa2" aria-hidden="true"><div class="gx-anim">' + PTR + '<span class="gx-tag">Lead</span></div></div></div>' +
      '<p class="gx-role"><span class="gx-g"></span><span class="gx-caret" aria-hidden="true"></span>' +
      '<span class="gx-agent" style="--c:#ffb347" aria-hidden="true">' + PTR + '<span class="gx-tag">Type</span></span></p>' +
      '<div class="gx-actions">' +
      '<button class="gx-btn gx-primary" type="button"><svg width="16" height="18" viewBox="0 0 18 20" aria-hidden="true"><path d="M1.6 1.4 16 9.3 9.5 10.8 6.5 17.6Z" fill="currentColor"/></svg><span class="gx-cta"></span><span class="gx-kbd" aria-hidden="true">Enter</span></button>' +
      '<button class="gx-btn gx-ghost" type="button"><span class="gx-skip"></span><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</div></div>' +
      '<div class="gx-frame" aria-hidden="true">' +
      '<span class="gx-corner gx-ctl"></span><span class="gx-corner gx-ctr"></span><span class="gx-corner gx-cbl"></span><span class="gx-corner gx-cbr"></span>' +
      '<div class="gx-readout"><span class="gx-chip gx-chipa"></span><span class="gx-chip gx-hot gx-chipb"></span><span class="gx-meta">y 000</span></div>' +
      '<div class="gx-beam"></div></div>' +
      '<div class="gx-ripple" aria-hidden="true"></div><div class="gx-core" aria-hidden="true"></div>' +
      '<div class="gx-agents" aria-hidden="true"></div>' +
      '<div class="gx-status" role="status" aria-live="polite"><span class="gx-spin" aria-hidden="true"></span><span class="gx-txt">Scanning page</span></div>';
    var put = function (sel, text) {
      var n = g.querySelector(sel);
      if (n) n.textContent = text;
      return n;
    };
    put('.gx-mark', CFG.initials);
    put('.gx-title', CFG.name);
    put('.gx-g', CFG.title);
    put('.gx-cta', CFG.cta);
    put('.gx-skip', CFG.skip);
    put('.gx-place', CFG.location);
    if (!CFG.name) g.querySelector('.gx-sel').hidden = true;
    if (!CFG.title) g.querySelector('.gx-role').hidden = true;
    if (!CFG.location) {
      g.querySelector('.gx-place').hidden = true;
      g.querySelector('.gx-rule').hidden = true;
    }
    if (!CFG.clock) {
      g.querySelector('.gx-clock').hidden = true;
      g.querySelector('.gx-rule').hidden = true;
    }
    if (!CFG.location && !CFG.clock) g.querySelector('.gx-loc').hidden = true;
    if (!CFG.initials) g.querySelector('.gx-mark').hidden = true;
    root.appendChild(g);

    var clock = g.querySelector('.gx-clock');
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat('en-US', CFG.timezone ? { hour: 'numeric', minute: '2-digit', timeZone: CFG.timezone } : { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    function tick() {
      clock.textContent = fmt.format(new Date());
    }
    tick();
    var clockTimer = CFG.clock ? setInterval(tick, 15000) : 0;
    var title = g.querySelector('.gx-title');
    var dimval = g.querySelector('.gx-dimval');
    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () {
        var r = title.getBoundingClientRect();
        dimval.textContent = Math.round(r.width) + ' \u00d7 ' + Math.round(r.height);
      });
      ro.observe(title);
    }

    function onKey(e) {
      if (e.repeat) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      } else if (e.key === 'Enter' && !e.target.closest('button,a,input,textarea,select')) {
        e.preventDefault();
        close(true);
      }
    }

    function stop() {
      clearInterval(clockTimer);
      if (ro) ro.disconnect();
      doc.removeEventListener('keydown', onKey);
    }

    function close(build) {
      doc.removeEventListener('keydown', onKey);
      if (build) {
        gateStop = stop;
        startIntro(g);
        return;
      }
      gateEl = g;
      gateStop = stop;
      leaveGate('gx-leaving');
      root.classList.remove('lx-pre');
      try {
        sessionStorage.setItem(BKEY, '1');
      } catch (e) {}
    }

    doc.addEventListener('keydown', onKey);
    g.querySelector('.gx-primary').addEventListener('click', function (e) {
      e.stopPropagation();
      close(true);
    });
    g.querySelector('.gx-ghost').addEventListener('click', function (e) {
      e.stopPropagation();
      close(false);
    });
  }
})();
