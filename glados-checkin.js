const {
    readFileSync,
    writeFileSync,
    existsSync,
    appendFileSync,
} = require("fs");
const { resolve, join } = require("path");
const { homedir } = require("os");
const variable_path = resolve(__dirname, "./variables.yaml");
const { getCurrentBrowserFingerPrint } = require("./broprint");
const myDate = new Date();
const debug = false;
const homeDirectory = join(homedir(), ".config/clash");
// log file路径
const logFile = join(homeDirectory, "logs/cfw-autocheckin.log");
let newParse = true;
const maxLogLine = 20000;

// 检查日志行数，超过maxLogLine切半
const checkLog = function () {
    if (!existsSync(logFile)) {
        log(
            "[warn]: doesn't find log file: cfw-autocheckin.log, Automatically create it."
        );
    }
    const lines = readFileSync(logFile, "utf-8").toString().split("\n");
    if (lines.length > maxLogLine) {
        let start = Math.round(lines.length / 2);
        //从有意义的日期开始切
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
    } else if (debug) {
        log(`[debug]: log line count is: ${lines.length}`);
    }
};

const log = function (text) {
    if (newParse) {
        appendFileSync(
            logFile,
            `\n    --------------${myDate.toLocaleString()}--------------\n`,
            "utf-8"
        );
        newParse = false;
    }
    appendFileSync(logFile, text + "\n", "utf-8");
};

let axios;
let yaml;
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Agent } = require("http");

puppeteer.use(StealthPlugin());

const INFO = {
    account: '账号',
    leftDays: '天数',
    checkInMessage: '签到情况',
    checkInFailed: '签到失败',
    getStatusFailed: '获取信息失败',
    authorization: '',
    'koa:sess.sig': "",
    "koa:sess": "",
    "mailcode": ""
};

const rawCookie2JSON = (cookie) => {
    return cookie.split(/\s*;\s*/).reduce((pre, current) => {
        const pair = current.split(/\s*=\s*/);
        const name = pair[0];
        const value = pair.splice(1).join('=');
        return [
            ...pre,
            {
                name,
                value,
                'domain': 'glados.rocks'
            }
        ];
    }, []);
};

function waitForOneMinute() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, 60000);
    });
}

const getAuthorization = async () => {
    const fingerPrint = await getCurrentBrowserFingerPrint();
    return fingerPrint + "-" + window.screen.height + "-" + window.screen.width;
}

const login = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        args: ['--proxy-server=socks5://127.0.0.1:2222']
    });

    const page = await browser.newPage();

    await page.goto('https://glados.rocks/login', {
        timeout: 0,
        waitUntil: 'load'
    });

    page.on('console', msg => {
        log(msg.text());
    });

    var _variables = yaml.parse(readFileSync(variable_path, "utf-8"));
    INFO.mail = _variables['GlaDOSAutoCheckin']["mail"]

    await page.evaluate(async (INFO) => {
        const auth = () =>
            fetch('https://glados.rocks/api/authorization', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    // hack broprint
                    Authorization: INFO.authorization,
                },
                body: JSON.stringify({
                    "address": INFO.mail,
                    "site": "glados.network"
                }),
            }).catch(error => {
                return { reason: '网络错误' + error.message }
            });

        const authRes = await auth();
        if (!authRes.ok) {
            const reason = authRes.reason || `状态码：${authRes.status}`;
            console.log(reason);
        } else {
            const { message } = await authRes.json();
            console.log(message);
        }
    }, INFO);

    log(`fill 'GlaDOSAutoCheckin: mailcode' with your login code sent to your email: ${INFO.email} in 1 minute`);
    await waitForOneMinute();

    _variables = yaml.parse(readFileSync(variable_path, "utf-8"));
    INFO.mailcode = _variables['GlaDOSAutoCheckin']["mailcode"].toString();
    if (!INFO.mailcode) {
        log("login code empty");
        await browser.close();
        return _variables;
    }

    await page.evaluate(async (INFO) => {
        const login = () => fetch('https://glados.rocks/api/login', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                // hack broprint
                Authorization: INFO.authorization,
            },
            body: JSON.stringify({
                "method": "email",
                "site": "glados.network",
                "email": INFO.mail,
                "mailcode": INFO.mailcode
            })
        }).catch(error => {
            console.log('网络错误: ' + error.message)
            return { reason: '网络错误: ' + error.message }
        });

        const loginRes = await login();
        if (!loginRes.ok) {
            const reason = loginRes.reason || `状态码：${loginRes.status}`;
            console.log(reason);
        } else {
            const message = await loginRes.json();
            console.log(JSON.stringify(message));
        }
    }, INFO);

    const cookies = await page.cookies();

    const koaSessCookie = cookies.find(cookie => cookie.name === 'koa:sess');
    if (koaSessCookie) {
        log(`koaSessCookie: ${koaSessCookie.value}`); // 输出 Cookie 的值
        INFO['koa:sess'] = koaSessCookie.value
    } else {
        log('Cookie "koa:sess" not found');
    }

    const koaSessSigCookie = cookies.find(cookie => cookie.name === 'koa:sess.sig');
    if (koaSessSigCookie) {
        log(`koaSessSigCookie ${koaSessSigCookie.value}`); // 输出 Cookie 的值
        INFO['koa:sess.sig'] = koaSessSigCookie.value
    } else {
        log('Cookie "koa:sess" not found');
    }
    await browser.close();

    if (!INFO['koa:sess.sig'] || !INFO['koa:sess']) {
        log("get cookie failed")
        return _variables;
    }

    _variables['GlaDOSAutoCheckin']['cookie'] = `koa:sess=${INFO["koa:sess"]}; koa:sess.sig=${INFO["koa:sess.sig"]}`;
    writeFileSync(variable_path, yaml.stringify(_variables), "utf-8");
    return _variables;
}

