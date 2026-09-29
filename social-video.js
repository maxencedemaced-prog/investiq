// social-video.js — transforme un carrousel en courte vidéo verticale (1080 × 1920, format Reels / TikTok).
// Tout se fait dans le navigateur : les images des diapositives défilent avec un léger zoom et un fondu,
// sur une musique d'ambiance générée par le code (libre de droits par construction).
// Enregistrement en MP4 (H.264 + AAC) quand le navigateur le permet (Chrome, Edge récents) : format exigé par Instagram.
(function () {
  var W = 1080, H = 1920;
  var SLIDE = { x: 40, y: 250, w: 1000, h: 1250, r: 36 };

  function pickMime() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
    for (var i = 0; i < list.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(list[i])) return list[i];
    return null;
  }

  function loadImage(src) {
    return new Promise(function (ok, ko) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = ko; im.src = src; });
  }

  // Durée d'affichage d'une diapositive selon la quantité de texte à lire (2,5 à 4,5 s : Reels courts, 15 à 25 s)
  function slideDuration(s) {
    var txt = [s.title, s.sub, s.kicker, s.body, s.big, s.note].concat(s.items || []).filter(Boolean).join(' ');
    return Math.min(4.5, Math.max(2.5, 2 + txt.length / 60));
  }

  // ── Musique d'ambiance : accords doux, arpège léger et pulsation discrète (90 BPM) ──
  function startMusic(ctx, dest, total) {
    var master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.2);
    master.gain.setValueAtTime(0.55, ctx.currentTime + Math.max(1.3, total - 1.6));
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + total);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    lp.connect(master); master.connect(dest);
    var t0 = ctx.currentTime + 0.05, beat = 60 / 90, bar = beat * 4;
    var midi = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };
    var chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];   // la m, fa, do, sol
    var note = function (freq, start, dur, type, vol, attack) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + attack);
      g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
      o.connect(g); g.connect(lp);
      o.start(start); o.stop(start + dur + 0.05);
    };
    for (var t = 0, i = 0; t < total; t += bar * 2, i++) {
      var ch = chords[i % chords.length];
      ch.forEach(function (n) { note(midi(n), t0 + t, bar * 2 + 0.6, 'triangle', 0.045, 0.7); });
      for (var k = 0; k < 16; k++) {
        var at = t + k * beat / 2;
        if (at >= total) break;
        note(midi(ch[k % 3] + 12 + (k % 6 === 5 ? 12 : 0)), t0 + at, 0.45, 'sine', 0.035, 0.01);
      }
      for (var b = 0; b < 8; b += 2) {
        var kt = t0 + t + b * beat;
        if (kt - t0 >= total) break;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(90, kt); o.frequency.exponentialRampToValueAtTime(40, kt + 0.18);
        g.gain.setValueAtTime(0.22, kt); g.gain.exponentialRampToValueAtTime(0.001, kt + 0.28);
        o.connect(g); g.connect(master); o.start(kt); o.stop(kt + 0.3);
      }
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function drawBackground(ctx) {
    ctx.fillStyle = '#080e1e'; ctx.fillRect(0, 0, W, H);
    var g1 = ctx.createRadialGradient(W, 0, 0, W, 0, 900);
    g1.addColorStop(0, 'rgba(36,232,152,0.20)'); g1.addColorStop(1, 'rgba(36,232,152,0)');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
    var g2 = ctx.createRadialGradient(0, H, 0, 0, H, 900);
    g2.addColorStop(0, 'rgba(99,102,241,0.18)'); g2.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }

  function drawSlide(ctx, img, alpha, progress) {
    if (!img || alpha <= 0) return;
    var z = 1 + 0.035 * progress, w = SLIDE.w * z, h = SLIDE.h * z;
    ctx.save();
    ctx.globalAlpha = alpha;
    roundRect(ctx, SLIDE.x, SLIDE.y, SLIDE.w, SLIDE.h, SLIDE.r); ctx.clip();
    ctx.drawImage(img, SLIDE.x - (w - SLIDE.w) / 2, SLIDE.y - (h - SLIDE.h) / 2, w, h);
    ctx.restore();
  }

  // Barres de progression façon « stories », marque et rappel du compte
  function drawChrome(ctx, logo, index, frac, count) {
    var x0 = 60, x1 = W - 60, gap = 10, seg = (x1 - x0 - gap * (count - 1)) / count;
    for (var i = 0; i < count; i++) {
      var x = x0 + i * (seg + gap);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; roundRect(ctx, x, 100, seg, 8, 4); ctx.fill();
      var f = i < index ? 1 : i === index ? frac : 0;
      if (f > 0) { ctx.fillStyle = 'rgba(255,255,255,0.92)'; roundRect(ctx, x, 100, Math.max(8, seg * f), 8, 4); ctx.fill(); }
    }
    if (logo) { ctx.save(); roundRect(ctx, 60, 146, 60, 60, 14); ctx.clip(); ctx.drawImage(logo, 60, 146, 60, 60); ctx.restore(); }
    ctx.fillStyle = '#ffffff'; ctx.font = "800 36px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif"; ctx.textBaseline = 'middle';
    ctx.fillText('@kapitaro_app', 138, 178);
    ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.font = "600 34px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('Plus de conseils simples sur @kapitaro_app', W / 2, 1575);
    ctx.textAlign = 'left';
  }

  // images : adresses (data: ou https) des diapositives déjà rendues ; slides : contenu (pour les durées)
  async function make(images, slides, opts) {
    opts = opts || {};
    var mime = pickMime();
    if (!mime) throw new Error('Ce navigateur ne sait pas enregistrer de vidéo. Utilise Chrome ou Edge à jour.');
    var imgs = await Promise.all(images.map(loadImage));
    var logo = await loadImage('/icons/kapitaro-tile.svg').catch(function () { return null; });
    var durs = slides.map(slideDuration);
    durs[durs.length - 1] += 0.6;
    var starts = [], acc = 0;
    durs.forEach(function (d) { starts.push(acc); acc += d; });
    var total = acc, FADE = 0.4;

    var canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var stream = canvas.captureStream(30);
    var actx = new (window.AudioContext || window.webkitAudioContext)();
    await actx.resume();
    var adest = actx.createMediaStreamDestination();
    if (opts.music !== false) startMusic(actx, adest, total);
    adest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });

    var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5000000, audioBitsPerSecond: 128000 });
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    var done = new Promise(function (ok) { rec.onstop = ok; });
    var aborted = null;
    var onHide = function () { if (document.hidden) aborted = 'Enregistrement interrompu : garde l\'onglet affiché pendant la création de la vidéo.'; };
    document.addEventListener('visibilitychange', onHide);

    drawBackground(ctx); drawSlide(ctx, imgs[0], 1, 0); drawChrome(ctx, logo, 0, 0, imgs.length);
    rec.start(250);
    var t0 = performance.now();
    await new Promise(function (resolve) {
      function frame() {
        var t = (performance.now() - t0) / 1000;
        if (aborted || t >= total) { resolve(); return; }
        var i = 0; while (i < starts.length - 1 && t >= starts[i + 1]) i++;
        var local = t - starts[i], p = local / durs[i];
        drawBackground(ctx);
        if (i > 0 && local < FADE) {
          drawSlide(ctx, imgs[i - 1], 1 - local / FADE, 1);
          drawSlide(ctx, imgs[i], local / FADE, p);
        } else drawSlide(ctx, imgs[i], 1, p);
        drawChrome(ctx, logo, i, Math.min(1, p), imgs.length);
        if (opts.onProgress) opts.onProgress(Math.min(1, t / total));
        setTimeout(frame, 1000 / 30);   // horloge à 30 images/s (plus fiable que requestAnimationFrame pour un enregistrement)
      }
      frame();
    });
    rec.stop();
    await done;
    document.removeEventListener('visibilitychange', onHide);
    stream.getTracks().forEach(function (t) { t.stop(); });
    actx.close();
    if (aborted) throw new Error(aborted);
    var type = mime.split(';')[0];
    return { blob: new Blob(chunks, { type: type }), mp4: type === 'video/mp4', seconds: Math.round(total) };
  }

  window.KapitaroVideo = { make: make, W: W, H: H };
})();
