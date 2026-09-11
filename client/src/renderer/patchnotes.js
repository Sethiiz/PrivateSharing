window.TDG = window.TDG || {};

// Uma entrada por versão publicada. Só aparece pra quem já tinha o app
// aberto numa versão anterior e atualizou — não aparece na primeira
// instalação. Adiciona uma linha nova aqui a cada `pnpm run publish`.
TDG.patchNotes = {
  '1.0.2': [
    'Atualizações agora chegam sozinhas: quando tiver uma nova versão, um botão "Atualizar" aparece no topo da sala.',
    'Corrigido: a conexão de sinalização não cai mais durante um compartilhamento longo (o que fazia a tela travar/sumir pra quem estava assistindo).',
  ],
  '1.0.3': ['Ao atualizar, agora aparece essa telinha com as novidades da versão.'],
  '1.0.5': ['Correção no empacotamento do instalador (o app não abria mais depois de atualizar).'],
};
