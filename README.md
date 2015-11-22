# vaerhona-server

Node server running on a raspberry PI for collecting weather data

Prerequisites:
- Set the Raspberry up with i2c (ex: https://learn.adafruit.com/adafruits-raspberry-pi-lesson-4-gpio-setup/configuring-i2c)
- Install the bcm2835 library: http://www.airspayce.com/mikem/bcm2835/
- Node v4+

Compatible with sensors DHT22/11 and BMP085, and the Raspberry PiCam