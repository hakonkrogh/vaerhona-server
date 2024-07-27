import { wifiSettings } from "./wifi.js";

test("parses config correctly", () => {
  expect(
    wifiSettings.parseConfigContent(`ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=NO
    
network={
  ssid="one"
  psk="two"
}`)
  ).toEqual([
    {
      ssid: "one",
      psk: "two",
    },
  ]);

  expect(
    wifiSettings.parseConfigContent(`ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=NO

network={
  ssid="one"
  psk="two"
}
  
network={
  ssid="three"
  psk="four"
}
  
`)
  ).toEqual([
    {
      ssid: "one",
      psk: "two",
    },
    {
      ssid: "three",
      psk: "four",
    },
  ]);
});

test("sets config correctly", () => {
  expect(
    wifiSettings.toConfigContent([
      {
        ssid: "one",
        psk: "two",
      },
      {
        ssid: "three",
        psk: "four",
      },
    ])
  ).toEqual(`ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=NO

network={
  ssid="one"
  psk="two"
}

network={
  ssid="three"
  psk="four"
}

`);
});
