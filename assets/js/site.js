/* PDBrain-LM website: behaviour. No dependencies.
   The page is complete without this file; everything here is an enhancement.

     1  Rotating figures (GIF over a still, pause control, group sync)
     2  Current section in the top bar
     3  Section explorer
     4  Copy buttons
     5  Tooltip on the AUC table
*/
(function () {
  'use strict';

  var doc = document;

  function all(selector, root) {
    return Array.prototype.slice.call((root || doc).querySelectorAll(selector));
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  /* 1 · Rotating figures -----------------------------------------------------
     Each [data-anim] holds a still image. The GIF named in data-gif (and
     data-gif-narrow, for small screens) is laid over it once the figure is
     near the viewport. Pausing removes the GIF again, which also stops the
     decoding work. Figures that share a data-sync name restart together, so
     their rotations stay in phase. */

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var motion = !reduced;
  var anims = all('[data-anim]');

  function mount(el) {
    if (el._live || !motion || !el._near) return;

    var picture = doc.createElement('picture');
    picture.className = 'anim__live';

    var narrow = el.getAttribute('data-gif-narrow');
    if (narrow) {
      var source = doc.createElement('source');
      source.media = '(max-width: 720px)';
      source.srcset = narrow;
      picture.appendChild(source);
    }

    var img = doc.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    picture.appendChild(img);

    img.addEventListener('load', function onload() {
      img.removeEventListener('load', onload);
      el._ready = true;
      restartGroup(el.getAttribute('data-sync'));
    });
    img.src = el.getAttribute('data-gif');

    el.appendChild(picture);
    el._live = picture;
    el._img = img;
    el._ready = false;
  }

  function unmount(el) {
    if (!el._live) return;
    el.removeChild(el._live);
    el._live = el._img = null;
    el._ready = false;
  }

  function restartGroup(name) {
    if (!name) return;
    var members = anims.filter(function (a) { return a.getAttribute('data-sync') === name; });
    var ready = members.every(function (a) { return a._live && a._ready; });
    if (!ready) return;
    // Setting src again restarts a GIF from its first frame.
    members.forEach(function (a) { a._img.src = a._img.getAttribute('src'); });
  }

  function setMotion(on) {
    motion = on;
    anims.forEach(function (el) {
      if (on) mount(el); else unmount(el);
    });
    all('[data-motion]').forEach(function (button) {
      if (on) button.removeAttribute('data-paused'); else button.setAttribute('data-paused', '');
      var label = button.querySelector('[data-motion-label]');
      if (label) label.textContent = on ? 'Pause rotation' : 'Play rotation';
    });
  }

  if ('IntersectionObserver' in window) {
    var nearby = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target._near = true;
        nearby.unobserve(entry.target);
        mount(entry.target);
      });
    }, { rootMargin: '600px 0px' });

    anims.forEach(function (el) {
      if (el.hasAttribute('data-eager')) el._near = true; else nearby.observe(el);
    });
  } else {
    anims.forEach(function (el) { el._near = true; });
  }

  all('[data-motion]').forEach(function (button) {
    button.addEventListener('click', function () { setMotion(!motion); });
  });
  setMotion(motion);

  /* 2 · Current section in the top bar -------------------------------------- */

  var nav = doc.querySelector('.bar__nav');
  var links = all('.bar__nav a');
  var linkFor = {};
  links.forEach(function (a) { linkFor[a.getAttribute('href').slice(1)] = a; });

  if (nav && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var current = linkFor[entry.target.id];
        if (!current) return;
        current.setAttribute('aria-current', 'true');
        // keep the current link visible when the bar scrolls sideways (phones)
        var left = current.offsetLeft - nav.offsetLeft;
        if (left < nav.scrollLeft || left + current.offsetWidth > nav.scrollLeft + nav.clientWidth) {
          nav.scrollLeft = Math.max(0, left - 16);
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    all('main section[id]').forEach(function (section) { spy.observe(section); });
  }

  /* 3 · Section explorer ------------------------------------------------------
     Shows the same section of the two example brains side by side. Image sizes
     come from assets/js/media-manifest.js, so both brains are drawn at one
     scale whatever their canvas size. */

  var explorer = doc.querySelector('[data-explorer]');
  var media = window.PDB_MEDIA;

  if (explorer && media && media.sections) {
    var LEVELS = {
      coronal: {
        axis: 'Distance from the anterior pole',
        phrase: 'from the anterior pole',
        values: ['5.7 mm', '7.7 mm', '9.8 mm']
      },
      sagittal: {
        axis: 'Distance from the midline, approximate',
        phrase: 'lateral to the midline',
        values: ['0.8 mm', '1.7 mm', '2.5 mm']
      },
      horizontal: {
        axis: 'Depth below the dorsal surface',
        phrase: 'below the dorsal surface',
        values: ['4.1 mm', '3.1 mm', '2.2 mm']
      }
    };
    var CHANNEL = { af: 'Autofluorescence', ps129: 'pS129', th: 'TH' };
    var GROUPS = { pff: 'PFF-injected brain', monomer: 'monomer control brain' };
    var groupKeys = Object.keys(GROUPS);

    var form = explorer.querySelector('form');
    var axisLabel = explorer.querySelector('[data-xp-axis]');
    var levelLabels = all('[data-xp-level]', explorer);
    var panes = {};
    all('[data-xp-pane]', explorer).forEach(function (el) {
      panes[el.getAttribute('data-xp-pane')] = { el: el, img: el.querySelector('img') };
    });

    var shownPlane = 'coronal';
    var ticket = 0;

    var readState = function () {
      var f = form.elements;
      return { plane: f.plane.value, level: f.level.value, channel: f.channel.value };
    };

    var urlFor = function (group, s) {
      return 'assets/img/sections/' + group + '/' + s.plane + '-' + s.level + '-' + s.channel + '.webp';
    };

    // One scale factor for both panes: fit the larger canvas to the column,
    // and keep tall (horizontal) sections within the height of the window.
    var fit = function () {
      var sizes = {};
      var maxW = 0, maxH = 0;
      groupKeys.forEach(function (g) {
        sizes[g] = media.sections[g][shownPlane];
        maxW = Math.max(maxW, sizes[g].w);
        maxH = Math.max(maxH, sizes[g].h);
      });
      var column = panes.pff.el.clientWidth;
      var tallest = Math.max(360, window.innerHeight * 0.78);
      var k = Math.min(column / maxW, tallest / maxH);
      groupKeys.forEach(function (g) {
        var img = panes[g].img;
        img.width = sizes[g].w;
        img.height = sizes[g].h;
        img.style.width = Math.round(sizes[g].w * k) + 'px';
      });
    };

    var show = function (s) {
      var level = LEVELS[s.plane];
      shownPlane = s.plane;
      groupKeys.forEach(function (g) {
        var pane = panes[g];
        pane.img.removeAttribute('loading');
        pane.img.src = urlFor(g, s);
        pane.img.alt = CHANNEL[s.channel] + ' channel, ' + s.plane + ' section ' +
          level.values[s.level - 1] + ' ' + level.phrase + ', ' + GROUPS[g] + '.';
        pane.el.classList.remove('is-loading');
      });
      fit();
    };

    // Load both images first, then swap them together: the previous pair stays
    // on screen (dimmed) meanwhile, so nothing jumps.
    var update = function () {
      var s = readState();
      var mine = ++ticket;
      var pending = groupKeys.length;
      var level = LEVELS[s.plane];

      axisLabel.textContent = level.axis;
      levelLabels.forEach(function (el, i) { el.textContent = level.values[i]; });

      groupKeys.forEach(function (g) {
        panes[g].el.classList.add('is-loading');
        var loader = new Image();
        loader.onload = loader.onerror = function () {
          pending -= 1;
          if (pending === 0 && mine === ticket) show(s);
        };
        loader.src = urlFor(g, s);
      });
    };

    form.addEventListener('change', update);
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    window.addEventListener('resize', debounce(fit, 120));
    fit();
  }

  /* Tables that overflow on small screens scroll sideways inside .tbl-wrap;
     make those wrappers reachable from the keyboard. */

  var tableWraps = all('.tbl-wrap');
  var markScrollable = function () {
    tableWraps.forEach(function (wrap) {
      if (wrap.scrollWidth > wrap.clientWidth + 1) {
        wrap.setAttribute('tabindex', '0');
        wrap.setAttribute('role', 'region');
        wrap.setAttribute('aria-label', 'Table, scrolls sideways');
      } else {
        wrap.removeAttribute('tabindex');
        wrap.removeAttribute('role');
        wrap.removeAttribute('aria-label');
      }
    });
  };
  markScrollable();
  window.addEventListener('resize', debounce(markScrollable, 150));

  /* 4 · Copy buttons ---------------------------------------------------------- */

  all('[data-copy]').forEach(function (button) {
    var idle = button.textContent;

    button.addEventListener('click', function () {
      var target = doc.getElementById(button.getAttribute('data-copy'));
      if (!target) return;
      var text = target.textContent;

      var report = function (ok) {
        button.textContent = ok ? 'Copied' : 'Press Ctrl+C';
        setTimeout(function () { button.textContent = idle; }, 1800);
      };

      // Fallback: select the text, try the old command; if that fails too the
      // text is left selected so one key press copies it.
      var selectAndCopy = function () {
        var range = doc.createRange();
        range.selectNodeContents(target);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        var ok = false;
        try { ok = doc.execCommand('copy'); } catch (error) { ok = false; }
        if (ok) selection.removeAllRanges();
        report(ok);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { report(true); }, selectAndCopy);
      } else {
        selectAndCopy();
      }
    });
  });

  /* 5 · Tooltip on the AUC table -------------------------------------------------
     Every value is printed in the table; the tooltip only spells out which
     channel, side and region a cell belongs to. */

  var aucTable = doc.querySelector('[data-auc]');
  var canHover = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);

  if (aucTable && canHover) {
    var COLUMNS = [
      null,
      ['pS129', 'ipsilateral'],
      ['pS129', 'contralateral'],
      ['TH', 'ipsilateral'],
      ['TH', 'contralateral']
    ];

    var tip = doc.createElement('div');
    tip.className = 'tip';
    tip.setAttribute('aria-hidden', 'true');
    var tipValue = doc.createElement('b');
    var tipContext = doc.createElement('span');
    tip.appendChild(tipValue);
    tip.appendChild(tipContext);
    doc.body.appendChild(tip);

    aucTable.addEventListener('pointermove', function (event) {
      var cell = event.target.closest ? event.target.closest('td') : null;
      var column = cell ? COLUMNS[cell.cellIndex] : null;
      if (!column) { tip.classList.remove('is-on'); return; }

      var region = cell.parentNode.querySelector('th abbr');
      var value = cell.querySelector('.auc b');
      var spread = cell.querySelector('.auc i');
      tipValue.textContent = 'AUC ' + value.textContent + ' ' + spread.textContent;
      tipContext.textContent = column[0] + ', ' + column[1] + ' ' +
        (region ? region.getAttribute('title').toLowerCase() : '');

      var x = event.clientX + 14;
      var y = event.clientY + 18;
      if (x + tip.offsetWidth > window.innerWidth - 8) x = event.clientX - tip.offsetWidth - 14;
      if (y + tip.offsetHeight > window.innerHeight - 8) y = event.clientY - tip.offsetHeight - 14;
      tip.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      tip.classList.add('is-on');
    });

    aucTable.addEventListener('pointerleave', function () { tip.classList.remove('is-on'); });
  }
})();
