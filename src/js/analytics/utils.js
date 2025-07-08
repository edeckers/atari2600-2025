// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const unsafeWindow = () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return window;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const paq = () => {
  const maybeWindow = unsafeWindow();
  if (!maybeWindow) {
    return undefined;
  }

  if (maybeWindow._paq) {
    return maybeWindow._paq;
  }

  maybeWindow._paq = maybeWindow._paq || [];

  maybeWindow._paq.push(["setCookieDomain", "*.branie.it"]);
  // maybeWindow._paq.push(["setDoNotTrack", true]);
  maybeWindow._paq.push(["trackPageView"]);
  maybeWindow._paq.push(["enableLinkTracking"]);
  maybeWindow._paq.push(["requireCookieConsent"]);

  // Returning _paq doesn't work correctly on my Pixel 4a using Chrome: push(rememberCookieConsent) isn't picked up.
  return maybeWindow._paq;
};
