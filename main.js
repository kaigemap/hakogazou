import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';

// グローバル変数
let box;
const textures = {};
let isRotating = true;
let rotateSpeed = 0.005;
let boxOrientation = 'stand';
let layFace = 'front';

// three.jsの初期化
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
  preserveDrawingBuffer: true, 
  antialias: true,
  alpha: true
});

// 初期設定
scene.background = null;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// サイズ設定
function resizeRenderer() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const size = Math.min(width, height);
  renderer.setSize(size, size, false);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
}

// 床の設定
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.ShadowMaterial({ 
  opacity: 0.4,  // 影の濃さを少し薄く
  transparent: true,
  depthWrite: false,  // 深度バッファへの書き込みを無効化
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.75;
ground.receiveShadow = true;
scene.add(ground);

// ライト設定
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 3);
directionalLight.intensity = 0.7;
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -5;
directionalLight.shadow.camera.right = 5;
directionalLight.shadow.camera.top = 5;
directionalLight.shadow.camera.bottom = -5;
directionalLight.shadow.radius = 8; // ぼかしの半径を大きく
directionalLight.shadow.bias = -0.00005; // バイアスを調整して影のアーティファクトを軽減
directionalLight.shadow.normalBias = 0.002; // 法線バイアスを増やしてセルフシャドウイングを改善
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 0.8);
pointLight.position.set(-3, 3, -3);
scene.add(pointLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
fillLight.position.set(-3, 5, -5);
scene.add(fillLight);

// テクスチャローダー
const loader = new THREE.TextureLoader();

// カメラ位置のリセット
function resetCamera() {
  const wasRotating = isRotating;
  // 一時的に回転を停止
  isRotating = false;
  document.getElementById('rotateToggle').checked = false;

  if (boxOrientation === 'lay') {
    // 真上からの視点
    document.getElementById('cameraX').value = '90';
    document.getElementById('cameraY').value = '0';
    document.getElementById('cameraDistance').value = '3.5';
  } else {
    // 真横からの視点
    document.getElementById('cameraX').value = '0';
    document.getElementById('cameraY').value = '0';
    document.getElementById('cameraDistance').value = '5';

    // 箱を正面に向ける
    if (box) {
      const targetRotation = Math.round(box.rotation.y / (Math.PI * 2)) * (Math.PI * 2);
      box.rotation.y = targetRotation;
    }
  }
  
  ['cameraX', 'cameraY', 'cameraDistance'].forEach(updateSliderValue);
  updateCameraFromUI();

  // 0.5秒後に元の回転状態を復元
  setTimeout(() => {
    isRotating = wasRotating;
    document.getElementById('rotateToggle').checked = wasRotating;
  }, 500);
}

// 箱の向きと位置のリセット
function resetBoxRotationAndPosition() {
  if (!box) return;

  // 自動回転の制御
  if (boxOrientation === 'lay') {
    isRotating = false;
    document.getElementById('rotateToggle').checked = false;
  }

  const geometry = box.geometry;
  const width = geometry.parameters.width;
  const height = geometry.parameters.height;
  const depth = geometry.parameters.depth;

  // 箱の位置と回転を設定
  if (boxOrientation === 'lay') {
      if (layFace === 'front') {
        box.rotation.set(-Math.PI/2, 0, 0);
      } else {
        box.rotation.set(Math.PI/2, 0, Math.PI);
      }
      box.position.y = ground.position.y + (depth / 2) + 0.001;

      // 寝かせた時のライト位置
      directionalLight.position.set(0, 30, -15); // 斜め上からの光
      directionalLight.intensity = 0.6;
      pointLight.position.set(-2, 4, -2);
      fillLight.position.set(2, 4, 2);
  } else {
    box.rotation.set(0, 0, 0);
    box.position.y = ground.position.y + (height / 2) + 0.001;

    // 立てた時のライト位置を設定
    directionalLight.position.set(5, 10, 3);
    directionalLight.intensity = 1.4;
    pointLight.position.set(-3, 3, -3);
    fillLight.position.set(-3, 5, -5);
  }
}

// UIの初期化
function initializeUI() {
  boxOrientation = document.getElementById('boxOrientation').value;
  layFace = document.getElementById('layFace').value;
  
  const layFaceGroup = document.getElementById('layFaceGroup');
  layFaceGroup.style.display = boxOrientation === 'lay' ? 'block' : 'none';
  
  updateSliderValue('cameraX');
  updateSliderValue('cameraY');
  updateSliderValue('cameraDistance');
  
  updateCameraFromUI();
  setupEventListeners();
}

// イベントリスナーの設定
function setupEventListeners() {
  document.getElementById('boxOrientation').addEventListener('change', (e) => {
    boxOrientation = e.target.value;
    const layFaceGroup = document.getElementById('layFaceGroup');
    layFaceGroup.style.display = boxOrientation === 'lay' ? 'block' : 'none';
    resetBoxRotationAndPosition();
    resetCamera();
  });

  document.getElementById('layFace').addEventListener('change', (e) => {
    layFace = e.target.value;
    resetBoxRotationAndPosition();
  });

  document.getElementById('resetViewBtn').addEventListener('click', resetCamera);

  ['cameraX', 'cameraY', 'cameraDistance'].forEach(id => {
    const slider = document.getElementById(id);
    slider.addEventListener('input', () => {
      updateSliderValue(id);
      updateCameraFromUI();
    });
  });

  document.getElementById('shadowToggle').addEventListener('change', (e) => {
    ground.visible = e.target.checked;
  });

  document.getElementById('rotateToggle').addEventListener('change', (e) => {
    isRotating = e.target.checked;
  });

  document.getElementById('rotateSpeed').addEventListener('input', (e) => {
    rotateSpeed = parseFloat(e.target.value);
  });

  document.getElementById('download').addEventListener('click', () => {
    // 今のサイズを保存
    const originalSize = renderer.getSize(new THREE.Vector2());

    // 一時的に2400x2400に
    renderer.setSize(2400, 2400, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera); // 明示的に再描画

    // 書き出し
    const link = document.createElement('a');
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    link.download = `hakogazou-${timestamp}.png`;
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();

    // 元のサイズに戻す
    renderer.setSize(originalSize.x, originalSize.y, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  });

  // マウス操作
  container.addEventListener('mousedown', (e) => { isDragging = true; });
  container.addEventListener('mouseup', () => { isDragging = false; });
  container.addEventListener('mouseleave', () => { isDragging = false; });
  
  container.addEventListener('mousemove', handleMouseMove);
  container.addEventListener('wheel', handleWheel);
}

// カメラ制御
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function handleMouseMove(e) {
  const deltaMove = {
    x: e.offsetX - previousMousePosition.x,
    y: e.offsetY - previousMousePosition.y
  };

  if (isDragging) {
    const xAngle = parseFloat(document.getElementById('cameraX').value);
    const yAngle = parseFloat(document.getElementById('cameraY').value);
    
    document.getElementById('cameraY').value = ((yAngle + deltaMove.x * 0.5) + 180) % 360 - 180;
    document.getElementById('cameraX').value = Math.max(-89, Math.min(89, xAngle + deltaMove.y * 0.5));
    
    updateSliderValue('cameraX');
    updateSliderValue('cameraY');
    updateCameraFromUI();
  }

  previousMousePosition = {
    x: e.offsetX,
    y: e.offsetY
  };
}

function handleWheel(e) {
  e.preventDefault();
  const slider = document.getElementById('cameraDistance');
  const currentValue = parseFloat(slider.value);
  const delta = e.deltaY > 0 ? 0.5 : -0.5;
  slider.value = Math.max(2, Math.min(10, currentValue + delta));
  updateSliderValue('cameraDistance');
  updateCameraFromUI();
}

// UIの値からカメラ位置を更新
function updateCameraFromUI() {
  const xAngle = parseFloat(document.getElementById('cameraX').value) * Math.PI / 180;
  const yAngle = parseFloat(document.getElementById('cameraY').value) * Math.PI / 180;
  const distance = parseFloat(document.getElementById('cameraDistance').value);
  
  // 箱が寝ているときは、箱の高さの半分の位置を注視点にする
  let targetY = 0;
  if (box && boxOrientation === 'lay') {
    const depth = box.geometry.parameters.depth;
    targetY = ground.position.y + (depth / 2);
  }
  
  camera.position.x = distance * Math.cos(xAngle) * Math.sin(yAngle);
  camera.position.y = distance * Math.sin(xAngle) + targetY;
  camera.position.z = distance * Math.cos(xAngle) * Math.cos(yAngle);
  camera.lookAt(0, targetY, 0);
}

// スライダーの値表示を更新
function updateSliderValue(id) {
  const slider = document.getElementById(id);
  const valueDisplay = document.getElementById(`${id}Value`);
  if (slider && valueDisplay) {
    valueDisplay.textContent = id === 'cameraDistance' ? slider.value : `${slider.value}°`;
  }
}

// 箱の作成
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

  const chamfer = 0.08;
  const geometry = new THREE.BoxGeometry(width - chamfer, height - chamfer, depth - chamfer);
  const materials = [
    new THREE.MeshStandardMaterial({ map: textures.right, roughness: 0.5, metalness: 0.0, emissiveMap: textures.right, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.09, clearcoat: 0.1 }),
    new THREE.MeshStandardMaterial({ map: textures.left, roughness: 0.5, metalness: 0.0, emissiveMap: textures.left, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.09, clearcoat: 0.1 }),
    new THREE.MeshStandardMaterial({ map: textures.top, roughness: 0.5, metalness: 0.0, emissiveMap: textures.top, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.09, clearcoat: 0.1 }),
    new THREE.MeshStandardMaterial({ map: textures.bottom, roughness: 0.5, metalness: 0.0, emissiveMap: textures.bottom, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.09, clearcoat: 0.1 }),
    new THREE.MeshStandardMaterial({ map: textures.front, roughness: 0.5, metalness: 0.0, emissiveMap: textures.front, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.09, clearcoat: 0.1 }),
    new THREE.MeshStandardMaterial({ map: textures.back, roughness: 0.5, metalness: 0.0, emissiveMap: textures.back, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.09, clearcoat: 0.1 })
  ];
  
  box = new THREE.Mesh(geometry, materials);
  box.castShadow = true;
  box.receiveShadow = false;
  scene.add(box);

  resetBoxRotationAndPosition();
  resetCamera();
}

// アップロードされた画像をプレビュー表示
function createImagePreview(input, boxId) {
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const box = document.getElementById(boxId);
    const icon = box.querySelector('.upload-icon');
    const text = box.querySelector('.upload-text');
    
    const existingImg = box.querySelector('img');
    if (existingImg) box.removeChild(existingImg);
    
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      icon.style.display = 'none';
      text.style.display = 'none';
      box.appendChild(img);
    };
    
    const key = input.id;
    const url = URL.createObjectURL(file);
    loader.load(url, (tex) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.colorSpace = THREE.SRGBColorSpace;
      textures[key] = tex;
      createBox();
      updateStatus();
    });
  });
}

