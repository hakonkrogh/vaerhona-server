import fs from "fs";

import { bashCmd, reboot } from "./utils.js";

export const wifiSettings = {
  path: "/etc/wpa_supplicant/wpa_supplicant.conf",
  get() {
    const content = fs.readFileSync(this.path, "utf-8");

    const [ssid, psk] = content
      .split("network={")[1]
      .split("}")[0]
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean)
      .map((a) => a.split('"')[1]);
    console.log({ ssid, psk });
    return { ssid, psk };
  },
  set(wifi) {
    const content = `ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=NO
    
network={
  ssid="${wifi.ssid}"
  psk="${wifi.psk}"
}`;

    fs.writeFileSync(this.path, content);

    setTimeout(reboot, 3000);
  },
};

// Ensure file access for wifi settings
bashCmd(`sudo chmod 666 ${wifiSettings.path}`);
