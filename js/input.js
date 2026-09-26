(function () {
  var keys = {};
  var touch = { active: false, x: 0, y: 0, id: null };
  var dashQueued = false;
  var pauseQueued = false;
  var anyGesture = false;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys[e.code] = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') dashQueued = true;
    if (e.code === 'Escape') pauseQueued = true;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    anyGesture = true;
  }
  function onKeyUp(e) { keys[e.code] = false; }

  function onTouchStart(e) {
    anyGesture = true;
    var t = e.changedTouches[0];
    touch.active = true;
    touch.id = t.identifier;
    touch.x = t.clientX;
    touch.y = t.clientY;
    if (e.target && e.target.id === 'dash-btn') { dashQueued = true; touch.active = false; }
    e.preventDefault();
  }
  function onTouchMove(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === touch.id) { touch.x = t.clientX; touch.y = t.clientY; }
    }
    e.preventDefault();
  }
  function onTouchEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touch.id) { touch.active = false; touch.id = null; }
    }
    e.preventDefault();
  }

  NS.input = {
    init: function () {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      var c = document.getElementById('game');
      c.addEventListener('touchstart', onTouchStart, { passive: false });
      c.addEventListener('touchmove', onTouchMove, { passive: false });
      c.addEventListener('touchend', onTouchEnd, { passive: false });
      c.addEventListener('touchcancel', onTouchEnd, { passive: false });
      var db = document.getElementById('dash-btn');
      if (db) {
        db.addEventListener('touchstart', function (e) { dashQueued = true; anyGesture = true; e.preventDefault(); e.stopPropagation(); }, { passive: false });
      }
    },
    left: function () { return !!(keys.ArrowLeft || keys.KeyA); },
    right: function () { return !!(keys.ArrowRight || keys.KeyD); },
    fire: function () { return !!keys.Space; },
    consumeDash: function () { var d = dashQueued; dashQueued = false; return d; },
    consumePause: function () { var p = pauseQueued; pauseQueued = false; return p; },
    touch: touch,
    gesture: function () { return anyGesture; },
    resetGesture: function () { anyGesture = false; },
  };
})();
