import { StyleSheet, View } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { CustomBottomBar } from '@/components/CustomBottomBar';

export default function mainPage() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <>
      <View style={styles.container}>
        <ThemedText type="title">Welcome to Swippers</ThemedText>
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

        <CustomBottomBar />
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
    zIndex: 1,
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
  menuButtons: {
    zIndex: 1,
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    backgroundColor: '#000000',
    padding: 10,
    borderRadius: 5,
    borderColor: '#ffffff',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
});