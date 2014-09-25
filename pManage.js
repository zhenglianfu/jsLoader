(function(win){
	var doc = win.document,
	js_dir = function(){
		var scripts = doc.getElementsByTagName('script'),
			script = scripts[scripts.length - 1],
			src = script.src;
		return src.substr(0, src.lastIndexOf('/'));
	}(),
	paths = {},
	moduleCache = {},
	manifestCache = {},
	moduleManifest = [];
	/* util functions */
	var rtrim = /^\s+|\s+$/g;
	var Util = {
		foo : function(){},
		orderLoadStyle : function(modules){
			/** should not cache style load state **/
			var i = 0, len = modules.length, styleList, j, style_length, link, head = doc.head, style, module;
			for (; i < len; i++) {
				module = modules[i];
				styleList = Util.getManifeset(module).styleList;
				for (j = 0, style_length = styleList.length; j < style_length; j++) {
					style = styleList[j];
					if (style.href) {
						link = doc.createElement('link');
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = Util.caculatePath(style.href, js_dir);
						head.appendChild(link);
					}
				}
			}
		},
		orderLoadModule : function(modules, fn, errors){
			/** load files one by one, step as the modules **/
			/** here I made it synchronized load js
			 * 	asynchronous load js please see 'http://headjs.com/site/download.html' or 'http://stevesouders.com/controljs/'
			 * 
			 **/
			var i = 0, len = modules.length, data = {}, token;
			// reverse it, as a stack LIFO
			modules = modules.reverse();
			errors = errors || [];
			fn = fn || Util.foo;
			for (; i < len; i ++) {
				token = modules[i];
				if (paths[token].url) {
					fn = function (token, g) {
						return function(){
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
					}(token, fn);
				}
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
			src = Util.trim(src);
			if (src[0] === '/') {
				return root + src;
			} else if (src[0] === '.' && src.indexOf('./') === 0) {
				return root + src.substr(1);
			} else if (src[0] === '.' && src.indexOf('../') === 0) {
				return Util.caculatePath(src.substr(3), root.substr(0, root.lastIndexOf('/')));
			} else if (src.indexOf('http:') === 0 || src.indexOf('https:') === 0) {
				return src;
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
			}
			// load style resource first  
			Util.orderLoadStyle(requires);
			Util.orderLoadModule(requires, callback, errors);
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
					name_space : obj.name_space || 'window',
					module : obj.module || 'window'
			};
			
			var manifest = Util.getManifeset(token),
				t = {
					name : token,
					index : moduleManifest.length,
					require : Util.caculateDependence(obj.require),
					styleList : obj.styleList || []
				};
			if (manifest) {
				// override old manifest object
				t.index = manifest.index;
				moduleManifest[manifest.index] = t;
				// clear cache
				Util.clearCache(token);
			} else {
				moduleManifest.push(t);
			}
		},
		clearCache : function(token) {
			if (token) {
				manifestCache[token] = null;
				moduleCache[token] = null;
			} else {
				manifestCache = {};
				moduleCache = {};
			}
		}
	};
	// interface  PManager finished 
	win.PManager = {
			loadModule : Util.loadModule,
			addModule : Util.addModule
	};
	
	/** 
	 * build in  modules, add the most usually modules
	 * support css dynamic loaded
	 * @watchOut 所有url路径以该js所在目录为基准
	 * */
	(function(modules){
		var i = 0, len = modules.length, token, t; 
		for (; i < len; i++) {
			t = modules[i];
			for (var token in t) {
				PManager.addModule(token, t[token]);
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
		   'underscore' : {
			   url : 'http://underscorejs.org/underscore.js',
			   name_space : 'window',
			   module : '_'
		   }
	   },
	   {
		   'backbone' : {
			   url : 'http://backbonejs.org/backbone.js',
			   name_space : 'window',
			   module : 'Backbone',
			   require : ['jquery', 'underscore']
		   }
	   },
	   {
		   'require' : {
			   url : 'http://requirejs.org/docs/release/2.1.15/comments/require.js',
			   name_space : 'window',
			   module : 'require'
		   }
	   }]));
}(window));
