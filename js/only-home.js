// 检查是否为首页 (路径为 / 或 /index.html)
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
  
  // 动态加载看板娘
  const live2dScript = document.createElement('script');
  live2dScript.src = 'https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/autoload.js';
  document.body.appendChild(live2dScript);

  // 动态加载流星效果
  const meteorScript = document.createElement('script');
  meteorScript.src = 'https://cdn.jsdelivr.net/gh/bobochang825/Meteor-Falling/meteor.js';
  document.body.appendChild(meteorScript);
}