// ステータスの更新
function updateStatus() {
  const required = ['front', 'back', 'right', 'left', 'top', 'bottom'];
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

// 背景画像の設定
document.getElementById('bg').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const url = URL.createObjectURL(file);
  loader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    
    if (textures['bg'] && textures['bg'].texture) {
      textures['bg'].texture.dispose();
    }
    
    scene.background = tex;
    textures['bg'] = { texture: tex };
  });
});

// 背景リセット
document.getElementById('reset-bg').addEventListener('click', () => {
  if (textures['bg']) {
    if (textures['bg'].texture) {
      textures['bg'].texture.dispose();
    }
    delete textures['bg'];
  }
  scene.background = null;
  
  const bgBox = document.getElementById('bg-box');
  const existingImg = bgBox.querySelector('img');
  if (existingImg) {
    bgBox.removeChild(existingImg);
  }
  
  const bgInput = document.getElementById('bg');
  if (bgInput) {
    bgInput.value = '';
  }

  const icon = bgBox.querySelector('.upload-icon');
  const text = bgBox.querySelector('.upload-text');
  if (icon) icon.style.display = '';
  if (text) text.style.display = '';
});

// ファイル名から面を判別する関数
function detectFaceFromFilename(filename) {
  filename = filename.toLowerCase();
  const faces = {
    'front': ['front', 'mae', '前', '正面'],
    'back': ['back', 'ushiro', '後', '裏', '裏面'],
    'right': ['right', 'migi', '右'],
    'left': ['left', 'hidari', '左'],
    'top': ['top', 'ue', '上'],
    'bottom': ['bottom', 'shita', '下'],
    'bg': ['bg', 'background', 'haikei', '背景']
  };

  for (const [face, keywords] of Object.entries(faces)) {
    if (keywords.some(keyword => filename.includes(keyword))) {
      return face;
    }
  }
  return null;
}

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

