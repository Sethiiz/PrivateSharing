const screenSection = document.getElementById('screenSection');
const screenGrid = document.getElementById('screenGrid');
const windowSection = document.getElementById('windowSection');
const windowGrid = document.getElementById('windowGrid');

document.getElementById('cancelBtn').onclick = () => window.picker.cancel();
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.picker.cancel();
});

function renderSource(s, grid) {
  const btn = document.createElement('button');
  btn.className = 'sourceBtn';
  btn.onclick = () => window.picker.choose(s.id);

  const img = document.createElement('img');
  img.src = s.thumbnail;

  const label = document.createElement('span');
  label.textContent = s.name;

  btn.appendChild(img);
  btn.appendChild(label);
  grid.appendChild(btn);
}

window.picker.getSources().then((sources) => {
  const screens = sources.filter((s) => s.type === 'screen');
  const windows = sources.filter((s) => s.type !== 'screen');

  if (screens.length) {
    screenSection.hidden = false;
    for (const s of screens) renderSource(s, screenGrid);
  }
  if (windows.length) {
    windowSection.hidden = false;
    for (const s of windows) renderSource(s, windowGrid);
  }
});
