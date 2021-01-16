/**
 * @module auto_check_in
 * @description The script was used to automatic check in.
 * @param {string[]} [domains = []] - The site of domain will be check in.
 * @param {string[]} [keep = []] - Value of keep.
 * @param {string[]} [email = []] - Value of email.
 * @param {string[]} [pwd = []] - Value of pwd.
 */

const { readFileSync, writeFileSync, existsSync } = require('fs')
const { resolve, join } = require('path')
const variable_path = resolve(__dirname, './variables.yml')
let debug = true
const homeDirectory = join(homedir(), '.config/clash')
const logFile = join(homeDirectory, 'logs/cfw-autocheckin.log')

let log = function (text) {
    // log file路径
    if (debug == false && text.search('[debug]') !== -1){
      return
    }
    appendFileSync(logFile, myDate.toLocaleString()+": "+text+"\n", 'utf-8')
}

let check_in = async (raw, { yaml, axios, console, notify }, { name, variable }) => {
  try {
    var today = new Date().toISOString().slice(0, 10)
    var rawObj = yaml.parse(raw)
    var check = false
    var sign = false
    var _time = new Date().toISOString()
    if (!variable['checkinDate']) {
      variable['checkinDate'] = ''
      variable['checkinMessage'] = ''
    }
    log(`[info]: start check in ${variable['domain']} at ${new Date()}`)
    log(`[info]: today: ${today}`)
    if (variable['checkinDate'] && variable['checkinDate'].slice(0, 10) === today) {
      log(`[info]: ${variable['domain']} has been already check in`)
      check = true
    }

    // check sign
    if (!check && !sign) {
      try {
        log(`[info]: try check sign with ${variable['name']}`)
        let resp = await axios.get(`https://${variable['domain']}/user`)
        if (debug) {
          log(`[debug]: response of https://${variable['domain']}/user`)
          log(JSON.stringify(resp.data, null, 2))
        }
        sign = /用户中心/.test(resp.data)
      } catch (e) {
        check = true
        log(`[error]: check sign ${variable['name']} failed`)
        log(`[error]: ${e}`)
        notify(`check sign ${variable['name']} failed`, e.message)
      }
    }

    //try auto sign
    if (!check && !sign) {
      try {
        log(`[info]: try sign in ${variable['name']}`)
        let resp = await axios.post(`https://${variable['domain']}/auth/login`, {
          email: variable['email'],
          passwd: variable['pwd'],
          remember_me: variable['keep']
        })
        if (debug) {
          log(`[debug]: response of https://${variable['domain']}/auth/login`)
          log(JSON.stringify(resp.data, null, 2))
        }
        if (/登录成功/.test(resp.data.msg)) sign = true
      } catch (e) {
        check = true
        log(`[error]: check sign ${variable['name']} failed`)
        log(`[error]: ${e}`)
        notify(`check sign ${variable['name']} failed`, e.message)
      }
    } else sign = true

    //try auto check in
    if (!check && sign) {
      try {
        log(`[info]: try check in ${variable['name']}`)
        let resp = await axios.post(`https://${variable['domain']}/user/checkin`)
        if (debug) {
          log(`[debug]: response of https://${variable['domain']}/user/checkin`)
          log(JSON.stringify(resp.data, null, 2))
        }
        if (!variable['checkinMessage'] || !/您似乎已经签到过了/.test(resp.data.msg)) {
          log(`[info]: ${variable['name']} checkinDate: ${_time}`)
          log(`[info]: ${variable['name']} checkinMessage: ${resp.data.msg}`)
          variable['checkinDate'] = _time
          variable['checkinMessage'] = resp.data.msg
        } else {
          log(`[info]: ${variable['name']} has been already check in`)
        }
      } catch (e) {
        log(`[error]: check sign ${variable['name']} failed`)
        log(`[error]: ${e}`)
        notify(`check sign ${variable['name']} failed`, e.message)
      }
    } else log(`[warning]: ${variable['name']} need to sign in`)
    log(`[info]: rawObj['proxies']:`)
    log(JSON.stringify(rawObj['proxies']))
    log(`[info]: rawObj['proxy-groups']:`)
    log(JSON.stringify(rawObj['proxy-groups']))
    rawObj['proxies'].push(
      {
        name: `⏰ [${variable['name']}]签到时间：${variable['checkinDate']}`,
        server: 'server',
        type: 'socks5',
        port: 443
      },
      {
        name: `🎁 [${variable['name']}]签到消息：${variable['checkinMessage']}`,
        server: 'server',
        type: 'socks5',
        port: 443
      }
    )
    if (
      rawObj['proxy-groups'].length === 0 ||
      rawObj['proxy-groups'][rawObj['proxy-groups'].length - 1]['name'] != '🤚 CHECK-INFO'
    )
      rawObj['proxy-groups'].push({
        name: '🤚 CHECK-INFO',
        type: 'select',
        proxies: []
      })
    if (name === variable['name'])
      rawObj['proxy-groups'][rawObj['proxy-groups'].length - 1]['proxies'].unshift(
        `⏰ [${variable['name']}]签到时间：${variable['checkinDate']}`,
        `🎁 [${variable['name']}]签到消息：${variable['checkinMessage']}`
      )
    else
      rawObj['proxy-groups'][rawObj['proxy-groups'].length - 1]['proxies'].push(
        `⏰ [${variable['name']}]签到时间：${variable['checkinDate']}`,
        `🎁 [${variable['name']}]签到消息：${variable['checkinMessage']}`
      )
    log(`[info]: ${variable['name']} check in completely`)
    return [yaml.stringify(rawObj), variable]
  } catch (e) {
    log(`[error]: ${variable['name']} check in fail:`)
    log(e)
    notify(`${variable['name']} check in failed`, e.message)
    throw e
  }
}

let auto_check_in = async (raw, { yaml, axios, console, notify }, { url, name }) => {

  // check yaml
  try {
    var rawObj = yaml.parse(raw)
  } catch (e) {
    if (
      e.message === 'Implicit map keys need to be on a single line' &&
      !new RegExp('^((?!www.example.com).)*$').test(url)
    ) {
      log('[warning]: raw is not yaml')
      rawObj = { proxies: [], 'proxy-groups': [], rules: [] }
    } else {
      log('[error]: check yaml fail')
      log(e)
      throw e
    }
  }

  //check variables.yml
  if (!existsSync(variable_path)) {
    log('[warning]: no found ./variables.yml')
    return yaml.stringify(rawObj)
  }
  var _variables = yaml.parse(readFileSync(variable_path, 'utf-8'))
  if (!_variables['auto_check_in']) {
    log('[warning]: no found auto_check_in variables')
    return yaml.stringify(rawObj)
  } else var variables = _variables['auto_check_in']

  // try check in
  try {
    log('[info]: auto_check_in variables:')
    log(JSON.stringify(variables, null, 2))
    raw = yaml.stringify(rawObj)
    for (let i = 0; i < variables.length; i++) {
      [raw, variables[i]] = await check_in(
        raw,
        { yaml, axios, console, notify },
        { name, variable: variables[i] }
      )
    }
    return raw
  } catch (e) {
    log(`[error]: ${e}`)
    notify(`auto-check-in failed`, e.message)
    throw e
  } finally {
    delete _variables['auto_check_in']
    writeFileSync(
      variable_path,
      yaml.stringify({ ..._variables, auto_check_in: variables }, null, 2),
      'utf-8'
    )
  }
}

module.exports.parse = auto_check_in
