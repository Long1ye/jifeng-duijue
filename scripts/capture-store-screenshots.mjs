import { _electron as electron } from 'file:///C:/Users/PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const root='D:/Long1ye/疾风对决';
const out=path.join(root,'宣传截图');
const candidates=path.join(root,'.cache/screenshots/candidates');
await fs.mkdir(out,{recursive:true}); await fs.mkdir(candidates,{recursive:true});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const apps=[], errors=[];
const start=async name=>{
 const app=await electron.launch({executablePath:path.join(root,'release/疾风对决-win32-x64/疾风对决.exe'),env:{...env,JIFENG_TEST_PROFILE:path.join(root,'.cache/screenshots',name)}});apps.push(app);
 app.on('window',page=>page.on('pageerror',error=>errors.push(error.message)));
 const launcher=await app.firstWindow();launcher.setDefaultTimeout(8000);return {app,launcher};
};
const gameWindow=async(client,selector)=>{const pending=client.app.waitForEvent('window');await client.launcher.click(selector);const page=await pending;page.setDefaultTimeout(8000);await page.setViewportSize({width:1920,height:1080});return page;};
const ready=page=>page.waitForFunction(()=>!document.querySelector('.asset-loading')&&!!document.querySelector('#viewport canvas'),{},{timeout:90000});
const tidy=async page=>{if(await page.locator('.operation-guide[open]').count())await page.locator('.operation-guide > summary').click();await page.mouse.move(1910,1050);};
const snap=async(page,name)=>{await page.screenshot({path:path.join(out,name)});console.log('Captured '+name);};
try{
 const solo=await start('capture-solo');const page=await gameWindow(solo,'#solo');
 await page.locator('.start-play').waitFor();await page.waitForTimeout(1200);await snap(page,'01-疾风对决-主菜单.png');
 await page.click('.start-play');await ready(page);await tidy(page);
 console.log('Opening shop',await page.locator('#shop-toggle').count());
 await page.click('#shop-toggle');await page.locator('#equipment-shop').waitFor({state:'visible'});
 await page.getByRole('button',{name:'本图装备',exact:true}).click();
 // Show a full recipe without changing the player's inventory or economy.
 const edge=page.locator('.shop-grid button').filter({has:page.locator('[data-item-icon="3031"]')});
 if(await edge.count())await edge.click();
 await page.mouse.move(1910,1050);await snap(page,'04-全装备与合成商店.png');
 const origin=new URL(page.url()).origin;
 await page.goto(origin+'/three.html?map=howling&scene=combat&launch=1');await ready(page);await tidy(page);
 await page.mouse.move(960,540);for(let i=0;i<3;i++){await page.mouse.wheel(0,-100);await page.waitForTimeout(100);}
 await page.waitForTimeout(300);await page.screenshot({path:path.join(candidates,'combat-before.png')});
 // These are the game's shipped combat-practice controls; no state or pixels are edited.
 await page.mouse.move(1120,600);await page.keyboard.press('w');await page.waitForTimeout(1300);
 await snap(page,'03-风墙与剑风技能.png');
 await page.mouse.move(1120,600);await page.keyboard.press('q');await page.waitForTimeout(180);
 await page.screenshot({path:path.join(candidates,'q-action.png')});
 await snap(page,'02-冰桥近身交锋.png');
 for(let i=0;i<4;i++){await page.waitForTimeout(90);await page.screenshot({path:path.join(candidates,`combat-action-${i}.png`)});}
 await solo.app.close();apps.splice(apps.indexOf(solo.app),1);
 const host=await start('capture-host');const hostGame=await gameWindow(host,'#host');
 await hostGame.waitForFunction(()=>/^\d{6}$/.test(document.querySelector('[data-code]')?.textContent??''),{},{timeout:90000});
 await host.launcher.waitForSelector('.address-row code');
 const address=await host.launcher.locator('.address-row code').first().textContent(),code=await hostGame.locator('[data-code]').textContent();
 const guest=await start('capture-guest');await guest.launcher.fill('#address',address);await guest.launcher.fill('#room',code);const guestGame=await gameWindow(guest,'#join');
 await Promise.all([hostGame,guestGame].map(p=>p.waitForFunction(()=>{const b=document.querySelector('[data-ready]');return b&&!b.disabled;},{},{timeout:90000})));
 await hostGame.click('[data-ready]');await hostGame.waitForTimeout(500);
 await snap(hostGame,'05-局域网双人对战.png');
 await guestGame.click('[data-ready]');
 await hostGame.waitForFunction(()=>document.querySelector('.battle-lobby')?.hidden,{},{timeout:20000});
 await tidy(hostGame);await tidy(guestGame);
 await hostGame.waitForTimeout(1500);await hostGame.screenshot({path:path.join(candidates,'lan-playing.png')});
 await fs.writeFile(path.join(out,'截图说明.json'),JSON.stringify({capture:'Actual packaged Windows executable, 1920x1080, unretouched',source:path.join(root,'release/疾风对决-win32-x64/疾风对决.exe'),images:[{file:'01-疾风对决-主菜单.png',scene:'游戏主菜单'},{file:'02-冰桥近身交锋.png',scene:'游戏内置战斗练习场，实际按键施法'},{file:'03-风墙与剑风技能.png',scene:'游戏内置战斗练习场，实际按键施法'},{file:'04-全装备与合成商店.png',scene:'正常单人对局装备商店'},{file:'05-局域网双人对战.png',scene:'两个打包程序实例经局域网地址加入同一房间'}],errors},null,2));
}catch(error){console.error(error);for(const [i,app]of apps.entries())for(const[j,page]of app.windows().entries())await page.screenshot({path:path.join(candidates,`failure-${i}-${j}.png`)}).catch(()=>{});process.exitCode=1;}
finally{await Promise.allSettled(apps.map(app=>app.close()));}
