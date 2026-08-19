const grid = document.getElementById('sourceGrid');

document.getElementById('cancelBtn').onclick = () => window.picker.cancel();
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.picker.cancel();
});

window.picker.getSources().then((sources) => {
  for (const s of sources) {
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
});
