import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';
import { router } from '@granite-js/plugin-router';

export default defineConfig({
  appName: 'flagup',
  scheme: 'intoss',
  entryFile: './src/_app.tsx',
  plugins: [
    router(),
    appsInToss({
      brand: {
        displayName: '청기백기 순발력 랭킹전',
        primaryColor: '#1B64DA',
        icon: '', // TODO: 콘솔에서 로고 업로드 후 URL 입력
      },
      permissions: [],
    }),
  ],
});
