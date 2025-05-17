import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';

// three.jsの初期化部分
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

// カメラの初期位置を設定（追加）
camera.position.set(4, 3, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ 
  preserveDrawingBuffer: true, 
  antialias: true,
  alpha: true  // 追加：背景の透過を有効化
});

// 初期背景を透明に
scene.background = null;

// サイズ設定を関数化（修正）
function resizeRenderer() {
  const container = document.getElementById('canvas-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  const size = Math.min(width, height);
  renderer.setSize(size, size, false);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
}

// ズーム処理の修正（余分なライト追加を削除）
container.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  const zoomSpeed = 0.1;
  const direction = e.deltaY > 0 ? 1 : -1;
  const distance = camera.position.length();
  const newDistance = Math.max(2, Math.min(20, distance + direction * zoomSpeed));
  
  // カメラの方向を維持しながら距離を変更
  camera.position.normalize().multiplyScalar(newDistance);
  camera.lookAt(0, 0, 0);
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.outputColorSpace = THREE.SRGBColorSpace;

container.appendChild(renderer.domElement);
resizeRenderer(); // 初期サイズを設定

// リサイズイベントリスナー
window.addEventListener('resize', resizeRenderer);

// ライト設定
const ambientLight = new THREE.AmbientLight(0xaaaaaa, 1.5); // 強さを上げる
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); // 強さを上げる
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 0.8); // 強さを調整
pointLight.position.set(-3, 3, -3);
scene.add(pointLight);

// 床の設定
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.75;
ground.receiveShadow = true;
scene.add(ground);

// テクスチャローダーとボックスの準備
const loader = new THREE.TextureLoader();
let box;
const textures = {};
let isRotating = true;
let rotateSpeed = 0.005;

// アップロードされた画像をプレビュー表示
function createImagePreview(input, boxId) {
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const box = document.getElementById(boxId);
    const icon = box.querySelector('.upload-icon');
    const text = box.querySelector('.upload-text');
    
    // 既存のプレビュー画像があれば削除
    const existingImg = box.querySelector('img');
    if (existingImg) box.removeChild(existingImg);
    
    // 新しいプレビュー画像を作成
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      icon.style.display = 'none';
      text.style.display = 'none';
      box.appendChild(img);
    };
    
    // テクスチャの読み込みと適用
    const key = input.id;
    const url = URL.createObjectURL(file);
    loader.load(url, (tex) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textures[key] = tex;
      createBox();
      updateStatus();
    });
  });
}

// 箱の作成関数
function createBox() {
  const required = ['front', 'back', 'right', 'left', 'top', 'bottom'];
  if (!required.every(k => textures[k])) return;

  if (box) scene.remove(box);

  const frontImage = textures.front.image;
  const rightImage = textures.right.image;

  const baseHeight = 1.5;
  const width = (frontImage.width / frontImage.height) * baseHeight;
  const height = baseHeight;
  const depth = (rightImage.width / rightImage.height) * baseHeight;

  const chamfer = 0.02;
  const geometry = new THREE.BoxGeometry(width - chamfer, height - chamfer, depth - chamfer);
  const materials = [
    new THREE.MeshStandardMaterial({ map: textures.right }),
    new THREE.MeshStandardMaterial({ map: textures.left }),
    new THREE.MeshStandardMaterial({ map: textures.top }),
    new THREE.MeshStandardMaterial({ map: textures.bottom }),
    new THREE.MeshStandardMaterial({ map: textures.front }),
    new THREE.MeshStandardMaterial({ map: textures.back })
  ];
  box = new THREE.Mesh(geometry, materials);
  box.castShadow = true;
  box.receiveShadow = false;
  scene.add(box);
}

