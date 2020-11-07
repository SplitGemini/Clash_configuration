module.exports.parse = async (raw, { axios, yaml, notify, console }, { name, url, interval, selected }) => {
  const doc = yaml.parse(raw)
  //规则组，往Manual里添加新增的非UNM节点，UNM添加到解锁组
  doc['proxies'].forEach((v, i) => { 
    if(doc['proxy-groups'][0]['proxies'].findIndex(x => x == v['name']) == -1){
      if(v['name'].indexOf('UNM') == -1){
        doc['proxy-groups'][0]['proxies'].push(v['name'])
      }
      else{
        doc['proxy-groups'][6]['proxies'].push(v['name'])
      }
    }
  })
  //清理无用字典
  delete doc['port']
  delete doc['socks-port']
  delete doc['mixed-port']
  delete doc['redir-port']
  delete doc['allow-lan']
  delete doc['mode']
  delete doc['log-level']
  delete doc['external-controller']
  delete doc['secret']
  delete doc['cfw-bypass']
  delete doc['cfw-latency-url']
  delete doc['cfw-conn-break-strategy']
  delete doc['cfw-child-process']
  delete doc['cfw-latency-timeout']
  delete doc['Rule']
  delete doc['Proxy Group']
  delete doc['Proxy']
  const ret = yaml.stringify(doc)
  var myDate = new Date()
  var message = ""
  if(name != undefined){
    // {关键词:文件名,关键词:文件名}
    const fileNames = {"v2ray":"clash","ssr":"clashssr"}
    var fileName = ""
    for(var key in fileNames){
      if(name.indexOf(key) != -1){
        fileName = fileNames[key]
        break
      }
    }
    // 上传gist
    if(fileName != ""){
      var files = {}
      files[fileName] = {"content":ret}
      // gist id
      var gistId = ""
      // gitub api 获取的token, 需要勾选gist权限
      const token = ""
      axios.patch(
        'https://api.github.com/gists/' + gistId,
        {"public":false,"description":"cfw scripts auto upload","files":files},
        {headers:{"Content-Type":"application/json;charset='utf-8'","Authorization": "token "+token}})
      .then((res) => {
        message = "profile \""+name+"\" has been updated. And successfully uploaded to gist:\""
                  +fileName+"\": file links is:"+res["data"]["files"][fileName]["raw_url"]
        console.log(myDate.toLocaleString(),": ",message)
        notify("Profile has been updated", message, true)
      })
      .catch(err => {
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          message = "profile \""+name+"\" has been updated. But fail to upload to gist:\""
                  +fileName+"\", because status: "+err.response.status+" data: "+err.response.data
                  +" headers: "+err.response.headers
          notify("Profile has been updated", message, true)
        } else if (err.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          message = "profile \""+name+"\" has been updated. But fail to upload to gist:\""
                  +fileName+"\", because "+err.request
          notify("Profile has been updated", message, true)
        } else {
         // Something happened in setting up the request that triggered an Error
          message = "Something happened: "+err.message
          notify("Profile updated fail", message, true)
        }
        console.log(myDate.toLocaleString(),": ",message)
        console.log(myDate.toLocaleString(),": ",err.config)
      })
    }
    // 不上传gist
    else {
      message = "profile \""+name+"\" has been updated."
      console.log(myDate.toLocaleString()+": "+message)
      notify("Profile has been updated", message, true)
    }
  }
  // 配置是新建的
  else {
    message = "A new profile has been added."
    console.log(myDate.toLocaleString()+": "+message)
    notify("A new profile has been added", message, true)
  }
  return ret
}