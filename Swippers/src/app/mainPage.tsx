import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
 
export default function mainPage() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Welcome to the Main Page</ThemedText>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    alignItems: 'center',
    top: 0,
  },

  profileCard: {
    width: '90%',
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 20,
  },
});