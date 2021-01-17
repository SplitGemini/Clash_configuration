/**
 * @module auto_check_in
 * @description The script was used to automatic check in.
 * @param {string[]} [domains = []] - The site of domain will be check in.
 * @param {string[]} [keep = []] - Value of keep.
 * @param {string[]} [email = []] - Value of email.
 * @param {string[]} [pwd = []] - Value of pwd.
 */

const { readFileSync, writeFileSync, existsSync, appendFileSync } = require('fs')
const { resolve, join } = require('path')
const { homedir } = require('os')
const variable_path = resolve(__dirname, './variables.yaml')
const myDate = new Date()
let debug = false
const homeDirectory = join(homedir(), '.config/clash')
// log file路径
const logFile = join(homeDirectory, 'logs/cfw-autocheckin.log')
let newParse = true

let log = function (text) {
    if (!debug && text.includes('[debug]')){
      return
    }
    if (newParse) {
      appendFileSync(logFile, "\n", 'utf-8')
      newParse = false
    }
    appendFileSync(logFile, myDate.toLocaleString()+text+"\n", 'utf-8')
}

let check_in = async (raw, { yaml, axios, notify, console }, variable ) => {
  try {
    console.log(`see log in ${logFile}`)
    var today = myDate.toISOString().slice(0, 10)
    var rawObj = yaml.parse(raw)
    var check = false
    var sign = false
    var _time = myDate.toISOString()
    if(variable['history'] && variable['history'].length > 0){
      if (variable['history'][0]['checkinDate'].slice(0, 10) === today) {
        log(`[info]: ${variable['domain']} has been already check in`)
        notify(`You has been already check in in "${variable['domain']}"`, '')
        return [yaml.stringify(rawObj), variable, false]
      }
    } else variable['history'] = []
    
    log(`[info]: start check in "${variable['domain']}"`)
    log(`[info]: today is: ${today}`)
    // check sign
    if (!check && !sign) {
      try {
        log(`[info]: try check sign with "${variable['name']}"`)
        let resp = await axios.get(`https://${variable['domain'].replace(/^https?:\/\//,'')}/user`)
        //数据量很大
        //log(`[debug]: response of https://${variable['domain'].replace(/^https?:\/\//,'')}/user`)
        //log(`[debug]: ${JSON.stringify(resp.data, null, 2)}`)
        sign = /用户中心|节点列表|我的账号|退出登录|邀请注册|剩余流量|(?:复制((?!订阅链接).)*?)?订阅链接/.test(resp.data)
        log(`[info]: signed?: ${sign}`)
      } catch (e) {
        check = true
        log(`[error]: check sign "${variable['name']}" failed: ${e}`)
      }
    }

    //try auto sign
    if (!check && !sign) {
      try {
        log(`[info]: try sign in "${variable['name']}"`)
        let resp = await axios.post(`https://${variable['domain'].replace(/^https?:\/\//,'')}/auth/login`, {
          email: variable['email'],
          passwd: variable['pwd'],
          remember_me: variable['keep']
        })
        //数据量很大
        //log(`[debug]: response of https://${variable['domain'].replace(/^https?:\/\//,'')}/auth/login`)
        //log(`[debug]: ${JSON.stringify(resp.data, null, 2)}`)
        if (/登[录陆]成功/.test(resp.data.msg)) sign = true
        log(`[info]: signed?: ${sign}`)
        if (!sign) notify(`sign in "${variable['name']}" failed`, "")
      } catch (e) {
        check = true
        log(`[error]: sign in "${variable['name']}" failed: ${e}`)
        notify(`sign in "${variable['name']}" failed`, e.message)
      }
    }

    //try auto check in
    if (!check && sign) {
      try {
        log(`[info]: try check in "${variable['name']}"`)
        let resp = await axios.post(`https://${variable['domain'].replace(/^https?:\/\//,'')}/user/checkin`)
        log(`[debug]: response of https://${variable['domain'].replace(/^https?:\/\//,'')}/user/checkin`)
        log(`[debug]: ${JSON.stringify(resp.data, null, 2)}`)
        if (variable['history'].length === 0 || !/[您你](?:似乎)?已经签到过了/.test(resp.data.msg) ||
            (variable['history'].length > 0 && variable['history'][0]['checkinDate'].slice(0, 10) !== today)) {
          log(`[info]: "${variable['name']}" checkinDate: ${_time}`)
          log(`[info]: "${variable['name']}" checkinMessage: ${resp.data.msg}`)
          let nowData = {}
          nowData['checkinDate'] = _time
          nowData['checkinMessage'] = resp.data.msg
          variable['history'].unshift(nowData)
          check = true
          notify(`check in "${variable['name']}" successful`,resp.data.msg)
        } else {
          check = false
          log(`[info]: "${variable['name']}" has been already check in`)
          notify(`You have checked in "${variable['name']}" today.`,resp.data.msg)
        }
      } catch (e) {
        log(`[error]: check in "${variable['name']}" failed: ${e}`)
        notify(`check in "${variable['name']}" failed`, e.message)
      }
    } else log(`[warning]: "${variable['name']}" need to sign in`)
    
    // 保留5天记录
    while (variable['history'].length > 5){
      variable['history'].pop()
    }
    if (check){
      if (!rawObj['proxies']) rawObj['proxies'] = []
      rawObj['proxies'].push(
        {
          name: `⏰ ["${variable['name']}"]签到时间：${variable['history'][0]['checkinDate']}`,
          server: 'server',
          type: 'http',
          port: 443
        },
        {
          name: `🎁 ["${variable['name']}"]签到消息：${variable['history'][0]['checkinMessage']}`,
          server: 'server',
          type: 'http',
          port: 443
        }
      )
      if (!rawObj['proxy-groups']) rawObj['proxy-groups'] = []
      if (
        rawObj['proxy-groups'].length === 0 ||
        rawObj['proxy-groups'][rawObj['proxy-groups'].length - 1]['name'] != '🤚 CHECK-INFO'
      ){
        rawObj['proxy-groups'].push({
          name: '🤚 CHECK-INFO',
          type: 'select',
          proxies: []
        })
      }
      rawObj['proxy-groups'][rawObj['proxy-groups'].length - 1]['proxies'].push(
        rawObj['proxies'][rawObj['proxies'].length -2]['name'],
        rawObj['proxies'][rawObj['proxies'].length -1]['name']
      )
      log(`[debug]: rawObj['proxies']:`)
      log(`[debug]: ${JSON.stringify(rawObj['proxies'])}`)
      log(`[debug]: rawObj['proxy-groups']:`)
      log(`[debug]: ${JSON.stringify(rawObj['proxy-groups'])}`)
      log(`[info]: "${variable['name']}" check in completely`)
    }
    return [yaml.stringify(rawObj), variable, check.toString()]
  } catch (e) {
    log(`[error]: "${variable['name']}" something happened: ${e}`)
    notify(`"${variable['name']}" something happened`, e.message)
    throw e
  }
}

