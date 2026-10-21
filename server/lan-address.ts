/** Literal private IPv4 only: desktop joining never navigates to public websites. */
export function isLanAddress(value: string): boolean {
  const address = value.startsWith('::ffff:') ? value.slice(7) : value;
  if (address === '::1') return true;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return false;
  const [a, b, c, d] = address.split('.').map(Number);
  if ([a, b, c, d].some(n => n > 255)) return false;
  return a === 127 || a === 10 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31 || a === 169 && b === 254;
}

export function parseLanHost(input: string): string {
  const value = input.trim();
  if (!value || value.length > 100 || /[\\?#@\s]/.test(value)) throw new Error('请输入主机的局域网 IPv4 地址，例如 192.168.1.20:5180。');
  const match = /^(?:http:\/\/)?(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{1,5}))?\/?$/.exec(value);
  if (!match || !isLanAddress(match[1])) throw new Error('仅支持局域网 IPv4 地址（10.x、172.16–31.x、192.168.x）或本机地址。');
  const port = Number(match[2] ?? 5180);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口应为 1–65535。');
  return `http://${match[1].split('.').map(Number).join('.')}:${port}`;
}
