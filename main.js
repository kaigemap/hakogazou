import * as THREE from 'three';

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
let camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100); // より狭い画角で望遠効果を出す
camera.position.set(0, 0.35, 4); // 箱の高さの半分を基準に設定（baseHeight = 0.7の半分）
camera.lookAt(0, 0.35, 0);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
  premultipliedAlpha: false
});

// 初期設定
scene.background = null;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 影を柔らかくする
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

// 床の設定
const groundGeometry = new THREE.PlaneGeometry(30, 30);
const groundMaterial = new THREE.ShadowMaterial({ 
  opacity: 0.5,  // 影の濃さを調整
  transparent: true,
  depthWrite: false,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.001;
ground.receiveShadow = true;
scene.add(ground);

// ライト設定
const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambientLight);

// メインライト
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
directionalLight.position.set(0, 2, 0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 8192;  // 超高解像度のシャドウマップ
directionalLight.shadow.mapSize.height = 8192;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 20;
directionalLight.shadow.camera.left = -5;
directionalLight.shadow.camera.right = 5;
directionalLight.shadow.camera.top = 5;
directionalLight.shadow.camera.bottom = -5;
directionalLight.shadow.radius = 8;     // よりソフトな影
directionalLight.shadow.bias = -0.00002; // シャドウアクネ防止
directionalLight.shadow.normalBias = 0.01; // セルフシャドウイングの改善
scene.add(directionalLight);

// ポイントライト（補助用）
const pointLight = new THREE.PointLight(0xffffff, 0.2);
pointLight.position.set(-2, 4, -2);
pointLight.castShadow = false;
scene.add(pointLight);

// 補助ライト
const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-1.5, 1, -1);
scene.add(fillLight);

// バウンスライト（床からの反射光）
const bounceLight = new THREE.HemisphereLight(
  0xffffff, // 上からの色
  0xffffff, // 下からの色
  0.3       // 強度
);
scene.add(bounceLight);

// スポットライトの設定
const spotLight1 = new THREE.SpotLight(0xffffff, 0.3);
spotLight1.position.set(2, 2, 2); // 高さを3から2に下げる
spotLight1.angle = Math.PI / 8; // 角度を狭める（PI/6からPI/8に）
spotLight1.penumbra = 0.7; // ペナンブラを0.9から0.7に調整
spotLight1.decay = 2; // 減衰を1.5から2に強める
spotLight1.distance = 5; // 距離を8から5に短縮
spotLight1.castShadow = true;
spotLight1.shadow.mapSize.width = 4096;
spotLight1.shadow.mapSize.height = 4096;
spotLight1.shadow.radius = 8; // 影のブラーを5から3に調整
spotLight1.shadow.bias = -0.00005;
scene.add(spotLight1);

const spotLight2 = new THREE.SpotLight(0xffffff, 0.2);
spotLight2.position.set(-3, 4, -2);
spotLight2.angle = Math.PI / 5;
spotLight2.penumbra = 0.8;
spotLight2.decay = 1.5;
spotLight2.distance = 10;
spotLight2.castShadow = true;
spotLight2.shadow.mapSize.width = 4096;
spotLight2.shadow.mapSize.height = 4096;
spotLight2.shadow.radius = 8;
spotLight2.shadow.bias = -0.00005;
scene.add(spotLight2);

// テクスチャローダー
const loader = new THREE.TextureLoader();

// カメラ位置のリセット
function resetCamera() {
  const wasRotating = isRotating;
  // 一時的に回転を停止
  isRotating = false;
  document.getElementById('rotateToggle').checked = false;

  let targetDistance;
  if (boxOrientation === 'lay') {
    // 真上からの視点
    document.getElementById('cameraX').value = '90';
    document.getElementById('cameraY').value = '0';
    targetDistance = 3.5;
  } else {
    // 正面からの視点
    document.getElementById('cameraX').value = '0';
    document.getElementById('cameraY').value = '0';
    targetDistance = 2.2;
  }
  document.getElementById('cameraDistance').value = targetDistance;

  // 箱を正面に向ける
  if (box) {
    const targetRotation = Math.round(box.rotation.y / (Math.PI * 2)) * (Math.PI * 2);
    box.rotation.y = targetRotation;
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
      directionalLight.position.set(0, 30, -15);
      directionalLight.intensity = 0.6;
      pointLight.position.set(-2, 4, -2);
      fillLight.position.set(2, 4, 2);
      
      // スポットライトの位置調整（寝かせた時）
      spotLight1.position.set(4, 6, 4);
      spotLight1.intensity = 0.3;
      spotLight2.position.set(-4, 5, -3);
      spotLight2.intensity = 0.2;
  } else {
    box.rotation.set(0, 0, 0);
    box.position.y = ground.position.y + (height / 2) + 0.001;

    // 立てた時のライト位置を設定
    directionalLight.position.set(5, 10, 3);
    directionalLight.intensity = 1.4;
    pointLight.position.set(-3, 3, -3);
    fillLight.position.set(-3, 5, -5);
    
    // スポットライトの位置調整（立てた時）
    spotLight1.position.set(3, 4, 3);
    spotLight1.intensity = 0.4;
    spotLight2.position.set(-4, 3, -2);
    spotLight2.intensity = 0.3;
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
  slider.value = Math.max(1.2, Math.min(10, currentValue + delta));
  updateSliderValue('cameraDistance');
  updateCameraFromUI();
}

// UIの値からカメラ位置を更新
function updateCameraFromUI() {
  const xAngle = parseFloat(document.getElementById('cameraX').value) * Math.PI / 180;
  const yAngle = parseFloat(document.getElementById('cameraY').value) * Math.PI / 180;
  const distance = parseFloat(document.getElementById('cameraDistance').value);
  
  // 箱の中心位置を注視点にする
  let targetY = ground.position.y + 0.35; // デフォルトは箱の標準高さ（0.7）の半分
  if (box) {
    if (boxOrientation === 'lay') {
      const depth = box.geometry.parameters.depth;
      targetY = ground.position.y + (depth / 2);
    } else {
      const height = box.geometry.parameters.height;
      targetY = ground.position.y + (height / 2);
    }
  }
  
  // カメラ位置の計算
  camera.position.x = distance * Math.cos(xAngle) * Math.sin(yAngle);
  camera.position.y = distance * Math.sin(xAngle) + targetY;  // targetYを基準に高さを調整
  camera.position.z = distance * Math.cos(xAngle) * Math.cos(yAngle);
  
  // 注視点を箱の中心に設定
  const lookAtTarget = new THREE.Vector3(0, targetY, 0);
  camera.lookAt(lookAtTarget);
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

  const baseHeight = 0.7; // 14cmを基準
  const width = (frontImage.width / frontImage.height) * baseHeight;
  const height = baseHeight;
  const depth = (rightImage.width / rightImage.height) * baseHeight;

  // 面取りのパラメータ調整
  const bevelSize = 0.01; // 2mm相当の面取り
  const segments = 128; // さらに細かい分割でスムーズな曲面を実現
  
  // ボックスジオメトリ
  const geometry = new THREE.BoxGeometry(
    width,
    height,
    depth,
    segments,
    segments,
    segments
  );

  // 頂点位置の取得と加工
  const positions = geometry.attributes.position.array;
  
  // 各頂点に対して面取りを適用
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    
    // エッジからの距離を計算
    const edgeDistX = Math.abs(Math.abs(x) - width/2);
    const edgeDistY = Math.abs(Math.abs(y) - height/2);
    const edgeDistZ = Math.abs(Math.abs(z) - depth/2);
    
    // エッジ検出の閾値を調整
    const minDist = Math.min(edgeDistX, edgeDistY, edgeDistZ);
    
    if (minDist < bevelSize) {
      // より自然な面取りカーブの生成
      const t = minDist / bevelSize;
      const smooth = 1.0 - Math.pow(1.0 - t, 2); // 2次曲線による補間
      
      // エッジ部分の頂点移動を調整
      const edgeFactor = 0.95; // エッジの鋭さを調整
      if (edgeDistX < bevelSize) {
        positions[i] *= (width - bevelSize * edgeFactor) / width;
      }
      if (edgeDistY < bevelSize) {
        positions[i + 1] *= (height - bevelSize * edgeFactor) / height;
      }
      if (edgeDistZ < bevelSize) {
        positions[i + 2] *= (depth - bevelSize * edgeFactor) / depth;
      }
    }
  }

  // 法線を更新
  geometry.computeVertexNormals();

  // マテリアルの改善
  const materials = [
    createSideMaterial(textures.right, 0.35),    // 右
    createSideMaterial(textures.left, 0.35),     // 左
    createSideMaterial(textures.top, 0.35),      // 上
    createSideMaterial(textures.bottom, 0.35),   // 下
    createSideMaterial(textures.front, 0.35),    // 前
    createSideMaterial(textures.back, 0.35)      // 後
  ];
  
  box = new THREE.Mesh(geometry, materials);
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);

  resetBoxRotationAndPosition();
  resetCamera();
}

