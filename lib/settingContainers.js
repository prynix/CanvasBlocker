/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	var scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = {};
		window.scope.settingContainers = scope;
	}
	
	const logging = require("./logging");
	
	scope.urlContainer = null;
	scope.hideContainer = null;
	scope.expandContainer = null;
	
	scope.getUrlValueContainer = function(name, url){
		var matching = scope.urlContainer.get().filter(function(urlSetting){
			return urlSetting.hasOwnProperty(name);
		}).filter(function(urlSetting){
			return urlSetting.match(url);
		});
		if (matching.length){
			return matching[0];
		}
		else {
			return null;
		}
	};
	scope.setUrlValue = function(name, value, url){
		var urlContainerValue = scope.urlContainer.get();
		var matching = urlContainerValue.filter(function(urlSetting){
			return urlSetting.match(url);
		});
		if (!matching.length){
			let newEntry = {url};
			newEntry[name] = value;
			urlContainerValue.push(newEntry);
			matching = [newEntry];
		}
		matching[0][name] = value;
		return scope.urlContainer.set(urlContainerValue);
	};
	scope.resetUrlValue = function(name, url){
		var urlContainerValue = scope.urlContainer.get();
		var matching = urlContainerValue.filter(function(urlSetting){
			return urlSetting.match(url);
		});
		if (matching.length){
			delete matching[0][name];
			if (Object.keys(matching[0]).every(function(key){return key === "url";})){
				urlContainerValue = urlContainerValue.filter(function(urlSetting){
					return urlSetting !== matching[0];
				});
			}
			scope.urlContainer.set(urlContainerValue);
		}
	};
	
	scope.check = function(settingDefinition){
		if (settingDefinition.isUrlContainer){
			scope.urlContainer = settingDefinition;
			settingDefinition.refresh = function(){
				settingDefinition.set(settingDefinition.get());
			};
		}
		
		if (settingDefinition.isHideContainer){
			scope.hideContainer = settingDefinition;
			let changeListeners = {};
			settingDefinition.setHideByName = function(name, value){
				logging.verbose("set hide of", name, "to", value);
				const hideStore = settingDefinition.get();
				hideStore[name] = value;
				settingDefinition.set(hideStore);
				(changeListeners[name] || []).forEach(function(listener){
					listener(value);
				});
			};
			settingDefinition.getHideByName = function(name){
				const hideStore = settingDefinition.get();
				return hideStore[name] || false;
			};
			settingDefinition.onHideChange = function(name, listener){
				if (!changeListeners[name]){
					changeListeners[name] = [];
				}
				changeListeners[name].push(listener);
			};
			settingDefinition.on(function(event){
				const value = event.newValue;
				Object.keys(value).forEach(function(name){
					(changeListeners[name] || []).forEach(function(listener){
						listener(value[name]);
					});
				});
			});
			settingDefinition.hideAble = false;
		}
		
		if (settingDefinition.isExpandContainer){
			scope.expandContainer = settingDefinition;
			let changeListeners = {};
			settingDefinition.setExpandByName = function(name, value){
				logging.verbose("set expand of", name, "to", value);
				const expandStore = settingDefinition.get();
				expandStore[name] = value;
				settingDefinition.set(expandStore);
				(changeListeners[name] || []).forEach(function(listener){
					listener(value);
				});
			};
			settingDefinition.getExpandByName = function(name){
				const expandStore = settingDefinition.get();
				return expandStore[name] || false;
			};
			settingDefinition.onExpandChange = function(name, listener){
				if (!changeListeners[name]){
					changeListeners[name] = [];
				}
				changeListeners[name].push(listener);
			};
			settingDefinition.on(function(event){
				const value = event.newValue;
				Object.keys(value).forEach(function(name){
					(changeListeners[name] || []).forEach(function(listener){
						listener(value[name]);
					});
				});
			});
		}
	};
	
	scope.initializeUrlContainer = function(eventHandler){
		if (scope.urlContainer){
			scope.urlContainer.on(function({newValue, oldValue}){
				newValue.forEach(function(urlSetting){
					var regExp;
					var domain = !!urlSetting.url.match(/^[A-Za-z0-9_.-]+$/);
					if (domain){
						regExp = new RegExp(
							"(?:^|\\.)" + urlSetting.url.replace(/([\\+*?[^\]$(){}=!|.])/g, "\\$1") + "\\.?$",
							"i"
						);
					}
					else {
						regExp = new RegExp(urlSetting.url, "i");
					}
					const match = function(url){
						if (!url){
							return false;
						}
						else if (
							url instanceof String ||
							(typeof url) === "string"
						){
							return url === urlSetting.url;
						}
						else if (domain){
							return (url.hostname || "").match(regExp);
						}
						else {
							return url.href.match(regExp);
						}
					};
					Object.defineProperty(
						urlSetting,
						"match",
						{
							enumerable: false,
							writable: true,
							configurable: true,
							value: match
						}
					);
				});
				
				var newUrls = newValue.map(function(entry){return entry.url;});
				var oldUrls = oldValue.map(function(entry){return entry.url;});
				var matching = {};
				newUrls.forEach(function(url, i){
					matching[url] = {new: i, old: oldUrls.indexOf(url)};
				});
				oldUrls.forEach(function(url, i){
					if (!matching[url]){
						matching[url] = {new: -1, old: i};
					}
				});
				Object.keys(matching).forEach(function(url){
					var oldEntry = oldValue[matching[url].old] || {};
					var newEntry = newValue[matching[url].new] || {};
					scope.urlContainer.entries.forEach(function(settingDefinition){
						var name = settingDefinition.name;
						var oldValue = oldEntry[name];
						var newValue = newEntry[name];
						
						if (oldValue !== newValue){
							((eventHandler[name] || {})[url] || []).forEach(function(callback){
								callback({name, newValue, oldValue, url});
							});
						}
					});
				});
			});
		}
	};
}());