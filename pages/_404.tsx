import { createRoute } from '@granite-js/react-native';
import { View, Text, StyleSheet } from 'react-native';

export const Route = createRoute('/_404', { component: NotFoundPage });

function NotFoundPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>페이지를 찾을 수 없습니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#6B7280',
  },
});
