// ===== 0. Supabase 数据库后台链接配置 =====
const SUPABASE_URL = 'https://wmohfjffgkwugxlryddk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SPoy7VTCA_B8CQt_1pL3ZA_Ha6ZxAUg';

const machinePreview = new URLSearchParams(location.search).get('preview') === 'machine';
const DEFAULT_CLAW_SPEED = 2;
let previewClawSpeed = DEFAULT_CLAW_SPEED;
function clawVerticalSpeedMultiplier() {
  return machinePreview ? previewClawSpeed : DEFAULT_CLAW_SPEED;
}
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ===== 1. 画布与资源初始化 =====
const canvas = document.getElementById('catCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const drawCanvas = document.createElement('canvas');
if (canvas) {
  drawCanvas.width = canvas.width;
  drawCanvas.height = canvas.height;
}
const drawCtx = drawCanvas ? drawCanvas.getContext('2d') : null;

let currentMode = 'template';

const baseCatImg = new Image();
baseCatImg.crossOrigin = 'anonymous';
baseCatImg.src = 'https://pic.imgdd.cc/i/034VyArtGubCjQn3OmYBeN.jpg';
baseCatImg.onload = () => { redrawAll(); };

const hatData = [
  { id: 'crown', name: '皇冠', src: '' },
  { id: 'caitlyn', name: '凯特琳', src: 'https://pic.imgdd.cc/i/034VyAslZQ0DQLgps2fNRi.png' },
  { id: 'agu', name: '阿鼓', src: 'https://pic.imgdd.cc/i/034VyAtsmOLUckUNOTzuAE.png' },
  { id: 'yunqing', name: '云清', src: 'https://pic.imgdd.cc/i/034VyAtmdQcRKSBKiJWyf3.png' },
  { id: 'xiaoxue', name: '夏小雪', src: 'https://pic.imgdd.cc/i/034VyAuD3TOU4wiYRhsaXv.png' },
  { id: 'cap', name: '鸭舌帽', src: 'https://pic.imgdd.cc/i/034VyAuTj3wra2S2JMXuK3.png' }
];

const loadedHatImages = {};
hatData.forEach(hat => {
  if (hat.src) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = hat.src;
    img.onload = () => {
      loadedHatImages[hat.id] = img;
      redrawAll();
    };
  }
});

let hatPage = 0;
const itemsPerHatPage = 3;
let currentHat = null;
let hatTransform = { x: 150, y: 65, scale: 1.0, width: 120 };

let isDrawing = false;
let isDraggingHat = false;
let dragStartX = 0, dragStartY = 0;

let currentTool = 'move';
let brushColor = '#a24bcf';
let brushSize = 4;

let drawingHistory = [];
let historyIndex = -1;

function saveState() {
  if (!drawCtx || !canvas) return;
  if (historyIndex < drawingHistory.length - 1) {
    drawingHistory = drawingHistory.slice(0, historyIndex + 1);
  }
  try {
    drawingHistory.push(drawCtx.getImageData(0, 0, canvas.width, canvas.height));
    if (drawingHistory.length > 40) drawingHistory.shift();
    historyIndex = drawingHistory.length - 1;
  } catch (e) {}
}

function drawBaseCat() {
  if (currentMode !== 'template' || !ctx || !canvas) return;
  if (baseCatImg.complete && baseCatImg.naturalWidth > 0) {
    try {
      const catSize = 240;
      const catX = (canvas.width - catSize) / 2;
      const catY = 50;
      ctx.drawImage(baseCatImg, catX, catY, catSize, catSize);
    } catch (e) {}
  }
}

