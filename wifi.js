import fs from "fs";

import { bashCmd, reboot } from "./utils.js";

export const wifiSettings = {
  path: "/etc/wpa_supplicant/wpa_supplicant.conf",
  fromConfigContent: (content) => {
    try {
      // Define the regex pattern to match the wifi configuration
      // The pattern looks for "ssid" and "psk" keys followed by "=" and captures their respective values
      const regex = /ssid="([^"]+)"\s+psk="([^"]+)"/g;
      let match;
      const configs = [];

      // Use a while loop to find all matches in the input text
      while ((match = regex.exec(content)) !== null) {
        // Push the captured groups into the configs array with the desired object structure
        configs.push({ ssid: match[1], psk: match[2] });
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
  .map(
    (c) => `network={
  ssid="${c.ssid}"
  psk="${c.psk}"
}

`
  )
  .join("")}`;
  },
  get() {
    const content = fs.readFileSync(this.path, "utf-8");

    return this.getFromConfigContent(content);
  },
  set(config) {
    const content = this.toConfigContent(
      Array.isArray(config) ? config : [config]
    );

    fs.writeFileSync(this.path, content);

    setTimeout(reboot, 3000);
  },
};

// Ensure file access for wifi settings
if (process.env.NODE_ENV !== "test") {
  bashCmd(`sudo chmod 666 ${wifiSettings.path}`);
}
