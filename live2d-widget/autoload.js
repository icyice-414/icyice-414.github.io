/*!
 * Live2D Widget
 * https://github.com/stevenjoezhang/live2d-widget
 */

const live2d_path = '/live2d-widget/';

function loadExternalResource(url, type) {
  return new Promise((resolve, reject) => {
    let tag;
    if (type === 'css') {
      tag = document.createElement('link');
      tag.rel = 'stylesheet';
      tag.href = url;
    } else if (type === 'js') {
      tag = document.createElement('script');
      tag.type = 'module';
      tag.src = url;
    }
    if (tag) {
      tag.onload = () => resolve(url);
      tag.onerror = () => reject(url);
      document.head.appendChild(tag);
    }
  });
}

let waifuContainer = null; // Live2D 容器

/**
 * 通用跟随函数：使面板随 Live2D 容器移动
 * @param {HTMLElement} panel 要跟随的面板元素
 * @param {number} offsetX 水平偏移量（相对于 Live2D 右侧，正数为右）
 * @param {number} offsetY 垂直偏移量（相对于 Live2D 顶部）
 */
function followWaifu(panel, offsetX = 0, offsetY = 0) {
  if (!panel || !waifuContainer) return;
  function updatePosition() {
    const rect = waifuContainer.getBoundingClientRect();
    panel.style.left = `${rect.right + offsetX}px`;
    panel.style.top = `${rect.top + offsetY}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    requestAnimationFrame(updatePosition);
  }
  requestAnimationFrame(updatePosition);
}

// ----- 聊天面板（原有功能，仅同步方式优化）-----
let chatPanel = null;
const chatOffset = { x: -320, y: 0 };

function createChatPanel() {
  chatPanel = document.createElement('div');
  chatPanel.className = 'waifu-chat collapsed';

  const toggleBtn = document.createElement('div');
  toggleBtn.className = 'waifu-chat-toggle';

  const messagesDiv = document.createElement('div');
  messagesDiv.className = 'waifu-chat-messages';

  const inputDiv = document.createElement('div');
  inputDiv.className = 'waifu-chat-input';
  const input = document.createElement('input');
  input.placeholder = '和我聊聊吧～';
  input.type = 'text';
  const sendBtn = document.createElement('button');
  sendBtn.innerText = '发送';

  chatPanel.appendChild(toggleBtn);
  chatPanel.appendChild(messagesDiv);
  chatPanel.appendChild(inputDiv);
  inputDiv.appendChild(input);
  inputDiv.appendChild(sendBtn);
  document.body.appendChild(chatPanel);

  // 折叠/展开逻辑
  toggleBtn.addEventListener('click', () => {
    chatPanel.classList.toggle('collapsed');
  });

  // 发送消息
  async function callLLMApi(message) {
    const apiUrl = 'http://localhost:3000/api/deepseek-chat';
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        timeout: 10000
      });
      if (!response.ok) throw new Error(`接口响应失败：${response.status}`);
      const data = await response.json();
      return data.reply || '抱歉，我没听懂你的意思～';
    } catch (error) {
      console.error('DeepSeek API 调用失败：', error);
      return `调用失败啦：${error.message}，请检查API Key和网络～`;
    }
  }

  async function sendMessage() {
    const userMsg = input.value.trim();
    if (!userMsg) return;

    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'chat-message user';
    userMsgEl.innerText = userMsg;
    messagesDiv.appendChild(userMsgEl);
    input.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    const aiReply = await callLLMApi(userMsg);
    const aiMsgEl = document.createElement('div');
    aiMsgEl.className = 'chat-message ai';
    aiMsgEl.innerText = aiReply;
    messagesDiv.appendChild(aiMsgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // 可选：Live2D 显示文字气泡
    const waifuTip = document.querySelector('#waifu-tips');
    if (waifuTip) {
      waifuTip.innerText = aiReply;
      waifuTip.style.opacity = 1;
      setTimeout(() => { waifuTip.style.opacity = 0; }, 5000);
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // 使用通用跟随函数
  setTimeout(() => {
    waifuContainer = document.querySelector('#waifu');
    if (waifuContainer && chatPanel) {
      followWaifu(chatPanel, chatOffset.x, chatOffset.y);
    }
  }, 3000);
}

// ----- 扫雷面板（新增）-----
let minesweeperPanel = null;
let minesweeperVisible = false;

function createMinesweeperPanel() {
  if (minesweeperPanel) return;

  minesweeperPanel = document.createElement('div');
  minesweeperPanel.className = 'waifu-minesweeper';
  minesweeperPanel.style.display = 'none';

  // 标题栏 + 设置按钮
  const header = document.createElement('div');
  header.className = 'minesweeper-header';
  header.innerHTML = '<span>扫雷</span><span class="minesweeper-settings-btn">⚙️</span>';
  minesweeperPanel.appendChild(header);

  // 设置面板（默认隐藏）
  const settingsDiv = document.createElement('div');
  settingsDiv.className = 'minesweeper-settings-panel';
  settingsDiv.style.display = 'none';
  settingsDiv.innerHTML = `
    <div><label>行数: <input type="number" id="mines-rows" min="1" max="20" value="9"></label></div>
    <div><label>列数: <input type="number" id="mines-cols" min="1" max="20" value="9"></label></div>
    <div><label>雷数: <input type="number" id="mines-count" min="1" max="400" value="10"></label></div>
    <button id="mines-apply">开始新游戏</button>
  `;
  minesweeperPanel.appendChild(settingsDiv);

  // 游戏信息栏
  const infoBar = document.createElement('div');
  infoBar.className = 'minesweeper-info';
  const mineCountSpan = document.createElement('span');
  mineCountSpan.id = 'mine-count';
  mineCountSpan.innerText = '10';
  const resetBtn = document.createElement('button');
  resetBtn.innerText = '😊';
  resetBtn.className = 'minesweeper-reset';
  infoBar.appendChild(mineCountSpan);
  infoBar.appendChild(resetBtn);
  minesweeperPanel.appendChild(infoBar);

  const gridDiv = document.createElement('div');
  gridDiv.className = 'minesweeper-grid';
  minesweeperPanel.appendChild(gridDiv);

  document.body.appendChild(minesweeperPanel);

  // 游戏状态变量
  let rows = 9, cols = 9, totalMines = 10;
  let board = [], mineMap = [], revealed = [], flagged = [];
  let gameOver = false, win = false;

  // 获取DOM元素引用
  const rowsInput = settingsDiv.querySelector('#mines-rows');
  const colsInput = settingsDiv.querySelector('#mines-cols');
  const minesInput = settingsDiv.querySelector('#mines-count');
  const applyBtn = settingsDiv.querySelector('#mines-apply');

  // 设置按钮点击事件
  const settingsBtn = header.querySelector('.minesweeper-settings-btn');
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = settingsDiv.style.display === 'block';
    settingsDiv.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      rowsInput.value = rows;
      colsInput.value = cols;
      minesInput.value = totalMines;
    }
  });

  // 应用新难度
  applyBtn.addEventListener('click', () => {
    const newRows = parseInt(rowsInput.value, 10);
    const newCols = parseInt(colsInput.value, 10);
    const newMines = parseInt(minesInput.value, 10);
    if (newRows < 1 || newRows > 20 || newCols < 1 || newCols > 20) {
      alert('行数和列数必须在1-20之间');
      return;
    }
    const maxMines = newRows * newCols - 1;
    if (newMines < 1 || newMines > maxMines) {
      alert(`雷数必须在1-${maxMines}之间`);
      return;
    }
    rows = newRows;
    cols = newCols;
    totalMines = newMines;
    settingsDiv.style.display = 'none';
    initGame();
  });

  // 初始化游戏
  function initGame() {
    board = Array(rows).fill().map(() => Array(cols).fill(0));
    mineMap = Array(rows).fill().map(() => Array(cols).fill(false));
    revealed = Array(rows).fill().map(() => Array(cols).fill(false));
    flagged = Array(rows).fill().map(() => Array(cols).fill(false));
    gameOver = false;
    win = false;
    mineCountSpan.innerText = totalMines;

    // 随机布雷
    let minesPlaced = 0;
    while (minesPlaced < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!mineMap[r][c]) {
        mineMap[r][c] = true;
        minesPlaced++;
      }
    }

    // 计算周围雷数
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (mineMap[r][c]) {
          board[r][c] = -1;
          continue;
        }
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && mineMap[nr][nc]) count++;
          }
        }
        board[r][c] = count;
      }
    }

    renderGrid();
  }

  // 渲染网格
  function renderGrid() {
    gridDiv.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridDiv.innerHTML = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (revealed[r][c]) {
          cell.classList.add('revealed');
          if (mineMap[r][c]) {
            cell.innerText = '💣';
            cell.classList.add('mine');
          } else {
            cell.innerText = board[r][c] > 0 ? board[r][c] : '';
          }
        } else if (flagged[r][c]) {
          cell.innerText = '🚩';
          cell.classList.add('flagged');
        }

        // 绑定事件，使用 currentTarget 确保获取单元格元素
        cell.addEventListener('click', onCellClick);
        cell.addEventListener('contextmenu', onCellRightClick);
        gridDiv.appendChild(cell);
      }
    }
  }

  // 左键点击处理
  function onCellClick(e) {
    e.preventDefault();
    if (gameOver || win) return;
    const cell = e.currentTarget; // 始终指向绑定的单元格
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    if (flagged[row][col]) return;
    revealCell(row, col);
  }

  // 右键标记处理
  function onCellRightClick(e) {
    e.preventDefault();
    if (gameOver || win) return;
    const cell = e.currentTarget;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    if (revealed[row][col]) return;

    flagged[row][col] = !flagged[row][col];
    // 更新剩余雷数
    const flaggedCount = flagged.reduce((sum, rowArr) => sum + rowArr.filter(v => v).length, 0);
    mineCountSpan.innerText = totalMines - flaggedCount;
    renderGrid();
  }

  // 翻开格子（递归）
  function revealCell(row, col) {
    if (revealed[row][col] || flagged[row][col]) return;
    revealed[row][col] = true;

    if (mineMap[row][col]) {
      // 踩雷
      gameOver = true;
      alert('💥 你踩到雷了！游戏结束。');
      // 显示所有雷
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (mineMap[r][c]) revealed[r][c] = true;
        }
      }
      renderGrid();
      return;
    }

    if (board[row][col] === 0) {
      // 空白格子，递归翻开周围
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr, nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !revealed[nr][nc] && !flagged[nr][nc]) {
            revealCell(nr, nc);
          }
        }
      }
    }

    renderGrid();

    // 检查胜利
    const allNonMinesRevealed = board.every((rowArr, r) =>
      rowArr.every((val, c) => (mineMap[r][c] ? true : revealed[r][c]))
    );
    if (allNonMinesRevealed) {
      win = true;
      alert('🎉 恭喜你，排雷成功！');
    }
  }

  resetBtn.addEventListener('click', initGame);

  // 初次初始化
  initGame();

  // 跟随看板娘移动
  setTimeout(() => {
    waifuContainer = document.querySelector('#waifu');
    if (waifuContainer && minesweeperPanel) {
      followWaifu(minesweeperPanel, 20, 0);
    }
  }, 3000);
}

// 切换扫雷面板显示
function toggleMinesweeper() {
  if (!minesweeperPanel) createMinesweeperPanel();
  minesweeperVisible = !minesweeperVisible;
  minesweeperPanel.style.display = minesweeperVisible ? 'flex' : 'none';
}

// ----- 主流程 -----
(async () => {
  // 避免图片跨域
  const OriginalImage = window.Image;
  window.Image = function(...args) {
    const img = new OriginalImage(...args);
    img.crossOrigin = "anonymous";
    return img;
  };
  window.Image.prototype = OriginalImage.prototype;

  await Promise.all([
    loadExternalResource(live2d_path + 'waifu.css', 'css'),
    loadExternalResource(live2d_path + 'waifu-tips.js', 'js')
  ]);

  initWidget({
    waifuPath: live2d_path + 'waifu-tips.json',
    cubism2Path: live2d_path + 'live2d.min.js',
    cubism5Path: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
    tools: ['hitokoto', 'asteroids', 'switch-model', 'switch-texture', 'photo', 'info', 'quit'],
    logLevel: 'warn',
    drag: true,
  });

  // 等待 DOM 渲染完成
  setTimeout(() => {
    waifuContainer = document.querySelector('#waifu');
    // 创建聊天面板
    createChatPanel();
    // 在工具条中添加扫雷按钮
    const toolDiv = document.getElementById('waifu-tool');
    if (toolDiv) {
      const mineSpan = document.createElement('span');
      mineSpan.id = 'waifu-tool-minesweeper';
      mineSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2--><path d="M256 32c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32zm-32 128c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32s32-14.3 32-32v-64c0-17.7-14.3-32-32-32zm96 32c0-17.7 14.3-32 32-32s32 14.3 32 32v64c0 17.7-14.3 32-32 32s-32-14.3-32-32v-64zm-192 0c0-17.7 14.3-32 32-32s32 14.3 32 32v64c0 17.7-14.3 32-32 32s-32-14.3-32-32v-64zm320 0c0-17.7 14.3-32 32-32s32 14.3 32 32v64c0 17.7-14.3 32-32 32s-32-14.3-32-32v-64zM256 288c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32s32-14.3 32-32v-64c0-17.7-14.3-32-32-32z"/></svg>`;
      mineSpan.title = '扫雷';
      mineSpan.addEventListener('click', toggleMinesweeper);
      toolDiv.appendChild(mineSpan);
    }
  }, 3000);
})();

console.log(`\n%cLive2D%cWidget%c\n`, 'padding: 8px; background: #cd3e45; font-weight: bold; font-size: large; color: white;', 'padding: 8px; background: #ff5450; font-size: large; color: #eee;', '');