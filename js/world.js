(function () {
  var C = NS.C;
  var nextId = 1;

  function newRun() {
    var W = {
      state: 'playing',
      time: 0,
      runTime: 0,
      player: {
        x: C.PLAYER.startX, y: C.PLAYER.startY, vx: 0, vy: 0,
        r: C.PLAYER.r,
        hp: C.PLAYER.hp, maxHp: C.PLAYER.hp,
        fireCd: 0, dashCd: 0, dashTime: 0, dashDir: 0,
        invuln: 0, alive: true, muzzle: 0,
      },
      bullets: [], ebullets: [], enemies: [], pickups: [],
      particles: [], drones: [], floaters: [], wells: [], novas: [], lightning: [],
      powerups: { prism: null, drone: null, chrono: null, aegis: null, singularity: null },
      wave: { n: 0, phase: 'breather', timer: 1.2, pending: [], spawnedAll: false, lastPattern: null, lastBoss: null },
      score: 0, kills: 0,
      combo: { mult: 1, timer: 0, killStreak: 0, streakTimer: 0 },
      shake: 0,
      stats: { shotsFired: 0, dashes: 0, powerupsTaken: 0, maxCombo: 1 },
      events: [],
      onBossPhase: function (e) {
        emit(W, 'bossPhase', { bossType: e.bossType, phase: e.phase });
      },
    };
    NS.world = W;
    return W;
  }

  function emit(W, name, data) { W.events.push({ name: name, data: data }); }

  function countType(W, type) {
    var n = 0;
    for (var i = 0; i < W.enemies.length; i++) if (W.enemies[i].type === type && !W.enemies[i].dead) n++;
    return n;
  }

  function enemyShoot(W, x, y, vx, vy, vy2) {
    if (W.ebullets.length >= C.ENEMY_BULLET_CAP) return;
    var b = NS.ent.enemyBullet(x, y, vx, vy2 != null ? vy2 : vy);
    W.ebullets.push(b);
    emit(W, 'eshoot', { x: x, y: y });
  }

  function puff(W, x, y, color, count, spread) {
    spread = spread || 160;
    for (var i = 0; i < count; i++) {
      if (W.particles.length >= C.PARTICLE_CAP) return;
      var a = Math.random() * Math.PI * 2;
      var sp = Math.random() * spread;
      W.particles.push(NS.ent.particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.4 + Math.random() * 0.5, color, 1.5 + Math.random() * 2.5));
    }
  }

  function hpMult(W) { return 1 + (W.wave.n - 1) * 0.14; }

  function spawnEnemy(W, e) {
    e._id = nextId++;
    if (e.type === 'boss') {
      e.boss = true;
      e.r = 44;
      e.maxHp = Math.round(120 * (e.params.hpMult || 1));
      e.hp = e.maxHp;
      e.score = 5000;
      e.color = '#ff2d78';
      e.arrived = false;
      NS.audio.play('bossAlarm');
      emit(W, 'bossSpawn', { bossType: e.bossType });
    }
    W.enemies.push(e);
  }

  function startWave(W, n) {
    var plan = NS.waves.build(n, W.wave.lastPattern);
    W.wave.n = n;
    W.wave.phase = 'spawning';
    W.wave.timer = 0;
    W.wave.pending = plan.entries.slice();
    W.wave.spawnedAll = false;
    if (plan.isBoss) { W.wave.lastBoss = plan.bossType; emit(W, 'bossWave', { n: n }); NS.audio.music('boss'); }
    else { W.wave.lastPattern = plan.pattern || null; NS.audio.music('game'); }
    emit(W, 'waveStart', { n: n, isBoss: plan.isBoss });
  }

  function updateWave(W, dt) {
    var wv = W.wave;
    if (wv.phase === 'breather') {
      wv.timer -= dt;
      W.combo.timer = Math.min(W.combo.timer, C.COMBO_WINDOW);
      if (wv.timer <= 0) startWave(W, wv.n + 1);
      return;
    }
    if (wv.phase === 'spawning') {
      wv.timer += dt;
      while (wv.pending.length && wv.pending[0].delay <= wv.timer) {
        var s = wv.pending.shift();
        spawnEnemy(W, NS.ent.enemy(s.type === 'boss' ? 'grunt' : s.type, s.x, s.y, {
          arrive: s.arrive, hpMult: (s.params && s.params.hpMult) || hpMult(W), params: s.params,
        }));
        if (s.type === 'boss') {
          var be = W.enemies[W.enemies.length - 1];
          be.boss = true;
          be.bossType = s.bossType;
          be.params.remix = s.params.remix;
          be.maxHp = Math.round(120 * (s.params.hpMult || 1));
          be.hp = be.maxHp;
          be.score = 5000;
          be.r = 44;
          be.color = '#ff2d78';
        }
      }
      if (!wv.pending.length) wv.phase = 'active';
      return;
    }
    if (wv.phase === 'active') {
      var alive = false;
      for (var i = 0; i < W.enemies.length; i++) if (!W.enemies[i].dead) { alive = true; break; }
      if (!alive) {
        var bonus = C.WAVE_CLEAR_BONUS * wv.n;
        W.score += bonus;
        W.floaters.push(NS.ent.floater(C.W / 2, C.H / 2 - 40, 'WAVE ' + wv.n + ' CLEAR  +' + bonus, '#ffd24c'));
        emit(W, 'waveClear', { n: wv.n, bonus: bonus });
        NS.audio.play('waveClear');
        wv.phase = 'breather';
        wv.timer = C.BREATHER;
      }
    }
  }

  function firePlayer(W) {
    var p = W.player;
    var prism = W.powerups.prism;
    var chrono = W.powerups.chrono;
    var speed = C.PLAYER.bulletSpeed;
    function mk(vx, vy, opts) {
      if (W.bullets.length >= C.BULLET_CAP) return;
      W.bullets.push(NS.ent.bullet(p.x, p.y - 18, vx, vy, opts));
    }
    if (prism && prism.variant === 0) {
      var n = Math.min(2 + Math.ceil(prism.strength), 5);
      var spread = 0.16;
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (i - (n - 1) / 2) * spread;
        mk(Math.cos(a) * speed, Math.sin(a) * speed, { color: '#ff5df2' });
      }
    } else if (prism && prism.variant === 1) {
      mk(0, -speed * 1.15, { pierce: 1 + Math.min(3, Math.floor(prism.strength)), color: '#ff5df2', r: 6, life: 2.6 });
    } else if (prism && prism.variant === 2) {
      mk(0, -speed, { ricochet: 1 + Math.min(4, Math.floor(prism.strength * 1.5)), color: '#ff5df2' });
    } else {
      mk(0, -speed, {});
    }
    p.muzzle = 0.06;
    W.stats.shotsFired++;
    emit(W, 'shoot', {});
  }

  function hurtPlayer(W, dmg, srcX) {
    var p = W.player;
    if (p.invuln > 0 || !p.alive) return;
    var aegis = W.powerups.aegis;
    if (aegis) {
      if (aegis.variant === 1) return;
      aegis.charges--;
      p.invuln = C.PLAYER.invuln;
      if (aegis.charges <= 0) {
        W.powerups.aegis = null;
        NS.audio.play('shieldBreak');
        if (aegis.variant === 2) {
          W.novas.push({ x: p.x, y: p.y, r: 10, maxR: 220, speed: 560, dmg: 6, aegis: true });
          puff(W, p.x, p.y, '#ffd24c', 30, 300);
        } else {
          puff(W, p.x, p.y, '#ffd24c', 14, 200);
        }
      } else {
        NS.audio.play('hit');
        puff(W, p.x, p.y, '#ffd24c', 8, 140);
      }
      return;
    }
    p.hp -= dmg;
    p.invuln = C.PLAYER.invuln;
    W.combo.mult = 1;
    W.combo.killStreak = 0;
    W.shake = Math.min(14, W.shake + 8);
    NS.audio.play('playerHit');
    puff(W, p.x, p.y, '#7df9ff', 16, 220);
    if (p.hp <= 0) {
      p.alive = false;
      puff(W, p.x, p.y, '#7df9ff', 40, 320);
      puff(W, p.x, p.y, '#ffffff', 20, 200);
      W.shake = 16;
      emit(W, 'playerDown', {});
    }
  }

  function updatePlayer(W, dt) {
    var p = W.player;
    if (!p.alive) return;
    var chrono = W.powerups.chrono;
    var overdrive = chrono && chrono.variant === 2;
    var speed = C.PLAYER.speed * (overdrive ? 1.35 : 1);
    var move = 0;
    if (NS.input.left()) move -= 1;
    if (NS.input.right()) move += 1;
    if (NS.input.touch.active) {
      var rect = document.getElementById('game').getBoundingClientRect();
      var scale = C.W / rect.width;
      var tx = (NS.input.touch.x - rect.left) * scale;
      var d = tx - p.x;
      if (Math.abs(d) > 12) move = Math.sign(d) * Math.min(1, Math.abs(d) / 90);
    }
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.vx = p.dashDir * C.PLAYER.dashSpeed;
      puff(W, p.x, p.y + 10, '#7df9ff', 2, 60);
    } else {
      p.vx = move * speed;
      if (NS.input.consumeDash() && p.dashCd <= 0) {
        p.dashCd = C.PLAYER.dashCd;
        p.dashTime = C.PLAYER.dashTime;
        p.dashDir = move !== 0 ? move : (p.dashDir || 1);
        p.invuln = Math.max(p.invuln, C.PLAYER.dashTime + 0.05);
        W.stats.dashes++;
        NS.audio.play('dash');
      }
    }
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.x += p.vx * dt;
    p.x = Math.max(p.r, Math.min(C.W - p.r, p.x));
    p.invuln = Math.max(0, p.invuln - dt);
    p.muzzle = Math.max(0, p.muzzle - dt);
    var fireCd = C.PLAYER.fireCd * (overdrive ? 0.55 : 1);
    p.fireCd -= dt;
    var firing = NS.input.fire() || NS.input.touch.active;
    if (firing && p.fireCd <= 0) {
      p.fireCd = fireCd;
      firePlayer(W);
    }
  }

  function updateBullets(W, dt) {
    var i, b;
    for (i = W.bullets.length - 1; i >= 0; i--) {
      b = W.bullets[i];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 6) b.trail.shift();
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.y < -30 || b.y > C.H + 30 || b.x < -30 || b.x > C.W + 30) {
        if (b.ricochet > 0 && b.life > 0) {
          var best = null, bd = 320;
          W.enemies.forEach(function (e) {
            if (e.dead) return;
            var d = Math.hypot(e.x - b.x, e.y - b.y);
            if (d < bd) { bd = d; best = e; }
          });
          if (best) {
            var dx = best.x - b.x, dy = best.y - b.y;
            var dd = Math.hypot(dx, dy) || 1;
            b.vx = (dx / dd) * C.PLAYER.bulletSpeed;
            b.vy = (dy / dd) * C.PLAYER.bulletSpeed;
            b.ricochet--;
            b.life = 1.6;
            W.lightning.push({ x1: b.x, y1: b.y, x2: best.x, y2: best.y, life: 0.12, maxLife: 0.12 });
            continue;
          }
        }
        W.bullets.splice(i, 1);
        continue;
      }
      for (var j = 0; j < W.enemies.length; j++) {
        var e = W.enemies[j];
        if (e.dead) continue;
        var rr = e.r + b.r;
        if (Math.abs(e.x - b.x) < rr && Math.abs(e.y - b.y) < rr) {
          NS.powerups.damageEnemy(W, e, 1, b.pierce > 0);
          if (b.ricochet > 0) {
            b.ricochet--;
            var bd2 = 320, best2 = null;
            W.enemies.forEach(function (o) {
              if (o.dead || o === e) return;
              var d = Math.hypot(o.x - b.x, o.y - b.y);
              if (d < bd2) { bd2 = d; best2 = o; }
            });
            if (best2) {
              var ddx = best2.x - b.x, ddy = best2.y - b.y;
              var ddd = Math.hypot(ddx, ddy) || 1;
              b.vx = (ddx / ddd) * C.PLAYER.bulletSpeed;
              b.vy = (ddy / ddd) * C.PLAYER.bulletSpeed;
              b.life = 1.6;
              W.lightning.push({ x1: b.x, y1: b.y, x2: best2.x, y2: best2.y, life: 0.12, maxLife: 0.12 });
              break;
            }
          }
          if (b.pierce > 0) { b.pierce--; } else { b.dead = true; }
          break;
        }
      }
      if (b.dead) W.bullets.splice(i, 1);
    }
    for (i = W.ebullets.length - 1; i >= 0; i--) {
      b = W.ebullets[i];
      b.t += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y > C.H + 20 || b.y < -30 || b.x < -30 || b.x > C.W + 30) { W.ebullets.splice(i, 1); continue; }
      var p = W.player;
      if (p.alive && !b.reflected) {
        var aegis = W.powerups.aegis;
        var pr = p.r + b.r;
        if (Math.abs(p.x - b.x) < pr && Math.abs(p.y - b.y) < pr) {
          if (aegis && aegis.variant === 1) {
            var spd = Math.hypot(b.vx, b.vy) || 1;
            b.vx = (-b.vx / spd) * 340;
            b.vy = (-b.vy / spd) * 340;
            b.reflected = true;
            b.color = '#ffd24c';
            NS.audio.play('hit');
            continue;
          }
          if (aegis) { hurtPlayer(W, 0, b.x); W.ebullets.splice(i, 1); continue; }
          hurtPlayer(W, 1, b.x);
          W.ebullets.splice(i, 1);
        }
      }
    }
    for (i = 0; i < W.ebullets.length; i++) {
      b = W.ebullets[i];
      if (!b.dead && b.reflected) {
        for (var j2 = 0; j2 < W.enemies.length; j2++) {
          var e2 = W.enemies[j2];
          if (e2.dead) continue;
          var rr2 = e2.r + b.r;
          if (Math.abs(e2.x - b.x) < rr2 && Math.abs(e2.y - b.y) < rr2) {
            NS.powerups.damageEnemy(W, e2, 2, false);
            b.dead = true;
            break;
          }
        }
        if (b.dead) { W.ebullets.splice(i, 1); i--; }
      }
    }
  }

  function updateEnemies(W, dt) {
    var p = W.player;
    for (var i = 0; i < W.enemies.length; i++) {
      var e = W.enemies[i];
      if (e.dead) continue;
      var slow = NS.powerups.slowFactorFor(W, e);
      if (e.boss) NS.ent.updateBoss ? NS.ent.updateBoss(e, dt, W) : NS.ent.updateEnemy(e, dt, W);
      else NS.ent.updateEnemy(e, dt, W);
      if (e.frozen > 0) {
        e.frozen -= dt;
        e.vx *= 0.1; e.vy *= 0.1;
      }
      if (e.y > C.H + 60) { e.y = -40; }
      if (e.arrived && p.alive) {
        var rr = e.r + p.r;
        if (Math.abs(e.x - p.x) < rr && Math.abs(e.y - p.y) < rr) {
          hurtPlayer(W, 1, e.x);
          if (!e.boss) { NS.powerups.damageEnemy(W, e, 3, false); }
        }
      }
    }
    W.enemies = W.enemies.filter(function (e) { return !e.dead; });
  }

  function updatePickups(W, dt) {
    var p = W.player;
    for (var i = W.pickups.length - 1; i >= 0; i--) {
      var k = W.pickups[i];
      k.t += dt;
      k.y += k.vy * dt;
      k.x += Math.sin(k.t * 2.4) * 18 * dt;
      if (k.y > C.H + 30) { W.pickups.splice(i, 1); continue; }
      if (p.alive) {
        var rr = p.r + k.r + 6;
        if (Math.abs(p.x - k.x) < rr && Math.abs(p.y - k.y) < rr) {
          NS.powerups.apply(W, k.family, k.variant);
          W.stats.powerupsTaken++;
          puff(W, k.x, k.y, NS.FAMILY_INFO[k.family].color, 10, 120);
          W.floaters.push(NS.ent.floater(k.x, k.y - 16, NS.powerupInfo(k.family, k.variant).name, NS.FAMILY_INFO[k.family].color));
          W.pickups.splice(i, 1);
        }
      }
    }
  }

  function updateFx(W, dt) {
    var i;
    for (i = W.particles.length - 1; i >= 0; i--) {
      var pt = W.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) { W.particles.splice(i, 1); continue; }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
    }
    for (i = W.floaters.length - 1; i >= 0; i--) {
      var f = W.floaters[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) W.floaters.splice(i, 1);
    }
    for (i = W.lightning.length - 1; i >= 0; i--) {
      W.lightning[i].life -= dt;
      if (W.lightning[i].life <= 0) W.lightning.splice(i, 1);
    }
    for (i = W.wells.length - 1; i >= 0; i--) {
      var wl = W.wells[i];
      wl.life -= dt;
      if (wl.life <= 0) { W.wells.splice(i, 1); continue; }
      W.enemies.forEach(function (e) {
        if (e.dead) return;
        var dx = wl.x - e.x, dy = wl.y - e.y;
        var d = Math.hypot(dx, dy);
        if (d < wl.r && d > 1) {
          var f = (1 - d / wl.r) * 300 * wl.strength * dt;
          e.x += (dx / d) * f;
          e.y += (dy / d) * f * 0.4;
        }
      });
    }
    for (i = W.novas.length - 1; i >= 0; i--) {
      var nv = W.novas[i];
      nv.r += nv.speed * dt;
      W.enemies.forEach(function (e) {
        if (e.dead) return;
        var d = Math.hypot(e.x - nv.x, e.y - nv.y);
        if (Math.abs(d - nv.r) < e.r + 24) NS.powerups.damageEnemy(W, e, nv.dmg, false);
      });
      if (!nv.aegis) {
        W.ebullets.forEach(function (b) {
          var d = Math.hypot(b.x - nv.x, b.y - nv.y);
          if (Math.abs(d - nv.r) < b.r + 20) { b.dead = true; puff(W, b.x, b.y, '#b28dff', 3, 60); }
        });
      }
      if (nv.r >= nv.maxR) W.novas.splice(i, 1);
    }
    W.ebullets = W.ebullets.filter(function (b) { return !b.dead; });
    W.shake = Math.max(0, W.shake - dt * 26);
  }

  function updateCombo(W, dt) {
    var c = W.combo;
    if (W.wave.phase === 'breather') return;
    if (c.timer > 0) {
      c.timer -= dt;
      if (c.timer <= 0) {
        c.killStreak = 0;
        c.mult = 1;
      }
    }
    if (c.streakTimer > 0) {
      c.streakTimer -= dt;
      if (c.streakTimer <= 0) c.killStreak = 0;
    }
    c.mult = Math.min(C.COMBO_MULT_MAX, c.mult);
    if (c.mult > W.stats.maxCombo) W.stats.maxCombo = c.mult;
  }

  function registerKill(W) {
    var c = W.combo;
    c.killStreak++;
    c.streakTimer = C.MULTIKILL_WINDOW;
    if (c.killStreak >= 2) {
      var bonus = Math.round(50 * (c.killStreak - 1) * (c.mult));
      W.score += bonus;
      W.floaters.push(NS.ent.floater(W.player.x, W.player.y - 50, 'MULTI x' + c.killStreak + ' +' + bonus, '#ffe74c'));
    }
    c.mult = Math.min(C.COMBO_MULT_MAX, 1 + c.killStreak * C.COMBO_MULT_STEP);
    c.timer = C.COMBO_WINDOW;
  }

  function update(W, dt) {
    W.time += dt;
    W.runTime += dt;
    updatePlayer(W, dt);
    updateWave(W, dt);
    updateEnemies(W, dt);
    updateBullets(W, dt);
    updatePickups(W, dt);
    NS.powerups.update(W, dt);
    updateCombo(W, dt);
    updateFx(W, dt);
    var p = W.player;
    if (p.alive && W.wave.phase !== 'breather') {
      var alive = false;
      for (var i = 0; i < W.enemies.length; i++) if (!W.enemies[i].dead) { alive = true; break; }
    }
  }

  NS.world = null;
  NS.game = {
    newRun: newRun,
    update: update,
    countType: countType,
    hpMult: hpMult,
    enemyShoot: enemyShoot,
    puff: puff,
    emit: emit,
    hurtPlayer: hurtPlayer,
    registerKill: registerKill,
    startWave: startWave,
  };
})();
