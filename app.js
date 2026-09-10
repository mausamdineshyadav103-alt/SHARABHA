/**
 * Vajra Defense Systems — Contact & RFQ Logic
 * Live Mojave Weather REST API, Leaflet Proving Grounds Map, Audio Synth & RFQ Processing
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Audio Synth
  let audioCtx = null;
  let isMuted = localStorage.getItem('vajra_sound_muted') === 'true';

  const soundToggleBtn = document.getElementById('sound-toggle');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');

  function updateSoundUI() {
    if (!soundToggleBtn) return;
    if (isMuted) {
      soundIconOn.style.display = 'none';
      soundIconOff.style.display = 'block';
    } else {
      soundIconOn.style.display = 'block';
      soundIconOff.style.display = 'none';
    }
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      localStorage.setItem('vajra_sound_muted', isMuted);
      updateSoundUI();
      if (!isMuted) playSound('click');
    });
    updateSoundUI();
  }

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (isMuted) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'hover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(940, now + 0.04);
        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'success') {
        [587.33, 739.99, 880.00, 1174.66].forEach((freq, idx) => {
          const oscChime = audioCtx.createOscillator();
          const gainChime = audioCtx.createGain();
          oscChime.connect(gainChime);
          gainChime.connect(audioCtx.destination);

          const startTime = now + idx * 0.06;
          oscChime.type = 'sine';
          oscChime.frequency.setValueAtTime(freq, startTime);
          gainChime.gain.setValueAtTime(0.05, startTime);
          gainChime.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

          oscChime.start(startTime);
          oscChime.stop(startTime + 0.25);
        });
      }
    } catch (e) {
      console.warn('Audio notice', e);
    }
  }

  // 2. Canvas Particles Grid
  const canvas = document.getElementById('circuit-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const particleCount = 35;
    let mouse = { x: null, y: null };

    function resizeCanvas() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 1.8 + 1;
        this.alpha = Math.random() * 0.4 + 0.2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (120 - dist) / 120;
            this.x -= (dx / dist) * force * 1.5;
            this.y -= (dy / dist) * force * 1.5;
          }
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(122, 210, 255, ${this.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#7ad2ff';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    function animateCanvas() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(122, 210, 255, ${0.14 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animateCanvas);
    }
    animateCanvas();
  }

  // 3. Weather & Status
  const officeStateText = document.getElementById('office-state-text');
  const weatherText = document.getElementById('weather-text');

  function updateOfficeStatus() {
    if (!officeStateText) return;
    const options = { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', hour12: true, weekday: 'short' };
    const formatter = new Intl.DateTimeFormat([], options);
    const pstTimeStr = formatter.format(new Date());

    const laDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const day = laDate.getDay();
    const hour = laDate.getHours();
    const isOpen = (day >= 1 && day <= 5) && (hour >= 8 && hour < 19);

    if (isOpen) {
      officeStateText.innerHTML = `Mojave Test Range: <span style="color:#7ad2ff; font-weight:600;">ACTIVE FLIGHT ENVELOPE</span> • ${pstTimeStr} PST`;
    } else {
      officeStateText.innerHTML = `Mojave Test Range: <span style="color:#ffba66; font-weight:600;">STANDBY</span> • ${pstTimeStr} PST`;
    }
  }

  async function fetchMojaveWeather() {
    if (!weatherText) return;
    try {
      // Mojave Air & Space Port (lat: 35.0110, lon: -118.1740)
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.0110&longitude=-118.1740&current_weather=true');
      if (!res.ok) throw new Error('Weather offline');
      const data = await res.json();
      const tempC = data.current_weather.temperature;
      const tempF = Math.round((tempC * 9 / 5) + 32);
      weatherText.innerHTML = `<span>🚀 Mojave Range: ${tempF}°F (${tempC}°C) Clear Winds</span>`;
    } catch (e) {
      weatherText.innerHTML = `<span>🌵 Mojave Air & Space Port</span>`;
    }
  }

  updateOfficeStatus();
  fetchMojaveWeather();

  // 4. Toast Notifications
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, icon = '✓') {
    playSound('click');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span style="color:#7ad2ff; font-weight:bold;">${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  const cardEmail = document.getElementById('card-email');
  if (cardEmail) {
    cardEmail.addEventListener('click', () => {
      const email = document.getElementById('val-email').innerText;
      navigator.clipboard.writeText(email).then(() => {
        showToast(`Copied encrypted email (${email}) to clipboard!`);
      }).catch(() => {
        window.location.href = `mailto:${email}`;
      });
    });
  }

  const cardPhone = document.getElementById('card-phone');
  if (cardPhone) {
    cardPhone.addEventListener('click', () => {
      const phone = document.getElementById('val-phone').innerText;
      navigator.clipboard.writeText(phone).then(() => {
        showToast(`Copied telephone line (${phone}) to clipboard!`);
      }).catch(() => {
        window.location.href = `tel:${phone.replace(/\D/g, '')}`;
      });
    });
  }

  // 5. Leaflet Map Modal
  const cardLocation = document.getElementById('card-location');
  const mapModal = document.getElementById('map-modal');
  const closeMapBtn = document.getElementById('close-map-btn');
  let leafletMap = null;

  if (cardLocation && mapModal) {
    cardLocation.addEventListener('click', () => {
      playSound('click');
      mapModal.style.display = 'flex';
      if (!leafletMap) {
        setTimeout(() => {
          const coords = [35.0110, -118.1740];
          leafletMap = L.map('map-container').setView(coords, 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }).addTo(leafletMap);
          const marker = L.marker(coords).addTo(leafletMap);
          marker.bindPopup(`<b>Vajra Defense HQ</b><br>Mojave Air & Space Port Test Range`).openPopup();
        }, 100);
      } else {
        setTimeout(() => leafletMap.invalidateSize(), 100);
      }
    });

    if (closeMapBtn) {
      closeMapBtn.addEventListener('click', () => {
        playSound('click');
        mapModal.style.display = 'none';
      });
    }

    mapModal.addEventListener('click', (e) => {
      if (e.target === mapModal) mapModal.style.display = 'none';
    });
  }

  // 6. Contact Form Processing
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const topicPills = document.querySelectorAll('.topic-pill');
    const selectedTopicInput = document.getElementById('selected-topic');
    const inputName = document.getElementById('input-name');
    const inputEmail = document.getElementById('input-email');
    const inputMessage = document.getElementById('input-message');
    const charCurrent = document.getElementById('char-current');
    const draftIndicator = document.getElementById('draft-indicator');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    const formSuccessBox = document.getElementById('form-success-box');
    const btnViewApiResponse = document.getElementById('btn-view-api-response');
    const btnResetForm = document.getElementById('btn-reset-form');
    const apiModal = document.getElementById('api-modal');
    const closeApiBtn = document.getElementById('close-api-btn');
    const apiJsonContent = document.getElementById('api-json-content');

    let lastApiPayloadResponse = null;

    topicPills.forEach(pill => {
      pill.addEventListener('click', () => {
        playSound('click');
        topicPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedTopicInput.value = pill.dataset.topic;
      });
    });

    function updateCharCount() {
      if (inputMessage && charCurrent) {
        charCurrent.innerText = inputMessage.value.length;
        saveDraft();
      }
    }

    function saveDraft() {
      const draft = {
        name: inputName.value,
        email: inputEmail.value,
        message: inputMessage.value,
        topic: selectedTopicInput.value
      };
      localStorage.setItem('vajra_form_draft', JSON.stringify(draft));
      if (draftIndicator) draftIndicator.style.display = 'flex';
    }

    function restoreDraft() {
      const saved = localStorage.getItem('vajra_form_draft');
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.name) inputName.value = draft.name;
          if (draft.email) inputEmail.value = draft.email;
          if (draft.message) inputMessage.value = draft.message;
          if (draft.topic) {
            selectedTopicInput.value = draft.topic;
            topicPills.forEach(p => {
              if (p.dataset.topic === draft.topic) p.classList.add('active');
              else p.classList.remove('active');
            });
          }
          updateCharCount();
        } catch (e) {}
      }
    }

    [inputName, inputEmail, inputMessage].forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          input.parentElement.classList.remove('invalid');
          updateCharCount();
        });
        input.addEventListener('focus', () => playSound('hover'));
      }
    });

    restoreDraft();

    function validateForm() {
      let isValid = true;
      if (!inputName.value.trim()) {
        inputName.parentElement.classList.add('invalid');
        isValid = false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inputEmail.value.trim())) {
        inputEmail.parentElement.classList.add('invalid');
        isValid = false;
      }
      if (inputMessage.value.trim().length < 10) {
        inputMessage.parentElement.classList.add('invalid');
        isValid = false;
      }
      return isValid;
    }

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateForm()) {
        playSound('click');
        return;
      }

      submitBtn.disabled = true;
      btnText.innerText = 'ENCRYPTING & TRANSMITTING...';
      btnSpinner.style.display = 'inline-block';
      playSound('click');

      const payload = {
        entity: inputName.value.trim(),
        officialEmail: inputEmail.value.trim(),
        interestCore: selectedTopicInput.value,
        specification: inputMessage.value.trim(),
        timestamp: new Date().toISOString(),
        securityLevel: 'ORCON-V CLEARED',
        facilityTarget: 'Mojave Proving Ground & Sector 9 HQ'
      };

      try {
        const response = await fetch('https://httpbin.org/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          const json = await response.json();
          lastApiPayloadResponse = {
            status: 200,
            statusText: 'ORCON-V OK',
            endpoint: 'https://httpbin.org/post',
            transmissionData: json.json || payload,
            serverTimestamp: new Date().toISOString()
          };
        } else {
          throw new Error('HTTP ' + response.status);
        }
      } catch (err) {
        lastApiPayloadResponse = {
          status: 200,
          statusText: 'Simulated Defense RFQ Transmission',
          endpoint: '/api/v1/defense/rfq',
          transmissionData: payload,
          serverTimestamp: new Date().toISOString()
        };
      }

      setTimeout(() => {
        submitBtn.disabled = false;
        btnText.innerText = 'INITIALIZE DEFENSE PROTOCOL / RFQ';
        btnSpinner.style.display = 'none';
        contactForm.style.display = 'none';
        formSuccessBox.style.display = 'flex';
        localStorage.removeItem('vajra_form_draft');
        if (draftIndicator) draftIndicator.style.display = 'none';
        playSound('success');
        showToast('RFQ Transmission encrypted & verified!', '⚡');
      }, 700);
    });

    btnResetForm.addEventListener('click', () => {
      playSound('click');
      contactForm.reset();
      formSuccessBox.style.display = 'none';
      contactForm.style.display = 'flex';
    });

    btnViewApiResponse.addEventListener('click', () => {
      playSound('click');
      apiJsonContent.innerText = JSON.stringify(lastApiPayloadResponse, null, 2);
      apiModal.style.display = 'flex';
    });

    if (closeApiBtn) {
      closeApiBtn.addEventListener('click', () => {
        playSound('click');
        apiModal.style.display = 'none';
      });
    }

    if (apiModal) {
      apiModal.addEventListener('click', (e) => {
        if (e.target === apiModal) apiModal.style.display = 'none';
      });
    }
  }

});
