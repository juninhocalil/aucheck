# AcuCheck Audio Diagnostics

Mini projeto para aprender distribuição de apps desktop e Android. O usuário pode escolher um arquivo de áudio local ou usar o sinal sintético integrado.

## Comportamento e limites

- O áudio só começa depois que a pessoa toca explicitamente em **Run audio test**.
- Há seletor de arquivo local. O app reproduz no máximo os primeiros 2,5 segundos.
- O ganho interno é limitado a 20%; o app não altera o volume global do dispositivo.
- O botão **Stop** e a tecla Escape interrompem a reprodução.
- O app não roda em segundo plano, não inicia com o sistema, não coleta dados e não envia o áudio pela rede.
- A tela informa que um teste de áudio vai ocorrer.

## Windows: compilar instalador e app portátil

É possível compilar em Windows com Node.js 22 ou usar o workflow do GitHub Actions incluído em `.github/workflows/build-windows.yml`.

Localmente em Windows:

```powershell
npm install
npm run dist
```

Os artefatos ficarão em `dist-win/`.

## Android: compilar APK

A versão Android usa Capacitor. Requisitos para compilação local: Node.js 22, Java 21 e Android SDK/API 36. Instale o Android Studio e os componentes de SDK pelo SDK Manager, ou use o workflow `.github/workflows/build-android.yml` no GitHub Actions.

Para gerar o projeto Android e compilar localmente:

```bash
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

O APK de depuração será `android/app/build/outputs/apk/debug/app-debug.apk`. Ele é adequado para instalação manual/testes, não é um pacote de lançamento assinado profissionalmente para a Play Store.

## Build no GitHub Actions

1. Crie um repositório no GitHub e envie o conteúdo completo desta pasta (incluindo `.github/workflows`).
2. Abra **Actions** no repositório; habilite Actions se o GitHub solicitar.
3. Escolha **Build Windows app** ou **Build Android APK** e clique em **Run workflow**.
4. Ao terminar, abra aquela execução e baixe o artefato da seção **Artifacts**. Extraia o ZIP do artefato. O Windows terá o instalador e o executável portátil; o Android terá `AcuCheck-Android-debug.apk`.

Os artefatos de Actions expiram após 30 dias. Para links mais duradouros, crie uma Release do GitHub e anexe os arquivos depois de revisar e testar ambos.

## WhatsApp

O WhatsApp pode aceitar ou rejeitar extensões específicas dependendo do cliente/versão. Para evitar erros, o método mais confiável é hospedar o EXE/APK em uma GitHub Release ou serviço de arquivos e enviar o link pelo WhatsApp. O destinatário do Android precisará autorizar a instalação de apps daquela fonte caso instale um APK diretamente; só faça isso quando confiar no arquivo e na origem.

## Rodar a interface no Linux para testar

Abra `web/index.html` em um navegador para testes rápidos. Para testar PWA/service worker, sirva a pasta via `localhost` ou HTTPS, em vez de usar `file://`.

A janela Electron pode ser rodada em um ambiente com Node.js depois de instalar as dependências:

```bash
npm install
npm start
```
# aucheck
