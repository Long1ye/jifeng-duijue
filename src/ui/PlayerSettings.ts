import './player-settings.css';

export function togglePlayerSettings(): void {
  const dialog=document.getElementById('player-settings') as HTMLDialogElement|null;
  if(!dialog)return;
  if(dialog.open)dialog.close();
  else {document.dispatchEvent(new Event('midline:settings-open'));dialog.showModal();}
}

/** Move live controls into a native modal: focus stays in settings until closed. */
export function mountPlayerSettings(shell: HTMLElement): void {
  const scope=new AbortController();
  document.addEventListener('midline:dispose',()=>scope.abort(),{once:true,signal:scope.signal});
  const menu=document.createElement('button');menu.type='button';menu.className='hud-menu';menu.textContent='⚙ 设置';menu.title='选项 · F10';menu.setAttribute('aria-haspopup','dialog');menu.setAttribute('aria-controls','player-settings');menu.onclick=togglePlayerSettings;
  const dialog=document.createElement('dialog');dialog.id='player-settings';dialog.className='player-settings-window';dialog.setAttribute('aria-labelledby','settings-title');
  const heading=document.createElement('header');heading.className='settings-heading';
  const title=document.createElement('h1');title.id='settings-title';title.textContent='选项';
  const close=document.createElement('button');close.type='button';close.className='settings-close';close.textContent='×';close.setAttribute('aria-label','关闭设置');close.onclick=()=>dialog.close();heading.append(title,close);
  const layout=document.createElement('div');layout.className='settings-layout';
  const tabs=document.createElement('nav');tabs.className='settings-tabs';tabs.setAttribute('aria-label','设置分类');tabs.setAttribute('role','tablist');
  const content=document.createElement('div');content.className='hud-menu-content';
  const internal=document.createElement('div');internal.className='settings-internal';internal.hidden=true;
  internal.append(document.querySelector('.match-actions')!,document.querySelector('.controls-strip')!);
  const sections:HTMLElement[]=[];const buttons:HTMLButtonElement[]=[];
  const select=(index:number)=>{sections.forEach((section,i)=>section.hidden=i!==index);buttons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});};
  for(const [id,label] of [['operation-settings','操作'],['graphics-settings','视频']]){
    const index=sections.length;
    const tab=document.createElement('button');tab.type='button';tab.id=`${id}-tab`;tab.textContent=label;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',`${id}-panel`);tab.onclick=()=>select(index);
    tab.onkeydown=event=>{if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:buttons.length-1))%buttons.length;select(next);buttons[next].focus();}};
    tabs.append(tab);buttons.push(tab);
    const section=document.createElement('section');section.id=`${id}-panel`;section.className='settings-section';section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby',tab.id);
    const h=document.createElement('h2');h.textContent=label==='操作'?'操作设置':'画质设置';
    const controls=document.createElement('div');controls.id=id;controls.className='settings-controls';section.append(h,controls);sections.push(section);content.append(section);
  }
  select(0);layout.append(tabs,content);
  const footer=document.createElement('footer');footer.className='settings-footer';
  const hint=document.createElement('span');hint.textContent='设置即时生效 · F10 关闭';
  const done=document.createElement('button');done.type='button';done.textContent='确定';done.onclick=()=>dialog.close();footer.append(hint,done);
  dialog.append(heading,layout,footer);shell.append(menu,dialog,internal);
  const move=(id:string,selectors:string[])=>{
    const target=document.getElementById(id)!;
    for(const selector of selectors)for(const node of internal.querySelectorAll<HTMLElement>(selector))target.append(node instanceof HTMLSelectElement?node.closest('label')!:node);
  };
  move('operation-settings',['#camera-button','#follow','#sound-button','#sound','#music','#ambience','[data-setting-group="operation"]']);
  move('graphics-settings',['#detail','#quality','#fullscreen','#quality-compare','[data-setting-group="graphics"]']);
  dialog.addEventListener('cancel',event=>event.preventDefault());
  dialog.addEventListener('close',()=>{if(shell.isConnected)document.querySelector<HTMLElement>('#viewport,#arena')?.focus({preventScroll:true});});
  // Capture modal input before the game's window listeners, including Ctrl + skill keys.
  window.addEventListener('keydown',event=>{
    if(!shell.isConnected)return;
    if(event.key==='F10'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)togglePlayerSettings();return;}
    if(!dialog.open)return;
    event.stopImmediatePropagation();
  },{capture:true,signal:scope.signal});
}
