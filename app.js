// ---------- CONFIGURE THIS URL to your Apps Script JSON endpoint ----------
const API_URL = 'https://script.google.com/macros/s/AKfycbwGLaO9R1wVwEom8PY3Gk40HJA3P_jD2NQQpugdEH7xxfvcGYm3VwoHVRM_P4oYPnl7CQ/exec';

// 狀態變數
let isFirstLoad = true;
let currentSlideIdx = 0;

// 在 URL 後面加上 timestamp，確保每次請求都是新的
async function fetchData() {
  const url = `${API_URL}?t=${Date.now()}`;
  const resp = await fetch(url, { cache: 'no-store' });
  return resp.json();
}

// 1. 電路背景
function createCircuitBackground() {
  const circuitBg = document.getElementById('circuitBackground');
  circuitBg.innerHTML = '';
  for (let i = 0; i < 15; i++) {
    const line = document.createElement('div');
    line.className = 'circuit-line';
    line.style.height = '2px';
    line.style.width  = `${Math.random() * 30 + 10}%`;
    line.style.top    = `${Math.random() * 100}%`;
    line.style.left   = `${Math.random() * 70}%`;
    if (Math.random() > 0.7) {
      line.style.backgroundColor = '#28C4FF';
      line.style.boxShadow       = '0 0 10px #28C4FF';
    }
    circuitBg.appendChild(line);
  }
  for (let i = 0; i < 15; i++) {
    const line = document.createElement('div');
    line.className = 'circuit-line';
    line.style.width  = '2px';
    line.style.height = `${Math.random() * 30 + 10}%`;
    line.style.top    = `${Math.random() * 70}%`;
    line.style.left   = `${Math.random() * 100}%`;
    if (Math.random() > 0.7) {
      line.style.backgroundColor = '#28C4FF';
      line.style.boxShadow       = '0 0 10px #28C4FF';
    }
    circuitBg.appendChild(line);
  }
  for (let i = 0; i < 30; i++) {
    const dot = document.createElement('div');
    dot.className = 'circuit-dot';
    dot.style.top  = `${Math.random() * 100}%`;
    dot.style.left = `${Math.random() * 100}%`;
    circuitBg.appendChild(dot);
  }
}
function initPageStyles() {
  createCircuitBackground();
}

// 2. 讀取資料並渲染
async function loadData() {
  try {
    const { title, slides } = await fetchData();
    document.querySelector('.main-page-title').textContent = title;

    if (isFirstLoad) {
      renderSlides(slides);
      startCarousel();
      isFirstLoad = false;
    } else {
      updateSlidesData(slides);
    }
  } catch (e) {
    console.error('載入資料失敗：', e);
  }
}

// 3a. 首次把整個輪播結構建好
function renderSlides(slides) {
  const container = document.getElementById('slideshowMasterContainer');
  container.innerHTML = '';
  slides.forEach((slide, i) => {
    const slideEl = document.createElement('div');
    slideEl.className = 'column-group-slide' + (i === 0 ? ' active' : '');
    slideEl.id = `slide-group-${i}`;

    const page = document.createElement('div');
    page.className = 'page-container-in-slide';

    slide.columnsData.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'column';
      let inner = `<div class="column-title">${col.title}</div>
                   <div class="column-content">`;

      if (col.error) {
        inner += `<p class="error-message">讀取「${col.title}」失敗：${col.error}</p>`;
      } else if (col.staticMessage) {
        inner += `<p class="static-message-content">${col.staticMessage}</p>`;
      } else if (col.data && col.data.length) {
        inner += `<table>
            <thead>
              <tr>
                <th class="vertical-header">姓<br>名</th>
                <th>完成<br>面試</th>
              </tr>
            </thead>
            <tbody>
                      ${col.data.map(row => `
                        <tr>
                          <td>${row.B}</td>
                          <td class="${row.C==='V'?'text-successGreen':''}">${row.C}</td>
                        </tr>`).join('')}
                    </tbody>
                  </table>`;
      } else {
        inner += `<p class="no-data">（目前沒有「${col.originalSheetName}」的資料）</p>`;
      }

      inner += `</div>`;
      colEl.innerHTML = inner;
      page.appendChild(colEl);
    });

    slideEl.appendChild(page);
    container.appendChild(slideEl);
  });
}

// 3b. 後續只更新每格的資料，不重置輪播
function updateSlidesData(slides) {
  slides.forEach((slide, i) => {
    const slideEl = document.getElementById(`slide-group-${i}`);
    if (!slideEl) return;

    slide.columnsData.forEach((col, j) => {
      const colEl = slideEl.querySelectorAll('.column')[j];
      if (!colEl) return;
      const contentEl = colEl.querySelector('.column-content');

      let inner = '';
      if (col.error) {
        inner = `<p class="error-message">讀取「${col.title}」失敗：${col.error}</p>`;
      } else if (col.staticMessage) {
        inner = `<p class="static-message-content">${col.staticMessage}</p>`;
      } else if (col.data && col.data.length) {
        inner = `<table>
                   <thead><tr><th>姓　　名</th><th>完成面試</th></tr></thead>
                   <tbody>
                     ${col.data.map(row => `
                       <tr>
                         <td>${row.B}</td>
                         <td class="${row.C==='V'?'text-successGreen':''}">${row.C}</td>
                       </tr>`).join('')}
                   </tbody>
                 </table>`;
      } else {
        inner = `<p class="no-data">（目前沒有「${col.originalSheetName}」的資料）</p>`;
      }

      contentEl.innerHTML = inner;
    });
  });
}

// 4. 自動捲動 & 輪播
const SLIDE_DURATION  = 30000, SCROLL_INTERVAL = 50;
let _scrollIntervals = [];

function clearAutoScroll() {
  _scrollIntervals.forEach(id => clearInterval(id));
  _scrollIntervals = [];
}
function startAutoScrollOnSlide(slideEl) {
  clearAutoScroll();
  const cols = Array.from(slideEl.querySelectorAll('.column-content'))
                    .filter(c => c.scrollHeight > c.clientHeight);
  if (!cols.length) return;

  const maxScroll = Math.max(...cols.map(c => c.scrollHeight - c.clientHeight));
  const ticks     = SLIDE_DURATION / SCROLL_INTERVAL;
  const step      = Math.ceil(maxScroll / ticks);

  cols.forEach(c => {
    const id = setInterval(() => {
      if (c.scrollTop + c.clientHeight < c.scrollHeight) {
        c.scrollTop = Math.min(c.scrollTop + step, c.scrollHeight - c.clientHeight);
      } else {
        c.scrollTop = 0;
      }
    }, SCROLL_INTERVAL);
    _scrollIntervals.push(id);
  });
}
function startCarousel() {
  const slides = document.querySelectorAll('.column-group-slide');
  const show = i => {
    slides.forEach((el, j) => {
      const active = i === j;
      el.classList.toggle('active', active);
      el.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (active) startAutoScrollOnSlide(el);
    });
    currentSlideIdx = i;
  };
  show(0);
  if (slides.length > 1) {
    setInterval(() => {
      show((currentSlideIdx + 1) % slides.length);
    }, SLIDE_DURATION);
  }
}

// 5. Resize 及背景重繪
window.addEventListener('resize', () => {
  clearTimeout(window.__resizeTimer);
  window.__resizeTimer = setTimeout(createCircuitBackground, 250);
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  initPageStyles();
  loadData();
  setInterval(loadData, 60000);  // 每 60 秒重新抓一次資料
});
