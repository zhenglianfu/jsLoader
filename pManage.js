(function(win){
	var doc = win.document,
	js_dir = function(){
		var scripts = doc.getElementsByTagName('script'),
			script = scripts[scripts.length - 1],
			src = script.src;
		return src.substr(0, src.lastIndexOf('/'));
	}(),
	doc_dir = function(href) {
		return href.substr(0, href.lastIndexOf('/'));
	}(location.href),
	paths = {},
	moduleCache = {},
	manifestCache = {},
	moduleManifest = [],
	styleLoaded = {};
	/* util functions */
	var rtrim = /^\s+|\s+$/g;
	var Util = {
		foo : function(){},
		orderLoadStyle : function(modules){
			var i = 0, len = modules.length, styleList, j, style_length, link, head = doc.head, style, module;
			for (; i < len; i++) {
				module = modules[i];
				if (styleLoaded[module] === undefined) {
					styleList = Util.getManifeset(module).styleList;
					for (j = 0, style_length = styleList.length; j < style_length; j++) {
						style = styleList[j];
						link = doc.createElement('link');
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = Util.caculatePath(style.href);
						head.appendChild(link);
					}
					styleLoaded[module] = 0;
				}
			}
		},
		orderLoadModule : function(modules, fn, errors){
			var i = 0, len = modules.length, data = {};
			// reverse it, as a stack
			modules = modules.reverse();
			errors = errors || [];
			fn = fn || Util.foo;
			for (; i < len; i ++) {
				fn = function (i, g) {
					return function(){
						var token = modules[i];
						if (moduleCache[token]) {
							data[token] = moduleCache[token];
							g(data, errors); 
						} else {
							Util.loadJSFile(Util.caculatePath(paths[token].url, js_dir), token, function(){
								var name = this.name;
								this.ready = true;
								moduleCache[name] = Util.getObjFromNS(name);
								data[name] = moduleCache[name]; 
								g(data, errors); 
							}, function(){
								errors.push({
									msg : 'url of ' + this.name + ' is incorrect : ' + this.src
								});
								g(data, errors);
							});
						}
					};
				}(i, fn);
			}
			fn(data, errors);
		},
		trim : function(str){
			if (str == null) {
				return '';
			}
			return str.trim ? str.trim() : str.replace(rtrim, '');
		},
		getManifeset : function(token){
			var obj = manifestCache[token], i = 0, len = moduleManifest.length; 
			if (obj) {
				return obj; 
			} 
			for (; i < len; i ++) {
				if (moduleManifest[i].name === token) {
					obj = moduleManifest[i];
					manifestCache[token] = obj;
					break;
				}
			}
			return obj;
		},
		getDependModules : function(module, imports){
			var requires = Util.getManifeset(module).require, i = 0, len = requires.length, item, index;
			imports = imports || [];
			for (; i < len; i ++) {
				item = moduleManifest[requires[i]];
				if (imports.indexOf(item.name) < 0) {
					if (item.require.length) {
						imports = Util.getDependModules(item.name, imports);
					}
					imports.push(item.name);
				}
			}
			return imports;
		},
		loadJSFile : function(url, m_name, onload, onerror) {
			var script = doc.createElement('script');
			script.name = m_name;
			if (script.readyState) {
				script.readystatechange = function(){
					if (script.readyState === 'loaded' || script.readyState === 'complete') {
						script.onreadystatechange = null;
						onload && onload.call(script);
					}
				};
			} else {
				script.onload = onload;
				script.onerror = onerror;
			}
			script.src = url;
			doc.head.appendChild(script);
			return script;
		},
		getObjFromNS : function(moduleName, root) {
			var ns = paths[moduleName].name_space,
				moduleToken = paths[moduleName].module,
				objTree = ns.split('.'), i = 0, name, len = objTree.length, parent = root || win;
			for (; i < len; i ++) {
				name = objTree[i];
				if (name !== ''){
					if (parent[name] == null) {
						break;
					} else {
						parent = parent[name];
					}
				}
			}
			return parent[moduleToken];
		},
		caculateDependence : function(require){
			require = require || [];
			var indexs = [], i = 0, len = require.length, manifest, name;
			for (; i < len; i++) {
				name = require[i];
				manifest = Util.getManifeset(name);
				if (manifest) {
					indexs.push(manifest.index);
				} else {
					throw {
						name : 'dependence error',
						message : 'depend on module "' + name + '", but module "' + name + '" has not been added in this env yet'
					};
				}
			}
			return indexs;
		},
		caculatePath : function(src, dir){
			var root = dir || js_dir;
			if (src[0] === '/') {
				return root + src;
			} else if (src.indexOf('./')) {
				return root + src.substr(1);
			} else if (src.indexOf('../')) {
				return Util.caculatePath(src.substr(2), root.substr(0, root.lastIndexOf('/')));
			}
			return root + '/' + src; 
		},
		/**
		 * load module function 
		 * @example loadModule('grid, dialog', function(data, error){})
		 * 
		 * */
		loadModule : function(m_name, callback){
			var ns = m_name.split(','), i = 0, ns_len = ns.length, m, requires = [], errors = [];
			for (; i < ns_len; i++) {
				m = Util.trim(ns[i]);
				if (paths[m]) {
					requires = requires.concat(Util.getDependModules(m));
					requires.push(m);
				} else {
					errors.push({
						msg : 'module ' + m + ' is not exist in configuration'
					});
				}
				// load style resource first  
				Util.orderLoadStyle(requires);
				Util.orderLoadModule(requires, callback, errors);
			}
		},
		addModule : function(token, obj){
			/**
			 * token is the identity of the module you add in
			 * obj.module is the moduleName in the environment, such as window.$
			 * obj.name_space is the module's name space, jquery's name space is window
			 * obj.require : the other modules it depends on
			 * obj.styleList : the css files of this module 
			 * */
			paths[token] = {
					url : obj.url,
					name_space : obj.name_space,
					module : obj.module
			};
			var manifest = {
					name : token,
					index : moduleManifest.length,
					require : Util.caculateDependence(obj.require),
					styleList : obj.styleList || []
			};
			moduleManifest.push(manifest);
		}
	};
	// interface
	win.PManger = {
			loadModule : Util.loadModule,
			addModule : Util.addModule
	};
	win.Util = Util;
	// build in  modules, add the most usually modules 
	(function(modules){
		var i = 0, len = modules.length, token, t; 
		for (; i < len; i++) {
			t = modules[i];
			for (var token in t) {
				PManger.addModule(token, t[token]);
				break;
			}
		}
	}([{
		   'jquery' : {
			   url : '/jquery/1.9.1/jquery.js',
			   name_space : 'window',
			   module : 'jQuery'
		   }
	   },
	   {
		   'jqueryUI' : {
			   url : '/jquery-ui/1.10.2/jquery-ui.js', 
			   name_space : 'window', 
			   module : 'jQuery',
			   require : ['jquery'],
			   styleList : [{href : '/jquery-ui/1.10.2/css/jquery-ui.css'}]
		   }
	   },{
		   'grid' : {
			   url : '/jq_ext/grid.js', 
			   name_space : '$.fn', 
			   module : 'grid',
			   require : ['jquery']
		   }
	   },{
		   'ajaxJSON' : {
			   url : '/jq_ext/ajaxJSON.js',
			   name_space : '$',
			   module : 'ajaxJSON',
			   require : ['jquery', 'jqueryUI']
		   }
	   },{
		   'test' : {
			   url : '/test/test.js',
			   name_space : 'App.Manager',
			   module : 'test',
			   require : ['ajaxJSON', 'grid'],
			   styleList : [{href : '/test/test.css'}]
		   }
	   }]));
}(window));
