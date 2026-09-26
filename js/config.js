window.NS = window.NS || {};

NS.C = {
  W: 960,
  H: 600,
  PLAYER: {
    speed: 410,
    r: 12,
    hp: 3,
    fireCd: 0.23,
    bulletSpeed: 660,
    dashCd: 2.1,
    dashTime: 0.16,
    dashSpeed: 1150,
    invuln: 1.4,
    startX: 480,
    startY: 540,
  },
  BULLET_CAP: 60,
  ENEMY_BULLET_CAP: 130,
  PARTICLE_CAP: 420,
  DRONE_CAP: 6,
  CHAIN_CAP: 8,
  COMBO_WINDOW: 2.2,
  COMBO_MULT_STEP: 0.25,
  COMBO_MULT_MAX: 4,
  BREATHER: 2.6,
  WAVE_CLEAR_BONUS: 250,
  MULTIKILL_WINDOW: 0.9,
  DROP_CHANCE: 0.085,
  BOSS_EVERY: 5,
  STORAGE_KEY: 'neonsiege_v1',
};

NS.ENEMY_DEFS = {
  grunt:    { hp: 3,  r: 16, score: 100, color: '#39ff6a' },
  swooper:  { hp: 2,  r: 14, score: 150, color: '#ff9f1c' },
  swarmer:  { hp: 1,  r: 9,  score: 60,  color: '#ffe74c' },
  armored:  { hp: 9,  r: 20, score: 300, color: '#b8c0ff' },
  sniper:   { hp: 4,  r: 14, score: 250, color: '#ff5d8f' },
  carrier:  { hp: 14, r: 24, score: 450, color: '#5dffb0' },
};

NS.FAMILIES = ['prism', 'drone', 'chrono', 'aegis', 'singularity'];

NS.FAMILY_INFO = {
  prism:       { name: 'Prism',       color: '#ff5df2', icon: 'P' },
  drone:       { name: 'Drones',      color: '#4cd7ff', icon: 'D' },
  chrono:      { name: 'Chrono',      color: '#c6ff4c', icon: 'C' },
  aegis:       { name: 'Aegis',       color: '#ffd24c', icon: 'A' },
  singularity: { name: 'Singularity', color: '#b28dff', icon: 'S' },
};

NS.powerupInfo = function (family, variant) {
  var names = {
    prism: ['Spread Shot', 'Piercing Beam', 'Ricochet'],
    drone: ['Attacker Drone', 'Interceptor Drone', 'Collector Drone'],
    chrono: ['Slow Field', 'Freeze Pulse', 'Overdrive'],
    aegis: ['Shield', 'Reflect Shield', 'Burst Shield'],
    singularity: ['Gravity Well', 'Chain Lightning', 'Nova'],
  };
  return { name: names[family][variant], family: family, variant: variant };
};
