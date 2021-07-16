require("dotenv").config();

// Set BOX_ID
if (!process.env.BOX_ID) {
  const { exec } = require("child_process");
  exec(
    "cat /proc/cpuinfo | grep Serial | cut -d ' ' -f 2",
    (err, stdout, stderr) => {
      if (err || stderr) {
        throw new Error(err || stderr);
      } else {
        process.env.BOX_ID = stdout;
        boot();
      }
    }
  );
} else {
  boot();
}

function boot() {
  const logger = require("./logger");
  require("./bluetooth.js")();

  logger();
  setInterval(logger, 1000 * 60 * 60);
}