// ステータスの更新
function updateStatus() {
  const required = ['front', 'back', 'right', 'left', 'top', 'bottom'];
  const uploaded = required.filter(k => textures[k]);
  const missing = required.filter(k => !textures[k]);
  
  const statusEl = document.getElementById('status');
  
  if (missing.length === 0) {
    statusEl.textContent = '✅ すべての画像がアップロードされました！';
    statusEl.className = 'status success';
  } else {
    statusEl.textContent = `⚠️ ${missing.length}つの画像が未アップロードです: ${missing.join(', ')}`;
    statusEl.className = 'status error';
  }
  
  statusEl.classList.remove('hidden');
}

// カメラ位置更新関数
function updateCameraPosition() {
  const distance = parseFloat(document.getElementById('cameraDistance').value);
  const xAngle = parseFloat(document.getElementById('cameraX').value) * Math.PI / 180;
  const yAngle = parseFloat(document.getElementById('cameraY').value) * Math.PI / 180;

  camera.position.x = distance * Math.cos(xAngle) * Math.sin(yAngle);
  camera.position.y = distance * Math.sin(xAngle);
  camera.position.z = distance * Math.cos(xAngle) * Math.cos(yAngle);
  
  camera.lookAt(0, 0, 0);
}

// スライダーの値表示更新
function updateSliderValue(id) {
  const slider = document.getElementById(id);
  const valueDisplay = document.getElementById(`${id}Value`);
  if (slider && valueDisplay) {
    valueDisplay.textContent = id === 'cameraDistance' ? slider.value : `${slider.value}°`;
  }
}

// スライダーのイベントリスナー設定
['cameraX', 'cameraY', 'cameraDistance'].forEach(id => {
  const slider = document.getElementById(id);
  if (slider) {
    slider.addEventListener('input', () => {
      updateSliderValue(id);
      updateCameraPosition();
    });
  }
});

// イベントリスナーを追加（修正：ビュー選択を削除）
document.getElementById('shadowToggle').addEventListener('change', (e) => {
  ground.visible = e.target.checked;
});

document.getElementById('rotateToggle').addEventListener('change', (e) => {
  isRotating = e.target.checked;
});

document.getElementById('rotateSpeed').addEventListener('input', (e) => {
  rotateSpeed = parseFloat(e.target.value);
});

// 画像アップロードのハンドラー設定を修正
['front', 'back', 'right', 'left', 'top', 'bottom', 'bg'].forEach(id => { // bgを追加
  createImagePreview(document.getElementById(id), `${id}-box`);
});

// 背景画像の設定を修正（古い処理を削除）
document.getElementById('bg').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const url = URL.createObjectURL(file);
  loader.load(url, (tex) => {
    // テクスチャの設定
    tex.colorSpace = THREE.SRGBColorSpace;
    
    // 既存の背景テクスチャを保存（リセット用）
    if (textures['bg'] && textures['bg'].texture) {
      textures['bg'].texture.dispose();
    }
    
    // 背景を直接設定
    scene.background = tex;
    textures['bg'] = { texture: tex };
  });
});

// 背景リセット
document.getElementById('reset-bg').addEventListener('click', () => {
  // 背景をクリア
  if (textures['bg']) {
    if (textures['bg'].texture) {
      textures['bg'].texture.dispose();
    }
    delete textures['bg'];
  }
  scene.background = null;
  
  // UIのリセット
  const bgBox = document.getElementById('bg-box');
  const existingImg = bgBox.querySelector('img');
  if (existingImg) {
    bgBox.removeChild(existingImg);
  }
  
  // 入力フィールドをリセット
  const bgInput = document.getElementById('bg');
  if (bgInput) {
    bgInput.value = '';
  }

  // アイコンと説明テキストを表示
  const icon = bgBox.querySelector('.upload-icon');
  const text = bgBox.querySelector('.upload-text');
  if (icon) icon.style.display = '';
  if (text) text.style.display = '';
});