function drawSelectedHat() {
  if (!currentHat || !ctx) return;

  if (currentHat.id === 'crown') {
    ctx.save();
    ctx.translate(hatTransform.x, hatTransform.y);
    ctx.scale(hatTransform.scale, hatTransform.scale);

    ctx.beginPath();
    ctx.moveTo(-40, 15); ctx.lineTo(-50, -25); ctx.lineTo(-20, -5); ctx.lineTo(0, -35); ctx.lineTo(20, -5); ctx.lineTo(50, -25); ctx.lineTo(40, 15);
    ctx.closePath();
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#e6a100';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ff4d4f';
    ctx.fillRect(-35, 10, 70, 8);

    const dots = [[-50, -25], [0, -35], [50, -25]];
    dots.forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(dx, dy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4d4f';
      ctx.fill();
    });

    ctx.restore();
    return;
  }

  const imgObj = loadedHatImages[currentHat.id];
  if (imgObj) {
    ctx.save();
    ctx.translate(hatTransform.x, hatTransform.y);
    ctx.scale(hatTransform.scale, hatTransform.scale);
    const imgW = imgObj.naturalWidth || 100;
    const imgH = imgObj.naturalHeight || 100;
    const aspect = imgH / imgW;
    const drawW = hatTransform.width;
    const drawH = hatTransform.width * aspect;
    ctx.drawImage(imgObj, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

function redrawAll() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBaseCat();
  if (drawCanvas) ctx.drawImage(drawCanvas, 0, 0);
  drawSelectedHat();
}

function initUI() {
  renderHatOptions();
  const coatColorEl = document.getElementById('coatColor');
  if (coatColorEl) coatColorEl.addEventListener('input', (e) => brushColor = e.target.value);

  const brushSizeEl = document.getElementById('brushSize');
  if (brushSizeEl) brushSizeEl.addEventListener('input', (e) => brushSize = e.target.value);

  const hatScaleRangeEl = document.getElementById('hatScaleRange');
  if (hatScaleRangeEl) {
    hatScaleRangeEl.addEventListener('input', (e) => {
      hatTransform.scale = parseFloat(e.target.value);
      redrawAll();
    });
  }

  saveState();
  redrawAll();
}

function renderHatOptions() {
  const hatOptionsBox = document.getElementById('hatOptionsBox');
  if (!hatOptionsBox) return;
  hatOptionsBox.innerHTML = '';

  const start = hatPage * itemsPerHatPage;
  const end = Math.min(start + itemsPerHatPage, hatData.length);
  const pageItems = hatData.slice(start, end);

  pageItems.forEach(hat => {
    const btn = document.createElement('button');
    btn.className = 'hat-item-btn';
    if (currentHat && currentHat.id === hat.id) btn.classList.add('active');
    btn.innerText = hat.name;
    btn.onclick = () => selectHat(hat);
    hatOptionsBox.appendChild(btn);
  });
}

function prevHatPage() { if (hatPage > 0) { hatPage--; renderHatOptions(); } }
function nextHatPage() { if ((hatPage + 1) * itemsPerHatPage < hatData.length) { hatPage++; renderHatOptions(); } }

function selectHat(hat) {
  if (isDrawing) { isDrawing = false; saveState(); }
  isDraggingHat = false;
  setBrushTool('move', document.getElementById('moveToolBtn'));
  currentHat = hat;
  const hatControlRow = document.getElementById('hatControlRow');
  if (hatControlRow) {
    hatControlRow.style.display = 'flex';
    if (!document.getElementById('removeHatBtn')) {
      const removeBtn = document.createElement('button');
      removeBtn.id = 'removeHatBtn';
      removeBtn.className = 'action-sub-btn';
      removeBtn.style.backgroundColor = '#ff4d4f';
      removeBtn.style.color = '#ffffff';
      removeBtn.style.marginLeft = '8px';
      removeBtn.innerText = '🗑️ 移除头饰';
      removeBtn.onclick = removeHat;
      hatControlRow.appendChild(removeBtn);
    }
  }
  renderHatOptions();
  redrawAll();
}

function removeHat() {
  currentHat = null;
  const hatControlRow = document.getElementById('hatControlRow');
  if (hatControlRow) hatControlRow.style.display = 'none';
  renderHatOptions();
  redrawAll();
}

function resetHatTransform() {
  hatTransform.x = 150; hatTransform.y = 65; hatTransform.scale = 1.0;
  const hatScaleRange = document.getElementById('hatScaleRange');
  if (hatScaleRange) hatScaleRange.value = 1.0;
  redrawAll();
}

function useTemplateCat() {
  currentMode = 'template';
  const modeBtns = document.querySelectorAll('.mode-btn');
  if (modeBtns.length >= 2) { modeBtns[0].classList.add('active'); modeBtns[1].classList.remove('active'); }
  redrawAll();
}

function useBlankCanvas() {
  currentMode = 'blank';
  const modeBtns = document.querySelectorAll('.mode-btn');
  if (modeBtns.length >= 2) { modeBtns[1].classList.add('active'); modeBtns[0].classList.remove('active'); }
  redrawAll();
}

function setBrushTool(tool, btnElement) {
  currentTool = tool;
  document.querySelectorAll('.brush-btn').forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
}

function getCanvasPos(e) {
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  const point = e.touches ? e.touches[0] : e;
  return { x: (point.clientX - rect.left) * canvas.width / rect.width,
    y: (point.clientY - rect.top) * canvas.height / rect.height };
}

function handlePointerDown(e) {
  const pos = getCanvasPos(e);
  if (currentTool === 'move' && currentHat) {
    const dx = pos.x - hatTransform.x;
    const dy = pos.y - hatTransform.y;
    const hitRadius = (hatTransform.width * hatTransform.scale) / 2;
    if (Math.sqrt(dx * dx + dy * dy) < hitRadius + 20) {
      isDraggingHat = true;
      dragStartX = pos.x - hatTransform.x;
      dragStartY = pos.y - hatTransform.y;
      return;
    }
  }

  if (currentTool !== 'move' && drawCtx) {
    isDrawing = true;
    drawCtx.beginPath();
    drawCtx.moveTo(pos.x, pos.y);
  }
}

function handlePointerMove(e) {
  const pos = getCanvasPos(e);
  if (isDraggingHat && currentTool === 'move') {
    hatTransform.x = pos.x - dragStartX;
    hatTransform.y = pos.y - dragStartY;
    redrawAll();
    return;
  }

  if (isDrawing && currentTool !== 'move' && drawCtx) {
    drawCtx.lineWidth = brushSize;
    drawCtx.lineCap = 'round';
    if (currentTool === 'eraser') {
      drawCtx.globalCompositeOperation = 'destination-out';
    } else {
      drawCtx.globalCompositeOperation = 'source-over';
      drawCtx.strokeStyle = brushColor;
    }
    drawCtx.lineTo(pos.x, pos.y);
    drawCtx.stroke();
    redrawAll();
  }
}

function handlePointerUp() {
  if (isDraggingHat) isDraggingHat = false;
  if (isDrawing) { isDrawing = false; saveState(); }
}

if (canvas) {
  canvas.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button > 0) return;
    canvas.setPointerCapture(e.pointerId); handlePointerDown(e);
  });
  canvas.addEventListener('pointermove', e => { if (e.isPrimary) handlePointerMove(e); });
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
  canvas.addEventListener('lostpointercapture', handlePointerUp);
}

function undoDrawing() {
  if (historyIndex > 0 && drawCtx) {
    historyIndex--;
    drawCtx.clearRect(0, 0, canvas.width, canvas.height);
    drawCtx.putImageData(drawingHistory[historyIndex], 0, 0);
    redrawAll();
  }
}

function redoDrawing() {
  if (historyIndex < drawingHistory.length - 1 && drawCtx) {
    historyIndex++;
    drawCtx.clearRect(0, 0, canvas.width, canvas.height);
    drawCtx.putImageData(drawingHistory[historyIndex], 0, 0);
    redrawAll();
  }
}

function clearHandDrawing() {
  if (drawCtx && canvas) {
    drawCtx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
    redrawAll();
  }
}

// ===== 录音与试听系统 =====
let mediaRecorder = null, audioChunks = [], audioDataBase64 = null, activeAudioObject = null, isRecording = false;
let recordingBusy = false, recordingTimer = null;

