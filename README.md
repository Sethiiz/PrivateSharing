# Private Sharing

Compartilhamento de tela por salas, sem cadastro. Cria ou entra numa sala com
um código; só vê e é visto por quem estiver na mesma sala. O vídeo vai
P2P via WebRTC — o servidor só cuida da sinalização.

- `server/` — servidor de sinalização (Node + ws). Hospeda em qualquer lugar
  com HTTPS/WSS (Render, Fly.io, VPS).
- `client/` — app Electron, builda como instalador `.exe` pro Windows.

## Subir o servidor

Render.com (grátis):
1. Suba a pasta `server/` (ou o repo inteiro) num repositório.
2. New → Web Service → aponte pro repo.
3. Build: `pnpm install`. Start: `pnpm start`.
4. Anota a URL (`https://algo.onrender.com` → `wss://algo.onrender.com`).

VPS: `pnpm install && pnpm start` atrás de um proxy reverso com HTTPS
(nginx/Caddy + Let's Encrypt).

## Configurar o cliente

Por padrão o app aponta pro servidor já hospedado
(`wss://privatesharing.onrender.com`, definido em
`client/src/renderer/settings.js`). Pra apontar pro seu próprio servidor,
não precisa mexer no código: abra o app, entre numa sala, clique no ícone
de engrenagem (Configurações) e troque o "Endereço WSS" — dá pra testar a
conexão ali mesmo antes de salvar. Fica salvo por máquina.

## Rodar / gerar o instalador

```bash
cd client
pnpm install
pnpm start        # rodar local
pnpm run dist      # gerar client/dist/Private Sharing Setup 1.0.0.exe
```

`pnpm run dist` funciona melhor numa máquina Windows (em Linux/Mac precisa de
`wine`).

Precisa rodar o servidor de sinalização também (`cd server && pnpm install &&
pnpm start`, escuta na porta 8080 por padrão) — sem ele o app abre mas não
consegue conectar em nenhuma sala.

### Módulo nativo do "Áudio por app" (`client/native/audio_mixer`)

O botão "Áudio por app" (bloquear o som de um aplicativo específico só na
transmissão) depende de um módulo nativo em C++ que usa a API de captura de
áudio por processo do Windows 10/11 — a mesma técnica usada pelo "Go Live" do
Discord. Só compila em Windows.

**Pré-requisito pra compilar** (não precisa pra só rodar um `.exe` já
gerado): Visual Studio Build Tools com o workload "Desktop development with
C++". Instala via winget:
```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --silent `
  --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

O binário compilado (`build/Release/audio_mixer.node`) não vai pro git — é
gitignorado de propósito (específico da máquina/versão do compilador). Depois
de clonar o repo, ou sempre que mexer nos arquivos em
`client/native/audio_mixer/src/`, recompila assim:
```bash
cd client/native/audio_mixer
npx node-gyp rebuild          # compila contra o Node do sistema (rápido, bom pra achar erro de compilação)
cd ../..
npx electron-rebuild -f -w audio_mixer --module-dir native/audio_mixer   # recompila pro ABI do Electron
```
Sem o `.node` compilado o app nem abre — `main.js` importa o módulo logo no
topo, então falta ele quebra o processo principal do Electron na hora.

### Se o `pnpm run dist` falhar com "Cannot create symbolic link"

O `electron-builder` baixa um pacote de assinatura (`winCodeSign`) mesmo pra
build só de Windows, e esse pacote tem links simbólicos — o Windows só deixa
criar symlink sem ser administrador se o "Modo de Desenvolvedor" estiver
ativado (Configurações → Privacidade e segurança → Para desenvolvedores).
Sem isso, roda `pnpm run dist` de um terminal aberto como Administrador.

### Se o `pnpm start` do client falhar com "Electron failed to install correctly"

Às vezes o `pnpm install` baixa o zip do Electron pro cache mas não extrai
ele em `node_modules` (rede instável, instalação interrompida etc). Dá pra
concluir a instalação na mão, sem reinstalar nada:

1. Confirma que o zip existe no cache (a pasta com hash varia por versão):
   ```powershell
   Get-ChildItem "$env:LOCALAPPDATA\electron\Cache" -Recurse -Filter *.zip
   ```
2. Extrai o zip pra dentro do pacote do Electron instalado (ajusta a versão
   se for diferente de `31.7.7`):
   ```powershell
   $zip = "$env:LOCALAPPDATA\electron\Cache\<hash-da-pasta>\electron-v31.7.7-win32-x64.zip"
   $dest = "client\node_modules\.pnpm\electron@31.7.7\node_modules\electron\dist"
   Expand-Archive -Path $zip -DestinationPath $dest -Force
   ```
3. Cria o `path.txt` que o pacote `electron` usa pra achar o executável
   (normalmente esse arquivo é gerado pelo postinstall; se não existir, o
   `require('electron')` quebra mesmo com o `dist/` completo):
   ```powershell
   Set-Content -Path "client\node_modules\.pnpm\electron@31.7.7\node_modules\electron\path.txt" -Value "electron.exe" -NoNewline
   ```
4. Roda `pnpm start` de novo dentro de `client/`.

Se o zip nem estiver no cache, o problema é outro (rede/proxy bloqueando o
download) — nesse caso vale rodar `node node_modules/.pnpm/electron@<versão>/node_modules/electron/install.js`
manualmente pra ver o erro real, ou setar `ELECTRON_MIRROR` pra um espelho
acessível antes do `pnpm install`.

## Limitações

- **Mesh puro**: cada watcher abre uma conexão P2P direta com quem
  compartilha. Bom pra grupos pequenos; escala mal além disso (migrar pra
  um SFU tipo mediasoup/LiveKit se precisar).
- **Sem TURN por padrão**: usa só STUN público do Google. Redes com
  NAT/CGNAT restritivo podem falhar a conexão direta — a tela de
  Configurações tem a opção "STUN + TURN próprio" pra apontar um servidor
  TURN (coturn, metered.ca) sem mexer em código.
- **Áudio por app é Windows-only**: usa a API de captura de loopback por
  processo do Windows 10/11 (`native/audio_mixer/`). O `.node` compilado não
  vai pro git (veja "Rodar / gerar o instalador" acima) — sem ele o app não
  abre.
- **O app se exclui sozinho da lista de áudio**: pra evitar microfonia, os
  processos do próprio Private Sharing nunca aparecem no grid de "Áudio por
  app" e nunca entram na mixagem — não tem como habilitar.
