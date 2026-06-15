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
        icon: 'https://static.toss.im/appsintoss/28423/2eb0e5f5-ac8d-4a17-a351-fe15480ff685.png',
      },
      permissions: [],
    }),
  ],
});