// 画像保存を高解像度に修正
document.getElementById('download').addEventListener('click', () => {
  // 現在のサイズを保存
  const originalSize = {
    width: renderer.domElement.width,
    height: renderer.domElement.height
  };
  
  // 一時的に高解像度にする（2048x2048）
  const exportSize = 2048;
  renderer.setSize(exportSize, exportSize, false);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
  
  // 高解像度でレンダリング
  renderer.render(scene, camera);
  
  // 画像として保存
  const a = document.createElement('a');
  a.download = 'boardgame-box.png';
  a.href = renderer.domElement.toDataURL('image/png', 1.0);
  a.click();
  
  // 元のサイズに戻す
  renderer.setSize(originalSize.width, originalSize.height, false);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
});

// すべてリセット
document.getElementById('reset').addEventListener('click', () => {
  if (box) scene.remove(box);
  scene.background = null;
  
  // テクスチャをクリア
  Object.keys(textures).forEach(key => {
    delete textures[key];
  });
  
  // アップロードボックスをリセット
  ['front', 'back', 'right', 'left', 'top', 'bottom', 'bg'].forEach(id => {
    const box = document.getElementById(`${id}-box`);
    const existingImg = box.querySelector('img');
    if (existingImg) box.removeChild(existingImg);
    box.querySelector('.upload-icon').style.display = '';
    box.querySelector('.upload-text').style.display = '';
  });
  
  // 入力フィールドをリセット
  ['front', 'back', 'right', 'left', 'top', 'bottom', 'bg', 'bulk-upload'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });

  // ステータスをクリア
  document.getElementById('status').className = 'status hidden';
});

// 一括アップロード機能
const bulkUploadBox = document.getElementById('bulk-upload-box');
const bulkUploadInput = document.getElementById('bulk-upload');
const bulkUploadResult = document.getElementById('bulk-upload-result');
const bulkUploadList = document.getElementById('bulk-upload-list');

function handleBulkUpload(files) {
  if (!files || files.length === 0) return;
  
  // トーストで結果を表示するための配列
  const results = {
    success: [],
    notMatched: []
  };
  
  // 各ファイルを処理
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) {
      showToast(`${file.name} - 画像ファイルではありません`, 3000);
      return;
    }
    
    const face = detectFaceFromFilename(file.name);
    
    if (face) {
      // 対応する入力要素にファイルを設定
      const input = document.getElementById(face);
      
      // FileListオブジェクトを作成（単一ファイル用）
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change'));
      
      // 結果を記録
      results.success.push({ face, name: file.name });
    } else {
      // マッチしなかったファイル
      results.notMatched.push(file.name);
    }
  });
  
  // トーストで結果を表示
  let toastMsg = '';
  if (results.success.length) {
    toastMsg += '割り当て成功:\n' + results.success.map(item => `${item.name} → ${getFaceDisplayName(item.face)}`).join('\n') + '\n';
  }
  if (results.notMatched.length) {
    toastMsg += '未割り当て:\n' + results.notMatched.join('\n');
  }
  if (toastMsg) showToast(toastMsg.trim());
}

// 面の表示名を取得する関数
function getFaceDisplayName(face) {
  const displayNames = {
    'front': '正面',
    'back': '裏面',
    'top': '上面',
    'bottom': '底面',
    'right': '右側面',
    'left': '左側面'
  };
  
  return displayNames[face] || face;
}

// 一括アップロードのイベントリスナー
bulkUploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  bulkUploadBox.style.borderColor = 'var(--primary)';
  bulkUploadBox.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
});

bulkUploadBox.addEventListener('dragleave', () => {
  bulkUploadBox.style.borderColor = 'var(--primary-dark)';
  bulkUploadBox.style.backgroundColor = '';
});

bulkUploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  bulkUploadBox.style.borderColor = 'var(--primary-dark)';
  bulkUploadBox.style.backgroundColor = '';
  
  handleBulkUpload(e.dataTransfer.files);
});

bulkUploadInput.addEventListener('change', (e) => {
  handleBulkUpload(e.target.files);
});