async function toggleRecord() {
  if (recordingBusy || submitting) return;
  const recordBtn = document.getElementById('recordBtn');
  const playBtn = document.getElementById('playBtn');
  const reRecordBtn = document.getElementById('reRecordBtn');
  const voiceStatus = document.getElementById('voiceStatus');

  if (!isRecording) {
    recordingBusy = true;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioDataBase64 = null;
      if (activeAudioObject) { activeAudioObject.pause(); activeAudioObject = null; }

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = event => { if (event.data.size > 0) audioChunks.push(event.data); };
      mediaRecorder.onstop = async () => {
        clearTimeout(recordingTimer);
        isRecording = false;
        recordingBusy = true;
        if (recordBtn) recordBtn.innerText = '🎙️ 点击开始录音';
        const rawBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        
        const reader = new FileReader();
        reader.onloadend = () => {
          recordingBusy = false;
          if (typeof reader.result !== 'string' || reader.result.length > 3000000) {
            audioDataBase64 = null;
            if (voiceStatus) voiceStatus.innerText = '录音太大或处理失败，请重新录制较短的语音。';
            return;
          }
          audioDataBase64 = reader.result;
          if (playBtn) playBtn.style.display = 'inline-block';
          if (reRecordBtn) reRecordBtn.style.display = 'inline-block';
          if (voiceStatus) voiceStatus.innerText = '✅ 录音已就绪，可试听！';
        };
        reader.readAsDataURL(rawBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      recordingBusy = false;
      isRecording = true;
      recordingTimer = setTimeout(() => { if (isRecording) toggleRecord(); }, 60000);
      if (recordBtn) recordBtn.innerText = '⏹️ 停止录音';
      if (voiceStatus) voiceStatus.innerText = '🔴 正在录音...';
    } catch (err) {
      recordingBusy = false;
      if (stream) stream.getTracks().forEach(track => track.stop());
      alert('无法开启麦克风，请检查浏览器权限。');
    }
  } else {
    clearTimeout(recordingTimer);
    recordingBusy = true;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    isRecording = false;
    if (recordBtn) recordBtn.innerText = '🎙️ 点击开始录音';
  }
}

function playVoice() {
  const voiceStatus = document.getElementById('voiceStatus');
  if (!audioDataBase64) {
    alert('还没有录音数据哦！');
    return;
  }
  if (activeAudioObject) { activeAudioObject.pause(); activeAudioObject = null; }

  activeAudioObject = new Audio();
  activeAudioObject.src = audioDataBase64;
  activeAudioObject.play().then(() => {
    if (voiceStatus) voiceStatus.innerText = '▶️ 正在播放试听...';
  }).catch(e => {
    alert('播放失败，请尝试重新录制。');
  });

  activeAudioObject.onended = () => {
    if (voiceStatus) voiceStatus.innerText = '✅ 播放完毕！';
  };
}

function reRecordVoice() {
  if (isRecording || recordingBusy || submitting) return;
  audioDataBase64 = null;
  if (activeAudioObject) { activeAudioObject.pause(); activeAudioObject = null; }
  const playBtn = document.getElementById('playBtn');
  const reRecordBtn = document.getElementById('reRecordBtn');
  const recordBtn = document.getElementById('recordBtn');
  const voiceStatus = document.getElementById('voiceStatus');
  if (playBtn) playBtn.style.display = 'none';
  if (reRecordBtn) reRecordBtn.style.display = 'none';
  if (recordBtn) recordBtn.innerText = '🎙️ 点击开始录音';
  if (voiceStatus) voiceStatus.innerText = '未录音';
}

function getFinalFlattenedCatImage() {
  if (!canvas || !ctx) return '';
  if (currentMode === 'template' && !baseCatImg.naturalWidth) throw new Error('猫咪模板尚未载入，请稍后再试，或选择完全自制。');
  if (currentHat && currentHat.src && !loadedHatImages[currentHat.id]) throw new Error('头饰尚未载入，请稍后再试。');
  redrawAll();
  return canvas.toDataURL('image/png');
}

// ===== 抓猫机与 Supabase 交互逻辑 =====
let allCatCards = []; 
let currentDisplayedCats = []; 
let unlockedCards = []; 
let currentModalCard = null;
let latestCreatedCard = null;
let modalAudioPlayer = null;

let clawPosX = 50;
let isGrabbing = false;
const MAX_CABIN_CATS = 20;
let seenCatKeys = new Set();
let houseLoadPromise = null;
let cacheRestored = false;
let cacheTimer;
let submitting = false;
let cacheRestorePromise = null;
let cacheWriteQueue = Promise.resolve();

function toCatCard(item) {
  return {id: item.id, request_id: item.client_request_id, ordered_at: item.display_order_at || item.created_at,
    revision: item.revision, fan_name: item.name,
    cat_origin: item.location, blessing: item.blessing, cat_image: item.cat_type, voice_data: item.audio_url || ''};
}

function cardNumber(card) {
  if (card.display_number != null) return String(card.display_number);
  const index = allCatCards.findIndex(item => sameIdentity(item, card));
  return card.id != null ? (index >= 0 ? String(index + 1) : '已移除') : machinePreview ? `测试-${card.cat_index_num}` : '待核对';
}

function numberCatCards(cards) {
  return [...cards].sort((a, b) => String(a.ordered_at || '').localeCompare(String(b.ordered_at || '')) ||
    (BigInt(a.id || 0) < BigInt(b.id || 0) ? -1 : BigInt(a.id || 0) > BigInt(b.id || 0) ? 1 : 0))
    .map((card, index) => ({...card, display_number: index + 1}));
}

function sameIdentity(a, b) { return catKey(a) === catKey(b); }

function uniqueCards(cards) {
  return [...new Map((Array.isArray(cards) ? cards : []).filter(c => c && typeof c.cat_image === 'string').map(c => [catKey(c), c])).values()];
}

function catKey(card) {
  if (card.id != null) return `id:${card.id}`;
  return JSON.stringify([card.fan_name, card.cat_origin, card.blessing, card.cat_image, card.voice_data || '']);
}

function houseStatus(message) {
  const el = document.getElementById('houseStatus');
  if (el) el.textContent = message;
}

function openHouseCache() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('xiaojie-cat-house', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('本机存储被其他页面阻挡，请关闭其他游戏分頁。'));
  });
}

async function restoreHouseCache() {
  if (machinePreview || cacheRestored) return;
  if (cacheRestorePromise) return cacheRestorePromise;
  cacheRestorePromise = readHouseCache();
  return cacheRestorePromise;
}