// 箱の面のマテリアルを作成する関数
function createSideMaterial(texture) {
  return new THREE.MeshPhysicalMaterial({
    map: texture,
    roughness: 0.35,        // よりシャープな反射
    metalness: 0.02,        // わずかな金属感
    emissiveMap: texture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.02, // より控えめな自己発光
    clearcoat: 0.3,         // クリアコートを強く
    clearcoatRoughness: 0.2, // クリアコートの粗さを調整
    envMapIntensity: 0.8,   // 環境マップの反射
    side: THREE.FrontSide,
    shadowSide: THREE.FrontSide,
  });
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
      if (icon) icon.style.display = 'none';
      if (text) text.style.display = 'none';
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

// レンダラーのリサイズ処理
function resizeRenderer() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const size = Math.min(width, height);
  
  renderer.setSize(size, size);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
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

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  container.appendChild(renderer.domElement);
  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);

  // カメラの初期値を設定
  document.getElementById('cameraX').value = '0';
  document.getElementById('cameraY').value = '0';
  document.getElementById('cameraDistance').value = '2.2';
  
  // UIの更新とイベントリスナーの設定
  ['cameraX', 'cameraY', 'cameraDistance'].forEach(updateSliderValue);
  
  // カメラの位置を更新
  updateCameraFromUI();
  
  // 箱の面と背景画像のプレビューを設定
  ['front', 'back', 'right', 'left', 'top', 'bottom', 'bg'].forEach(id => {
    createImagePreview(document.getElementById(id), `${id}-box`);
  });

  const iblLoader = new THREE.TextureLoader();
  iblLoader.load('studio_small_08.jpg', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = texture;
  });
  
  // 背景画像が未設定なら完全な透明
  renderer.setClearColor(0x000000, 0);
  
  // UIの初期化とイベントリスナーの設定
  initializeUI();
  
  // アニメーション開始
  animate();
});

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
    // 背景画像がある場合は不透明で描画
    renderer.setClearColor(0x000000, 1);
  });
});

