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
  /* 使用subconvertor转换
  // 删除订阅本身包含的解锁节点
  var i = doc['proxies'].length
  while (i--) {
    if(doc['proxies'][i]['name'].indexOf("NeteaseUnblock") != -1){
      doc['proxies'].splice(i,1)
    }
  }
  // 添加常用前缀
  var prefix = {'🇭🇰':'香港', '🇨🇳':'大陆','🇸🇬':'新加坡', '🇯🇵':'日本', 
                '🇺🇸':'美国', '🇷🇺':'俄罗斯', '🇰🇷':'韩国', '🇦🇺':'澳大利亚',
                '🇩🇪':'德国', '🇬🇧':'英国', '🇻🇳':'越南', '🇹🇼':'台湾',
                '🇹🇭':'泰国', '🇮🇹':'意大利', '🇮🇳':'印度', '🇫🇷':'法国'}
  for(i = 0;i < doc['proxies'].length;i ++) {
    var shouldAdd = false
    var key_str = ''
    for(var key in prefix){
      if(doc['proxies'][i]['name'].indexOf(key) != -1){
        shouldAdd = false
        break
      }
      else if(doc['proxies'][i]['name'].indexOf(prefix[key]) != -1) {
        shouldAdd = true
        key_str = key
      }
    }
    if(shouldAdd){
        doc['proxies'][i]['name'] = key_str + ' ' + doc['proxies'][i]['name']
    }
  }
  */
  //自动节点组，不包含解锁网易云音乐节点和自定义节点
  var proxies = []
  doc['proxies'].forEach((v, i) => { 
    proxies.push(v['name'])
  })
  // 手动节点组，深拷贝
  var proxies_munual = JSON.parse(JSON.stringify(proxies))
  //添加自定义节点名
  proxies_munual = proxies_munual.concat(['🇭🇰 Azure 亚洲','🇺🇸 IBM 达拉斯'])
  //规则组🚀⚙️🔓👋
  doc['proxy-groups'] = [
    {'name':'👋Manual', 'type':'select', 'proxies':proxies_munual},
    {'name':'⚙️Auto', 'type':'url-test', 'url':'http://www.gstatic.com/generate_204', 'interval':600, 'proxies':proxies},
    {'name':'⛔️屏蔽广告', 'type':'select', 'proxies':['REJECT', '🐟漏网之鱼']},
    {'name':'🐟漏网之鱼', 'type':'select', 'proxies':['🚀Proxy', 'DIRECT']},
    {'name':'🚀Proxy', 'type':'select', 'proxies':['⚙️Auto', '👋Manual']},
    {'name':'🔓解锁网易云灰色歌曲', 'type':'select', 'proxies':['DIRECT','🇨🇳 UNM_Network','🇯🇵 UNM-JP-PC','🇯🇵 UNM-CN-HHHT-PC']}
  ]
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