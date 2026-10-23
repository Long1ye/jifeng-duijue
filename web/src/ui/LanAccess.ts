/** The bundled server is reachable through loopback or a private LAN address. */
export function isLanGameHost(hostname: string): boolean {
  const host=hostname.toLowerCase();
  if(host==='localhost'||host.endsWith('.localhost')||host==='[::1]'||host==='::1'||host.endsWith('.local'))return true;
  const parts=host.split('.');
  if(parts.length!==4||parts.some(part=>!/^\d+$/.test(part)||Number(part)>255))return false;
  const [a,b]=parts.map(Number);
  return a===127||a===10||a===192&&b===168||a===172&&b>=16&&b<=31||a===169&&b===254;
}
