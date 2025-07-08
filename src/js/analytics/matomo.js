import { paq } from "./utils.js";

export const loadTracker = () => {
  const maybePaq = paq();
  if (!maybePaq) {
    return;
  }

  const baseUrl = "https://lgtm.matomo.cloud/";

  maybePaq.push(["setTrackerUrl", baseUrl + "matomo.php"]);
  maybePaq.push(["setSiteId", "1"]);
  const d = document,
    g = d.createElement("script"),
    s = d.getElementsByTagName("script")[0];
  g.async = true;
  g.src = "https://cdn.matomo.cloud/lgtm.matomo.cloud/matomo.js";

  s.parentNode?.insertBefore(g, s);
};

loadTracker();
