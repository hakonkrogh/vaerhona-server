import { exec } from "child_process";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function takePicture() {
  bashCmd("libcamera-jpeg -o snapshot.jpg -q 50 -n", true);
}

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

export function osUpdate() {
  console.log("OS UPDATE");
  bashCmd(
    "sudo apt update && sudo apt full-upgrade && sudo apt dist-upgrade && sudo /bin/systemctl reboot"
  );
}

export async function bashCmd(cmd, silent) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        if (!silent) {
          console.log(`stdout: ${stdout}`);
          console.log(`stderr: ${stderr}`);
        }
        resolve(stdout.replace(/\n/g, ""));
      }
    });
  });
}
