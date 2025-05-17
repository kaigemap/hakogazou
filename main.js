// 初期設定
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
const renderSize = Math.min(container.clientWidth, container.clientHeight);
renderer.setSize(renderSize, renderSize);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ←追加
renderer.toneMapping = THREE.ACESFilmicToneMapping; // ←追加
renderer.outputEncoding = THREE.sRGBEncoding; // ←追加
container.appendChild(renderer.domElement);


// ライト設定
const ambientLight = new THREE.AmbientLight(0xaaaaaa, 1.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
const pointLight = new THREE.PointLight(0xffffff, 0.5);
pointLight.position.set(-3, 3, -3);
scene.add(pointLight);
scene.add(directionalLight);

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

// 視点の更新
function updateView() {
  const preset = document.getElementById('view').value;
  if (preset === '斜め上') camera.position.set(4, 3, 4);
  if (preset === '正面') camera.position.set(0, 2, 6);
  if (preset === '横') camera.position.set(6, 2, 0);
  if (preset === '上') camera.position.set(0, 6, 0);
  if (preset === 'カスタム') {
    // カスタム視点の設定はそのまま維持
    return;
  }
  camera.lookAt(0, 0, 0);
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

// イベントリスナー設定
document.getElementById('view').addEventListener('change', updateView);

document.getElementById('shadowToggle').addEventListener('change', (e) => {
  ground.visible = e.target.checked;
});

document.getElementById('rotateToggle').addEventListener('change', (e) => {
  isRotating = e.target.checked;
});

document.getElementById('rotateSpeed').addEventListener('input', (e) => {
  rotateSpeed = parseFloat(e.target.value);
});

// 画像アップロードのハンドラー設定
['front', 'back', 'right', 'left', 'top', 'bottom'].forEach(id => {
  createImagePreview(document.getElementById(id), `${id}-box`);
});

// 背景画像の設定
createImagePreview(document.getElementById('bg'), 'bg-box');
document.getElementById('bg').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  loader.load(url, (tex) => {
    scene.background = tex;
  });
});

// 背景リセット
document.getElementById('reset-bg').addEventListener('click', () => {
  scene.background = null;
  const bgBox = document.getElementById('bg-box');
  const existingImg = bgBox.querySelector('img');
  if (existingImg) bgBox.removeChild(existingImg);
  document.getElementById('bg-box').querySelector('.upload-icon').style.display = '';
  document.getElementById('bg-box').querySelector('.upload-text').style.display = '';
});

// 画像保存
document.getElementById('download').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = 'boardgame-box.png';
  a.href = renderer.domElement.toDataURL('image/png');
  a.click();
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
  document.getElementById('front').value = '';
  document.getElementById('back').value = '';
  document.getElementById('right').value = '';
  document.getElementById('left').value = '';
  document.getElementById('top').value = '';
  document.getElementById('bottom').value = '';
  document.getElementById('bg').value = '';
  document.getElementById('bulk-upload').value = '';

  // 一括アップロード結果をクリア
  bulkUploadList.innerHTML = '';
  bulkUploadResult.classList.add('hidden');

  // ステータスをクリア
  document.getElementById('status').className = 'status hidden';
});

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
  const newSize = Math.min(container.clientWidth, container.clientHeight);
  renderer.setSize(newSize, newSize);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
});

// 一括アップロード機能
const bulkUploadBox = document.getElementById('bulk-upload-box');
const bulkUploadInput = document.getElementById('bulk-upload');
const bulkUploadResult = document.getElementById('bulk-upload-result');
const bulkUploadList = document.getElementById('bulk-upload-list');

function handleBulkUpload(files) {
  if (!files || files.length === 0) return;
  
  bulkUploadList.innerHTML = '';
  bulkUploadResult.classList.remove('hidden');
  
  const faceKeywords = {
    'front': ['front', '正面', 'face', 'main'],
    'back': ['back', '裏面', '裏', 'rear'],
    'top': ['top', '上面', '上', 'upper'],
    'bottom': ['bottom', '底面', '底', '下面', '下', 'under'],
    'right': ['right', '右側面', '右面', '右', 'side'],
    'left': ['left', '左側面', '左面', '左'],
    'bg': ['bg', 'background', '背景']
  };
  
  // 結果を表示するための配列
  const results = {
    success: [],
    notMatched: []
  };
  
  // ファイル名から面を判定する関数
  function detectFaceFromFilename(filename) {
    filename = filename.toLowerCase();
    
    for (const [face, keywords] of Object.entries(faceKeywords)) {
      if (keywords.some(keyword => filename.includes(keyword))) {
        return face;
      }
    }
    
    return null;
  }
  
  // 各ファイルを処理
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) {
      const listItem = document.createElement('li');
      listItem.classList.add('error');
      listItem.textContent = `${file.name} - 画像ファイルではありません`;
      bulkUploadList.appendChild(listItem);
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
  
  // 成功した割り当てを表示
  results.success.forEach(item => {
    const listItem = document.createElement('li');
    listItem.classList.add('success');
    listItem.textContent = `${item.name} → ${getFaceDisplayName(item.face)}に割り当てました`;
    bulkUploadList.appendChild(listItem);
  });
  
  // マッチしなかったファイルを表示
  results.notMatched.forEach(name => {
    const listItem = document.createElement('li');
    listItem.classList.add('warning');
    listItem.textContent = `${name} - ファイル名から面を判別できませんでした`;
    bulkUploadList.appendChild(listItem);
  });
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

  if (isDragging && document.getElementById('view').value === 'カスタム') {
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
  
  if (document.getElementById('view').value === 'カスタム') {
    const zoomSpeed = 0.1;
    const direction = e.deltaY > 0 ? 1 : -1;
    
    // カメラの距離を調整
    const distance = camera.position.length();
    const newDistance = Math.max(2, Math.min(20, distance + direction * zoomSpeed));
    
    // カメラの方向を維持しながら距離を変更
    camera.position.normalize().multiplyScalar(newDistance);
    camera.lookAt(0, 0, 0);
  }
});

updateView();
updateStatus();

function animate() {
  requestAnimationFrame(animate);
  if (box && isRotating) box.rotation.y += rotateSpeed;
  renderer.render(scene, camera);
}
animate();