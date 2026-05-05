import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { Colors } from '../../constants/colors';
import { getCounters } from '../../utils/tasbeeh';
import { TasbeehCounterView } from './TasbeehCounterView';
import { TasbeehListView } from './TasbeehListView';
import { TasbeehEditView } from './TasbeehEditView';

type SubtabView = 'counter' | 'list' | 'edit';

export interface TasbeehSubtabProps {
  theme: typeof Colors.dark;
  /** When set, jumps to counter view with this counter selected. */
  initialCounterId?: string | null;
  /** Optional cb fired when the user-supplied counter ID has been consumed. */
  onInitialCounterConsumed?: () => void;
}

export function TasbeehSubtab({
  theme,
  initialCounterId,
  onInitialCounterConsumed,
}: TasbeehSubtabProps) {
  const [view, setView] = useState<SubtabView>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeCounterId, setActiveCounterId] = useState<string | null>(null);
  const [hasCounters, setHasCounters] = useState<boolean | null>(null);

  // First mount — decide whether to land on counter or list based on whether
  // any non-default counters exist (or use initialCounterId if supplied).
  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await getCounters();
      if (!alive) return;
      setHasCounters(all.length > 0);
      if (initialCounterId) {
        setActiveCounterId(initialCounterId);
        setView('counter');
      } else if (all.length > 0) {
        setView('counter');
      } else {
        setView('list');
      }
    })();
    return () => {
      alive = false;
    };
  }, []); // intentionally only on mount

  // Handoff from Dhikr sub-tab — switch to counter view with provided ID.
  useEffect(() => {
    if (initialCounterId) {
      setActiveCounterId(initialCounterId);
      setView('counter');
      onInitialCounterConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCounterId]);

  const handleSelectCounter = useCallback((id: string) => {
    setActiveCounterId(id);
    setView('counter');
  }, []);

  const handleEditCounter = useCallback((id: string) => {
    setEditingId(id);
    setView('edit');
  }, []);

  const handleNewCounter = useCallback(() => {
    setEditingId(null);
    setView('edit');
  }, []);

  const handleSaved = useCallback(() => {
    setEditingId(null);
    setView('list');
  }, []);

  const handleDeleted = useCallback(() => {
    setEditingId(null);
    setView('list');
  }, []);

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setView('list');
  }, []);

  const handleShowList = useCallback(() => {
    setView('list');
  }, []);

  if (hasCounters === null) {
    return <View style={styles.flex} />;
  }

  return (
    <View style={styles.flex}>
      {view === 'counter' ? (
        <TasbeehCounterView
          theme={theme}
          initialCounterId={activeCounterId}
          onShowList={handleShowList}
        />
      ) : view === 'list' ? (
        <TasbeehListView
          theme={theme}
          onSelectCounter={handleSelectCounter}
          onEditCounter={handleEditCounter}
          onNewCounter={handleNewCounter}
        />
      ) : (
        <TasbeehEditView
          theme={theme}
          editingId={editingId}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onCancel={handleCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