let auto_check_in = async (raw, { yaml, axios, console, notify }, { url }) => {
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
      log(`[error]: check yaml fail: ${e}`)
      throw e
    }
  }

  //check variables.yml
  if (!existsSync(variable_path)) {
    log('[warning]: no found ./variables.yaml')
    throw 'no found ./variables.yaml'
  }
  var _variables = yaml.parse(readFileSync(variable_path, 'utf-8'))
  if (!_variables['auto_check_in']) {
    log('[warning]: no found auto_check_in variables')
    notify(`auto-check-in failed`, 'no found auto_check_in variables')
    return yaml.stringify(rawObj)
  } else var variables = _variables['auto_check_in']
  
  // try check in
  try {
    log('[debug]: auto_check_in variables:')
    log(`[debug]: ${JSON.stringify(variables, null, 2)}`)
    raw = yaml.stringify(rawObj)
    let check_list = [...Array(variables.length)].map(_=>'false')
    for (let i = 0; i < variables.length; i++) {
      [raw, variables[i], check_list[i]] = await check_in(
        raw, { yaml, axios, notify, console }, variables[i]
      )
    }
    if (check_list.includes('true')){
      log('[debug]:have modified variables')
      delete _variables['auto_check_in']
      writeFileSync(
        variable_path,
        yaml.stringify({ ..._variables, auto_check_in: variables }, null, 2),
        'utf-8'
      )
    }
    return raw
  } catch (e) {
    log(`[error]: ${e}`)
    throw e
  }
}

module.exports.parse = auto_check_in
