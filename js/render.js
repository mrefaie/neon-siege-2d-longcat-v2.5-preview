(function () {
  var C = NS.C;
  var stars = null;
  var canvas, ctx, scale = 1, dpr = 1;

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    stars = [];
    for (var i = 0; i < 130; i++) {
      var layer = i % 3;
      stars.push({
        x: Math.random() * C.W,
        y: Math.random() * C.H,
        sp: [14, 34, 70][layer],
        size: [1, 1.6, 2.4][layer],
        tw: Math.random() * 6,
      });
    }
    resize();
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var ww = window.innerWidth, wh = window.innerHeight;
    var s = Math.min(ww / C.W, wh / C.H);
    canvas.style.width = (C.W * s) + 'px';
    canvas.style.height = (C.H * s) + 'px';
    canvas.width = Math.round(C.W * s * dpr);
    canvas.height = Math.round(C.H * s * dpr);
    scale = s * dpr;
  }

  function neon(color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }
  function noNeon() { ctx.shadowBlur = 0; }

  function drawBackground(W, dt) {
    var g = ctx.createLinearGradient(0, 0, 0, C.H);
    g.addColorStop(0, '#050018');
    g.addColorStop(0.6, '#0a0430');
    g.addColorStop(1, '#12042e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.W, C.H);
    var t = W ? W.time : 0;
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      st.y += st.sp * dt;
      if (st.y > C.H) { st.y = -2; st.x = Math.random() * C.W; }
      var a = 0.35 + 0.3 * Math.sin(t * 2 + st.tw);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#9fd8ff';
      ctx.fillRect(st.x, st.y, st.size, st.size);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(120,60,220,0.10)';
    ctx.lineWidth = 1;
    for (var gy = 0; gy < 6; gy++) {
      var yy = C.H - 40 - gy * 34 - ((t * 12) % 34);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(C.W, yy);
      ctx.stroke();
    }
  }

  function drawPlayer(W) {
    var p = W.player;
    if (!p.alive) return;
    if (p.invuln > 0 && Math.floor(W.time * 14) % 2 === 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    neon('#7df9ff', 14);
    ctx.fillStyle = '#7df9ff';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(13, 12);
    ctx.lineTo(5, 7);
    ctx.lineTo(-5, 7);
    ctx.lineTo(-13, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8ffff';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    if (p.muzzle > 0) {
      neon('#ffffff', 10);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -24, 4, 8);
    }
    noNeon();
    var aegis = W.powerups.aegis;
    if (aegis) {
      ctx.strokeStyle = aegis.variant === 1 ? '#ffd24c' : 'rgba(255,210,76,0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(W.time * 5) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemy(e, time) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (!e.arrived) {
      var k = 1 - e.arrive / (e.boss ? 2.2 : 1.0);
      ctx.globalAlpha = 0.25 + k * 0.6;
      ctx.scale(0.4 + k * 0.6, 0.4 + k * 0.6);
      neon(e.color, 18);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(-e.r, -e.r, e.r * 2, e.r * 2);
      ctx.restore();
      return;
    }
    var frozen = e.frozen > 0;
    var col = frozen ? '#9fe8ff' : e.color;
    neon(col, 12);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    var r = e.r;
    if (e.boss) { drawBoss(e, time); noNeon(); }
    else switch (e.type) {
      case 'grunt':
        ctx.beginPath();
        ctx.moveTo(-r, -r * 0.4);
        ctx.lineTo(r, -r * 0.4);
        ctx.lineTo(r * 0.7, r * 0.7);
        ctx.lineTo(-r * 0.7, r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-r * 0.5, -r, r * 0.4, r * 0.5);
        ctx.fillRect(r * 0.5 - r * 0.4, -r, r * 0.4, r * 0.5);
        break;
      case 'swooper':
        ctx.beginPath();
        ctx.moveTo(0, r);
        ctx.lineTo(-r, -r * 0.6);
        ctx.lineTo(0, -r * 0.2);
        ctx.lineTo(r, -r * 0.6);
        ctx.closePath();
        ctx.fill();
        break;
      case 'swarmer':
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
          var a = (i / 6) * Math.PI * 2 + time * 3;
          var px = Math.cos(a) * r, py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case 'armored':
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.fillStyle = '#0a0430';
        ctx.fillRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
        ctx.fillStyle = e.flash > 0 ? '#fff' : col;
        ctx.fillRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6);
        break;
      case 'sniper':
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.8, r * 0.8);
        ctx.lineTo(-r * 0.8, r * 0.8);
        ctx.closePath();
        ctx.fill();
        if (e.telegraph > 0) {
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 30);
          ctx.beginPath();
          ctx.moveTo(0, r);
          ctx.lineTo(0, r + 26);
          ctx.stroke();
        }
        break;
      case 'carrier':
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0430';
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.55, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'boss':
        drawBoss(e, time);
        break;
      default:
        ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    noNeon();
    if (e.boss) {
      ctx.fillStyle = 'rgba(255,45,120,0.9)';
      ctx.fillRect(-e.r, -e.r - 14, e.r * 2, 5);
      ctx.fillStyle = '#ffd24c';
      ctx.fillRect(-e.r, -e.r - 14, e.r * 2 * Math.max(0, e.hp / e.maxHp), 5);
    } else if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-e.r, -e.r - 9, e.r * 2, 3);
      ctx.fillStyle = col;
      ctx.fillRect(-e.r, -e.r - 9, e.r * 2 * Math.max(0, e.hp / e.maxHp), 3);
    }
    ctx.restore();
  }

  function drawBoss(e, time) {
    var r = e.r;
    var pulse = 1 + Math.sin(time * 4) * 0.04;
    ctx.scale(pulse, pulse);
    if (e.bossType === 'sentinel') {
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = (i / 8) * Math.PI * 2 + time * 0.5;
        var px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0a0430';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = e.flash > 0 ? '#fff' : e.color;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.bossType === 'hivemother') {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.1, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      for (var i = 0; i < 6; i++) {
        var a2 = (i / 6) * Math.PI * 2 + time;
        ctx.beginPath();
        ctx.arc(Math.cos(a2) * r * 0.7, Math.sin(a2) * r * 0.5, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(0, r);
      ctx.lineTo(r, -r * 0.3);
      ctx.lineTo(r * 0.4, -r);
      ctx.lineTo(-r * 0.4, -r);
      ctx.lineTo(-r, -r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0a0430';
      ctx.fillRect(-r * 0.5, -r * 0.4, r, r * 0.5);
    }
  }

  function drawPickup(k, time) {
    var info = NS.FAMILY_INFO[k.family];
    ctx.save();
    ctx.translate(k.x, k.y);
    var bob = Math.sin(time * 4 + k.t) * 2;
    ctx.translate(0, bob);
    neon(info.color, 12);
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 2;
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = info.color;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.icon + (k.variant + 1), 0, 1);
    noNeon();
    ctx.restore();
  }

  function drawHUD(W) {
    ctx.save();
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    neon('#7df9ff', 6);
    ctx.fillStyle = '#7df9ff';
    ctx.fillText('SCORE ' + W.score, 14, 10);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5df2';
    ctx.fillText('WAVE ' + Math.max(1, W.wave.n), C.W / 2, 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#39ff6a';
    ctx.fillText('KILLS ' + W.kills, C.W - 14, 10);
    noNeon();
    for (var i = 0; i < W.player.maxHp; i++) {
      ctx.fillStyle = i < W.player.hp ? '#ff4d6d' : 'rgba(255,77,109,0.2)';
      ctx.fillRect(16 + i * 20, 34, 14, 10);
    }
    var c = W.combo;
    if (c.mult > 1) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#ffe74c';
      neon('#ffe74c', 6);
      ctx.fillText('COMBO x' + c.mult.toFixed(2).replace(/\.?0+$/, ''), 14, 52);
      noNeon();
      ctx.fillStyle = 'rgba(255,231,76,0.4)';
      ctx.fillRect(14, 72, 90 * (c.timer / C.COMBO_WINDOW), 3);
    }
    var dashPct = 1 - W.player.dashCd / C.PLAYER.dashCd;
    ctx.textAlign = 'right';
    ctx.font = '11px monospace';
    ctx.fillStyle = dashPct >= 1 ? '#7df9ff' : 'rgba(125,249,255,0.4)';
    ctx.fillText(dashPct >= 1 ? 'DASH READY' : 'DASH ' + Math.round(dashPct * 100) + '%', C.W - 14, 30);
    var py = 92;
    NS.FAMILIES.forEach(function (f) {
      var p = W.powerups[f];
      if (!p) return;
      var info = NS.FAMILY_INFO[f];
      var label = NS.powerupInfo(f, p.variant).name;
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = info.color;
      var txt = info.icon + ' ' + label;
      if (p.family === 'aegis') txt += ' [' + p.charges + ']';
      else txt += ' ' + Math.ceil(p.duration) + 's';
      ctx.fillText(txt, 14, py);
      if (p.family !== 'aegis') {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(14, py + 14, 110, 3);
        ctx.fillStyle = info.color;
        ctx.fillRect(14, py + 14, 110 * Math.max(0, p.duration / p.maxDuration), 3);
      }
      py += 24;
    });
    if (W.wave.phase === 'breather' && W.wave.n > 0) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#ffd24c';
      neon('#ffd24c', 8);
      ctx.fillText('WAVE ' + (W.wave.n + 1) + ' INCOMING', C.W / 2, C.H / 2 + 30);
      noNeon();
    }
    ctx.restore();
  }

  function render(W, dt) {
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    var shx = 0, shy = 0;
    if (W && W.shake > 0.2 && NS.store.getSettings().screenShake) {
      shx = (Math.random() - 0.5) * W.shake;
      shy = (Math.random() - 0.5) * W.shake;
    }
    ctx.save();
    ctx.translate(shx, shy);
    drawBackground(W, dt);
    if (W) {
      var i;
      for (i = 0; i < W.wells.length; i++) {
        var wl = W.wells[i];
        ctx.globalAlpha = Math.max(0, wl.life / wl.maxLife) * 0.5;
        ctx.strokeStyle = '#b28dff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wl.x, wl.y, wl.r * (0.4 + 0.6 * (1 - wl.life / wl.maxLife)), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < W.novas.length; i++) {
        var nv = W.novas[i];
        neon('#b28dff', 16);
        ctx.strokeStyle = '#b28dff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(nv.x, nv.y, nv.r, 0, Math.PI * 2);
        ctx.stroke();
        noNeon();
      }
      for (i = 0; i < W.lightning.length; i++) {
        var L = W.lightning[i];
        ctx.globalAlpha = L.life / L.maxLife;
        neon('#c6ff4c', 10);
        ctx.strokeStyle = '#eaffb0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(L.x1, L.y1);
        var segs = 4;
        for (var s2 = 1; s2 <= segs; s2++) {
          var tt = s2 / segs;
          var mx = L.x1 + (L.x2 - L.x1) * tt + (s2 < segs ? (Math.random() - 0.5) * 18 : 0);
          var my = L.y1 + (L.y2 - L.y1) * tt + (s2 < segs ? (Math.random() - 0.5) * 18 : 0);
          ctx.lineTo(mx, my);
        }
        ctx.stroke();
        noNeon();
        ctx.globalAlpha = 1;
      }
      for (i = 0; i < W.pickups.length; i++) drawPickup(W.pickups[i], W.time);
      for (i = 0; i < W.drones.length; i++) {
        var d = W.drones[i];
        neon('#4cd7ff', 8);
        ctx.fillStyle = '#4cd7ff';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
        ctx.fill();
        noNeon();
      }
      for (i = 0; i < W.bullets.length; i++) {
        var b = W.bullets[i];
        neon(b.color, 8);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var t2 = 0; t2 < b.trail.length; t2++) {
          var tp = b.trail[t2];
          if (t2 === 0) ctx.moveTo(tp.x, tp.y); else ctx.lineTo(tp.x, tp.y);
        }
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        noNeon();
      }
      for (i = 0; i < W.ebullets.length; i++) {
        var eb = W.ebullets[i];
        neon(eb.color, 8);
        ctx.fillStyle = eb.color;
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        noNeon();
      }
      for (i = 0; i < W.enemies.length; i++) drawEnemy(W.enemies[i], W.time);
      drawPlayer(W);
      for (i = 0; i < W.particles.length; i++) {
        var pt = W.particles[i];
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      }
      ctx.globalAlpha = 1;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      for (i = 0; i < W.floaters.length; i++) {
        var f = W.floaters[i];
        ctx.globalAlpha = Math.min(1, f.life);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
      drawHUD(W);
    }
    ctx.restore();
  }

  NS.render = { init: init, resize: resize, render: render };
})();