async function readHouseCache() {
  let db;
  try {
    db = await openHouseCache();
    const snapshot = await new Promise((resolve, reject) => {
      const request = db.transaction('snapshots').objectStore('snapshots').get(SUPABASE_URL);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (snapshot && Array.isArray(snapshot.cards)) {
      allCatCards = uniqueCards(snapshot.cards);
      unlockedCards = uniqueCards(snapshot.collection);
      currentDisplayedCats = uniqueCards(snapshot.cabin).filter(c => !unlockedCards.some(saved => sameIdentity(c, saved))).slice(0, MAX_CABIN_CATS);
      seenCatKeys = new Set(snapshot.seen || []);
    }
  } catch (error) { console.warn('本机缓存不可用', error); }
  finally { cacheRestored = true; if (db) db.close(); }
}

function saveHouseCache() {
  if (machinePreview || !cacheRestored) return;
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => { flushHouseCache(); }, 150);
}

function flushHouseCache() {
  if (machinePreview || !cacheRestored) return Promise.resolve();
  clearTimeout(cacheTimer);
  const snapshot = structuredClone({cards: allCatCards, cabin: currentDisplayedCats, collection: unlockedCards, seen: [...seenCatKeys]});
  cacheWriteQueue = cacheWriteQueue.catch(() => {}).then(async () => {
    let db;
    try {
      db = await openHouseCache();
      const transaction = db.transaction('snapshots', 'readwrite');
      transaction.objectStore('snapshots').put(snapshot, SUPABASE_URL);
      await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch (error) { houseStatus('无法保存离线副本；当前页面仍可继续玩。'); }
    finally { if (db) db.close(); }
  });
  return cacheWriteQueue;
}

document.addEventListener('visibilitychange', () => { if (document.hidden) flushHouseCache(); });

function togglePage(pageId, reloadMachine = true) {
  if (submitting || isGrabbing) { alert('请等这次操作完成后再切换页面。'); return; }
  if (isRecording || recordingBusy) { alert('请先停止录音，等录音准备完成后再切换页面。'); return; }
  document.querySelectorAll('.page-section').forEach(p => p.style.display = 'none');
  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.style.display = 'block';
  if (pageId === 'page2') {
    if (reloadMachine) loadCatHouseData();
    else resizeMachineCabin();
  }
  if (pageId === 'page3') renderAlbum();
}

function openCollection() {
  if (isGrabbing) {
    alert('等这次抓取结束，再打开收藏吧！');
    return;
  }
  togglePage('page3');
}

// Reset only the editor. Never delete cloud records or the collection.
async function remakeMyCat() {
  if (isGrabbing || submitting || isRecording || recordingBusy) return;
  const confirmRemake = confirm('重新制作会清空当前画板和表单，已提交的作品与大合照会保留。继续吗？');
  if (!confirmRemake) return;

  drawingHistory = []; historyIndex = -1;
  clearHandDrawing();
  removeHat();
  const fanName = document.getElementById('fanName');
  const catOrigin = document.getElementById('catOrigin');
  const blessing = document.getElementById('blessing');
  if (fanName) fanName.value = '';
  if (catOrigin) catOrigin.value = '';
  if (blessing) blessing.value = '';
  reRecordVoice();

  latestCreatedCard = null;
  resetHatTransform();
  setBrushTool('move', document.getElementById('moveToolBtn'));

  togglePage('page1');
}

// Persist the request BEFORE writing, so a lost response cannot become a blind retry.
async function pendingSubmission(value) {
  const db = await openHouseCache();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', value === undefined ? 'readonly' : 'readwrite');
      const store = tx.objectStore('snapshots'), key = SUPABASE_URL + ':submission';
      const request = value === undefined ? store.get(key) : store.put(value, key);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

async function timedQuery(build) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try { return await build().abortSignal(controller.signal); }
  finally { clearTimeout(timer); }
}

async function resolveSubmission(pending) {
  if (!pending.attempted) return null;
  let query;
  if (pending.mode === 'legacy') {
    // Old schema: confirm an existing exact match, never resend an uncertain write.
    query = () => supabaseClient.from('cats').select('*').eq('name', pending.payload.name)
      .eq('location', pending.payload.location).order('id', {ascending: false}).limit(100);
  } else query = () => supabaseClient.from('cats').select('*').eq('client_request_id', pending.token).limit(1);
  const result = await timedQuery(query);
  if (result.error) throw new Error('上次提交结果尚无法核对，请恢复连线后再按提交；不会重复上传。');
  return (result.data || []).find(row => pending.mode !== 'legacy' ||
    (row.blessing === pending.payload.blessing && row.cat_type === pending.payload.cat_type &&
      (row.audio_url || '') === pending.payload.audio_url)) || null;
}

function confirmCatOverwrite(row) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'card-modal-content';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '同名作品确认');
    const text = document.createElement('p');
    text.textContent = `已经有一位叫「${row.name}」的朋友提交过作品。如果这不是你，请换一个名字；如果是你，可以选择覆盖。`;
    const img = document.createElement('img');
    img.src = row.cat_type;
    img.alt = '目前的同名作品';
    img.style.cssText = 'display:block;width:160px;max-width:100%;margin:16px auto';
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'skip-creation-btn'; cancel.textContent = '返回改名';
    const accept = document.createElement('button');
    accept.type = 'button'; accept.className = 'primary-btn'; accept.textContent = '这是我，我要覆盖';
    const previousFocus = document.activeElement;
    const finish = value => { overlay.remove(); previousFocus?.focus(); resolve(value); };
    cancel.onclick = () => finish(false);
    let secondStep = false;
    accept.onclick = () => {
      if (!secondStep) {
        secondStep = true;
        text.textContent = '覆盖后，原本的图片、祝福与语音会被取代，此行为无法逆转、无法复原。确定继续吗？';
        accept.textContent = '确定覆盖'; cancel.textContent = '取消'; cancel.focus();
      } else finish(true);
    };
    overlay.onkeydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(false); }
      if (event.key === 'Tab') { event.preventDefault(); (document.activeElement === cancel ? accept : cancel).focus(); }
    };
    box.append(text, img, cancel, accept); overlay.appendChild(box); document.body.appendChild(overlay);
    cancel.focus();
  });
}

async function submitToSupabase() {
  if (machinePreview) { alert('预览模式不提交作品，请返回正式页面制作。'); return; }
  if (submitting) return;
  if (isRecording || recordingBusy) { alert('请先停止录音，并等待录音准备完成。'); return; }
  if (!supabaseClient || navigator.onLine === false) { alert('目前无法连接，请保留此页面，连网后再提交。'); return; }
  submitting = true;
  const button = document.getElementById('submitBtn');
  if (button) { button.disabled = true; button.textContent = '正在保存……'; }
  let success = false;
  try {
    await restoreHouseCache();
    let pending = await pendingSubmission();
    if (pending && pending.done) {
      const p = pending.payload;
      const unchanged = p.name === document.getElementById('fanName').value.trim() &&
        p.location === (document.getElementById('catOrigin').value.trim() || '猫咪星球') &&
        p.blessing === (document.getElementById('blessing').value.trim() || '生日快乐！') &&
        p.audio_url === (audioDataBase64 || '') && p.cat_type === getFinalFlattenedCatImage();
      if (!unchanged) pending = null;
    }
    if (!pending) {
      const name = document.getElementById('fanName').value.trim();
      const location = document.getElementById('catOrigin').value.trim() || '猫咪星球';
      const blessing = document.getElementById('blessing').value.trim() || '生日快乐！';
      if (!name) throw new Error('请输入昵称。');
      if (name.length > 80 || location.length > 120 || blessing.length > 2000) throw new Error('昵称限 80 字、出生地限 120 字、祝福限 2000 字。');
      pending = {token: crypto.randomUUID(), mode: 'rpc', attempted: false, payload: {
        name, location, blessing, cat_type: getFinalFlattenedCatImage(), audio_url: audioDataBase64 || ''
      }};
      await pendingSubmission(pending);
    }
    // A pending request always takes precedence over newly edited fields.
    let row = pending.done ? pending.row : pending.mode === 'rpc' ? null : await resolveSubmission(pending);
    if (!row) {
      if (pending.mode === 'legacy' && pending.attempted) throw new Error('上次提交结果仍未确认。为避免重复作品，已暂停再次上传，请联系管理员核对；原提交内容已保存在本机。');
      pending.mode = 'rpc';
      while (!row) {
        pending.attempted = true;
        await pendingSubmission(pending);
        const result = await timedQuery(() => supabaseClient.rpc('submit_cat_v2', {
          p_request_id: pending.token, p_payload: pending.payload,
          p_expected_id: pending.expectedId || null, p_expected_revision: pending.expectedRevision || null
        }));
        if (result.error) {
          if (['22023', '42501', '23514'].includes(result.error.code)) await pendingSubmission(null);
          throw new Error(result.error.code === 'PGRST202' ? '提交服务尚未更新，请联系管理员执行数据库更新。' : '尚未确认保存结果，请稍后再次提交核对；本次内容已保存在本机。');
        }
        const response = result.data;
        if (response.status === 'saved') row = response.row;
        else if (response.status === 'conflict') {
          if (!await confirmCatOverwrite(response.row)) {
            await pendingSubmission(null);
            return;
          }
          pending.expectedId = response.row.id;
          pending.expectedRevision = response.row.revision;
        } else {
          await pendingSubmission(null);
          throw new Error(response.status === 'ambiguous' ? '目前有多份同名作品，请换一个名字，或请管理员先整理同名作品。' : '这份作品已被移除，请重新提交。');
        }
      }
    }
    if (!row || row.id == null) throw new Error('服务器未返回作品编号，请稍后再次核对。');
    latestCreatedCard = toCatCard(row);
    allCatCards = numberCatCards(uniqueCards([...allCatCards, latestCreatedCard]));
    await flushHouseCache();
    await pendingSubmission({...pending, done: true, row});
    success = true;
  } catch (error) {
    console.warn('Submission did not complete:', error);
    alert(error.message || '暂时无法保存，请保留页面并稍后重试。');
  } finally {
    submitting = false;
    if (button) { button.disabled = false; button.textContent = '进入猫窝'; }
  }
  if (success) togglePage('page2');
}