// 面の表示名を取得する関数
function getFaceDisplayName(face) {
  const displayNames = {
    'front': '正面',
    'back': '裏面',
    'top': '上面',
    'bottom': '底面',
    'right': '右側面',
    'left': '左側面',
    'bg': '背景'
  };
  
  return displayNames[face] || face;
}

// 一括アップロードの処理
function handleBulkUpload(files) {
  if (!files || files.length === 0) return;
  
  const results = {
    success: [],
    notMatched: []
  };
  
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) {
      showToast(`${file.name} - 画像ファイルではありません`, 3000);
      return;
    }
    
    const face = detectFaceFromFilename(file.name);
    
    if (face) {
      const input = document.getElementById(face);
      if (!input) return;
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change'));
      
      results.success.push({ face, name: file.name });
    } else {
      results.notMatched.push(file.name);
    }
  });
  
  let toastMsg = '';
  if (results.success.length) {
    toastMsg += '割り当て成功:\n' + results.success.map(item => 
      `${item.name} → ${getFaceDisplayName(item.face)}`).join('\n') + '\n';
  }
  if (results.notMatched.length) {
    toastMsg += '未割り当て:\n' + results.notMatched.join('\n');
  }
  if (toastMsg) showToast(toastMsg.trim(), 5000);
}

// 一括アップロードのイベントリスナー設定
const bulkUploadBox = document.getElementById('bulk-upload-box');
const bulkUploadInput = document.getElementById('bulk-upload');

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

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  
  if (box && isRotating && boxOrientation === 'stand') {
    box.rotation.y += rotateSpeed;
  }
  
  renderer.render(scene, camera);
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  container.appendChild(renderer.domElement);
  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);
  
  ['front', 'back', 'right', 'left', 'top', 'bottom'].forEach(id => {
    createImagePreview(document.getElementById(id), `${id}-box`);
  });

  const iblLoader = new THREE.TextureLoader();
  iblLoader.load('studio_small_08.jpg', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = texture;
  });
  
  initializeUI();
  animate();
});