const checkInAndGetStatus = async (cookie) => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        args: ['--proxy-server=socks5://127.0.0.1:2222']
    });

    const page = await browser.newPage();

    const cookieJSON = rawCookie2JSON(cookie);
    await page.setCookie(...cookieJSON);

    await page.goto('https://glados.rocks/console/checkin', {
        timeout: 0,
        waitUntil: 'load'
    });

    page.on('console', msg => {
        log(msg.text());
    });

    const info = await page.evaluate(async (INFO) => {
        const checkIn = () =>
            fetch('https://glados.rocks/api/user/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    // hack broprint
                    Authorization: INFO.authorization,
                },
                body: JSON.stringify({
                    token: "glados.one"
                }),
            }).catch(error => {
                return { reason: '网络错误' + error.message }
            });

        const getStatus = () => fetch('https://glados.rocks/api/user/status', {
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                // hack broprint
                Authorization: INFO.authorization,
            },
        }).catch(error => {
            console.log('网络错误: ' + error.message)
            return { reason: '网络错误: ' + error.message }
        });

        let ret = {};

        const checkInRes = await checkIn();
        if (!checkInRes.ok) {
            const reason = checkInRes.reason || `状态码：${checkInRes.status}`;
            ret[INFO.checkInFailed] = reason;
            console.log(reason);
        } else {
            const { message } = await checkInRes.json();
            ret[INFO.checkInMessage] = message;
            console.log(message);
        }

        const statusRes = await getStatus();
        if (!statusRes.ok) {
            const reason = statusRes.reason || `状态码：${statusRes.status}`;
            console.log(reason)
            ret[INFO.getStatusFailed] = reason;
        } else {
            const stateJson = await statusRes.json();
            const { data: { email, phone, leftDays } = {} } = stateJson;
            console.log(JSON.stringify(stateJson))
            let account = '未知账号';
            if (email) {
                account = email.replace(/^(.)(.*)(.@.*)$/,
                    (_, a, b, c) => a + b.replace(/./g, '*') + c
                );
            } else if (phone) {
                account = phone.replace(/^(.)(.*)(.)$/,
                    (_, a, b, c) => a + b.replace(/./g, '*') + c
                );
            }
            ret[INFO.account] = account;
            ret[INFO.leftDays] = parseInt(leftDays);
        }

        return ret;
    }, INFO);

    await browser.close();

    return info;
};

const pushplus = (token, info) => {
    const data = {
        token,
        title: 'GLaDOS签到',
        content: JSON.stringify(info),
        template: 'json'
    };
    log('pushData', {
        ...data,
        token: data.token.replace(/^(.{1,4})(.*)(.{4,})$/, (_, a, b, c) => a + b.replace(/./g, '*') + c)
    });

    return axios({
        method: 'post',
        url: `http://www.pushplus.plus/send`,
        data
    }).catch((error) => {
        if (error.response) {
            // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
            log(`PUSHPLUS推送 请求失败，状态码：${error.response.status}`);
        } else if (error.request) {
            // 请求已经成功发起，但没有收到响应
            log('PUSHPLUS推送 网络错误');
        } else {
            // 发送请求时出了点问题
            log('Axios Error', error.message);
        }
    });
};

let auto_check_in = async (raw, { yaml: _yaml, axios: _axios, console, notify }, { url }) => {
    axios = _axios;
    yaml = _yaml;
    // check log length
    checkLog();

    //check variables.yml
    if (!existsSync(variable_path)) {
        log('[warning]: no found "./variables.yaml".');
        throw 'no found "./variables.yaml"';
    }
    var _variables = yaml.parse(readFileSync(variable_path, "utf-8"));

    if (!_variables["GlaDOSAutoCheckin"]) {
        log("[warning]: no found GlaDOSAutoCheckin variables.");
        notify(`auto-check-in failed`, "no found GlaDOSAutoCheckin variables", true);
        return raw;
    }

    INFO.authorization = await getAuthorization();
    
    // try check in
    try {
        if (!_variables["GlaDOSAutoCheckin"]["cookie"]) {
            _variables = await login()
        }
        if (!_variables["GlaDOSAutoCheckin"]["cookie"]) {
            log("login failed");
            return raw;
        }
        const info = await checkInAndGetStatus(_variables["GlaDOSAutoCheckin"]["cookie"]);
        log(JSON.stringify(info))
        notify(`GlaDOS 签到`, `剩余天数： ${info[INFO.leftDays]}`, true);
        const pushResult = (await pushplus(_variables["GlaDOSAutoCheckin"]["plusplusToken"], info))?.data?.msg;
        log(pushResult);
    } catch (e) {
        log(`[error]: ${e}.`);
        return raw;
    }
    return raw;
};

module.exports.parse = auto_check_in;