import React from 'react';
import useNotesSync from '../hooks/useNotesSync';

export default function NotesSyncer() {
  // Simply mount the sync hook once
  useNotesSync();
  return null;
} 