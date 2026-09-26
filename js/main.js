(function () {
  var C = NS.C;
  var appState = 'title';
  var last = 0;
  var W = null;

  function startGame() {
    NS.audio.unlock();
    W = NS.game.newRun();
    appState = 'playing';
    NS.ui.hideAll();
    NS.audio.music('game');
    NS.ui.caption('Wave 1');
    NS.audio.speak('Wave 1. Good luck.');
  }

  function toTitle() {
    appState = 'title';
    W = null;
    NS.audio.stopMusic();
    NS.audio.music('menu');
    NS.ui.show('title');
  }

  function pauseGame() {
    if (appState !== 'playing') return;
    appState = 'paused';
    NS.ui.show('pause');
    NS.audio.play('uiMove');
  }

  function resumeGame() {
    if (appState !== 'paused') return;
    appState = 'playing';
    NS.ui.hideAll();
    NS.audio.play('uiSelect');
  }

  function gameOver() {
    appState = 'gameover';
    NS.audio.stopMusic();
    NS.audio.play('bigExplode');
    NS.ui.fillGameOver(W);
    setTimeout(function () {
      if (appState === 'gameover') NS.ui.show('gameover');
    }, 900);
  }

  function frame(t) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    if (appState === 'playing' && W) {
      if (NS.input.consumePause()) { pauseGame(); }
      else {
        NS.game.update(W, dt);
        var ev;
        while (W.events.length) {
          ev = W.events.shift();
          NS.ui.onEvent(W, ev);
        }
        if (!W.player.alive) gameOver();
      }
    } else if (appState === 'paused') {
      if (NS.input.consumePause()) resumeGame();
    }
    NS.render.render(W, appState === 'playing' ? dt : 0.0001);
  }

  function boot() {
    var cv = document.getElementById('game');
    NS.render.init(cv);
    NS.input.init();
    NS.ui.init();
    NS.ui.startGame = startGame;
    NS.ui.resume = resumeGame;
    NS.ui.toTitle = toTitle;
    if (NS.debug) NS.debug.init();
    window.addEventListener('resize', function () { NS.render.resize(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && appState === 'playing') pauseGame();
    });
    document.addEventListener('pointerdown', function () { NS.audio.unlock(); }, { once: true });
    document.addEventListener('keydown', function () { NS.audio.unlock(); }, { once: true });
    NS.audio.setVolumes(NS.store.getSettings());
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
