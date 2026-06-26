import { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import PagerView, {
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
import { HomeScreen } from '../components/HomeScreen';
import { HistoryScreen } from '../components/HistoryScreen';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { usePlantState } from '../lib/hooks/usePlantState';

export default function App() {
  const pager = useRef<PagerView>(null);
  const [index, setIndex] = useState(0);
  // État + thème partagés (une seule souscription) entre les deux pages.
  const plant = usePlantState();

  const goTo = (i: number) => {
    pager.current?.setPage(i);
    setIndex(i);
  };

  const onPageSelected = (e: PagerViewOnPageSelectedEvent) => {
    setIndex(e.nativeEvent.position);
  };

  return (
    <View style={styles.fill}>
      <PagerView
        ref={pager}
        style={styles.fill}
        initialPage={0}
        onPageSelected={onPageSelected}
      >
        <View key="poup" style={styles.fill}>
          <HomeScreen {...plant} />
        </View>
        <View key="history" style={styles.fill}>
          <HistoryScreen theme={plant.theme} reading={plant.reading} />
        </View>
      </PagerView>

      <FloatingTabBar activeIndex={index} onSelect={goTo} accent={plant.theme.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
