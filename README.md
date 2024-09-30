# vaerhona-server

Node server running on a raspberry PI for collecting weather data

Compatible with sensors DHT22/11 and BMP085, and the Raspberry PiCam

## SD card Image

https://blog.jaimyn.dev/the-fastest-way-to-clone-sd-card-macos/

- brew install coreutils
- diskutil list
- sudo gdd if=/dev/r<disk> of=vaerhona.dmg status=progress bs=16M
- sudo diskutil unmountDisk /dev/<disk>
- sudo gdd of=/dev/r<disk> if=vaerhona.dmg status=progress bs=16M

## Node install

$ curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -

$ sudo apt-get install -y nodejs

## PM2

```
pm2 start app
pm2 stop app
pm2 list
```
