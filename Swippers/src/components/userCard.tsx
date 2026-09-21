import { View, Pressable, Image, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

export function UserCard() {
    return (
    <>
      <View style={styles.container}>
        <View style={styles.profileCard}>
          <ThemedText type="subtitle">Name placeholder</ThemedText>
          <ThemedText type="default">Description placeholder.</ThemedText>
          <ThemedText style={styles.cardText} type="default">Fighting style placeholder</ThemedText>
        </View>
        {/* <View style={styles.menuButtons}>
          <ThemedText type="default">Menu Button 1</ThemedText>
          <ThemedText type="default">Menu Button 2</ThemedText>
        </View> */}
      </View>

    </>
  );
}


const styles = StyleSheet.create({ 
  container: {
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    alignItems: 'center',
    top: '5%',
    fontFamily: 'Anton_400Regular',
    fontSize: 10,
  },

  profileCard: {
    zIndex: 2,
    width: '90%',
    height: '70%',
    padding: 20,
    borderRadius: 10,
    borderColor: '#ffffff',
    borderWidth: 1,
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    color: '#ffffff',
  },
  cardText: {
    color: '#ffffff',
    marginTop: '140%',
  },
});