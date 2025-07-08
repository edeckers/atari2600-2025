import "https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@v3.0.0/dist/cookieconsent.umd.js";
import { paq, unsafeWindow } from "./utils.js";

CookieConsent.run({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConsent: () => {
    if (CookieConsent.acceptedCategory("analytics")) {
      console.debug("Analytics accepted: allow Matomo");
      // maybePack.push(['rememberCookieConsentGiven']) isn't picked up on my Pixel 4a using Chrome - even though
      // it works fine in Firefox on the same device. So use window._paq instead :(
      unsafeWindow()._paq.push(["rememberCookieConsentGiven"]);
      return;
    }
    console.debug("Analytics rejected: forget Matomo");

    if (document.cookie.indexOf("mtm_consent_removed") > -1) {
      console.debug(
        "Consent removal has already been set, ignore to avoid error message from matomo.",
      );
      return;
    }

    paq()?.push(["forgetCookieConsentGiven"]);
  },
  cookie: {
    domain: ".branie.it",
  },
  categories: {
    necessary: {
      enabled: true,
      readOnly: true,
    },
    analytics: {},
  },
  language: {
    default: "en",
    translations: {
      en: {
        consentModal: {
          title: "Cookies 🍪",
          description:
            '<p>We use <span class="font-bold">functional</span> cookies that are necessary for the operation of the site and <span class="emphasize">analytical</span> cookies that give us insight into how the site is used.</p><p>&nbsp;</p><p>Which cookies may we place?</p>',
          acceptAllBtn: "Accept all",
          acceptNecessaryBtn: "Accept necessary",
          showPreferencesBtn: "Settings",
          footer: `<div style="display:flex; flex-direction: row; justify-content: flex-end; width: 100%;"><a href="/assets/files/privacy.pdf">Privacy Policy</a><a style="margin-left: 1rem;" href="/assets/files/terms.pdf">Terms</a></div>`,
        },
        preferencesModal: {
          title: "Cookie details",
          acceptAllBtn: "Accept all",
          acceptNecessaryBtn: "Accept necessary",
          savePreferencesBtn: "Accept selection",
          closeIconLabel: "Close",
          cookie_table_headers: [
            { name: "Name" },
            { domain: "Domain" },
            { expiration: "Validity period" },
            { description: "Description" },
          ],
          sections: [
            {
              description:
                "We place cookies to analyze the use of the site and use that knowledge to improve the user experience.",
            },
            {
              title: "Functional",
              description:
                "These cookies are necessary for the functioning of the site and therefore mandatory.",
              linkedCategory: "necessary",
            },
            {
              title: "Analytical",
              description:
                "The analytical cookies give us insight into the use of the site.",
              linkedCategory: "analytics",
              cookieTable: {
                headers: {
                  name: "Name",
                  domain: "Domain",
                  expiration: "Validity",
                  description: "Description",
                },
                body: [
                  {
                    name: "_pk_cvar",
                    domain: ".branie.it",
                    expiration: "30 minutes",
                    description: "",
                    is_regex: false,
                  },
                  {
                    name: "_pk_id",
                    domain: ".branie.it",
                    expiration: "13 months",
                    description: "",
                    is_regex: false,
                  },
                  {
                    name: "_pk_ref",
                    domain: ".branie.it",
                    expiration: "6 months",
                    description: "",
                    is_regex: false,
                  },
                  {
                    name: "_pk_ses",
                    domain: ".branie.it",
                    expiration: "30 minutes",
                    description: "",
                    is_regex: false,
                  },
                  {
                    name: "mtm_consent",
                    domain: ".branie.it",
                    expiration: "30 years",
                    description: "",
                    is_regex: false,
                  },
                  {
                    name: "MATOMO_SESSID",
                    domain: "lgtm.matomo.cloud",
                    expiration: "14 days",
                    description: "",
                    is_regex: false,
                  },
                ],
              },
            },
            {
              title: "More information",
              description:
                'For more information about our cookie policy, please <a class="cc-link" href="mailto:cookies@branie.it">contact us</a>.',
            },
          ],
        },
      },
    },
  },
});
