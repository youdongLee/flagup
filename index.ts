import { AppRegistry } from 'react-native';
import App from './src/_app';

if (!AppRegistry.getAppKeys().includes('shared')) {
  AppRegistry.registerComponent('shared', () => App);
}
