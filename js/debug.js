(function () {
  var enabled = false;

  function init() {
    if (window.location.search.indexOf('debug') === -1) return;
    enabled = true;
    window.__NEON_DEBUG = {
      skipToWave: function (n) {
        if (!NS.world) return 'no run active';
        var W = NS.world;
        W.enemies.length = 0;
        W.ebullets.length = 0;
        W.wave.n = n - 1;
        W.wave.phase = 'breather';
        W.wave.timer = 0.5;
        return 'skipping to wave ' + n;
      },
      spawnPowerup: function (family, variant) {
        if (!NS.world) return 'no run active';
        var W = NS.world;
        var f = family || NS.FAMILIES[Math.floor(Math.random() * NS.FAMILIES.length)];
        var v = variant == null ? Math.floor(Math.random() * 3) : variant;
        W.pickups.push(NS.ent.pickup(W.player.x, W.player.y - 120, f, v));
        return 'spawned ' + f + ' ' + v;
      },
      state: function () {
        if (!NS.world) return { appState: 'no run' };
        var W = NS.world;
        return {
          wave: W.wave.n, phase: W.wave.phase, pending: W.wave.pending.length,
          enemies: W.enemies.length, ebullets: W.ebullets.length, bullets: W.bullets.length,
          pickups: W.pickups.length, hp: W.player.hp, score: W.score,
          powerups: Object.keys(W.powerups).filter(function (k) { return W.powerups[k]; }),
        };
      },
      hurt: function (n) { if (NS.world) NS.game.hurtPlayer(NS.world, n || 1, 0); return 'hurt'; },
      god: function () { if (NS.world) NS.world.player.invuln = 9999; return 'god'; },
    };
    var bar = document.createElement('div');
    bar.id = 'debug-bar';
    bar.innerHTML = '<span>DEBUG</span>';
    ['1', '2', '3', '4', '5'].forEach(function (n) {
      var b = document.createElement('button');
      b.textContent = 'W' + n;
      b.onclick = function () { console.log(window.__NEON_DEBUG.skipToWave(parseInt(n, 10))); };
      bar.appendChild(b);
    });
    NS.FAMILIES.forEach(function (f) {
      for (var v = 0; v < 3; v++) {
        var b = document.createElement('button');
        b.textContent = f[0].toUpperCase() + (v + 1);
        b.onclick = function (ff, vv) { return function () { console.log(window.__NEON_DEBUG.spawnPowerup(ff, vv)); }; }(f, v);
        bar.appendChild(b);
      }
    });
    document.body.appendChild(bar);
  }

  NS.debug = { init: init, enabled: function () { return enabled; } };
})();
