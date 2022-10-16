const {
	readFileSync,
	existsSync,
	appendFileSync,
	writeFileSync,
} = require("fs");
const { homedir } = require("os");
const { join, resolve } = require("path");
const variable_path = resolve(__dirname, "./variables.yaml");
const myDate = new Date();
let debug = false;
const homeDirectory = join(homedir(), ".config/clash");
// log file路径
const logFile = join(homeDirectory, "logs/cfw-parser.log");
let newParse = true;
const maxLogLine = 20000;

const checkLog = function () {
	if (!existsSync(logFile)) {
		log(
			"[warn]: doesn't find log file: cfw-autocheckin.log, Automatically create it."
		);
	}
	const lines = readFileSync(logFile, "utf-8").toString().split("\n");
	if (lines.length > maxLogLine) {
		let start = Math.round(lines.length / 2);
		while (!/-{2,}.*-{2,}/.test(lines[start]) && start < lines.length) {
			start++;
		}
		//backup old file
		writeFileSync(logFile + ".bak", lines.join("\n"), "utf-8");
		//write new log
		writeFileSync(logFile, lines.slice(start).join("\n"), "utf-8");
		log(
			`[info]: log line count is: ${lines.length} larger than ${maxLogLine}, cut it by half.`
		);
	} else if (debug) {
		log(`[debug]: log line count is: ${lines.length}`);
	}
};

let log = function (text) {
	if (newParse) {
		appendFileSync(
			logFile,
			`\n  --------------${myDate.toLocaleString()}--------------\n`,
			"utf-8"
		);
		newParse = false;
	}
	appendFileSync(logFile, text + "\n", "utf-8");
};

