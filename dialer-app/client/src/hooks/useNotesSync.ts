import { useEffect } from 'react';
import { useNotes } from '../context/NotesContext';
import { useLeads } from '../context/LeadContext';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

/**
 * Listens for cross-window / WebSocket broadcasts carrying updated lead notes
 * and applies them to in-memory caches so every component re-renders instantly.
 */
export default function useNotesSync() {
  const { updateNotes: updateNotesCtx } = useNotes();
  const { updateNotes: updateLeadNotes } = useLeads();
  const queryClient = useQueryClient();

  // Track latest applied timestamp per lead in-memory for staleness checks
  const latestRef = React.useRef<Record<string, number>>({});

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      let data: any = event.data;
      try {
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
      } catch {
        /* not JSON, skip */
      }

      if (!data || data.type !== 'LEAD_NOTES_UPDATED') return;

      const { leadId, notes, updatedAt } = data;
      if (typeof leadId !== 'string' || typeof notes !== 'string') return;

      // Guard against stale payloads
      if (updatedAt) {
        const incoming = new Date(updatedAt).getTime();
        const last = latestRef.current[leadId] || 0;
        if (incoming < last) return; // older update, skip
        latestRef.current[leadId] = incoming;
      }

      // Update both contexts (they handle persistence/dedup internally)
      if (updateNotesCtx) void updateNotesCtx(leadId, notes);
      if (updateLeadNotes) updateLeadNotes(leadId, notes);

      // Optimistically patch any cached leads list queries so UI updates instantly
      queryClient.getQueryCache().findAll({ queryKey: ['leads'] }).forEach((q) => {
        const data: any = q.state.data as any;
        if (data && Array.isArray(data.leads)) {
          const updatedLeads = data.leads.map((l: any) =>
            l._id === leadId ? { ...l, notes } : l,
          );
          q.setData({ ...data, leads: updatedLeads });
        }
      });
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [updateNotesCtx, updateLeadNotes, queryClient]);
} 