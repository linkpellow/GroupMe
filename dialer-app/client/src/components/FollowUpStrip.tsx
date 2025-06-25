import React from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useFollowUps } from '../context/FollowUpContext';
import { useFollowUpUI } from '../context/FollowUpUIContext';
import StateIcon from './StateIcon';

const stateToIana: Record<string, string> = {
  AL: 'America/Chicago', AR: 'America/Chicago', IA: 'America/Chicago', IL: 'America/Chicago',
  KS: 'America/Chicago', LA: 'America/Chicago', MN: 'America/Chicago', MO: 'America/Chicago',
  MS: 'America/Chicago', OK: 'America/Chicago', WI: 'America/Chicago', TX: 'America/Chicago',
  SD: 'America/Chicago', ND: 'America/Chicago', GA: 'America/New_York', FL: 'America/New_York',
  SC: 'America/New_York', NC: 'America/New_York', VA: 'America/New_York', WV: 'America/New_York',
  KY: 'America/New_York', OH: 'America/New_York', MI: 'America/New_York', IN: 'America/Indiana/Indianapolis',
  NY: 'America/New_York', NJ: 'America/New_York', PA: 'America/New_York', MD: 'America/New_York',
  DE: 'America/New_York', ME: 'America/New_York', VT: 'America/New_York', NH: 'America/New_York',
  MA: 'America/New_York', CT: 'America/New_York', RI: 'America/New_York', CO: 'America/Denver',
  MT: 'America/Denver', NM: 'America/Denver', UT: 'America/Denver', WY: 'America/Denver',
  AZ: 'America/Phoenix', NV: 'America/Los_Angeles', CA: 'America/Los_Angeles',
  OR: 'America/Los_Angeles', WA: 'America/Los_Angeles', ID: 'America/Boise',
  AK: 'America/Anchorage', HI: 'Pacific/Honolulu',
};

const getCurrentTimeLabel = (stateAbbr?: string): string => {
  const tz = stateAbbr && stateToIana[stateAbbr.toUpperCase()];
  try {
    const locale = 'en-US';
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
      timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    return new Intl.DateTimeFormat(locale, options).format(new Date());
  } catch {
    return '';
  }
};

// Toggle to enable/disable decorative pin
const SHOW_PIN = false;

const FollowUpStrip: React.FC = () => {
  const { followUps, deleteFollowUp, updateFollowUpState } = useFollowUps();
  const { isVisible, toggleVisibility } = useFollowUpUI();

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      alert('Phone number copied to clipboard');
    } catch {
      window.prompt('Copy phone number:', text);
    }
  };

  /** Drag-to-pan helpers */
  const listRef = React.useRef<HTMLDivElement>(null);
  const isDraggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const scrollStartRef = React.useRef(0);

  // Attach / detach global move & up listeners once
  React.useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !listRef.current) return;
      e.preventDefault();
      const delta = e.pageX - startXRef.current;
      listRef.current.scrollLeft = scrollStartRef.current - delta;
    };

    const handleUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, []);

  if (!followUps.length) {
    return null;
  }

  return (
    <div
      className="followStrip"
      style={{
        background: 'transparent',
        padding: '8px 20px 8px 60px',
        paddingTop: isVisible ? '8px' : '0',
        transition: 'padding-top 0.2s ease-out',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 90,
        margin: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, marginRight: '15px', whiteSpace: 'nowrap' }}>
            Pinned Leads ({followUps.length})
          </h4>
          <button
            onClick={toggleVisibility}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
          >
            {isVisible ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      {isVisible && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            gap: '12px',
            overflowX: 'auto',
            overflowY: 'visible',
            marginTop: '4px',
            paddingBottom: '4px',
            overscrollBehaviorX: 'contain',
            overscrollBehaviorY: 'none',
            cursor: isDraggingRef.current ? 'grabbing' : 'grab',
          }}
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget as HTMLDivElement).scrollLeft += e.deltaY;
            }
          }}
          onMouseDown={(e) => {
            if (e.button !== 0) return; // Only left click
            // Skip drags that originate on interactive elements
            const target = e.target as HTMLElement;
            if (target.closest('button, a')) return;

            isDraggingRef.current = true;
            startXRef.current = e.pageX;
            scrollStartRef.current = e.currentTarget.scrollLeft;
            document.body.style.cursor = 'grabbing';
          }}
          ref={listRef}
        >
          {followUps.map((fl) => (
            <div
              key={fl.id}
              style={{
                position: 'relative', // For pin positioning
                border: '2px solid #333',
                borderRadius: '6px',
                width: '260px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
                background: '#444',
                scrollSnapAlign: 'start',
                flexShrink: 0,
              }}
            >
              {SHOW_PIN && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-18px',
                    left: '8px',
                    fontSize: '32px',
                    transform: 'rotate(-25deg)',
                    zIndex: 10001,
                  }}
                >
                  📌
                </span>
              )}
              <button
                onClick={() => deleteFollowUp(fl.id)}
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '24px',
                  height: '24px',
                  background: '#fff',
                  color: '#c00',
                  border: '1px solid #c00',
                  borderRadius: '4px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Remove lead"
              >
                ×
              </button>
              <div
                style={{
                  background: '#ffffff',
                  padding: '3px 6px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#000',
                }}
              >
                {fl.name}
              </div>
              <div
                style={{
                  background: '#fffde9',
                  minHeight: '14px',
                  padding: '2px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#000',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                title="Click to copy phone number"
                onClick={() => copyToClipboard(fl.phone)}
              >
                {fl.phone}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 0.8fr 1fr',
                  padding: '4px',
                  gap: '6px',
                  background: '#f5f5f5',
                }}
              >
                <a
                  href={`tel:${fl.phone.replace(/\D/g, '')}`}
                  style={{
                    background: '#4caf50',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    padding: '8px 16px',
                    height: '36px',
                    minWidth: '100px',
                    border: '2px solid #000',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.2), inset 0 -4px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  📞 Call
                </a>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    padding: '1px',
                  }}
                  title="Click to set state"
                  onClick={() => {
                    const input = window.prompt('Enter 2-letter state abbreviation (e.g., FL):');
                    if (!input) return;
                    updateFollowUpState(fl.id, input.toUpperCase().slice(0, 2));
                  }}
                >
                  {fl.state ? (
                    <StateIcon state={fl.state} />
                  ) : (
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>--</span>
                  )}
                </div>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {getCurrentTimeLabel(fl.state)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowUpStrip; 