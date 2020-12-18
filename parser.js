module.exports.parse = async (raw, { axios, yaml, notify, console }, { name, url, interval, selected, mode }) => {
  // 写log
  const fs = require('fs')
  const log = function (text){
    // log file路径
    let logFile = "C:\\Users\\\\.config\\clash\\logs\\cfw-parser.log"
    fs.appendFile(logFile, myDate.toLocaleString()+": "+text+"\n", function (err) {
      if (err) {
        console.log("error: ",err," ",myDate.toLocaleString(),",",text)
        throw err
      }
    })
  }
  
  const rawObj = yaml.parse(raw)
  //规则组，往Manual里添加新增的非UNM节点，UNM添加到解锁组
  rawObj['proxies'].forEach((v, i) => { 
    if(rawObj['proxy-groups'][0]['proxies'].findIndex(x => x === v['name']) === -1){
      if(v['name'].indexOf('UNM') === -1){
        rawObj['proxy-groups'][0]['proxies'].push(v['name'])
      }
      else{
        rawObj['proxy-groups'][6]['proxies'].push(v['name'])
      }
    }
  })
  /* //不支持proxy-providers ，subconverter会给删掉
  // 如果有proxy-providers则添加所含节点，否则删除
  if (rawObj['proxy-providers'] == undefined || JSON.stringify(rawObj['proxy-providers']) === "{}") {
    delete rawObj['proxy-providers']
  }
  else {
    log("Found proxy-providers")
    rawObj['proxy-providers'].forEach((v, i) => {
      rawObj['proxy-groups'][0]['use'].push(v['name'])
      rawObj['proxy-groups'][1]['use'].push(v['name'])
      rawObj['proxy-groups'][2]['use'].push(v['name'])
    })
  }
  */
  delete rawObj['proxy-providers']
  //清理无用字典
  delete rawObj['port']
  delete rawObj['socks-port']
  delete rawObj['mixed-port']
  delete rawObj['redir-port']
  delete rawObj['allow-lan']
  delete rawObj['mode']
  delete rawObj['log-level']
  delete rawObj['external-controller']
  delete rawObj['secret']
  delete rawObj['cfw-bypass']
  delete rawObj['cfw-latency-url']
  delete rawObj['cfw-conn-break-strategy']
  delete rawObj['cfw-child-process']
  delete rawObj['cfw-latency-timeout']
  delete rawObj['Rule']
  delete rawObj['Proxy Group']
  delete rawObj['Proxy']

  const ret = yaml.stringify(rawObj)
  const myDate = new Date()
  var message = ""
  // 配置在更新订阅
  if(name){
    // {关键词:文件名,关键词:文件名}
    const fileNames = {"v2ray":"clash"}
    let fileName = ""
    for(let key in fileNames){
      if(name.indexOf(key) !== -1){
        fileName = fileNames[key]
        break
      }
    }
    // 上传gist
    if(fileName){
      rawObj['dns'] = {'enable':true,'ipv6':true,'enhanced-mode':'redir-host',
                       'listen':'0.0.0.0:5450','nameserver':['8.8.8.8','223.5.5.5'],
                       'fallback':['https://dns.google/dns-query','https://1.1.1.1/dns-query',
                                   'https://223.5.5.5/dns-query','https://9.9.9.9/dns-query'],
                       'fallback-filter':{'geoip':true,'ipcidr':['240.0.0.0/4']}}
      const upload = yaml.stringify(rawObj)
      let files = {}
      files[fileName] = {"content":upload}
      // gist id
      const gistId = ""
      // gitub api 获取的token, 需要勾选gist权限
      const token = ""
      axios.patch(
        'https://api.github.com/gists/' + gistId,
        {"public":false,"files":files},
        {headers:{"Content-Type":"application/json;charset='utf-8'","Authorization": "token "+token}})
      .then((res) => {
        // 正则删除链接中的文件commit码
        var link = res["data"]["files"][fileName]["raw_url"].replace(/[a-z0-9]{40}\//i,"")
        message = "Profile \""+name+"\" has been updated. And successfully uploaded to gist:\""
                  +fileName+"\"， file links is:"+link
        log(message)
        notify("Profile has been updated", message, true)
      })
      .catch(err => {
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          message = "Profile \""+name+"\" has been updated. But fail to upload to gist:\""
                    +fileName+"\", the request was made and the server responded with a fail status code,"
                    +" because "+JSON.stringify(err)
          notify("Profile has been updated", 
                 "profile \""+name+"\" has been updated. But fail to upload to gist:\""
                 +fileName+"\", see log for more details", true)
        }
        else if (err.request) {
          // The request was made but no response was received
          message = "Profile \""+name+"\" has been updated. And maybe successfully uploaded to gist:\""
                    +fileName+"\", the request was made but no response was received, because "
                    +JSON.stringify(err.request)
          notify("Profile has been updated", 
                 "profile \""+name+"\" has been updated. And maybe successfully uploaded to gist:\""
                 +fileName+"\", see log for more details", true)
        }
        else {
         // Something happened in setting up the request that triggered an Error
          message = "Something happened: "+err.message+"， see log for more details"
          notify("Profile updated fail", message, true)
          throw err
        }
        log(message)
      })
    }
    // 不上传gist
    else {
      message = "Profile \""+name+"\" has been updated."
      log(message)
      notify("Profile has been updated", message, true)
    }
  }
  // 配置是新建的
  else {
    message = "A new profile has been added."
    log(message)
    notify("A new profile has been added", message, true)
  }
  return ret
}