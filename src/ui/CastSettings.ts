import type { SkillCasting, CastMode } from '../presentation/SkillCasting';

export function mountCastSettings(casting: SkillCasting): void {
  const label = document.createElement('label'); label.className = 'cast-settings';
  const title = document.createElement('span'); title.textContent = '技能施法';
  const select = document.createElement('select'); select.setAttribute('aria-label', '技能施法模式');
  for (const [value, text] of [['instant', '按下释放'], ['release', '长按显示范围，松开释放']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
  }
  try { if (localStorage.getItem('midline-cast-mode') === 'release') casting.setMode('release'); } catch { /* Optional preference. */ }
  select.value = casting.mode;
  select.addEventListener('change', () => {
    casting.setMode(select.value as CastMode);
    try { localStorage.setItem('midline-cast-mode', casting.mode); } catch { /* Optional preference. */ }
  });
  const help = document.createElement('small'); help.textContent = '点击 Q/W/E/R 图标后，移动鼠标瞄准，左键释放；右键 / Esc 取消。';
  label.append(title, select, help);
  document.getElementById('operation-settings')!.prepend(label);
  const guide = document.querySelector('.guide-combat-panel') ?? document.querySelector('.operation-guide-body')!;
  const tip = document.createElement('p'); tip.className = 'cast-guide-tip';
  tip.textContent = '技能图标：点击选技能 → 左键释放。右键 / Esc 取消；施法模式可在「设置 → 操作设置」切换。'; guide.append(tip);
}
