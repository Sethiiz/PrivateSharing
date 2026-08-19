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
3. Build: `npm install`. Start: `npm start`.
4. Anota a URL (`https://algo.onrender.com` → `wss://algo.onrender.com`).

VPS: `npm install && npm start` atrás de um proxy reverso com HTTPS
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
npm install
npm start        # rodar local
npm run dist      # gerar client/dist/Private Sharing Setup 1.0.0.exe
```

`npm run dist` funciona melhor numa máquina Windows (em Linux/Mac precisa de
`wine`).

## Limitações

- **Mesh puro**: cada watcher abre uma conexão P2P direta com quem
  compartilha. Bom pra grupos pequenos; escala mal além disso (migrar pra
  um SFU tipo mediasoup/LiveKit se precisar).
- **Sem TURN por padrão**: usa só STUN público do Google. Redes com
  NAT/CGNAT restritivo podem falhar a conexão direta — a tela de
  Configurações tem a opção "STUN + TURN próprio" pra apontar um servidor
  TURN (coturn, metered.ca) sem mexer em código.
- **Áudio do sistema**: depende do usuário marcar a opção certa no seletor
  nativo do Windows ao compartilhar.
