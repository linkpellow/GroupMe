// Utility to lock/unlock body scrolling across the app
let lockCount = 0;
let originalOverflow = '';

export const lockScroll = (): void => {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.classList.add('scroll-locked');
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
};

export const unlockScroll = (): void => {
  if (typeof document === 'undefined') return;
  if (lockCount > 0) {
    lockCount -= 1;
    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow;
      document.body.classList.remove('scroll-locked');
    }
  }
};

export const isScrollLocked = () => lockCount > 0; 