function loadCatHouseData(refresh = false) {
  if (!houseLoadPromise) {
    const button = document.querySelector('.refresh-btn');
    if (button) button.disabled = true;
    houseLoadPromise = updateCatHouseData(refresh).finally(() => {
      houseLoadPromise = null;
      if (button) button.disabled = false;
    });
  }
  return houseLoadPromise;
}

async function updateCatHouseData(refresh = false) {
  await restoreHouseCache();
  const previousCabin = currentDisplayedCats.map(catKey).join('|');
  if (!refresh) renderStackedCats();
  renderAlbum();
  let dbCards = [];
  let loaded = false;
  if (supabaseClient && navigator.onLine !== false) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const data = [];
      for (let offset = 0; ; offset += 500) {
        const result = await supabaseClient.from('cats').select('*').order('id').range(offset, offset + 499).abortSignal(controller.signal);
        if (result.error) throw result.error;
        data.push(...(result.data || []));
        if (!result.data || result.data.length < 500) break;
      }
      loaded = true;
      if (data.length > 0) {
        dbCards = numberCatCards(uniqueCards(data.map(toCatCard)));
      }
    } catch (e) {
      houseStatus(allCatCards.length ? '暂时无法连线，继续使用这台设备已保存的猫咪。' : '暂时无法连线，也没有离线副本；请连网后再试。');
    } finally { clearTimeout(timeout); }
  } else {
    houseStatus(allCatCards.length ? '离线模式：使用这台设备已保存的猫咪。' : '目前无法连线，且这台设备尚未保存猫咪数据。');
  }

  if (loaded) {
    const migrate = card => {
      const saved = dbCards.find(row => card.id != null ? sameIdentity(row, card) : sameCatCard(row, card));
      if (saved && seenCatKeys.has(catKey(card))) seenCatKeys.add(catKey(saved));
      return saved || card;
    };
    const stillExists = card => card.id == null || dbCards.some(row => sameIdentity(row, card));
    currentDisplayedCats = uniqueCards(currentDisplayedCats.filter(stillExists).map(migrate));
    unlockedCards = uniqueCards(unlockedCards.filter(stillExists).map(migrate));
    if (latestCreatedCard && !stillExists(latestCreatedCard)) latestCreatedCard = null;
    allCatCards = dbCards;
    houseStatus('');
  }

  if (latestCreatedCard) {
    const savedCard = allCatCards.find(card => sameCatCard(card, latestCreatedCard));
    if (savedCard) {
      if (seenCatKeys.has(catKey(latestCreatedCard))) seenCatKeys.add(catKey(savedCard));
      latestCreatedCard = savedCard;
    }
    else {
      allCatCards.push(latestCreatedCard);
    }
  }
  const hasNew = availableOutsideCats().length > 0;
  currentDisplayedCats = createCatBatch(refresh);
  if (!refresh || hasNew || previousCabin !== currentDisplayedCats.map(catKey).join('|')) renderStackedCats();
  renderAlbum();
  if (refresh && !hasNew && loaded) {
    shakeCatMachine();
    showMachineToast('没有更多球可以补充了哦');
  }
}

function sameCatCard(a, b) {
  if (a.id != null && b.id != null) return sameIdentity(a, b);
  return a.fan_name === b.fan_name && a.cat_origin === b.cat_origin &&
    a.blessing === b.blessing && a.cat_image === b.cat_image && (a.voice_data || '') === (b.voice_data || '');
}

function availableOutsideCats() {
  const excluded = new Set([...currentDisplayedCats, ...unlockedCards].map(catKey));
  return uniqueCards(allCatCards).filter(card => !excluded.has(catKey(card)));
}
function createCatBatch(refresh = true) {
  const pool = availableOutsideCats();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const collected = new Set(unlockedCards.map(catKey));
  const remaining = uniqueCards(currentDisplayedCats).filter(card => !collected.has(catKey(card)));
  return (refresh ? [...pool, ...remaining] : [...remaining, ...pool]).slice(0, MAX_CABIN_CATS);
}

