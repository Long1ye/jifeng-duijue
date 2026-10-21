const api = window.jifeng;
const element = id => document.getElementById(id);
let busy = false;
function render(info) {
  element('version').textContent = 'v' + info.version;
  element('host-info').hidden = !info.hosting;
  element('host').textContent = info.hosting ? '进入主机对局' : '创建对局';
  element('addresses').replaceChildren();
  for (const address of info.addresses) {
    const row = document.createElement('div'); row.className = 'address-row';
    const code = document.createElement('code'); code.textContent = address;
    const copy = document.createElement('button'); copy.className = 'secondary'; copy.textContent = '复制';
    copy.onclick = () => act(() => api.copy(address), '主机地址已复制，请把游戏内六位房间码一并告诉好友。');
    row.append(code, copy); element('addresses').append(row);
  }
  element('host-note').textContent = info.addresses.length ? '多网卡时，请使用与好友处于同一局域网的地址。房间码显示在游戏窗口中。' : '未检测到局域网 IPv4 地址，请连接 Wi-Fi 或网线后停止主持并重试。';
}
async function act(operation, success) {
  if (busy) return;
  busy = true; document.querySelectorAll('button').forEach(b => b.disabled = true);
  element('message').classList.remove('error'); element('message').textContent = '正在处理，请稍候…';
  try {
    const result = await operation();
    if (!result.ok) throw new Error(result.error);
    render(result.data); element('message').textContent = success;
  } catch (error) { element('message').textContent = error.message; element('message').classList.add('error'); }
  finally { busy = false; document.querySelectorAll('button').forEach(b => b.disabled = false); }
}
element('host').onclick = () => act(() => api.host(), '主机已启动。将地址和游戏内房间码告诉好友，双方点击准备后开局。');
element('stop').onclick = () => act(() => api.stop(), '已停止主持，好友的连接已断开。');
element('solo').onclick = () => act(() => api.solo(), '单人游戏已打开，在游戏菜单中点击开始单人对局。');
element('join-form').onsubmit = event => { event.preventDefault(); act(() => api.join(element('address').value, element('room').value), '已连接主机，请在游戏内等待加载并点击准备。'); };
api.info().then(result => { if (result.ok) render(result.data); });
