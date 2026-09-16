/**
 * SHARABHA — Transitions & Navigation Engine
 * Ultra-smooth, fast, hardware-accelerated page curtain
 */
(function () {
  'use strict';

  var overlay = document.getElementById('transitionOverlay');
  var menuToggle = document.getElementById('menuToggle');
  var mobileNav = document.getElementById('mobileNav');
  var yearEl = document.getElementById('year');
  var isTransitioning = false;

  // Auto-set copyright year
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Mobile menu handling
  function closeMobileMenu() {
    if (!mobileNav || !menuToggle) return;
    mobileNav.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = mobileNav.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });
  }

  // Close mobile menu when clicking any nav item
  document.querySelectorAll('.mobile-nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      closeMobileMenu();
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', function (event) {
    if (!mobileNav) return;
    var clickedInside =
      mobileNav.contains(event.target) ||
      (menuToggle && menuToggle.contains(event.target));
    if (!clickedInside) {
      closeMobileMenu();
    }
  });

  // Reset overlay on browser back/forward (bfcache)
  window.addEventListener('pageshow', function () {
    document.documentElement.classList.remove('sh-entering');
    if (overlay) {
      overlay.classList.remove('show', 'releasing');
    }
    isTransitioning = false;
  });

  // Page Exit transition (Smooth closing curtain across 360ms)
  function playTransitionIn(href) {
    if (isTransitioning || !overlay) {
      window.location.href = href;
      return;
    }
    isTransitioning = true;
    closeMobileMenu();

    try {
      sessionStorage.setItem('sh-transitioning', '1');
    } catch (e) {}

    overlay.classList.remove('releasing');
    overlay.classList.add('show');

    // 360ms: all 10 bars complete scaleX(1) smoothly without any cut-off
    setTimeout(function () {
      window.location.href = href;
    }, 360);
  }

  // Page Enter transition (Smooth reveal curtain across 380ms)
  var hadTransitionFlag = false;
  try {
    hadTransitionFlag = !!sessionStorage.getItem('sh-transitioning');
    if (hadTransitionFlag) {
      sessionStorage.removeItem('sh-transitioning');
    }
  } catch (e) {}

  var isEntering = document.documentElement.classList.contains('sh-entering') || hadTransitionFlag;

  if (overlay && isEntering) {
    overlay.classList.add('show');

    // Double requestAnimationFrame ensures browser paints full curtain coverage before reveal
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.remove('sh-entering');
        overlay.classList.add('releasing');

        // Clean up after 390ms (stagger 135ms + duration 240ms)
        setTimeout(function () {
          overlay.classList.remove('show', 'releasing');
          isTransitioning = false;
        }, 390);
      });
    });
  } else {
    document.documentElement.classList.remove('sh-entering');
  }

  // Safety fallback: ensure curtain never stays stuck under any condition
  setTimeout(function () {
    document.documentElement.classList.remove('sh-entering');
    if (overlay && !isTransitioning) {
      overlay.classList.remove('show', 'releasing');
    }
  }, 700);

  // Intercept navigation links
  if (overlay) {
    document.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;

      // Skip non-page links
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        link.getAttribute('target') === '_blank'
      ) {
        return;
      }

      // Check current and target path to handle anchor scrolls smoothly
      var currentPath = window.location.pathname.split('/').pop() || 'index.html';
      var targetParts = href.split('#');
      var targetFile = targetParts[0].split('/').pop() || 'index.html';

      // Same-page anchor jump: smooth scroll directly without full page transition
      if (targetParts.length > 1 && targetFile === currentPath) {
        link.addEventListener('click', function (e) {
          closeMobileMenu();
          var elem = document.getElementById(targetParts[1]);
          if (elem) {
            e.preventDefault();
            elem.scrollIntoView({ behavior: 'smooth' });
            try {
              history.pushState(null, '', '#' + targetParts[1]);
            } catch (err) {}
          }
        });
        return;
      }

      // Page-to-page link: trigger smooth, fast curtain transition
      if (
        href.endsWith('.html') ||
        href.includes('.html#') ||
        href === '/' ||
        href === './' ||
        href === 'index.html'
      ) {
        link.addEventListener('click', function (e) {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          playTransitionIn(href);
        });
      }
    });
  }

  // ================================================
  // CINEMATIC ENGINEERING LAB VIDEO & TELEMETRY CONTROLS
  // ================================================
  var videoElem = document.getElementById('labCinematicVideo');
  var posterImg = document.getElementById('labPosterImg');
  var btnPlayPause = document.getElementById('btnPlayPause');
  var playIcon = document.getElementById('playIcon');
  var playText = document.getElementById('playText');
  var btnFullscreen = document.getElementById('btnFullscreen');
  var viewportElem = document.getElementById('cinematicViewport');
  var btnWireframe = document.getElementById('btnModeWireframe');
  var btnTelemetry = document.getElementById('btnModeTelemetry');
  var telemetryBadge = document.querySelector('.cinematic-telemetry-badge');

  var isPlaying = true;

  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', function () {
      isPlaying = !isPlaying;
      if (isPlaying) {
        btnPlayPause.classList.add('active');
        playIcon.innerHTML = '&#9646;&#9646;';
        playText.textContent = 'PAUSE';
        if (videoElem) {
          videoElem.classList.remove('paused');
          try { videoElem.play(); } catch (err) {}
        }
        if (posterImg) posterImg.classList.remove('paused');
      } else {
        btnPlayPause.classList.remove('active');
        playIcon.innerHTML = '&#9654;';
        playText.textContent = 'PLAY';
        if (videoElem) {
          videoElem.classList.add('paused');
          try { videoElem.pause(); } catch (err) {}
        }
        if (posterImg) posterImg.classList.add('paused');
      }
    });
  }

  // Toggle wireframe / telemetry modes
  if (btnWireframe && viewportElem) {
    btnWireframe.addEventListener('click', function () {
      btnWireframe.classList.toggle('active');
      viewportElem.classList.toggle('wireframe-mode');
    });
  }

  if (btnTelemetry && telemetryBadge) {
    btnTelemetry.addEventListener('click', function () {
      var isHidden = telemetryBadge.style.display === 'none';
      telemetryBadge.style.display = isHidden ? 'block' : 'none';
      btnTelemetry.classList.toggle('active', !isHidden);
    });
  }

  // Fullscreen expansion
  if (btnFullscreen && viewportElem) {
    btnFullscreen.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        if (viewportElem.requestFullscreen) {
          viewportElem.requestFullscreen();
        } else if (viewportElem.webkitRequestFullscreen) {
          viewportElem.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });
  }

  // Live telemetry subtle oscillation (simulating active engine test stand)
  var rpmEl = document.getElementById('telemetryRpm');
  var tempEl = document.getElementById('telemetryTemp');
  var torqueEl = document.getElementById('telemetryTorque');
  var pressEl = document.getElementById('telemetryPressure');

  if (rpmEl && tempEl) {
    setInterval(function () {
      if (!isPlaying) return;
      var rpmJitter = Math.floor(4115 + Math.random() * 14);
      var tempJitter = Math.floor(940 + Math.random() * 4);
      var torqueJitter = Math.floor(384 + Math.random() * 3);
      var pressJitter = (14.7 + Math.random() * 0.2).toFixed(1);

      rpmEl.textContent = rpmJitter.toLocaleString() + ' RPM';
      tempEl.innerHTML = tempJitter + ' &deg;C';
      if (torqueEl) torqueEl.textContent = torqueJitter + ' Nm';
      if (pressEl) pressEl.textContent = pressJitter + ' BAR';
    }, 1800);
  }
})();

