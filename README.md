# Clash_configuration

Clash For Windows的配置一直很麻烦，对于订阅的节点很多时候只需要它的节点信息就行，
mixin功能大概只能用来替换dns，虽然也可以替换规则，但是无法在UI显示，于是，使用parser是最好的选择，

parser将将订阅结构完全统一化，订阅自带的规则组和规则完全丢弃而使用自己收集的（MyRules），自定义节点和规则在parser.yaml中添加 ~~，parser.js负责节点组逻辑~~

~~genpac_script需要python环境和genpac插件，配置cfw-settings会用python3开个子进程（HTTP server），用来映射本地pac，同时开启本地subconvertor转换~~

基本使用subconvertor，放弃pac(兼容性不好)，parser.js只用来往节点组添加节点

参照

[https://github.com/Fndroid/clash_for_windows_pkg/issues/1092](https://github.com/Fndroid/clash_for_windows_pkg/issues/1092)

[https://docs.cfw.lbyczf.com/contents/parser.html](https://docs.cfw.lbyczf.com/contents/parser.html)

[genpac](https://github.com/JinnLynn/genpac)

[clash_rules](https://github.com/Loyalsoldier/clash-rules)