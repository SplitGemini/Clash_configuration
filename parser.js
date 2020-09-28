module.exports.parse = (raw, { yaml, notify }) => {
  var doc = yaml.parse(raw);
  
  //兼容性
  if (doc['proxies'] === undefined) {
    doc['proxies'] = doc['Proxy'];
    delete doc['Proxy'];
    doc['proxy-groups'] = doc['Proxy Group'];
    delete doc['Proxy Group'];
    doc['rules'] = doc['Rule'];
    delete doc['Rule'];
  }

  // 删除订阅本身包含的解锁节点
  var i = doc['proxies'].length;
  while (i--) {
    if(doc['proxies'][i]['name'].indexOf("NeteaseUnblock") != -1){
      doc['proxies'].splice(i,1);
    }
  }

  // 添加常用前缀
  var prefix = {'🇭🇰':'香港', '🇨🇳':'大陆','🇸🇬':'新加坡', '🇯🇵':'日本', 
                '🇺🇸':'美国', '🇷🇺':'俄罗斯', '🇰🇷':'韩国', '🇦🇺':'澳大利亚',
                '🇩🇪':'德国', '🇬🇧':'英国', '🇻🇳':'越南', '🇹🇼':'台湾',
                '🇹🇭':'泰国', '🇮🇹':'意大利', '🇮🇳':'印度', '🇫🇷':'法国'};
  for(i = 0;i < doc['proxies'].length;i ++) {
    var shouldAdd = false;
    var key_str = '';
    for(var key in prefix){
      if(doc['proxies'][i]['name'].indexOf(key) != -1){
        shouldAdd = false;
        break;
      }
      else if(doc['proxies'][i]['name'].indexOf(prefix[key]) != -1) {
        shouldAdd = true;
        key_str = key;
        break;
      }
    }
    if(shouldAdd){
        doc['proxies'][i]['name'] = key_str + ' ' + doc['proxies'][i]['name'];
    }
  }

  //自动节点组，不包含解锁网易云音乐节点和自定义节点
  var proxies = [];
  doc['proxies'].forEach((v, i) => { 
    proxies.push(v['name']);
  });
  // 手动节点组，深拷贝
  var proxies_munual = JSON.parse(JSON.stringify(proxies));
  //添加自定义手动节点
  //proxies_munual = proxies_munual.concat(['']);
  
  //规则组🚀⚙️🔓👋
  doc['proxy-groups'] = [];
  doc['proxy-groups'][0] = {};
  doc['proxy-groups'][0]['name'] = '👋Manual';
  doc['proxy-groups'][0]['type'] = 'select';
  doc['proxy-groups'][0]['proxies'] = proxies_munual;
  
  doc['proxy-groups'][1] = {};
  doc['proxy-groups'][1]['name'] = '⚙️Auto';
  doc['proxy-groups'][1]['type'] = 'url-test';
  doc['proxy-groups'][1]['url'] = 'http://www.gstatic.com/generate_204';
  doc['proxy-groups'][1]['interval'] = 600;
  doc['proxy-groups'][1]['proxies'] = proxies;
  
  doc['proxy-groups'][2] = {};
  doc['proxy-groups'][2]['name'] = '⛔️屏蔽广告';
  doc['proxy-groups'][2]['type'] = 'select';
  doc['proxy-groups'][2]['proxies'] = ['REJECT', '🐟漏网之鱼'];
  
  doc['proxy-groups'][3] = {};
  doc['proxy-groups'][3]['name'] = '🐟漏网之鱼';
  doc['proxy-groups'][3]['type'] = 'select';
  doc['proxy-groups'][3]['proxies'] = ['🚀Proxy', 'DIRECT'];
  
  doc['proxy-groups'][4] = {};
  doc['proxy-groups'][4]['name'] = '🚀Proxy';
  doc['proxy-groups'][4]['type'] = 'select';
  doc['proxy-groups'][4]['proxies'] = ['⚙️Auto', '👋Manual'];
  
  doc['proxy-groups'][5] = {};
  doc['proxy-groups'][5]['name'] = '🔓解锁网易云灰色歌曲';
  doc['proxy-groups'][5]['type'] = 'select';
  doc['proxy-groups'][5]['proxies'] = ['DIRECT'];
  
  //清理无用字典
  delete doc['rules'];
  delete doc['port'];
  delete doc['socks-port'];
  delete doc['mixed-port'];
  delete doc['redir-port'];
  delete doc['allow-lan'];
  delete doc['mode'];
  delete doc['log-level'];
  delete doc['external-controller'];
  delete doc['secret'];
  delete doc['cfw-bypass'];
  delete doc['cfw-latency-url'];
  delete doc['cfw-conn-break-strategy'];
  delete doc['cfw-child-process'];
  delete doc['cfw-latency-timeout'];
  delete doc['Rule'];
  delete doc['Proxy Group'];
  delete doc['Proxy'];
  /*
  //规则，不能删，否则js将不起作用，玄学，现在可以删了
  var temp_rules = [
'rules:',
'  #- GEOIP,CN,DIRECT',
'  - MATCH,🐟漏网之鱼'
].join('\n');
  const rules = yaml.parse(temp_rules);
  doc['rules'] = rules['rules'];
  */
  notify("profile has been updated", "Personal rules has been updated.", true);
  return yaml.stringify(doc);
}