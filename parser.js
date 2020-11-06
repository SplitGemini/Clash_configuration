module.exports.parse = async (raw, { axios, yaml, notify }, { name, url, interval, selected }) => {
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
  // {关键词:[gist id, filename]}
  const gists = {"v2ray":["0000000000","clash"]}
  var gistId = ""
  var fileName = ""
  for(var key in gists){
    if(name.indexOf(key) != -1){
      gistId = gists[key][0]
      fileName = gists[key][1]
      break
    }
  }
  if(gistId != ""){
    var files = {}
    files[fileName] = {"content":ret}
    // gitub api 获取的token, 需要勾选gist权限
    const token = ""
    axios.patch(
      'https://api.github.com/gists/' + gistId,
      {"public":false,"description":"cfw scripts auto upload","files":files},
      {headers:{"Content-Type":"application/json;charset='utf-8'","Authorization": "token "+token}})
    .then(() => notify("Profile has been updated", "profile " + name +" has been updated. And successfully uploaded to gist:" + fileName, true)) 
    .catch(err => notify("Profile has been updated", "profile " + name +" has been updated. But fail to upload to gist:" + fileName + ", because "+ err, true));
  }
  else {
    notify("Profile has been updated", "profile " + name + " has been updated.", true)
  }
  return ret
}