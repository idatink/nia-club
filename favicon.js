/* NIA animated favicon: the seven-circle flower pulses while the tile drifts through the brand colours. */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var link = document.querySelector('link[rel="icon"]');
  if (!link) return;
  var S = 64, c = document.createElement('canvas');
  c.width = c.height = S;
  var x = c.getContext('2d');
  if (!x || !c.toDataURL) return;
  var cols = [[143, 216, 180], [108, 202, 216], [26, 167, 184], [244, 165, 138], [228, 232, 122]];
  var petals = [[32, 32], [40, 32], [36, 39], [28, 39], [24, 32], [28, 25], [36, 25]];
  var CYCLE = 12000, PULSE = 2800, t0 = Date.now();
  function mix(a, b, k) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * k); }); }
  function rgb(a, al) { return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + al + ')'; }
  function round(r) {
    x.beginPath(); x.moveTo(r, 0); x.arcTo(S, 0, S, S, r); x.arcTo(S, S, 0, S, r); x.arcTo(0, S, 0, 0, r); x.arcTo(0, 0, S, 0, r); x.closePath();
  }
  function draw() {
    var t = Date.now() - t0;
    var p = (t % CYCLE) / CYCLE * cols.length, i = Math.floor(p), k = p - i;
    k = k * k * (3 - 2 * k);
    var col = mix(cols[i], cols[(i + 1) % cols.length], k);
    var beat = 0.5 - 0.5 * Math.cos((t % PULSE) / PULSE * Math.PI * 2);
    x.clearRect(0, 0, S, S);
    x.save(); round(14); x.clip();
    x.fillStyle = rgb(mix([22, 32, 27], col, 0.5 + beat * 0.2), 1); x.fillRect(0, 0, S, S);
    var g = x.createRadialGradient(32, 32, 2, 32, 32, 30 + beat * 10);
    g.addColorStop(0, rgb(col, 0.95)); g.addColorStop(0.55, rgb(col, 0.55 + beat * 0.25)); g.addColorStop(1, rgb(col, 0));
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.restore();
    var sc = 1 + beat * 0.09;
    x.save(); x.translate(32, 32); x.scale(sc, sc); x.translate(-32, -32);
    x.strokeStyle = 'rgba(255,255,255,' + (0.82 + beat * 0.18) + ')';
    x.lineWidth = 2.4 / sc;
    petals.forEach(function (q) { x.beginPath(); x.arc(q[0], q[1], 13, 0, Math.PI * 2); x.stroke(); });
    x.restore();
    link.type = 'image/png';
    link.href = c.toDataURL('image/png');
  }
  draw();
  setInterval(draw, 120);
})();
