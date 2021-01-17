# Clash_configuration

## 介绍

[Clash For Windows](https://github.com/Fndroid/clash_for_windows_pkg)（下称cfw）的配置一直很麻烦，对于订阅的节点很多时候只需要它的节点信息就行，
mixin功能大概只能用来替换dns，虽然也可以替换规则，但是无法在UI显示，于是，使用parser是最好的选择，

- 将订阅结构完全统一化，订阅自带的规则组和规则完全丢弃而使用自己收集的（MyRules），自定义节点和规则在parser.yaml中添加 
- 添加根据profiles名称关键词自动上传私密gist，每次更新自动上传，可以通过log查看订阅链接或调试信息，可以用于 Clash For Android 等进行远程订阅，注意gist id链接不可泄露
- 上传gist中添加dns设置以配合Adgurad
- 自动分组和自动签到功能，by [yi-Xu-0100/cfw-scripts](https://github.com/yi-Xu-0100/cfw-scripts)，进行了一些修改

## 部署

1. [subconvertor](https://github.com/tindy2013/subconverter) ，作为子程序，放在cfw配置目录。
1. [UnblockNeteaseMusic](https://github.com/cnsilvan/UnblockNeteaseMusic) ，作为子程序，放在cfw配置目录，用于本地解锁网易云音乐灰色歌曲。
1. 手动创建好一个gist，获取到`Personal Access Token`（[在此创建](https://github.com/settings/tokens/new?scopes=gist&description=Subconverter)），注意token获取后如没有保存将不再可见。
1. 在variables.yaml 修改参数实现上传gist、自动签到、自动分组等功能
1. cfw-settings.yaml替换全部`YOURNAME`为你电脑用户名，或者将带该标记的目录修改为cfw配置目录。
1. 复制parser.js、parser.yaml、cfw-settings.yaml、auto-check-in.js、variables.yaml、subconverter文件夹到cfw配置目录，安装版为“C:/Users/YOURNAME/.config/clash”

## 参照

[reference issue #1092](https://github.com/Fndroid/clash_for_windows_pkg/issues/1092)  
[about cfw parser](https://docs.cfw.lbyczf.com/contents/parser.html)  
[genpac](https://github.com/JinnLynn/genpac)  
[clash_rules](https://github.com/Loyalsoldier/clash-rules)  
[yi-Xu-0100/cfw-scripts](https://github.com/yi-Xu-0100/cfw-scripts)