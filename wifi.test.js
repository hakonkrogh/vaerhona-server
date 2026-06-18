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

test("parses networks regardless of field order and extra fields", () => {
  expect(
    wifiSettings.parseConfigContent(`network={
  scan_ssid=1
  psk="secret"
  ssid="myssid"
  priority=1
}`)
  ).toEqual([{ ssid: "myssid", psk: "secret" }]);
});

test("parses open networks (no psk) with an empty psk", () => {
  expect(
    wifiSettings.parseConfigContent(`network={
  ssid="openwifi"
  key_mgmt=NONE
}`)
  ).toEqual([{ ssid: "openwifi", psk: "" }]);
});

test("returns an empty array when there are no networks", () => {
  expect(wifiSettings.parseConfigContent("country=NO\n")).toEqual([]);
  expect(wifiSettings.parseConfigContent("")).toEqual([]);
});

test("round-trips parse(toConfigContent(x))", () => {
  const networks = [
    { ssid: "one", psk: "two" },
    { ssid: "three", psk: "four" },
  ];
  expect(
    wifiSettings.parseConfigContent(wifiSettings.toConfigContent(networks))
  ).toEqual(networks);
});

test("drops entries whose ssid/psk contain unsafe characters", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

  const content = wifiSettings.toConfigContent([
    { ssid: 'evil"\nnetwork={', psk: "x" },
    { ssid: "safe", psk: "good" },
  ]);

  expect(content).not.toContain("evil");
  expect(content).toContain('ssid="safe"');
  expect(wifiSettings.parseConfigContent(content)).toEqual([
    { ssid: "safe", psk: "good" },
  ]);

  warn.mockRestore();
});
