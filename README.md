# AcuCheck Audio Diagnostics (pegadinha)

App com cara de utilitário sério. Ao abrir:

1. "Compila" um relatório falso (barra de progresso);
2. Pede para **aumentar o volume** para ouvir o "áudio compilado";
3. Ao tocar em **continuar**, faz contagem 3-2-1 e toca o áudio meme em volume máximo do app, com graves reforçados e distorção ("estourado");

O app **não muda o volume do sistema** (quem aumenta é a vítima, como a tela pede), não roda em segundo plano, não inicia com o sistema e não envia nada pela rede.
O botão **Parar** e a tecla **Esc** interrompem o áudio.

## Seu áudio meme

Coloque o arquivo em `web/audio/meme.mp3` (ou .wav/.ogg/.m4a) antes de compilar.
Sem arquivo, o app usa um som sintético estourado como padrão.

Ajustes em `web/app.js` (topo do arquivo): `BOOST` (quanto estoura), `DRIVE`, `MAX_SECONDS`, `COUNTDOWN_FROM`.

## Testar no Linux

Abra `web/index.html` no navegador (o fetch do áudio pode falhar em `file://`; nesse caso use `cd web && python3 -m http.server 8000` e abra `http://localhost:8000`).
Electron: `npm install && npm start`.

## Compilar

Pelo GitHub Actions (veja `COMECE_AQUI.md`): **Build Windows app** gera o `.exe`; **Build Android APK** gera o `.apk`.
Local no Windows: `npm install` e `npm run dist` (saída em `dist-win/`).
