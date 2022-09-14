import { exec } from "child_process";

export function reboot() {
  console.log("REBOOT!");
  bashCmd("sudo /bin/systemctl reboot");
}

export function shutdown() {
  console.log("SHUTDOWN");
  bashCmd("sudo /bin/systemctl poweroff");
}

export function firmwareUpdate() {
  console.log("FIRWARE UPDATE");
  bashCmd(
    "git fetch origin && git reset --hard origin/main && npm install && sudo /bin/systemctl reboot"
  );
}

export async function bashCmd(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        resolve(stdout.replace(/\n/g, ""));
      }
    });
  });
}
