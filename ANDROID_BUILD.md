# Android APK do Kyvra

## Build do APK

A Action `.github/workflows/build-apk.yml` gera um APK de depuração em todo push e também pode ser executada manualmente em **GitHub → Actions → Build Android APK → Run workflow**. Baixe o artefato `kyvra-android-debug` ao fim da execução. Ele é assinado com a chave de depuração do Android e pode ser instalado para testes.

O build usa Node.js 22, JDK 21, Capacitor e Gradle 8.14.3. A versão do Gradle deve permanecer compatível com o Android Gradle Plugin configurado em `android/build.gradle`.

## Servidor e recursos de IA

O APK contém a interface e os plugins Android, mas não inicia um servidor Express dentro do aplicativo. Recursos que usam `/api/ai/*` precisam de um servidor Kyvra acessível por HTTPS.

Antes de gerar um APK que use esses recursos:

1. Implante o servidor deste repositório com `npm install --legacy-peer-deps`, `npm run build` e `npm start`.
2. Configure `GEMINI_API_KEY` no ambiente do servidor. Configure `GITHUB_TOKEN` somente se os recursos de GitHub forem usados.
3. Defina `VITE_NATIVE_API_URL` com a origem HTTPS desse servidor antes de executar `npm run build` e `npx cap sync android`. Isso pode ser feito em um arquivo `.env` local ou na configuração protegida do ambiente de build, usando apenas a origem que você escolheu e validou.

A chave Gemini permanece no servidor e não deve ser adicionada a variáveis com prefixo `VITE_`, ao APK ou ao repositório. A Action gera o APK de depuração sem fixar um servidor remoto; por isso, para incluir IA nesse artefato, configure a variável no ambiente de build antes da compilação.

Sem `VITE_NATIVE_API_URL`, a interface e a reprodução de áudio continuam disponíveis, mas os recursos do painel administrativo que chamam a API exibem uma mensagem de configuração.

## APK de lançamento assinado

A Action também gera e publica um APK de lançamento quando estes quatro segredos do repositório estão configurados:

- `ANDROID_KEYSTORE_BASE64`: arquivo keystore codificado em Base64.
- `ANDROID_KEYSTORE_PASSWORD`: senha do keystore.
- `ANDROID_KEY_ALIAS`: alias da chave.
- `ANDROID_KEY_PASSWORD`: senha da chave.

Mantenha o arquivo keystore fora do Git. O número da versão de lançamento usa o número da execução do GitHub Actions; antes de publicar atualizações em uma loja, confirme que ele é maior que o número da última versão distribuída.

## Instalação de teste

Depois de baixar `kyvra-android-debug`, instale `app-debug.apk` em um dispositivo Android. Para atualizar uma versão já instalada, assine as versões com a mesma chave.
