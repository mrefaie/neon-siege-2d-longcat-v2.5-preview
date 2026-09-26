(function () {
  var C = NS.C;

  function baseEnemy(type, x, y, opts) {
    var def = NS.ENEMY_DEFS[type];
    opts = opts || {};
    var hpMult = opts.hpMult || 1;
    return {
      kind: 'enemy',
      type: type,
      x: x, y: y,
      vx: 0, vy: 0,
      r: def.r,
      hp: Math.max(1, Math.round(def.hp * hpMult)),
      maxHp: Math.max(1, Math.round(def.hp * hpMult)),
      score: def.score,
      color: def.color,
      t: 0,
      fireCd: 1 + Math.random() * 1.5,
      arrive: opts.arrive != null ? opts.arrive : 1.0,
      arrived: false,
      flash: 0,
      seed: Math.random() * 1000,
      boss: false,
      phase: 0,
      phaseT: 0,
      spawnCd: 3,
      params: opts.params || {},
      dead: false,
    };
  }

  function updateEnemy(e, dt, W) {
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (!e.arrived) {
      e.arrive -= dt;
      if (e.arrive <= 0) e.arrived = true;
      return;
    }
    var slow = NS.powerups.slowFactorFor(W, e);
    var sdt = dt * slow;
    switch (e.type) {
      case 'grunt': grunt(e, sdt, W); break;
      case 'swooper': swooper(e, sdt, W); break;
      case 'swarmer': swarmer(e, sdt, W); break;
      case 'armored': armored(e, sdt, W); break;
      case 'sniper': sniper(e, sdt, W); break;
      case 'carrier': carrier(e, sdt, W); break;
      default: grunt(e, sdt, W);
    }
    e.x += e.vx * sdt;
    e.y += e.vy * sdt;
    if (e.x < e.r) { e.x = e.r; e.vx = Math.abs(e.vx); }
    if (e.x > C.W - e.r) { e.x = C.W - e.r; e.vx = -Math.abs(e.vx); }
    if (e.y > C.H + 40) { e.y = -30; }
  }

  function grunt(e, dt, W) {
    var p = e.params;
    if (!p.dir) { p.dir = e.seed % 2 < 1 ? 1 : -1; p.baseY = e.y; }
    var speed = (46 + W.wave.n * 3.2) * (p.speedMult || 1);
    e.vx = p.dir * speed;
    e.vy = 11;
    if (e.y > C.H * 0.55) e.vy = 5;
    e.fireCd -= dt;
    if (e.fireCd <= 0 && e.y > 0 && e.y < C.H * 0.7) {
      e.fireCd = Math.max(1.1, 2.9 - W.wave.n * 0.12) * (0.7 + Math.random() * 0.6);
      NS.game.enemyShoot(W, e.x, e.y + e.r, (Math.random() - 0.5) * 40, 200 + W.wave.n * 8);
    }
  }

  function swooper(e, dt, W) {
    var p = e.params;
    if (!p.diving) {
      e.vx = (p.dir || 1) * 130;
      e.vy = 60;
      if (e.t > 1.1 + (p.delay || 0)) p.diving = true;
    } else {
      var dx = W.player.x - e.x;
      e.vx += Math.sign(dx) * 260 * dt;
      e.vy = 240 + Math.sin(e.t * 6 + e.seed) * 60;
      e.vx = Math.max(-260, Math.min(260, e.vx));
    }
    e.fireCd -= dt;
    if (e.fireCd <= 0 && p.diving) {
      e.fireCd = 1.6;
      NS.game.enemyShoot(W, e.x, e.y + e.r, 0, 230);
    }
  }

  function swarmer(e, dt, W) {
    var dx = W.player.x - e.x;
    var dy = W.player.y - e.y;
    var d = Math.hypot(dx, dy) || 1;
    var wob = Math.sin(e.t * 5 + e.seed) * 90;
    var sp = 155 + W.wave.n * 3.5;
    e.vx = (dx / d) * sp + (-dy / d) * wob;
    e.vy = (dy / d) * sp + (dx / d) * wob;
    e.fireCd -= dt;
    if (e.fireCd <= 0 && e.y > 0 && e.y < C.H * 0.6) {
      e.fireCd = 2.4 + Math.random();
      NS.game.enemyShoot(W, e.x, e.y + e.r, (dx / d) * 120, 210);
    }
  }

  function armored(e, dt, W) {
    var p = e.params;
    if (!p.dir) p.dir = e.x < C.W / 2 ? 1 : -1;
    e.vx = p.dir * 34;
    e.vy = 10;
    e.fireCd -= dt;
    if (e.fireCd <= 0 && e.y > 0) {
      e.fireCd = 3.2;
      for (var i = -1; i <= 1; i++) NS.game.enemyShoot(W, e.x + i * 14, e.y + e.r, i * 60, 170);
    }
  }

  function sniper(e, dt, W) {
    var p = e.params;
    if (!p.anchorX) p.anchorX = e.x;
    e.vx = Math.sin(e.t * 0.7 + e.seed) * 60;
    e.vy = 0;
    e.fireCd -= dt;
    if (e.fireCd <= 0 && e.y > 0 && e.y < C.H * 0.5) {
      e.fireCd = Math.max(1.4, 2.8 - W.wave.n * 0.1);
      var dx = W.player.x - e.x;
      var dy = W.player.y - e.y;
      var d = Math.hypot(dx, dy) || 1;
      var lead = 0.35;
      var px = W.player.x + W.player.vx * lead;
      var py = W.player.y + W.player.vy * lead;
      var ax = px - e.x, ay = py - e.y;
      var ad = Math.hypot(ax, ay) || 1;
      var sp = 300 + W.wave.n * 10;
      NS.game.enemyShoot(W, e.x, e.y + e.r, (ax / ad) * sp, 0, (ay / ad) * sp);
      e.telegraph = 0.35;
    }
    if (e.telegraph > 0) e.telegraph -= dt;
  }

  function carrier(e, dt, W) {
    var p = e.params;
    if (!p.anchorX) p.anchorX = e.x;
    e.vx = Math.sin(e.t * 0.4 + e.seed) * 40;
    e.vy = 8;
    e.spawnCd -= dt;
    if (e.spawnCd <= 0 && NS.game.countType(W, 'swarmer') < 14) {
      e.spawnCd = 3.4;
      for (var i = 0; i < 2; i++) {
        var m = baseEnemy('swarmer', e.x + (i === 0 ? -18 : 18), e.y + 10, { arrive: 0.5, hpMult: W.hpMult() });
        m.arrived = true;
        W.enemies.push(m);
        NS.game.puff(W, e.x, e.y + 10, '#5dffb0', 6);
      }
    }
    e.fireCd -= dt;
    if (e.fireCd <= 0 && e.y > 0) {
      e.fireCd = 4;
      for (var a = 0; a < 8; a++) {
        var ang = (a / 8) * Math.PI * 2 + e.t;
        NS.game.enemyShoot(W, e.x, e.y, Math.cos(ang) * 130, Math.sin(ang) * 130);
      }
    }
  }

  function updateBoss(e, dt, W) {
    if (!e.arrived) {
      e.arrive -= dt;
      e.y += (150 - e.y) * Math.min(1, dt * 1.6);
      if (e.arrive <= 0) { e.arrived = true; e.y = 150; }
      return;
    }
    var p = e.params;
    var remix = p.remix;
    var hpPct = e.hp / e.maxHp;
    var newPhase = hpPct > 0.66 ? 1 : hpPct > 0.33 ? 2 : 3;
    if (newPhase !== e.phase) {
      e.phase = newPhase;
      e.phaseT = 0;
      e.telegraph = 1.0;
      NS.game.puff(W, e.x, e.y, '#ff2d78', 24, 260);
      NS.audio.play('bossAlarm');
      if (W.onBossPhase) W.onBossPhase(e);
      return;
    }
    if (e.telegraph > 0) { e.telegraph -= dt; return; }
    e.phaseT += dt;
    var slow = NS.powerups.slowFactorFor(W, e);
    var sdt = dt * slow;
    var enrage = remix ? 1.35 : 1;
    if (e.bossType === 'sentinel') sentinel(e, sdt, W, enrage);
    else if (e.bossType === 'hivemother') hivemother(e, sdt, W, enrage);
    else stalker(e, sdt, W, enrage);
    e.x += e.vx * sdt;
    e.y += e.vy * sdt;
    if (e.x < e.r) { e.x = e.r; if (e.params.dir) e.params.dir = 1; }
    if (e.x > C.W - e.r) { e.x = C.W - e.r; if (e.params.dir) e.params.dir = -1; }
    if (e.y < 60) { e.y = 60; e.vy = Math.abs(e.vy); }
    if (e.y > C.H * 0.62) { e.y = C.H * 0.62; e.vy = -Math.abs(e.vy); }
  }

  function sentinel(e, dt, W, enrage) {
    var p = e.params;
    if (!p.dir) p.dir = 1;
    var sp = (e.phase === 3 ? 130 : 80) * enrage;
    e.vx = p.dir * sp;
    e.vy = Math.sin(e.t * 1.4) * 26;
    e.fireCd -= dt;
    if (e.fireCd <= 0) {
      if (e.phase === 1) {
        e.fireCd = 2.4 / enrage;
        for (var i = 0; i < 10; i++) {
          var a = (i / 10) * Math.PI * 2 + e.t;
          NS.game.enemyShoot(W, e.x, e.y + 20, Math.cos(a) * 150, Math.sin(a) * 150);
        }
      } else if (e.phase === 2) {
        e.fireCd = 1.7 / enrage;
        for (var b = -1; b <= 1; b++) {
          var dx = W.player.x - e.x, dy = W.player.y - e.y;
          var d = Math.hypot(dx, dy) || 1;
          var base = Math.atan2(dy, dx) + b * 0.14;
          NS.game.enemyShoot(W, e.x, e.y + 20, Math.cos(base) * 260, Math.sin(base) * 260);
        }
        if (NS.game.countType(W, 'swarmer') < 6 && Math.random() < 0.4) {
          for (var s = 0; s < 2; s++) {
            var m = baseEnemy('swarmer', e.x + (s === 0 ? -30 : 30), e.y + 20, { arrive: 0.4, hpMult: W.hpMult() });
            m.arrived = true;
            W.enemies.push(m);
          }
        }
      } else {
        e.fireCd = 0.55 / enrage;
        var a2 = e.t * 3.2;
        NS.game.enemyShoot(W, e.x, e.y + 20, Math.cos(a2) * 190, Math.sin(a2) * 190);
        NS.game.enemyShoot(W, e.x, e.y + 20, Math.cos(a2 + Math.PI) * 190, Math.sin(a2 + Math.PI) * 190);
      }
    }
  }

  function hivemother(e, dt, W, enrage) {
    var p = e.params;
    if (!p.anchorX) p.anchorX = e.x;
    e.vx = Math.sin(e.t * 0.5) * 55;
    e.vy = e.phase === 3 ? Math.sin(e.t * 0.9) * 40 : 6;
    e.fireCd -= dt;
    e.spawnCd -= dt;
    if (e.spawnCd <= 0) {
      e.spawnCd = (e.phase === 3 ? 2.2 : 3.2) / enrage;
      if (NS.game.countType(W, 'swarmer') < 12) {
        for (var s = 0; s < 3; s++) {
          var m = baseEnemy('swarmer', e.x + (s - 1) * 22, e.y + 24, { arrive: 0.4, hpMult: W.hpMult() });
          m.arrived = true;
          W.enemies.push(m);
          NS.game.puff(W, e.x, e.y + 24, '#5dffb0', 4);
        }
      }
    }
    if (e.fireCd <= 0) {
      if (e.phase === 1) {
        e.fireCd = 3.4 / enrage;
        for (var i = 0; i < 8; i++) {
          var a = (i / 8) * Math.PI * 2 + e.t * 0.4;
          NS.game.enemyShoot(W, e.x, e.y, Math.cos(a) * 130, Math.sin(a) * 130);
        }
      } else if (e.phase === 2) {
        e.fireCd = 2.2 / enrage;
        for (var r = 0; r < 14; r++) {
          var a2 = (r / 14) * Math.PI * 2 + e.t;
          NS.game.enemyShoot(W, e.x, e.y, Math.cos(a2) * 165, Math.sin(a2) * 165);
        }
      } else {
        e.fireCd = 1.5 / enrage;
        for (var r2 = 0; r2 < 16; r2++) {
          var a3 = (r2 / 16) * Math.PI * 2 - e.t * 1.4;
          NS.game.enemyShoot(W, e.x, e.y, Math.cos(a3) * 185, Math.sin(a3) * 185);
        }
        if (Math.random() < 0.25 && NS.game.countType(W, 'carrier') < 2) {
          var c = baseEnemy('carrier', e.x, e.y + 30, { arrive: 0.6, hpMult: W.hpMult() });
          c.arrived = true;
          W.enemies.push(c);
        }
      }
    }
  }

  function stalker(e, dt, W, enrage) {
    var p = e.params;
    if (!p.dir) p.dir = 1;
    if (e.phase >= 2 && !p.dashing && e.phaseT > 1.2 && Math.random() < dt * 0.5 * enrage) {
      p.dashing = true;
      p.dashT = 0.55;
      e.telegraph = 0.4;
      NS.audio.play('bossAlarm');
    }
    if (p.dashing) {
      p.dashT -= dt;
      var dx = W.player.x - e.x, dy = (W.player.y - 60) - e.y;
      var d = Math.hypot(dx, dy) || 1;
      e.vx = (dx / d) * 420;
      e.vy = (dy / d) * 420;
      if (p.dashT <= 0) { p.dashing = false; e.phaseT = 0; }
    } else {
      e.vx = p.dir * (e.phase === 3 ? 150 : 100) * enrage;
      e.vy = Math.sin(e.t * 1.1) * 20;
    }
    e.fireCd -= dt;
    if (e.fireCd <= 0 && !p.dashing) {
      if (e.phase === 1) {
        e.fireCd = 2.0 / enrage;
        var dx2 = W.player.x - e.x, dy2 = W.player.y - e.y;
        var d2 = Math.hypot(dx2, dy2) || 1;
        NS.game.enemyShoot(W, e.x, e.y + 20, (dx2 / d2) * 300, (dy2 / d2) * 300);
        e.telegraph = 0.3;
      } else if (e.phase === 2) {
        e.fireCd = 1.3 / enrage;
        for (var b = -2; b <= 2; b++) {
          var dx3 = W.player.x - e.x, dy3 = W.player.y - e.y;
          var d3 = Math.hypot(dx3, dy3) || 1;
          var base = Math.atan2(dy3, dx3) + b * 0.1;
          NS.game.enemyShoot(W, e.x, e.y + 20, Math.cos(base) * 280, Math.sin(base) * 280);
        }
        if (Math.random() < 0.3 && NS.game.countType(W, 'grunt') < 6) {
          for (var g = 0; g < 2; g++) {
            var m = baseEnemy('grunt', e.x + (g === 0 ? -40 : 40), e.y + 20, { arrive: 0.5, hpMult: W.hpMult() });
            m.arrived = true;
            W.enemies.push(m);
          }
        }
      } else {
        e.fireCd = 0.8 / enrage;
        var dx4 = W.player.x - e.x, dy4 = W.player.y - e.y;
        var d4 = Math.hypot(dx4, dy4) || 1;
        NS.game.enemyShoot(W, e.x, e.y + 20, (dx4 / d4) * 330, (dy4 / d4) * 330);
        NS.game.enemyShoot(W, e.x, e.y + 20, (dx4 / d4) * 330 + 40, (dy4 / d4) * 330);
      }
    }
  }

  NS.ent = {
    enemy: baseEnemy,
    updateEnemy: updateEnemy,
    updateBoss: updateBoss,
    bullet: function (x, y, vx, vy, opts) {
      opts = opts || {};
      return { kind: 'bullet', x: x, y: y, vx: vx, vy: vy, r: opts.r || 4, pierce: opts.pierce || 0, ricochet: opts.ricochet || 0, life: opts.life || 2.2, color: opts.color || '#7df9ff', dead: false, trail: [] };
    },
    enemyBullet: function (x, y, vx, vy) {
      return { kind: 'ebullet', x: x, y: y, vx: vx, vy: vy, r: 5, color: '#ff4d6d', dead: false, t: 0 };
    },
    pickup: function (x, y, family, variant) {
      return { kind: 'pickup', x: x, y: y, vy: 62, r: 13, family: family, variant: variant, t: 0, dead: false };
    },
    particle: function (x, y, vx, vy, life, color, size) {
      return { kind: 'particle', x: x, y: y, vx: vx, vy: vy, life: life, maxLife: life, color: color, size: size || 2, dead: false };
    },
    drone: function (x, y, variant) {
      return { kind: 'drone', x: x, y: y, variant: variant, t: Math.random() * 6, fireCd: 0, dead: false };
    },
    floater: function (x, y, text, color) {
      return { kind: 'floater', x: x, y: y, text: text, color: color || '#fff', life: 1.1, dead: false };
    },
  };
})();
