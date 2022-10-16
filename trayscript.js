const {
  readFileSync,
  existsSync,
  appendFileSync,
  writeFileSync,
} = require("fs");
const { homedir } = require("os");
const { join } = require("path");
const http = require("http");

const homeDirectory = join(homedir(), ".config", "clash");
// config file
const configPath = join(homeDirectory, "config.yaml");
// log file路径
const logFile = join(homeDirectory, "logs/cfw-tray.log");
const maxLogLine = 20000;

let externalControllerPort = "";
let secret = "";
let newParse = true;

let log = function (text) {
  if (newParse) {
    appendFileSync(
      logFile,
      `\n  --------------${new Date().toLocaleString()}--------------\n`,
      "utf-8"
    );
    newParse = false;
  }
  appendFileSync(logFile, text + "\n", "utf-8");
};

const checkLog = function () {
  if (!existsSync(logFile)) {
    log(
      "[warn]: doesn't find log file: cfw-tray.log, Automatically create it."
    );
    return;
  }
  const lines = readFileSync(logFile, "utf-8").toString().split("\n");
  if (lines.length > maxLogLine) {
    let start = Math.round(lines.length / 2);
    while (!/-{2,}.*-{2,}/.test(lines[start]) && start < lines.length) {
      start++;
    }
    //backup old file
    writeFileSync(logFile + ".bak", lines.join("\n"), "utf-8");
    //write new log
    writeFileSync(logFile, lines.slice(start).join("\n"), "utf-8");
    log(
      `[info]: log line count is: ${lines.length} larger than ${maxLogLine}, cut it by half.`
    );
  }
};

function init() {
  const configText = readFileSync(configPath, "utf-8");
  externalControllerPort = configText.match(
    /external-controller: (?:127\.0\.0\.1|localhost):(.*)/
  )[1];
  secret = configText.match(/secret: (.*)/)[1];
}

async function clashGet(path) {
  let response = "";
  return new Promise(function (resolve, reject) {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: externalControllerPort,
        path: encodeURI(path),
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
      },
      function (res) {
        res.setEncoding("utf8");
        res.on("data", function (chunk) {
          response += chunk;
        });
        res.on("end", function () {
          resolve(response);
        });
      }
    );
    request.on("error", function (e) {
      log("problem with request: " + e.message);
      reject(e);
    });
    request.end();
  });
}

async function getProxyDelay(name) {
  const delayContent = await clashGet(
    `/proxies/${name}/delay?timeout=5000&url=http://www.gstatic.com/generate_204`
  );
  return JSON.parse(delayContent).delay;
}

async function getLoadBalanceDelay(proxies) {
  let sum = 0;
  let count = 0;
  let timeoutCount = 0;
  for (const proxy of proxies) {
    const delay = await getProxyDelay(proxy);
    if (delay) {
      sum += delay;
      count++;
    } else timeoutCount++;
  }
  if (count === 0) {
    return "No Available Proxies";
  }

  const delay = Math.floor(sum / count).toString();
  log(
    `sum : ${sum}, count: ${count}, timeout: ${timeoutCount}, delay: ${delay}`
  );
  return delay;
}

async function chainProxyDelay(name) {
  const currentProxy = await clashGet(`/proxies/${name}`);

  const currentProxyObj = JSON.parse(currentProxy);
  if (currentProxyObj["type"] === "LoadBalance") {
    log(`get delay of LoadBalance: ${name}: `);
    return getLoadBalanceDelay(currentProxyObj["all"]);
  } else if (
    currentProxyObj["type"] === "Selector" ||
    currentProxyObj["type"] === "URLTest"
  ) {
    return chainProxyDelay(currentProxyObj["now"]);
  } else if (
    currentProxyObj["type"] === "Direct" ||
    currentProxyObj["type"] === "Reject"
  ) {
    log(`ignore get delay of DIRECT or REJECT or GLOBAL`);
    return currentProxyObj["type"];
  } else {
    log(`get delay of single proxy: ${name}: `);
    const delay = await getProxyDelay(name);
    if (delay) {
      log(`${name}: ${delay}`);
      return delay.toString();
    } else {
      log(`${name}: Timeout`);
      return "Timeout";
    }
  }
}

module.exports.run = async () => {
  log("start tray script");
  checkLog();
  init();

  try {
    return await chainProxyDelay("🚀Proxy");
  } catch (e) {
    log(`[error]: ${e.message}.`);
  }
};
