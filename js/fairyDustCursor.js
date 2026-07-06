(function fairyDustCursor() {
  var possibleColors = ["#D61C59", "#E7D84B", "#1B8793", "#A8E6CE", "#FF8C42", "#FF3B3F"];
  var width = window.innerWidth;
  var height = window.innerHeight;
  var cursor = { x: width / 2, y: width / 2 };
  var particles = [];

  function init() {
    bindEvents();
    loop();
  }

  function bindEvents() {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchstart', onTouchMove);
    window.addEventListener('resize', onWindowResize);
  }

  function onWindowResize() {
    width = window.innerWidth;
    height = window.innerHeight;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      for (var i = 0; i < e.touches.length; i++) {
        addParticle(e.touches[i].clientX, e.touches[i].clientY, possibleColors[Math.floor(Math.random() * possibleColors.length)]);
      }
    }
  }

  function onMouseMove(e) {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    addParticle(cursor.x, cursor.y, possibleColors[Math.floor(Math.random() * possibleColors.length)]);
  }

  function addParticle(x, y, color) {
    var particle = new Particle();
    particle.init(x, y, color);
    particles.push(particle);
  }

  function updateParticles() {
    for (var i = 0; i < particles.length; i++) {
      particles[i].update();
    }
    for (var i = particles.length - 1; i >= 0; i--) {
      if (particles[i].lifeSpan < 0) {
        particles[i].die();
        particles.splice(i, 1);
      }
    }
  }

  function loop() {
    requestAnimationFrame(loop);
    updateParticles();
  }

  function Particle() {
    this.character = "✦"; // 你可以改成 * . · 等符号
    this.lifeSpan = 120;
    this.initialStyles = {
      "position": "fixed",
      "top": "0",
      "display": "block",
      "pointerEvents": "none",
      "z-index": "10000000",
      "fontSize": "24px",
      "will-change": "transform"
    };

    this.init = function (x, y, color) {
      this.velocity = {
        x: (Math.random() < 0.5 ? -1 : 1) * (Math.random() / 2),
        y: 1
      };
      this.position = { x: x - 10, y: y - 20 };
      this.initialStyles.color = color;

      this.element = document.createElement('span');
      this.element.innerHTML = this.character;
      this.applyProperties(this.element, this.initialStyles);
      this.update();
      document.body.appendChild(this.element);
    };

    this.update = function () {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.lifeSpan--;
      this.element.style.transform = "translate3d(" + this.position.x + "px," + this.position.y + "px,0) scale(" + (this.lifeSpan / 120) + ")";
    };

    this.die = function () {
      this.element.parentNode.removeChild(this.element);
    };

    this.applyProperties = function (target, properties) {
      for (var key in properties) {
        target.style[key] = properties[key];
      }
    };
  }

  init();
})();