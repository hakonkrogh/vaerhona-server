# VHSYS:

Copy to /etc/init.d

chmod 755 /etc/init.d/vhsys

To start the service on boot:

sudo update-rc.d vhsys defaults

To stop the service on boot:

sudo update-rc.d -f vhsys remove