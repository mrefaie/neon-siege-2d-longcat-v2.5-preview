(function () {
  var C = NS.C;

  var BASE_DURATION = { prism: 12, drone: 14, chrono: 10, singularity: 9, aegis: 0 };
  var STRENGTH_CAP = 2.2;

  function fresh(W, family, variant) {
    return {
      family: family,
      variant: variant,
      duration: BASE_DURATION[family],
      maxDuration: BASE_DURATION[family],
      strength: 1,
      timer: 0,
      charges: family === 'aegis' ? 3 : 0,
      maxCharges: family === 'aegis' ? 3 : 0,
    };
  }

  function applyPowerup(W, family, variant) {
    var p = W.powerups[family];
    if (p && p.family === family && p.variant === variant) {
      p.duration = Math.min(p.maxDuration, p.duration + p.maxDuration * 0.55);
      p.strength = Math.min(STRENGTH_CAP, p.strength + 0.3);
      if (p.family === 'aegis') p.charges = Math.min(p.maxCharges, p.charges + 1);
    } else {
      W.powerups[family] = fresh(W, family, variant);
    }
    var info = NS.powerupInfo(family, variant);
    W.floaters.push(NS.ent.floater(W.player.x, W.player.y - 34, info.name + '!', NS.FAMILY_INFO[family].color));
    NS.audio.play('pickup');
  }

  function updatePowerups(W, dt) {
    NS.FAMILIES.forEach(function (f) {
      var p = W.powerups[f];
      if (!p) return;
      if (p.duration > 0) {
        p.duration -= dt;
        if (p.duration <= 0) { W.powerups[f] = null; return; }
      }
      if (f === 'chrono' && p.variant === 0) chronoField(W, dt, p);
      if (f === 'chrono' && p.variant === 1) chronoPulse(W, dt, p);
      if (f === 'singularity' && p.variant === 0) gravityWell(W, dt, p);
      if (f === 'singularity' && p.variant === 1) chainLightning(W, dt, p);
      if (f === 'singularity' && p.variant === 2) novaPulse(W, dt, p);
      if (f === 'prism' && p.variant === 2) p._targets = null;
    });
    updateDrones(W, dt);
  }

  function chronoField(W, dt, p) {
    p.timer -= dt;
    if (p.timer <= 0) {
      p.timer = 0.5;
      NS.game.puff(W, W.player.x, W.player.y, '#c6ff4c', 2, 190 * p.strength);
    }
  }

  function chronoPulse(W, dt, p) {
    p.timer -= dt;
    if (p.timer <= 0) {
      p.timer = 5.5 - Math.min(2, p.strength);
      var dur = 0.55;
      W.enemies.forEach(function (e) {
        if (e.dead) return;
        e.frozen = Math.max(e.frozen || 0, e.boss ? dur * 0.35 : dur);
      });
      NS.audio.play('freeze');
    }
  }

  function gravityWell(W, dt, p) {
    p.timer -= dt;
    if (p.timer <= 0) {
      p.timer = 7 - Math.min(2.5, p.strength);
      var x = W.player.x + (Math.random() - 0.5) * 260;
      var y = 120 + Math.random() * 240;
      W.wells.push({ x: x, y: y, r: 150 + 60 * p.strength, life: 3.2, maxLife: 3.2, strength: p.strength });
      NS.game.puff(W, x, y, '#b28dff', 24);
    }
  }

  function chainLightning(W, dt, p) {
    p.timer -= dt;
    if (p.timer <= 0) {
      p.timer = 4.5 - Math.min(1.8, p.strength);
      var from = { x: W.player.x, y: W.player.y - 20 };
      var hit = {};
      var src = from;
      var n = 0;
      while (n < Math.min(C.CHAIN_CAP, 3 + Math.floor(p.strength * 2))) {
        var best = null, bd = 260;
        W.enemies.forEach(function (e) {
          if (e.dead || hit[e._id]) return;
          var d = Math.hypot(e.x - src.x, e.y - src.y);
          if (d < bd) { bd = d; best = e; }
        });
        if (!best) break;
        hit[best._id] = true;
        W.lightning.push({ x1: src.x, y1: src.y, x2: best.x, y2: best.y, life: 0.22, maxLife: 0.22 });
        damageEnemy(W, best, 2 + p.strength, false);
        src = best;
        n++;
      }
      if (n > 0) NS.audio.play('chain');
    }
  }

  function novaPulse(W, dt, p) {
    p.timer -= dt;
    if (p.timer <= 0) {
      p.timer = 8 - Math.min(3, p.strength);
      W.novas.push({ x: W.player.x, y: W.player.y, r: 10, maxR: 260 + 60 * p.strength, speed: 620, dmg: 3 + p.strength * 2 });
      NS.audio.play('nova');
    }
  }

  function updateDrones(W, dt) {
    var p = W.powerups.drone;
    var want = p ? 1 + Math.min(2, Math.floor(p.strength)) : 0;
    while (W.drones.length < want && W.drones.length < C.DRONE_CAP) {
      W.drones.push(NS.ent.drone(W.player.x, W.player.y - 24, p.variant));
    }
    if (!p && W.drones.length) { W.drones.length = 0; return; }
    if (!p) return;
    W.drones.forEach(function (d, i) {
      d.t += dt;
      var ang = d.t * 2.2 + (i / Math.max(1, W.drones.length)) * Math.PI * 2;
      var tx = W.player.x + Math.cos(ang) * 46;
      var ty = W.player.y - 20 + Math.sin(ang) * 26;
      d.x += (tx - d.x) * Math.min(1, dt * 8);
      d.y += (ty - d.y) * Math.min(1, dt * 8);
      d.fireCd -= dt;
      if (d.fireCd > 0) return;
      if (d.variant === 0) {
        var best = null, bd = 420;
        W.enemies.forEach(function (e) {
          if (e.dead || !e.arrived) return;
          var dist = Math.hypot(e.x - d.x, e.y - d.y);
          if (dist < bd) { bd = dist; best = e; }
        });
        if (best) {
          d.fireCd = 0.55;
          var dx = best.x - d.x, dy = best.y - d.y;
          var dd = Math.hypot(dx, dy) || 1;
          W.bullets.push(NS.ent.bullet(d.x, d.y, (dx / dd) * 520, (dy / dd) * 520, { color: '#4cd7ff', r: 3, life: 1.4 }));
          NS.audio.play('shoot');
        }
      } else if (d.variant === 1) {
        var bt = null, btd = 200;
        W.ebullets.forEach(function (b) {
          var dist = Math.hypot(b.x - d.x, b.y - d.y);
          if (dist < btd) { btd = dist; bt = b; }
        });
        if (bt) {
          d.fireCd = 0.3;
          bt.dead = true;
          NS.game.puff(W, bt.x, bt.y, '#4cd7ff', 6);
        }
      } else if (d.variant === 2) {
        var pk = null, pkd = 340;
        W.pickups.forEach(function (k) {
          if (k.dead) return;
          var dist = Math.hypot(k.x - d.x, k.y - d.y);
          if (dist < pkd) { pkd = dist; pk = k; }
        });
        if (pk) {
          d.fireCd = 0.12;
          var cdx = d.x - pk.x, cdy = d.y - pk.y;
          var cd = Math.hypot(cdx, cdy) || 1;
          pk.x += (cdx / cd) * 340 * dt;
          pk.y += (cdy / cd) * 340 * dt;
        }
      }
    });
  }

  function damageEnemy(W, e, dmg, usePierce) {
    if (e.dead) return;
    if (e.boss) dmg = Math.max(1, Math.round(dmg * 0.85));
    e.hp -= dmg;
    e.flash = 0.09;
    if (e.hp <= 0) {
      e.dead = true;
      killEnemy(W, e);
    } else {
      NS.audio.play('hit');
    }
  }

  function killEnemy(W, e) {
    NS.game.registerKill(W);
    var mult = W.combo.mult;
    var pts = Math.round(e.score * mult);
    W.score += pts;
    W.kills++;
    W.floaters.push(NS.ent.floater(e.x, e.y, '+' + pts, '#7df9ff'));
    var big = e.boss || e.type === 'armored' || e.type === 'carrier';
    NS.game.puff(W, e.x, e.y, e.color, big ? 26 : 12, big ? 260 : 160);
    if (big) { NS.audio.play('bigExplode'); W.shake = Math.min(14, W.shake + (e.boss ? 12 : 6)); }
    else { NS.audio.play('explode'); W.shake = Math.min(10, W.shake + 2); }
    if (e.boss) {
      W.floaters.push(NS.ent.floater(e.x, e.y - 30, 'BOSS DOWN', '#ffd24c'));
      W.shake = 16;
      dropPickup(W, e.x, e.y, true);
      if (Math.random() < 0.5) dropPickup(W, e.x + 30, e.y + 10, true);
    } else if (Math.random() < C.DROP_CHANCE) {
      dropPickup(W, e.x, e.y, false);
    }
  }

  function dropPickup(W, x, y, bonus) {
    var family = NS.FAMILIES[Math.floor(Math.random() * NS.FAMILIES.length)];
    var variant = Math.floor(Math.random() * 3);
    W.pickups.push(NS.ent.pickup(x, y, family, variant));
    if (bonus) W.pickups.push(NS.ent.pickup(x + 24, y + 6, NS.FAMILIES[Math.floor(Math.random() * NS.FAMILIES.length)], Math.floor(Math.random() * 3)));
  }

  var PICKUP_WEIGHTS = { prism: 1, drone: 1, chrono: 1, aegis: 1, singularity: 0.8 };

  NS.powerups = {
    apply: applyPowerup,
    update: updatePowerups,
    damageEnemy: damageEnemy,
    drop: dropPickup,
    isActive: function (W, family) { return !!W.powerups[family]; },
    slowFactorFor: function (W, e) {
      var p = W.powerups.chrono;
      var f = 1;
      if (p && p.variant === 0) {
        var d = Math.hypot(e.x - W.player.x, e.y - W.player.y);
        if (d < 190 * p.strength) f *= e.boss ? 0.72 : 0.45;
      }
      return f;
    },
  };
})();
