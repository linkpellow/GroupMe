import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotes } from '../context/NotesContext';
import { useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';

interface NotesEditorProps {
  leadId: string;
  initialNotes: string;
  className?: string;
  style?: React.CSSProperties;
  onSaveSuccess?: () => void;
}

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const ResizeBar = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
  cursor: ns-resize;
  /* transparent by default; could add background-image for grip icon */
`;

const NotesEditor: React.FC<NotesEditorProps> = ({
  leadId,
  initialNotes,
  className,
  style,
  onSaveSuccess,
}) => {
  const { user } = useAuth();
  const { updateNotes } = useNotes();
  const queryClient = useQueryClient();
  const editorIdRef = useRef<string>(Math.random().toString(36).substring(2, 9));
  const draftKey = `notesDraft_${user?.id || 'anon'}_${leadId}`;
  const [text, setText] = useState<string>(() => {
    const stored = localStorage.getItem(draftKey);
    if (stored !== null) return stored;
    return initialNotes;
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastEditRef = useRef<number>(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
    localStorage.setItem(draftKey, text);
    }
  }, [text, draftKey, isFocused]);

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      let msg: any;
        try {
        msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        } catch {
        return;
      }

      if (
        msg?.type === 'LEAD_NOTES_UPDATED' &&
        msg.leadId === leadId &&
        msg.editorId !== editorIdRef.current &&
        typeof msg.notes === 'string'
      ) {
        // If user is actively editing, ignore incoming updates to avoid overwriting draft
        if (isFocused) {
          return;
        }

        const incomingTime = msg.updatedAt ? new Date(msg.updatedAt).getTime() : 0;
        if (incomingTime >= lastEditRef.current) {
          lastEditRef.current = incomingTime;
          setText(msg.notes);
        updateNotes(leadId, msg.notes);
        localStorage.removeItem(draftKey);
        }
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [leadId, draftKey, updateNotes, isFocused]);

  const handleSave = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    try {
      await updateNotes(leadId, text);
      localStorage.removeItem(draftKey); // Clear draft on successful save
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  }, [leadId, text, draftKey, onSaveSuccess, updateNotes]);

  const triggerSave = (newText: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const saveFn = async () => {
      try {
        const now = Date.now();
        lastEditRef.current = now;

        await updateNotes(leadId, newText);
        // Optimistically update cached leads pages 
        queryClient.setQueriesData({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'leads',
        }, (old) => {
          if (!old || typeof old !== 'object' || !(old as any).leads) return old;
          return {
            ...(old as any),
            leads: (old as any).leads.map((l: any) => (l._id === leadId ? { ...l, notes: newText } : l)),
          };
        });

        localStorage.removeItem(draftKey);
        /* Trigger delayed refetch so server truth arrives, but give optimistic change time to paint */
        if (onSaveSuccess) {
          setTimeout(onSaveSuccess, 300);
        }
      } catch (err) {
        console.error('Failed to save notes', err);
      }
    };

    debounceRef.current = setTimeout(saveFn, 700); // trailing-edge only
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void handleSave();
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  // === Custom vertical resize logic ===
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const ta = textareaRef.current;
    if (!ta) return;
    const startHeight = ta.offsetHeight;

    const onMove = (ev: MouseEvent) => {
      const newH = Math.max(60, startHeight + (ev.clientY - startY));
      ta.style.height = `${newH}px`;
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <Wrapper>
    <textarea
      data-cy="notes-editor"
      className={className || 'notes-textarea'}
      style={{
        resize: 'none',
        width: '100%',
        minHeight: '80px',
        maxHeight: '500px',
        ...style,
      }}
      value={text}
      placeholder="Add notes..."
      ref={textareaRef}
      onChange={(e) => {
        setText(e.target.value);
        const now = Date.now();
        lastEditRef.current = now; // mark latest local edit immediately
        triggerSave(e.target.value);
      }}
      onKeyDownCapture={(e) => e.stopPropagation()}
      onBlur={handleBlur}
      onFocus={handleFocus}
    />
    <ResizeBar onMouseDown={startDrag} />
    </Wrapper>
  );
};

export default NotesEditor; 