module.exports.parse = async (
	raw,
	{ axios, yaml, notify, console },
	{ name, url, interval, selected, mode }
) => {
	try {
		console.log(`see log in ${logFile}.`);
		// check yaml
		try {
			var rawObj = yaml.parse(raw);
		} catch (e) {
			if (
				e.message === "Implicit map keys need to be on a single line" &&
				!new RegExp("^((?!www.example.com).)*$").test(url)
			) {
				log(`[warning]: raw is not yaml: ${e}.`);
				throw e;
			} else {
				log(`[error]: check yaml fail: ${e}.`);
				throw e;
			}
		}

		//check log lines
		checkLog();

		//check variables.yml
		if (!existsSync(variable_path)) {
			log('[warning]: no found "./variables.yaml".');
			throw 'no found "./variables.yaml"';
		} else {
			var _variables = yaml.parse(readFileSync(variable_path, "utf-8"));
		}
		if (!_variables["merge_nodes"]) {
			log("[warning]: no found merge_nodes variables.");
			node_groups = [];
		} else var node_groups = _variables["merge_nodes"];

		//规则组，往Manual里添加新增的非UNM节点，UNM添加到解锁组
		// 见 subconverter 的配置文件: snippets/groups_clash.txt
		/*
		👋Manual`select`.*
		⚙️Auto`url-test`.*`http://www.gstatic.com/generate_204`300
		🔄Load Balance`load-balance`.*`http://www.gstatic.com/generate_204`300
		🎬Video`select`.*
		🚀Proxy`select`[]👋Manual`[]⚙️Auto`[]🔄Load Balance`[]DIRECT
		✔️Direct`select`[]DIRECT`[]🚀Proxy
		🐟漏网之鱼`select`[]🚀Proxy`[]DIRECT
		🔓解锁网易云灰色歌曲`select`[]DIRECT
		*/
		rawObj["proxies"].forEach((v) => {
			if (
				rawObj["proxy-groups"][0]["proxies"].findIndex(
					(x) => x === v["name"]
				) === -1
			) {
				if (v["name"].indexOf("UNM") === -1) {
					// add to Manual and Video
					rawObj["proxy-groups"][0]["proxies"].push(v["name"]);
					rawObj["proxy-groups"][3]["proxies"].push(v["name"]);
				} else {
					// add to 🔓解锁网易云灰色歌曲
					rawObj["proxy-groups"][7]["proxies"].push(v["name"]);
				}
			}
		});

		if (node_groups.length != 0) {
			if (name) log(`[info]: start merge nodes in "${name}".`);
			else log(`[info]: start merge nodes in new profile.`);
			if (debug) log("[debug]: merge_nodes variables:");
			let _other = [];

			let indexByName = (array, name) => {
				return array
					.map(function (e) {
						return e.name;
					})
					.indexOf(name);
			};

			let push_proxy = (array, group_name, proxy_name) => {
				let index = indexByName(array, group_name);
				// 新建
				if (index === -1) {
					index =
						array.push({
							name: group_name,
							type: "load-balance",
							url: "http://www.gstatic.com/generate_204",
							interval: 300,
							proxies: [],
						}) - 1;
				}
				if (debug) log(`[debug]: add "${proxy_name}" into "${group_name}".`);
				array[index]["proxies"].push(proxy_name);
			};

			rawObj["proxies"].forEach((proxy) => {
				if (
					node_groups.every((node_group) => {
						// key匹配
						if (
							node_group["keys"].some((key) => {
								return proxy["name"].indexOf(key) !== -1;
							})
						) {
							let levels = ["V1", "V2", "V3", "V4", ""];
							// level group
							// foreach keys, get
							//[ ["key1 V1", "key2 V1",...], ["key1 V2", "key2 V2",...], ...["key1", "key2",...] ]
							let levelGroup = levels.map((level) =>
								node_group["keys"].map((key) =>
									level ? `${key} ${level}` : key
								)
							);

							// will definitely be false
							// last element is same as node_group["keys"]
							// and it definitely can pass the 'if' test
							levelGroup.every((keyLevels, i) => {
								// find level
								if (
									// all key with level match
									keyLevels.some((keyLevel) => {
										return proxy["name"].indexOf(keyLevel) !== -1;
									})
								) {
									push_proxy(
										_other,
										node_group["name"] + (levels[i] ? ` ${levels[i]}` : ""),
										proxy["name"]
									);
									return false;
								}
								// doesn't match, continue
								else return true;
							});
							return false;
						}
						// doesn't match, continue
						else return true;
					})
				) {
					// 不匹配任何关键词和UNM
					if (proxy["name"].indexOf("UNM") === -1)
						push_proxy(_other, "💬 其他", proxy["name"]);
				}
			});

			if (debug) log(`[debug]: _other[${_other.length}].`);
			//从后面开始删除内容重复的组
			for (let i = _other.length - 1; i > 0; i--) {
				for (let k = i - 1; k >= 0; k--) {
					if (
						yaml.stringify(_other[i]["proxies"]) ===
						yaml.stringify(_other[k]["proxies"])
					) {
						_other.splice(i, 1);
						break;
					}
				}
			}
			if (debug) log(`[debug]: _other[${_other.length}].`);

			rawObj["proxy-groups"][0]["proxies"] = yaml.parse(
				yaml.stringify(
					rawObj["proxy-groups"][0]["proxies"].concat(
						_other.map((item) => item["name"])
					)
				)
			);
			rawObj["proxy-groups"] = yaml.parse(
				yaml.stringify(rawObj["proxy-groups"].concat(_other))
			);

			if (name) log(`[info]: "${name}" merge nodes completely.`);
			else log(`[info]: new profile merge nodes completely.`);
		} else {
			log("[warning]: keys need to set.");
		}

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
		delete rawObj["proxy-providers"];
		//清理无用字典
		delete rawObj["port"];
		delete rawObj["socks-port"];
		//delete rawObj['mixed-port']
		delete rawObj["redir-port"];
		//delete rawObj['allow-lan']
		//delete rawObj['mode']
		//delete rawObj['log-level']
		//delete rawObj['external-controller']
		delete rawObj["secret"];
		delete rawObj["cfw-bypass"];
		delete rawObj["cfw-latency-url"];
		delete rawObj["cfw-conn-break-strategy"];
		delete rawObj["cfw-child-process"];
		delete rawObj["cfw-latency-timeout"];
		delete rawObj["Rule"];
		delete rawObj["Proxy Group"];
		delete rawObj["Proxy"];

		const ret = yaml.stringify(rawObj);
		let message = "";
		let replace_reg = /^\[[a-z]{4,8}\]: /i;
		// 不是新建配置，而是在更新订阅
		if (name) {
			if (!_variables["upload_group"]) {
				log("[warning]: no found upload_group variables.");
				var upload_group = {};
			} else {
				var upload_group = _variables["upload_group"];
				if (debug)
					log(
						`[debug]: upload_group:\n${yaml.stringify(upload_group, null, 2)}`
					);
			}
			let fileName = "";
			for (let i = 0; i < upload_group.length; i++) {
				if (debug)
					log(
						`[debug]: [group] key: "${upload_group[i]["key"]}", name: "${upload_group[i]["name"]}".`
					);
				if (name.indexOf(upload_group[i]["key"]) !== -1) {
					fileName = upload_group[i]["name"];
					break;
				}
			}

			// 上传gist
			if (fileName) {
				// 添加dns，配合安卓Adgurd
				if (!_variables["dns"]) {
					log("[warning]: no found dns variables.");
				} else {
					rawObj["dns"] = _variables["dns"];
				}
				const upload = yaml.stringify(rawObj);
				let files = {};
				files[fileName] = { content: upload };

				// gist id
				if (!_variables["gistId"]) {
					message = `[warning]: no found gistId variables, but profile "${name}" has been updated.`;
					log(message);
					notify(
						"Profile has been updated",
						message.replace(replace_reg, ""),
						true
					);
					return ret;
				} else {
					var gistId = _variables["gistId"];
					if (debug) log(`[debug]: gistId: ${gistId}`);
				}
				// gitub api 获取的token, 需要勾选gist权限
				if (!_variables["token"]) {
					message = `[warning]: no found token variables, but profile "${name}" has been updated.`;
					log(message);
					notify(
						"Profile has been updated",
						message.replace(replace_reg, ""),
						true
					);
					return ret;
				} else {
					var token = _variables["token"];
					if (debug) log(`[debug]: token: ${token}`);
				}
				axios
					.patch(
						"https://api.github.com/gists/" + gistId,
						{ public: false, files: files },
						{
							headers: {
								"Content-Type": "application/json;charset='utf-8'",
								Authorization: "token " + token,
							},
						}
					)
					.then((res) => {
						// 正则删除链接中的文件commit码
						var link = res["data"]["files"][fileName]["raw_url"].replace(
							/[a-z0-9]{40}\//i,
							""
						);
						message =
							`[info]: Profile "${name}" has been updated. ` +
							`And successfully uploaded to gist:"${fileName}", file links is:${link}.`;
						log(message);
						notify(
							"Profile has been updated",
							message.replace(replace_reg, ""),
							true
						);
					})
					.catch((err) => {
						if (err.response) {
							// The request was made and the server responded with a status code
							// that falls out of the range of 2xx
							message =
								`[error]: Profile "${name}" has been updated. ` +
								`But fail to upload to gist: ${fileName}, ` +
								`the request was made and the server responded with a fail status code,` +
								` because "${JSON.stringify(err.message)}".`;
							notify(
								"Profile has been updated",
								`profile "${name}" has been updated. ` +
								"But fail to upload to gist, see log for more details",
								true
							);
							log(message);
						} else if (err.request) {
							// The request was made but no response was received
							message =
								`[warning]: Profile "${name}" has been updated.` +
								` And maybe successfully uploaded to gist:"${fileName}", ` +
								`the request was made but no response was received, because ` +
								JSON.stringify(err.request);
							notify(
								"Profile has been updated",
								`profile "${name}" has been updated.` +
								` And maybe successfully uploaded to gist, see log for more details.`,
								true
							);
							log(message);
						} else {
							// Something happened in setting up the request that triggered an Error
							message = `[error]: Something happened: ${err.message}.`;
							notify(
								"Profile updated fail",
								"Something happened， see log for more details.",
								true
							);
							log(message);
							throw err;
						}
					});
			}
			// 不上传gist
			else {
				message = `[info]: Profile "${name}" has been updated.`;
				log(message);
				notify(
					"Profile has been updated",
					message.replace(replace_reg, ""),
					true
				);
			}
		}
		// 配置是新建的
		else {
			message = "[info]: A new profile has been added.";
			log(message);
			notify(
				"A new profile has been added",
				message.replace(replace_reg, ""),
				true
			);
		}
		return ret;
	} catch (e) {
		log(`[error]: update profile failed: ${e}.`);
		notify(`Update profile failed`, e.message, true);
		throw e;
	}
};
