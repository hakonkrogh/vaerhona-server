import fs from "fs";

import { bashCmd, reboot } from "./utils.js";

// wpa_supplicant quoted strings can't contain a literal " or newline, so we
// refuse those values rather than write a corrupt config file.
const isUnsafeValue = (v) => typeof v !== "string" || /["\n\r]/.test(v);

export const wifiSettings = {
  path: "/etc/wpa_supplicant/wpa_supplicant.conf",
  parseConfigContent: (content) => {
    try {
      const configs = [];

      // Parse each `network={ ... }` block independently so field order,
      // extra fields, and open (psk-less) networks don't break parsing.
      const blockRegex = /network=\{([^}]*)\}/g;
      let block;
      while ((block = blockRegex.exec(content)) !== null) {
        const body = block[1];
        const ssidMatch = body.match(/ssid="([^"]*)"/);
        const pskMatch = body.match(/psk="([^"]*)"/);

        if (ssidMatch) {
          configs.push({
            ssid: ssidMatch[1],
            psk: pskMatch ? pskMatch[1] : "",
          });
        }
      }

      return configs;
    } catch (e) {
      console.log(e);
      return [];
    }
  },
  toConfigContent: (config) => {
    return `ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=NO

${config
  .filter((c) => {
    if (isUnsafeValue(c.ssid) || (c.psk != null && isUnsafeValue(c.psk))) {
      console.warn("Skipping invalid wifi entry", c);
      return false;
    }
    return true;
  })
  .map((c) => {
    const psk = c.psk == null ? "" : c.psk;
    return `network={
  ssid="${c.ssid}"
  psk="${psk}"
}

`;
  })
  .join("")}`;
  },
  get() {
    const content = fs.readFileSync(this.path, "utf-8");

    return this.parseConfigContent(content);
  },
  set(config) {
    const content = this.toConfigContent(
      Array.isArray(config) ? config : [config]
    );

    fs.writeFileSync(this.path, content);

    setTimeout(reboot, 3000);
  },
};

// NOTE: trust model — the wifi config is made world-writable so the
// (non-root) app can rewrite credentials during BLE provisioning. Like the
// unauthenticated BLE control surface (see bluetooth.js), this is an
// accepted tradeoff for a device provisioned in a physically trusted setup
// phase. The file contains the WiFi PSK in plaintext; treat physical/BLE
// access to the box as full access.
if (process.env.NODE_ENV !== "test") {
  bashCmd(`sudo chmod 666 ${wifiSettings.path}`);
}
