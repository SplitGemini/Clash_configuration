module.exports.parse = (raw, { yaml, notify }) => {
  const doc = yaml.parse(raw)
  //规则组🚀⚙️🔓👋，往Manual里添加新增的非UNM节点，UNM添加到解锁组
  doc['proxies'].forEach((v, i) => { 
    if(doc['proxy-groups'][0]['proxies'].findIndex(name => name == v['name']) == -1){
      if(v['name'].indexOf('UNM') == -1){
        doc['proxy-groups'][0]['proxies'].push(v['name'])
      }
      else{
        doc['proxy-groups'][5]['proxies'].push(v['name'])
      }
    }
  })
  //清理无用字典
  delete doc['rules']
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
  notify("profile has been updated", "Personal rules has been updated.", true)
  return yaml.stringify(doc)
}