import {expect,it} from 'vitest';
import {isLanGameHost} from '../src/ui/LanAccess';
it('keeps LAN room entry on private hosts while hosted pages show instructions',()=>{
  for(const host of ['localhost','127.0.0.1','192.168.1.10','10.0.0.5','172.16.0.2','172.31.255.2','[::1]','game.local'])expect(isLanGameHost(host),host).toBe(true);
  for(const host of ['bilibili.com','www.bilibili.com','toy-host.test','192.168.1.999','192.168.1.10.example.com','172.32.0.2','8.8.8.8'])expect(isLanGameHost(host),host).toBe(false);
});
