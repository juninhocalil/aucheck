# AcuCheck — como obter o APK e o EXE

O projeto inclui a interface da pegadinha e dois workflows que compilam os arquivos nos ambientes adequados: Windows para o `.exe` e Android SDK para o `.apk`.

## 0. Coloque seu áudio meme

Copie o arquivo para `web/audio/meme.mp3` antes de enviar ao GitHub. Sem ele, o app usa um som sintético estourado.

## 1. Enviar o projeto ao GitHub (a partir do Pop!_OS)

1. Baixe e extraia o ZIP.
2. No GitHub, crie um repositório novo chamado `acucheck-audio-diagnostics`. Deixe-o vazio (sem README/licença/gitignore inicial).
3. Abra o terminal na pasta `acucheck_prank` extraída e rode, substituindo `SEU_USUARIO` pelo usuário do GitHub:

```bash
git init
git add .
git commit -m "AcuCheck initial project"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/acucheck-audio-diagnostics.git
git push -u origin main
```

Se o Git disser que falta nome ou e-mail, configure-os com `git config --global user.name "Seu Nome"` e `git config --global user.email "seu-email"` e repita o `git commit`.

## 2. Compilar os dois arquivos

No repositório do GitHub:

1. Abra **Actions**. Se for solicitado, habilite GitHub Actions.
2. Clique em **Build Windows app** na lista à esquerda → **Run workflow** → confirme.
3. Depois, clique em **Build Android APK** → **Run workflow**.
4. Entre em cada execução quando ficar verde e baixe o ZIP na seção **Artifacts**.

Ao extrair os artefatos:

- Windows: instalador `.exe` e versão portátil `.exe`.
- Android: `AcuCheck-Android-debug.apk`.

Os workflows compilam no Windows e num runner com Android SDK/JDK, respectivamente. Não é necessário instalar essas toolchains no seu Pop!_OS para usar o GitHub Actions.

## 3. Enviar aos amigos

É possível tentar anexar os arquivos no WhatsApp como documentos, mas o cliente pode rejeitar determinados tipos de arquivo. O método mais consistente é hospedar os arquivos em uma GitHub Release ou serviço de arquivos confiável e mandar o link.

- Windows: teste o `.exe` no seu próprio computador antes de compartilhar. O SmartScreen pode mostrar aviso de reputação para apps novos sem assinatura digital.
- Android: o APK de debug é para instalação manual/testes. O Android pode pedir autorização para instalar apps vindos do navegador/gerenciador de arquivos. Os amigos só devem instalar se souberem que o arquivo é seu e confiarem nele.

## Como funciona

Abre com um relatório "sério" → pede para aumentar o volume → botão continuar → contagem 3-2-1 → áudio estourado → tela final. O app não mexe no volume do sistema; **Parar** e **Esc** interrompem o som. Ajustes de intensidade ficam no topo de `web/app.js`.
