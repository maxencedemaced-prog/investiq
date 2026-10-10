// social-video.js — transforme un carrousel en courte vidéo verticale (1080 × 1920, format Reels / TikTok).
// Tout se fait dans le navigateur : les images des diapositives défilent avec un léger zoom et un fondu,
// sur une musique d'ambiance générée par le code (libre de droits par construction).
// Enregistrement en MP4 (H.264 + AAC) quand le navigateur le permet (Chrome, Edge récents) : format exigé par Instagram.
(function () {
  var W = 1080, H = 1920;
  var SLIDE = { x: 40, y: 250, w: 1000, h: 1250, r: 36 };

  function pickMime() {
    // H.264 niveau 4.0 (High, puis Main, puis Baseline) : le niveau 3.0 ne couvre pas le 1080 × 1920 et certains
    // encodeurs matériels (carte graphique) produisent alors une vidéo vide
    var list = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.4D0028,mp4a.40.2', 'video/mp4;codecs=avc1.42E028,mp4a.40.2',
      'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
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
    ctx.fillText('@kapitaro.app', 138, 178);
    ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.font = "600 34px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('Plus de conseils simples sur @kapitaro.app', W / 2, 1575);
    ctx.textAlign = 'left';
  }

  // Chronologie : durée de chaque diapositive et dessin d'une image à l'instant t
  function timeline(slides) {
    var durs = slides.map(slideDuration);
    durs[durs.length - 1] += 0.6;
    var starts = [], acc = 0;
    durs.forEach(function (d) { starts.push(acc); acc += d; });
    return { durs: durs, starts: starts, total: acc };
  }
  function drawFrame(ctx, t, tl, imgs, logo) {
    var FADE = 0.4, i = 0;
    while (i < tl.starts.length - 1 && t >= tl.starts[i + 1]) i++;
    var local = t - tl.starts[i], p = Math.min(1, local / tl.durs[i]);
    drawBackground(ctx);
    if (i > 0 && local < FADE) { drawSlide(ctx, imgs[i - 1], 1 - local / FADE, 1); drawSlide(ctx, imgs[i], local / FADE, p); }
    else drawSlide(ctx, imgs[i], 1, p);
    drawChrome(ctx, logo, i, p, imgs.length);
  }

  // Vérifie que la vidéo produite est lisible (sinon message clair plutôt qu'un aperçu vide)
  function checkPlayable(blob) {
    return new Promise(function (ok) {
      var v = document.createElement('video'), u = URL.createObjectURL(blob), t = setTimeout(function () { done(false); }, 8000);
      function done(r) { clearTimeout(t); URL.revokeObjectURL(u); ok(r); }
      v.muted = true; v.preload = 'metadata';
      v.onloadedmetadata = function () { done(v.videoWidth > 0 && (v.duration > 1 || v.duration === Infinity)); };
      v.onerror = function () { done(false); };
      v.src = u;
    });
  }

  function loadScript(src) {
    return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { ko(new Error('Chargement impossible : ' + src)); }; document.head.appendChild(s); });
  }

  // ── Méthode principale : fabrication image par image (WebCodecs + assemblage MP4), plus rapide que le temps réel ──
  // Ne dépend ni de la carte graphique en direct, ni de l'onglet affiché. Vidéo H.264, son AAC (si le navigateur sait l'encoder).
  async function makeWebCodecs(imgs, logo, tl, opts) {
    if (!window.Mp4Muxer) await loadScript('https://cdn.jsdelivr.net/npm/mp4-muxer@5/build/mp4-muxer.min.js');
    var FPS = 30, base = { width: W, height: H, bitrate: 5000000, framerate: FPS };
    var vconf = null, codecs = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'], prefs = ['no-preference', 'prefer-software'];
    for (var a = 0; a < prefs.length && !vconf; a++) for (var c = 0; c < codecs.length && !vconf; c++) {
      var cfg = Object.assign({ codec: codecs[c], hardwareAcceleration: prefs[a], avc: { format: 'avc' } }, base);
      try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) vconf = cfg; } catch (e) {}
    }
    if (!vconf) throw new Error('Encodage H.264 indisponible dans ce navigateur');

    // Musique rendue hors temps réel, puis encodée en AAC
    var audio = null;
    if (opts.music !== false && window.AudioEncoder && window.OfflineAudioContext) {
      var aconf = { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 };
      try { if ((await AudioEncoder.isConfigSupported(aconf)).supported) audio = aconf; } catch (e) {}
      if (audio) {
        var off = new OfflineAudioContext(2, Math.ceil(tl.total * 44100), 44100);
        startMusic(off, off.destination, tl.total);
        audio.buffer = await off.startRendering();
      }
    }

    var target = new Mp4Muxer.ArrayBufferTarget();
    var muxer = new Mp4Muxer.Muxer({ target: target, fastStart: 'in-memory', firstTimestampBehavior: 'offset',
      video: { codec: 'avc', width: W, height: H, frameRate: FPS },
      audio: audio ? { codec: 'aac', numberOfChannels: 2, sampleRate: 44100 } : undefined });
    var failure = null;
    var venc = new VideoEncoder({ output: function (chunk, meta) { muxer.addVideoChunk(chunk, meta); }, error: function (e) { failure = e; } });
    venc.configure(vconf);

    var canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var frames = Math.ceil(tl.total * FPS);
    for (var i = 0; i < frames; i++) {
      if (failure) throw failure;
      drawFrame(ctx, i / FPS, tl, imgs, logo);
      var vf = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 });
      vf.close();
      if (opts.onProgress && i % 10 === 0) opts.onProgress(i / frames * 0.95);
      while (venc.encodeQueueSize > 8) await new Promise(function (r) { setTimeout(r, 5); });   // laisse l'encodeur suivre
    }
    await venc.flush(); venc.close();
    if (failure) throw failure;

    if (audio) {
      var aenc = new AudioEncoder({ output: function (chunk, meta) { muxer.addAudioChunk(chunk, meta); }, error: function (e) { failure = e; } });
      aenc.configure({ codec: audio.codec, sampleRate: 44100, numberOfChannels: 2, bitrate: audio.bitrate });
      var buf = audio.buffer, L = buf.getChannelData(0), R = buf.getChannelData(1), STEP = 4410;
      for (var s = 0; s < buf.length; s += STEP) {
        var n = Math.min(STEP, buf.length - s), data = new Float32Array(n * 2);
        data.set(L.subarray(s, s + n), 0); data.set(R.subarray(s, s + n), n);
        var ad = new AudioData({ format: 'f32-planar', sampleRate: 44100, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(s / 44100 * 1e6), data: data });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush(); aenc.close();
      if (failure) throw failure;
    }
    muxer.finalize();
    if (opts.onProgress) opts.onProgress(1);
    return new Blob([target.buffer], { type: 'video/mp4' });
  }

  // ── Méthode de secours : enregistrement en temps réel (MediaRecorder) si WebCodecs est absent ──
  async function makeRecorder(imgs, logo, tl, opts) {
    var mime = pickMime();
    if (!mime) throw new Error('Ce navigateur ne sait pas créer de vidéo. Utilise Chrome ou Edge à jour.');
    var canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var stream = canvas.captureStream(30);
    var actx = new (window.AudioContext || window.webkitAudioContext)();
    await actx.resume();
    var adest = actx.createMediaStreamDestination();
    if (opts.music !== false) startMusic(actx, adest, tl.total);
    adest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
    var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5000000, audioBitsPerSecond: 128000 });
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    var done = new Promise(function (ok) { rec.onstop = ok; });
    var aborted = null;
    var onHide = function () { if (document.hidden) aborted = 'Enregistrement interrompu : garde l\'onglet affiché pendant la création de la vidéo.'; };
    document.addEventListener('visibilitychange', onHide);
    drawFrame(ctx, 0, tl, imgs, logo);
    rec.start(250);
    var t0 = performance.now();
    await new Promise(function (resolve) {
      (function frame() {
        var t = (performance.now() - t0) / 1000;
        if (aborted || t >= tl.total) { resolve(); return; }
        drawFrame(ctx, t, tl, imgs, logo);
        if (opts.onProgress) opts.onProgress(Math.min(1, t / tl.total));
        setTimeout(frame, 1000 / 30);
      })();
    });
    rec.stop(); await done;
    document.removeEventListener('visibilitychange', onHide);
    stream.getTracks().forEach(function (t) { t.stop(); });
    actx.close();
    if (aborted) throw new Error(aborted);
    return new Blob(chunks, { type: mime.split(';')[0] });
  }

  // images : adresses (data: ou https) des diapositives déjà rendues ; slides : contenu (pour les durées)
  async function make(images, slides, opts) {
    opts = opts || {};
    var imgs = await Promise.all(images.map(loadImage));
    var logo = await loadImage('/icons/kapitaro-tile.svg').catch(function () { return null; });
    var tl = timeline(slides), blob = null, method = '', firstError = null;
    if (window.VideoEncoder && window.VideoFrame) {
      try { blob = await makeWebCodecs(imgs, logo, tl, opts); method = 'webcodecs'; }
      catch (e) { firstError = e; console.warn('[vidéo] WebCodecs :', e && e.message); blob = null; }
      if (blob && !(await checkPlayable(blob))) { firstError = new Error('vidéo WebCodecs illisible'); blob = null; }
    }
    if (!blob) { blob = await makeRecorder(imgs, logo, tl, opts); method = 'recorder'; }
    if (!(await checkPlayable(blob))) {
      throw new Error('La vidéo créée est illisible (' + (blob.size / 1e6).toFixed(1).replace('.', ',') + ' Mo, ' + method + (firstError ? ', ' + firstError.message : '') + '). Envoie ce message à Claude avec ta version de Chrome.');
    }
    return { blob: blob, mp4: blob.type === 'video/mp4', seconds: Math.round(tl.total), size: blob.size, method: method };
  }

  window.KapitaroVideo = { make: make, W: W, H: H };
})();