document.getElementById('reset-bg').addEventListener('click', () => {
  if (textures['bg']) {
    if (textures['bg'].texture) {
      textures['bg'].texture.dispose();
    }
    delete textures['bg'];
  }
  scene.background = null;
  // 背景画像が未設定なら透明
  renderer.setClearColor(0x000000, 0);
  
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

// カメラの初期位置を箱の中心に合わせるように調整
function initCamera() {
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  // 箱の中心位置を計算
  let targetY = box ? ground.position.y + (box.geometry.parameters.height / 2) : 0.35;
  
  // UIの現在の値を取得
  const currentX = parseFloat(document.getElementById('cameraX').value) || 0;
  const currentY = parseFloat(document.getElementById('cameraY').value) || 0;
  const currentDistance = parseFloat(document.getElementById('cameraDistance').value) || 2.2;
  
  // 球面座標でカメラ位置を設定
  const xRad = currentX * Math.PI / 180;
  const yRad = currentY * Math.PI / 180;
  
  camera.position.x = currentDistance * Math.cos(xRad) * Math.sin(yRad);
  camera.position.y = currentDistance * Math.sin(xRad) + targetY;
  camera.position.z = currentDistance * Math.cos(xRad) * Math.cos(yRad);
  camera.lookAt(0, targetY, 0);
}

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  
  if (box && isRotating && boxOrientation === 'stand') {
    box.rotation.y += rotateSpeed;
  }
  
  renderer.render(scene, camera);
}

document.getElementById('reset-bg').addEventListener('click', () => {
  if (textures['bg']) {
    if (textures['bg'].texture) {
      textures['bg'].texture.dispose();
    }
    delete textures['bg'];
  }
  scene.background = null;
  // 背景画像が未設定なら透明
  renderer.setClearColor(0x000000, 0);
  
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
