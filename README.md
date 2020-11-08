# Clash_configuration

## 介绍

[Clash For Windows](https://github.com/Fndroid/clash_for_windows_pkg)（下称cfw）的配置一直很麻烦，对于订阅的节点很多时候只需要它的节点信息就行，
mixin功能大概只能用来替换dns，虽然也可以替换规则，但是无法在UI显示，于是，使用parser是最好的选择，

将订阅结构完全统一化，订阅自带的规则组和规则完全丢弃而使用自己收集的（MyRules），自定义节点和规则在parser.yaml中添加 

添加根据profiles名称关键词自动上传私密gist（需要cfw 0.13.1版本以上），每次更新自动上传，可以通过log查看订阅链接或调试信息，可以用于 Clash For Android / Surge 等进行远程订阅，注意gist id链接不可泄露

## 部署

1. [subconvertor](https://github.com/tindy2013/subconverter) ，作为子程序，放在cfw配置目录。
1. [UnblockNeteaseMusic](https://github.com/cnsilvan/UnblockNeteaseMusic) ，作为子程序，放在cfw配置目录，用于本地解锁网易云音乐灰色歌曲
1. 手动创建好一个gist，parser.js 中gistId修改为已创建好的gist的id；'token'修改为 `Personal Access Token`（[在此创建](https://github.com/settings/tokens/new?scopes=gist&description=Subconverter)），注意token获取后如没有保存将不再可见。修改关键词字典，配置名包含关键词则将其以对应关键词字典值为文件名上传到gist
1. cfw-settings.yaml替换全部`YOURNAME`为你电脑用户名，或者将带该标记的目录修改为cfw配置目录
1. 复制parser.js、parser.yaml、cfw-settings.yaml、subconverter文件夹到cfw配置目录，安装版为“C:/Users/YOURNAME/.config/clash”

## 参照

[reference issue #1092](https://github.com/Fndroid/clash_for_windows_pkg/issues/1092)

[about cfw parser](https://docs.cfw.lbyczf.com/contents/parser.html)

[genpac](https://github.com/JinnLynn/genpac)

[clash_rules](https://github.com/Loyalsoldier/clash-rules)