// 個別のドラッグ＆ドロップ対応
['front', 'back', 'right', 'left', 'top', 'bottom', 'bg'].forEach(id => {
  const box = document.getElementById(`${id}-box`);
  
  box.addEventListener('dragover', (e) => {
    e.preventDefault();
    box.style.borderColor = 'var(--primary)';
    box.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
  });
  
  box.addEventListener('dragleave', () => {
    box.style.borderColor = 'var(--border)';
    box.style.backgroundColor = '';
  });
  
  box.addEventListener('drop', (e) => {
    e.preventDefault();
    box.style.borderColor = 'var(--border)';
    box.style.backgroundColor = '';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const input = document.getElementById(id);
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    }
  });
});

// マウス操作による視点変更
let isDragging = false;
let previousMousePosition = {
  x: 0,
  y: 0
};

container.addEventListener('mousedown', (e) => {
  isDragging = true;
});

container.addEventListener('mousemove', (e) => {
  const deltaMove = {
    x: e.offsetX - previousMousePosition.x,
    y: e.offsetY - previousMousePosition.y
  };

  if (isDragging) {
    // 水平方向の回転
    camera.position.x = camera.position.x * Math.cos(deltaMove.x * 0.01) - camera.position.z * Math.sin(deltaMove.x * 0.01);
    camera.position.z = camera.position.z * Math.cos(deltaMove.x * 0.01) + camera.position.x * Math.sin(deltaMove.x * 0.01);
    
    // 垂直方向の制限付き回転
    const verticalAngle = Math.atan2(Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z), camera.position.y);
    const newVerticalAngle = verticalAngle + deltaMove.y * 0.01;
    
    // 角度を制限（上下の限界を設定）
    const limitedAngle = Math.max(Math.PI * 0.1, Math.min(Math.PI * 0.9, newVerticalAngle));
    
    const radius = Math.sqrt(camera.position.x * camera.position.x + camera.position.y * camera.position.y + camera.position.z * camera.position.z);
    camera.position.y = radius * Math.cos(limitedAngle);
    const temp = radius * Math.sin(limitedAngle);
    const horizontalAngle = Math.atan2(camera.position.z, camera.position.x);
    camera.position.x = temp * Math.cos(horizontalAngle);
    camera.position.z = temp * Math.sin(horizontalAngle);
    
    camera.lookAt(0, 0, 0);
  }

  previousMousePosition = {
    x: e.offsetX,
    y: e.offsetY
  };
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

// ズーム機能
container.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  const zoomSpeed = 0.1;
  const direction = e.deltaY > 0 ? 1 : -1;
  const distance = camera.position.length();
  const newDistance = Math.max(2, Math.min(20, distance + direction * zoomSpeed));
  
  // カメラの方向を維持しながら距離を変更
  camera.position.normalize().multiplyScalar(newDistance);
  camera.lookAt(0, 0, 0);
});

updateStatus();

function animate() {
  requestAnimationFrame(animate);
  
  if (isRotating && box) {
    box.rotation.y += rotateSpeed;
  }
  
  renderer.render(scene, camera);
}
animate();

// トーストメッセージの表示
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hidden');
  }, duration);
}

// ファイル名から面を判別する関数を追加
function detectFaceFromFilename(filename) {
  filename = filename.toLowerCase();
  const faces = {
    'front': ['front', 'mae', '前', '正面'],
    'back': ['back', 'ushiro', '後', '裏', '裏面'],
    'right': ['right', 'migi', '右'],
    'left': ['left', 'hidari', '左'],
    'top': ['top', 'ue', '上'],
    'bottom': ['bottom', 'shita', '下'],
    'bg': ['bg', 'background', 'haikei', '背景'] // 背景用のキーワードを追加
  };

  for (const [face, keywords] of Object.entries(faces)) {
    if (keywords.some(keyword => filename.includes(keyword))) {
      return face;
    }
  }
  return null;
}
