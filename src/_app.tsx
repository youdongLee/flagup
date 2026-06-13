import { AppsInToss } from '@apps-in-toss/framework';
import { InitialProps } from '@granite-js/react-native';
import { Component, PropsWithChildren } from 'react';
import { ScrollView, Text } from 'react-native';
import { context } from '../require.context';
import { GameProvider } from '../stores/GameContext';

class ErrorBoundary extends Component<PropsWithChildren, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 20 }}>
          <Text style={{ color: '#E53E3E', fontWeight: 'bold' }}>앱 오류 발생</Text>
          <Text>{err.message}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return (
    <ErrorBoundary>
      <GameProvider>{children}</GameProvider>
    </ErrorBoundary>
  );
}

export default AppsInToss.registerApp(AppContainer, { context });
