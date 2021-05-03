/**
 * @module auto_check_in
 * @description The script was used to automatic check in.
 * @param {string[]} [domains = []] - The site of domain will be check in.
 * @param {string[]} [keep = []] - Value of keep.
 * @param {string[]} [email = []] - Value of email.
 * @param {string[]} [pwd = []] - Value of pwd.
 */

const { readFileSync, writeFileSync, existsSync, appendFileSync, createReadStream , renameSync} = require('fs')
const { resolve, join } = require('path')
const { homedir } = require('os')
const variable_path = resolve(__dirname, './variables.yaml')
const myDate = new Date()
const debug = false
const homeDirectory = join(homedir(), '.config/clash')
// log file路径
const logFile = join(homeDirectory, 'logs/cfw-autocheckin.log')
let newParse = true
const maxLogLine = 20000

// 检查日志行数，超过maxLogLine切半
const checkLog = function() {
  if (!existsSync(logFile)) {
    log("[warn]: doesn't find log file: cfw-autocheckin.log, Automatically create it.")
  }
  const lines = readFileSync(logFile, 'utf-8').toString().split('\n')
  if(lines.length > maxLogLine){
    let start = Math.round(lines.length / 2)
    //从有意义的日期开始切
    while(!/-{2,}.*-{2,}/.test(lines[start]) && start < lines.length){
      start ++
    }
    //backup old file
    writeFileSync(logFile+'.bak', lines.join('\n'), 'utf-8')
    //write new log
    writeFileSync(logFile, lines.slice(start).join('\n'), 'utf-8')
    log(`[info]: log line count is: ${lines.length} larger than ${maxLogLine}, cut it by half.`)
  }
  else if(debug){
    log(`[debug]: log line count is: ${lines.length}`)
  }
}

const log = function (text) {
  if (newParse) {
    appendFileSync(logFile, `\n    --------------${myDate.toLocaleString()}--------------\n`, 'utf-8')
    newParse = false
  }
  appendFileSync(logFile, text+"\n", 'utf-8')
}

// 从日志获取历史流量，仅统计通过自动签到获取的流量
// 同时因为会有日志大小监控，日志过长会被切断，因此数据可能不准确，日志限制数在上面
const cal_data_used_fromlog = function (name) {
  if (!existsSync(logFile)) {
    log("[warn]: doesn't find log file: cfw-autocheckin.log, Automatically create it.")
    return 0
  }
  let reg =  new RegExp("\"" + name + "\".*?[你您]获得了\\s*(\\d+)\\s*MB流量", "gi")
  let matches = readFileSync(logFile, 'utf-8').matchAll(reg)
  let total = 0
  for (const match of matches) {
    total += parseInt(match[1])
    if(debug){
        log(`[debug]: 迁移：match:${match[0]} num:${match[1]} start=${match.index} end=${match.index + match[0].length}.`)
    }
  }
  return total
}

