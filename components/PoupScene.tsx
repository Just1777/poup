import { View, StyleSheet } from 'react-native';
import { Poup } from './Poup';
import { Flowers } from './Flowers';
import { PlantAmbiance } from './PlantAmbiance';
import type { Mood } from '../lib/types';

// Composition « gardien » : le grand pot de fleurs est le décor héros (derrière),
// avec une ambiance selon l'état (soleil, flocons, pétales…), et Poup se tient
// plus petit DEVANT, en posture de garde → on lit « il protège ».
export function PoupScene({ mood }: { mood: Mood }) {
  return (
    <View style={styles.scene}>
      <View style={styles.plantLayer}>
        <Flowers mood={mood} size={230} />
      </View>
      <PlantAmbiance mood={mood} />
      <View style={styles.poupLayer}>
        <Poup mood={mood} size={150} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { width: '100%', height: 300, alignItems: 'center', justifyContent: 'flex-end' },
  plantLayer: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  poupLayer: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
});
