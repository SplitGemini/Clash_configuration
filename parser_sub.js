module.exports.parse = (raw, { yaml, notify }) => {
  const doc = yaml.parse(raw)
  //兼容性
  if (doc['proxies'] === undefined) {
    doc['proxies'] = doc['Proxy']
    delete doc['Proxy']
    doc['proxy-groups'] = doc['Proxy Group']
    delete doc['Proxy Group']
    doc['rules'] = doc['Rule']
    delete doc['Rule']
  }
  //规则组🚀⚙️🔓👋
  for(var i = 0;i < doc['proxy-groups'].length;i++){
    if(doc['proxy-groups'][i]['name'] == '🔓解锁网易云灰色歌曲'){
      doc['proxy-groups'][i]['proxies'].push('🇨🇳 UNM_Network')
      doc['proxy-groups'][i]['proxies'].push('🇯🇵 UNM-JP-PC')
      doc['proxy-groups'][i]['proxies'].push('🇯🇵 UNM-CN-HHHT-PC')
    }
    if(doc['proxy-groups'][i]['name'] == '👋Manual'){
      doc['proxy-groups'][i]['proxies'].push('🇭🇰 Azure 亚洲')
      doc['proxy-groups'][i]['proxies'].push('🇺🇸 IBM 达拉斯')
    }
  }
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