let check_in = async (raw, { yaml, axios, notify }, variable ) => {
  try {
    // iso 时区+8
    var _time = new Date(+myDate + 8 * 3600 * 1000).toISOString().replace(/Z$/,'+08:00')
    var today = _time.slice(0, 10)
    var rawObj = yaml.parse(raw)
    var check = false
    var sign = false
    var should_modify = false
    log(`[info]: start check in "${variable['name']}".`)
    //检查历史，是否有今天签到记录
    if(variable['history'] && variable['history'].length > 0){
      if (variable['history'][0]['checkinDate'].slice(0, 10) === today) {
        log(`[info]: "${variable['name']}" has been already check in.`)
        notify("Already check in", `You has been already check in in "${variable['name']}"`, true)
        //跳过登陆和签到
        check = true
        sign = true
      }
    } else variable['history'] = []
    
    var domain = variable['domain'].replace(/^https?:\/\//,'')
    // check sign
    if (!check && !sign) {
      try {
        log(`[info]: try check sign with "${variable['name']}".`)
        let resp = await axios.get(`https://${domain}/user`)
        //数据量很大
        if (debug){
          log(`[debug]: response of https://${domain}/user:`)
          log(`${JSON.stringify(resp.data, null, 2)}`)
        }
        sign = /用户中心|节点列表|我的账号|退出登录|邀请注册|剩余流量|(?:复制((?!订阅).)*?)?订阅/.test(resp.data)
        log(`[info]: signed?: ${sign}.`)
      } catch (e) {
        // 检查失败，跳过登陆和签到
        check = true
        log(`[error]: check sign "${variable['name']}" failed: ${e}.`)
        notify(`check sign in "${variable['name']}" failed`, e.message, true)
      }
    }

    //try auto sign
    if (!check && !sign) {
      try {
        log(`[info]: try sign in "${variable['name']}".`)
        let resp = await axios.post(`https://${domain}/auth/login`, {
          email: variable['email'],
          passwd: variable['pwd'],
          remember_me: variable['keep']
        })
        if (debug) {
          log(`[debug]: response of https://${domain}/auth/login:`)
          log(`${JSON.stringify(resp.data, null, 2)}`)
        }
        if (/登[录陆]成功/.test(resp.data.msg)) sign = true
        log(`[info]: signed?: ${sign}.`)
        if (!sign) notify(`sign in failed`, `sign in "${variable['name']}" failed`, true)
      } catch (e) {
        log(`[error]: sign in "${variable['name']}" failed: ${e}.`)
        notify(`sign in "${variable['name']}" failed`, e.message, true)
      }
    }

    //try auto check in
    if (!check && sign) {
      try {
        log(`[info]: try check in "${variable['name']}".`)
        let resp = await axios.post(`https://${domain}/user/checkin`)
        if (debug) {
          log(`[debug]: response of https://${domain}/user/checkin:`)
          log(`${JSON.stringify(resp.data, null, 2)}`)
        }
        if (!/[您你](?:似乎)?已经签到过了/.test(resp.data.msg)) {
          log(`[info]: "${variable['name']}" checkinDate: ${_time}.`)
          log(`[info]: "${variable['name']}" checkinMessage: ${resp.data.msg}.`)
          notify(`check in "${variable['name']}" successful`,resp.data.msg, true)

          // total data used
          let total = 0.0
          let total_text = variable['total']
          if(!total_text){
            //没有total属性，版本迁移，从日志中统计全部签到流量
            total = cal_data_used_fromlog(variable['name'])
          }
          else {
              total = parseInt(/\d+(?=, i\.e\.)/.exec(total_text)[0])
          }
          total += parseInt(/\d+/.exec(resp.data.msg)[0])

          total_text = total.toString()+'M'
          if(total > 1024 * 1024) {
            total_text += ', i.e., '+(total / (1024*1024)).toFixed(4)+'T'
          }
          else if(total > 1024) {
            total_text = ', i.e., '+(total / 1024).toFixed(2)+'G'
          }
          variable['total'] = total_text
          
          // history
          let nowData = {}
          nowData['checkinDate'] = _time
          nowData['checkinMessage'] = resp.data.msg
          variable['history'].unshift(nowData)
          should_modify = true
          log(`[info]: "${variable['name']}" check in completely.`)
        
        } else {
          log(`[info]: "${variable['name']}" has been already check in.`)
          notify(`You have checked in "${variable['name']}" today.`,resp.data.msg, true)
          // 前面检查过签到记录，说明没有今天的记录，说明漏记录一次签到，可能是手动签到的，数据补不回来了
        }
      } catch (e) {
        log(`[error]: check in "${variable['name']}" failed: ${e}.`)
        notify(`check in "${variable['name']}" failed`, e.message, true)
      }
    } else if (!sign) log(`[warning]: "${variable['name']}" need to sign in`)
    
    // 保留5天记录
    while (variable['history'].length > 5){
      variable['history'].pop()
    }
    
    //不管成没成功，添加信息到配置
    if (variable['history'].length > 0){
      if (!rawObj['proxies']) rawObj['proxies'] = []
      rawObj['proxies'].push(
        {
          name: `⏰ [${variable['name']}]签到时间：${variable['history'][0]['checkinDate']}`,
          server: 'server',
          type: 'http',
          port: 443
        },
        {
          name: `🎁 [${variable['name']}]签到消息：${variable['history'][0]['checkinMessage']}`,
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
      if (debug) {
        log(`[debug]: rawObj['proxies']:`)
        log(`${JSON.stringify(rawObj['proxies'], null, 2)}`)
        log(`[debug]: rawObj['proxy-groups']:`)
        log(`${JSON.stringify(rawObj['proxy-groups'], null, 2)}`)
      }
    }
    
    return [yaml.stringify(rawObj), variable, should_modify]
    
  } catch (e) {
    log(`[error]: "${variable['name']}" something happened: ${e}.`)
    notify(`"${variable['name']}" something happened`, e.message, true)
    throw e
  }
}

let auto_check_in = async (raw, { yaml, axios, console, notify }, { url }) => {
  // check yaml
  try {
    console.log(`see log in ${logFile}.`)
    var rawObj = yaml.parse(raw)
  } catch (e) {
    if (
      e.message === 'Implicit map keys need to be on a single line' &&
      !new RegExp('^((?!www.example.com).)*$').test(url)
    ) {
      log('[warning]: raw is not yaml.')
      rawObj = { proxies: [], 'proxy-groups': [], rules: [] }
    } else {
      log(`[error]: check yaml fail: ${e}.`)
      throw e
    }
  }
  
  // check log length
  checkLog()
  
  //check variables.yml
  if (!existsSync(variable_path)) {
    log('[warning]: no found "./variables.yaml".')
    throw 'no found "./variables.yaml"'
  }
  var _variables = yaml.parse(readFileSync(variable_path, 'utf-8'))
  if (!_variables['auto_check_in']) {
    log('[warning]: no found auto_check_in variables.')
    notify(`auto-check-in failed`, 'no found auto_check_in variables', true)
    return yaml.stringify(rawObj)
  } else var variables = _variables['auto_check_in']
  
  // try check in
  try {
    if (debug) {
      log('[debug]: auto_check_in variables:')
      log(`${JSON.stringify(variables, null, 2)}`)
    }
    raw = yaml.stringify(rawObj)
    let check_list = [...Array(variables.length)].map(_=>false)
    for (let i = 0; i < variables.length; i++) {
      [raw, variables[i], check_list[i]] = await check_in(
        raw, { yaml, axios, notify }, variables[i]
      )
    }
    if (check_list.some(v => v === true)){
      if (debug) log('[debug]: have modified variables.')
      delete _variables['auto_check_in']
      writeFileSync(
        variable_path,
        yaml.stringify({ ..._variables, auto_check_in: variables }, null, 2),
        'utf-8'
      )
    }
    return raw
  } catch (e) {
    log(`[error]: ${e}.`)
    throw e
  }
}

module.exports.parse = auto_check_in
