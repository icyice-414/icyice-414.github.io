/*!
 * Live2D Widget
 * https://github.com/stevenjoezhang/live2d-widget
 */

// Recommended to use absolute path for live2d_path parameter
// live2d_path 参数建议使用绝对路径
const live2d_path = '/live2d-widget/';
// const live2d_path = '/dist/';

// Method to encapsulate asynchronous resource loading
// 封装异步加载资源的方法
function loadExternalResource(url, type) {
  return new Promise((resolve, reject) => {
    let tag;

    if (type === 'css') {
      tag = document.createElement('link');
      tag.rel = 'stylesheet';
      tag.href = url;
    }
    else if (type === 'js') {
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

// 新增：全局变量保存聊天面板和Live2D容器
let chatPanel = null;
let waifuContainer = null;
// 聊天面板相对于Live2D的偏移量（可自定义）
const chatOffset = { x: -320, y: 0 }; // 左移320px，垂直对齐

function createChatPanel() {
  // 创建聊天面板容器
  const chatPanel = document.createElement('div');
  chatPanel.className = 'waifu-chat collapsed';
  
  // 新增：折叠/展开按钮
  const toggleBtn = document.createElement('div');
  toggleBtn.className = 'waifu-chat-toggle';

  // 消息列表
  const messagesDiv = document.createElement('div');
  messagesDiv.className = 'waifu-chat-messages';
  
  // 输入框+发送按钮
  const inputDiv = document.createElement('div');
  inputDiv.className = 'waifu-chat-input';
  const input = document.createElement('input');
  input.placeholder = '和我聊聊吧～';
  input.type = 'text';
  const sendBtn = document.createElement('button');
  sendBtn.innerText = '发送';
  
  // 组装DOM
  chatPanel.appendChild(toggleBtn);
  chatPanel.appendChild(messagesDiv);
  chatPanel.appendChild(inputDiv);
  inputDiv.appendChild(input);
  inputDiv.appendChild(sendBtn);
  document.body.appendChild(chatPanel);

  // 2. 折叠/展开逻辑
  toggleBtn.addEventListener('click', () => {
    chatPanel.classList.toggle('collapsed');
    // 折叠/展开后重新同步位置
    syncChatPosition();
  });

  // 适配 DeepSeek 的前端调用函数（调用自己的后端转发接口）
  async function callLLMApi(message) {
    // 🌟 关键：前端只调用你本地/服务器的后端接口，不要直接写 DeepSeek 的地址！
    const apiUrl = 'http://localhost:3000/api/deepseek-chat'; // 后端转发接口地址
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // 必须是 JSON 格式
        },
        body: JSON.stringify({ 
          message: message // 把用户输入的消息传给后端
        }),
        // 可选：超时设置（避免接口卡壳）
        timeout: 10000
      });

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`接口响应失败：${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // 后端返回的回复字段是 reply
      return data.reply || '抱歉，我没听懂你的意思～';
    } catch (error) {
      console.error('DeepSeek API 调用失败：', error);
      // 友好的错误提示
      return `调用失败啦：${error.message}，请检查API Key和网络～`;
    }
  }

  // 4. 新增：发送消息逻辑
  async function sendMessage() {
    const userMsg = input.value.trim();
    if (!userMsg) return;

    // 1. 显示用户消息
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'chat-message user';
    userMsgEl.innerText = userMsg;
    messagesDiv.appendChild(userMsgEl);

    // 2. 清空输入框，滚动到最新消息
    input.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // 3. 调用LLM API，显示AI回复
    const aiReply = await callLLMApi(userMsg);
    const aiMsgEl = document.createElement('div');
    aiMsgEl.className = 'chat-message ai';
    aiMsgEl.innerText = aiReply;
    messagesDiv.appendChild(aiMsgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // 5. 可选：联动Live2D（显示文字气泡/触发动作）
    showWaifuTip(aiReply); // 让Live2D显示回复气泡
  }

  // 绑定发送按钮点击事件
  sendBtn.addEventListener('click', sendMessage);
  // 绑定回车发送
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // 可选：Live2D显示文字气泡（复用原有tips逻辑）
  function showWaifuTip(text) {
    const waifuTip = document.querySelector('#waifu-tips');
    if (waifuTip) {
      waifuTip.innerText = text;
      waifuTip.style.opacity = 1;
      // 5秒后隐藏气泡
      setTimeout(() => {
        waifuTip.style.opacity = 0;
      }, 5000);
    }
  }

    // 6. 核心：同步聊天面板位置到Live2D
  function syncChatPosition() {
    if (!waifuContainer || !chatPanel) return;
    
    // 获取Live2D容器的实时位置和尺寸
    const waifuRect = waifuContainer.getBoundingClientRect();
    // 计算聊天面板的位置（基于Live2D的右下角）
    let chatLeft = waifuRect.right + chatOffset.x; // 水平偏移
    let chatTop = waifuRect.top + chatOffset.y;    // 垂直偏移

    // 适配折叠状态：如果折叠，微调位置（可选，让折叠按钮更贴近Live2D）
    if (chatPanel.classList.contains('collapsed')) {
      chatTop = waifuRect.top + 30; // 垂直居中对齐折叠按钮
    }

    // 设置聊天面板位置（用fixed定位，基于视口）
    chatPanel.style.left = `${chatLeft}px`;
    chatPanel.style.top = `${chatTop}px`;
    // 清除原有固定的right/bottom，避免冲突
    chatPanel.style.right = 'auto';
    chatPanel.style.bottom = 'auto';
  }

  // 7. 监听Live2D拖拽事件（核心：绑定位置）
  // 新的：监听Live2D位置变化，实时同步聊天面板（兼容所有拖拽逻辑）
  function listenWaifuDrag() {
    waifuContainer = document.querySelector('#waifu'); // 确保选择器和你的Live2D容器一致
    if (!waifuContainer || !chatPanel) return;

    // 1. 定时同步位置（每50ms检查一次，拖拽时实时更新，性能无影响）
    setInterval(() => {
      syncChatPosition();
    }, 50);

    // 2. 额外监听Live2D容器的样式变化（比如插件修改left/top时触发）
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        syncChatPosition(); // 样式变化就同步位置
      });
    });
    // 监听Live2D容器的style属性变化
    observer.observe(waifuContainer, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  // 初始化：先同步一次位置，再监听拖拽
  // 初始化：延迟3秒（确保Live2D加载完），同步位置+监听变化
  setTimeout(() => {
    waifuContainer = document.querySelector('#waifu'); // 确认选择器正确
    syncChatPosition(); // 初始化就同步一次
    listenWaifuDrag();  // 开启实时监听
  }, 3000);
}

(async () => {
  // If you are concerned about display issues on mobile devices, you can use screen.width to determine whether to load
  // 如果担心手机上显示效果不佳，可以根据屏幕宽度来判断是否加载
  // if (screen.width < 768) return;

  // Avoid cross-origin issues with image resources
  // 避免图片资源跨域问题
  const OriginalImage = window.Image;
  window.Image = function(...args) {
    const img = new OriginalImage(...args);
    img.crossOrigin = "anonymous";
    return img;
  };
  window.Image.prototype = OriginalImage.prototype;
  // Load waifu.css and waifu-tips.js
  // 加载 waifu.css 和 waifu-tips.js
  await Promise.all([
    loadExternalResource(live2d_path + 'waifu.css', 'css'),
    loadExternalResource(live2d_path + 'waifu-tips.js', 'js')
  ]);
  // For detailed usage of configuration options, see README.en.md
  // 配置选项的具体用法见 README.md
  initWidget({
    waifuPath: live2d_path + 'waifu-tips.json',
    // cdnPath: 'https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/',
    cubism2Path: live2d_path + 'live2d.min.js',
    cubism5Path: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
    tools: ['hitokoto', 'asteroids', 'switch-model', 'switch-texture', 'photo', 'info', 'quit'],
    logLevel: 'warn',
    drag: true,
    });

    createChatPanel();
})();



console.log(`\n%cLive2D%cWidget%c\n`, 'padding: 8px; background: #cd3e45; font-weight: bold; font-size: large; color: white;', 'padding: 8px; background: #ff5450; font-size: large; color: #eee;', '');

/*
く__,.ヘヽ.        /  ,ー､ 〉
         ＼ ', !-─‐-i  /  /´
         ／｀ｰ'       L/／｀ヽ､
       /   ／,   /|   ,   ,       ',
     ｲ   / /-‐/  ｉ  L_ ﾊ ヽ!   i
      ﾚ ﾍ 7ｲ｀ﾄ   ﾚ'ｧ-ﾄ､!ハ|   |
        !,/7 '0'     ´0iソ|    |
        |.从"    _     ,,,, / |./    |
        ﾚ'| i＞.､,,__  _,.イ /   .i   |
          ﾚ'| | / k_７_/ﾚ'ヽ,  ﾊ.  |
            | |/i 〈|/   i  ,.ﾍ |  i  |
           .|/ /  ｉ：    ﾍ!    ＼  |
            kヽ>､ﾊ    _,.ﾍ､    /､!
            !'〈//｀Ｔ´', ＼ ｀'7'ｰr'
            ﾚ'ヽL__|___i,___,ンﾚ|ノ
                ﾄ-,/  |___./
                'ｰ'    !_,.:
*/
