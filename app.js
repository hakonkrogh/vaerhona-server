require("dotenv").config();

const fs = require("fs");

const config = JSON.parse(fs.readFileSync("./app.config.json", "utf-8"));

// Set BOX_ID on first boot
if (!process.env.BOX_ID) {
  const { exec } = require("child_process");
  exec(
    "cat /proc/cpuinfo | grep Serial | cut -d ' ' -f 2",
    (err, stdout, stderr) => {
      if (err || stderr) {
        throw new Error(err || stderr);
      } else {
        process.env.BOX_ID = stdout;
        fs.writeFileSync("./.env", `BOX_ID=${stdout}`);
        boot();
      }
    }
  );
} else {
  boot();
}

function boot() {
  // require("./logger")(config);
  require("./blue-new/index.js")(config);
}