let machineToastTimer;
function showMachineToast(message) {
  let toast = document.getElementById('machineToast');
  if (!toast) {
    toast = document.createElement('div'); toast.id = 'machineToast';
    toast.className = 'machine-toast'; toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  clearTimeout(machineToastTimer);
  toast.textContent = message; toast.hidden = false;
  machineToastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
}

// Physics-driven capsule machine; no additional libraries required.
const machine = { balls: [], x: 0, y: 16, vx: 0, target: .5, phase: 'idle', held: null, timer: 0, last: 0, accumulator: 0, started: false };
const ballRadius = 27;
function cabinSize() { const el = document.getElementById('machineGlass'); return {w: el.clientWidth, h: el.clientHeight}; }
function renderStackedCats() {
  const container = document.getElementById('stackedCats');
  if (!container) return;
  resizeMachineCabin();
  const {w} = cabinSize(), previous = machine.balls;
  machine.balls = currentDisplayedCats.map((card, i) => {
    const old = previous.find(b => sameIdentity(b.card, card));
    if (old) { old.card = card; return old; }
    const el = document.createElement('div'); el.className = 'stacked-cat-item';
    el.style.setProperty('--ball-color', ['#f7c5e8','#bbdefb','#d5c5ff','#ffe5a3'][i%4]);
    const img = document.createElement('img'); img.src = card.cat_image; img.alt = card.fan_name || '貓咪球';
    el.appendChild(img); container.appendChild(el);
    return {card, el, x: 27 + Math.random()*Math.max(0,w-54), y: -27-i*60, vx: (Math.random()-.5)*100, vy: 0, angle: 0};
  });
  previous.filter(b => !machine.balls.includes(b)).forEach(b => b.el.remove());
  if (!machine.started) { machine.started = true; machine.x = w/2; requestAnimationFrame(machineFrame); }
}
function resizeMachineCabin() {
  const glass = document.getElementById('machineGlass');
  if (!glass || !glass.clientWidth) return;
  const columns = Math.max(1, Math.floor(glass.clientWidth / (ballRadius * 2)));
  const height = Math.max(350, Math.ceil(currentDisplayedCats.length / columns) * ballRadius * 2 + 110);
  glass.style.height = `${height}px`;
}
window.addEventListener('resize', resizeMachineCabin);
function shakeCatMachine() {
  if (isGrabbing) return;
  machine.balls.forEach(b => { b.vx += (Math.random()-.5)*650; b.vy = -250-Math.random()*220; });
}
async function refreshCatBatch() {
  if (isGrabbing || houseLoadPromise) return;
  await loadCatHouseData(true);
}
function moveClaw(direction) {
  if (isGrabbing) return;
  machine.target = Math.max(.12,Math.min(.88,machine.target+(direction==='left'?-.12:.12)));
}
function triggerGrab() {
  if (isGrabbing || houseLoadPromise || !machine.balls.length) return;
  isGrabbing = true; machine.phase = 'align'; machine.timer = 0;
}
function stepMachine(dt) {
  const {w,h} = cabinSize(); if (!w || !h) return;
  const m = machine, r = ballRadius, targetX = Math.max(r,Math.min(w-r,m.target*w));
  m.vx += ((targetX-m.x)*38-m.vx*12)*dt;
  m.x = Math.max(r,Math.min(w-r,m.x+m.vx*dt));
  for (const b of m.balls) {
    if (b===m.held) continue;
    b.vy += 900*dt; b.vx *= Math.exp(-.35*dt);
    b.x += b.vx*dt; b.y += b.vy*dt; b.angle += b.vx*dt/r;
  }
  for (let pass=0;pass<6;pass++) {
    for (let i=0;i<m.balls.length;i++) {
      const a=m.balls[i]; if (a===m.held) continue;
      for (let j=i+1;j<m.balls.length;j++) {
        const b=m.balls[j]; if(b===m.held) continue;
        const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
        if(d>=r*2) continue;
        const nx=d>.001?dx/d:1,ny=d>.001?dy/d:0,c=(r*2-d)/2;
        a.x-=nx*c; a.y-=ny*c; b.x+=nx*c; b.y+=ny*c;
        const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        if(v<0) { const k=-v*.58; a.vx-=k*nx; a.vy-=k*ny; b.vx+=k*nx; b.vy+=k*ny; }
      }
    }
    for(const b of m.balls) {
      if(b===m.held) continue;
      if(b.x<r) {b.x=r;b.vx=Math.abs(b.vx)*.45;}
      if(b.x>w-r) {b.x=w-r;b.vx=-Math.abs(b.vx)*.45;}
      if(b.y>h-r-5) {b.y=h-r-5;b.vy=b.vy>35?-b.vy*.28:0;b.vx*=.94;}
    }
  }
  m.timer+=dt;
  const phase=p=>{m.phase=p;m.timer=0;},claw=document.getElementById('claw');
  if(m.phase==='align' && Math.abs(targetX-m.x)<1 && Math.abs(m.vx)<4) phase('down');
  if(m.phase==='down') {
    m.y+=105*clawVerticalSpeedMultiplier()*dt;
    const tip=m.y+48;
    const candidate=m.balls.filter(b=>Math.abs(b.x-m.x)<r*.8 && Math.abs(b.y-tip)<r*.65).sort((a,b)=>a.y-b.y)[0];
    if(candidate || tip>=h-r-5) {m.held=candidate||null;claw.classList.add('closed');phase('close');}
  } else if(m.phase==='close' && m.timer>.35) phase('up');
  else if(m.phase==='up') {
    m.y=Math.max(16,m.y-90*clawVerticalSpeedMultiplier()*dt);
    if(m.y===16) {
      if(m.held) {m.target=.88;phase('carry');}
      else {claw.classList.remove('closed');m.phase='idle';isGrabbing=false;}
    }
  } else if(m.phase==='carry' && Math.abs(targetX-m.x)<1 && Math.abs(m.vx)<4) {
    claw.classList.remove('closed');phase('release');
  } else if(m.phase==='release' && m.timer>.25) {
    m.held.y+=500*(m.timer-.25)*dt;
    if(m.held.y>h+r) {
      const card=m.held.card; m.held=null;
      currentDisplayedCats=currentDisplayedCats.filter(c=>!sameIdentity(c,card));renderStackedCats();
      const slot=document.getElementById('caughtCatSlot'),img=document.createElement('img');
      img.src=card.cat_image;img.alt=card.fan_name;slot.replaceChildren(img);
      if(!unlockedCards.some(c=>sameIdentity(c,card))) unlockedCards.push(card);
      renderAlbum();m.phase='idle';isGrabbing=false;showCardModal(card);
    }
  }
  if(m.held && m.phase!=='release') {
    m.held.x=m.x;m.held.y+=(m.y+48-m.held.y)*Math.min(1,dt*22);m.held.vx=0;m.held.vy=0;
  }
}
function machineFrame(now) {
  const m=machine,visible=document.getElementById('machineGlass').clientWidth>0 && !document.hidden;
  m.accumulator+=visible?Math.min((now-(m.last||now))/1000,.05):0;m.last=now;
  while(m.accumulator>=1/120) {stepMachine(1/120);m.accumulator-=1/120;}
  if(visible) {
    for(const b of m.balls) b.el.style.transform=`translate(${b.x-27}px, ${b.y-27}px) rotate(${b.angle}rad)`;
    const claw=document.getElementById('claw'),line=document.getElementById('clawLine');
    // Empty grabs keep down.png; releasing the prize immediately restores it.
    claw.classList.toggle('has-prize', Boolean(m.held) && m.phase !== 'release');
    claw.style.left=`${m.x}px`;claw.style.top=`${m.y}px`;
    claw.style.transform=`translateX(-50%) rotate(${Math.max(-8,Math.min(8,-m.vx*.045))}deg)`;
    line.style.left=`${m.x}px`;line.style.height=`${Math.max(0,m.y-10)}px`;
  }
  requestAnimationFrame(machineFrame);
}
let modalReadOnly = false;
function showCardModal(card, readOnly = false) {
  modalReadOnly = readOnly;
  const returnButton = document.querySelector('[onclick="putCatBackToMachine()"]');
  if (returnButton) returnButton.style.display = readOnly ? 'none' : '';
  currentModalCard = card;
  const modalCatImg = document.getElementById('modalCatImg');
  const modalCatIndex = document.getElementById('modalCatIndex');
  const modalFanName = document.getElementById('modalFanName');
  const modalCatOrigin = document.getElementById('modalCatOrigin');
  const modalBlessingText = document.getElementById('modalBlessingText');

  if (modalCatImg) modalCatImg.src = card.cat_image;
  if (modalCatIndex) modalCatIndex.innerText = `猫咪编号 ${cardNumber(card)}`;
  if (modalFanName) modalFanName.innerText = card.fan_name || '测试喵';
  if (modalCatOrigin) modalCatOrigin.innerText = card.cat_origin || '猫咪星球';
  if (modalBlessingText) modalBlessingText.innerText = card.blessing || '生日快乐！';

  const voiceBox = document.getElementById('modalVoicePlayerBox');
  if (voiceBox) voiceBox.style.display = card.voice_data ? 'block' : 'none';

  const cardModal = document.getElementById('cardModal');
  if (cardModal) cardModal.style.display = 'flex';
}

function putCatBackToMachine() {
  if (modalReadOnly) return;
  if (isGrabbing || houseLoadPromise) return;
  if (currentModalCard) {
    const matchesCard = card => sameIdentity(card, currentModalCard);
    const existsInCabin = currentDisplayedCats.some(matchesCard);
    if (!existsInCabin && currentDisplayedCats.length < MAX_CABIN_CATS) {
      currentDisplayedCats.push(currentModalCard);
      renderStackedCats();
    }
    unlockedCards = unlockedCards.filter(card => !matchesCard(card));
    renderAlbum();
    const slot = document.getElementById('caughtCatSlot');
    if (slot) slot.innerHTML = '';

    closeModal();
    currentModalCard = null;
    shakeCatMachine();
  }
}

function playModalVoice() {
  if (currentModalCard && currentModalCard.voice_data) {
    if (modalAudioPlayer) { modalAudioPlayer.pause(); modalAudioPlayer = null; }
    modalAudioPlayer = new Audio();
    modalAudioPlayer.src = currentModalCard.voice_data;
    modalAudioPlayer.play().catch(e => {
      alert('语音播放失败，请重新尝试。');
    });
  }
}

function closeModal() {
  if (modalAudioPlayer) modalAudioPlayer.pause();
  const cardModal = document.getElementById('cardModal');
  if (cardModal) cardModal.style.display = 'none';
}

// Local preview helpers: change collections without animation or database writes.
function testCollectionChange(action) {
  if (!machinePreview || isGrabbing || houseLoadPromise) return;
  if (action === 'add') {
    const available = allCatCards.filter(card => !unlockedCards.some(saved =>
      sameIdentity(saved, card)));
    if (!available.length) return;
    const card = available[Math.floor(Math.random() * available.length)];
    unlockedCards.push(card);
    currentDisplayedCats = currentDisplayedCats.filter(item => !sameIdentity(item, card));
  } else if (action === 'remove') {
    const card = unlockedCards.pop();
    if (!card) return;
    if (currentDisplayedCats.length < MAX_CABIN_CATS && !currentDisplayedCats.includes(card)) {
      currentDisplayedCats.push(card);
    }
  } else return;
  closeModal();
  renderStackedCats();
  renderAlbum();
}

window.addEventListener('keydown', event => {
  if (!machinePreview || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
  const target = event.target;
  if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
  const action = event.code === 'KeyA' ? 'add' : event.code === 'KeyZ' ? 'remove' : null;
  if (!action) return;
  event.preventDefault();
  testCollectionChange(action);
});

function collectionRowSizes(count, width) {
  if (!count) return [];
  const itemWidth = window.innerWidth <= 400 ? 78 : 100;
  const maxColumns = Math.max(1, Math.floor((width + 12) / (itemWidth + 12)));
  const rows = Math.max(Math.round(Math.sqrt(count / 2.5)), Math.ceil(count / maxColumns), 1);
  return Array.from({length: rows}, (_, index) => Math.floor(count / rows) + (index < count % rows ? 1 : 0));
}

window.addEventListener('resize', () => {
  if (document.getElementById('page3').style.display !== 'none') renderAlbum();
});

function renderAlbum() {
  saveHouseCache();
  const grid = document.getElementById('albumGrid');
  const countEl = document.getElementById('unlockedCount');
  if (countEl) countEl.innerText = unlockedCards.length;
  const entryCount = document.getElementById('collectionCount');
  if (entryCount) entryCount.textContent = unlockedCards.length;
  if (!grid) return;

  if (unlockedCards.length === 0) {
    grid.innerHTML = '<p class="empty-tip">还没有解锁猫咪哦，快控制抓爪抓一只吧！</p>';
    return;
  }

  grid.innerHTML = '';
  const rowSizes = collectionRowSizes(unlockedCards.length, grid.clientWidth || 600);
  let rowIndex = 0, rowCount = 0;
  let row = document.createElement('div');
  row.className = 'collection-row';
  grid.appendChild(row);
  unlockedCards.forEach((card, index) => {
    if (rowCount === rowSizes[rowIndex]) {
      rowIndex++; rowCount = 0;
      row = document.createElement('div');
      row.className = 'collection-row';
      grid.appendChild(row);
    }
    const cardEl = document.createElement('button');
    cardEl.type = 'button';
    cardEl.className = 'album-item-card';
    cardEl.style.setProperty('--portrait-tilt', `${[-7, 4, -3, 6, -5][index % 5]}deg`);
    cardEl.style.setProperty('--portrait-offset', `${[0, 4, 1, 5, 2][index % 5]}px`);
    cardEl.style.setProperty('--portrait-color', card.ball_color || ['#f7c5e8', '#bbdefb', '#d5c5ff', '#ffe5a3'][index % 4]);
    cardEl.setAttribute('aria-label', `查看 ${card.fan_name || '猫咪'} 的生日祝福`);
    cardEl.onclick = () => showCardModal(card);

    const img = document.createElement('img');
    img.src = card.cat_image;
    img.alt = card.fan_name || '猫咪';
    img.style.objectFit = 'contain';
    const nameP = document.createElement('p');
    nameP.innerText = `#${cardNumber(card)} ${card.fan_name}`;

    const ball = document.createElement('span');
    ball.className = 'collection-ball';
    ball.appendChild(img);
    cardEl.appendChild(ball);
    cardEl.appendChild(nameP);
    const hint = document.createElement('span');
    hint.className = 'collection-hint';
    hint.textContent = card.voice_data ? '查看祝福 · 含语音 🎙️' : '点击查看祝福 →';
    cardEl.appendChild(hint);
    row.appendChild(cardEl);
    rowCount++;
  });
}

function generatePreviewCats() {
  const colors = ['#ffbfce', '#b8dfff', '#d2bcff', '#ffe09b', '#a9e8d0', '#ffc79f'];
  const names = ['奶糖', '布丁', '芋圆', '桃桃', '芝麻', '可可', '抹茶', '团子', '泡芙', '丸子'];
  return names.map((name, i) => {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const eye = i % 3 === 0 ? '<path d="M24 39l7 3-7 3 M56 39l-7 3 7 3" fill="none" stroke="#563d62" stroke-width="3" stroke-linecap="round"/>' : '<g fill="#563d62"><ellipse cx="27" cy="42" rx="3" ry="4"/><ellipse cx="53" cy="42" rx="3" ry="4"/></g>';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><path d="M15 37L12 10 32 24Q40 20 48 24L68 10 65 37Q76 70 40 73 4 70 15 37" fill="${color}" stroke="#805b88" stroke-width="2"/><path d="M17 18l3 16 8-8M63 18l-3 16-8-8" fill="#ff92b5"/>${eye}<path d="M36 51h8l-4 5z" fill="#d86c93"/><path d="M40 55q-6 9-11 2m11-2q6 9 11 2" fill="none" stroke="#805b88" stroke-width="2"/><text x="40" y="69" text-anchor="middle" font-size="9" fill="#563d62">${i + 1}</text></svg>`;
    return {cat_index_num: i + 1, fan_name: name, cat_origin: '测试猫咪星球', blessing: `${name}祝你生日快乐！愿每一天都有新的小惊喜。`, ball_color: color, cat_image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)};
  });
}

async function browseDatabaseCats(button) {
  if (!machinePreview || button.disabled) return;
  button.disabled = true;
  const panel = document.getElementById('previewDatabaseCats');
  panel.hidden = false;
  panel.textContent = '正在读取作品…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    if (typeof supabase === 'undefined') throw new Error('图片服务尚未连接，请刷新后重试。');
    const reader = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const rows = [];
    for (let offset = 0; ; offset += 100) {
      const result = await reader.from('cats').select('*').order('id').range(offset, offset + 99).abortSignal(controller.signal);
      if (result.error) throw result.error;
      rows.push(...(result.data || []));
      if (!result.data || result.data.length < 100) break;
    }
    panel.textContent = '';
    const heading = document.createElement('p');
    heading.textContent = `数据库作品（${rows.length}）· 点击查看`;
    panel.appendChild(heading);
    const grid = document.createElement('div');
    grid.className = 'album-grid';
    numberCatCards(rows.map(toCatCard)).forEach(card => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'album-item-card';
      const img = document.createElement('img');
      img.src = card.cat_image;
      img.alt = card.fan_name || '猫咪';
      img.loading = 'lazy';
      const label = document.createElement('p');
      label.textContent = `#${cardNumber(card)} ${card.fan_name || '猫咪'}`;
      item.append(img, label);
      item.onclick = () => showCardModal(card, true);
      grid.appendChild(item);
    });
    panel.appendChild(grid);
    if (!rows.length) heading.textContent = '数据库里还没有作品。';
  } catch (error) {
    panel.textContent = '暂时无法读取作品，请检查网络后再试。';
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
  }
}

window.onload = function() {
  initUI();
  if (machinePreview) {
    const speedControl = document.createElement('div');
    speedControl.className = 'preview-speed-control';
    const speedLabel = document.createElement('label');
    speedLabel.htmlFor = 'previewClawSpeed';
    speedLabel.textContent = '爪子上下速度：';
    const speedOutput = document.createElement('output');
    speedOutput.htmlFor = 'previewClawSpeed';
    speedOutput.textContent = `${previewClawSpeed} 倍`;
    const speedSlider = document.createElement('input');
    speedSlider.id = 'previewClawSpeed';
    speedSlider.type = 'range';
    speedSlider.min = '1'; speedSlider.max = '5'; speedSlider.step = '1'; speedSlider.value = String(previewClawSpeed);
    speedSlider.setAttribute('aria-valuetext', `${previewClawSpeed} 倍`);
    speedSlider.oninput = () => {
      previewClawSpeed = Math.max(1, Math.min(5, Math.round(Number(speedSlider.value) || 1)));
      speedOutput.textContent = `${previewClawSpeed} 倍`;
      speedSlider.setAttribute('aria-valuetext', `${previewClawSpeed} 倍`);
    };
    const speedTicks = document.createElement('div');
    speedTicks.className = 'preview-speed-ticks';
    for (let value = 1; value <= 5; value++) {
      const tick = document.createElement('span'); tick.textContent = String(value); speedTicks.appendChild(tick);
    }
    speedControl.append(speedLabel, speedOutput, speedSlider, speedTicks);
    document.querySelector('#page2 .header').appendChild(speedControl);
    const browseButton = document.createElement('button');
    browseButton.type = 'button';
    browseButton.className = 'skip-creation-btn';
    browseButton.textContent = '查看数据库作品 / 刷新';
    browseButton.onclick = () => browseDatabaseCats(browseButton);
    document.querySelector('#page2 .header').appendChild(browseButton);
    const databasePanel = document.createElement('section');
    databasePanel.id = 'previewDatabaseCats';
    databasePanel.className = 'album-section';
    databasePanel.hidden = true;
    document.querySelector('#page2 .header').after(databasePanel);
    togglePage('page2');
    document.querySelector('#page2 .header p').textContent='预览模式 · Alt + A 快捷抓取 · Alt + Z 放回最后一颗';
    const previewHint = document.createElement('p');
    previewHint.textContent = '快捷键：Alt + A 加入收藏 ／ Alt + Z 放回最后一颗（只读取作品，不修改数据库）';
    document.querySelector('#page3 .header').appendChild(previewHint);
    const previewTools = document.createElement('div');
    previewTools.className = 'preview-collection-tools';
    [['快捷抓一颗', () => testCollectionChange('add')], ['放回一颗', () => testCollectionChange('remove')], ['查看十颗大合照', () => {
      if (isGrabbing) return;
      for (let i = 0; i < 10; i++) testCollectionChange('add');
      openCollection();
    }]].forEach(([label, action]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'skip-creation-btn';
      button.textContent = label; button.onclick = action; previewTools.appendChild(button);
    });
    document.querySelector('#page3 .header').appendChild(previewTools);
    document.querySelector('.remake-btn').style.display='none';
  }
};
