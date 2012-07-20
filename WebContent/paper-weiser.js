/*!
 * Paper.js v0.22
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: Wed Apr 25 16:18:03 2012 +0200
 *
 ***
 *
 * Bootstrap.js JavaScript Framework.
 * http://bootstrapjs.org/
 *
 * Copyright (c) 2006 - 2011 Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license.
 *
 ***
 *
 * Parse-js
 *
 * A JavaScript tokenizer / parser / generator, originally written in Lisp.
 * Copyright (c) Marijn Haverbeke <marijnh@gmail.com>
 * http://marijn.haverbeke.nl/parse-js/
 *
 * Ported by to JavaScript by Mihai Bazon
 * Copyright (c) 2010, Mihai Bazon <mihai.bazon@gmail.com>
 * http://mihai.bazon.net/blog/
 *
 * Modifications and adaptions to browser (c) 2011, Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the BSD license.
 */

var paper = new function() {
// Inline Bootstrap core (the Base class) inside the paper scope first:
/**
 * Bootstrap JavaScript Library
 * (c) 2006 - 2011 Juerg Lehni, http://lehni.org/
 *
 * Bootstrap is released under the MIT license
 * http://bootstrapjs.org/
 *
 * Inspirations:
 * http://dean.edwards.name/weblog/2006/03/base/
 * http://dev.helma.org/Wiki/JavaScript+Inheritance+Sugar/
 * http://prototypejs.org/
 */

var Base = new function() { // Bootstrap scope
	// Fix __proto__ for browsers where it is not implemented (IE and Opera).
	var fix = !this.__proto__,
		hidden = /^(statics|generics|preserve|enumerable|prototype|__proto__|toString|valueOf)$/,
		proto = Object.prototype,
		/**
		 * Private function that checks if an object contains a given property.
		 * Naming it 'has' causes problems on Opera when defining
		 * Object.prototype.has, as the local version then seems to be overriden
		 * by that. Giving it a idfferent name fixes it.
		 */
		has = fix
			? function(name) {
				return name !== '__proto__' && this.hasOwnProperty(name);
			}
			: proto.hasOwnProperty,
		toString = proto.toString,
		proto = Array.prototype,
		isArray = Array.isArray = Array.isArray || function(obj) {
			return toString.call(obj) === '[object Array]';
		},
		slice = proto.slice,
		forEach = proto.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++)
				iter.call(bind, this[i], i, this);
		},
		forIn = function(iter, bind) {
			// Do not use Object.keys for iteration as iterators might modify
			// the object we're iterating over, making the hasOwnProperty still
			// necessary.
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
		},
		_define = Object.defineProperty,
		_describe = Object.getOwnPropertyDescriptor;

	// Support a mixed environment of some ECMAScript 5 features present,
	// along with __defineGetter/Setter__ functions, as found in browsers today.
	function define(obj, name, desc) {
		// Unfortunately Safari seems to ignore configurable: true and
		// does not override existing properties, so we need to delete
		// first:
		if (_define) {
			try {
				delete obj[name];
				return _define(obj, name, desc);
			} catch (e) {}
		}
		if ((desc.get || desc.set) && obj.__defineGetter__) {
			desc.get && obj.__defineGetter__(name, desc.get);
			desc.set && obj.__defineSetter__(name, desc.set);
		} else {
			obj[name] = desc.value;
		}
		return obj;
	}

	function describe(obj, name) {
		if (_describe) {
			try {
				return _describe(obj, name);
			} catch (e) {}
		}
		var get = obj.__lookupGetter__ && obj.__lookupGetter__(name);
		return get
			? { get: get, set: obj.__lookupSetter__(name), enumerable: true,
					configurable: true }
			: has.call(obj, name)
				? { value: obj[name], enumerable: true, configurable: true,
						writable: true }
				: null;
	}

	/**
	 * Private function that injects functions from src into dest, overriding
	 * (and inherinting from) base.
	 */
	function inject(dest, src, enumerable, base, preserve, generics) {
		var beans, bean;

		/**
		 * Private function that injects one field with given name and checks if
		 * the field is a function that needs to be wrapped for calls of base().
		 * This is only needed if the function in base is different from the one
		 * in src, and if the one in src is actually calling base through base.
		 * The string of the function is parsed for this.base to detect calls.
		 */
		function field(name, val, dontCheck, generics) {
			// This does even work for prop: 0, as it will just be looked up
			// again through describe.
			var val = val || (val = describe(src, name))
					&& (val.get ? val : val.value),
				func = typeof val === 'function',
				res = val,
				// Only lookup previous value if we preserve or define a
				// function that might need it for this.base(). If we're
				// defining a getter, don't lookup previous value, but look if
				// the property exists (name in dest) and store result in prev
				prev = preserve || func
					? (val && val.get ? name in dest : dest[name]) : null;
			// Make generics first, as we might jump out bellow in the
			// val !== (src.__proto__ || Object.prototype)[name] check,
			// e.g. when explicitely reinjecting Array.prototype methods
			// to produce generics of them.
			if (generics && func && (!preserve || !generics[name])) {
				generics[name] = function(bind) {
					// Do not call Array.slice generic here, as on Safari,
					// this seems to confuse scopes (calling another
					// generic from generic-producing code).
					return bind && dest[name].apply(bind,
							slice.call(arguments, 1));
				}
			}
			if ((dontCheck || val !== undefined && has.call(src, name))
					&& (!preserve || !prev)) {
				if (func) {
					if (prev && /\bthis\.base\b/.test(val)) {
						var fromBase = base && base[name] == prev;
						res = function() {
							// Look up the base function each time if we can,
							// to reflect changes to the base class after
							// inheritance.
							var tmp = describe(this, 'base');
							define(this, 'base', { value: fromBase
								? base[name] : prev, configurable: true });
							try {
								return val.apply(this, arguments);
							} finally {
								tmp ? define(this, 'base', tmp)
									: delete this.base;
							}
						};
						// Make wrapping closure pretend to be the original
						// function on inspection
						res.toString = function() {
							return val.toString();
						}
						res.valueOf = function() {
							return val.valueOf();
						}
					}
					// Produce bean properties if getters are specified. This
					// does not produce properties for setter-only properties.
					// Just collect beans for now, and look them up in dest at
					// the end of fields injection. This ensures this.base()
					// works in beans too, and inherits setters for redefined
					// getters in subclasses. Only add getter beans if they do
					// not expect arguments. Functions that should function both
					// with optional arguments and as beans should not declare
					// the parameters and use the arguments array internally
					// instead.
					if (beans && val.length == 0
							&& (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
						beans.push([ bean[3].toLowerCase() + bean[4], bean[2] ]);
				}
				// No need to look up getter if this is a function already.
				if (!res || func || !res.get)
					res = { value: res, writable: true };
				// Only set/change configurable and enumerable if this field is
				// configurable
				if ((describe(dest, name)
						|| { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
			}
		}
		// Iterate through all definitions in src now and call field() for each.
		if (src) {
			beans = [];
			for (var name in src)
				if (has.call(src, name) && !hidden.test(name))
					field(name, null, true, generics);
			// IE (and some other browsers?) never enumerate these, even  if
			// they are simply set on an object. Force their creation. Do not
			// create generics for these, and check them for not being defined
			// (by passing undefined for dontCheck).
			field('toString');
			field('valueOf');
			// Now finally define beans as well. Look up methods on dest, for
			// support of this.base() (See above).
			for (var i = 0, l = beans && beans.length; i < l; i++)
				try {
					var bean = beans[i], part = bean[1];
					field(bean[0], {
						get: dest['get' + part] || dest['is' + part],
						set: dest['set' + part]
					}, true);
				} catch (e) {}
		}
		return dest;
	}

	/**
	 * Private function that creates a constructor to extend the given object.
	 * When this constructor is called through new, a new object is craeted
	 * that inherits all from obj.
	 */
	function extend(obj) {
		// Create the constructor for the new prototype that calls initialize
		// if it is defined.
		var ctor = function(dont) {
			// Fix __proto__
			if (fix) define(this, '__proto__', { value: obj });
			// Call the constructor function, if defined and we are not
			// inheriting, in which case ctor.dont would be set, see bellow.
			if (this.initialize && dont !== ctor.dont)
				return this.initialize.apply(this, arguments);
		}
		ctor.prototype = obj;
		// Add a toString function that delegates to initialize if possible
		ctor.toString = function() {
			return (this.prototype.initialize || function() {}).toString();
		}
		return ctor;
	}

	/**
	 * Converts the argument to an iterator function. If none is specified, the
	 * identity function is returned.
	 * This supports normal functions, which are returned unmodified, and values
	 * to compare to. Wherever this function is used in the Enumerable
	 * functions, a value, a Function or null may be passed.
	 */
	function iterator(iter) {
		return !iter
			? function(val) { return val }
			: typeof iter !== 'function'
				? function(val) { return val == iter }
				: iter;
	}

	function each(obj, iter, bind, asArray) {
		try {
			if (obj)
				(asArray || asArray === undefined && isArray(obj)
					? forEach : forIn).call(obj, iterator(iter),
						bind = bind || obj);
		} catch (e) {
			if (e !== Base.stop) throw e;
		}
		return bind;
	}

	function clone(obj) {
		return each(obj, function(val, i) {
			this[i] = val;
		}, new obj.constructor());
	}

	// Inject into new ctor object that's passed to inject(), and then returned
	return inject(function() {}, {
		inject: function(src/*, ... */) {
			if (src) {
				var proto = this.prototype,
					base = proto.__proto__ && proto.__proto__.constructor,
					// Allow the whole scope to just define statics by defining
					// statics: true.
					statics = src.statics == true ? src : src.statics;
				if (statics != src)
					inject(proto, src, src.enumerable, base && base.prototype,
							src.preserve, src.generics && this);
				// Define new static fields as enumerable, and inherit from
				// base. enumerable is necessary so they can be copied over from
				// base, and it does not harm to have enumerable properties in
				// the constructor. Use the preserve setting in src.preserve for
				// statics too, not their own.
				inject(this, statics, true, base, src.preserve);
			}
			// If there are more than one argument, loop through them and call
			// inject again. Do not simple inline the above code in one loop,
			// since each of the passed objects might override this.inject.
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src/* , ... */) {
			// The new prototype extends the constructor on which extend is
			// called. Fix constructor.
			// TODO: Consider using Object.create instead of using this.dont if
			// available?
			var proto = new this(this.dont),
				ctor = extend(proto);
			define(proto, 'constructor',
					{ value: ctor, writable: true, configurable: true });
			// Define an object to be passed as the first parameter in
			// constructors when initialize should not be called.
			ctor.dont = {};
			// Copy over static fields, as prototype-like inheritance
			// is not possible for static fields. Mark them as enumerable
			// so they can be copied over again.
			inject(ctor, this, true);
			// Inject all the definitions in src. Use the new inject instead of
			// the one in ctor, in case it was overriden. this is needed when
			// overriding the static .inject(). But only inject if there's
			// something to actually inject.
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		}
		// Pass true for enumerable, so inject() and extend() can be passed on
		// to subclasses of Base through Base.inject() / extend().
	}, true).inject({
		/**
		 * Returns true if the object contains a property with the given name,
		 * false otherwise.
		 * Just like in .each, objects only contained in the prototype(s) are
		 * filtered.
		 */
		has: has,
		each: each,

		/**
		 * Injects the fields from the given object, adding this.base()
		 * functionality
		 */
		inject: function(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i]);
			return this;
		},

		/**
		 * Returns a new object that inherits all properties from "this",
		 * through proper JS inheritance, not copying.
		 * Optionally, src and hide parameters can be passed to fill in the
		 * newly created object just like in inject(), to copy the behavior
		 * of Function.prototype.extend.
		 */
		extend: function(/* src, ... */) {
			// Notice the "new" here: the private extend returns a constructor
			// as it's used for Function.prototype.extend as well. But when
			// extending objects, we want to return a new object that inherits
			// from "this". In that case, the constructor is never used again,
			// its just created to create a new object with the proper
			// inheritance set and is garbage collected right after.
			var res = new (extend(this));
			return res.inject.apply(res, arguments);
		},

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		/**
		 * Creates a new object of the same type and copies over all
		 * name / value pairs from this object.
		 */
		clone: function() {
			return clone(this);
		},

		statics: {
			// Expose some local privates as Base generics.
			each: each,
			clone: clone,
			define: define,
			describe: describe,
			iterator: iterator,

			has: function(obj, name) {
				return has.call(obj, name);
			},

			type: function(obj) {
				return (obj || obj === 0) && (obj._type || typeof obj) || null;
			},

			check: function(obj) {
				return !!(obj || obj === 0);
			},

			/**
			 * Returns the first argument that is defined.
			 * Null is counted as defined too, since !== undefined is used for
			 * comparisons. In this it differs from Mootools!
			 */
			pick: function() {
				for (var i = 0, l = arguments.length; i < l; i++)
					if (arguments[i] !== undefined)
						return arguments[i];
				return null;
			},

			/**
			 * A special constant, to be thrown by closures passed to each()
			 *
			 * $continue / Base.next is not implemented, as the same
			 * functionality can achieved by using return in the closure.
			 * In prototype, the implementation of $continue also leads to a
			 * huge speed decrease, as the closure is wrapped in another closure
			 * that does nothing else than handling $continue.
			 */
			stop: {}
		}
	});
}



/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Base
 * @class
 * @private
 */
// Extend Base with utility functions used across the library. Also set
// this.Base on the injection scope, since bootstrap.js ommits that.
this.Base = Base.inject(/** @lends Base# */{
	// Have generics versions of #clone() and #toString():
	generics: true,

	/**
	 * General purpose clone function that delegates cloning to the constructor
	 * that receives the object to be cloned as the first argument.
	 * Note: #clone() needs to be overridden in any class that requires other
	 * cloning behavior.
	 */
	clone: function() {
		return new this.constructor(this);
	},

	/**
	 * Renders base objects to strings in object literal notation.
	 */
	toString: function() {
		return '{ ' + Base.each(this, function(value, key) {
			// Hide internal properties even if they are enumerable
			if (key.charAt(0) != '_') {
				var type = typeof value;
				this.push(key + ': ' + (type === 'number'
						? Base.formatNumber(value)
						: type === 'string' ? "'" + value + "'" : value));
			}
		}, []).join(', ') + ' }';
	},

	statics: /** @lends Base */{
		/**
		 * Reads arguments of the type of the class on which it is called on
		 * from the passed arguments list or array, at the given index, up to
		 * the specified length. This is used in argument conversion, e.g. by
		 * all basic types (Point, Size, Rectangle) and also higher classes such
		 * as Color and Segment.
		 */
		read: function(list, start, length) {
			var start = start || 0,
				length = length || list.length - start;
			var obj = list[start];
			if (obj instanceof this
					// If the class defines _readNull, return null when nothing
					// was provided
					|| this.prototype._readNull && obj == null && length <= 1)
				return obj;
			obj = new this(this.dont);
			return obj.initialize.apply(obj, start > 0 || length < list.length
				? Array.prototype.slice.call(list, start, start + length)
				: list) || obj;
		},

		/**
		 * Reads all readable arguments from the list, handling nested arrays
		 * seperately.
		 */
		readAll: function(list, start) {
			var res = [], entry;
			for (var i = start || 0, l = list.length; i < l; i++) {
				res.push(Array.isArray(entry = list[i])
					? this.read(entry, 0)
					: this.read(list, i, 1));
			}
			return res;
		},

		/**
		 * Utility function for adding and removing items from a list of which
		 * each entry keeps a reference to its index in the list in the private
		 * _index property. Used for PaperScope#projects and Item#children.
		 */
		splice: function(list, items, index, remove) {
			var amount = items && items.length,
				append = index === undefined;
			index = append ? list.length : index;
			// Update _index on the items to be added first.
			for (var i = 0; i < amount; i++)
				items[i]._index = index + i;
			if (append) {
				// Append them all at the end by using push
				list.push.apply(list, items);
				// Nothing removed, and nothing to adjust above
				return [];
			} else {
				// Insert somewhere else and/or remove
				var args = [index, remove];
				if (items)
					args.push.apply(args, items);
				var removed = list.splice.apply(list, args);
				// Delete the indices of the removed items
				for (var i = 0, l = removed.length; i < l; i++)
					delete removed[i]._index;
				// Adjust the indices of the items above.
				for (var i = index + amount, l = list.length; i < l; i++)
					list[i]._index = i;
				return removed;
			}
		},

		/**
		 * Merge all passed hash objects into a newly creted Base object.
		 */
		merge: function() {
			return Base.each(arguments, function(hash) {
				Base.each(hash, function(value, key) {
					this[key] = value;
				}, this);
			}, new Base(), true); // Pass true for asArray, as arguments is none
		},

		/**
		 * Capitalizes the passed string: hello world -> Hello World
		 */
		capitalize: function(str) {
			return str.replace(/\b[a-z]/g, function(match) {
				return match.toUpperCase();
			});
		},

		/**
		 * Camelizes the passed hyphenated string: caps-lock -> capsLock
		 */
		camelize: function(str) {
			return str.replace(/-(\w)/g, function(all, chr) {
				return chr.toUpperCase();
			});
		},

		/**
		 * Converst camelized strings to hyphenated ones: CapsLock -> caps-lock
		 */
		hyphenate: function(str) {
			return str.replace(/[a-z][A-Z0-9]|[0-9][a-zA-Z]|[A-Z]{2}[a-z]/g,
				function(match) {
					return match.charAt(0) + '-' + match.substring(1);
				}
			).toLowerCase();
		},

		/**
		 * Utility function for rendering numbers to strings at a precision of
		 * up to 5 fractional digits.
		 */
		formatNumber: function(num) {
			return (Math.round(num * 100000) / 100000).toString();
		}
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PaperScope
 *
 * @class The {@code PaperScope} class represents the scope associated with a
 * Paper context. When working with PaperScript, these scopes are automatically
 * created for us, and through clever scoping the properties and methods of the
 * active scope seem to become part of the global scope.
 *
 * When working with normal JavaScript code, {@code PaperScope} objects need to
 * be manually created and handled.
 *
 * Paper classes can only be accessed through {@code PaperScope} objects. Thus
 * in PaperScript they are global, while in JavaScript, they are available on
 * the global {@link paper} object. For JavaScript you can use
 * {@link PaperScope#install(scope) } to install the Paper classes and objects
 * on the global scope. Note that when working with more than one scope, this
 * still works for classes, but not for objects like {@link PaperScope#project},
 * since they are not updated in the injected scope if scopes are switched.
 *
 * The global {@link paper} object is simply a reference to the currently active
 * {@code PaperScope}.
 */
var PaperScope = this.PaperScope = Base.extend(/** @lends PaperScope# */{

	/**
	 * Creates a PaperScope object.
	 *
	 * @name PaperScope#initialize
	 * @function
	 */
	initialize: function(script) {
		// script is only used internally, when creating scopes for PaperScript.
		// Whenever a PaperScope is created, it automatically becomes the active
		// one.
		paper = this;
		this.project = null;
		this.projects = [];
		this.tools = [];
		// Assign an id to this canvas that's either extracted from the script
		// or automatically generated.
		this._id = script && (script.getAttribute('id') || script.src)
				|| ('paperscope-' + (PaperScope._id++));
		// Make sure the script tag also has this id now. If it already had an
		// id, we're not changing it, since it's the first option we're
		// trying to get an id from above.
		if (script)
			script.setAttribute('id', this._id);
		PaperScope._scopes[this._id] = this;
	},

	/**
	 * The version of Paper.js, as a float number.
	 *
	 * @type Number
	 */
	version: 0.22,

	/**
	 * The currently active project.
	 * @name PaperScope#project
	 * @type Project
	 */

	/**
	 * The list of all open projects within the current Paper.js context.
	 * @name PaperScope#projects
	 * @type Project[]
	 */

	/**
	 * The reference to the active project's view.
	 * @type View
	 * @bean
	 */
	getView: function() {
		return this.project.view;
	},

	/**
	 * The reference to the active tool.
	 * @type Tool
	 * @bean
	 */
	getTool: function() {
		// If no tool exists yet but one is requested, produce it now on the fly
		// so it can be used in PaperScript.
		if (!this._tool)
			this._tool = new Tool();
		return this._tool;
	 },

	/**
	 * The list of available tools.
	 * @name PaperScope#tools
	 * @type Tool[]
	 */

	evaluate: function(code) {
		var res = PaperScript.evaluate(code, this);
		View.updateFocus();
		return res;
	},

	/**
	 * Injects the paper scope into any other given scope. Can be used for
	 * examle to inject the currently active PaperScope into the window's global
	 * scope, to emulate PaperScript-style globally accessible Paper classes and
	 * objects:
	 *
	 * @example
	 * paper.install(window);
	 */
	install: function(scope) {
		// Define project, view and tool as getters that redirect to these
		// values on the PaperScope, so they are kept up to date
		var that = this;
		Base.each(['project', 'view', 'tool'], function(key) {
			Base.define(scope, key, {
				configurable: true,
				writable: true,
				get: function() {
					return that[key];
				}
			});
		});
		// Copy over all fields from this scope to the destination.
		// Do not use Base.each, since we also want to enumerate over
		// fields on PaperScope.prototype, e.g. all classes
		for (var key in this) {
			if (!/^(version|_id|load)/.test(key) && !(key in scope))
				scope[key] = this[key];
		}
	},

	/**
	 * Sets up an empty project for us. If a canvas is provided, it also creates
	 * a {@link View} for it, both linked to this scope.
	 *
	 * @param {HTMLCanvasElement} canvas The canvas this scope should be
	 * associated with.
	 */
	setup: function(canvas) {
		// Create an empty project for the scope.
		// Make sure this is the active scope, so the created project and view
		// are automatically associated with it.
		paper = this;
		this.project = new Project(canvas);
	},

	clear: function() {
		// Remove all projects, views and tools.
		// This also removes the installed event handlers.
		for (var i = this.projects.length - 1; i >= 0; i--)
			this.projects[i].remove();
		for (var i = this.tools.length - 1; i >= 0; i--)
			this.tools[i].remove();
	},

	remove: function() {
		this.clear();
		delete PaperScope._scopes[this._id];
	},

	statics: /** @lends PaperScope */{
		_scopes: {},
		_id: 0,

		/**
		 * Retrieves a PaperScope object with the given id or associated with
		 * the passed canvas element.
		 *
		 * @param id
		 */
		get: function(id) {
			// If a script tag is passed, get the id from it.
			if (typeof id === 'object')
				id = id.getAttribute('id');
			return this._scopes[id] || null;
		}
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PaperScopeItem
 *
 * @class A private base class for all classes that have lists and references in
 * the {@link PaperScope} ({@link Project}, {@link View}, {@link Tool}), so
 * functionality can be shared.
 *
 * @private
 */
var PaperScopeItem = Base.extend(/** @lends PaperScopeItem# */{

	/**
	 * Creates a PaperScopeItem object.
	 */  
	initialize: function(activate) {
		// Store reference to the currently active global paper scope:
		this._scope = paper;
		// Push it onto this._scope.projects and set index:
		this._index = this._scope[this._list].push(this) - 1;
		// If the project has no active reference, activate this one
		if (activate || !this._scope[this._reference])
			this.activate();
	},

	activate: function() {
		if (!this._scope)
			return false;
		this._scope[this._reference] = this;
		return true;
	},

	remove: function() {
		if (this._index == null)
			return false;
		Base.splice(this._scope[this._list], null, this._index, 1);
		// Clear the active tool reference if it was pointint to this.
		if (this._scope[this._reference] == this)
			this._scope[this._reference] = null;
		this._scope = null;
		return true;
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var Callback = {
	attach: function(type, func) {
		// If an object literal is passed, attach all callbacks defined in it
		if (typeof type !== 'string') {
			return Base.each(type, function(value, key) {
				this.attach(key, value);
			}, this);
		}
		var entry = this._eventTypes[type];
		if (!entry)
			return this;
		var handlers = this._handlers = this._handlers || {};
		handlers = handlers[type] = handlers[type] || [];
		if (handlers.indexOf(func) == -1) { // Not added yet, add it now
			handlers.push(func);
			// See if this is the first handler that we're attaching, and 
			// call install if defined.
			if (entry.install && handlers.length == 1)
				entry.install.call(this, type);
		}
		return this;
	},

	detach: function(type, func) {
		// If an object literal is passed, detach all callbacks defined in it
		if (typeof type !== 'string') {
			return Base.each(type, function(value, key) {
				this.detach(key, value);
			}, this);
		}
		var entry = this._eventTypes[type],
			handlers = this._handlers && this._handlers[type],
			index;
		if (entry && handlers) {
			// See if this is the last handler that we're detaching (or if we
			// are detaching all handlers), and call uninstall if defined.
			if (!func || (index = handlers.indexOf(func)) != -1
					&& handlers.length == 1) {
				if (entry.uninstall)
					entry.uninstall.call(this, type);
				delete this._handlers[type];
			} else if (index != -1) {
				// Just remove this one handler
				handlers.splice(index, 1);
			}
		}
		return this;
	},

	fire: function(type, event) {
		// Returns true if fired, false otherwise
		var handlers = this._handlers && this._handlers[type];
		if (!handlers)
			return false;
		Base.each(handlers, function(func) {
			// When the handler function returns false, prevent the default
			// behaviour of the event by calling stop() on it
			// PORT: Add to Sg
			if (func.call(this, event) === false && event && event.stop)
				event.stop();
		}, this);
		return true;
	},

	responds: function(type) {
		return !!(this._handlers && this._handlers[type]);
	},

	statics: {
		inject: function(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++) {
				var src = arguments[i],
					events = src._events;
				if (events) {
					// events can either be an object literal or an array of
					// strings describing the on*-names.
					// We need to map lowercased event types to the event
					// entries represented by these on*-names in _events.
					var types = {};
					Base.each(events, function(entry, key) {
						var isString = typeof entry === 'string',
							name = isString ? entry : key,
							part = Base.capitalize(name),
							type = name.substring(2).toLowerCase();
						// Map the event type name to the event entry.
						types[type] = isString ? {} : entry;
						// Create getters and setters for the property
						// with the on*-name name:
						name = '_' + name;
						src['get' + part] = function() {
							return this[name];
						};
						src['set' + part] = function(func) {
							if (func) {
								this.attach(type, func);
							} else if (this[name]) {
								this.detach(type, this[name]);
							}
							this[name] = func;
						};
					});
					src._eventTypes = types;
				}
				this.base(src);
			}
			return this;
		}
	}
};


// Include Paper classes, which are later injected into PaperScope by setting
// them on the 'this' object, e.g.:
// var Point = this.Point = Base.extend(...);

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Point
 *
 * @class The Point object represents a point in the two dimensional space
 * of the Paper.js project. It is also used to represent two dimensional
 * vector objects.
 *
 * @classexample
 * // Create a point at x: 10, y: 5
 * var point = new Point(10, 5);
 * console.log(point.x); // 10
 * console.log(point.y); // 5
 */
var Point = this.Point = Base.extend(/** @lends Point# */{
	/**
	 * Creates a Point object with the given x and y coordinates.
	 *
	 * @name Point#initialize
	 * @param {Number} x the x coordinate
	 * @param {Number} y the y coordinate
	 *
	 * @example
	 * // Create a point at x: 10, y: 5
	 * var point = new Point(10, 5);
	 * console.log(point.x); // 10
	 * console.log(point.y); // 5
	 */
	/**
	 * Creates a Point object using the numbers in the given array as
	 * coordinates.
	 *
	 * @name Point#initialize
	 * @param {array} array
	 *
	 * @example
	 * // Creating a point at x: 10, y: 5 using an array of numbers:
	 * var array = [10, 5];
	 * var point = new Point(array);
	 * console.log(point.x); // 10
	 * console.log(point.y); // 5
	 *
	 * @example
	 * // Passing an array to a functionality that expects a point:
	 *
	 * // Create a circle shaped path at x: 50, y: 50
	 * // with a radius of 30:
	 * var path = new Path.Circle([50, 50], 30);
	 * path.fillColor = 'red';
	 *
	 * // Which is the same as doing:
	 * var path = new Path.Circle(new Point(50, 50), 30);
	 * path.fillColor = 'red';
	 */
	/**
	 * Creates a Point object using the properties in the given object.
	 *
	 * @name Point#initialize
	 * @param {object} object
	 *
	 * @example
	 * // Creating a point using an object literal with length and angle
	 * // properties:
	 *
	 * var point = new Point({
	 * 	length: 10,
	 * 	angle: 90
	 * });
	 * console.log(point.length); // 10
	 * console.log(point.angle); // 90
	 *
	 * @example
	 * // Creating a point at x: 10, y: 20 using an object literal:
	 *
	 * var point = new Point({
	 * 	x: 10,
	 * 	y: 20
	 * });
	 * console.log(point.x); // 10
	 * console.log(point.y); // 20
	 *
	 * @example
	 * // Passing an object to a functionality that expects a point:
	 *
	 * var center = {
	 * 	x: 50,
	 * 	y: 50
	 * };
	 *
	 * // Creates a circle shaped path at x: 50, y: 50
	 * // with a radius of 30:
	 * var path = new Path.Circle(center, 30);
	 * path.fillColor = 'red';
	 */
	/**
	 * Creates a Point object using the width and height values of the given
	 * Size object.
	 *
	 * @name Point#initialize
	 * @param {Size} size
	 *
	 * @example
	 * // Creating a point using a size object.
	 *
	 * // Create a Size with a width of 100pt and a height of 50pt
	 * var size = new Size(100, 50);
	 * console.log(size); // { width: 100, height: 50 }
	 * var point = new Point(size);
	 * console.log(point); // { x: 100, y: 50 }
	 */
	/**
	 * Creates a Point object using the coordinates of the given Point object.
	 *
	 * @param {Point} point
	 * @name Point#initialize
	 */
	initialize: function(arg0, arg1) {
		if (arg1 !== undefined) {
			this.x = arg0;
			this.y = arg1;
		} else if (arg0 !== undefined) {
			if (arg0 == null) {
				this.x = this.y = 0;
			} else if (arg0.x !== undefined) {
				this.x = arg0.x;
				this.y = arg0.y;
			} else if (arg0.width !== undefined) {
				this.x = arg0.width;
				this.y = arg0.height;
			} else if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.angle !== undefined) {
				this.x = arg0.length;
				this.y = 0;
				this.setAngle(arg0.angle);
			} else if (typeof arg0 === 'number') {
				this.x = this.y = arg0;
			} else {
				this.x = this.y = 0;
			}
		} else {
			this.x = this.y = 0;
		}
	},

	/**
	 * The x coordinate of the point
	 *
	 * @name Point#x
	 * @type Number
	 */

	/**
	 * The y coordinate of the point
	 *
	 * @name Point#y
	 * @type Number
	 */

	set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},

	/**
	 * Returns a copy of the point.
	 *
	 * @example
	 * var point1 = new Point();
	 * var point2 = point1;
	 * point2.x = 1; // also changes point1.x
	 *
	 * var point2 = point1.clone();
	 * point2.x = 1; // doesn't change point1.x
	 *
	 * @returns {Point} the cloned point
	 */
	clone: function() {
		return Point.create(this.x, this.y);
	},

	/**
	 * @return {String} A string representation of the point.
	 */
	toString: function() {
		var format = Base.formatNumber;
		return '{ x: ' + format(this.x) + ', y: ' + format(this.y) + ' }';
	},

	/**
	 * Returns the addition of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#add
	 * @function
	 * @param {Number} number the number to add
	 * @return {Point} the addition of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(5, 10);
	 * var result = point + 20;
	 * console.log(result); // {x: 25, y: 30}
	 */
	/**
	 * Returns the addition of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#add
	 * @function
	 * @param {Point} point the point to add
	 * @return {Point} the addition of the two points as a new point
	 *
	 * @example
	 * var point1 = new Point(5, 10);
	 * var point2 = new Point(10, 20);
	 * var result = point1 + point2;
	 * console.log(result); // {x: 15, y: 30}
	 */
	add: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x + point.x, this.y + point.y);
	},

	/**
	 * Returns the subtraction of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#subtract
	 * @function
	 * @param {Number} number the number to subtract
	 * @return {Point} the subtraction of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point - 5;
	 * console.log(result); // {x: 5, y: 15}
	 */
	/**
	 * Returns the subtraction of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#subtract
	 * @function
	 * @param {Point} point the point to subtract
	 * @return {Point} the subtraction of the two points as a new point
	 *
	 * @example
	 * var firstPoint = new Point(10, 20);
	 * var secondPoint = new Point(5, 5);
	 * var result = firstPoint - secondPoint;
	 * console.log(result); // {x: 5, y: 15}
	 */
	subtract: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x - point.x, this.y - point.y);
	},

	/**
	 * Returns the multiplication of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#multiply
	 * @function
	 * @param {Number} number the number to multiply by
	 * @return {Point} the multiplication of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point * 2;
	 * console.log(result); // {x: 20, y: 40}
	 */
	/**
	 * Returns the multiplication of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#multiply
	 * @function
	 * @param {Point} point the point to multiply by
	 * @return {Point} the multiplication of the two points as a new point
	 *
	 * @example
	 * var firstPoint = new Point(5, 10);
	 * var secondPoint = new Point(4, 2);
	 * var result = firstPoint * secondPoint;
	 * console.log(result); // {x: 20, y: 20}
	 */
	multiply: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x * point.x, this.y * point.y);
	},

	/**
	 * Returns the division of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#divide
	 * @function
	 * @param {Number} number the number to divide by
	 * @return {Point} the division of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point / 2;
	 * console.log(result); // {x: 5, y: 10}
	 */
	/**
	 * Returns the division of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#divide
	 * @function
	 * @param {Point} point the point to divide by
	 * @return {Point} the division of the two points as a new point
	 *
	 * @example
	 * var firstPoint = new Point(8, 10);
	 * var secondPoint = new Point(2, 5);
	 * var result = firstPoint / secondPoint;
	 * console.log(result); // {x: 4, y: 2}
	 */
	divide: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x / point.x, this.y / point.y);
	},

	/**
	 * The modulo operator returns the integer remainders of dividing the point
	 * by the supplied value as a new point.
	 *
	 * @name Point#modulo
	 * @function
	 * @param {Number} value
	 * @return {Point} the integer remainders of dividing the point by the value
	 *                 as a new point
	 *
	 * @example
	 * var point = new Point(12, 6);
	 * console.log(point % 5); // {x: 2, y: 1}
	 */
	/**
	 * The modulo operator returns the integer remainders of dividing the point
	 * by the supplied value as a new point.
	 *
	 * @name Point#modulo
	 * @function
	 * @param {Point} point
	 * @return {Point} the integer remainders of dividing the points by each
	 *                 other as a new point
	 *
	 * @example
	 * var point = new Point(12, 6);
	 * console.log(point % new Point(5, 2)); // {x: 2, y: 0}
	 */
	modulo: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x % point.x, this.y % point.y);
	},

	negate: function() {
		return Point.create(-this.x, -this.y);
	},

	/**
	 * Transforms the point by the matrix as a new point. The object itself
	 * is not modified!
	 *
	 * @param {Matrix} matrix
	 * @return {Point} The transformed point
	 */
	transform: function(matrix) {
		return matrix ? matrix._transformPoint(this) : this;
	},

	/**
	 * {@grouptitle Distance & Length}
	 *
	 * Returns the distance between the point and another point.
	 *
	 * @param {Point} point
	 * @param {Boolean} squared Controls whether the distance should remain
	 *        squared, or its square root should be calculated.
	 * @return {Number}
	 */
	getDistance: function(point, squared) {
		point = Point.read(arguments);
		var x = point.x - this.x,
			y = point.y - this.y,
			d = x * x + y * y;
		return squared ? d : Math.sqrt(d);
	},

	/**
	 * The length of the vector that is represented by this point's coordinates.
	 * Each point can be interpreted as a vector that points from the origin
	 * ({@code x = 0}, {@code y = 0}) to the point's location.
	 * Setting the length changes the location but keeps the vector's angle.
	 *
	 * @type Number
	 * @bean
	 */
	getLength: function() {
		// Supports a hidden parameter 'squared', which controls whether the
		// squared length should be returned. Hide it so it produces a bean
		// property called #length.
		var l = this.x * this.x + this.y * this.y;
		return arguments[0] ? l : Math.sqrt(l);
	},

	setLength: function(length) {
		// Whenever setting x/y, use #set() instead of direct assignment,
		// so LinkedPoint does not report changes twice.
		if (this.isZero()) {
			var angle = this._angle || 0;
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		} else {
			var scale = length / this.getLength();
			// Force calculation of angle now, so it will be preserved even when
			// x and y are 0
			if (scale == 0)
				this.getAngle();
			this.set(
				this.x * scale,
				this.y * scale
			);
		}
		return this;
	},

	/**
	 * Normalize modifies the {@link #length} of the vector to {@code 1} without
	 * changing its angle and returns it as a new point. The optional
	 * {@code length} parameter defines the length to normalize to.
	 * The object itself is not modified!
	 *
	 * @param {Number} [length=1] The length of the normalized vector
	 * @return {Point} The normalized vector of the vector that is represented
	 *                 by this point's coordinates.
	 */
	normalize: function(length) {
		if (length === undefined)
			length = 1;
		var current = this.getLength(),
			scale = current != 0 ? length / current : 0,
			point = Point.create(this.x * scale, this.y * scale);
		// Preserve angle.
		point._angle = this._angle;
		return point;
	},

	/**
	 * {@grouptitle Angle & Rotation}
	 * Returns the smaller angle between two vectors. The angle is unsigned, no
	 * information about rotational direction is given.
	 *
	 * @name Point#getAngle
	 * @function
	 * @param {Point} point
	 * @return {Number} the angle in degrees
	 */
	/**
	 * The vector's angle in degrees, measured from the x-axis to the vector.
	 *
	 * The angle is unsigned, no information about rotational direction is
	 * given.
	 *
	 * @name Point#getAngle
	 * @bean
	 * @type Number
	 */
	getAngle: function(/* point */) {
		// Hide parameters from Bootstrap so it injects bean too
		return this.getAngleInRadians(arguments[0]) * 180 / Math.PI;
	},

	setAngle: function(angle) {
		angle = this._angle = angle * Math.PI / 180;
		if (!this.isZero()) {
			var length = this.getLength();
			// Use #set() instead of direct assignment of x/y, so LinkedPoint
			// does not report changes twice.
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		}
		return this;
	},

	/**
	 * Returns the smaller angle between two vectors in radians. The angle is
	 * unsigned, no information about rotational direction is given.
	 *
	 * @name Point#getAngleInRadians
	 * @function
	 * @param {Point} point
	 * @return {Number} the angle in radians
	 */
	/**
	 * The vector's angle in radians, measured from the x-axis to the vector.
	 *
	 * The angle is unsigned, no information about rotational direction is
	 * given.
	 *
	 * @name Point#getAngleInRadians
	 * @bean
	 * @type Number
	 */
	getAngleInRadians: function(/* point */) {
		// Hide parameters from Bootstrap so it injects bean too
		if (arguments[0] === undefined) {
			if (this._angle == null)
				this._angle = Math.atan2(this.y, this.x);
			return this._angle;
		} else {
			var point = Point.read(arguments),
				div = this.getLength() * point.getLength();
			if (div == 0) {
				return NaN;
			} else {
				return Math.acos(this.dot(point) / div);
			}
		}
	},

	getAngleInDegrees: function(/* point */) {
		return this.getAngle(arguments[0]);
	},

	/**
	 * The quadrant of the {@link #angle} of the point.
	 *
	 * Angles between 0 and 90 degrees are in quadrant {@code 1}. Angles between
	 * 90 and 180 degrees are in quadrant {@code 2}, angles between 180 and 270
	 * degrees are in quadrant {@code 3} and angles between 270 and 360 degrees
	 * are in quadrant {@code 4}.
	 *
	 * @type Number
	 * @bean
	 *
	 * @example
	 * var point = new Point({
	 * 	angle: 10,
	 * 	length: 20
	 * });
	 * console.log(point.quadrant); // 1
	 *
	 * point.angle = 100;
	 * console.log(point.quadrant); // 2
	 *
	 * point.angle = 190;
	 * console.log(point.quadrant); // 3
	 *
	 * point.angle = 280;
	 * console.log(point.quadrant); // 4
	 */
	getQuadrant: function() {
		return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
	},

	/**
	 * Returns the angle between two vectors. The angle is directional and
	 * signed, giving information about the rotational direction.
	 *
	 * Read more about angle units and orientation in the description of the
	 * {@link #angle} property.
	 *
	 * @param {Point} point
	 * @return {Number} the angle between the two vectors
	 */
	getDirectedAngle: function(point) {
		point = Point.read(arguments);
		return Math.atan2(this.cross(point), this.dot(point)) * 180 / Math.PI;
	},

	/**
	 * Rotates the point by the given angle around an optional center point.
	 * The object itself is not modified.
	 *
	 * Read more about angle units and orientation in the description of the
	 * {@link #angle} property.
	 *
	 * @param {Number} angle the rotation angle
	 * @param {Point} center the center point of the rotation
	 * @returns {Point} the rotated point
	 */
	rotate: function(angle, center) {
		angle = angle * Math.PI / 180;
		var point = center ? this.subtract(center) : this,
			s = Math.sin(angle),
			c = Math.cos(angle);
		point = Point.create(
			point.x * c - point.y * s,
			point.y * c + point.x * s
		);
		return center ? point.add(center) : point;
	},

	/**
	 * Checks whether the coordinates of the point are equal to that of the
	 * supplied point.
	 *
	 * @param {Point} point
	 * @return {Boolean} {@true if the points are equal}
	 *
	 * @example
	 * var point = new Point(5, 10);
	 * console.log(point == new Point(5, 10)); // true
	 * console.log(point == new Point(1, 1)); // false
	 * console.log(point != new Point(1, 1)); // true
	 */
	equals: function(point) {
		point = Point.read(arguments);
		return this.x == point.x && this.y == point.y;
	},

	/**
	 * {@grouptitle Tests}
	 *
	 * Checks whether the point is inside the boundaries of the rectangle.
	 *
	 * @param {Rectangle} rect the rectangle to check against
	 * @returns {Boolean} {@true if the point is inside the rectangle}
	 */
	isInside: function(rect) {
		return rect.contains(this);
	},

	/**
	 * Checks if the point is within a given distance of another point.
	 *
	 * @param {Point} point the point to check against
	 * @param {Number} tolerance the maximum distance allowed
	 * @returns {Boolean} {@true if it is within the given distance}
	 */
	isClose: function(point, tolerance) {
		return this.getDistance(point) < tolerance;
	},

	/**
	 * Checks if the vector represented by this point is colinear (parallel) to
	 * another vector.
	 *
	 * @param {Point} point the vector to check against
	 * @returns {Boolean} {@true it is parallel}
	 */
	isColinear: function(point) {
		return this.cross(point) < Numerical.TOLERANCE;
	},

	/**
	 * Checks if the vector represented by this point is orthogonal
	 * (perpendicular) to another vector.
	 *
	 * @param {Point} point the vector to check against
	 * @returns {Boolean} {@true it is orthogonal}
	 */
	isOrthogonal: function(point) {
		return this.dot(point) < Numerical.TOLERANCE;
	},

	/**
	 * Checks if this point has both the x and y coordinate set to 0.
	 *
	 * @returns {Boolean} {@true both x and y are 0}
	 */
	isZero: function() {
		return this.x == 0 && this.y == 0;
	},

	/**
	 * Checks if this point has an undefined value for at least one of its
	 * coordinates.
	 *
	 * @returns {Boolean} {@true if either x or y are not a number}
	 */
	isNaN: function() {
		return isNaN(this.x) || isNaN(this.y);
	},

	/**
	 * {@grouptitle Vector Math Functions}
	 * Returns the dot product of the point and another point.
	 *
	 * @param {Point} point
	 * @returns {Number} the dot product of the two points
	 */
	dot: function(point) {
		point = Point.read(arguments);
		return this.x * point.x + this.y * point.y;
	},

	/**
	 * Returns the cross product of the point and another point.
	 *
	 * @param {Point} point
	 * @returns {Number} the cross product of the two points
	 */
	cross: function(point) {
		point = Point.read(arguments);
		return this.x * point.y - this.y * point.x;
	},

	/**
	 * Returns the projection of the point on another point.
	 * Both points are interpreted as vectors.
	 *
	 * @param {Point} point
	 * @returns {Point} the projection of the point on another point
	 */
	project: function(point) {
		point = Point.read(arguments);
		if (point.isZero()) {
			return Point.create(0, 0);
		} else {
			var scale = this.dot(point) / point.dot(point);
			return Point.create(
				point.x * scale,
				point.y * scale
			);
		}
	},

	/**
	 * This property is only present if the point is an anchor or control point
	 * of a {@link Segment} or a {@link Curve}. In this case, it returns
	 * {@true it is selected}
	 *
	 * @name Point#selected
	 * @property
	 * @return {Boolean} {@true the point is selected}
	 */

	statics: /** @lends Point */{
		/**
		 * Provide a faster creator for Points out of two coordinates that
		 * does not rely on Point#initialize at all. This speeds up all math
		 * operations a lot.
		 *
		 * @ignore
		 */
		create: function(x, y) {
			// Don't use the shorter form as we want absolute maximum
			// performance here:
			// return new Point(Point.dont).set(x, y);
			var point = new Point(Point.dont);
			point.x = x;
			point.y = y;
			return point;
		},

		/**
		 * Returns a new point object with the smallest {@link #x} and
		 * {@link #y} of the supplied points.
		 *
		 * @static
		 * @param {Point} point1
		 * @param {Point} point2
		 * @returns {Point} The newly created point object
		 *
		 * @example
		 * var point1 = new Point(10, 100);
		 * var point2 = new Point(200, 5);
		 * var minPoint = Point.min(point1, point2);
		 * console.log(minPoint); // {x: 10, y: 5}
		 */
		min: function(point1, point2) {
			point1 = Point.read(arguments, 0, 1);
			point2 = Point.read(arguments, 1, 1);
			return Point.create(
				Math.min(point1.x, point2.x),
				Math.min(point1.y, point2.y)
			);
		},

		/**
		 * Returns a new point object with the largest {@link #x} and
		 * {@link #y} of the supplied points.
		 *
		 * @static
		 * @param {Point} point1
		 * @param {Point} point2
		 * @returns {Point} The newly created point object
		 *
		 * @example
		 * var point1 = new Point(10, 100);
		 * var point2 = new Point(200, 5);
		 * var maxPoint = Point.max(point1, point2);
		 * console.log(maxPoint); // {x: 200, y: 100}
		 */
		max: function(point1, point2) {
			point1 = Point.read(arguments, 0, 1);
			point2 = Point.read(arguments, 1, 1);
			return Point.create(
				Math.max(point1.x, point2.x),
				Math.max(point1.y, point2.y)
			);
		},

		/**
		 * Returns a point object with random {@link #x} and {@link #y} values
		 * between {@code 0} and {@code 1}.
		 *
		 * @returns {Point} The newly created point object
		 * @static
		 *
		 * @example
		 * var maxPoint = new Point(100, 100);
		 * var randomPoint = Point.random();
		 *
		 * // A point between {x:0, y:0} and {x:100, y:100}:
		 * var point = maxPoint * randomPoint;
		 */
		random: function() {
			return Point.create(Math.random(), Math.random());
		}
	}
}, new function() { // Scope for injecting round, ceil, floor, abs:
	/**
	 * {@grouptitle Math Functions}
	 *
	 * Returns a new point with rounded {@link #x} and {@link #y} values. The
	 * object itself is not modified!
	 *
	 * @name Point#round
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var roundPoint = point.round();
	 * console.log(roundPoint); // {x: 10, y: 11}
	 */

	/**
	 * Returns a new point with the nearest greater non-fractional values to the
	 * specified {@link #x} and {@link #y} values. The object itself is not
	 * modified!
	 *
	 * @name Point#ceil
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var ceilPoint = point.ceil();
	 * console.log(ceilPoint); // {x: 11, y: 11}
	 */

	/**
	 * Returns a new point with the nearest smaller non-fractional values to the
	 * specified {@link #x} and {@link #y} values. The object itself is not
	 * modified!
	 *
	 * @name Point#floor
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var floorPoint = point.floor();
	 * console.log(floorPoint); // {x: 10, y: 10}
	 */

	/**
	 * Returns a new point with the absolute values of the specified {@link #x}
	 * and {@link #y} values. The object itself is not modified!
	 *
	 * @name Point#abs
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(-5, 10);
	 * var absPoint = point.abs();
	 * console.log(absPoint); // {x: 5, y: 10}
	 */

	return Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
		var op = Math[name];
		this[name] = function() {
			return Point.create(op(this.x), op(this.y));
		};
	}, {});
});

/**
 * @name LinkedPoint
 *
 * @class An internal version of Point that notifies its owner of each change
 * through setting itself again on the setter that corresponds to the getter
 * that produced this LinkedPoint. See uses of LinkedPoint.create()
 * Note: This prototype is not exported.
 *
 * @ignore
 */
var LinkedPoint = Point.extend({
	set: function(x, y, dontNotify) {
		this._x = x;
		this._y = y;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner[this._setter](this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner[this._setter](this);
	},

	statics: {
		create: function(owner, setter, x, y, dontLink) {
			// Support creation of normal Points rather than LinkedPoints
			// through an optional parameter that can be passed to the getters.
			// See e.g. Rectangle#getPoint(true).
			if (dontLink)
				return Point.create(x, y);
			var point = new LinkedPoint(LinkedPoint.dont);
			point._x = x;
			point._y = y;
			point._owner = owner;
			point._setter = setter;
			return point;
		}
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Size
 *
 * @class The Size object is used to describe the size of something, through
 * its {@link #width} and {@link #height} properties.
 *
 * @classexample
 * // Create a size that is 10pt wide and 5pt high
 * var size = new Size(10, 5);
 * console.log(size.width); // 10
 * console.log(size.height); // 5
 */
var Size = this.Size = Base.extend(/** @lends Size# */{
	// DOCS: improve Size class description
	/**
	 * Creates a Size object with the given width and height values.
	 *
	 * @name Size#initialize
	 * @param {Number} width the width
	 * @param {Number} height the height
	 *
	 * @example
	 * // Create a size that is 10pt wide and 5pt high
	 * var size = new Size(10, 5);
	 * console.log(size.width); // 10
	 * console.log(size.height); // 5
	 *
	/**
	 * Creates a Size object using the numbers in the given array as
	 * dimensions.
	 *
	 * @name Size#initialize
	 * @param {array} array
	 *
	 * @example
	 * // Creating a size of width: 320, height: 240 using an array of numbers:
	 * var array = [320, 240];
	 * var size = new Size(array);
	 * console.log(size.width); // 320
	 * console.log(size.height); // 240
	 */
	/**
	 * Creates a Size object using the properties in the given object.
	 *
	 * @name Size#initialize
	 * @param {object} object
	 *
	 * @example
	 * // Creating a size of width: 10, height: 20 using an object literal:
	 *
	 * var size = new Size({
	 * 	width: 10,
	 * 	height: 20
	 * });
	 * console.log(size.width); // 10
	 * console.log(size.height); // 20
	 */
	/**
	 * Creates a Size object using the coordinates of the given Size object.
	 *
	 * @name Size#initialize
	 * @param {Size} size
	 */
	/**
	 * Creates a Size object using the {@link Point#x} and {@link Point#y}
	 * values of the given Point object.
	 *
	 * @name Size#initialize
	 * @param {Point} point
	 *
	 * @example
	 * var point = new Point(50, 50);
	 * var size = new Size(point);
	 * console.log(size.width); // 50
	 * console.log(size.height); // 50
	 */
	initialize: function(arg0, arg1) {
		if (arg1 !== undefined) {
			this.width = arg0;
			this.height = arg1;
		} else if (arg0 !== undefined) {
			if (arg0 == null) {
				this.width = this.height = 0;
			} else if (arg0.width !== undefined) {
				this.width = arg0.width;
				this.height = arg0.height;
			} else if (arg0.x !== undefined) {
				this.width = arg0.x;
				this.height = arg0.y;
			} else if (Array.isArray(arg0)) {
				this.width = arg0[0];
				this.height = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (typeof arg0 === 'number') {
				this.width = this.height = arg0;
			} else {
				this.width = this.height = 0;
			}
		} else {
			this.width = this.height = 0;
		}
	},

	/**
	 * @return {String} A string representation of the size.
	 */
	toString: function() {
		var format = Base.formatNumber;
		return '{ width: ' + format(this.width)
				+ ', height: ' + format(this.height) + ' }';
	},

	/**
	 * The width of the size
	 *
	 * @name Size#width
	 * @type Number
	 */

	/**
	 * The height of the size
	 *
	 * @name Size#height
	 * @type Number
	 */

	set: function(width, height) {
		this.width = width;
		this.height = height;
		return this;
	},

	/**
	 * Returns a copy of the size.
	 */
	clone: function() {
		return Size.create(this.width, this.height);
	},

	/**
	 * Returns the addition of the supplied value to the width and height of the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#add
	 * @function
	 * @param {Number} number the number to add
	 * @return {Size} the addition of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(5, 10);
	 * var result = size + 20;
	 * console.log(result); // {width: 25, height: 30}
	 */
	/**
	 * Returns the addition of the width and height of the supplied size to the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#add
	 * @function
	 * @param {Size} size the size to add
	 * @return {Size} the addition of the two sizes as a new size
	 *
	 * @example
	 * var size1 = new Size(5, 10);
	 * var size2 = new Size(10, 20);
	 * var result = size1 + size2;
	 * console.log(result); // {width: 15, height: 30}
	 */
	add: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width + size.width, this.height + size.height);
	},

	/**
	 * Returns the subtraction of the supplied value from the width and height
	 * of the size as a new size. The object itself is not modified!
	 * The object itself is not modified!
	 *
	 * @name Size#subtract
	 * @function
	 * @param {Number} number the number to subtract
	 * @return {Size} the subtraction of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size - 5;
	 * console.log(result); // {width: 5, height: 15}
	 */
	/**
	 * Returns the subtraction of the width and height of the supplied size from
	 * the size as a new size. The object itself is not modified!
	 *
	 * @name Size#subtract
	 * @function
	 * @param {Size} size the size to subtract
	 * @return {Size} the subtraction of the two sizes as a new size
	 *
	 * @example
	 * var firstSize = new Size(10, 20);
	 * var secondSize = new Size(5, 5);
	 * var result = firstSize - secondSize;
	 * console.log(result); // {width: 5, height: 15}
	 */
	subtract: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width - size.width, this.height - size.height);
	},

	/**
	 * Returns the multiplication of the supplied value with the width and
	 * height of the size as a new size. The object itself is not modified!
	 *
	 * @name Size#multiply
	 * @function
	 * @param {Number} number the number to multiply by
	 * @return {Size} the multiplication of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size * 2;
	 * console.log(result); // {width: 20, height: 40}
	 */
	/**
	 * Returns the multiplication of the width and height of the supplied size
	 * with the size as a new size. The object itself is not modified!
	 *
	 * @name Size#multiply
	 * @function
	 * @param {Size} size the size to multiply by
	 * @return {Size} the multiplication of the two sizes as a new size
	 *
	 * @example
	 * var firstSize = new Size(5, 10);
	 * var secondSize = new Size(4, 2);
	 * var result = firstSize * secondSize;
	 * console.log(result); // {width: 20, height: 20}
	 */
	multiply: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width * size.width, this.height * size.height);
	},

	/**
	 * Returns the division of the supplied value by the width and height of the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#divide
	 * @function
	 * @param {Number} number the number to divide by
	 * @return {Size} the division of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size / 2;
	 * console.log(result); // {width: 5, height: 10}
	 */
	/**
	 * Returns the division of the width and height of the supplied size by the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#divide
	 * @function
	 * @param {Size} size the size to divide by
	 * @return {Size} the division of the two sizes as a new size
	 *
	 * @example
	 * var firstSize = new Size(8, 10);
	 * var secondSize = new Size(2, 5);
	 * var result = firstSize / secondSize;
	 * console.log(result); // {width: 4, height: 2}
	 */
	divide: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width / size.width, this.height / size.height);
	},

	/**
	 * The modulo operator returns the integer remainders of dividing the size
	 * by the supplied value as a new size.
	 *
	 * @name Size#modulo
	 * @function
	 * @param {Number} value
	 * @return {Size} the integer remainders of dividing the size by the value
	 *                 as a new size
	 *
	 * @example
	 * var size = new Size(12, 6);
	 * console.log(size % 5); // {width: 2, height: 1}
	 */
	/**
	 * The modulo operator returns the integer remainders of dividing the size
	 * by the supplied size as a new size.
	 *
	 * @name Size#modulo
	 * @function
	 * @param {Size} size
	 * @return {Size} the integer remainders of dividing the sizes by each
	 *                 other as a new size
	 *
	 * @example
	 * var size = new Size(12, 6);
	 * console.log(size % new Size(5, 2)); // {width: 2, height: 0}
	 */
	modulo: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width % size.width, this.height % size.height);
	},

	negate: function() {
		return Size.create(-this.width, -this.height);
	},

	/**
	 * Checks whether the width and height of the size are equal to those of the
	 * supplied size.
	 *
	 * @param {Size}
	 * @return {Boolean}
	 *
	 * @example
	 * var size = new Size(5, 10);
	 * console.log(size == new Size(5, 10)); // true
	 * console.log(size == new Size(1, 1)); // false
	 * console.log(size != new Size(1, 1)); // true
	 */
	equals: function(size) {
		size = Size.read(arguments);
		return this.width == size.width && this.height == size.height;
	},

	/**
	 * {@grouptitle Tests}
	 * Checks if this size has both the width and height set to 0.
	 *
	 * @return {Boolean} {@true both width and height are 0}
	 */
	isZero: function() {
		return this.width == 0 && this.height == 0;
	},

	/**
	 * Checks if the width or the height of the size are NaN.
	 *
	 * @return {Boolean} {@true if the width or height of the size are NaN}
	 */
	isNaN: function() {
		return isNaN(this.width) || isNaN(this.height);
	},

	statics: /** @lends Size */{
		// See Point.create()
		create: function(width, height) {
			return new Size(Size.dont).set(width, height);
		},

		/**
		 * Returns a new size object with the smallest {@link #width} and
		 * {@link #height} of the supplied sizes.
		 *
		 * @static
		 * @param {Size} size1
		 * @param {Size} size2
		 * @returns {Size} The newly created size object
		 *
		 * @example
		 * var size1 = new Size(10, 100);
		 * var size2 = new Size(200, 5);
		 * var minSize = Size.min(size1, size2);
		 * console.log(minSize); // {width: 10, height: 5}
		 */
		min: function(size1, size2) {
			return Size.create(
				Math.min(size1.width, size2.width),
				Math.min(size1.height, size2.height));
		},

		/**
		 * Returns a new size object with the largest {@link #width} and
		 * {@link #height} of the supplied sizes.
		 *
		 * @static
		 * @param {Size} size1
		 * @param {Size} size2
		 * @returns {Size} The newly created size object
		 *
		 * @example
		 * var size1 = new Size(10, 100);
		 * var size2 = new Size(200, 5);
		 * var maxSize = Size.max(size1, size2);
		 * console.log(maxSize); // {width: 200, height: 100}
		 */
		max: function(size1, size2) {
			return Size.create(
				Math.max(size1.width, size2.width),
				Math.max(size1.height, size2.height));
		},

		/**
		 * Returns a size object with random {@link #width} and {@link #height}
		 * values between {@code 0} and {@code 1}.
		 *
		 * @returns {Size} The newly created size object
		 * @static
		 *
		 * @example
		 * var maxSize = new Size(100, 100);
		 * var randomSize = Size.random();
		 * var size = maxSize * randomSize;
		 */
		random: function() {
			return Size.create(Math.random(), Math.random());
		}
	}
}, new function() { // Scope for injecting round, ceil, floor, abs:

	/**
	 * {@grouptitle Math Functions}
	 *
	 * Returns a new size with rounded {@link #width} and {@link #height} values.
	 * The object itself is not modified!
	 *
	 * @name Size#round
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var roundSize = size.round();
	 * console.log(roundSize); // {x: 10, y: 11}
	 */

	/**
	 * Returns a new size with the nearest greater non-fractional values to the
	 * specified {@link #width} and {@link #height} values. The object itself is not
	 * modified!
	 *
	 * @name Size#ceil
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var ceilSize = size.ceil();
	 * console.log(ceilSize); // {x: 11, y: 11}
	 */

	/**
	 * Returns a new size with the nearest smaller non-fractional values to the
	 * specified {@link #width} and {@link #height} values. The object itself is not
	 * modified!
	 *
	 * @name Size#floor
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var floorSize = size.floor();
	 * console.log(floorSize); // {x: 10, y: 10}
	 */

	/**
	 * Returns a new size with the absolute values of the specified {@link #width}
	 * and {@link #height} values. The object itself is not modified!
	 *
	 * @name Size#abs
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(-5, 10);
	 * var absSize = size.abs();
	 * console.log(absSize); // {x: 5, y: 10}
	 */

	return Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
		var op = Math[name];
		this[name] = function() {
			return Size.create(op(this.width), op(this.height));
		};
	}, {});
});

/**
 * @name LinkedSize
 *
 * @class An internal version of Size that notifies its owner of each change
 * through setting itself again on the setter that corresponds to the getter
 * that produced this LinkedSize. See uses of LinkedSize.create()
 * Note: This prototype is not exported.
 *
 * @private
 */
var LinkedSize = Size.extend({
	set: function(width, height, dontNotify) {
		this._width = width;
		this._height = height;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getWidth: function() {
		return this._width;
	},

	setWidth: function(width) {
		this._width = width;
		this._owner[this._setter](this);
	},

	getHeight: function() {
		return this._height;
	},

	setHeight: function(height) {
		this._height = height;
		this._owner[this._setter](this);
	},

	statics: {
		create: function(owner, setter, width, height, dontLink) {
			// See LinkedPoint.create() for an explanation about dontLink.
			if (dontLink)
				return Size.create(width, height);
			var size = new LinkedSize(LinkedSize.dont);
			size._width = width;
			size._height = height;
			size._owner = owner;
			size._setter = setter;
			return size;
		}
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Rectangle
 *
 * @class A Rectangle specifies an area that is enclosed by it's top-left
 * point (x, y), its width, and its height. It should not be confused with a
 * rectangular path, it is not an item.
 */
var Rectangle = this.Rectangle = Base.extend(/** @lends Rectangle# */{
	/**
	 * Creates a Rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Point} point the top-left point of the rectangle
	 * @param {Size} size the size of the rectangle
	 */
	/**
	 * Creates a rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Number} x the left coordinate
	 * @param {Number} y the top coordinate
	 * @param {Number} width
	 * @param {Number} height
	 */
	/**
	 * Creates a rectangle object from the passed points. These do not
	 * necessarily need to be the top left and bottom right corners, the
	 * constructor figures out how to fit a rectangle between them.
	 *
	 * @name Rectangle#initialize
	 * @param {Point} point1 The first point defining the rectangle
	 * @param {Point} point2 The second point defining the rectangle
	 */
	/**
	 * Creates a new rectangle object from the passed rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Rectangle} rt
	 */
	initialize: function(arg0, arg1, arg2, arg3) {
		if (arguments.length == 4) {
			// new Rectangle(x, y, width, height)
			this.x = arg0;
			this.y = arg1;
			this.width = arg2;
			this.height = arg3;
		} else if (arguments.length == 2) {
			if (arg1 && arg1.x !== undefined) {
				// new Rectangle(point1, point2)
				var point1 = Point.read(arguments, 0, 1);
				var point2 = Point.read(arguments, 1, 1);
				this.x = point1.x;
				this.y = point1.y;
				this.width = point2.x - point1.x;
				this.height = point2.y - point1.y;
				if (this.width < 0) {
					this.x = point2.x;
					this.width = -this.width;
				}
				if (this.height < 0) {
					this.y = point2.y;
					this.height = -this.height;
				}
			} else {
				// new Rectangle(point, size)
				var point = Point.read(arguments, 0, 1);
				var size = Size.read(arguments, 1, 1);
				this.x = point.x;
				this.y = point.y;
				this.width = size.width;
				this.height = size.height;
			}
		} else if (arg0) {
			// Use 0 as defaults, in case we're reading from a Point or Size
			this.x = arg0.x || 0;
			this.y = arg0.y || 0;
			this.width = arg0.width || 0;
			this.height = arg0.height || 0;
		} else {
			// new Rectangle()
			this.x = this.y = this.width = this.height = 0;
		}
	},

	/**
	 * The x position of the rectangle.
	 *
	 * @name Rectangle#x
	 * @type Number
	 */

	/**
	 * The y position of the rectangle.
	 *
	 * @name Rectangle#y
	 * @type Number
	 */

	/**
	 * The width of the rectangle.
	 *
	 * @name Rectangle#width
	 * @type Number
	 */

	/**
	 * The height of the rectangle.
	 *
	 * @name Rectangle#height
	 * @type Number
	 */

	// DOCS: why does jsdocs document this function, when there are no comments?
	/**
	 * @ignore
	 */
	set: function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		return this;
	},

	/**
	 * The top-left point of the rectangle
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function(/* dontLink */) {
		// Pass on the optional argument dontLink which tells LinkedPoint to
		// produce a normal point instead. Used internally for speed reasons.
		return LinkedPoint.create(this, 'setPoint', this.x, this.y,
				arguments[0]);
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		this.x = point.x;
		this.y = point.y;
		return this;
	},

	/**
	 * The size of the rectangle
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function(/* dontLink */) {
		// See Rectangle#getPoint() about arguments[0]
		return LinkedSize.create(this, 'setSize', this.width, this.height,
				arguments[0]);
	},

	setSize: function(size) {
		size = Size.read(arguments);
		this.width = size.width;
		this.height = size.height;
		return this;
	},

	/**
	 * {@grouptitle Side Positions}
	 *
	 * The position of the left hand side of the rectangle. Note that this
	 * doesn't move the whole rectangle; the right hand side stays where it was.
	 *
	 * @type Number
	 * @bean
	 */
	getLeft: function() {
		return this.x;
	},

	setLeft: function(left) {
		this.width -= left - this.x;
		this.x = left;
		return this;
	},

	/**
	 * The top coordinate of the rectangle. Note that this doesn't move the
	 * whole rectangle: the bottom won't move.
	 *
	 * @type Number
	 * @bean
	 */
	getTop: function() {
		return this.y;
	},

	setTop: function(top) {
		this.height -= top - this.y;
		this.y = top;
		return this;
	},

	/**
	 * The position of the right hand side of the rectangle. Note that this
	 * doesn't move the whole rectangle; the left hand side stays where it was.
	 *
	 * @type Number
	 * @bean
	 */
	getRight: function() {
		return this.x + this.width;
	},

	setRight: function(right) {
		this.width = right - this.x;
		return this;
	},

	/**
	 * The bottom coordinate of the rectangle. Note that this doesn't move the
	 * whole rectangle: the top won't move.
	 *
	 * @type Number
	 * @bean
	 */
	getBottom: function() {
		return this.y + this.height;
	},

	setBottom: function(bottom) {
		this.height = bottom - this.y;
		return this;
	},

	/**
	 * The center-x coordinate of the rectangle.
	 *
	 * @type Number
	 * @bean
	 * @ignore
	 */
	getCenterX: function() {
		return this.x + this.width * 0.5;
	},

	setCenterX: function(x) {
		this.x = x - this.width * 0.5;
		return this;
	},

	/**
	 * The center-y coordinate of the rectangle.
	 *
	 * @type Number
	 * @bean
	 * @ignore
	 */
	getCenterY: function() {
		return this.y + this.height * 0.5;
	},

	setCenterY: function(y) {
		this.y = y - this.height * 0.5;
		return this;
	},

	/**
	 * {@grouptitle Corner and Center Point Positions}
	 *
	 * The center point of the rectangle.
	 *
	 * @type Point
	 * @bean
	 */
	getCenter: function(/* dontLink */) {
		return LinkedPoint.create(this, 'setCenter',
				this.getCenterX(), this.getCenterY(), arguments[0]);
	},

	setCenter: function(point) {
		point = Point.read(arguments);
		return this.setCenterX(point.x).setCenterY(point.y);
	},

	/**
	 * The top-left point of the rectangle.
	 *
	 * @name Rectangle#topLeft
	 * @type Point
	 */

	/**
	 * The top-right point of the rectangle.
	 *
	 * @name Rectangle#topRight
	 * @type Point
	 */

	/**
	 * The bottom-left point of the rectangle.
	 *
	 * @name Rectangle#bottomLeft
	 * @type Point
	 */

	/**
	 * The bottom-right point of the rectangle.
	 *
	 * @name Rectangle#bottomRight
	 * @type Point
	 */

	/**
	 * The left-center point of the rectangle.
	 *
	 * @name Rectangle#leftCenter
	 * @type Point
	 */

	/**
	 * The top-center point of the rectangle.
	 *
	 * @name Rectangle#topCenter
	 * @type Point
	 */

	/**
	 * The right-center point of the rectangle.
	 *
	 * @name Rectangle#rightCenter
	 * @type Point
	 */

	/**
	 * The bottom-center point of the rectangle.
	 *
	 * @name Rectangle#bottomCenter
	 * @type Point
	 */

	/**
	 * Checks whether the coordinates and size of the rectangle are equal to
	 * that of the supplied rectangle.
	 *
	 * @param {Rectangle} rect
	 * @return {Boolean} {@true if the rectangles are equal}
	 */
	equals: function(rect) {
		rect = Rectangle.read(arguments);
		return this.x == rect.x && this.y == rect.y
				&& this.width == rect.width && this.height == rect.height;
	},

	/**
	 * @return {Boolean} {@true the rectangle is empty}
	 */
	isEmpty: function() {
		return this.width == 0 || this.height == 0;
	},

	/**
	 * @return {String} A string representation of this rectangle.
	 */
	toString: function() {
		var format = Base.formatNumber;
		return '{ x: ' + format(this.x)
				+ ', y: ' + format(this.y)
				+ ', width: ' + format(this.width)
				+ ', height: ' + format(this.height)
				+ ' }';
	},

	/**
	 * {@grouptitle Geometric Tests}
	 *
	 * Tests if the specified point is inside the boundary of the rectangle.
	 *
	 * @name Rectangle#contains
	 * @function
	 * @param {Point} point the specified point
	 * @return {Boolean} {@true if the point is inside the rectangle's boundary}
	 *
	 * @example {@paperscript}
	 * // Checking whether the mouse position falls within the bounding
	 * // rectangle of an item:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'red';
	 *
	 * function onMouseMove(event) {
	 * 	// Check whether the mouse position intersects with the
	 * 	// bounding box of the item:
	 * 	if (circle.bounds.contains(event.point)) {
	 * 		// If it intersects, fill it with green:
	 * 		circle.fillColor = 'green';
	 * 	} else {
	 * 		// If it doesn't intersect, fill it with red:
	 * 		circle.fillColor = 'red';
	 * 	}
	 * }
	 */
	/**
	 * Tests if the interior of the rectangle entirely contains the specified
	 * rectangle.
	 *
	 * @name Rectangle#contains
	 * @function
	 * @param {Rectangle} rect The specified rectangle
	 * @return {Boolean} {@true if the rectangle entirely contains the specified
	 *                   rectangle}
	 *
	 * @example {@paperscript}
	 * // Checking whether the bounding box of one item is contained within
	 * // that of another item:
	 *
	 * // All newly created paths will inherit these styles:
	 * project.currentStyle = {
	 * 	fillColor: 'green',
	 * 	strokeColor: 'black'
	 * };
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 45.
	 * var largeCircle = new Path.Circle(new Point(80, 50), 45);
	 *
	 * // Create a smaller circle shaped path in the same position
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * function onMouseMove(event) {
	 * 	// Move the circle to the position of the mouse:
	 * 	circle.position = event.point;
	 *
	 * 	// Check whether the bounding box of the smaller circle
	 * 	// is contained within the bounding box of the larger item:
	 * 	if (largeCircle.bounds.contains(circle.bounds)) {
	 * 		// If it does, fill it with green:
	 * 		circle.fillColor = 'green';
	 * 		largeCircle.fillColor = 'green';
	 * 	} else {
	 * 		// If doesn't, fill it with red:
	 * 		circle.fillColor = 'red';
	 * 		largeCircle.fillColor = 'red';
	 * 	}
	 * }
	 */
	contains: function(arg) {
		// Detect rectangles either by checking for 'width' on the passed object
		// or by looking at the amount of elements in the arguments list,
		// or the passed array:
		return arg && arg.width !== undefined
				|| (Array.isArray(arg) ? arg : arguments).length == 4
				? this._containsRectangle(Rectangle.read(arguments))
				: this._containsPoint(Point.read(arguments));
	},

	_containsPoint: function(point) {
		var x = point.x,
			y = point.y;
		return x >= this.x && y >= this.y
				&& x <= this.x + this.width
				&& y <= this.y + this.height;
	},

	_containsRectangle: function(rect) {
		var x = rect.x,
			y = rect.y;
		return x >= this.x && y >= this.y
				&& x + rect.width <= this.x + this.width
				&& y + rect.height <= this.y + this.height;
	},

	/**
	 * Tests if the interior of this rectangle intersects the interior of
	 * another rectangle.
	 *
	 * @param {Rectangle} rect the specified rectangle
	 * @return {Boolean} {@true if the rectangle and the specified rectangle
	 *                   intersect each other}
	 *
	 * @example {@paperscript}
	 * // Checking whether the bounding box of one item intersects with
	 * // that of another item:
	 *
	 * // All newly created paths will inherit these styles:
	 * project.currentStyle = {
	 * 	fillColor: 'green',
	 * 	strokeColor: 'black'
	 * };
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 45.
	 * var largeCircle = new Path.Circle(new Point(80, 50), 45);
	 *
	 * // Create a smaller circle shaped path in the same position
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * function onMouseMove(event) {
	 * 	// Move the circle to the position of the mouse:
	 * 	circle.position = event.point;
	 *
	 * 	// Check whether the bounding box of the two circle
	 * 	// shaped paths intersect:
	 * 	if (largeCircle.bounds.intersects(circle.bounds)) {
	 * 		// If it does, fill it with green:
	 * 		circle.fillColor = 'green';
	 * 		largeCircle.fillColor = 'green';
	 * 	} else {
	 * 		// If doesn't, fill it with red:
	 * 		circle.fillColor = 'red';
	 * 		largeCircle.fillColor = 'red';
	 * 	}
	 * }
	 */
	intersects: function(rect) {
		rect = Rectangle.read(arguments);
		return rect.x + rect.width > this.x
				&& rect.y + rect.height > this.y
				&& rect.x < this.x + this.width
				&& rect.y < this.y + this.height;
	},

	/**
	 * {@grouptitle Boolean Operations}
	 *
	 * Returns a new rectangle representing the intersection of this rectangle
	 * with the specified rectangle.
	 *
	 * @param {Rectangle} rect The rectangle to be intersected with this
	 *                         rectangle
	 * @return {Rectangle} The largest rectangle contained in both the specified
	 *                     rectangle and in this rectangle.
	 *
	 * @example {@paperscript}
	 * // Intersecting two rectangles and visualizing the result using rectangle
	 * // shaped paths:
	 *
	 * // Create two rectangles that overlap each other
	 * var size = new Size(50, 50);
	 * var rectangle1 = new Rectangle(new Point(25, 15), size);
	 * var rectangle2 = new Rectangle(new Point(50, 40), size);
	 *
	 * // The rectangle that represents the intersection of the
	 * // two rectangles:
	 * var intersected = rectangle1.intersect(rectangle2);
	 *
	 * // To visualize the intersecting of the rectangles, we will
	 * // create rectangle shaped paths using the Path.Rectangle
	 * // constructor.
	 *
	 * // Have all newly created paths inherit a black stroke:
	 * project.currentStyle.strokeColor = 'black';
	 *
	 * // Create two rectangle shaped paths using the abstract rectangles
	 * // we created before:
	 * new Path.Rectangle(rectangle1);
	 * new Path.Rectangle(rectangle2);
	 *
	 * // Create a path that represents the intersected rectangle,
	 * // and fill it with red:
	 * var intersectionPath = new Path.Rectangle(intersected);
	 * intersectionPath.fillColor = 'red';
	 */
	intersect: function(rect) {
		rect = Rectangle.read(arguments);
		var x1 = Math.max(this.x, rect.x),
			y1 = Math.max(this.y, rect.y),
			x2 = Math.min(this.x + this.width, rect.x + rect.width),
			y2 = Math.min(this.y + this.height, rect.y + rect.height);
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Returns a new rectangle representing the union of this rectangle with the
	 * specified rectangle.
	 *
	 * @param {Rectangle} rect the rectangle to be combined with this rectangle
	 * @return {Rectangle} the smallest rectangle containing both the specified
	 *                     rectangle and this rectangle.
	 */
	unite: function(rect) {
		rect = Rectangle.read(arguments);
		var x1 = Math.min(this.x, rect.x),
			y1 = Math.min(this.y, rect.y),
			x2 = Math.max(this.x + this.width, rect.x + rect.width),
			y2 = Math.max(this.y + this.height, rect.y + rect.height);
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Adds a point to this rectangle. The resulting rectangle is the
	 * smallest rectangle that contains both the original rectangle and the
	 * specified point.
	 *
	 * After adding a point, a call to {@link #contains(point)} with the added
	 * point as an argument does not necessarily return {@code true}.
	 * The {@link Rectangle#contains(point)} method does not return {@code true}
	 * for points on the right or bottom edges of a rectangle. Therefore, if the
	 * added point falls on the left or bottom edge of the enlarged rectangle,
	 * {@link Rectangle#contains(point)} returns {@code false} for that point.
	 *
	 * @param {Point} point
	 */
	include: function(point) {
		point = Point.read(arguments);
		var x1 = Math.min(this.x, point.x),
			y1 = Math.min(this.y, point.y),
			x2 = Math.max(this.x + this.width, point.x),
			y2 = Math.max(this.y + this.height, point.y);
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Expands the rectangle by the specified amount in both horizontal and
	 * vertical directions.
	 *
	 * @name Rectangle#expand
	 * @function
	 * @param {Number} amount
	 */
	/**
	 * Expands the rectangle in horizontal direction by the specified
	 * {@code hor} amount and in vertical direction by the specified {@code ver}
	 * amount.
	 *
	 * @name Rectangle#expand^2
	 * @function
	 * @param {Number} hor
	 * @param {Number} ver
	 */
	expand: function(hor, ver) {
		if (ver === undefined)
			ver = hor;
		return Rectangle.create(this.x - hor / 2, this.y - ver / 2,
				this.width + hor, this.height + ver);
	},

	/**
	 * Scales the rectangle by the specified amount from its center.
	 *
	 * @name Rectangle#scale
	 * @function
	 * @param {Number} amount
	 */
	/**
	 * Scales the rectangle in horizontal direction by the specified
	 * {@code hor} amount and in vertical direction by the specified {@code ver}
	 * amount from its center.
	 *
	 * @name Rectangle#scale^2
	 * @function
	 * @param {Number} hor
	 * @param {Number} ver
	 */
	scale: function(hor, ver) {
		return this.expand(this.width * hor - this.width,
				this.height * (ver === undefined ? hor : ver) - this.height);
	},

	statics: {
		// See Point.create()
		create: function(x, y, width, height) {
			return new Rectangle(Rectangle.dont).set(x, y, width, height);
		}
	}
}, new function() {
	return Base.each([
			['Top', 'Left'], ['Top', 'Right'],
			['Bottom', 'Left'], ['Bottom', 'Right'],
			['Left', 'Center'], ['Top', 'Center'],
			['Right', 'Center'], ['Bottom', 'Center']
		],
		function(parts, index) {
			var part = parts.join('');
			// find out if the first of the pair is an x or y property,
			// by checking the first character for [R]ight or [L]eft;
			var xFirst = /^[RL]/.test(part);
			// Rename Center to CenterX or CenterY:
			if (index >= 4)
				parts[1] += xFirst ? 'Y' : 'X';
			var x = parts[xFirst ? 0 : 1],
				y = parts[xFirst ? 1 : 0],
				getX = 'get' + x,
				getY = 'get' + y,
				setX = 'set' + x,
				setY = 'set' + y,
				get = 'get' + part,
				set = 'set' + part;
			this[get] = function(/* dontLink */) {
				return LinkedPoint.create(this, set,
						this[getX](), this[getY](), arguments[0]);
			};
			this[set] = function(point) {
				point = Point.read(arguments);
				// Note: call chaining happens here.
				return this[setX](point.x)[setY](point.y);
			};
		}, {});
});

/**
 * @name LinkedRectangle
 *
 * @class An internal version of Rectangle that notifies its owner of each
 * change through setting itself again on the setter that corresponds to the
 * getter that produced this LinkedRectangle.
 * See uses of LinkedRectangle.create()
 * Note: This prototype is not exported.
 *
 * @private
 */
var LinkedRectangle = Rectangle.extend({
	set: function(x, y, width, height, dontNotify) {
		this._x = x;
		this._y = y;
		this._width = width;
		this._height = height;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	statics: {
		/**
		 * Provide a faster creator for Points out of two coordinates that
		 * does not rely on Point#initialize at all. This speeds up all math
		 * operations a lot.
		 *
		 * @ignore
		 */
		create: function(owner, setter, x, y, width, height) {
			var rect = new LinkedRectangle(LinkedRectangle.dont).set(
					x, y, width, height, true);
			rect._owner = owner;
			rect._setter = setter;
			return rect;
		}
	}
}, new function() {
	var proto = Rectangle.prototype;

	return Base.each(['x', 'y', 'width', 'height'], function(key) {
		var part = Base.capitalize(key);
		var internal = '_' + key;
		this['get' + part] = function() {
			return this[internal];
		};

		this['set' + part] = function(value) {
			this[internal] = value;
			// Check if this setter is called from another one which sets
			// _dontNotify, as it will notify itself
			if (!this._dontNotify)
				this._owner[this._setter](this);
		};
	}, Base.each(['Point', 'Size', 'Center',
			'Left', 'Top', 'Right', 'Bottom', 'CenterX', 'CenterY',
			'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
			'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
		function(key) {
			var name = 'set' + key;
			this[name] = function(value) {
				// Make sure the above setters of x, y, width, height do not
				// each notify the owner, as we're going to take care of this
				// afterwards here, only once per change.
				this._dontNotify = true;
				proto[name].apply(this, arguments);
				delete this._dontNotify;
				this._owner[this._setter](this);
				return this;
			};
		}, {})
	);
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// Based on goog.graphics.AffineTransform, as part of the Closure Library.
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

/**
 * @name Matrix
 *
 * @class An affine transform performs a linear mapping from 2D coordinates
 * to other 2D coordinates that preserves the "straightness" and
 * "parallelness" of lines.
 *
 * Such a coordinate transformation can be represented by a 3 row by 3
 * column matrix with an implied last row of [ 0 0 1 ]. This matrix
 * transforms source coordinates (x,y) into destination coordinates (x',y')
 * by considering them to be a column vector and multiplying the coordinate
 * vector by the matrix according to the following process:
 * <pre>
 *      [ x ]   [ a  b  tx ] [ x ]   [ a * x + b * y + tx ]
 *      [ y ] = [ c  d  ty ] [ y ] = [ c * x + d * y + ty ]
 *      [ 1 ]   [ 0  0  1  ] [ 1 ]   [         1          ]
 * </pre>
 *
 * This class is optimized for speed and minimizes calculations based on its
 * knowledge of the underlying matrix (as opposed to say simply performing
 * matrix multiplication).
 */
var Matrix = this.Matrix = Base.extend(/** @lends Matrix# */{
	/**
	 * Creates a 2D affine transform.
	 *
	 * @param {Number} a The scaleX coordinate of the transform
	 * @param {Number} c The shearY coordinate of the transform
	 * @param {Number} b The shearX coordinate of the transform
	 * @param {Number} d The scaleY coordinate of the transform
	 * @param {Number} tx The translateX coordinate of the transform
	 * @param {Number} ty The translateY coordinate of the transform
	 */
	initialize: function(arg) {
		var count = arguments.length,
			ok = true;
		if (count == 6) {
			this.set.apply(this, arguments);
		} else if (count == 1) {
			if (arg instanceof Matrix) {
				this.set(arg._a, arg._c, arg._b, arg._d, arg._tx, arg._ty);
			} else if (Array.isArray(arg)) {
				this.set.apply(this, arg);
			} else {
				ok = false;
			}
		} else if (count == 0) {
			this.setIdentity();
		} else {
			ok = false;
		}
		if (!ok)
			throw new Error('Unsupported matrix parameters');
	},

	/**
	 * @return {Matrix} A copy of this transform.
	 */
	clone: function() {
		return Matrix.create(this._a, this._c, this._b, this._d,
				this._tx, this._ty);
	},

	/**
	 * Sets this transform to the matrix specified by the 6 values.
	 *
	 * @param {Number} a The scaleX coordinate of the transform
	 * @param {Number} c The shearY coordinate of the transform
	 * @param {Number} b The shearX coordinate of the transform
	 * @param {Number} d The scaleY coordinate of the transform
	 * @param {Number} tx The translateX coordinate of the transform
	 * @param {Number} ty The translateY coordinate of the transform
	 * @return {Matrix} This affine transform
	 */
	set: function(a, c, b, d, tx, ty) {
		this._a = a;
		this._c = c;
		this._b = b;
		this._d = d;
		this._tx = tx;
		this._ty = ty;
		return this;
	},

	setIdentity: function() {
		this._a = this._d = 1;
		this._c = this._b = this._tx = this._ty = 0;
		return this;
	},

	/**
	 * Concatentates this transform with a scaling transformation.
	 *
	 * @name Matrix#scale
	 * @function
	 * @param {Number} scale The scaling factor
	 * @param {Point} [center] The center for the scaling transformation
	 * @return {Matrix} This affine transform
	 */
	/**
	 * Concatentates this transform with a scaling transformation.
	 *
	 * @name Matrix#scale
	 * @function
	 * @param {Number} hor The horizontal scaling factor
	 * @param {Number} ver The vertical scaling factor
	 * @param {Point} [center] The center for the scaling transformation
	 * @return {Matrix} This affine transform
	 */
	scale: function(/* scale | */ hor, ver, center) {
		if (arguments.length < 2 || typeof ver === 'object') {
			// hor is the single scale parameter, representing both hor and ver
			// Read center first from argument 1, then set ver = hor (thus
			// modifing the content of argument 1!)
			center = Point.read(arguments, 1);
			ver = hor;
		} else {
			center = Point.read(arguments, 2);
		}
		if (center)
			this.translate(center);
		this._a *= hor;
		this._c *= hor;
		this._b *= ver;
		this._d *= ver;
		if (center)
			this.translate(center.negate());
		return this;
	},

	/**
	 * Concatentates this transform with a translate transformation.
	 *
	 * @name Matrix#translate
	 * @function
	 * @param {Point} point The vector to translate by
	 * @return {Matrix} This affine transform
	 */
	/**
	 * Concatentates this transform with a translate transformation.
	 *
	 * @name Matrix#translate
	 * @function
	 * @param {Number} dx The distance to translate in the x direction
	 * @param {Number} dy The distance to translate in the y direction
	 * @return {Matrix} This affine transform
	 */
	translate: function(point) {
		point = Point.read(arguments);
		var x = point.x, y = point.y;
		this._tx += x * this._a + y * this._b;
		this._ty += x * this._c + y * this._d;
		return this;
	},

	/**
	 * Concatentates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @name Matrix#rotate
	 * @function
	 * @param {Number} angle The angle of rotation measured in degrees
	 * @param {Point} center The anchor point to rotate around
	 * @return {Matrix} This affine transform
	 */
	/**
	 * Concatentates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @name Matrix#rotate
	 * @function
	 * @param {Number} angle The angle of rotation measured in degrees
	 * @param {Number} x The x coordinate of the anchor point
	 * @param {Number} y The y coordinate of the anchor point
	 * @return {Matrix} This affine transform
	 */
	rotate: function(angle, center) {
		return this.concatenate(
				Matrix.getRotateInstance.apply(Matrix, arguments));
	},

	/**
	 * Concatentates this transform with a shear transformation.
	 *
	 * @name Matrix#shear
	 * @function
	 * @param {Point} point The shear factor in x and y direction
	 * @param {Point} [center] The center for the shear transformation
	 * @return {Matrix} This affine transform
	 */
	/**
	 * Concatentates this transform with a shear transformation.
	 *
	 * @name Matrix#shear
	 * @function
	 * @param {Number} hor The horizontal shear factor
	 * @param {Number} ver The vertical shear factor
	 * @param {Point} [center] The center for the shear transformation
	 * @return {Matrix} This affine transform
	 */
	shear: function(/* point | */ hor, ver, center) {
		// See #scale() for explanation of this:
		if (arguments.length < 2 || typeof ver === 'object') {
			center = Point.read(arguments, 1);
			ver = hor;
		} else {
			center = Point.read(arguments, 2);
		}
		if (center)
			this.translate(center);
		var a = this._a,
			c = this._c;
		this._a += ver * this._b;
		this._c += ver * this._d;
		this._b += hor * a;
		this._d += hor * c;
		if (center)
			this.translate(center.negate());
		return this;
	},

	/**
	 * @return {String} A string representation of this transform.
	 */
	toString: function() {
		var format = Base.formatNumber;
		return '[[' + [format(this._a), format(this._b),
					format(this._tx)].join(', ') + '], ['
				+ [format(this._c), format(this._d),
					format(this._ty)].join(', ') + ']]';
	},

	/**
	 * The scaling factor in the x-direction ({@code a}).
	 *
	 * @name Matrix#scaleX
	 * @type Number
	 */

	/**
	 * The scaling factor in the y-direction ({@code d}).
	 *
	 * @name Matrix#scaleY
	 * @type Number
	 */

	/**
	 * @return {Number} The shear factor in the x-direction ({@code b}).
	 *
	 * @name Matrix#shearX
	 * @type Number
	 */

	/**
	 * @return {Number} The shear factor in the y-direction ({@code c}).
	 *
	 * @name Matrix#shearY
	 * @type Number
	 */

	/**
	 * The translation in the x-direction ({@code tx}).
	 *
	 * @name Matrix#translateX
	 * @type Number
	 */

	/**
	 * The translation in the y-direction ({@code ty}).
	 *
	 * @name Matrix#translateY
	 * @type Number
	 */

	/**
	 * The transform values as an array, in the same sequence as they are passed
	 * to {@link #initialize(a, c, b, d, tx, ty)}.
	 *
	 * @type Number[]
	 * @bean
	 */
	getValues: function() {
		return [ this._a, this._c, this._b, this._d, this._tx, this._ty ];
	},

	/**
	 * Concatenates an affine transform to this transform.
	 *
	 * @param {Matrix} mx The transform to concatenate
	 * @return {Matrix} This affine transform
	 */
	concatenate: function(mx) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = mx._a * a + mx._c * b;
		this._b = mx._b * a + mx._d * b;
		this._c = mx._a * c + mx._c * d;
		this._d = mx._b * c + mx._d * d;
		this._tx += mx._tx * a + mx._ty * b;
		this._ty += mx._tx * c + mx._ty * d;
		return this;
	},

	/**
	 * Pre-concatenates an affine transform to this transform.
	 *
	 * @param {Matrix} mx The transform to preconcatenate
	 * @return {Matrix} This affine transform
	 */
	preConcatenate: function(mx) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d,
			tx = this._tx,
			ty = this._ty;
		this._a = mx._a * a + mx._b * c;
		this._b = mx._a * b + mx._b * d;
		this._c = mx._c * a + mx._d * c;
		this._d = mx._c * b + mx._d * d;
		this._tx = mx._a * tx + mx._b * ty + mx._tx;
		this._ty = mx._c * tx + mx._d * ty + mx._ty;
		return this;
	},

	/**
	 * Transforms a point and returns the result.
	 *
	 * @name Matrix#transform
	 * @function
	 * @param {Point} point The point to be transformed
	 * @return {Point} The transformed point
	 */
	/**
	 * Transforms an array of coordinates by this matrix and stores the results
	 * into the destination array, which is also returned.
	 *
	 * @name Matrix#transform
	 * @function
	 * @param {Number[]} src The array containing the source points
	 *        as x, y value pairs
	 * @param {Number} srcOff The offset to the first point to be transformed
	 * @param {Number[]} dst The array into which to store the transformed
	 *        point pairs
	 * @param {Number} dstOff The offset of the location of the first
	 *        transformed point in the destination array
	 * @param {Number} numPts The number of points to tranform
	 * @return {Number[]} The dst array, containing the transformed coordinates.
	 */
	transform: function(/* point | */ src, srcOff, dst, dstOff, numPts) {
		return arguments.length < 5
			// TODO: Check for rectangle and use _tranformBounds?
			? this._transformPoint(Point.read(arguments))
			: this._transformCoordinates(src, srcOff, dst, dstOff, numPts);
	},

	/**
	 * A faster version of transform that only takes one point and does not
	 * attempt to convert it.
	 */
	_transformPoint: function(point, dest, dontNotify) {
		var x = point.x,
			y = point.y;
		if (!dest)
			dest = new Point(Point.dont);
		return dest.set(
			x * this._a + y * this._b + this._tx,
			x * this._c + y * this._d + this._ty,
			dontNotify
		);
	},

	_transformCoordinates: function(src, srcOff, dst, dstOff, numPts) {
		var i = srcOff, j = dstOff,
			srcEnd = srcOff + 2 * numPts;
		while (i < srcEnd) {
			var x = src[i++];
			var y = src[i++];
			dst[j++] = x * this._a + y * this._b + this._tx;
			dst[j++] = x * this._c + y * this._d + this._ty;
		}
		return dst;
	},

	_transformCorners: function(rect) {
		var x1 = rect.x,
			y1 = rect.y,
			x2 = x1 + rect.width,
			y2 = y1 + rect.height,
			coords = [ x1, y1, x2, y1, x2, y2, x1, y2 ];
		return this._transformCoordinates(coords, 0, coords, 0, 4);
	},

	/**
	 * Returns the 'transformed' bounds rectangle by transforming each corner
	 * point and finding the new bounding box to these points. This is not
	 * really the transformed reactangle!
	 */
	_transformBounds: function(bounds, dest, dontNotify) {
		var coords = this._transformCorners(bounds),
			min = coords.slice(0, 2),
			max = coords.slice(0);
		for (var i = 2; i < 8; i++) {
			var val = coords[i],
				j = i & 1;
			if (val < min[j])
				min[j] = val;
			else if (val > max[j])
				max[j] = val;
		}
		if (!dest)
			dest = new Rectangle(Rectangle.dont);
		return dest.set(min[0], min[1], max[0] - min[0], max[1] - min[1],
				dontNotify);
	},

	/**
	 * Inverse transforms a point and returns the result.
	 *
	 * @param {Point} point The point to be transformed
	 */
	inverseTransform: function(point) {
		return this._inverseTransform(Point.read(arguments));
	},

	/**
	 * Returns the determinant of this transform, but only if the matrix is
	 * reversible, null otherwise.
	 */
	_getDeterminant: function() {
		var det = this._a * this._d - this._b * this._c;
		return isFinite(det) && Math.abs(det) > Numerical.EPSILON
				&& isFinite(this._tx) && isFinite(this._ty)
				? det : null;
	},

	_inverseTransform: function(point, dest, dontNotify) {
		var det = this._getDeterminant();
		if (!det)
			return null;
		var x = point.x - this._tx,
			y = point.y - this._ty;
		if (!dest)
			dest = new Point(Point.dont);
		return dest.set(
			(x * this._d - y * this._b) / det,
			(y * this._a - x * this._c) / det,
			dontNotify
		);
	},

	getTranslation: function() {
		return Point.create(this._tx, this._ty);
	},

	getScaling: function() {
		var hor = Math.sqrt(this._a * this._a + this._c * this._c),
			ver = Math.sqrt(this._b * this._b + this._d * this._d);
		return Point.create(this._a < 0 ? -hor : hor, this._b < 0 ? -ver : ver);
	},

	/**
	 * The rotation angle of the matrix. If a non-uniform rotation is applied as
	 * a result of a shear() or scale() command, undefined is returned, as the
	 * resulting transformation cannot be expressed in one rotation angle.
	 *
	 * @type Number
	 * @bean
	 */
	getRotation: function() {
		var angle1 = -Math.atan2(this._b, this._d),
			angle2 = Math.atan2(this._c, this._a);
		return Math.abs(angle1 - angle2) < Numerical.TOLERANCE
				? angle1 * 180 / Math.PI : undefined;
	},

	/**
	 * Checks whether the two matrices describe the same transformation.
	 *
	 * @param {Matrix} matrix the matrix to compare this matrix to
	 * @return {Boolean} {@true if the matrices are equal}
	 */
	equals: function(mx) {
		return this._a == mx._a && this._b == mx._b && this._c == mx._c
				&& this._d == mx._d && this._tx == mx._tx && this._ty == mx._ty;
	},

	/**
	 * @return {Boolean} Whether this transform is the identity transform
	 */
	isIdentity: function() {
		return this._a == 1 && this._c == 0 && this._b == 0 && this._d == 1
				&& this._tx == 0 && this._ty == 0;
	},

	/**
	 * Returns whether the transform is invertible. A transform is not
	 * invertible if the determinant is 0 or any value is non-finite or NaN.
	 *
	 * @return {Boolean} Whether the transform is invertible
	 */
	isInvertible: function() {
		return !!this._getDeterminant();
	},

	/**
	 * Checks whether the matrix is singular or not. Singular matrices cannot be
	 * inverted.
	 *
	 * @return {Boolean} Whether the matrix is singular
	 */
	isSingular: function() {
		return !this._getDeterminant();
	},

	/**
	 * Inverts the transformation of the matrix. If the matrix is not invertible
	 * (in which case {@link #isSingular()} returns true), {@code null } is
	 * returned.
	 * 
	 * @return {Matrix} The inverted matrix, or {@code null }, if the matrix is
	 *         singular
	 */
	createInverse: function() {
		var det = this._getDeterminant();
		return det && Matrix.create(
				this._d / det,
				-this._c / det,
				-this._b / det,
				this._a / det,
				(this._b * this._ty - this._d * this._tx) / det,
				(this._c * this._tx - this._a * this._ty) / det);
	},

	createShiftless: function() {
		return Matrix.create(this._a, this._c, this._b, this._d, 0, 0);
	},

	/**
	 * Sets this transform to a scaling transformation.
	 *
	 * @param {Number} hor The horizontal scaling factor
	 * @param {Number} ver The vertical scaling factor
	 * @return {Matrix} This affine transform
	 */
	setToScale: function(hor, ver) {
		return this.set(hor, 0, 0, ver, 0, 0);
	},

	/**
	 * Sets this transform to a translation transformation.
	 *
	 * @param {Number} dx The distance to translate in the x direction
	 * @param {Number} dy The distance to translate in the y direction
	 * @return {Matrix} This affine transform
	 */
	setToTranslation: function(delta) {
		delta = Point.read(arguments);
		return this.set(1, 0, 0, 1, delta.x, delta.y);
	},

	/**
	 * Sets this transform to a shearing transformation.
	 *
	 * @param {Number} hor The horizontal shear factor
	 * @param {Number} ver The vertical shear factor
	 * @return {Matrix} This affine transform
	 */
	setToShear: function(hor, ver) {
		return this.set(1, ver, hor, 1, 0, 0);
	},

	/**
	 * Sets this transform to a rotation transformation.
	 *
	 * @param {Number} angle The angle of rotation measured in degrees
	 * @param {Number} x The x coordinate of the anchor point
	 * @param {Number} y The y coordinate of the anchor point
	 * @return {Matrix} This affine transform
	 */
	setToRotation: function(angle, center) {
		center = Point.read(arguments, 1);
		angle = angle * Math.PI / 180;
		var x = center.x,
			y = center.y,
			cos = Math.cos(angle),
			sin = Math.sin(angle);
		return this.set(cos, sin, -sin, cos,
				x - x * cos + y * sin,
				y - x * sin - y * cos);
	},

	/**
	 * Applies this matrix to the specified Canvas Context.
	 *
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Boolean} [reset=false]
	 */
	applyToContext: function(ctx, reset) {
		ctx[reset ? 'setTransform' : 'transform'](
				this._a, this._c, this._b, this._d, this._tx, this._ty);
		return this;
	},

	statics: /** @lends Matrix */{
		// See Point.create()
		create: function(a, c, b, d, tx, ty) {
			return new Matrix(Matrix.dont).set(a, c, b, d, tx, ty);
		},

		/**
		 * Creates a transform representing a scaling transformation.
		 *
		 * @param {Number} hor The horizontal scaling factor
		 * @param {Number} ver The vertical scaling factor
		 * @return {Matrix} A transform representing a scaling
		 *         transformation
		 */
		getScaleInstance: function(hor, ver) {
			var mx = new Matrix();
			return mx.setToScale.apply(mx, arguments);
		},

		/**
		 * Creates a transform representing a translation transformation.
		 *
		 * @param {Number} dx The distance to translate in the x direction
		 * @param {Number} dy The distance to translate in the y direction
		 * @return {Matrix} A transform representing a translation
		 *         transformation
		 */
		getTranslateInstance: function(delta) {
			var mx = new Matrix();
			return mx.setToTranslation.apply(mx, arguments);
		},

		/**
		 * Creates a transform representing a shearing transformation.
		 *
		 * @param {Number} hor The horizontal shear factor
		 * @param {Number} ver The vertical shear factor
		 * @return {Matrix} A transform representing a shearing transformation
		 */
		getShearInstance: function(hor, ver, center) {
			var mx = new Matrix();
			return mx.setToShear.apply(mx, arguments);
		},

		/**
		 * Creates a transform representing a rotation transformation.
		 *
		 * @param {Number} angle The angle of rotation measured in degrees
		 * @param {Number} x The x coordinate of the anchor point
		 * @param {Number} y The y coordinate of the anchor point
		 * @return {Matrix} A transform representing a rotation transformation
		 */
		getRotateInstance: function(angle, center) {
			var mx = new Matrix();
			return mx.setToRotation.apply(mx, arguments);
		}
	}
}, new function() {
	return Base.each({
		scaleX: '_a',
		scaleY: '_d',
		translateX: '_tx',
		translateY: '_ty',
		shearX: '_b',
		shearY: '_c'
	}, function(prop, name) {
		name = Base.capitalize(name);
		this['get' + name] = function() {
			return this[prop];
		};
		this['set' + name] = function(value) {
			this[prop] = value;
		};
	}, {});
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Line
 *
 * @class The Line object represents..
 */
var Line = this.Line = Base.extend(/** @lends Line# */{
	// DOCS: document Line class and constructor
	/**
	 * Creates a Line object.
	 *
	 * @param {Point} point1
	 * @param {Point} point2
	 * @param {Boolean} [infinite=true]
	 */
	initialize: function(point1, point2, infinite) {
		// Convention: With 3 parameters, both points are absolute, and infinite
		// controls wether the line extends beyond the defining points, meaning
		// intersection outside the line segment are allowed.
		// With two parameters, the 2nd parameter is a direction, and infinite
		// is automatially true, since we're describing an infinite line.
		point1 = Point.read(arguments, 0, 1);
		point2 = Point.read(arguments, 1, 1);
		if (arguments.length == 3) {
			this.point = point1;
			this.vector = point2.subtract(point1);
			this.infinite = infinite;
		} else {
			this.point = point1;
			this.vector = point2;
			this.infinite = true;
		}
	},

	/**
	 * The starting point of the line
	 *
	 * @name Line#point
	 * @type Point
	 */

	/**
	 * The vector of the line
	 *
	 * @name Line#vector
	 * @type Point
	 */

	/**
	 * Specifies whether the line extends infinitely
	 *
	 * @name Line#infinite
	 * @type Boolean
	 */

	/**
	 * @param {Line} line
	 * @return {Point} the intersection point of the lines
	 */
	intersect: function(line) {
		var cross = this.vector.cross(line.vector);
		// Avoid divisions by 0, and errors when getting too close to 0
		if (Math.abs(cross) <= Numerical.EPSILON)
			return null;
		var v = line.point.subtract(this.point),
			t1 = v.cross(line.vector) / cross,
			t2 = v.cross(this.vector) / cross;
		// Check the ranges of t parameters if the line is not allowed to
		// extend beyond the definition points.
		return (this.infinite || 0 <= t1 && t1 <= 1)
				&& (line.infinite || 0 <= t2 && t2 <= 1)
			? this.point.add(this.vector.multiply(t1)) : null;
	},

	// DOCS: document Line#getSide(point)
	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getSide: function(point) {
		var v1 = this.vector,
			v2 = point.subtract(this.point),
			ccw = v2.cross(v1);
		if (ccw == 0) {
			ccw = v2.dot(v1);
			if (ccw > 0) {
				ccw = v2.subtract(v1).dot(v1);
				if (ccw < 0)
				    ccw = 0;
			}
		}
		return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
	},

	// DOCS: document Line#getDistance(point)
	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getDistance: function(point) {
		var m = this.vector.y / this.vector.x, // slope
			b = this.point.y - (m * this.point.x); // y offset
		// Distance to the linear equation
		var dist = Math.abs(point.y - (m * point.x) - b) / Math.sqrt(m * m + 1);
		return this.infinite ? dist : Math.min(dist,
				point.getDistance(this.point),
				point.getDistance(this.point.add(this.vector)));
	}
});


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Project
 *
 * @class A Project object in Paper.js is what usually is referred to as the
 * document: The top level object that holds all the items contained in the
 * scene graph. As the term document is already taken in the browser context,
 * it is called Project.
 *
 * Projects allow the manipluation of the styles that are applied to all newly
 * created items, give access to the selected items, and will in future versions
 * offer ways to query for items in the scene graph defining specific
 * requirements, and means to persist and load from different formats, such as
 * SVG and PDF.
 *
 * The currently active project can be accessed through the
 * {@link PaperScope#project} variable.
 *
 * An array of all open projects is accessible through the
 * {@link PaperScope#projects} variable.
 */
var Project = this.Project = PaperScopeItem.extend(/** @lends Project# */{
	_list: 'projects',
	_reference: 'project',

	// TODO: Add arguments to define pages
	/**
	 * Creates a Paper.js project.
	 *
	 * When working with PaperScript, a project is automatically created for us
	 * and the {@link PaperScope#project} variable points to it.
	 *
	 * @param {View|HTMLCanvasElement} view Either a view object or an HTML
	 * Canvas element that should be wrapped in a newly created view.
	 */
	initialize: function(view) {
		// Activate straight away by passing true to base(), so paper.project is
		// set, as required by Layer and DoumentView constructors.
		this.base(true);
		this._currentStyle = new PathStyle();
		this._selectedItems = {};
		this._selectedItemCount = 0;
		this.layers = [];
		this.symbols = [];
		this.activeLayer = new Layer();
		if (view)
			this.view = view instanceof View ? view : View.create(view);
		// Change tracking, not in use for now. Activate once required:
		// this._changes = [];
		// this._changesById = {};
	},

	_needsRedraw: function() {
		if (this.view)
			this.view._redrawNeeded = true;
	},

	/**
	 * Activates this project, so all newly created items will be placed
	 * in it.
	 *
	 * @name Project#activate
	 * @function
	 */

	/**
	 * Removes this project from the {@link PaperScope#projects} list, and also
	 * removes its view, if one was defined.
	 */
	remove: function() {
		if (!this.base())
			return false;
		if (this.view)
			this.view.remove();
		return true;
	},

	/**
	 * The reference to the project's view.
	 * @name Project#view
	 * @type View
	 */

	/**
	 * The currently active path style. All selected items and newly
	 * created items will be styled with this style.
	 *
	 * @type PathStyle
	 * @bean
	 *
	 * @example {@paperscript}
	 * project.currentStyle = {
	 * 	fillColor: 'red',
	 * 	strokeColor: 'black',
	 * 	strokeWidth: 5
	 * }
	 *
	 * // The following paths will take over all style properties of
	 * // the current style:
	 * var path = new Path.Circle(new Point(75, 50), 30);
	 * var path2 = new Path.Circle(new Point(175, 50), 20);
	 *
	 * @example {@paperscript}
	 * project.currentStyle.fillColor = 'red';
	 *
	 * // The following path will take over the fill color we just set:
	 * var path = new Path.Circle(new Point(75, 50), 30);
	 * var path2 = new Path.Circle(new Point(175, 50), 20);
	 */
	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		// TODO: Style selected items with the style:
		this._currentStyle.initialize(style);
	},

	/**
	 * The index of the project in the {@link PaperScope#projects} list.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index;
	},

	/**
	 * The selected items contained within the project.
	 *
	 * @type Item[]
	 * @bean
	 */
	getSelectedItems: function() {
		// TODO: Return groups if their children are all selected,
		// and filter out their children from the list.
		// TODO: The order of these items should be that of their
		// drawing order.
		var items = [];
		Base.each(this._selectedItems, function(item) {
			items.push(item);
		});
		return items;
	},

	// TODO: Implement setSelectedItems?

	_updateSelection: function(item) {
		if (item._selected) {
			this._selectedItemCount++;
			this._selectedItems[item._id] = item;
		} else {
			this._selectedItemCount--;
			delete this._selectedItems[item._id];
		}
	},

	/**
	 * Selects all items in the project.
	 */
	selectAll: function() {
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].setSelected(true);
	},

	/**
	 * Deselects all selected items in the project.
	 */
	deselectAll: function() {
		for (var i in this._selectedItems)
			this._selectedItems[i].setSelected(false);
	},

	/**
	 * Perform a hit test on the items contained within the project at the
	 * location of the specified point.
	 * 
	 * The optional options object allows you to control the specifics of the
	 * hit test and may contain a combination of the following values:
	 * <b>options.tolerance:</b> {@code Number} - The tolerance of the hit test
	 * in points.
	 * <b>options.type:</b> Only hit test again a certain item
	 * type: {@link PathItem}, {@link Raster}, {@link TextItem}, etc.
	 * <b>options.fill:</b> {@code Boolean} - Hit test the fill of items.
	 * <b>options.stroke:</b> {@code Boolean} - Hit test the curves of path
	 * items, taking into account stroke width.
	 * <b>options.segments:</b> {@code Boolean} - Hit test for
	 * {@link Segment#point} of {@link Path} items.
	 * <b>options.handles:</b> {@code Boolean} - Hit test for the handles
	 * ({@link Segment#handleIn} / {@link Segment#handleOut}) of path segments.
	 * <b>options.ends:</b> {@code Boolean} - Only hit test for the first or
	 * last segment points of open path items.
	 * <b>options.bounds:</b> {@code Boolean} - Hit test the corners and
	 * side-centers of the bounding rectangle of items ({@link Item#bounds}).
	 * <b>options.center:</b> {@code Boolean} - Hit test the
	 * {@link Rectangle#center} of the bounding rectangle of items
	 * ({@link Item#bounds}).
	 * <b>options.guide:</b> {@code Boolean} - Hit test items that have
	 * {@link Item#guide} set to {@code true}.
	 * <b>options.selected:</b> {@code Boolean} - Only hit selected items.
	 *
	 * @param {Point} point The point where the hit test should be performed
	 * @param {Object} [options={ fill: true, stroke: true, segments: true,
	 * tolerance: true }]
	 * @return {HitResult} A hit result object that contains more
	 * information about what exactly was hit or {@code null} if nothing was
	 * hit.
	 */
	hitTest: function(point, options) {
		options = HitResult.getOptions(point, options);
		point = options.point;
		// Loop backwards, so layers that get drawn last are tested first
		for (var i = this.layers.length - 1; i >= 0; i--) {
			var res = this.layers[i].hitTest(point, options);
			if (res) return res;
		}
		return null;
	},

	/**
	 * {@grouptitle Project Hierarchy}
	 *
	 * The layers contained within the project.
	 *
	 * @name Project#layers
	 * @type Layer[]
	 */

	/**
	 * The layer which is currently active. New items will be created on this
	 * layer by default.
	 *
	 * @name Project#activeLayer
	 * @type Layer
	 */

	/**
	 * The symbols contained within the project.
	 *
	 * @name Project#symbols
	 * @type Symbol[]
	 */

	draw: function(ctx, matrix) {
		ctx.save();
		if (!matrix.isIdentity())
			matrix.applyToContext(ctx);
		var param = { offset: new Point(0, 0) };
		for (var i = 0, l = this.layers.length; i < l; i++)
			Item.draw(this.layers[i], ctx, param);
		ctx.restore();

		// Draw the selection of the selected items in the project:
		if (this._selectedItemCount > 0) {
			ctx.save();
			ctx.strokeWidth = 1;
			// TODO: use Layer#color
			ctx.strokeStyle = ctx.fillStyle = '#009dec';
			// Create a local lookup table for hierarchically concatenated
			// matrices by item id, to speed up drawing by eliminating repeated
			// concatenation of parent's matrices through caching.
			var matrices = {};
			// Descriptionf of the paramters to getGlobalMatrix():
			// mx is the container for the final concatenated matrix, passed
			// to getGlobalMatrix() on the initial call.
			// cached defines wether the result of the concatenation should be
			// cached, only used for parents of items that this is called for.
			function getGlobalMatrix(item, mx, cached) {
				var cache = cached && matrices[item._id];
				if (cache) {
					// Found a cached version, copy over the values and return
					mx.concatenate(cache);
					return mx;
				}
				if (item._parent) {
					// Get concatenated matrix from all the parents, using
					// local caching (passing true for cached):
					getGlobalMatrix(item._parent, mx, true);
					// No need to concatenate if it's the identity matrix
					if (!item._matrix.isIdentity())
						mx.concatenate(item._matrix);
				} else {
					// Simply copy over the item's matrix, since it's the root
					mx.initialize(item._matrix);
				}
				// If the result needs to be cached, create a copy since matrix
				// might be further modified through recursive calls
				if (cached)
					matrices[item._id] = mx.clone();
				return mx;
			}
			for (var id in this._selectedItems) {
				var item = this._selectedItems[id];
				item.drawSelected(ctx, getGlobalMatrix(item, matrix.clone()));
			}
			ctx.restore();
		}
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Symbol
 *
 * @class Symbols allow you to place multiple instances of an item in your
 * project. This can save memory, since all instances of a symbol simply refer
 * to the original item and it can speed up moving around complex objects, since
 * internal properties such as segment lists and gradient positions don't need
 * to be updated with every transformation.
 */
var Symbol = this.Symbol = Base.extend(/** @lends Symbol# */{
	/**
	 * Creates a Symbol item.
	 *
	 * @param {Item} item the source item which is copied as the definition of
	 *               the symbol
	 *
	 * @example {@paperscript split=true height=240}
	 * // Placing 100 instances of a symbol:
	 * var path = new Path.Star(new Point(0, 0), 6, 5, 13);
	 * path.style = {
	 *     fillColor: 'white',
	 *     strokeColor: 'black'
	 * };
     *
	 * // Create a symbol from the path:
	 * var symbol = new Symbol(path);
	 *
	 * // Remove the path:
	 * path.remove();
     *
	 * // Place 100 instances of the symbol:
	 * for (var i = 0; i < 100; i++) {
	 *     // Place an instance of the symbol in the project:
	 *     var instance = symbol.place();
     *
	 *     // Move the instance to a random position within the view:
	 *     instance.position = Point.random() * view.size;
     *
	 *     // Rotate the instance by a random amount between
	 *     // 0 and 360 degrees:
	 *     instance.rotate(Math.random() * 360);
     *
	 *     // Scale the instance between 0.25 and 1:
	 *     instance.scale(0.25 + Math.random() * 0.75);
	 * }
	 */
	initialize: function(item) {
		this.project = paper.project;
		this.project.symbols.push(this);
		this.setDefinition(item);
		// Hash to keep track of placed instances
		this._instances = {};
	},

	// TODO: Symbol#remove()
	// TODO: Symbol#name (accessible by name through project#symbols)

	/**
	 * The project that this symbol belongs to.
	 *
	 * @type Project
	 * @readonly
	 * @name Symbol#project
	 */

	/**
	 * Private notifier that is called whenever a change occurs in this symbol's
	 * definition.
	 *
	 * @param {ChangeFlag} flags describes what exactly has changed.
	 */
	_changed: function(flags) {
		// Notify all PlacedItems of the change in our definition, so they
		// can clear cached bounds.
		Base.each(this._instances, function(item) {
			item._changed(flags);
		});
	},

	/**
	 * The symbol definition.
	 *
	 * @type Item
	 * @bean
	 */
	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(item) {
		// Make sure we're not steatling another symbol's definition
		if (item._parentSymbol)
			item = item.clone();
		// Remove previous definition's reference to this symbol
		if (this._definition)
			delete this._definition._parentSymbol;
		this._definition = item;
		// Remove item from DOM, as it's embedded in Symbol now.
		item.remove();
		// Move position to 0, 0, so it's centered when placed.
		item.setPosition(new Point());
		item._parentSymbol = this;
		this._changed(Change.GEOMETRY);
	},

	/**
	 * Places in instance of the symbol in the project.
	 *
	 * @param [position] The position of the placed symbol.
	 * @return {PlacedSymbol}
	 */
	place: function(position) {
		return new PlacedSymbol(this, position);
	},

	/**
	 * Returns a copy of the symbol.
	 *
	 * @return {Symbol}
	 */
	clone: function() {
	 	return new Symbol(this._definition.clone());
	}
});


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var ChangeFlag = {
	// Anything affecting the appearance of an item, including GEOMETRY,
	// STROKE, STYLE and ATTRIBUTE (except for the invisible ones: locked, name)
	APPEARANCE: 1,
	// Change in item hierarchy
	HIERARCHY: 2,
	// Item geometry (path, bounds)
	GEOMETRY: 4,
	// Stroke geometry (excluding color)
	STROKE: 8,
	// Fill style or stroke color / dash
	STYLE: 16,
	// Item attributes: visible, blendMode, locked, name, opacity, clipMask ...
	ATTRIBUTE: 32,
	// Text content
	CONTENT: 64,
	// Raster pixels
	PIXELS: 128,
	// Clipping in one of the child items
	CLIPPING: 256
};

// Shortcuts to often used ChangeFlag values including APPEARANCE
var Change = {
	HIERARCHY: ChangeFlag.HIERARCHY | ChangeFlag.APPEARANCE,
	GEOMETRY: ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	STROKE: ChangeFlag.STROKE | ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
	STYLE: ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
	ATTRIBUTE: ChangeFlag.ATTRIBUTE | ChangeFlag.APPEARANCE,
	CONTENT: ChangeFlag.CONTENT | ChangeFlag.APPEARANCE,
	PIXELS: ChangeFlag.PIXELS | ChangeFlag.APPEARANCE
};

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Item
 *
 * @class The Item type allows you to access and modify the items in
 * Paper.js projects. Its functionality is inherited by different project
 * item types such as {@link Path}, {@link CompoundPath}, {@link Group},
 * {@link Layer} and {@link Raster}. They each add a layer of functionality that
 * is unique to their type, but share the underlying properties and functions
 * that they inherit from Item.
 */
var Item = this.Item = Base.extend(Callback, /** @lends Item# */{
	_events: new function() {

		// Flags defining which native events are required by which Paper events
		// as required for counting amount of necessary natives events.
		// The mapping is native -> virtual
		var mouseFlags = {
			mousedown: {
				mousedown: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mouseup: {
				mouseup: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mousemove: {
				mousedrag: 1,
				mousemove: 1,
				mouseenter: 1,
				mouseleave: 1
			}
		};

		// Entry for all mouse events in the _events list
		var mouseEvent = {
			install: function(type) {
				// If the view requires counting of installed mouse events,
				// increase the counters now according to mouseFlags
				var counters = this._project.view._eventCounters;
				if (counters) {
					for (var key in mouseFlags) {
						counters[key] = (counters[key] || 0)
								+ (mouseFlags[key][type] || 0);
					}
				}
			},
			uninstall: function(type) {
				// If the view requires counting of installed mouse events,
				// decrease the counters now according to mouseFlags
				var counters = this._project.view._eventCounters;
				if (counters) {
					for (var key in mouseFlags)
						counters[key] -= mouseFlags[key][type] || 0;
				}
			}
		};

		var onFrameItems = [];
		function onFrame(event) {
			for (var i = 0, l = onFrameItems.length; i < l; i++)
				onFrameItems[i].fire('frame', event);
		}

		return Base.each(['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onClick',
			'onDoubleClick', 'onMouseMove', 'onMouseEnter', 'onMouseLeave'],
			function(name) {
				this[name] = mouseEvent;
			}, {
				onFrame: {
					install: function() {
						if (!onFrameItems.length)
							this._project.view.attach('frame', onFrame);
						onFrameItems.push(this);
					},
					uninstall: function() {
						onFrameItems.splice(onFrameItems.indexOf(this), 1);
						if (!onFrameItems.length)
							this._project.view.detach('frame', onFrame);
					}
				}
			});
	},

	initialize: function(pointOrMatrix) {
		// Define this Item's unique id.
		this._id = ++Item._id;
		// If _project is already set, the item was already moved into the DOM
		// hierarchy. Used by Layer, where it's added to project.layers instead
		if (!this._project)
			paper.project.activeLayer.addChild(this);
		// TextItem defines its own _style, based on CharacterStyle
		if (!this._style)
			this._style = PathStyle.create(this);
		this.setStyle(this._project.getCurrentStyle());
		this._matrix = pointOrMatrix !== undefined
			? pointOrMatrix instanceof Matrix
				? pointOrMatrix.clone()
				: new Matrix().translate(Point.read(arguments, 0))
			: new Matrix();
	},

	/**
	 * Private notifier that is called whenever a change occurs in this item or
	 * its sub-elements, such as Segments, Curves, PathStyles, etc.
	 *
	 * @param {ChangeFlag} flags describes what exactly has changed.
	 */
	_changed: function(flags) {
		if (flags & ChangeFlag.GEOMETRY) {
			// Clear cached bounds and position whenever geometry changes
			delete this._bounds;
			delete this._position;
		}
		if (this._parent
				&& (flags & (ChangeFlag.GEOMETRY | ChangeFlag.STROKE))) {
			// Clear cached bounds of all items that this item contributes to.
			// We call this on the parent, since the information is cached on
			// the parent, see getBounds().
			this._parent._clearBoundsCache();
		}
		if (flags & ChangeFlag.HIERARCHY) {
			// Clear cached bounds of all items that this item contributes to.
			// We don't call this on the parent, since we're already the parent
			// of the child that modified the hierarchy (that's where these
			// HIERARCHY notifications go)
			this._clearBoundsCache();
		}
		if (flags & ChangeFlag.APPEARANCE) {
			this._project._needsRedraw();
		}
		// If this item is a symbol's definition, notify it of the change too
		if (this._parentSymbol)
			this._parentSymbol._changed(flags);
		// Have project keep track of changed items, so they can be iterated.
		// This can be used for example to update the SVG tree. Needs to be
		// activated in Project
		if (this._project._changes) {
			var entry = this._project._changesById[this._id];
			if (entry) {
				entry.flags |= flags;
			} else {
				entry = { item: this, flags: flags };
				this._project._changesById[this._id] = entry;
				this._project._changes.push(entry);
			}
		}
	},

	/**
	 * The unique id of the item.
	 *
	 * @type Number
	 * @bean
	 */
	getId: function() {
		return this._id;
	},

	/**
	 * The name of the item. If the item has a name, it can be accessed by name
	 * through its parent's children list.
	 *
	 * @type String
	 * @bean
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 * // Set the name of the path:
	 * path.name = 'example';
	 *
	 * // Create a group and add path to it as a child:
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // The path can be accessed by name:
	 * group.children['example'].fillColor = 'red';
	 */
	getName: function() {
		return this._name;
	},

	setName: function(name) {
		// Note: Don't check if the name has changed and bail out if it has not,
		// because setName is used internally also to update internal structures
		// when an item is moved from one parent to another.

		// If the item already had a name, remove the reference to it from the
		// parent's children object:
		if (this._name)
			this._removeFromNamed();
		this._name = name || undefined;
		if (name && this._parent) {
			var children = this._parent._children,
				namedChildren = this._parent._namedChildren;
			(namedChildren[name] = namedChildren[name] || []).push(this);
			children[name] = this;
		}
		this._changed(ChangeFlag.ATTRIBUTE);
	},

	/**
	 * The path style of the item.
	 *
	 * @name Item#getStyle
	 * @type PathStyle
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Applying several styles to an item in one go, by passing an object
	 * // to its style property:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.style = {
	 * 	fillColor: 'blue',
	 * 	strokeColor: 'red',
	 * 	strokeWidth: 5
	 * };
	 *
	 * @example {@paperscript split=true height=100}
	 * // Copying the style of another item:
	 * var path = new Path.Circle(new Point(50, 50), 30);
	 * path.fillColor = 'red';
	 *
	 * var path2 = new Path.Circle(new Point(180, 50), 20);
	 * // Copy the path style of path:
	 * path2.style = path.style;
	 *
	 * @example {@paperscript}
	 * // Applying the same style object to multiple items:
	 * var myStyle = {
	 * 	fillColor: 'red',
	 * 	strokeColor: 'blue',
	 * 	strokeWidth: 4
	 * };
	 *
	 * var path = new Path.Circle(new Point(80, 50), 30);
	 * path.style = myStyle;
	 *
	 * var path2 = new Path.Circle(new Point(150, 50), 20);
	 * path2.style = myStyle;
	 */

	statics: {
		_id: 0
	}
}, Base.each(['locked', 'visible', 'blendMode', 'opacity', 'guide'],
	// Produce getter/setters for properties. We need setters because we want to
	// call _changed() if a property was modified.
	function(name) {
		var part = Base.capitalize(name),
			name = '_' + name;
		this['get' + part] = function() {
			return this[name];
		};
		this['set' + part] = function(value) {
			if (value != this[name]) {
				this[name] = value;
				// #locked does not change appearance, all others do:
				this._changed(name === '_locked'
						? ChangeFlag.ATTRIBUTE : Change.ATTRIBUTE);
			}
		};
}, {}), /** @lends Item# */{
	// Note: These properties have their getter / setters produced in the
	// injection scope above.

	/**
	 * Specifies whether the item is locked.
	 *
	 * @name Item#locked
	 * @type Boolean
	 * @default false
	 * @ignore
	 */
	_locked: false,

	/**
	 * Specifies whether the item is visible. When set to {@code false}, the
	 * item won't be drawn.
	 *
	 * @name Item#visible
	 * @type Boolean
	 * @default true
	 *
	 * @example {@paperscript}
	 * // Hiding an item:
	 * var path = new Path.Circle(new Point(50, 50), 20);
	 * path.fillColor = 'red';
	 *
	 * // Hide the path:
	 * path.visible = false;
	 */
	_visible: true,

	/**
	 * The blend mode of the item.
	 *
	 * @name Item#blendMode
	 * @type String('normal', 'multiply', 'screen', 'overlay', 'soft-light',
	 * 'hard-light', 'color-dodge', 'color-burn', 'darken', 'lighten',
	 * 'difference', 'exclusion', 'hue', 'saturation', 'luminosity', 'color',
	 * 'add', 'subtract', 'average', 'pin-light', 'negation')
	 * @default 'normal'
	 *
	 * @example {@paperscript}
	 * // Setting an item's blend mode:
	 *
	 * // Create a white rectangle in the background
	 * // with the same dimensions as the view:
	 * var background = new Path.Rectangle(view.bounds);
	 * background.fillColor = 'white';
	 *
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 * circle.fillColor = 'red';
	 *
	 * var circle2 = new Path.Circle(new Point(120, 50), 35);
	 * circle2.fillColor = 'blue';
	 *
	 * // Set the blend mode of circle2:
	 * circle2.blendMode = 'multiply';
	 */
	_blendMode: 'normal',

	/**
	 * The opacity of the item as a value between {@code 0} and {@code 1}.
	 *
	 * @name Item#opacity
	 * @type Number
	 * @default 1
	 *
	 * @example {@paperscript}
	 * // Making an item 50% transparent:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 * circle.fillColor = 'red';
     *
	 * var circle2 = new Path.Circle(new Point(120, 50), 35);
	 * circle2.style = {
	 * 	fillColor: 'blue',
	 * 	strokeColor: 'green',
	 * 	strokeWidth: 10
	 * };
	 *
	 * // Make circle2 50% transparent:
	 * circle2.opacity = 0.5;
	 */
	_opacity: 1,

	// TODO: Implement guides
	/**
	 * Specifies whether the item functions as a guide. When set to
	 * {@code true}, the item will be drawn at the end as a guide.
	 *
	 * @name Item#guide
	 * @type Number
	 * @default 1
	 */
	_guide: false,

	/**
	 * Specifies whether an item is selected and will also return {@code true}
	 * if the item is partially selected (groups with some selected or partially
	 * selected paths).
	 *
	 * Paper.js draws the visual outlines of selected items on top of your
	 * project. This can be useful for debugging, as it allows you to see the
	 * construction of paths, position of path curves, individual segment points
	 * and bounding boxes of symbol and raster items.
	 *
	 * @type Boolean
	 * @default false
	 * @bean
	 * @see Project#selectedItems
	 * @see Segment#selected
	 * @see Point#selected
	 *
	 * @example {@paperscript}
	 * // Selecting an item:
	 * var path = new Path.Circle(new Size(80, 50), 35);
	 * path.selected = true; // Select the path
	 */
	isSelected: function() {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (this._children[i].isSelected())
					return true;
		}
		return this._selected;
	},

	setSelected: function(selected /*, noChildren */) {
		// Don't recursively call #setSelected() if it was called with
		// noChildren set to true, see #setFullySelected().
		if (this._children && !arguments[1]) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].setSelected(selected);
		} else if ((selected = !!selected) != this._selected) {
			this._selected = selected;
			this._project._updateSelection(this);
			this._changed(Change.ATTRIBUTE);
		}
	},

	_selected: false,

	isFullySelected: function() {
		if (this._children && this._selected) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (!this._children[i].isFullySelected())
					return false;
			return true;
		}
		// If there are no children, this is the same as #selected
		return this._selected;
	},

	setFullySelected: function(selected) {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].setFullySelected(selected);
		}
		// Pass true for hidden noChildren argument
		this.setSelected(selected, true);
	},

	/**
	 * Specifies whether the item defines a clip mask. This can only be set on
	 * paths, compound paths, and text frame objects, and only if the item is
	 * already contained within a clipping group.
	 *
	 * @type Boolean
	 * @default false
	 * @bean
	 */
	isClipMask: function() {
		return this._clipMask;
	},

	setClipMask: function(clipMask) {
		// On-the-fly conversion to boolean:
		if (this._clipMask != (clipMask = !!clipMask)) {
			this._clipMask = clipMask;
			if (clipMask) {
				this.setFillColor(null);
				this.setStrokeColor(null);
			}
			this._changed(Change.ATTRIBUTE);
			// Tell the parent the clipping mask has changed
			if (this._parent)
				this._parent._changed(ChangeFlag.CLIPPING);
		}
	},

	_clipMask: false,

	// TODO: get/setIsolated (print specific feature)
	// TODO: get/setKnockout (print specific feature)
	// TODO: get/setAlphaIsShape
	// TODO: get/setData

	/**
	 * {@grouptitle Position and Bounding Boxes}
	 *
	 * The item's position within the project. This is the
	 * {@link Rectangle#center} of the item's {@link #bounds} rectangle.
	 *
	 * @type Point
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Changing the position of a path:
	 *
	 * // Create a circle at position { x: 10, y: 10 }
	 * var circle = new Path.Circle(new Point(10, 10), 10);
	 * circle.fillColor = 'red';
	 *
	 * // Move the circle to { x: 20, y: 20 }
	 * circle.position = new Point(20, 20);
	 *
	 * // Move the circle 100 points to the right and 50 points down
	 * circle.position += new Point(100, 50);
	 *
	 * @example {@paperscript split=true height=100}
	 * // Changing the x coordinate of an item's position:
	 *
	 * // Create a circle at position { x: 20, y: 20 }
	 * var circle = new Path.Circle(new Point(20, 20), 10);
	 * circle.fillColor = 'red';
	 *
	 * // Move the circle 100 points to the right
	 * circle.position.x += 100;
	 */
	getPosition: function(/* dontLink */) {
		// Cache position value.
		// Pass true for dontLink in getCenter(), so receive back a normal point
		var pos = this._position
				|| (this._position = this.getBounds().getCenter(true));
		// Do not cache LinkedPoints directly, since we would not be able to
		// use them to calculate the difference in #setPosition, as when it is
		// modified, it would hold new values already and only then cause the
		// calling of #setPosition.
		return arguments[0] ? pos
				: LinkedPoint.create(this, 'setPosition', pos.x, pos.y);
	},

	setPosition: function(point) {
		// Calculate the distance to the current position, by which to
		// translate the item. Pass true for dontLink, as we do not need a
		// LinkedPoint to simply calculate this distance.
		this.translate(Point.read(arguments).subtract(this.getPosition(true)));
	},

	/**
	 * The item's transformation matrix, defining position and dimensions in the
	 * document.
	 *
	 * @type Matrix
	 * @bean
	 */
	getMatrix: function() {
		return this._matrix;
	},

	setMatrix: function(matrix) {
		// Use Matrix#initialize to easily copy over values.
		this._matrix.initialize(matrix);
		this._changed(Change.GEOMETRY);
	}
}, Base.each(['bounds', 'strokeBounds', 'handleBounds', 'roughBounds'],
function(name) {
	// Produce getters for bounds properties. These handle caching, matrices
	// and redirect the call to the private _getBounds, which can be
	// overridden by subclasses, see below.
	this['get' + Base.capitalize(name)] = function(/* matrix */) {
		var type = this._boundsType,
			bounds = this._getCachedBounds(
				// Allow subclasses to override _boundsType if they use the same
				// calculations for multiple types. The default is name:
				typeof type == 'string' ? type : type && type[name] || name,
				// Pass on the optional matrix
				arguments[0]);
		// If we're returning 'bounds', create a LinkedRectangle that uses the
		// setBounds() setter to update the Item whenever the bounds are
		// changed:
		return name == 'bounds' ? LinkedRectangle.create(this, 'setBounds',
				bounds.x, bounds.y, bounds.width, bounds.height) : bounds;
	};
}, /** @lends Item# */{
	/**
	 * Private method that deals with the calling of _getBounds, recursive
	 * matrix concatenation and handles all the complicated caching mechanisms.
	 */
	_getCachedBounds: function(type, matrix, cacheItem) {
		// See if we can cache these bounds. We only cache the bounds
		// transformed with the internally stored _matrix, (the default if no
		// matrix is passed).
		var cache = (!matrix || matrix.equals(this._matrix)) && type;
		// Set up a boundsCache structure that keeps track of items that keep
		// cached bounds that depend on this item. We store this in our parent,
		// for multiple reasons:
		// The parent receives HIERARCHY change notifications for when its
		// children are added or removed and can thus clear the cache, and we
		// save a lot of memory, e.g. when grouping 100 items and asking the
		// group for its bounds. If stored on the children, we would have 100
		// times the same structure.
		// Note: This needs to happen before returning cached values, since even
		// then, _boundsCache needs to be kept up-to-date.
		if (cacheItem && this._parent) {
			// Set-up the parent's boundsCache structure if it does not
			// exist yet and add the cacheItem to it.
			var id = cacheItem._id,
				ref = this._parent._boundsCache
					= this._parent._boundsCache || {
				// Use both a hashtable for ids and an array for the list,
				// so we can keep track of items that were added already
				ids: {},
				list: []
			};
			if (!ref.ids[id]) {
				ref.list.push(cacheItem);
				ref.ids[id] = cacheItem;
			}
		}
		if (cache && this._bounds && this._bounds[cache])
			return this._bounds[cache];
		// If the result of concatinating the passed matrix with our internal
		// one is an identity transformation, set it to null for faster
		// processing
		var identity = this._matrix.isIdentity();
		matrix = !matrix || matrix.isIdentity()
				? identity ? null : this._matrix
				: identity ? matrix : matrix.clone().concatenate(this._matrix);
		// If we're caching bounds on this item, pass it on as cacheItem, so the
		// children can setup the _boundsCache structures for it.
		var bounds = this._getBounds(type, matrix, cache ? this : cacheItem);
		// If we can cache the result, update the _bounds cache structure
		// before returning
		if (cache) {
			if (!this._bounds)
				this._bounds = {};
			// Put a separate instance into the cache, so modifications of the
			// returned one won't affect it.
			this._bounds[cache] = bounds.clone();
		}
		return bounds;
	},

	/**
	 * Clears cached bounds of all items that the children of this item are
	 * contributing to. See #_getCachedBounds() for an explanation why this
	 * information is stored on parents, not the children themselves.
	 */
	_clearBoundsCache: function() {
		if (this._boundsCache) {
			for (var i = 0, list = this._boundsCache.list, l = list.length;
					i < l; i++) {
				var item = list[i];
				delete item._bounds;
				// We need to recursively call _clearBoundsCache, because if the
				// cache for this item's children is not valid anymore, that
				// propagates up the DOM tree.
				if (item != this && item._boundsCache)
					item._clearBoundsCache();
			}
			delete this._boundsCache;
		}
	},

	/**
	 * Protected method used in all the bounds getters. It loops through all the
	 * children, gets their bounds and finds the bounds around all of them.
	 * Subclasses override it to define calculations for the various required
	 * bounding types.
	 */
	_getBounds: function(type, matrix, cacheItem) {
		// Note: We cannot cache these results here, since we do not get
		// _changed() notifications here for changing geometry in children.
		// But cacheName is used in sub-classes such as PlacedItem.
		var children = this._children;
		// TODO: What to return if nothing is defined, e.g. empty Groups?
		// Scriptographer behaves weirdly then too.
		if (!children || children.length == 0)
			return new Rectangle();
		var x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			if (child._visible) {
				var rect = child._getCachedBounds(type, matrix, cacheItem);
				x1 = Math.min(rect.x, x1);
				y1 = Math.min(rect.y, y1);
				x2 = Math.max(rect.x + rect.width, x2);
				y2 = Math.max(rect.y + rect.height, y2);
			}
		}
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	setBounds: function(rect) {
		rect = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			matrix = new Matrix(),
			center = rect.getCenter();
		// Read this from bottom to top:
		// Translate to new center:
		matrix.translate(center);
		// Scale to new Size, if size changes and avoid divisions by 0:
		if (rect.width != bounds.width || rect.height != bounds.height) {
			matrix.scale(
					bounds.width != 0 ? rect.width / bounds.width : 1,
					bounds.height != 0 ? rect.height / bounds.height : 1);
		}
		// Translate to bounds center:
		center = bounds.getCenter();
		matrix.translate(-center.x, -center.y);
		// Now execute the transformation
		// TODO: do we need to apply too, or just change the matrix?
		this.transform(matrix);
	}

	/**
	 * The bounding rectangle of the item excluding stroke width.
	 *
	 * @name Item#getBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The bounding rectangle of the item including stroke width.
	 *
	 * @name Item#getStrokeBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The bounding rectangle of the item including handles.
	 *
	 * @name Item#getHandleBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The rough bounding rectangle of the item that is shure to include all of
	 * the drawing, including stroke width.
	 *
	 * @name Item#getRoughBounds
	 * @type Rectangle
	 * @bean
	 * @ignore
	 */
}), /** @lends Item# */{
	/**
	 * {@grouptitle Project Hierarchy}
	 * The project that this item belongs to.
	 *
	 * @type Project
	 * @bean
	 */
	getProject: function() {
		return this._project;
	},

	_setProject: function(project) {
		if (this._project != project) {
			this._project = project;
			if (this._children) {
				for (var i = 0, l = this._children.length; i < l; i++) {
					this._children[i]._setProject(project);
				}
			}
		}
	},

	/**
	 * The layer that this item is contained within.
	 *
	 * @type Layer
	 * @bean
	 */
	getLayer: function() {
		var parent = this;
		while (parent = parent._parent) {
			if (parent instanceof Layer)
				return parent;
		}
		return null;
	},

	/**
	 * The item that this item is contained within.
	 *
	 * @type Item
	 * @bean
	 *
	 * @example
	 * var path = new Path();
	 *
	 * // New items are placed in the active layer:
	 * console.log(path.parent == project.activeLayer); // true
	 *
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // Now the parent of the path has become the group:
	 * console.log(path.parent == group); // true
	 */
	getParent: function() {
		return this._parent;
	},

	/**
	 * The children items contained within this item. Items that define a
	 * {@link #name} can also be accessed by name.
	 *
	 * <b>Please note:</b> The children array should not be modified directly
	 * using array functions. To remove single items from the children list, use
	 * {@link Item#remove()}, to remove all items from the children list, use
	 * {@link Item#removeChildren()}. To add items to the children list, use
	 * {@link Item#addChild(item)} or {@link Item#insertChild(index,item)}.
	 *
	 * @type Item[]
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Accessing items in the children array:
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Create a group and move the path into it:
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // Access the path through the group's children array:
	 * group.children[0].fillColor = 'red';
	 *
	 * @example {@paperscript}
	 * // Accessing children by name:
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 * // Set the name of the path:
	 * path.name = 'example';
	 *
	 * // Create a group and move the path into it:
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // The path can be accessed by name:
	 * group.children['example'].fillColor = 'orange';
	 *
	 * @example {@paperscript}
	 * // Passing an array of items to item.children:
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 *
	 * var group = new Group();
	 * group.children = [path];
	 *
	 * // The path is the first child of the group:
	 * group.firstChild.fillColor = 'green';
	 */
	getChildren: function() {
		return this._children;
	},

	setChildren: function(items) {
		this.removeChildren();
		this.addChildren(items);
	},

	/**
	 * The first item contained within this item. This is a shortcut for
	 * accessing {@code item.children[0]}.
	 *
	 * @type Item
	 * @bean
	 */
	getFirstChild: function() {
		return this._children && this._children[0] || null;
	},

	/**
	 * The last item contained within this item.This is a shortcut for
	 * accessing {@code item.children[item.children.length - 1]}.
	 *
	 * @type Item
	 * @bean
	 */
	getLastChild: function() {
		return this._children && this._children[this._children.length - 1]
				|| null;
	},

	/**
	 * The next item on the same level as this item.
	 *
	 * @type Item
	 * @bean
	 */
	getNextSibling: function() {
		return this._parent && this._parent._children[this._index + 1] || null;
	},

	/**
	 * The previous item on the same level as this item.
	 *
	 * @type Item
	 * @bean
	 */
	getPreviousSibling: function() {
		return this._parent && this._parent._children[this._index - 1] || null;
	},

	/**
	 * The index of this item within the list of its parent's children.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index;
	},

	/**
	 * Clones the item within the same project and places the copy above the
	 * item.
	 *
	 * @return {Item} the newly cloned item
	 *
	 * @example {@paperscript}
	 * // Cloning items:
	 * var circle = new Path.Circle(new Point(50, 50), 10);
	 * circle.fillColor = 'red';
	 *
	 * // Make 20 copies of the circle:
	 * for (var i = 0; i < 20; i++) {
	 * 	var copy = circle.clone();
	 *
	 * 	// Distribute the copies horizontally, so we can see them:
	 * 	copy.position.x += i * copy.bounds.width;
	 * }
	 */
	clone: function() {
		return this._clone(new this.constructor());
	},

	_clone: function(copy) {
		// Copy over style
		copy.setStyle(this._style);
		// If this item has children, clone and append each of them:
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				copy.addChild(this._children[i].clone());
		}
		// Only copy over these fields if they are actually defined in 'this'
		// TODO: Consider moving this to Base once it's useful in more than one
		// place
		var keys = ['_locked', '_visible', '_blendMode', '_opacity',
				'_clipMask', '_guide'];
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			if (this.hasOwnProperty(key))
				copy[key] = this[key];
		}
		// Use Matrix#initialize to easily copy over values.
		copy._matrix.initialize(this._matrix);
		// Copy over the selection state, use setSelected so the item
		// is also added to Project#selectedItems if it is selected.
		copy.setSelected(this._selected);
		// Only set name once the copy is moved, to avoid setting and unsettting
		// name related structures.
		if (this._name)
			copy.setName(this._name);
		return copy;
	},

	/**
	 * When passed a project, copies the item to the project,
	 * or duplicates it within the same project. When passed an item,
	 * copies the item into the specified item.
	 *
	 * @param {Project|Layer|Group|CompoundPath} item the item or project to
	 * copy the item to
	 * @return {Item} the new copy of the item
	 */
	copyTo: function(itemOrProject) {
		var copy = this.clone();
		if (itemOrProject.layers) {
			itemOrProject.activeLayer.addChild(copy);
		} else {
			itemOrProject.addChild(copy);
		}
		return copy;
	},

	/**
	 * Rasterizes the item into a newly created Raster object. The item itself
	 * is not removed after rasterization.
	 *
	 * @param {Number} [resolution=72] the resolution of the raster in dpi
	 * @return {Raster} the newly created raster item
	 *
	 * @example {@paperscript}
	 * // Rasterizing an item:
	 * var circle = new Path.Circle(new Point(80, 50), 5);
	 * circle.fillColor = 'red';
	 *
	 * // Create a rasterized version of the path:
	 * var raster = circle.rasterize();
	 *
	 * // Move it 100pt to the right:
	 * raster.position.x += 100;
	 *
	 * // Scale the path and the raster by 300%, so we can compare them:
	 * circle.scale(5);
	 * raster.scale(5);
	 */
	rasterize: function(resolution) {
		var bounds = this.getStrokeBounds(),
			scale = (resolution || 72) / 72,
			canvas = CanvasProvider.getCanvas(bounds.getSize().multiply(scale)),
			ctx = canvas.getContext('2d'),
			matrix = new Matrix().scale(scale).translate(-bounds.x, -bounds.y);
		matrix.applyToContext(ctx);
		// XXX: Decide how to handle _matrix
		this.draw(ctx, {});
		var raster = new Raster(canvas);
		raster.setBounds(bounds);
		return raster;
	},

	/**
	 * Perform a hit test on the item (and its children, if it is a
	 * {@link Group} or {@link Layer}) at the location of the specified point.
	 * 
	 * The optional options object allows you to control the specifics of the
	 * hit test and may contain a combination of the following values:
	 * <b>tolerance:</b> {@code Number} - The tolerance of the hit test in
	 * points.
	 * <b>options.type:</b> Only hit test again a certain item
	 * type: {@link PathItem}, {@link Raster}, {@link TextItem}, etc.
	 * <b>options.fill:</b> {@code Boolean} - Hit test the fill of items.
	 * <b>options.stroke:</b> {@code Boolean} - Hit test the curves of path
	 * items, taking into account stroke width.
	 * <b>options.segment:</b> {@code Boolean} - Hit test for
	 * {@link Segment#point} of {@link Path} items.
	 * <b>options.handles:</b> {@code Boolean} - Hit test for the handles
	 * ({@link Segment#handleIn} / {@link Segment#handleOut}) of path segments.
	 * <b>options.ends:</b> {@code Boolean} - Only hit test for the first or
	 * last segment points of open path items.
	 * <b>options.bounds:</b> {@code Boolean} - Hit test the corners and
	 * side-centers of the bounding rectangle of items ({@link Item#bounds}).
	 * <b>options.center:</b> {@code Boolean} - Hit test the
	 * {@link Rectangle#center} of the bounding rectangle of items
	 * ({@link Item#bounds}).
	 * <b>options.guide:</b> {@code Boolean} - Hit test items that have
	 * {@link Item#guide} set to {@code true}.
	 * <b>options.selected:</b> {@code Boolean} - Only hit selected items.
	 *
	 * @param {Point} point The point where the hit test should be performed
	 * @param {Object} [options={ fill: true, stroke: true, segments: true,
	 * tolerance: 2 }]
	 * @return {HitResult} A hit result object that contains more
	 * information about what exactly was hit or {@code null} if nothing was
	 * hit.
	 */
	hitTest: function(point, options) {
		options = HitResult.getOptions(point, options);
		point = options.point = this._matrix._inverseTransform(options.point);
		// Check if the point is withing roughBounds + tolerance, but only if
		// this item does not have children, since we'd have to travel up the
		// chain already to determine the rough bounds.
		if (!this._children && !this.getRoughBounds()
				.expand(options.tolerance)._containsPoint(point))
			return null;
		if ((options.center || options.bounds) &&
				// Ignore top level layers:
				!(this instanceof Layer && !this._parent)) {
			// Don't get the transformed bounds, check against transformed
			// points instead
			var bounds = this.getBounds(),
				that = this,
				// TODO: Move these into a private scope
				points = ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
				'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
				res;
			function checkBounds(type, part) {
				var pt = bounds['get' + part]();
				// TODO: We need to transform the point back to the coordinate
				// system of the DOM level on which the inquiry was started!
				if (point.getDistance(pt) < options.tolerance)
					return new HitResult(type, that,
							{ name: Base.hyphenate(part), point: pt });
			}
			if (options.center && (res = checkBounds('center', 'Center')))
				return res;
			if (options.bounds) {
				for (var i = 0; i < 8; i++)
					if (res = checkBounds('bounds', points[i]))
						return res;
			}
		}

		// TODO: Support option.type even for things like CompoundPath where
		// children are matched but the parent is returned.

		// Filter for guides or selected items if that's required
		return this._children || !(options.guides && !this._guide
				|| options.selected && !this._selected)
					? this._hitTest(point, options) : null;
	},

	_hitTest: function(point, options) {
		if (this._children) {
			// Loop backwards, so items that get drawn last are tested first
			for (var i = this._children.length - 1; i >= 0; i--) {
				var res = this._children[i].hitTest(point, options);
				if (res) return res;
			}
		}
	},

	/**
	 * {@grouptitle Hierarchy Operations}
	 * Adds the specified item as a child of this item at the end of the
	 * its children list. You can use this function for groups, compound
	 * paths and layers.
	 *
	 * @param {Item} item The item to be added as a child
	 */
	addChild: function(item) {
		return this.insertChild(undefined, item);
	},

	/**
	 * Inserts the specified item as a child of this item at the specified
	 * index in its {@link #children} list. You can use this function for
	 * groups, compound paths and layers.
	 *
	 * @param {Number} index
	 * @param {Item} item The item to be appended as a child
	 */
	insertChild: function(index, item) {
		if (this._children) {
			item._remove(false, true);
			Base.splice(this._children, [item], index, 0);
			item._parent = this;
			item._setProject(this._project);
			// Setting the name again makes sure all name lookup structures are
			// kept in sync.
			if (item._name)
				item.setName(item._name);
			this._changed(Change.HIERARCHY);
			return true;
		}
		return false;
	},

	/**
	 * Adds the specified items as children of this item at the end of the
	 * its children list. You can use this function for groups, compound
	 * paths and layers.
	 *
	 * @param {item[]} items The items to be added as children
	 */
	addChildren: function(items) {
		for (var i = 0, l = items && items.length; i < l; i++)
			this.insertChild(undefined, items[i]);
	},

	/**
	 * Inserts the specified items as children of this item at the specified
	 * index in its {@link #children} list. You can use this function for
	 * groups, compound paths and layers.
	 *
	 * @param {Number} index
	 * @param {Item[]} items The items to be appended as children
	 */
	insertChildren: function(index, items) {
		for (var i = 0, l = items && items.length; i < l; i++) {
			if (this.insertChild(index, items[i]))
				index++;
		}
	},

	/**
	 * Inserts this item above the specified item.
	 *
	 * @param {Item} item The item above which it should be moved
	 * @return {Boolean} {@true it was inserted}
	 */
	insertAbove: function(item) {
		var index = item._index;
		if (item._parent == this._parent && index < this._index)
			 index++;
		return item._parent.insertChild(index, this);
	},

	/**
	 * Inserts this item below the specified item.
	 *
	 * @param {Item} item The item above which it should be moved
	 * @return {Boolean} {@true it was inserted}
	 */
	insertBelow: function(item) {
		var index = item._index;
		if (item._parent == this._parent && index > this._index)
			 index--;
		return item._parent.insertChild(index, this);
	},

	/**
	 * Inserts the specified item as a child of this item by appending it to
	 * the list of children and moving it above all other children. You can
	 * use this function for groups, compound paths and layers.
	 *
	 * @param {Item} item The item to be appended as a child
	 * @deprecated use {@link #addChild(item)} instead.
	 */
	appendTop: function(item) {
		return this.addChild(item);
	},

	/**
	 * Inserts the specified item as a child of this item by appending it to
	 * the list of children and moving it below all other children. You can
	 * use this function for groups, compound paths and layers.
	 *
	 * @param {Item} item The item to be appended as a child
	 * @deprecated use {@link #insertChild(index, item)} instead.
	 */
	appendBottom: function(item) {
		return this.insertChild(0, item);
	},

	/**
	 * Moves this item above the specified item.
	 *
	 * @param {Item} item The item above which it should be moved
	 * @return {Boolean} {@true it was moved}
	 * @deprecated use {@link #insertAbove(item)} instead.
	 */
	moveAbove: function(item) {
		return this.insertAbove(item);
	},

	/**
	 * Moves the item below the specified item.
	 *
	 * @param {Item} item the item below which it should be moved
	 * @return {Boolean} {@true it was moved}
	 * @deprecated use {@link #insertBelow(item)} instead.
	 */
	moveBelow: function(item) {
		return this.insertBelow(item);
	},

	/**
	* Removes the item from its parent's named children list.
	*/
	_removeFromNamed: function() {
		var children = this._parent._children,
			namedChildren = this._parent._namedChildren,
			name = this._name,
			namedArray = namedChildren[name],
			index = namedArray ? namedArray.indexOf(this) : -1;
		if (index == -1)
			return;
		// Remove the named reference
		if (children[name] == this)
			delete children[name];
		// Remove this entry
		namedArray.splice(index, 1);
		// If there are any items left in the named array, set
		// the last of them to be this.parent.children[this.name]
		if (namedArray.length) {
			children[name] = namedArray[namedArray.length - 1];
		} else {
			// Otherwise delete the empty array
			delete namedChildren[name];
		}
	},

	/**
	* Removes the item from its parent's children list.
	*/
	_remove: function(deselect, notify) {
		if (this._parent) {
			if (deselect)
				this.setSelected(false);
			if (this._name)
				this._removeFromNamed();
			if (this._index != null)
				Base.splice(this._parent._children, null, this._index, 1);
			// Notify parent of changed hierarchy
			if (notify)
				this._parent._changed(Change.HIERARCHY);
			this._parent = null;
			return true;
		}
		return false;
	},

	/**
	* Removes the item from the project. If the item has children, they are also
	* removed.
	*
	* @return {Boolean} {@true the item was removed}
	*/
	remove: function() {
		return this._remove(true, true);
	},

	/**
	 * Removes all of the item's {@link #children} (if any).
	 *
	 * @name Item#removeChildren
	 * @function
	 * @return {Item[]} an array containing the removed items
	 */
	/**
	 * Removes the children from the specified {@code from} index to the
	 * {@code to} index from the parent's {@link #children} array.
	 *
	 * @name Item#removeChildren
	 * @function
	 * @param {Number} from the beginning index, inclusive
	 * @param {Number} [to=children.length] the ending index, exclusive
	 * @return {Item[]} an array containing the removed items
	 */
	removeChildren: function(from, to) {
		if (!this._children)
			return null;
		from = from || 0;
		to = Base.pick(to, this._children.length);
		// Use Base.splice(), wich adjusts #_index for the items above, and
		// deletes it for the removed items. Calling #_remove() afterwards is
		// fine, since it only calls Base.splice() if #_index is set.
		var removed = Base.splice(this._children, null, from, to - from);
		for (var i = removed.length - 1; i >= 0; i--)
			removed[i]._remove(true, false);
		if (removed.length > 0)
			this._changed(Change.HIERARCHY);
		return removed;
	},

	/**
	 * Reverses the order of the item's children
	 */
	reverseChildren: function() {
		if (this._children) {
			this._children.reverse();
			// Adjust inidces
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i]._index = i;
			this._changed(Change.HIERARCHY);
		}
	},

	// TODO: Item#isEditable is currently ignored in the documentation, as
	// locking an item currently has no effect
	/**
	 * {@grouptitle Tests}
	 * Checks whether the item is editable.
	 *
	 * @return {Boolean} {@true when neither the item, nor its parents are
	 * locked or hidden}
	 * @ignore
	 */
	isEditable: function() {
		var item = this;
		while (item) {
			if (!item._visible || item._locked)
				return false;
			item = item._parent;
		}
		return true;
	},

	/**
	 * Checks whether the item is valid, i.e. it hasn't been removed.
	 *
	 * @return {Boolean} {@true the item is valid}
	 */
	// TODO: isValid / checkValid

	/**
	 * Returns -1 if 'this' is above 'item', 1 if below, 0 if their order is not
	 * defined in such a way, e.g. if one is a descendant of the other.
	 */
	_getOrder: function(item) {
		// Private method that produces a list of anchestors, starting with the
		// root and ending with the actual element as the last entry.
		function getList(item) {
			var list = [];
			do {
				list.unshift(item);
			} while (item = item._parent)
			return list;
		}
		var list1 = getList(this),
			list2 = getList(item);
		for (var i = 0, l = Math.min(list1.length, list2.length); i < l; i++) {
			if (list1[i] != list2[i]) {
				// Found the position in the parents list where the two start
				// to differ. Look at who's above who.
				return list1[i]._index < list2[i]._index ? 1 : -1;
			}
		}
		return 0;
	},

	/**
	 * {@grouptitle Hierarchy Tests}
	 *
	 * Checks if the item contains any children items.
	 *
	 * @return {Boolean} {@true it has one or more children}
	 */
	hasChildren: function() {
		return this._children && this._children.length > 0;
	},

	/**
	 * Checks if this item is above the specified item in the stacking order
	 * of the project.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is above the specified item}
	 */
	isAbove: function(item) {
		return this._getOrder(item) == -1;
	},

	/**
	 * Checks if the item is below the specified item in the stacking order of
	 * the project.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is below the specified item}
	 */
	isBelow: function(item) {
		return this._getOrder(item) == 1;
	},

	/**
	 * Checks whether the specified item is the parent of the item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is the parent of the item}
	 */
	isParent: function(item) {
		return this._parent == item;
	},

	/**
	 * Checks whether the specified item is a child of the item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true it is a child of the item}
	 */
	isChild: function(item) {
		return item && item._parent == this;
	},

	/**
	 * Checks if the item is contained within the specified item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is inside the specified item}
	 */
	isDescendant: function(item) {
		var parent = this;
		while (parent = parent._parent) {
			if (parent == item)
				return true;
		}
		return false;
	},

	/**
	 * Checks if the item is an ancestor of the specified item.
	 *
	 * @param {Item} item the item to check against
	 * @return {Boolean} {@true if the item is an ancestor of the specified
	 * item}
	 */
	isAncestor: function(item) {
		return item ? item.isDescendant(this) : false;
	},

	/**
	 * Checks whether the item is grouped with the specified item.
	 *
	 * @param {Item} item
	 * @return {Boolean} {@true if the items are grouped together}
	 */
	isGroupedWith: function(item) {
		var parent = this._parent;
		while (parent) {
			// Find group parents. Check for parent._parent, since don't want
			// top level layers, because they also inherit from Group
			if (parent._parent
				&& (parent instanceof Group || parent instanceof CompoundPath)
				&& item.isDescendant(parent))
					return true;
			// Keep walking up otherwise
			parent = parent._parent;
		}
		return false;
	},

	// Document all style properties which get injected into Item by Style:

	/**
	 * {@grouptitle Stroke Style}
	 *
	 * The color of the stroke.
	 *
	 * @name Item#strokeColor
	 * @property
	 * @type RgbColor|HsbColor|HslColor|GrayColor
	 *
	 * @example {@paperscript}
	 * // Setting the stroke color of a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set its stroke color to RGB red:
	 * circle.strokeColor = new RgbColor(1, 0, 0);
	 */

	/**
	 * The width of the stroke.
	 *
	 * @name Item#strokeWidth
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Setting an item's stroke width:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set its stroke color to black:
	 * circle.strokeColor = 'black';
	 *
	 * // Set its stroke width to 10:
	 * circle.strokeWidth = 10;
	 */

	/**
	 * The shape to be used at the end of open {@link Path} items, when they
	 * have a stroke.
	 *
	 * @name Item#strokeCap
	 * @property
	 * @default 'butt'
	 * @type String('round', 'square', 'butt')
	 *
	 * @example {@paperscript height=200}
	 * // A look at the different stroke caps:
	 *
	 * var line = new Path(new Point(80, 50), new Point(420, 50));
	 * line.strokeColor = 'black';
	 * line.strokeWidth = 20;
	 *
	 * // Select the path, so we can see where the stroke is formed:
	 * line.selected = true;
	 *
	 * // Set the stroke cap of the line to be round:
	 * line.strokeCap = 'round';
	 *
	 * // Copy the path and set its stroke cap to be square:
	 * var line2 = line.clone();
	 * line2.position.y += 50;
	 * line2.strokeCap = 'square';
	 *
	 * // Make another copy and set its stroke cap to be butt:
	 * var line2 = line.clone();
	 * line2.position.y += 100;
	 * line2.strokeCap = 'butt';
	 */

	/**
	 * The shape to be used at the corners of paths when they have a stroke.
	 *
	 * @name Item#strokeJoin
	 * @property
	 * @default 'miter'
	 * @type String ('miter', 'round', 'bevel')
	 *
	 *
	 * @example {@paperscript height=120}
	 * // A look at the different stroke joins:
	 * var path = new Path();
	 * path.add(new Point(80, 100));
	 * path.add(new Point(120, 40));
	 * path.add(new Point(160, 100));
	 * path.strokeColor = 'black';
	 * path.strokeWidth = 20;
	 *
	 * // Select the path, so we can see where the stroke is formed:
	 * path.selected = true;
     *
	 * var path2 = path.clone();
	 * path2.position.x += path2.bounds.width * 1.5;
	 * path2.strokeJoin = 'round';
     *
	 * var path3 = path2.clone();
	 * path3.position.x += path3.bounds.width * 1.5;
	 * path3.strokeJoin = 'bevel';
	 */

	/**
	 * The dash offset of the stroke.
	 *
	 * @name Item#dashOffset
	 * @property
	 * @default 0
	 * @type Number
	 */

	/**
	 * Specifies an array containing the dash and gap lengths of the stroke.
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle(new Point(80, 50), 40);
	 * path.strokeWidth = 2;
	 * path.strokeColor = 'black';
	 *
	 * // Set the dashed stroke to [10pt dash, 4pt gap]:
	 * path.dashArray = [10, 4];
	 *
	 * @name Item#dashArray
	 * @property
	 * @default []
	 * @type Array
	 */

	/**
	 * The miter limit of the stroke.
	 * When two line segments meet at a sharp angle and miter joins have been
	 * specified for {@link Item#strokeJoin}, it is possible for the miter to
	 * extend far beyond the {@link Item#strokeWidth} of the path. The
	 * miterLimit imposes a limit on the ratio of the miter length to the
	 * {@link Item#strokeWidth}.
	 *
	 * @default 10
	 * @property
	 * @name Item#miterLimit
	 * @type Number
	 */

	/**
	 * {@grouptitle Fill Style}
	 *
	 * The fill color of the item.
	 *
	 * @name Item#fillColor
	 * @property
	 * @type RgbColor|HsbColor|HslColor|GrayColor
	 *
	 * @example {@paperscript}
	 * // Setting the fill color of a path to red:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set the fill color of the circle to RGB red:
	 * circle.fillColor = new RgbColor(1, 0, 0);
	 */

	// DOCS: Document the different arguments that this function can receive.
	// DOCS: Document the apply parameter in all transform functions.
	/**
	 * {@grouptitle Transform Functions}
	 *
	 * Scales the item by the given value from its center point, or optionally
	 * from a supplied point.
	 *
	 * @name Item#scale
	 * @function
	 * @param {Number} scale the scale factor
	 * @param {Point} [center={@link Item#position}]
	 * @param {Boolean} apply
	 *
	 * @example {@paperscript}
	 * // Scaling an item from its center point:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle(new Point(80, 50), 20);
	 * circle.fillColor = 'red';
	 *
	 * // Scale the path by 150% from its center point
	 * circle.scale(1.5);
	 *
	 * @example {@paperscript}
	 * // Scaling an item from a specific point:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle(new Point(80, 50), 20);
	 * circle.fillColor = 'red';
	 *
	 * // Scale the path 150% from its bottom left corner
	 * circle.scale(1.5, circle.bounds.bottomLeft);
	 */
	/**
	 * Scales the item by the given values from its center point, or optionally
	 * from a supplied point.
	 *
	 * @name Item#scale
	 * @function
	 * @param {Number} hor the horizontal scale factor
	 * @param {Number} ver the vertical scale factor
	 * @param {Point} [center={@link Item#position}]
	 * @param {Boolean} apply
	 *
	 * @example {@paperscript}
	 * // Scaling an item horizontally by 300%:
	 *
	 * // Create a circle shaped path at { x: 100, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle(new Point(100, 50), 20);
	 * circle.fillColor = 'red';
     *
	 * // Scale the path horizontally by 300%
	 * circle.scale(3, 1);
	 */
	scale: function(hor, ver /* | scale */, center, apply) {
		// See Matrix#scale for explanation of this:
		if (arguments.length < 2 || typeof ver === 'object') {
			apply = center;
			center = ver;
			ver = hor;
		}
		return this.transform(new Matrix().scale(hor, ver,
				center || this.getPosition(true)), apply);
	},

	/**
	 * Translates (moves) the item by the given offset point.
	 *
	 * @param {Point} delta the offset to translate the item by
	 * @param {Boolean} apply
	 */
	translate: function(delta, apply) {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments), apply);
	},

	/**
	 * Rotates the item by a given angle around the given point.
	 *
	 * Angles are oriented clockwise and measured in degrees.
	 *
	 * @param {Number} angle the rotation angle
	 * @param {Point} [center={@link Item#position}]
	 * @param {Boolean} apply
	 * @see Matrix#rotate
	 *
	 * @example {@paperscript}
	 * // Rotating an item:
	 *
	 * // Create a rectangle shaped path with its top left
	 * // point at {x: 80, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(80, 25), new Size(50, 50));
	 * path.fillColor = 'black';
     *
	 * // Rotate the path by 30 degrees:
	 * path.rotate(30);
	 *
	 * @example {@paperscript height=200}
	 * // Rotating an item around a specific point:
	 *
	 * // Create a rectangle shaped path with its top left
	 * // point at {x: 175, y: 50} and a size of {width: 100, height: 100}:
	 * var topLeft = new Point(175, 50);
	 * var size = new Size(100, 100);
	 * var path = new Path.Rectangle(topLeft, size);
	 * path.fillColor = 'black';
	 *
	 * // Draw a circle shaped path in the center of the view,
	 * // to show the rotation point:
	 * var circle = new Path.Circle(view.center, 5);
	 * circle.fillColor = 'white';
	 *
	 * // Each frame rotate the path 3 degrees around the center point
	 * // of the view:
	 * function onFrame(event) {
	 * 	path.rotate(3, view.center);
	 * }
	 */
	rotate: function(angle, center, apply) {
		return this.transform(new Matrix().rotate(angle,
				center || this.getPosition(true)), apply);
	},

	// TODO: Add test for item shearing, as it might be behaving oddly.
	/**
	 * Shears the item by the given value from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#shear
	 * @function
	 * @param {Point} point
	 * @param {Point} [center={@link Item#position}]
	 * @param {Boolean} apply
	 * @see Matrix#shear
	 */
	/**
	 * Shears the item by the given values from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#shear
	 * @function
	 * @param {Number} hor the horizontal shear factor.
	 * @param {Number} ver the vertical shear factor.
	 * @param {Point} [center={@link Item#position}]
	 * @param {Boolean} apply
	 * @see Matrix#shear
	 */
	shear: function(hor, ver, center, apply) {
		// PORT: Add support for center and apply back to Scriptographer too!
		// See Matrix#scale for explanation of this:
		if (arguments.length < 2 || typeof ver === 'object') {
			apply = center;
			center = ver;
			ver = hor;
		}
		return this.transform(new Matrix().shear(hor, ver,
				center || this.getPosition(true)), apply);
	},

	/**
	 * Transform the item.
	 *
	 * @param {Matrix} matrix the matrix by which the item shall be transformed.
	 * @param {Boolean} apply controls wether the transformation should just be
	 * concatenated to {@link #matrix} ({@code false}) or if it should directly
	 * be applied to item's content and its children.
	 */
	// Remove this for now:
	// @param {String[]} flags Array of any of the following: 'objects',
	//        'children', 'fill-gradients', 'fill-patterns', 'stroke-patterns',
	//        'lines'. Default: ['objects', 'children']
	transform: function(matrix, apply) {
		// Calling _changed will clear _bounds and _position, but depending
		// on matrix we can calculate and set them again.
		var bounds = this._bounds,
			position = this._position;
		// Simply preconcatenate the internal matrix with the passed one:
		this._matrix.preConcatenate(matrix);
		if (this._transform)
			this._transform(matrix);
		if (apply)
			this.apply();
		// We always need to call _changed since we're caching bounds on all
		// items, including Group.
		this._changed(Change.GEOMETRY);
		// Detect matrices that contain only translations and scaling
		// and transform the cached _bounds and _position without having to
		// fully recalculate each time.
		if (bounds && matrix.getRotation() % 90 === 0) {
			// Transform the old bound by looping through all the cached bounds
			// in _bounds and transform each.
			for (var key in bounds) {
				var rect = bounds[key];
				matrix._transformBounds(rect, rect);
			}
			// If we have cached 'bounds', update _position again as its 
			// center. We need to take into account _boundsType here too, in 
			// case another type is assigned to it, e.g. 'strokeBounds'.
			var type = this._boundsType,
				rect = bounds[type && type.bounds || 'bounds'];
			if (rect)
				this._position = rect.getCenter(true);
			this._bounds = bounds;
		} else if (position) {
			// Transform position as well.
			this._position = matrix._transformPoint(position, position);
		}
		// PORT: Return 'this' in all chainable commands
		return this;
	},

	// DOCS: Document #apply()
	apply: function() {
		// Call the internal #_apply(), and set the internal _matrix to the
		// identity transformation if it was possible to apply it.
		// Application is not possible on Raster, PointText, PlacedSymbol, since
		// the matrix is storing the actual location / transformation state.
		// Pass on this._matrix to _apply calls, for reasons of faster access
		// and code minification.
		if (this._apply(this._matrix)) {
			// Set _matrix to the identity
			this._matrix.setIdentity();
			// TODO: This needs a _changed notification, but the GEOMETRY
			// actually doesn't change! What to do?
		}
	},

	_apply: function(matrix) {
		// Pass on the transformation to the children, and apply it there too:
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++) {
				var child = this._children[i];
				child.transform(matrix);
				child.apply();
			}
			return true;
		}
	},

	/**
	 * Transform the item so that its {@link #bounds} fit within the specified
	 * rectangle, without changing its aspect ratio.
	 *
	 * @param {Rectangle} rectangle
	 * @param {Boolean} [fill=false]
	 *
	 * @example {@paperscript height=100}
	 * // Fitting an item to the bounding rectangle of another item's bounding
	 * // rectangle:
	 *
	 * // Create a rectangle shaped path with its top left corner
	 * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
	 * var size = new Size(75, 50);
	 * var path = new Path.Rectangle(new Point(80, 25), size);
	 * path.fillColor = 'black';
	 *
	 * // Create a circle shaped path with its center at {x: 80, y: 50}
	 * // and a radius of 30.
	 * var circlePath = new Path.Circle(new Point(80, 50), 30);
	 * circlePath.fillColor = 'red';
	 *
	 * // Fit the circlePath to the bounding rectangle of
	 * // the rectangular path:
	 * circlePath.fitBounds(path.bounds);
	 *
	 * @example {@paperscript height=100}
	 * // Fitting an item to the bounding rectangle of another item's bounding
	 * // rectangle with the fill parameter set to true:
	 *
	 * // Create a rectangle shaped path with its top left corner
	 * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
	 * var size = new Size(75, 50);
	 * var path = new Path.Rectangle(new Point(80, 25), size);
	 * path.fillColor = 'black';
	 *
	 * // Create a circle shaped path with its center at {x: 80, y: 50}
	 * // and a radius of 30.
	 * var circlePath = new Path.Circle(new Point(80, 50), 30);
	 * circlePath.fillColor = 'red';
	 *
	 * // Fit the circlePath to the bounding rectangle of
	 * // the rectangular path:
	 * circlePath.fitBounds(path.bounds, true);
	 *
	 * @example {@paperscript height=200}
	 * // Fitting an item to the bounding rectangle of the view
	 * var path = new Path.Circle(new Point(80, 50), 30);
	 * path.fillColor = 'red';
	 *
	 * // Fit the path to the bounding rectangle of the view:
	 * path.fitBounds(view.bounds);
	 */
	fitBounds: function(rectangle, fill) {
		// TODO: Think about passing options with various ways of defining
		// fitting.
		rectangle = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			itemRatio = bounds.height / bounds.width,
			rectRatio = rectangle.height / rectangle.width,
			scale = (fill ? itemRatio > rectRatio : itemRatio < rectRatio)
					? rectangle.width / bounds.width
					: rectangle.height / bounds.height,
			delta = rectangle.getCenter().subtract(bounds.getCenter()),
			newBounds = new Rectangle(new Point(),
					Size.create(bounds.width * scale, bounds.height * scale));
		newBounds.setCenter(rectangle.getCenter());
		this.setBounds(newBounds);
	},

	toString: function() {
		return (this.constructor._name || 'Item') + (this._name
				? " '" + this._name + "'"
				: ' @' + this._id);
	},

	/**
	 * {@grouptitle Event Handlers}
	 * Item level handler function to be called on each frame of an animation.
	 * The function receives an event object which contains information about
	 * the frame event:
	 *
	 * <b>{@code event.count}</b>: the number of times the frame event was
	 * fired.
	 * <b>{@code event.time}</b>: the total amount of time passed since the
	 * first frame event in seconds.
	 * <b>{@code event.delta}</b>: the time passed in seconds since the last
	 * frame event.
	 *
 	 * @see View#onFrame
	 * @example {@paperscript}
	 * // Creating an animation:
	 *
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * path.onFrame = function(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	this.rotate(3);
	 * }
	 *
	 * @name Item#onFrame
	 * @property
	 * @type Function
	 */

	/**
	 * The function to be called when the mouse button is pushed down on the
	 * item. The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseDown
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Press the mouse button down on the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle(view.center, 25);
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse is pressed on the item,
	 * // set its fill color to red:
	 * path.onMouseDown = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * @example {@paperscript}
	 * // Press the mouse on the circle shaped paths to remove them:
	 * 
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 * 	// Create a circle shaped path at a random position
	 * 	// in the view:
	 * 	var position = Point.random() * view.size;
	 * 	var path = new Path.Circle(position, 25);
	 * 	path.fillColor = 'black';
	 * 	path.strokeColor = 'white';
	 * 	// When the mouse is pressed on the item, remove it:
	 * 	path.onMouseDown = function(event) {
	 * 		this.remove();
	 * 	}
	 * }
	 */

	/**
	 * The function to be called when the mouse button is released over the item.
	 * The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseUp
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Release the mouse button over the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle(view.center, 25);
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse is released over the item,
	 * // set its fill color to red:
	 * path.onMouseUp = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 */

	/**
	 * The function to be called when the mouse clicks on the item. The function
	 * receives a {@link MouseEvent} object which contains information about the
	 * mouse event.
	 *
	 * @name Item#onClick
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Click on the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle(view.center, 25);
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse is clicked on the item,
	 * // set its fill color to red:
	 * path.onClick = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * @example {@paperscript}
	 * // Click on the circle shaped paths to remove them:
	 * 
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 * 	// Create a circle shaped path at a random position
	 * 	// in the view:
	 * 	var position = Point.random() * view.size;
	 * 	var path = new Path.Circle(position, 25);
	 * 	path.fillColor = 'black';
	 * 	path.strokeColor = 'white';
	 * 	// When the mouse is clicked on the item, remove it:
	 * 	path.onClick = function(event) {
	 * 		this.remove();
	 * 	}
	 * }
	 */

	/**
	 * The function to be called when the mouse double clicks on the item. The
	 * function receives a {@link MouseEvent} object which contains information
	 * about the mouse event.
	 *
	 * @name Item#onDoubleClick
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Double click on the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle(view.center, 25);
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse is double clicked on the item,
	 * // set its fill color to red:
	 * path.onDoubleClick = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * @example {@paperscript}
	 * // Double click on the circle shaped paths to remove them:
	 * 
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 * 	// Create a circle shaped path at a random position
	 * 	// in the view:
	 * 	var position = Point.random() * view.size;
	 * 	var path = new Path.Circle(position, 25);
	 * 	path.fillColor = 'black';
	 * 	path.strokeColor = 'white';
	 * 	// When the mouse is clicked on the item, remove it:
	 * 	path.onDoubleClick = function(event) {
	 * 		this.remove();
	 * 	}
	 * }
	 */

	/**
	 * The function to be called repeatedly when the mouse moves on top of the
	 * item. The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseMove
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Move over the circle shaped path, to change its opacity:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle(view.center, 25);
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse moves on top of the item, set its opacity
	 * // to a random value between 0 and 1:
	 * path.onMouseMove = function(event) {
	 * 	this.opacity = Math.random();
	 * }
	 */

	/**
	 * The function to be called when the mouse moves over the item. This
	 * function will only be called again, once the mouse moved outside of the
	 * item first. The function receives a {@link MouseEvent} object which
	 * contains information about the mouse event.
	 *
	 * @name Item#onMouseEnter
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // When you move the mouse over the item, its fill color is set to red.
	 * // When you move the mouse outside again, its fill color is set back
	 * // to black.
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle(view.center, 25);
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse enters the item, set its fill color to red:
	 * path.onMouseEnter = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 
	 * // When the mouse leaves the item, set its fill color to black:
	 * path.onMouseLeave = function(event) {
	 * 	this.fillColor = 'black';
	 * }
	 * @example {@paperscript}
	 * // When you click the mouse, you create new circle shaped items. When you
	 * // move the mouse over the item, its fill color is set to red. When you
	 * // move the mouse outside again, its fill color is set back
	 * // to black.
	 * 
	 * function enter(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * function leave(event) {
	 * 	this.fillColor = 'black';
	 * }
	 * 
	 * // When the mouse is pressed:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the position of the mouse:
	 * 	var path = new Path.Circle(event.point, 25);
	 * 	path.fillColor = 'black';
     * 
	 * 	// When the mouse enters the item, set its fill color to red:
	 * 	path.onMouseEnter = enter;
     * 
	 * 	// When the mouse leaves the item, set its fill color to black:
	 * 	path.onMouseLeave = leave;
	 * }
	 */

	/**
	 * The function to be called when the mouse moves out of the item.
	 * The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseLeave
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Move the mouse over the circle shaped path and then move it out
	 * // of it again to set its fill color to red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle(view.center, 25);
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse leaves the item, set its fill color to red:
	 * path.onMouseLeave = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 */

	/**
	 * {@grouptitle Event Handling}
	 * 
	 * Attach an event handler to the item.
	 *
	 * @name Item#attach
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 *
	 * @example {@paperscript}
	 * // Change the fill color of the path to red when the mouse enters its
	 * // shape and back to black again, when it leaves its shape.
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle(view.center, 25);
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse enters the item, set its fill color to red:
	 * path.attach('mouseenter', function() {
	 * 	this.fillColor = 'red';
	 * });
	 * 
	 * // When the mouse leaves the item, set its fill color to black:
	 * path.attach('mouseleave', function() {
	 * 	this.fillColor = 'black';
	 * });
	 */
	/**
	 * Attach one or more event handlers to the item.
	 *
	 * @name Item#attach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, click,
	 * doubleclick, mousemove, mouseenter, mouseleave}.
	 *
	 * @example {@paperscript}
	 * // Change the fill color of the path to red when the mouse enters its
	 * // shape and back to black again, when it leaves its shape.
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle(view.center, 25);
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse enters the item, set its fill color to red:
	 * path.attach({
	 * 	mouseenter: function(event) {
	 * 		this.fillColor = 'red';
	 * 	},
	 * 	mouseleave: function(event) {
	 * 		this.fillColor = 'black';
	 * 	}
	 * });
	 * @example {@paperscript}
	 * // When you click the mouse, you create new circle shaped items. When you
	 * // move the mouse over the item, its fill color is set to red. When you
	 * // move the mouse outside again, its fill color is set black.
	 * 
	 * var pathHandlers = {
	 * 	mouseenter: function(event) {
	 * 		this.fillColor = 'red';
	 * 	},
	 * 	mouseleave: function(event) {
	 * 		this.fillColor = 'black';
	 * 	}
	 * }
	 * 
	 * // When the mouse is pressed:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the position of the mouse:
	 * 	var path = new Path.Circle(event.point, 25);
	 * 	path.fillColor = 'black';
     * 
	 * 	// Attach the handers inside the object literal to the path:
	 * 	path.attach(pathHandlers);
	 * }
	 */

	/**
	 * Detach an event handler from the item.
	 *
	 * @name Item#detach
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Function} function The function to be detached
	 */
	/**
	 * Detach one or more event handlers to the item.
	 *
	 * @name Item#detach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, click,
	 * doubleclick, mousemove, mouseenter, mouseleave}
	 */

	/**
	 * Fire an event on the item.
	 *
	 * @name Item#fire
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Object} event An object literal containing properties describing
	 * the event.
	 */

	/**
	 * Check if the item has one or more event handlers of the specified type.
	 *
	 * @name Item#responds
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @return {Boolean} {@true if the item has one or more event handlers of
	 * the specified type}
	 */

	/**
	 * Private method that sets Path related styles on the canvas context.
	 * Not defined in Path as it is required by other classes too,
	 * e.g. PointText.
	 */
	_setStyles: function(ctx) {
		// We can access internal properties since we're only using this on
		// items without children, where styles would be merged.
		var style = this._style,
			width = style._strokeWidth,
			join = style._strokeJoin,
			cap = style._strokeCap,
			limit = style._miterLimit,
			fillColor = style._fillColor,
			strokeColor = style._strokeColor;
		if (width != null) ctx.lineWidth = width;
		if (join) ctx.lineJoin = join;
		if (cap) ctx.lineCap = cap;
		if (limit) ctx.miterLimit = limit;
		if (fillColor) ctx.fillStyle = fillColor.getCanvasStyle(ctx);
		if (strokeColor) ctx.strokeStyle = strokeColor.getCanvasStyle(ctx);
		// If the item only defines a strokeColor or a fillColor, draw it
		// directly with the globalAlpha set, otherwise we will do it later when
		// we composite the temporary canvas.
		if (!fillColor || !strokeColor)
			ctx.globalAlpha = this._opacity;
	},

	statics: {
		drawSelectedBounds: function(bounds, ctx, matrix) {
			var coords = matrix._transformCorners(bounds);
			ctx.beginPath();
			for (var i = 0; i < 8; i++)
				ctx[i == 0 ? 'moveTo' : 'lineTo'](coords[i], coords[++i]);
			ctx.closePath();
			ctx.stroke();
			for (var i = 0; i < 8; i++) {
				ctx.beginPath();
				ctx.rect(coords[i] - 2, coords[++i] - 2, 4, 4);
				ctx.fill();
			}
		},

		// TODO: Implement View into the drawing.
		// TODO: Optimize temporary canvas drawing to ignore parts that are
		// outside of the visible view.
		draw: function(item, ctx, param) {
			if (!item._visible || item._opacity == 0)
				return;
			var tempCanvas, parentCtx,
			 	itemOffset, prevOffset;
			// If the item has a blendMode or is defining an opacity, draw it on
			// a temporary canvas first and composite the canvas afterwards.
			// Paths with an opacity < 1 that both define a fillColor
			// and strokeColor also need to be drawn on a temporary canvas
			// first, since otherwise their stroke is drawn half transparent
			// over their fill.
			if (item._blendMode !== 'normal' || item._opacity < 1
					&& !(item._segments
						&& (!item.getFillColor() || !item.getStrokeColor()))) {
				var bounds = item.getStrokeBounds();
				if (!bounds.width || !bounds.height)
					return;
				// Store previous offset and save the parent context, so we can
				// draw onto it later
				prevOffset = param.offset;
				parentCtx = ctx;
				// Floor the offset and ceil the size, so we don't cut off any
				// antialiased pixels when drawing onto the temporary canvas.
				itemOffset = param.offset = bounds.getTopLeft().floor();
				tempCanvas = CanvasProvider.getCanvas(
						bounds.getSize().ceil().add(Size.create(1, 1)));
				// Set ctx to the context of the temporary canvas,
				// so we draw onto it, instead of the parentCtx
				ctx = tempCanvas.getContext('2d');
			}
			if (!param.clipping)
				ctx.save();
			// Translate the context so the topLeft of the item is at (0, 0)
			// on the temporary canvas.
			if (tempCanvas)
				ctx.translate(-itemOffset.x, -itemOffset.y);
			item._matrix.applyToContext(ctx);
			item.draw(ctx, param);
			if (!param.clipping)
				ctx.restore();
			// If we created a temporary canvas before, composite it onto the
			// parent canvas:
			if (tempCanvas) {
				// Restore previous offset.
				param.offset = prevOffset;
				// If the item has a blendMode, use BlendMode#process to
				// composite its canvas on the parentCanvas.
				if (item._blendMode !== 'normal') {
					// The pixel offset of the temporary canvas to the parent
					// canvas.
					BlendMode.process(item._blendMode, ctx, parentCtx,
						item._opacity, itemOffset.subtract(prevOffset));
				} else {
				// Otherwise we just need to set the globalAlpha before drawing
				// the temporary canvas on the parent canvas.
					parentCtx.save();
					parentCtx.globalAlpha = item._opacity;
					parentCtx.drawImage(tempCanvas, itemOffset.x, itemOffset.y);
					parentCtx.restore();
				}
				// Return the temporary canvas, so it can be reused
				CanvasProvider.returnCanvas(tempCanvas);
			}
		}
	}
}, Base.each(['down', 'drag', 'up', 'move'], function(name) {
	this['removeOn' + Base.capitalize(name)] = function() {
		var hash = {};
		hash[name] = true;
		return this.removeOn(hash);
	};
}, /** @lends Item# */{
	/**
	 * {@grouptitle Remove On Event}
	 *
	 * Removes the item when the events specified in the passed object literal
	 * occur.
	 * The object literal can contain the following values:
	 * Remove the item when the next {@link Tool#onMouseMove} event is
	 * fired: {@code object.move = true}
	 *
	 * Remove the item when the next {@link Tool#onMouseDrag} event is
	 * fired: {@code object.drag = true}
	 *
	 * Remove the item when the next {@link Tool#onMouseDown} event is
	 * fired: {@code object.down = true}
	 *
	 * Remove the item when the next {@link Tool#onMouseUp} event is
	 * fired: {@code object.up = true}
	 *
	 * @name Item#removeOn
	 * @function
	 * @param {Object} object
	 *
	 * @example {@paperscript height=200}
	 * // Click and drag below:
	 * function onMouseDrag(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 *
	 * 	// Remove the path on the next onMouseDrag or onMouseDown event:
	 * 	path.removeOn({
	 * 		drag: true,
	 * 		down: true
	 * 	});
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseMove} event is fired.
	 *
	 * @name Item#removeOnMove
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Move your mouse below:
	 * function onMouseMove(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 *
	 * 	// On the next move event, automatically remove the path:
	 * 	path.removeOnMove();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseDown} event is fired.
	 *
	 * @name Item#removeOnDown
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Click a few times below:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 *
	 * 	// Remove the path, next time the mouse is pressed:
	 * 	path.removeOnDown();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseDrag} event is fired.
	 *
	 * @name Item#removeOnDrag
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Click and drag below:
	 * function onMouseDrag(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 *
	 * 	// On the next drag event, automatically remove the path:
	 * 	path.removeOnDrag();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseUp} event is fired.
	 *
	 * @name Item#removeOnUp
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Click a few times below:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 *
	 * 	// Remove the path, when the mouse is released:
	 * 	path.removeOnUp();
	 * }
	 */
	// TODO: implement Item#removeOnFrame
	removeOn: function(obj) {
		for (var name in obj) {
			if (obj[name]) {
				var key = 'mouse' + name,
					sets = Tool._removeSets = Tool._removeSets || {};
				sets[key] = sets[key] || {};
				sets[key][this._id] = this;
			}
		}
		return this;
	}
}));

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Group
 *
 * @class A Group is a collection of items. When you transform a Group, its
 * children are treated as a single unit without changing their relative
 * positions.
 *
 * @extends Item
 */
var Group = this.Group = Item.extend(/** @lends Group# */{
	// DOCS: document new Group(item, item...);
	/**
	 * Creates a new Group item and places it at the top of the active layer.
	 *
	 * @param {Item[]} [children] An array of children that will be added to the
	 * newly created group.
	 *
	 * @example {@paperscript split=true height=200}
	 * // Create a group containing two paths:
	 * var path = new Path(new Point(100, 100), new Point(100, 200));
	 * var path2 = new Path(new Point(50, 150), new Point(150, 150));
	 *
	 * // Create a group from the two paths:
	 * var group = new Group([path, path2]);
	 *
	 * // Set the stroke color of all items in the group:
	 * group.strokeColor = 'black';
	 *
	 * // Move the group to the center of the view:
	 * group.position = view.center;
	 *
	 * @example {@paperscript split=true height=320}
	 * // Click in the view to add a path to the group, which in turn is rotated
	 * // every frame:
	 * var group = new Group();
	 *
	 * function onMouseDown(event) {
	 * 	// Create a new circle shaped path at the position
	 * 	// of the mouse:
	 * 	var path = new Path.Circle(event.point, 5);
	 * 	path.fillColor = 'black';
	 *
	 * 	// Add the path to the group's children list:
	 * 	group.addChild(path);
	 * }
	 *
	 * function onFrame(event) {
	 * 	// Rotate the group by 1 degree from
	 * 	// the centerpoint of the view:
	 * 	group.rotate(1, view.center);
	 * }
	 */
	initialize: function(items) {
		this.base();
		// Allow Group to have children and named children
		this._children = [];
		this._namedChildren = {};
		this.addChildren(!items || !Array.isArray(items)
				|| typeof items[0] !== 'object' ? arguments : items);
	},

	_changed: function(flags) {
		// Don't use base() for reasons of performance.
		Item.prototype._changed.call(this, flags);
		if (flags & (ChangeFlag.HIERARCHY | ChangeFlag.CLIPPING)) {
			// Clear cached clip item whenever hierarchy changes
			delete this._clipItem;
		}
	},

	_getClipItem: function() {
		// Allow us to set _clipItem to null when none is found and still return
		// it as a defined value without searching again
		if (this._clipItem !== undefined)
			return this._clipItem;
		for (var i = 0, l = this._children.length; i < l; i++) {
			var child = this._children[i];
			if (child._clipMask)
				return this._clipItem = child;
		}
		// Make sure we're setting _clipItem to null so it won't be searched for
		// nex time.
		return this._clipItem = null;
	},

	/**
	 * Specifies whether the group item is to be clipped.
	 * When setting to {@code true}, the first child in the group is
	 * automatically defined as the clipping mask.
	 *
	 * @type Boolean
	 * @bean
	 */
	isClipped: function() {
		return !!this._getClipItem();
	},

	setClipped: function(clipped) {
		var child = this.getFirstChild();
		if (child)
			child.setClipMask(clipped);
		return this;
	},

	draw: function(ctx, param) {
		var clipItem = this._getClipItem();
		if (clipItem) {
			param.clipping = true;
			Item.draw(clipItem, ctx, param);
			delete param.clipping;
		}
		for (var i = 0, l = this._children.length; i < l; i++) {
			var item = this._children[i];
			if (item != clipItem)
				Item.draw(item, ctx, param);
		}
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Layer
 *
 * @class The Layer item represents a layer in a Paper.js project.
 *
 * The layer which is currently active can be accessed through
 * {@link Project#activeLayer}.
 * An array of all layers in a project can be accessed through
 * {@link Project#layers}.
 *
 * @extends Group
 */
var Layer = this.Layer = Group.extend(/** @lends Layer# */{
	// DOCS: improve constructor code example.
	/**
	 * Creates a new Layer item and places it at the end of the
	 * {@link Project#layers} array. The newly created layer will be activated,
	 * so all newly created items will be placed within it.
	 *
	 * @param {Item[]} [children] An array of items that will be added to the
	 * newly created layer.
	 *
	 * @example
	 * var layer = new Layer();
	 */
	initialize: function(items) {
		this._project = paper.project;
		// Push it onto project.layers and set index:
		this._index = this._project.layers.push(this) - 1;
		this.base.apply(this, arguments);
		this.activate();
	},

	/**
	* Removes the layer from its project's layers list
	* or its parent's children list.
	*/
	_remove: function(deselect, notify) {
		if (this._parent)
			return this.base(deselect, notify);
		if (this._index != null) {
			if (deselect)
				this.setSelected(false);
			Base.splice(this._project.layers, null, this._index, 1);
			// Tell project we need a redraw. This is similar to _changed()
			// mechanism.
			this._project._needsRedraw();
			return true;
		}
		return false;
	},

	getNextSibling: function() {
		return this._parent ? this.base()
				: this._project.layers[this._index + 1] || null;
	},

	getPreviousSibling: function() {
		return this._parent ? this.base()
				: this._project.layers[this._index - 1] || null;
	},

	/**
	 * Activates the layer.
	 *
	 * @example
	 * var firstLayer = project.activeLayer;
	 * var secondLayer = new Layer();
	 * console.log(project.activeLayer == secondLayer); // true
	 * firstLayer.activate();
	 * console.log(project.activeLayer == firstLayer); // true
	 */
	activate: function() {
		this._project.activeLayer = this;
	}
}, new function () {
	function insert(above) {
		return function(item) {
			// If the item is a layer and contained within Project#layers, use
			// our own version of move().
			if (item instanceof Layer && !item._parent
						&& this._remove(false, true)) {
				Base.splice(item._project.layers, [this],
						item._index + (above ? 1 : -1), 0);
				this._setProject(item._project);
				return true;
			}
			return this.base(item);
		};
	}

	return {
		insertAbove: insert(true),

		insertBelow: insert(false)
	};
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PlacedItem
 *
 * @class The PlacedItem class is the base for any items that have a matrix
 * associated with them, describing their placement in the project, such as
 * {@link Raster} and {@link PlacedSymbol}.
 *
 * @extends Item
 */
var PlacedItem = this.PlacedItem = Item.extend(/** @lends PlacedItem# */{
	// PlacedItem uses strokeBounds for bounds
	_boundsType: { bounds: 'strokeBounds' }
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Raster
 *
 * @class The Raster item represents an image in a Paper.js project.
 *
 * @extends PlacedItem
 */
var Raster = this.Raster = PlacedItem.extend(/** @lends Raster# */{
	// Raster doesn't make the distinction between the different bounds,
	// so use the same name for all of them
	_boundsType: 'bounds',

	// TODO: Implement url / type, width, height.
	// TODO: Have PlacedSymbol & Raster inherit from a shared class?
	// DOCS: Document Raster constructor.
	/**
	 * Creates a new raster item and places it in the active layer.
	 *
	 * @param {HTMLImageElement|Canvas|string} [object]
	 */
	initialize: function(object, pointOrMatrix) {
		this.base(pointOrMatrix);
		if (object.getContext) {
			this.setCanvas(object);
		} else {
			// If it's a string, get the element with this id first.
			if (typeof object === 'string')
				object = document.getElementById(object);
			this.setImage(object);
		}
	},

	clone: function() {
		var image = this._image;
		if (!image) {
			// If the Raster contains a Canvas object, we need to create
			// a new one and draw this raster's canvas on it.
			image = CanvasProvider.getCanvas(this._size);
			image.getContext('2d').drawImage(this._canvas, 0, 0);
		}
		var copy = new Raster(image);
		return this._clone(copy);
	},

	/**
	 * The size of the raster in pixels.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function() {
		return this._size;
	},

	setSize: function() {
		var size = Size.read(arguments),
			// Get reference to image before changing canvas
			image = this.getImage();
		// Setting canvas internally sets _size
		this.setCanvas(CanvasProvider.getCanvas(size));
		// Draw image back onto new canvas
		this.getContext(true).drawImage(image, 0, 0, size.width, size.height);
	},

	/**
	 * The width of the raster in pixels.
	 *
	 * @type Number
	 * @bean
	 */
	getWidth: function() {
		return this._size.width;
	},

	/**
	 * The height of the raster in pixels.
	 *
	 * @type Number
	 * @bean
	 */
	getHeight: function() {
		return this._size.height;
	},

	/**
	 * Pixels per inch of the raster at its current size.
	 *
	 * @type Size
	 * @bean
	 */
	getPpi: function() {
		var matrix = this._matrix,
			orig = new Point(0, 0).transform(matrix),
			u = new Point(1, 0).transform(matrix).subtract(orig),
			v = new Point(0, 1).transform(matrix).subtract(orig);
		return Size.create(
			72 / u.getLength(),
			72 / v.getLength()
		);
	},

	/**
	 * The Canvas 2d drawing context of the raster.
	 *
	 * @type Context
	 * @bean
	 */
	getContext: function(/* notifyChange */) {
		if (!this._context)
			this._context = this.getCanvas().getContext('2d');
		// Support a hidden parameter that indicates if the context will be used
		// to modify the Raster object. We can notify such changes ahead since
		// they are only used afterwards for redrawing.
		if (arguments[0])
			this._changed(Change.PIXELS);
		return this._context;
	},

	setContext: function(context) {
		this._context = context;
	},

	getCanvas: function() {
		if (!this._canvas) {
			this._canvas = CanvasProvider.getCanvas(this._size);
			if (this._image)
				this.getContext(true).drawImage(this._image, 0, 0);
		}
		return this._canvas;
	},

	setCanvas: function(canvas) {
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		this._canvas = canvas;
		this._size = Size.create(canvas.width, canvas.height);
		this._image = null;
		this._context = null;
		this._changed(Change.GEOMETRY | Change.PIXELS);
	},

	/**
	 * The HTMLImageElement or Canvas of the raster.
	 *
	 * @type HTMLImageElement|Canvas
	 * @bean
	 */
	getImage: function() {
		return this._image || this.getCanvas();
	},

	// TODO: Support string id of image element.
	setImage: function(image) {
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		this._image = image;
		this._size = Size.create(image.naturalWidth, image.naturalHeight);
		this._canvas = null;
		this._context = null;
		this._changed(Change.GEOMETRY);
	},

	// DOCS: document Raster#getSubImage
	/**
	 * @param {Rectangle} rect the boundaries of the sub image in pixel
	 * coordinates
	 *
	 * @return {Canvas}
	 */
	getSubImage: function(rect) {
		rect = Rectangle.read(arguments);
		var canvas = CanvasProvider.getCanvas(rect.getSize());
		canvas.getContext('2d').drawImage(this.getCanvas(), rect.x, rect.y,
				canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
		return canvas;
	},

	/**
	 * Draws an image on the raster.
	 *
	 * @param {HTMLImageELement|Canvas} image
	 * @param {Point} point the offset of the image as a point in pixel
	 * coordinates
	 */
	drawImage: function(image, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).drawImage(image, point.x, point.y);
	},

	/**
	 * Calculates the average color of the image within the given path,
	 * rectangle or point. This can be used for creating raster image
	 * effects.
	 *
	 * @param {Path|Rectangle|Point} object
	 * @return {RgbColor} the average color contained in the area covered by the
	 * specified path, rectangle or point.
	 */
	getAverageColor: function(object) {
		var bounds, path;
		if (!object) {
			bounds = this.getBounds();
		} else if (object instanceof PathItem) {
			// TODO: What if the path is smaller than 1 px?
			// TODO: How about rounding of bounds.size?
			path = object;
			bounds = object.getBounds();
		} else if (object.width) {
			bounds = new Rectangle(object);
		} else if (object.x) {
			// Create a rectangle of 1px size around the specified coordinates
			bounds = Rectangle.create(object.x - 0.5, object.y - 0.5, 1, 1);
		}
		// Use a sample size of max 32 x 32 pixels, into which the path is
		// scaled as a clipping path, and then the actual image is drawn in and
		// sampled.
		var sampleSize = 32,
			width = Math.min(bounds.width, sampleSize),
			height = Math.min(bounds.height, sampleSize);
		// Reuse the same sample context for speed. Memory consumption is low
		// since it's only 32 x 32 pixels.
		var ctx = Raster._sampleContext;
		if (!ctx) {
			ctx = Raster._sampleContext = CanvasProvider.getCanvas(
					new Size(sampleSize)).getContext('2d');
		} else {
			// Clear the sample canvas:
			ctx.clearRect(0, 0, sampleSize, sampleSize);
		}
		ctx.save();
		// Scale the context so that the bounds ends up at the given sample size
		ctx.scale(width / bounds.width, height / bounds.height);
		ctx.translate(-bounds.x, -bounds.y);
		// If a path was passed, draw it as a clipping mask:
		if (path)
			path.draw(ctx, { clip: true });
		// Now draw the image clipped into it.
		this._matrix.applyToContext(ctx);
		ctx.drawImage(this._canvas || this._image,
				-this._size.width / 2, -this._size.height / 2);
		ctx.restore();
		// Get pixel data from the context and calculate the average color value
		// from it, taking alpha into account.
		var pixels = ctx.getImageData(0.5, 0.5, Math.ceil(width),
				Math.ceil(height)).data,
			channels = [0, 0, 0],
			total = 0;
		for (var i = 0, l = pixels.length; i < l; i += 4) {
			var alpha = pixels[i + 3];
			total += alpha;
			alpha /= 255;
			channels[0] += pixels[i] * alpha;
			channels[1] += pixels[i + 1] * alpha;
			channels[2] += pixels[i + 2] * alpha;
		}
		for (var i = 0; i < 3; i++)
			channels[i] /= total;
		return total ? Color.read(channels) : null;
	},

	/**
	 * {@grouptitle Pixels}
	 * Gets the color of a pixel in the raster.
	 *
	 * @name Raster#getPixel
	 * @function
	 * @param x the x offset of the pixel in pixel coordinates
	 * @param y the y offset of the pixel in pixel coordinates
	 * @return {RgbColor} the color of the pixel
	 */
	/**
	 * Gets the color of a pixel in the raster.
	 *
	 * @name Raster#getPixel
	 * @function
	 * @param point the offset of the pixel as a point in pixel coordinates
	 * @return {RgbColor} the color of the pixel
	 */
	getPixel: function(point) {
		point = Point.read(arguments);
		var pixels = this.getContext().getImageData(point.x, point.y, 1, 1).data,
			channels = new Array(4);
		for (var i = 0; i < 4; i++)
			channels[i] = pixels[i] / 255;
		return RgbColor.read(channels);
	},

	/**
	 * Sets the color of the specified pixel to the specified color.
	 *
	 * @name Raster#setPixel
	 * @function
	 * @param x the x offset of the pixel in pixel coordinates
	 * @param y the y offset of the pixel in pixel coordinates
	 * @param color the color that the pixel will be set to
	 */
	/**
	 * Sets the color of the specified pixel to the specified color.
	 *
	 * @name Raster#setPixel
	 * @function
	 * @param point the offset of the pixel as a point in pixel coordinates
	 * @param color the color that the pixel will be set to
	 */
	setPixel: function(point, color) {
		var hasPoint = arguments.length == 2;
		point = Point.read(arguments, 0, hasPoint ? 1 : 2);
		color = Color.read(arguments, hasPoint ? 1 : 2);
		var ctx = this.getContext(true),
			imageData = ctx.createImageData(1, 1),
			alpha = color.getAlpha();
		imageData.data[0] = color.getRed() * 255;
		imageData.data[1] = color.getGreen() * 255;
		imageData.data[2] = color.getBlue() * 255;
		imageData.data[3] = alpha != null ? alpha * 255 : 255;
		ctx.putImageData(imageData, point.x, point.y);
	},

	// DOCS: document Raster#createData
	/**
	 * {@grouptitle Image Data}
	 * @param {Size} size
	 * @return {ImageData}
	 */
	createData: function(size) {
		size = Size.read(arguments);
		return this.getContext().createImageData(size.width, size.height);
	},

	// TODO: Rename to #get/setImageData, as it will conflict with Item#getData
	// DOCS: document Raster#getData
	/**
	 * @param {Rectangle} rect
	 * @return {ImageData}
	 */
	getData: function(rect) {
		rect = Rectangle.read(arguments);
		if (rect.isEmpty())
			rect = new Rectangle(this.getSize());
		return this.getContext().getImageData(rect.x, rect.y,
				rect.width, rect.height);
	},

	// DOCS: document Raster#setData
	/**
	 * @param {ImageData} data
	 * @param {Point} point
	 * @return {ImageData}
	 */
	setData: function(data, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).putImageData(data, point.x, point.y);
	},

	_getBounds: function(type, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	_hitTest: function(point, options) {
		if (point.isInside(this._getBounds())) {
			var that = this;
			return new HitResult('pixel', that, {
				offset: point.add(that._size.divide(2)).round(),
				// Becomes HitResult#color
				getColor: function() {
					return that.getPixel(this.offset);
				}
			});
		}
	},

	draw: function(ctx, param) {
		ctx.drawImage(this._canvas || this._image,
				-this._size.width / 2, -this._size.height / 2);
	},

	drawSelected: function(ctx, matrix) {
		Item.drawSelectedBounds(new Rectangle(this._size).setCenter(0, 0), ctx,
				matrix);
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PlacedSymbol
 *
 * @class A PlacedSymbol represents an instance of a symbol which has been
 * placed in a Paper.js project.
 *
 * @extends PlacedItem
 */
var PlacedSymbol = this.PlacedSymbol = PlacedItem.extend(/** @lends PlacedSymbol# */{
	/**
	 * Creates a new PlacedSymbol Item.
	 *
	 * @param {Symbol} symbol the symbol to place
	 * @param {Point|Matrix} [pointOrMatrix] the center point of the placed
	 * symbol or a {@link Matrix} transformation to transform the placed symbol
	 * with.
	 *
	 * @example {@paperscript split=true height=240}
	 * // Placing 100 instances of a symbol:
	 * var path = new Path.Star(new Point(0, 0), 6, 5, 13);
	 * path.style = {
	 *     fillColor: 'white',
	 *     strokeColor: 'black'
	 * };
     *
	 * // Create a symbol from the path:
	 * var symbol = new Symbol(path);
	 *
	 * // Remove the path:
	 * path.remove();
     *
	 * // Place 100 instances of the symbol:
	 * for (var i = 0; i < 100; i++) {
	 *     // Place an instance of the symbol in the project:
	 *     var instance = new PlacedSymbol(symbol);
     *
	 *     // Move the instance to a random position within the view:
	 *     instance.position = Point.random() * view.size;
     *
	 *     // Rotate the instance by a random amount between
	 *     // 0 and 360 degrees:
	 *     instance.rotate(Math.random() * 360);
     *
	 *     // Scale the instance between 0.25 and 1:
	 *     instance.scale(0.25 + Math.random() * 0.75);
	 * }
	 */
	initialize: function(symbol, pointOrMatrix) {
		this.base(pointOrMatrix);
		this.setSymbol(symbol instanceof Symbol ? symbol : new Symbol(symbol));
	},

	/**
	 * The symbol that the placed symbol refers to.
	 *
	 * @type Symbol
	 * @bean
	 */
	getSymbol: function() {
		return this._symbol;
	},

	setSymbol: function(symbol) {
		// Remove from previous symbol's instances
		if (this._symbol)
			delete this._symbol._instances[this._id];
		this._symbol = symbol;
		// Add to the new one's
		symbol._instances[this._id] = this;
	},

	clone: function() {
		return this._clone(new PlacedSymbol(this.symbol, this._matrix.clone()));
	},

	_getBounds: function(type, matrix) {
		// Redirect the call to the symbol definition to calculate the bounds
		// TODO: Implement bounds caching through passing on of cacheItem, so
		// that Symbol#_changed() notification become unnecessary!
		return this.symbol._definition._getCachedBounds(type, matrix);
	},

	draw: function(ctx, param) {
		Item.draw(this.symbol._definition, ctx, param);
	},

	drawSelected: function(ctx, matrix) {
		Item.drawSelectedBounds(this.symbol._definition.getBounds(), ctx,
				matrix);
	}

	// TODO: PlacedSymbol#embed()
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name HitResult
 *
 * @class A HitResult object contains information about the results of a hit
 * test. It is returned by {@link Item#hitTest(point)} and
 * {@link Project#hitTest(point)}.
 */
HitResult = Base.extend(/** @lends HitResult# */{
	initialize: function(type, item, values) {
		this.type = type;
		this.item = item;
		// Inject passed values, so we can be flexible about the HitResult
		// properties.
		// This allows the definition of getters too, e.g. for 'pixel'.
		if (values)
			this.inject(values);
	},

	/**
	 * Describes the type of the hit result. For example, if you hit a segment
	 * point, the type would be 'segment'.
	 *
	 * @name HitResult#type
	 * @property
	 * @type String('segment', 'handle-in', 'handle-out', 'stroke', 'fill',
	 * 'bounds', 'center', 'pixel')
	 */

	/**
	 * If the HitResult has a {@link HitResult#type} of 'bounds', this property
	 * describes which corner of the bounding rectangle was hit.
	 *
	 * @name HitResult#name
	 * @property
	 * @type String('top-left', 'top-right', 'bottom-left', 'bottom-right',
	 * 'left-center', 'top-center', 'right-center', 'bottom-center')
	 */

	/**
	 * The item that was hit.
	 *
	 * @name HitResult#item
	 * @property
	 * @type Item
	 */

	/**
	 * If the HitResult has a type of 'stroke', this property gives more
	 * information about the exact position that was hit on the path.
	 *
	 * @name HitResult#location
	 * @property
	 * @type CurveLocation
	 */

	/**
	 * If the HitResult has a type of 'pixel', this property refers to the color
	 * of the pixel on the {@link Raster} that was hit.
	 *
	 * @name HitResult#color
	 * @property
	 * @type RgbColor
	 */

	/**
	 * If the HitResult has a type of 'stroke', 'segment', 'handle-in' or
	 * 'handle-out', this property refers to the Segment that was hit or that
	 * is closest to the hitResult.location on the curve.
	 *
	 * @name HitResult#segment
	 * @property
	 * @type Segment
	 */

	/**
	 * Describes the actual coordinates of the segment, handle or bounding box
	 * corner that was hit.
	 *
	 * @name HitResult#point
	 * @property
	 * @type Point
	 */

	statics: {
		/**
		 * Merges default options into options hash for #hitTest() calls, and
		 * marks as merged, to prevent repeated merging in nested calls.
		 *
		 * @private
		 */
		getOptions: function(point, options) {
			return options && options._merged ? options : Base.merge({
				// Use the converted options object to perform point conversion
				// only once.
				point: Point.read(arguments, 0, 1),
				// Type of item, for instanceof check: PathItem, TexItem, etc
				type: null,
				// Tolerance
				tolerance: 2,
				// Hit the fill of items
				fill: !options,
				// Hit the curves of path items, taking into account the stroke
				// width.
				stroke: !options,
				// Hit the part of segments that curves pass through, excluding
				// its segments (Segment#point)
				segments: !options,
				// Hit the parts of segments that define the curvature
				handles: false,
				// Only first or last segment hits on path (mutually exclusive
				// with segments: true)
				ends: false,
				// Hit test the center of the bounds
				center: false,
				// Hit test the corners and side-centers of the boudning box
				bounds: false,
				//  Hit items that are marked as guides
				guides: false,
				// Only hit selected objects
				selected: false,
				// Mark as merged, so next time Base.merge isn't called
				_merged: true
			}, options);
		}
	}
});


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Segment
 *
 * @class The Segment object represents the points of a path through which its
 * {@link Curve} objects pass. The segments of a path can be accessed through
 * its {@link Path#segments} array.
 *
 * Each segment consists of an anchor point ({@link Segment#point}) and
 * optionaly an incoming and an outgoing handle ({@link Segment#handleIn} and
 * {@link Segment#handleOut}), describing the tangents of the two {@link Curve}
 * objects that are connected by this segment.
 */
var Segment = this.Segment = Base.extend(/** @lends Segment# */{
	/**
	 * Creates a new Segment object.
	 *
	 * @param {Point} [point={x: 0, y: 0}] the anchor point of the segment
	 * @param {Point} [handleIn={x: 0, y: 0}] the handle point relative to the
	 *        anchor point of the segment that describes the in tangent of the
	 *        segment.
	 * @param {Point} [handleOut={x: 0, y: 0}] the handle point relative to the
	 *        anchor point of the segment that describes the out tangent of the
	 *        segment.
	 *
	 * @example {@paperscript}
	 * var handleIn = new Point(-80, -100);
	 * var handleOut = new Point(80, 100);
	 *
	 * var firstPoint = new Point(100, 50);
	 * var firstSegment = new Segment(firstPoint, null, handleOut);
	 *
	 * var secondPoint = new Point(300, 50);
	 * var secondSegment = new Segment(secondPoint, handleIn, null);
	 *
	 * var path = new Path(firstSegment, secondSegment);
	 * path.strokeColor = 'black';
	 */
	initialize: function(arg0, arg1, arg2, arg3, arg4, arg5) {
		var count = arguments.length,
			createPoint = SegmentPoint.create,
			point, handleIn, handleOut;
		if (count == 0) {
			// Nothing
		} else if (count == 1) {
			// TODO: If beans are not activated, this won't copy from existing
			// segments. OK?
			if (arg0.point) {
				point = arg0.point;
				handleIn = arg0.handleIn;
				handleOut = arg0.handleOut;
			} else {
				point = arg0;
			}
		} else if (count < 6) {
			if (count == 2 && arg1.x === undefined) {
				point = [ arg0, arg1 ];
			} else {
				point = arg0;
				// Doesn't matter if these arguments exist, SegmentPointcreate
				// produces creates points with (0, 0) otherwise
				handleIn = arg1;
				handleOut = arg2;
			}
		} else if (count == 6) {
			point = [ arg0, arg1 ];
			handleIn = [ arg2, arg3 ];
			handleOut = [ arg4, arg5 ];
		}
		createPoint(this, '_point', point);
		createPoint(this, '_handleIn', handleIn);
		createPoint(this, '_handleOut', handleOut);
	},

	_changed: function(point) {
		if (!this._path)
			return;
		// Delegate changes to affected curves if they exist
		var curve = this._path._curves && this.getCurve(), other;
		if (curve) {
			curve._changed();
			// Get the other affected curve, which is the previous one for
			// _point or _handleIn changing when this segment is _segment1 of
			// the curve, for all other cases it's the next (e.g. _handleOut
			// when this segment is _segment2)
			if (other = (curve[point == this._point
					|| point == this._handleIn && curve._segment1 == this
					? 'getPrevious' : 'getNext']())) {
				other._changed();
			}
		}
		this._path._changed(Change.GEOMETRY);
	},

	/**
	 * The anchor point of the segment.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		return this._point;
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		// Do not replace the internal object but update it instead, so
		// references to it are kept alive.
		this._point.set(point.x, point.y);
	},

	/**
	 * The handle point relative to the anchor point of the segment that
	 * describes the in tangent of the segment.
	 *
	 * @type Point
	 * @bean
	 */
	getHandleIn: function() {
		return this._handleIn;
	},

	setHandleIn: function(point) {
		point = Point.read(arguments);
		// See #setPoint:
		this._handleIn.set(point.x, point.y);
		// Update corner accordingly
		// this.corner = !this._handleIn.isColinear(this._handleOut);
	},

	/**
	 * The handle point relative to the anchor point of the segment that
	 * describes the out tangent of the segment.
	 *
	 * @type Point
	 * @bean
	 */
	getHandleOut: function() {
		return this._handleOut;
	},

	setHandleOut: function(point) {
		point = Point.read(arguments);
		// See #setPoint:
		this._handleOut.set(point.x, point.y);
		// Update corner accordingly
		// this.corner = !this._handleIn.isColinear(this._handleOut);
	},

	_isSelected: function(point) {
		var state = this._selectionState;
		return point == this._point ? !!(state & SelectionState.POINT)
			: point == this._handleIn ? !!(state & SelectionState.HANDLE_IN)
			: point == this._handleOut ? !!(state & SelectionState.HANDLE_OUT)
			: false;
	},

	_setSelected: function(point, selected) {
		var path = this._path,
			selected = !!selected, // convert to boolean
			state = this._selectionState || 0,
			// For performance reasons use array indices to access the various
			// selection states: 0 = point, 1 = handleIn, 2 = handleOut
			selection = [
				!!(state & SelectionState.POINT),
				!!(state & SelectionState.HANDLE_IN),
				!!(state & SelectionState.HANDLE_OUT)
			];
		if (point == this._point) {
			if (selected) {
				// We're selecting point, deselect the handles
				selection[1] = selection[2] = false;
			} else {
				var previous = this.getPrevious(),
					next = this.getNext();
				// When deselecting a point, the handles get selected instead
				// depending on the selection state of their neighbors.
				selection[1] = previous && (previous._point.isSelected()
						|| previous._handleOut.isSelected());
				selection[2] = next && (next._point.isSelected()
						|| next._handleIn.isSelected());
			}
			selection[0] = selected;
		} else {
			var index = point == this._handleIn ? 1 : 2;
			if (selection[index] != selected) {
				// When selecting handles, the point get deselected.
				if (selected)
					selection[0] = false;
				selection[index] = selected;
				// Let path know that we changed something and the view
				// should be redrawn
				path._changed(Change.ATTRIBUTE);
			}
		}
		this._selectionState = (selection[0] ? SelectionState.POINT : 0)
				| (selection[1] ? SelectionState.HANDLE_IN : 0)
				| (selection[2] ? SelectionState.HANDLE_OUT : 0);
		// If the selection state of the segment has changed, we need to let
		// it's path know and possibly add or remove it from
		// project._selectedItems
		if (path && state != this._selectionState)
			path._updateSelection(this, state, this._selectionState);
	},



	/**
	 * Specifies whether the {@link #point} of the segment is selected.
	 * @type Boolean
	 * @bean
	 */
	isSelected: function() {
		return this._isSelected(this._point);
	},

	setSelected: function(selected) {
		this._setSelected(this._point, selected);
	},

	/**
	 * {@grouptitle Hierarchy}
	 *
	 * The index of the segment in the {@link Path#segments} array that the
	 * segment belongs to.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index !== undefined ? this._index : null;
	},

	/**
	 * The path that the segment belongs to.
	 *
	 * @type Path
	 * @bean
	 */
	getPath: function() {
		return this._path || null;
	},

	/**
	 * The curve that the segment belongs to.
	 *
	 * @type Curve
	 * @bean
	 */
	getCurve: function() {
		if (this._path) {
			var index = this._index;
			// The last segment of an open path belongs to the last curve
			if (!this._path._closed && index == this._path._segments.length - 1)
				index--;
			return this._path.getCurves()[index] || null;
		}
		return null;
	},

	/**
	 * {@grouptitle Sibling Segments}
	 *
	 * The next segment in the {@link Path#segments} array that the segment
	 * belongs to. If the segments belongs to a closed path, the first segment
	 * is returned for the last segment of the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getNext: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index + 1]
				|| this._path._closed && segments[0]) || null;
	},

	/**
	 * The previous segment in the {@link Path#segments} array that the
	 * segment belongs to. If the segments belongs to a closed path, the last
	 * segment is returned for the first segment of the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getPrevious: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index - 1]
				|| this._path._closed && segments[segments.length - 1]) || null;
	},

	/**
	 * Returns the reversed the segment, without modifying the segment itself.
	 * @return {Segment} the reversed segment
	 */
	reverse: function() {
		return new Segment(this._point, this._handleOut, this._handleIn);
	},

	/**
	 * Removes the segment from the path that it belongs to.
	 */
	remove: function() {
		return this._path ? !!this._path.removeSegment(this._index) : false;
	},

	clone: function() {
		return new Segment(this._point, this._handleIn, this._handleOut);
	},

	equals: function(segment) {
		return segment == this || segment
				&& this._point.equals(segment._point)
				&& this._handleIn.equals(segment._handleIn)
				&& this._handleOut.equals(segment._handleOut);
	},

	/**
	 * @return {String} A string representation of the segment.
	 */
	toString: function() {
		var parts = [ 'point: ' + this._point ];
		if (!this._handleIn.isZero())
			parts.push('handleIn: ' + this._handleIn);
		if (!this._handleOut.isZero())
			parts.push('handleOut: ' + this._handleOut);
		return '{ ' + parts.join(', ') + ' }';
	},

	_transformCoordinates: function(matrix, coords, change) {
		// Use matrix.transform version() that takes arrays of multiple
		// points for largely improved performance, as no calls to
		// Point.read() and Point constructors are necessary.
		var point = this._point,
			// If change is true, only transform handles if they are set, as
			// _transformCoordinates is called only to change the segment, no
			// to receive the coords.
			// This saves some computation time. If change is false, always
			// use the real handles, as we just want to receive a filled
			// coords array for getBounds().
			handleIn =  !change || !this._handleIn.isZero()
					? this._handleIn : null,
			handleOut = !change || !this._handleOut.isZero()
					? this._handleOut : null,
			x = point._x,
			y = point._y,
			i = 2;
		coords[0] = x;
		coords[1] = y;
		// We need to convert handles to absolute coordinates in order
		// to transform them.
		if (handleIn) {
			coords[i++] = handleIn._x + x;
			coords[i++] = handleIn._y + y;
		}
		if (handleOut) {
			coords[i++] = handleOut._x + x;
			coords[i++] = handleOut._y + y;
		}
		// If no matrix was previded, this was just called to get the coords and
		// we are done now.
		if (!matrix)
			return;
		matrix._transformCoordinates(coords, 0, coords, 0, i / 2);
		x = coords[0];
		y = coords[1];
		if (change) {
			// If change is true, we need to set the new values back
			point._x = x;
			point._y = y;
			i  = 2;
			if (handleIn) {
				handleIn._x = coords[i++] - x;
				handleIn._y = coords[i++] - y;
			}
			if (handleOut) {
				handleOut._x = coords[i++] - x;
				handleOut._y = coords[i++] - y;
			}
		} else {
			// We want to receive the results in coords, so make sure
			// handleIn and out are defined too, even if they're 0
			if (!handleIn) {
				coords[i++] = x;
				coords[i++] = y;
			}
			if (!handleOut) {
				coords[i++] = x;
				coords[i++] = y;
			}
		}
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name SegmentPoint
 * @class An internal version of Point that notifies its segment of each change
 * Note: This prototype is not exported.
 *
 * @private
 */
var SegmentPoint = Point.extend({
	set: function(x, y) {
		this._x = x;
		this._y = y;
		this._owner._changed(this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner._changed(this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner._changed(this);
	},

	isZero: function() {
		// Provide our own version of Point#isZero() that does not use the x / y
		// accessors but the internal properties directly, for performance
		// reasons, since it is used a lot internally.
		return this._x == 0 && this._y == 0;
	},

	setSelected: function(selected) {
		this._owner._setSelected(this, selected);
	},

	isSelected: function() {
		return this._owner._isSelected(this);
	},

	statics: {
		create: function(segment, key, pt) {
			var point = new SegmentPoint(SegmentPoint.dont),
				x, y, selected;
			if (!pt) {
				x = y = 0;
			} else if ((x = pt[0]) !== undefined) { // Array-like
				y = pt[1];
			} else {
				// If not Point-like already, read Point from pt = 3rd argument
				if ((x = pt.x) === undefined) {
					pt = Point.read(arguments, 2, 1);
					x = pt.x;
				}
				y = pt.y;
				selected = pt.selected;
			}
			point._x = x;
			point._y = y;
			point._owner = segment;
			// We need to set the point on the segment before copying over the
			// selected state, as otherwise this won't actually select it.
			segment[key] = point;
			if (selected)
				point.setSelected(true);
			return point;
		}
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// These values are ordered so that SelectionState.POINT has the highest value.
// As Path#_selectedSegmentState is the addition of all segment's states, and is
// used to see if all segments are fully selected, meaning they are set to
// SelectionState.POINT.
var SelectionState = {
	HANDLE_IN: 1,
	HANDLE_OUT: 2,
	POINT: 4
};

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Curve
 *
 * @class The Curve object represents the parts of a path that are connected by
 * two following {@link Segment} objects. The curves of a path can be accessed
 * through its {@link Path#curves} array.
 *
 * While a segment describe the anchor point and its incoming and outgoing
 * handles, a Curve object describes the curve passing between two such
 * segments. Curves and segments represent two different ways of looking at the
 * same thing, but focusing on different aspects. Curves for example offer many
 * convenient ways to work with parts of the path, finding lengths, positions or
 * tangents at given offsets.
 */
var Curve = this.Curve = Base.extend(/** @lends Curve# */{
	/**
	 * Creates a new curve object.
	 *
	 * @param {Segment} segment1
	 * @param {Segment} segment2
	 */
	initialize: function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
		var count = arguments.length;
		if (count == 0) {
			this._segment1 = new Segment();
			this._segment2 = new Segment();
		} else if (count == 1) {
			// TODO: If beans are not activated, this won't copy from
			// an existing segment. OK?
			this._segment1 = new Segment(arg0.segment1);
			this._segment2 = new Segment(arg0.segment2);
		} else if (count == 2) {
			this._segment1 = new Segment(arg0);
			this._segment2 = new Segment(arg1);
		} else if (count == 4) {
			this._segment1 = new Segment(arg0, null, arg1);
			this._segment2 = new Segment(arg3, arg2, null);
		} else if (count == 8) {
			// An array as returned by getValues
			var p1 = Point.create(arg0, arg1),
				p2 = Point.create(arg6, arg7);
			this._segment1 = new Segment(p1, null,
					Point.create(arg2, arg3).subtract(p1));
			this._segment2 = new Segment(p2,
					Point.create(arg4, arg5).subtract(p2), null);
		}
	},

	_changed: function() {
		// Clear cached values.
		delete this._length;
	},

	/**
	 * The first anchor point of the curve.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint1: function() {
		return this._segment1._point;
	},

	setPoint1: function(point) {
		point = Point.read(arguments);
		this._segment1._point.set(point.x, point.y);
	},

	/**
	 * The second anchor point of the curve.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint2: function() {
		return this._segment2._point;
	},

	setPoint2: function(point) {
		point = Point.read(arguments);
		this._segment2._point.set(point.x, point.y);
	},

	/**
	 * The handle point that describes the tangent in the first anchor point.
	 *
	 * @type Point
	 * @bean
	 */
	getHandle1: function() {
		return this._segment1._handleOut;
	},

	setHandle1: function(point) {
		point = Point.read(arguments);
		this._segment1._handleOut.set(point.x, point.y);
	},

	/**
	 * The handle point that describes the tangent in the second anchor point.
	 *
	 * @type Point
	 * @bean
	 */
	getHandle2: function() {
		return this._segment2._handleIn;
	},

	setHandle2: function(point) {
		point = Point.read(arguments);
		this._segment2._handleIn.set(point.x, point.y);
	},

	/**
	 * The first segment of the curve.
	 *
	 * @type Segment
	 * @bean
	 */
	getSegment1: function() {
		return this._segment1;
	},

	/**
	 * The second segment of the curve.
	 *
	 * @type Segment
	 * @bean
	 */
	getSegment2: function() {
		return this._segment2;
	},

	/**
	 * The path that the curve belongs to.
	 *
	 * @type Path
	 * @bean
	 */
	getPath: function() {
		return this._path;
	},

	/**
	 * The index of the curve in the {@link Path#curves} array.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._segment1._index;
	},

	/**
	 * The next curve in the {@link Path#curves} array that the curve
	 * belongs to.
	 *
	 * @type Curve
	 * @bean
	 */
	getNext: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index + 1]
				|| this._path._closed && curves[0]) || null;
	},

	/**
	 * The previous curve in the {@link Path#curves} array that the curve
	 * belongs to.
	 *
	 * @type Curve
	 * @bean
	 */
	getPrevious: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index - 1]
				|| this._path._closed && curves[curves.length - 1]) || null;
	},

	/**
	 * Specifies whether the handles of the curve are selected.
	 *
	 * @type Boolean
	 * @bean
	 */
	isSelected: function() {
		return this.getHandle1().isSelected() && this.getHandle2().isSelected();
	},

	setSelected: function(selected) {
		this.getHandle1().setSelected(selected);
		this.getHandle2().setSelected(selected);
	},

	getValues: function() {
		return Curve.getValues(this._segment1, this._segment2);
	},

	getPoints: function() {
		// Convert to array of absolute points
		var coords = this.getValues(),
			points = [];
		for (var i = 0; i < 8; i += 2)
			points.push(Point.create(coords[i], coords[i + 1]));
		return points;
	},

	// DOCS: document Curve#getLength(from, to)
	/**
	 * The approximated length of the curve in points.
	 *
	 * @type Number
	 * @bean
	 */
	getLength: function(/* from, to */) {
		// Hide parameters from Bootstrap so it injects bean too
		var from = arguments[0],
			to = arguments[1];
			fullLength = arguments.length == 0 || from == 0 && to == 1;
		if (fullLength && this._length != null)
			return this._length;
		var length = Curve.getLength(this.getValues(), from, to);
		if (fullLength)
			this._length = length;
		return length;
	},

	getPart: function(from, to) {
		return new Curve(Curve.getPart(this.getValues(), from, to));
	},

	/**
	 * Checks if this curve is linear, meaning it does not define any curve
	 * handle.

	 * @return {Boolean} {@true the curve is linear}
	 */
	isLinear: function() {
		return this._segment1._handleOut.isZero()
				&& this._segment2._handleIn.isZero();
	},

	// PORT: Add support for start parameter to Sg
	// PORT: Rename #getParameter(length) -> #getParameterAt(offset)
	// DOCS: Document #getParameter(length, start)
	/**
	 * @param {Number} offset
	 * @param {Number} [start]
	 * @return {Number}
	 */
	getParameterAt: function(offset, start) {
		return Curve.getParameterAt(this.getValues(), offset,
				start !== undefined ? start : offset < 0 ? 1 : 0);
	},

	/**
	 * Returns the point on the curve at the specified position.
	 *
	 * @param {Number} parameter the position at which to find the point as
	 *        a value between {@code 0} and {@code 1}.
	 * @return {Point}
	 */
	getPoint: function(parameter) {
		return Curve.evaluate(this.getValues(), parameter, 0);
	},

	/**
	 * Returns the tangent point on the curve at the specified position.
	 *
	 * @param {Number} parameter the position at which to find the tangent
	 *        point as a value between {@code 0} and {@code 1}.
	 */
	getTangent: function(parameter) {
		return Curve.evaluate(this.getValues(), parameter, 1);
	},

	/**
	 * Returns the normal point on the curve at the specified position.
	 *
	 * @param {Number} parameter the position at which to find the normal
	 *        point as a value between {@code 0} and {@code 1}.
	 */
	getNormal: function(parameter) {
		return Curve.evaluate(this.getValues(), parameter, 2);
	},

	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getParameter: function(point) {
		point = Point.read(point);
		return Curve.getParameter(this.getValues(), point.x, point.y);
	},

	getCrossings: function(point, roots) {
		// Implement the crossing number algorithm:
		// http://en.wikipedia.org/wiki/Point_in_polygon
		// Solve the y-axis cubic polynominal for point.y and count all
		// solutions to the right of point.x as crossings.
		var vals = this.getValues(),
			num = Curve.solveCubic(vals, 1, point.y, roots),
			crossings = 0;
		for (var i = 0; i < num; i++) {
			var t = roots[i];
			if (t >= 0 && t < 1 && Curve.evaluate(vals, t, 0).x > point.x) {
				// If we're close to 0 and are not changing y-direction from the
				// previous curve, do not count this root, as we're merely
				// touching a tip. Passing 1 for Curve.evaluate()'s type means
				// we're calculating tangents, and then check their y-slope for
				// a change of direction:
				if (t < Numerical.TOLERANCE && Curve.evaluate(
							this.getPrevious().getValues(), 1, 1).y
						* Curve.evaluate(vals, t, 1).y >= 0)
					continue;
				crossings++;
			}
		}
		return crossings;
	},

	// TODO: getLocation
	// TODO: getIntersections
	// TODO: adjustThroughPoint

	/**
	 * Returns a reversed version of the curve, without modifying the curve
	 * itself.
	 *
	 * @return {Curve} a reversed version of the curve
	 */
	reverse: function() {
		return new Curve(this._segment2.reverse(), this._segment1.reverse());
	},

	// TODO: divide
	// TODO: split

	/**
	 * Returns a copy of the curve.
	 *
	 * @return {Curve}
	 */
	clone: function() {
		return new Curve(this._segment1, this._segment2);
	},

	/**
	 * @return {String} A string representation of the curve.
	 */
	toString: function() {
		var parts = [ 'point1: ' + this._segment1._point ];
		if (!this._segment1._handleOut.isZero())
			parts.push('handle1: ' + this._segment1._handleOut);
		if (!this._segment2._handleIn.isZero())
			parts.push('handle2: ' + this._segment2._handleIn);
		parts.push('point2: ' + this._segment2._point);
		return '{ ' + parts.join(', ') + ' }';
	},

	statics: {
		create: function(path, segment1, segment2) {
			var curve = new Curve(Curve.dont);
			curve._path = path;
			curve._segment1 = segment1;
			curve._segment2 = segment2;
			return curve;
		},

		getValues: function(segment1, segment2) {
			var p1 = segment1._point,
				h1 = segment1._handleOut,
				h2 = segment2._handleIn,
				p2 = segment2._point;
    		return [
    			p1._x, p1._y,
    			p1._x + h1._x, p1._y + h1._y,
    			p2._x + h2._x, p2._y + h2._y,
    			p2._x, p2._y
    		];
		},

		evaluate: function(v, t, type) {
			var p1x = v[0], p1y = v[1],
				c1x = v[2], c1y = v[3],
				c2x = v[4], c2y = v[5],
				p2x = v[6], p2y = v[7],
				x, y;

			// Handle special case at beginning / end of curve
			// PORT: Change in Sg too, so 0.000000000001 won't be
			// required anymore
			if (type == 0 && (t == 0 || t == 1)) {
				x = t == 0 ? p1x : p2x;
				y = t == 0 ? p1y : p2y;
			} else {
				// TODO: Find a better solution for this:
				// Prevent tangents and normals of length 0:
				var tMin = Numerical.TOLERANCE;
				if (t < tMin && c1x == p1x && c1y == p1y)
					t = tMin;
				else if (t > 1 - tMin && c2x == p2x && c2y == p2y)
					t = 1 - tMin;
				// Calculate the polynomial coefficients.
				var cx = 3 * (c1x - p1x),
					bx = 3 * (c2x - c1x) - cx,
					ax = p2x - p1x - cx - bx,

					cy = 3 * (c1y - p1y),
					by = 3 * (c2y - c1y) - cy,
					ay = p2y - p1y - cy - by;

				switch (type) {
				case 0: // point
					// Calculate the curve point at parameter value t
					x = ((ax * t + bx) * t + cx) * t + p1x;
					y = ((ay * t + by) * t + cy) * t + p1y;
					break;
				case 1: // tangent
				case 2: // normal
					// Simply use the derivation of the bezier function for both
					// the x and y coordinates:
					x = (3 * ax * t + 2 * bx) * t + cx;
					y = (3 * ay * t + 2 * by) * t + cy;
					break;
				}
			}
			// The normal is simply the rotated tangent:
			// TODO: Rotate normals the other way in Scriptographer too?
			// (Depending on orientation, I guess?)
			return type == 2 ? new Point(y, -x) : new Point(x, y);
		},

		subdivide: function(v, t) {
			var p1x = v[0], p1y = v[1],
				c1x = v[2], c1y = v[3],
				c2x = v[4], c2y = v[5],
				p2x = v[6], p2y = v[7];
			if (t === undefined)
				t = 0.5;
			// Triangle computation, with loops unrolled.
			var u = 1 - t,
				// Interpolate from 4 to 3 points
				p3x = u * p1x + t * c1x, p3y = u * p1y + t * c1y,
				p4x = u * c1x + t * c2x, p4y = u * c1y + t * c2y,
				p5x = u * c2x + t * p2x, p5y = u * c2y + t * p2y,
				// Interpolate from 3 to 2 points
				p6x = u * p3x + t * p4x, p6y = u * p3y + t * p4y,
				p7x = u * p4x + t * p5x, p7y = u * p4y + t * p5y,
				// Interpolate from 2 points to 1 point
				p8x = u * p6x + t * p7x, p8y = u * p6y + t * p7y;
			// We now have all the values we need to build the subcurves:
			return [
				[p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y], // left
				[p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y] // right
			];
		},

		// Converts from the point coordinates (p1, c1, c2, p2) for one axis to
		// the polynomial coefficients and solves the polynomial for val
		solveCubic: function (v, coord, val, roots) {
			var p1 = v[coord],
				c1 = v[coord + 2],
				c2 = v[coord + 4],
				p2 = v[coord + 6],
				c = 3 * (c1 - p1),
				b = 3 * (c2 - c1) - c,
				a = p2 - p1 - c - b;
			return Numerical.solveCubic(a, b, c, p1 - val, roots,
					Numerical.TOLERANCE);
		},

		getParameter: function(v, x, y) {
			var txs = [],
				tys = [],
				sx = Curve.solveCubic(v, 0, x, txs),
				sy = Curve.solveCubic(v, 1, y, tys),
				tx, ty;
			// sx, sy == -1 means infinite solutions:
			// Loop through all solutions for x and match with solutions for y,
			// to see if we either have a matching pair, or infinite solutions
			// for one or the other.
			for (var cx = 0;  sx == -1 || cx < sx;) {
				if (sx == -1 || (tx = txs[cx++]) >= 0 && tx <= 1) {
					for (var cy = 0; sy == -1 || cy < sy;) {
						if (sy == -1 || (ty = tys[cy++]) >= 0 && ty <= 1) {
							// Handle infinite solutions by assigning root of
							// the other polynomial
							if (sx == -1) tx = ty;
							else if (sy == -1) ty = tx;
							// Use average if we're within tolerance
							if (Math.abs(tx - ty) < Numerical.TOLERANCE)
								return (tx + ty) * 0.5;
						}
					}
					// Avoid endless loops here: If sx is infinite and there was
					// no fitting ty, there's no solution for this bezier
					if (sx == -1)
						break;
				}
			}
			return null;
		},

		// TODO: Find better name
		getPart: function(v, from, to) {
			if (from > 0)
				v = Curve.subdivide(v, from)[1]; // [1] right
			// Interpolate the  parameter at 'to' in the new curve and
			// cut there.
			if (to < 1)
				v = Curve.subdivide(v, (to - from) / (1 - from))[0]; // [0] left
			return v;
		},

		isFlatEnough: function(v) {
			// Thanks to Kaspar Fischer for the following:
			// http://www.inf.ethz.ch/personal/fischerk/pubs/bez.pdf
			var p1x = v[0], p1y = v[1],
				c1x = v[2], c1y = v[3],
				c2x = v[4], c2y = v[5],
				p2x = v[6], p2y = v[7],
				ux = 3 * c1x - 2 * p1x - p2x,
				uy = 3 * c1y - 2 * p1y - p2y,
				vx = 3 * c2x - 2 * p2x - p1x,
				vy = 3 * c2y - 2 * p2y - p1y;
			return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy) < 1;
		}
	}
}, new function() { // Scope for methods that require numerical integration

	function getLengthIntegrand(v) {
		// Calculate the coefficients of a Bezier derivative.
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],

			ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
			bx = 6 * (p1x + c2x) - 12 * c1x,
			cx = 3 * (c1x - p1x),

			ay = 9 * (c1y - c2y) + 3 * (p2y - p1y),
			by = 6 * (p1y + c2y) - 12 * c1y,
			cy = 3 * (c1y - p1y);

		return function(t) {
			// Calculate quadratic equations of derivatives for x and y
			var dx = (ax * t + bx) * t + cx,
				dy = (ay * t + by) * t + cy;
			return Math.sqrt(dx * dx + dy * dy);
		};
	}

	// Amount of integral evaluations for the interval 0 <= a < b <= 1
	function getIterations(a, b) {
		// Guess required precision based and size of range...
		// TODO: There should be much better educated guesses for
		// this. Also, what does this depend on? Required precision?
		return Math.max(2, Math.min(16, Math.ceil(Math.abs(b - a) * 32)));
	}

	return {
		statics: true,

		getLength: function(v, a, b) {
			if (a === undefined)
				a = 0;
			if (b === undefined)
				b = 1;
			// if (p1 == c1 && p2 == c2):
			if (v[0] == v[2] && v[1] == v[3] && v[6] == v[4] && v[7] == v[5]) {
				// Straight line
				var dx = v[6] - v[0], // p2x - p1x
					dy = v[7] - v[1]; // p2y - p1y
				return (b - a) * Math.sqrt(dx * dx + dy * dy);
			}
			var ds = getLengthIntegrand(v);
			return Numerical.integrate(ds, a, b, getIterations(a, b));
		},

		getParameterAt: function(v, offset, start) {
			if (offset == 0)
				return start;
			// See if we're going forward or backward, and handle cases
			// differently
			var forward = offset > 0,
				a = forward ? start : 0,
				b = forward ? 1 : start,
				offset = Math.abs(offset),
				// Use integrand to calculate both range length and part
				// lengths in f(t) below.
				ds = getLengthIntegrand(v),
				// Get length of total range
				rangeLength = Numerical.integrate(ds, a, b,
						getIterations(a, b));
			if (offset >= rangeLength)
				return forward ? b : a;
			// Use offset / rangeLength for an initial guess for t, to
			// bring us closer:
			var guess = offset / rangeLength,
				length = 0;
			// Iteratively calculate curve range lengths, and add them up,
			// using integration precision depending on the size of the
			// range. This is much faster and also more precise than not
			// modifing start and calculating total length each time.
			function f(t) {
				var count = getIterations(start, t);
				length += start < t
						? Numerical.integrate(ds, start, t, count)
						: -Numerical.integrate(ds, t, start, count);
				start = t;
				return length - offset;
			}
			return Numerical.findRoot(f, ds,
					forward ? a + guess : b - guess, // Initial guess for x
					a, b, 16, Numerical.TOLERANCE);
		}
	};
}, new function() { // Scope for nearest point on curve problem

	// Solving the Nearest Point-on-Curve Problem and A Bezier-Based Root-Finder
	// by Philip J. Schneider from "Graphics Gems", Academic Press, 1990
	// Optimised for Paper.js

	var maxDepth = 32,
		epsilon = Math.pow(2, -maxDepth - 1);

	var zCubic = [
		[1.0, 0.6, 0.3, 0.1],
		[0.4, 0.6, 0.6, 0.4],
		[0.1, 0.3, 0.6, 1.0]
	];

	var xAxis = new Line(new Point(0, 0), new Point(1, 0));

	 /**
	  * Given a point and a Bezier curve, generate a 5th-degree Bezier-format
	  * equation whose solution finds the point on the curve nearest the
	  * user-defined point.
	  */
	function toBezierForm(v, point) {
		var n = 3, // degree of B(t)
	 		degree = 5, // degree of B(t) . P
			c = [],
			d = [],
			cd = [],
			w = [];
		for(var i = 0; i <= n; i++) {
			// Determine the c's -- these are vectors created by subtracting
			// point point from each of the control points
			c[i] = v[i].subtract(point);
			// Determine the d's -- these are vectors created by subtracting
			// each control point from the next
			if (i < n)
				d[i] = v[i + 1].subtract(v[i]).multiply(n);
		}

		// Create the c,d table -- this is a table of dot products of the
		// c's and d's
		for (var row = 0; row < n; row++) {
			cd[row] = [];
			for (var column = 0; column <= n; column++)
				cd[row][column] = d[row].dot(c[column]);
		}

		// Now, apply the z's to the dot products, on the skew diagonal
		// Also, set up the x-values, making these "points"
		for (var i = 0; i <= degree; i++)
			w[i] = new Point(i / degree, 0);

		for (k = 0; k <= degree; k++) {
			var lb = Math.max(0, k - n + 1),
				ub = Math.min(k, n);
			for (var i = lb; i <= ub; i++) {
				var j = k - i;
				w[k].y += cd[j][i] * zCubic[j][i];
			}
		}

		return w;
	}

	/**
	 * Given a 5th-degree equation in Bernstein-Bezier form, find all of the
	 * roots in the interval [0, 1].  Return the number of roots found.
	 */
	function findRoots(w, depth) {
		switch (countCrossings(w)) {
		case 0:
			// No solutions here
			return [];
		case 1:
			// Unique solution
			// Stop recursion when the tree is deep enough
			// if deep enough, return 1 solution at midpoint
			if (depth >= maxDepth)
				return [0.5 * (w[0].x + w[5].x)];
			// Compute intersection of chord from first control point to last
			// with x-axis.
			if (isFlatEnough(w)) {
				var line = new Line(w[0], w[5], true);
				// Compare the line's squared length with EPSILON. If we're
				// below, #intersect() will return null because of division
				// by near-zero.
				return [ line.vector.getLength(true) <= Numerical.EPSILON
						? line.point.x
						: xAxis.intersect(line).x ];
			}
		}

		// Otherwise, solve recursively after
		// subdividing control polygon
		var p = [[]],
			left = [],
			right = [];
		for (var j = 0; j <= 5; j++)
		 	p[0][j] = new Point(w[j]);

		// Triangle computation
		for (var i = 1; i <= 5; i++) {
			p[i] = [];
			for (var j = 0 ; j <= 5 - i; j++)
				p[i][j] = p[i - 1][j].add(p[i - 1][j + 1]).multiply(0.5);
		}
		for (var j = 0; j <= 5; j++) {
			left[j]  = p[j][0];
			right[j] = p[5 - j][j];
		}

		return findRoots(left, depth + 1).concat(findRoots(right, depth + 1));
	}

	/**
	 * Count the number of times a Bezier control polygon  crosses the x-axis.
	 * This number is >= the number of roots.
	 */
	function countCrossings(v) {
		var crossings = 0,
			prevSign = null;
		for (var i = 0, l = v.length; i < l; i++)  {
			var sign = v[i].y < 0 ? -1 : 1;
			if (prevSign != null && sign != prevSign)
				crossings++;
			prevSign = sign;
		}
		return crossings;
	}

	/**
	 * Check if the control polygon of a Bezier curve is flat enough for
	 * recursive subdivision to bottom out.
	 */
	function isFlatEnough(v) {
		// Find the  perpendicular distance from each interior control point to
		// line connecting v[0] and v[degree]

		// Derive the implicit equation for line connecting first
		// and last control points
		var n = v.length - 1,
			a = v[0].y - v[n].y,
			b = v[n].x - v[0].x,
			c = v[0].x * v[n].y - v[n].x * v[0].y,
			maxAbove = 0,
			maxBelow = 0;
		// Find the largest distance
		for (var i = 1; i < n; i++) {
			// Compute distance from each of the points to that line
			var val = a * v[i].x + b * v[i].y + c,
				dist = val * val;
			if (val < 0 && dist > maxBelow) {
				maxBelow = dist;
			} else if (dist > maxAbove) {
				maxAbove = dist;
			}
		}
		// Compute intercepts of bounding box
		return Math.abs((maxAbove + maxBelow) / (2 * a * (a * a + b * b)))
				< epsilon;
	}

	return {
		getNearestLocation: function(point) {
			// NOTE: If we allow #matrix on Path, we need to inverse-transform
			// point here first.
			// point = this._matrix.inverseTransform(point);
			var w = toBezierForm(this.getPoints(), point);
			// Also look at beginning and end of curve (t = 0 / 1)
			var roots = findRoots(w, 0).concat([0, 1]);
			var minDist = Infinity,
				minT,
				minPoint;
			// There are always roots, since we add [0, 1] above.
			for (var i = 0; i < roots.length; i++) {
				var pt = this.getPoint(roots[i]),
					dist = point.getDistance(pt, true);
				// We're comparing squared distances
				if (dist < minDist) {
					minDist = dist;
					minT = roots[i];
					minPoint = pt;
				}
			}
			return new CurveLocation(this, minT, minPoint, Math.sqrt(minDist));
		},

		getNearestPoint: function(point) {
			return this.getNearestLocation(point).getPoint();
		}
	};
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CurveLocation
 *
 * @class CurveLocation objects describe a location on {@link Curve}
 * objects, as defined by the curve {@link #parameter}, a value between
 * {@code 0} (beginning of the curve) and {@code 1} (end of the curve). If
 * the curve is part of a {@link Path} item, its {@link #index} inside the
 * {@link Path#curves} array is also provided.
 *
 * The class is in use in many places, such as
 * {@link Path#getLocationAt(offset)}, Path#getNearestLocation(point), etc.
 */
CurveLocation = Base.extend(/** @lends CurveLocation# */{
	// DOCS: CurveLocation class description: add these back when the  mentioned
	// functioned have been added: {@link Path#split(location)},
	// {@link PathItem#getIntersections(path)}, etc.
	/**
	 * Creates a new CurveLocation object.
	 *
	 * @param {Curve} curve
	 * @param {Number} parameter
	 * @param {Point} point
	 */
	initialize: function(curve, parameter, point, distance) {
		this._curve = curve;
		this._parameter = parameter;
		this._point = point;
		this._distance = distance;
	},

	/**
	 * The segment of the curve which is closer to the described location.
	 *
	 * @type Segment
	 * @bean
	 */
	getSegment: function() {
		if (!this._segment) {
			var curve = this._curve,
				parameter = this.getParameter();
			if (parameter == 0) {
				this._segment = curve._segment1;
			} else if (parameter == 1) {
				this._segment = curve._segment2;
			} else if (parameter == null) {
				return null;
			} else {
				// Determine the closest segment by comparing curve lengths
				this._segment = curve.getLength(0, parameter)
					< curve.getLength(parameter, 1)
						? curve._segment1
						: curve._segment2;
			}
		}
		return this._segment;
	},

	/**
	 * The curve by which the location is defined.
	 *
	 * @type Curve
	 * @bean
	 */
	getCurve: function() {
		return this._curve;
	},

	/**
	 * The path this curve belongs to, if any.
	 *
	 * @type Item
	 * @bean
	 */
	getPath: function() {
		return this._curve && this._curve._path;
	},

	/**
	 * The index of the curve within the {@link Path#curves} list, if the
	 * curve is part of a {@link Path} item.
	 *
	 * @type Index
	 * @bean
	 */
	getIndex: function() {
		return this._curve && this._curve.getIndex();
	},

	/**
	 * The length of the path from its beginning up to the location described
	 * by this object.
	 *
	 * @type Number
	 * @bean
	 */
	getOffset: function() {
		var path = this._curve && this._curve._path;
		return path && path._getOffset(this);
	},

	/**
	 * The length of the curve from its beginning up to the location described
	 * by this object.
	 *
	 * @type Number
	 * @bean
	 */
	getCurveOffset: function() {
		var parameter = this.getParameter();
		return parameter != null && this._curve
				&& this._curve.getLength(0, parameter);
	},

	/**
	 * The curve parameter, as used by various bezier curve calculations. It is
	 * value between {@code 0} (beginning of the curve) and {@code 1} (end of
	 * the curve).
	 *
	 * @type Number
	 * @bean
	 */
	getParameter: function() {
		if (this._parameter == null && this._curve && this._point)
			this._parameter = this._curve.getParameterAt(this._point);
		return this._parameter;
	},

	/**
	 * The point which is defined by the {@link #curve} and
	 * {@link #parameter}.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		if (!this._point && this._curve && this._parameter != null)
			this._point = this._curve.getPoint(this._parameter);
		return this._point;
	},

	/**
	 * The tangential vector to the {@link #curve} at the given location.
	 *
	 * @type Point
	 * @bean
	 */
	getTangent: function() {
		var parameter = this.getParameter();
		return parameter != null && this._curve
				&& this._curve.getTangent(parameter);
	},

	/**
	 * The normal vector to the {@link #curve} at the given location.
	 *
	 * @type Point
	 * @bean
	 */
	getNormal: function() {
		var parameter = this.getParameter();
		return parameter != null && this._curve
				&& this._curve.getNormal(parameter);
	},

	/**
	 * The distance from the queried point to the returned location.
	 *
	 * @type Number
	 * @bean
	 */
	getDistance: function() {
		return this._distance;
	},

	/**
	 * @return {String} A string representation of the curve location.
	 */
	toString: function() {
		var parts = [],
			point = this.getPoint();
		if (point)
			parts.push('point: ' + point);
		var index = this.getIndex();
		if (index != null)
			parts.push('index: ' + index);
		var parameter = this.getParameter();
		if (parameter != null)
			parts.push('parameter: ' + Base.formatNumber(parameter));
		if (this._distance != null)
			parts.push('distance: ' + Base.formatNumber(this._distance));
		return '{ ' + parts.join(', ') + ' }';
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PathItem
 *
 * @class The PathItem class is the base for any items that describe paths
 * and offer standardised methods for drawing and path manipulation, such as
 * {@link Path} and {@link CompoundPath}.
 *
 * @extends Item
 */
var PathItem = this.PathItem = Item.extend(/** @lends PathItem# */{
	// Note: The PathItem class is currently empty but holds the documentation
	// for all the methods that exist both on Path and CompoundPath.
	/**
	 * Smooth bezier curves without changing the amount of segments or their
	 * points, by only smoothing and adjusting their handle points, for both
	 * open ended and closed paths.
	 *
	 * @name PathItem#smooth
	 * @function
	 *
	 * @example {@paperscript}
	 * // Smoothing a closed shape:
	 *
	 * // Create a rectangular path with its top-left point at
	 * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
	 * path.strokeColor = 'black';
	 *
	 * // Select the path, so we can see its handles:
	 * path.fullySelected = true;
	 *
	 * // Create a copy of the path and move it 100pt to the right:
	 * var copy = path.clone();
	 * copy.position.x += 100;
	 *
	 * // Smooth the segments of the copy:
	 * copy.smooth();
	 *
	 * @example {@paperscript height=220}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 50));
	 *
	 * var y = 5;
	 * var x = 3;
	 *
	 * for (var i = 0; i < 28; i++) {
	 *     y *= -1.1;
	 *     x *= 1.1;
	 *     path.lineBy(x, y);
	 * }
	 *
	 * // Create a copy of the path and move it 100pt down:
	 * var copy = path.clone();
	 * copy.position.y += 120;
	 *
	 * // Set its stroke color to red:
	 * copy.strokeColor = 'red';
	 *
	 * // Smooth the segments of the copy:
	 * copy.smooth();
	 */

	/**
	 * {@grouptitle Postscript Style Drawing Commands}
	 *
	 * If called on a {@link CompoundPath}, a new {@link Path} is created as a
	 * child and the point is added as its first segment. On a normal empty
	 * {@link Path}, the point is simply added as its first segment.
	 *
	 * @name PathItem#moveTo
	 * @function
	 * @param {Point} point
	 */

	// DOCS: Document #lineTo()
	/**
	 * @name PathItem#lineTo
	 * @function
	 * @param {Point} point
	 */

	/**
	 * Adds a cubic bezier curve to the path, defined by two handles and a to
	 * point.
	 *
	 * @name PathItem#cubicCurveTo
	 * @function
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} to
	 */

	/**
	 * Adds a quadratic bezier curve to the path, defined by a handle and a to
	 * point.
	 *
	 * @name PathItem#quadraticCurveTo
	 * @function
	 * @param {Point} handle
	 * @param {Point} to
	 */

	// DOCS: Document PathItem#curveTo() 'paramater' param.
	/**
	 * Draws a curve from the position of the last segment point in the path
	 * that goes through the specified {@code through} point, to the specified
	 * {@code to} point by adding one segment to the path.
	 *
	 * @name PathItem#curveTo
	 * @function
	 * @param {Point} through the point through which the curve should go
	 * @param {Point} to the point where the curve should end
	 * @param {Number} [parameter=0.5]
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 *
	 * var myPath;
	 * function onMouseDrag(event) {
	 * 	// If we created a path before, remove it:
	 * 	if (myPath) {
	 * 	    myPath.remove();
	 * 	}
	 *
	 * 	// Create a new path and add a segment point to it
	 * 	// at {x: 150, y: 150):
	 * 	myPath = new Path();
	 * 	myPath.add(150, 150);
	 *
	 * 	// Draw a curve through the position of the mouse to 'toPoint'
	 * 	var toPoint = new Point(350, 150);
	 * 	myPath.curveTo(event.point, toPoint);
	 *
	 * 	// Select the path, so we can see its segments:
	 * 	myPath.selected = true;
	 * }
     *
	 * // When the mouse is released, deselect the path
	 * // and set its stroke-color to black:
	 * function onMouseUp(event) {
	 * 	myPath.selected = false;
	 * 	myPath.strokeColor = 'black';
	 * }
	 */

	/**
	 * Draws an arc from the position of the last segment point in the path that
	 * goes through the specified {@code through} point, to the specified
	 * {@code to} point by adding one or more segments to the path.
	 *
	 * @name PathItem#arcTo
	 * @function
	 * @param {Point} through the point where the arc should pass through
	 * @param {Point} to the point where the arc should end
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * var firstPoint = new Point(30, 75);
	 * path.add(firstPoint);
	 *
	 * // The point through which we will create the arc:
	 * var throughPoint = new Point(40, 40);
	 *
	 * // The point at which the arc will end:
	 * var toPoint = new Point(130, 75);
	 *
	 * // Draw an arc through 'throughPoint' to 'toPoint'
	 * path.arcTo(throughPoint, toPoint);
	 *
	 * // Add a red circle shaped path at the position of 'throughPoint':
	 * var circle = new Path.Circle(throughPoint, 3);
	 * circle.fillColor = 'red';
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 *
	 * var myPath;
	 * function onMouseDrag(event) {
	 * 	// If we created a path before, remove it:
	 * 	if (myPath) {
	 * 	    myPath.remove();
	 * 	}
	 *
	 * 	// Create a new path and add a segment point to it
	 * 	// at {x: 150, y: 150):
	 * 	myPath = new Path();
	 * 	myPath.add(150, 150);
	 *
	 * 	// Draw an arc through the position of the mouse to 'toPoint'
	 * 	var toPoint = new Point(350, 150);
	 * 	myPath.arcTo(event.point, toPoint);
	 *
	 * 	// Select the path, so we can see its segments:
	 * 	myPath.selected = true;
	 * }
	 *
	 * // When the mouse is released, deselect the path
	 * // and fill it with black.
	 * function onMouseUp(event) {
	 * 	myPath.selected = false;
	 * 	myPath.fillColor = 'black';
	 * }
	 */
	/**
	 * Draws an arc from the position of the last segment point in the path to
	 * the specified point by adding one or more segments to the path.
	 *
	 * @name PathItem#arcTo
	 * @function
	 * @param {Point} to the point where the arc should end
	 * @param {Boolean} [clockwise=true] specifies whether the arc should be
	 *        drawn in clockwise direction.
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 75));
	 * path.arcTo(new Point(130, 75));
	 *
	 * var path2 = new Path();
	 * path2.strokeColor = 'red';
	 * path2.add(new Point(180, 25));
	 *
	 * // To draw an arc in anticlockwise direction,
	 * // we pass 'false' as the second argument to arcTo:
	 * path2.arcTo(new Point(280, 25), false);
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 * var myPath;
	 *
	 * // The mouse has to move at least 20 points before
	 * // the next mouse drag event is fired:
	 * tool.minDistance = 20;
	 *
	 * // When the user clicks, create a new path and add
	 * // the current mouse position to it as its first segment:
	 * function onMouseDown(event) {
	 * 	myPath = new Path();
	 * 	myPath.strokeColor = 'black';
	 * 	myPath.add(event.point);
	 * }
	 *
	 * // On each mouse drag event, draw an arc to the current
	 * // position of the mouse:
	 * function onMouseDrag(event) {
	 * 	myPath.arcTo(event.point);
	 * }
	 */

	/**
	 * Closes the path. When closed, Paper.js connects the first and last
	 * segments.
	 *
	 * @name PathItem#closePath
	 * @function
	 * @see Path#closed
	 */

	/**
	 * {@grouptitle Relative Drawing Commands}
	 *
	 * If called on a {@link CompoundPath}, a new {@link Path} is created as a
	 * child and the point is added as its first segment relative to the
	 * position of the last segment of the current path.
	 *
	 * @name PathItem#moveBy
	 * @function
	 * @param {Point} point
	 */

	/**
	 * Adds a segment relative to the last segment point of the path.
	 *
	 * @name PathItem#lineBy
	 * @function
	 * @param {Point} vector The vector which is added to the position of the
	 *        last segment of the path, to become the new segment.
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add a segment at {x: 50, y: 50}
	 * path.add(25, 25);
	 *
	 * // Add a segment relative to the last segment of the path.
	 * // 50 in x direction and 0 in y direction, becomes {x: 75, y: 25}
	 * path.lineBy(50, 0);
	 *
	 * // 0 in x direction and 50 in y direction, becomes {x: 75, y: 75}
	 * path.lineBy(0, 50);
	 *
	 * @example {@paperscript height=300}
	 * // Drawing a spiral using lineBy:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add the first segment at {x: 50, y: 50}
	 * path.add(view.center);
	 *
	 * // Loop 500 times:
	 * for (var i = 0; i < 500; i++) {
	 * 	// Create a vector with an ever increasing length
	 * 	// and an angle in increments of 45 degrees
	 * 	var vector = new Point({
	 * 	    angle: i * 45,
	 * 	    length: i / 2
	 * 	});
	 * 	// Add the vector relatively to the last segment point:
	 * 	path.lineBy(vector);
	 * }
	 *
	 * // Smooth the handles of the path:
	 * path.smooth();
	 *
	 * // Uncomment the following line and click on 'run' to see
	 * // the construction of the path:
	 * // path.selected = true;
	 */

	// DOCS: Document Path#curveBy()
	/**
	 * @name PathItem#curveBy
	 * @function
	 * @param {Point} throughVector
	 * @param {Point} toVector
	 * @param {Number} [parameter=0.5]
	 */

	// DOCS: Document Path#arcBy()
	/**
	 * @name PathItem#arcBy
	 * @function
	 * @param {Point} throughVector
	 * @param {Point} toVector
	 */
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Path
 *
 * @class The Path item represents a path in a Paper.js project.
 *
 * @extends PathItem
 */
// DOCS: Explain that path matrix is always applied with each transformation.
var Path = this.Path = PathItem.extend(/** @lends Path# */{
	/**
	 * Creates a new Path item and places it at the top of the active layer.
	 *
	 * @param {Segment[]} [segments] An array of segments (or points to be
	 * converted to segments) that will be added to the path.
	 *
	 * @example
	 * // Create an empty path and add segments to it:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(new Point(30, 30));
	 * path.add(new Point(100, 100));
	 *
	 * @example
	 * // Create a path with two segments:
	 * var segments = [new Point(30, 30), new Point(100, 100)];
	 * var path = new Path(segments);
	 * path.strokeColor = 'black';
	 */
	initialize: function(segments) {
		this.base();
		this._closed = false;
		this._selectedSegmentState = 0;
		// Support both passing of segments as array or arguments
		// If it is an array, it can also be a description of a point, so
		// check its first entry for object as well
		this.setSegments(!segments || !Array.isArray(segments)
				|| typeof segments[0] !== 'object' ? arguments : segments);
	},

	clone: function() {
		var copy = this._clone(new Path(this._segments));
		copy._closed = this._closed;
		if (this._clockwise !== undefined)
			copy._clockwise = this._clockwise;
		return copy;
	},

	_changed: function(flags) {
		// Don't use base() for reasons of performance.
		Item.prototype._changed.call(this, flags);
		if (flags & ChangeFlag.GEOMETRY) {
			delete this._length;
			// Clockwise state becomes undefined as soon as geometry changes.
			delete this._clockwise;
		} else if (flags & ChangeFlag.STROKE) {
			// TODO: We could preserve the purely geometric bounds that are not
			// affected by stroke: _bounds.bounds and _bounds.handleBounds
			delete this._bounds;
		}
	},

	/**
	 * The segments contained within the path.
	 *
	 * @type Segment[]
	 * @bean
	 */
	getSegments: function() {
		return this._segments;
	},

	setSegments: function(segments) {
		if (!this._segments) {
			this._segments = [];
		} else {
			this._selectedSegmentState = 0;
			this._segments.length = 0;
			// Make sure new curves are calculated next time we call getCurves()
			if (this._curves)
				delete this._curves;
		}
		this._add(Segment.readAll(segments));
	},

	/**
	 * The first Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getFirstSegment: function() {
		return this._segments[0];
	},

	/**
	 * The last Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getLastSegment: function() {
		return this._segments[this._segments.length - 1];
	},

	/**
	 * The curves contained within the path.
	 *
	 * @type Curve[]
	 * @bean
	 */
	getCurves: function() {
		if (!this._curves) {
			var segments = this._segments,
				length = segments.length;
			// Reduce length by one if it's an open path:
			if (!this._closed && length > 0)
				length--;
			this._curves = new Array(length);
			for (var i = 0; i < length; i++)
				this._curves[i] = Curve.create(this, segments[i],
					// Use first segment for segment2 of closing curve
					segments[i + 1] || segments[0]);
		}
		return this._curves;
	},

	/**
	 * The first Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getFirstCurve: function() {
		return this.getCurves()[0];
	},

	/**
	 * The last Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getLastCurve: function() {
		var curves = this.getCurves();
		return curves[curves.length - 1];
	},

	/**
	 * Specifies whether the path is closed. If it is closed, Paper.js connects
	 * the first and last segments.
	 *
	 * @type Boolean
	 * @bean
	 *
	 * @example {@paperscript}
	 * var myPath = new Path();
	 * myPath.strokeColor = 'black';
	 * myPath.add(new Point(50, 75));
	 * myPath.add(new Point(100, 25));
	 * myPath.add(new Point(150, 75));
	 *
	 * // Close the path:
	 * myPath.closed = true;
	 */
	getClosed: function() {
		return this._closed;
	},

	setClosed: function(closed) {
		// On-the-fly conversion to boolean:
		if (this._closed != (closed = !!closed)) {
			this._closed = closed;
			// Update _curves length
			if (this._curves) {
				var length = this._segments.length,
					i;
				// Reduce length by one if it's an open path:
				if (!closed && length > 0)
					length--;
				this._curves.length = length;
				// If we were closing this path, we need to add a new curve now
				if (closed)
					this._curves[i = length - 1] = Curve.create(this,
						this._segments[i], this._segments[0]);
			}
			this._changed(Change.GEOMETRY);
		}
	},

	// TODO: Consider adding getSubPath(a, b), returning a part of the current
	// path, with the added benefit that b can be < a, and closed looping is
	// taken into account.

	// DOCS: Explain that path matrix is always applied with each transformation.
	transform: function(matrix) {
		return this.base(matrix, true);
	},

	getMatrix: function() {
		// Override matrix getter to always return null, since Paths act as if
		// they do not have a matrix, and always directly apply transformations
		// to their segment points.
		return null;
	},

	setMatrix: function(matrix) {
		// Do nothing for the same reason as above.
	},

	_apply: function(matrix) {
		var coords = new Array(6);
		for (var i = 0, l = this._segments.length; i < l; i++) {
			this._segments[i]._transformCoordinates(matrix, coords, true);
		}
		// See #draw() for an explanation of why we can access _style properties
		// directly here:
		var style = this._style,
			fillColor = style._fillColor,
			strokeColor = style._strokeColor;
		// Try calling transform on colors in case they are GradientColors.
		if (fillColor && fillColor.transform)
			fillColor.transform(matrix);
		if (strokeColor && strokeColor.transform)
			strokeColor.transform(matrix);
		return true;
	},

	/**
	 * Private method that adds a segment to the segment list. It assumes that
	 * the passed object is a segment already and does not perform any checks.
	 * If a curves list was requested, it will kept in sync with the segments
	 * list automatically.
	 */
	_add: function(segs, index) {
		// Local short-cuts:
		var segments = this._segments,
			curves = this._curves,
			amount = segs.length,
			append = index == null,
			index = append ? segments.length : index,
			fullySelected = this.isFullySelected();
		// Scan through segments to add first, convert if necessary and set
		// _path and _index references on them.
		for (var i = 0; i < amount; i++) {
			var segment = segs[i];
			// If the segments belong to another path already, clone them before
			// adding:
			if (segment._path) {
				segment = segs[i] = new Segment(segment);
			}
			segment._path = this;
			segment._index = index + i;
			// Select newly added segments if path was fully selected before
			if (fullySelected)
				segment._selectionState = SelectionState.POINT;
			// If parts of this segment are selected, adjust the internal
			// _selectedSegmentState now
			if (segment._selectionState)
				this._updateSelection(segment, 0, segment._selectionState);
		}
		if (append) {
			// Append them all at the end by using push
			segments.push.apply(segments, segs);
		} else {
			// Insert somewhere else
			segments.splice.apply(segments, [index, 0].concat(segs));
			// Adjust the indices of the segments above.
			for (var i = index + amount, l = segments.length; i < l; i++) {
				segments[i]._index = i;
			}
		}
		// Keep the curves list in sync all the time in case it as requested
		// already. We need to step one index down from the inserted segment to
		// get its curve:
		if (curves && --index >= 0) {
			// Insert a new curve as well and update the curves above
			curves.splice(index, 0, Curve.create(this, segments[index],
				segments[index + 1]));
			// Adjust segment1 now for the curves above the inserted one
			var curve = curves[index + amount];
			if (curve) {
				curve._segment1 = segments[index + amount];
			}
		}
		this._changed(Change.GEOMETRY);
		return segs;
	},

	// PORT: Add support for adding multiple segments at once to Scriptographer
	// DOCS: find a way to document the variable segment parameters of Path#add
	/**
	 * Adds one or more segments to the end of the {@link #segments} array of
	 * this path.
	 *
	 * @param {Segment|Point} segment the segment or point to be added.
	 * @return {Segment} the added segment. This is not necessarily the same
	 * object, e.g. if the segment to be added already belongs to another path.
	 * @operator none
	 *
	 * @example {@paperscript}
	 * // Adding segments to a path using point objects:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add a segment at {x: 30, y: 75}
	 * path.add(new Point(30, 75));
	 *
	 * // Add two segments in one go at {x: 100, y: 20}
	 * // and {x: 170, y: 75}:
	 * path.add(new Point(100, 20), new Point(170, 75));
	 *
	 * @example {@paperscript}
	 * // Adding segments to a path using arrays containing number pairs:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add a segment at {x: 30, y: 75}
	 * path.add([30, 75]);
	 *
	 * // Add two segments in one go at {x: 100, y: 20}
	 * // and {x: 170, y: 75}:
	 * path.add([100, 20], [170, 75]);
	 *
	 * @example {@paperscript}
	 * // Adding segments to a path using objects:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add a segment at {x: 30, y: 75}
	 * path.add({x: 30, y: 75});
	 *
	 * // Add two segments in one go at {x: 100, y: 20}
	 * // and {x: 170, y: 75}:
	 * path.add({x: 100, y: 20}, {x: 170, y: 75});
	 *
	 * @example {@paperscript}
	 * // Adding a segment with handles to a path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 75));
	 *
	 * // Add a segment with handles:
	 * var point = new Point(100, 20);
	 * var handleIn = new Point(-50, 0);
	 * var handleOut = new Point(50, 0);
	 * var added = path.add(new Segment(point, handleIn, handleOut));
	 *
	 * // Select the added segment, so we can see its handles:
	 * added.selected = true;
	 *
	 * path.add(new Point(170, 75));
	 */
	add: function(segment1 /*, segment2, ... */) {
		return arguments.length > 1 && typeof segment1 !== 'number'
			// addSegments
			? this._add(Segment.readAll(arguments))
			// addSegment
			: this._add([ Segment.read(arguments) ])[0];
	},

	// PORT: Add support for adding multiple segments at once to Scriptographer
	/**
	 * Inserts one or more segments at a given index in the list of this path's
	 * segments.
	 *
	 * @param {Number} index the index at which to insert the segment.
	 * @param {Segment|Point} segment the segment or point to be inserted.
	 * @return {Segment} the added segment. This is not necessarily the same
	 * object, e.g. if the segment to be added already belongs to another path.
	 *
	 * @example {@paperscript}
	 * // Inserting a segment:
	 * var myPath = new Path();
	 * myPath.strokeColor = 'black';
	 * myPath.add(new Point(50, 75));
	 * myPath.add(new Point(150, 75));
	 *
	 * // Insert a new segment into myPath at index 1:
	 * myPath.insert(1, new Point(100, 25));
	 *
	 * // Select the segment which we just inserted:
	 * myPath.segments[1].selected = true;
	 *
	 * @example {@paperscript}
	 * // Inserting multiple segments:
	 * var myPath = new Path();
	 * myPath.strokeColor = 'black';
	 * myPath.add(new Point(50, 75));
	 * myPath.add(new Point(150, 75));
	 *
	 * // Insert two segments into myPath at index 1:
	 * myPath.insert(1, [80, 25], [120, 25]);
	 *
	 * // Select the segments which we just inserted:
	 * myPath.segments[1].selected = true;
	 * myPath.segments[2].selected = true;
	 */
	insert: function(index, segment1 /*, segment2, ... */) {
		return arguments.length > 2 && typeof segment1 !== 'number'
			// insertSegments
			? this._add(Segment.readAll(arguments, 1), index)
			// insertSegment
			: this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	// PORT: Add to Scriptographer
	addSegment: function(segment) {
		return this._add([ Segment.read(arguments) ])[0];
	},

	// PORT: Add to Scriptographer
	insertSegment: function(index, segment) {
		return this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	// PORT: Add to Scriptographer
	/**
	 * Adds an array of segments (or types that can be converted to segments)
	 * to the end of the {@link #segments} array.
	 *
	 * @param {Segment[]} segments
	 * @return {Segment[]} an array of the added segments. These segments are
	 * not necessarily the same objects, e.g. if the segment to be added already
	 * belongs to another path.
	 *
	 * @example {@paperscript}
	 * // Adding an array of Point objects:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * var points = [new Point(30, 50), new Point(170, 50)];
	 * path.addSegments(points);
	 *
	 * @example {@paperscript}
	 * // Adding an array of [x, y] arrays:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * var array = [[30, 75], [100, 20], [170, 75]];
	 * path.addSegments(array);
	 *
	 * @example {@paperscript}
	 * // Adding segments from one path to another:
	 *
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.addSegments([[30, 75], [100, 20], [170, 75]]);
	 *
	 * var path2 = new Path();
	 * path2.strokeColor = 'red';
	 *
	 * // Add the second and third segments of path to path2:
	 * path2.add(path.segments[1], path.segments[2]);
	 *
	 * // Move path2 30pt to the right:
	 * path2.position.x += 30;
	 */
	addSegments: function(segments) {
		return this._add(Segment.readAll(segments));
	},

	// PORT: Add to Scriptographer
	/**
	 * Inserts an array of segments at a given index in the path's
	 * {@link #segments} array.
	 *
	 * @param {Number} index the index at which to insert the segments.
	 * @param {Segment[]} segments the segments to be inserted.
	 * @return {Segment[]} an array of the added segments. These segments are
	 * not necessarily the same objects, e.g. if the segment to be added already
	 * belongs to another path.
	 */
	insertSegments: function(index, segments) {
		return this._add(Segment.readAll(segments), index);
	},

	// PORT: Add to Scriptographer
	/**
	 * Removes the segment at the specified index of the path's
	 * {@link #segments} array.
	 *
	 * @param {Number} index the index of the segment to be removed
	 * @return {Segment} the removed segment
	 *
	 * @example {@paperscript}
	 * // Removing a segment from a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 * path.strokeColor = 'black';
	 *
	 * // Remove its second segment:
	 * path.removeSegment(1);
	 *
	 * // Select the path, so we can see its segments:
	 * path.selected = true;
	 */
	removeSegment: function(index) {
		var segments = this.removeSegments(index, index + 1);
		return segments[0] || null;
	},

	// PORT: Add to Scriptographer
	/**
	 * Removes all segments from the path's {@link #segments} array.
	 *
	 * @name Path#removeSegments
	 * @function
	 * @return {Segment[]} an array containing the removed segments
	 */
	/**
	 * Removes the segments from the specified {@code from} index to the
	 * {@code to} index from the path's {@link #segments} array.
	 *
	 * @param {Number} from the beginning index, inclusive
	 * @param {Number} [to=segments.length] the ending index, exclusive
	 * @return {Segment[]} an array containing the removed segments
	 *
	 * @example {@paperscript}
	 * // Removing segments from a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 * path.strokeColor = 'black';
	 *
	 * // Remove the segments from index 1 till index 2:
	 * path.removeSegments(1, 2);
	 *
	 * // Select the path, so we can see its segments:
	 * path.selected = true;
	 */
	removeSegments: function(from, to) {
		from = from || 0;
	 	to = Base.pick(to, this._segments.length);
		var segments = this._segments,
			curves = this._curves,
			last = to >= segments.length,
			removed = segments.splice(from, to - from),
			amount = removed.length;
		if (!amount)
			return removed;
		// Update selection state accordingly
		for (var i = 0; i < amount; i++) {
			var segment = removed[i];
			if (segment._selectionState)
				this._updateSelection(segment, segment._selectionState, 0);
			// Clear the indices and path references of the removed segments
			removed._index = removed._path = undefined;
		}
		// Adjust the indices of the segments above.
		for (var i = from, l = segments.length; i < l; i++)
			segments[i]._index = i;
		// Keep curves in sync
		if (curves) {
			curves.splice(from, amount);
			// Adjust segments for the curves before and after the removed ones
			var curve;
			if (curve = curves[from - 1])
				curve._segment2 = segments[from];
			if (curve = curves[from])
				curve._segment1 = segments[from];
			// If the last segment of a closing path was removed, we need to
			// readjust the last curve of the list now.
			if (last && this._closed && (curve = curves[curves.length - 1]))
				curve._segment2 = segments[0];
		}
		this._changed(Change.GEOMETRY);
		return removed;
	},

	/**
	 * Specifies whether an path is selected and will also return {@code true}
	 * if the path is partially selected, i.e. one or more of its segments is
	 * selected.
	 *
	 * Paper.js draws the visual outlines of selected items on top of your
	 * project. This can be useful for debugging, as it allows you to see the
	 * construction of paths, position of path curves, individual segment points
	 * and bounding boxes of symbol and raster items.
	 *
	 * @type Boolean
	 * @bean
	 * @see Project#selectedItems
	 * @see Segment#selected
	 * @see Point#selected
	 *
	 * @example {@paperscript}
	 * // Selecting an item:
	 * var path = new Path.Circle(new Size(80, 50), 35);
	 * path.selected = true; // Select the path
	 *
	 * @example {@paperscript}
	 * // A path is selected, if one or more of its segments is selected:
	 * var path = new Path.Circle(new Size(80, 50), 35);
	 *
	 * // Select the second segment of the path:
	 * path.segments[1].selected = true;
	 *
	 * // If the path is selected (which it is), set its fill color to red:
	 * if (path.selected) {
	 * 	path.fillColor = 'red';
	 * }
	 *
	 */
	/**
	 * Specifies whether the path and all its segments are selected.
	 *
	 * @type Boolean
	 * @bean
	 *
	 * @example {@paperscript}
	 * // A path is fully selected, if all of its segments are selected:
	 * var path = new Path.Circle(new Size(80, 50), 35);
	 * path.fullySelected = true;
	 *
	 * var path2 = new Path.Circle(new Size(180, 50), 35);
	 * path2.fullySelected = true;
	 *
	 * // Deselect the second segment of the second path:
	 * path2.segments[1].selected = false;
	 *
	 * // If the path is fully selected (which it is),
	 * // set its fill color to red:
	 * if (path.fullySelected) {
	 * 	path.fillColor = 'red';
	 * }
	 *
	 * // If the second path is fully selected (which it isn't, since we just
	 * // deselected its second segment),
	 * // set its fill color to red:
	 * if (path2.fullySelected) {
	 * 	path2.fillColor = 'red';
	 * }
	 */
	isFullySelected: function() {
		return this._selected && this._selectedSegmentState
				== this._segments.length * SelectionState.POINT;
	},

	setFullySelected: function(selected) {
		var length = this._segments.length;
		this._selectedSegmentState = selected
				? length * SelectionState.POINT : 0;
		for (var i = 0; i < length; i++)
			this._segments[i]._selectionState = selected
					? SelectionState.POINT : 0;
		// No need to pass true for noChildren since Path has none anyway.
		this.setSelected(selected);
	},

	_updateSelection: function(segment, oldState, newState) {
		segment._selectionState = newState;
		var total = this._selectedSegmentState += newState - oldState;
		// Set this path as selected in case we have selected segments. Do not
		// unselect if we're down to 0, as the path itself can still remain
		// selected even when empty.
		if (total > 0)
			this.setSelected(true);
	},

	/**
	 * Converts the curves in a path to straight lines with an even distribution
	 * of points. The distance between the produced segments is as close as
	 * possible to the value specified by the {@code maxDistance} parameter.
	 *
	 * @param {Number} maxDistance the maximum distance between the points
	 *
	 * @example {@paperscript}
	 * // Flattening a circle shaped path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle(new Size(80, 50), 35);
	 *
	 * // Select the path, so we can inspect its segments:
	 * path.selected = true;
	 *
	 * // Create a copy of the path and move it 150 points to the right:
	 * var copy = path.clone();
	 * copy.position.x += 150;
	 *
	 * // Convert its curves to points, with a max distance of 20:
	 * copy.flatten(20);
	 *
	 * // Select the copy, so we can inspect its segments:
	 * copy.selected = true;
	 */
	flatten: function(maxDistance) {
		var flattener = new PathFlattener(this),
			pos = 0,
			// Adapt step = maxDistance so the points distribute evenly.
			step = flattener.length / Math.ceil(flattener.length / maxDistance),
			// Add/remove half of step to end, so imprecisions are ok too.
			// For closed paths, remove it, because we don't want to add last
			// segment again
			end = flattener.length + (this._closed ? -step : step) / 2;
		// Iterate over path and evaluate and add points at given offsets
		var segments = [];
		while (pos <= end) {
			segments.push(new Segment(flattener.evaluate(pos, 0)));
			pos += step;
		}
		this.setSegments(segments);
	},

	/**
	 * Smooths a path by simplifying it. The {@link Path#segments} array is
	 * analyzed and replaced by a more optimal set of segments, reducing memory
	 * usage and speeding up drawing.
	 *
	 * @param {Number} [tolerance=2.5]
	 *
	 * @example {@paperscript height=300}
	 * // Click and drag below to draw to draw a line, when you release the
	 * // mouse, the is made smooth using path.simplify():
	 *
	 * var path;
	 * function onMouseDown(event) {
	 * 	// If we already made a path before, deselect it:
	 * 	if (path) {
	 * 		path.selected = false;
	 * 	}
	 *
	 * 	// Create a new path and add the position of the mouse
	 * 	// as its first segment. Select it, so we can see the
	 * 	// segment points:
	 * 	path = new Path();
	 * 	path.strokeColor = 'black';
	 * 	path.add(event.point);
	 * 	path.selected = true;
	 * }
	 *
	 * function onMouseDrag(event) {
	 * 	// On every drag event, add a segment to the path
	 * 	// at the position of the mouse:
	 * 	path.add(event.point);
	 * }
	 *
	 * function onMouseUp(event) {
	 * 	// When the mouse is released, simplify the path:
	 * 	path.simplify();
	 * 	path.selected = true;
	 * }
	 */
	simplify: function(tolerance) {
		if (this._segments.length > 2) {
			var fitter = new PathFitter(this, tolerance || 2.5);
			this.setSegments(fitter.fit());
		}
	},

	// TODO: reduceSegments([flatness])
	// TODO: split(offset) / split(location) / split(index[, parameter])

	/**
	 * Specifies whether the path is oriented clock-wise.
	 *
	 * @type Boolean
	 * @bean
	 */
	isClockwise: function() {
		if (this._clockwise !== undefined)
			return this._clockwise;
		var sum = 0,
			xPre, yPre;
		function edge(x, y) {
			if (xPre !== undefined)
				sum += (xPre - x) * (y + yPre);
			xPre = x;
			yPre = y;
		}
		// Method derived from:
		// http://stackoverflow.com/questions/1165647
		// We treat the curve points and handles as the outline of a polygon of
		// which we determine the orientation using the method of calculating
		// the sum over the edges. This will work even with non-convex polygons,
		// telling you whether it's mostly clockwise
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var seg1 = this._segments[i],
				seg2 = this._segments[i + 1 < l ? i + 1 : 0],
				point1 = seg1._point,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn,
				point2 = seg2._point;
			edge(point1._x, point1._y);
			edge(point1._x + handle1._x, point1._y + handle1._y);
			edge(point2._x + handle2._x, point2._y + handle2._y);
			edge(point2._x, point2._y);
		}
		return sum > 0;
	},

	setClockwise: function(clockwise) {
		// On-the-fly conversion to boolean:
		if (this.isClockwise() != (clockwise = !!clockwise)) {
			// Only revers the path if its clockwise orientation is not the same
			// as what it is now demanded to be.
			this.reverse();
			this._clockwise = clockwise;
		}
	},

	/**
	 * Reverses the segments of the path.
	 */
	reverse: function() {
		this._segments.reverse();
		// Reverse the handles:
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var segment = this._segments[i];
			var handleIn = segment._handleIn;
			segment._handleIn = segment._handleOut;
			segment._handleOut = handleIn;
			segment._index = i;
		}
		// Flip clockwise state if it's defined
		if (this._clockwise !== undefined)
			this._clockwise = !this._clockwise;
	},

	// DOCS: document Path#join in more detail.
	/**
	 * Joins the path with the specified path, which will be removed in the
	 * process.
	 *
	 * @param {Path} path
	 *
	 * @example {@paperscript}
	 * // Joining two paths:
	 * var path = new Path([30, 25], [30, 75]);
	 * path.strokeColor = 'black';
	 *
	 * var path2 = new Path([200, 25], [200, 75]);
	 * path2.strokeColor = 'black';
	 *
	 * // Join the paths:
	 * path.join(path2);
	 *
	 * @example {@paperscript}
	 * // Joining two paths that share a point at the start or end of their
	 * // segments array:
	 * var path = new Path([30, 25], [30, 75]);
	 * path.strokeColor = 'black';
	 *
	 * var path2 = new Path([30, 25], [80, 25]);
	 * path2.strokeColor = 'black';
	 *
	 * // Join the paths:
	 * path.join(path2);
	 *
	 * // After joining, path with have 3 segments, since it
	 * // shared its first segment point with the first
	 * // segment point of path2.
	 *
	 * // Select the path to show that they have joined:
	 * path.selected = true;
	 *
	 * @example {@paperscript}
	 * // Joining two paths that connect at two points:
	 * var path = new Path([30, 25], [80, 25], [80, 75]);
	 * path.strokeColor = 'black';
	 *
	 * var path2 = new Path([30, 25], [30, 75], [80, 75]);
	 * path2.strokeColor = 'black';
	 *
	 * // Join the paths:
	 * path.join(path2);
	 *
	 * // Because the paths were joined at two points, the path is closed
	 * // and has 4 segments.
	 *
	 * // Select the path to show that they have joined:
	 * path.selected = true;
	 */
	join: function(path) {
		if (path) {
			var segments = path._segments,
				last1 = this.getLastSegment(),
				last2 = path.getLastSegment();
			if (last1._point.equals(last2._point))
				path.reverse();
			var first2 = path.getFirstSegment();
			if (last1._point.equals(first2._point)) {
				last1.setHandleOut(first2._handleOut);
				this._add(segments.slice(1));
			} else {
				var first1 = this.getFirstSegment();
				if (first1._point.equals(first2._point))
					path.reverse();
				last2 = path.getLastSegment();
				if (first1._point.equals(last2._point)) {
					first1.setHandleIn(last2._handleIn);
					// Prepend all segments from path except the last one
					this._add(segments.slice(0, segments.length - 1), 0);
				} else {
					this._add(segments.slice(0));
				}
			}
			path.remove();
			// Close if they touch in both places
			var first1 = this.getFirstSegment();
			last1 = this.getLastSegment();
			if (last1._point.equals(first1._point)) {
				first1.setHandleIn(last1._handleIn);
				last1.remove();
				this.setClosed(true);
			}
			this._changed(Change.GEOMETRY);
			return true;
		}
		return false;
	},

	/**
	 * The length of the perimeter of the path.
	 *
	 * @type Number
	 * @bean
	 */
	getLength: function() {
		if (this._length == null) {
			var curves = this.getCurves();
			this._length = 0;
			for (var i = 0, l = curves.length; i < l; i++)
				this._length += curves[i].getLength();
		}
		return this._length;
	},

	_getOffset: function(location) {
		var index = location && location.getIndex();
		if (index != null) {
			var curves = this.getCurves(),
				offset = 0;
			for (var i = 0; i < index; i++)
				offset += curves[i].getLength();
			var curve = curves[index];
			return offset + curve.getLength(0, location.getParameter());
		}
		return null;
	},

	getLocation: function(point) {
		var curves = this.getCurves();
		for (var i = 0, l = curves.length; i < l; i++) {
			var curve = curves[i];
			var t = curve.getParameter(point);
			if (t != null)
				return new CurveLocation(curve, t);
		}
		return null;
	},

	// PORT: Rename functions and add new isParameter argument in Scriptographer
	// DOCS: document Path#getLocationAt
	/**
	 * {@grouptitle Positions on Paths and Curves}
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {CurveLocation}
	 */
	getLocationAt: function(offset, isParameter) {
		var curves = this.getCurves(),
			length = 0;
		if (isParameter) {
			// offset consists of curve index and curve parameter, before and
			// after the fractional digit.
			var index = ~~offset; // = Math.floor()
			return new CurveLocation(curves[index], offset - index);
		}
		for (var i = 0, l = curves.length; i < l; i++) {
			var start = length,
				curve = curves[i];
			length += curve.getLength();
			if (length >= offset) {
				// Found the segment within which the length lies
				return new CurveLocation(curve,
						curve.getParameterAt(offset - start));
			}
		}
		// It may be that through impreciseness of getLength, that the end
		// of the curves was missed:
		if (offset <= this.getLength())
			return new CurveLocation(curves[curves.length - 1], 1);
		return null;
	},

	/**
	 * Get the point on the path at the given offset.
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the point at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Finding the point on a path at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * // We're going to be working with a third of the length
	 * // of the path as the offset:
	 * var offset = path.length / 3;
	 *
	 * // Find the point on the path:
	 * var point = path.getPointAt(offset);
	 *
	 * // Create a small circle shaped path at the point:
	 * var circle = new Path.Circle(point, 3);
	 * circle.fillColor = 'red';
	 *
	 * @example {@paperscript height=150}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 5;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 * 	var offset = i / amount * length;
	 *
	 * 	// Find the point on the path at the given offset:
	 * 	var point = path.getPointAt(offset);
	 *
	 * 	// Create a small circle shaped path at the point:
	 * 	var circle = new Path.Circle(point, 3);
	 * 	circle.fillColor = 'red';
	 * }
	 */
	getPointAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getPoint();
	},

	/**
	 * Get the tangent to the path at the given offset as a vector
	 * point.
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the tangent vector at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Working with the tangent vector at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * // We're going to be working with a third of the length
	 * // of the path as the offset:
	 * var offset = path.length / 3;
	 *
	 * // Find the point on the path:
	 * var point = path.getPointAt(offset);
	 *
	 * // Find the tangent vector at the given offset:
	 * var tangent = path.getTangentAt(offset);
	 *
	 * // Make the tangent vector 60pt long:
	 * tangent.length = 60;
	 *
	 * var path = new Path();
	 * path.strokeColor = 'red';
	 * path.add(point);
	 * path.add(point + tangent);
	 *
	 * @example {@paperscript height=200}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 6;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 * 	var offset = i / amount * length;
	 *
	 * 	// Find the point on the path at the given offset:
	 * 	var point = path.getPointAt(offset);
	 *
	 * 	// Find the normal vector on the path at the given offset:
	 * 	var tangent = path.getTangentAt(offset);
	 *
	 * 	// Make the tangent vector 60pt long:
	 * 	tangent.length = 60;
	 *
	 * 	var line = new Path();
	 * 	line.strokeColor = 'red';
	 * 	line.add(point);
	 * 	line.add(point + tangent);
	 * }
	 */
	getTangentAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getTangent();
	},

	/**
	 * Get the normal to the path at the given offset as a vector point.
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the normal vector at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Working with the normal vector at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * // We're going to be working with a third of the length
	 * // of the path as the offset:
	 * var offset = path.length / 3;
	 *
	 * // Find the point on the path:
	 * var point = path.getPointAt(offset);
	 *
	 * // Find the normal vector at the given offset:
	 * var normal = path.getNormalAt(offset);
	 *
	 * // Make the normal vector 30pt long:
	 * normal.length = 30;
	 *
	 * var path = new Path();
	 * path.strokeColor = 'red';
	 * path.add(point);
	 * path.add(point + normal);
	 *
	 * @example {@paperscript height=200}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 10;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 * 	var offset = i / amount * length;
	 *
	 * 	// Find the point on the path at the given offset:
	 * 	var point = path.getPointAt(offset);
	 *
	 * 	// Find the normal vector on the path at the given offset:
	 * 	var normal = path.getNormalAt(offset);
	 *
	 * 	// Make the normal vector 30pt long:
	 * 	normal.length = 30;
	 *
	 * 	var line = new Path();
	 * 	line.strokeColor = 'red';
	 * 	line.add(point);
	 * 	line.add(point + normal);
	 * }
	 */
	getNormalAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getNormal();
	},

	/**
	 * Returns the nearest location on the path to the specified point.
	 *
	 * @name Path#getNearestLocation
	 * @function
	 * @param point {Point} The point for which we search the nearest location
	 * @return {CurveLocation} The location on the path that's the closest to
	 * the specified point
	 */
	getNearestLocation: function(point) {
		var curves = this.getCurves(),
			minDist = Infinity,
			minLoc = null;
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getNearestLocation(point);
			if (loc._distance < minDist) {
				minDist = loc._distance;
				minLoc = loc;
			}
		}
		return minLoc;
	},

	/**
	 * Returns the nearest point on the path to the specified point.
	 *
	 * @name Path#getNearestPoint
	 * @function
	 * @param point {Point} The point for which we search the nearest point
	 * @return {Point} The point on the path that's the closest to the specified
	 * point
	 */
	getNearestPoint: function(point) {
		return this.getNearestLocation(point).getPoint();
	},

	contains: function(point) {
		point = Point.read(arguments);
		// Note: This only works correctly with even-odd fill rule, or paths
		// that do not overlap with themselves.
		// TODO: Find out how to implement the "Point In Polygon" problem for
		// non-zero fill rule.
		if (!this._closed || !this.getRoughBounds()._containsPoint(point))
			return false;
		// Use the crossing number algorithm, by counting the crossings of the
		// beam in right y-direction with the shape, and see if it's an odd
		// number, meaning the starting point is inside the shape.
		// http://en.wikipedia.org/wiki/Point_in_polygon
		var curves = this.getCurves(),
			crossings = 0,
			// Reuse one array for root-finding, give garbage collector a break
			roots = [];
		for (var i = 0, l = curves.length; i < l; i++)
			crossings += curves[i].getCrossings(point, roots);
		return (crossings & 1) == 1;
	},

	_hitTest: function(point, options) {
		// See #draw() for an explanation of why we can access _style properties
		// directly here:
		var style = this._style,
			tolerance = options.tolerance || 0,
			radius = (options.stroke && style._strokeColor
					? style._strokeWidth / 2 : 0) + tolerance,
			loc,
			res;
		// If we're asked to query for segments, ends or handles, do all that
		// before stroke or fill.
		var coords = [],
			that = this;
		function checkPoint(seg, pt, name) {
			// TODO: We need to transform the point back to the coordinate
			// system of the DOM level on which the inquiry was started!
			if (point.getDistance(pt) < tolerance)
				return new HitResult(name, that, { segment: seg, point: pt });
		}
		function checkSegment(seg, ends) {
			var point = seg._point;
			// Note, when checking for ends, we don't also check for handles,
			// since this will happen afterwards in a separate loop, see below.
			return (ends || options.segments)
					&& checkPoint(seg, point, 'segment')
				|| (!ends && options.handles) && (
					checkPoint(seg, point.add(seg._handleIn), 'handle-in') ||
					checkPoint(seg, point.add(seg._handleOut), 'handle-out'));
		}
		if (options.ends && !options.segments && !this._closed) {
			if (res = checkSegment(this.getFirstSegment(), true)
					|| checkSegment(this.getLastSegment(), true))
				return res;
		} else if (options.segments || options.handles) {
			for (var i = 0, l = this._segments.length; i < l; i++) {
				if (res = checkSegment(this._segments[i]))
					return res;
			}
		}
		// If we're querying for stroke, perform that before fill
		if (options.stroke && radius > 0)
			loc = this.getNearestLocation(point);
		// Don't process loc yet, as we also need to query for stroke after fill
		// in some cases. Simply skip fill query if we already have a matching
		// stroke.
		if (!(loc && loc._distance <= radius) && options.fill
				&& style._fillColor && this.contains(point))
			return new HitResult('fill', this);
		// Now query stroke if we haven't already
		if (!loc && options.stroke && radius > 0)
			loc = this.getNearestLocation(point);
		if (loc && loc._distance <= radius)
			// TODO: Do we need to transform the location back to the coordinate
			// system of the DOM level on which the inquiry was started?
			return options.stroke
					? new HitResult('stroke', this, { location: loc })
					: new HitResult('fill', this);
	}

	// TODO: intersects(item)
	// TODO: contains(item)
	// TODO: intersect(item)
	// TODO: unite(item)
	// TODO: exclude(item)
	// TODO: getIntersections(path)
}, new function() { // Scope for drawing

	// Note that in the code below we're often accessing _x and _y on point
	// objects that were read from segments. This is because the SegmentPoint
	// class overrides the plain x / y properties with getter / setters and
	// stores the values in these private properties internally. To avoid
	// calling of getter functions all the time we directly access these private
	// properties here. The distinction between normal Point objects and
	// SegmentPoint objects maybe seem a bit tedious but is worth the benefit in
	// performance.

	function drawHandles(ctx, segments, matrix) {
		var coords = new Array(6);
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			var state = segment._selectionState,
				selected = state & SelectionState.POINT,
				pX = coords[0],
				pY = coords[1];

			function drawHandle(index) {
				var hX = coords[index],
					hY = coords[index + 1];
				if (pX != hX || pY != hY) {
					ctx.beginPath();
					ctx.moveTo(pX, pY);
					ctx.lineTo(hX, hY);
					ctx.stroke();
					ctx.beginPath();
					ctx.arc(hX, hY, 1.75, 0, Math.PI * 2, true);
					ctx.fill();
				}
			}

			if (selected || (state & SelectionState.HANDLE_IN))
				drawHandle(2);
			if (selected || (state & SelectionState.HANDLE_OUT))
				drawHandle(4);
			// Draw a rectangle at segment.point:
			ctx.save();
			ctx.beginPath();
			ctx.rect(pX - 2, pY - 2, 4, 4);
			ctx.fill();
			// If the point is not selected, draw a white square that is 1 px
			// smaller on all sides:
			if (!selected) {
				ctx.beginPath();
				ctx.rect(pX - 1, pY - 1, 2, 2);
				ctx.fillStyle = '#ffffff';
				ctx.fill();
			}
			ctx.restore();
		}
	}

	function drawSegments(ctx, path, matrix) {
		var segments = path._segments,
			length = segments.length,
			coords = new Array(6),
			first = true,
			pX, pY,
			inX, inY,
			outX, outY;

		function drawSegment(i) {
			var segment = segments[i];
			// Optimise code when no matrix is provided by accessing semgent
			// points hand handles directly, since this is the default when
			// drawing paths. Matrix is only used for drawing selections.
			if (matrix) {
				segment._transformCoordinates(matrix, coords, false);
				pX = coords[0];
				pY = coords[1];
			} else {
				var point = segment._point;
				pX = point._x;
				pY = point._y;
			}
			if (first) {
				ctx.moveTo(pX, pY);
				first = false;
			} else {
				if (matrix) {
					inX = coords[2];
					inY = coords[3];
				} else {
					var handle = segment._handleIn;
					inX = pX + handle._x;
					inY = pY + handle._y;
				}
				if (inX == pX && inY == pY && outX == pX && outY == pY) {
					ctx.lineTo(pX, pY);
				} else {
					ctx.bezierCurveTo(outX, outY, inX, inY, pX, pY);
				}
			}
			if (matrix) {
				outX = coords[4];
				outY = coords[5];
			} else {
				var handle = segment._handleOut;
				outX = pX + handle._x;
				outY = pY + handle._y;
			}
		}

		for (var i = 0; i < length; i++)
			drawSegment(i);
		// Close path by drawing first segment again
		if (path._closed && length > 1)
			drawSegment(0);
	}

	return {
		draw: function(ctx, param) {
			if (!param.compound)
				ctx.beginPath();

			// We can access styles directly on the internal _styles object,
			// since Path items do not have children, thus do not need style
			// accessors for merged styles.
			var style = this._style,
				fillColor = style._fillColor,
				strokeColor = style._strokeColor,
				dashArray = style._dashArray,
				hasDash = strokeColor && dashArray && dashArray.length;

			// Prepare the canvas path if we have any situation that requires it
			// to be defined.
			if (param.compound || this._clipMask || fillColor
					|| strokeColor && !hasDash) {
				drawSegments(ctx, this);
			}

			if (this._closed)
				ctx.closePath();

			if (this._clipMask) {
				ctx.clip();
			} else if (!param.compound && (fillColor || strokeColor)) {
				// If the path is part of a compound path or doesn't have a fill
				// or stroke, there is no need to continue.
				ctx.save();
				this._setStyles(ctx);
				if (fillColor)
					ctx.fill();
				if (strokeColor) {
					if (hasDash) {
						// We cannot use the path created by drawSegments above
						// Use CurveFlatteners to draw dashed paths:
						ctx.beginPath();
						var flattener = new PathFlattener(this),
							from = style._dashOffset, to,
							i = 0;
						while (from < flattener.length) {
							to = from + dashArray[(i++) % dashArray.length];
							flattener.drawPart(ctx, from, to);
							from = to + dashArray[(i++) % dashArray.length];
						}
					}
					ctx.stroke();
				}
				ctx.restore();
			}
		},

		drawSelected: function(ctx, matrix) {
			ctx.beginPath();
			drawSegments(ctx, this, matrix);
			// Now stroke it and draw its handles:
			ctx.stroke();
			drawHandles(ctx, this._segments, matrix);
		}
	};
}, new function() { // Path Smoothing

	/**
	 * Solves a tri-diagonal system for one of coordinates (x or y) of first
	 * bezier control points.
	 *
	 * @param rhs right hand side vector.
	 * @return Solution vector.
	 */
	function getFirstControlPoints(rhs) {
		var n = rhs.length,
			x = [], // Solution vector.
			tmp = [], // Temporary workspace.
			b = 2;
		x[0] = rhs[0] / b;
		// Decomposition and forward substitution.
		for (var i = 1; i < n; i++) {
			tmp[i] = 1 / b;
			b = (i < n - 1 ? 4 : 2) - tmp[i];
			x[i] = (rhs[i] - x[i - 1]) / b;
		}
		// Back-substitution.
		for (var i = 1; i < n; i++) {
			x[n - i - 1] -= tmp[n - i] * x[n - i];
		}
		return x;
	};

	return {
		// Note: Documentation for smooth() is in PathItem
		smooth: function() {
			// This code is based on the work by Oleg V. Polikarpotchkin,
			// http://ov-p.spaces.live.com/blog/cns!39D56F0C7A08D703!147.entry
			// It was extended to support closed paths by averaging overlapping
			// beginnings and ends. The result of this approach is very close to
			// Polikarpotchkin's closed curve solution, but reuses the same
			// algorithm as for open paths, and is probably executing faster as
			// well, so it is preferred.
			var segments = this._segments,
				size = segments.length,
				n = size,
				// Add overlapping ends for averaging handles in closed paths
				overlap;

			if (size <= 2)
				return;

			if (this._closed) {
				// Overlap up to 4 points since averaging beziers affect the 4
				// neighboring points
				overlap = Math.min(size, 4);
				n += Math.min(size, overlap) * 2;
			} else {
				overlap = 0;
			}
			var knots = [];
			for (var i = 0; i < size; i++)
				knots[i + overlap] = segments[i]._point;
			if (this._closed) {
				// If we're averaging, add the 4 last points again at the
				// beginning, and the 4 first ones at the end.
				for (var i = 0; i < overlap; i++) {
					knots[i] = segments[i + size - overlap]._point;
					knots[i + size + overlap] = segments[i]._point;
				}
			} else {
				n--;
			}
			// Calculate first Bezier control points
			// Right hand side vector
			var rhs = [];

			// Set right hand side X values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._x + 2 * knots[i + 1]._x;
			rhs[0] = knots[0]._x + 2 * knots[1]._x;
			rhs[n - 1] = 3 * knots[n - 1]._x;
			// Get first control points X-values
			var x = getFirstControlPoints(rhs);

			// Set right hand side Y values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._y + 2 * knots[i + 1]._y;
			rhs[0] = knots[0]._y + 2 * knots[1]._y;
			rhs[n - 1] = 3 * knots[n - 1]._y;
			// Get first control points Y-values
			var y = getFirstControlPoints(rhs);

			if (this._closed) {
				// Do the actual averaging simply by linearly fading between the
				// overlapping values.
				for (var i = 0, j = size; i < overlap; i++, j++) {
					var f1 = (i / overlap);
					var f2 = 1 - f1;
					// Beginning
					x[j] = x[i] * f1 + x[j] * f2;
					y[j] = y[i] * f1 + y[j] * f2;
					// End
					var ie = i + overlap, je = j + overlap;
					x[je] = x[ie] * f2 + x[je] * f1;
					y[je] = y[ie] * f2 + y[je] * f1;
				}
				n--;
			}
			var handleIn = null;
			// Now set the calculated handles
			for (var i = overlap; i <= n - overlap; i++) {
				var segment = segments[i - overlap];
				if (handleIn)
					segment.setHandleIn(handleIn.subtract(segment._point));
				if (i < n) {
					segment.setHandleOut(
							Point.create(x[i], y[i]).subtract(segment._point));
					if (i < n - 1)
						handleIn = Point.create(
								2 * knots[i + 1]._x - x[i + 1],
								2 * knots[i + 1]._y - y[i + 1]);
					else
						handleIn = Point.create(
								(knots[n]._x + x[n - 1]) / 2,
								(knots[n]._y + y[n - 1]) / 2);
				}
			}
			if (this._closed && handleIn) {
				var segment = this._segments[0];
				segment.setHandleIn(handleIn.subtract(segment._point));
			}
		}
	};
}, new function() { // PostScript-style drawing commands
	/**
	 * Helper method that returns the current segment and checks if a moveTo()
	 * command is required first.
	 */
	function getCurrentSegment(that) {
		var segments = that._segments;
		if (segments.length == 0)
			throw new Error('Use a moveTo() command first');
		return segments[segments.length - 1];
	}

	return {
		// Note: Documentation for these methods is found in PathItem, as they
		// are considered abstract methods of PathItem and need to be defined in
		// all implementing classes.
		moveTo: function(point) {
			// Let's not be picky about calling moveTo() when not at the
			// beginning of a path, just bail out:
			if (!this._segments.length)
				this._add([ new Segment(Point.read(arguments)) ]);
		},

		moveBy: function(point) {
			throw new Error('moveBy() is unsupported on Path items.');
		},

		lineTo: function(point) {
			// Let's not be picky about calling moveTo() first:
			this._add([ new Segment(Point.read(arguments)) ]);
		},

		cubicCurveTo: function(handle1, handle2, to) {
			handle1 = Point.read(arguments, 0, 1);
			handle2 = Point.read(arguments, 1, 1);
			to = Point.read(arguments, 2, 1);
			// First modify the current segment:
			var current = getCurrentSegment(this);
			// Convert to relative values:
			current.setHandleOut(handle1.subtract(current._point));
			// And add the new segment, with handleIn set to c2
			this._add([ new Segment(to, handle2.subtract(to)) ]);
		},

		quadraticCurveTo: function(handle, to) {
			handle = Point.read(arguments, 0, 1);
			to = Point.read(arguments, 1, 1);
			// This is exact:
			// If we have the three quad points: A E D,
			// and the cubic is A B C D,
			// B = E + 1/3 (A - E)
			// C = E + 1/3 (D - E)
			var current = getCurrentSegment(this)._point;
			this.cubicCurveTo(
				handle.add(current.subtract(handle).multiply(1/3)),
				handle.add(to.subtract(handle).multiply(1/3)),
				to
			);
		},

		curveTo: function(through, to, parameter) {
			through = Point.read(arguments, 0, 1);
			to = Point.read(arguments, 1, 1);
			var t = Base.pick(parameter, 0.5),
				t1 = 1 - t,
				current = getCurrentSegment(this)._point,
				// handle = (through - (1 - t)^2 * current - t^2 * to) /
				// (2 * (1 - t) * t)
				handle = through.subtract(current.multiply(t1 * t1))
					.subtract(to.multiply(t * t)).divide(2 * t * t1);
			if (handle.isNaN())
				throw new Error(
					'Cannot put a curve through points with parameter = ' + t);
			this.quadraticCurveTo(handle, to);
		},

		// PORT: New implementation back to Scriptographer
		arcTo: function(to, clockwise /* | through, to */) {
			// Get the start point:
			var current = getCurrentSegment(this),
				from = current._point,
				through;
			if (clockwise === undefined)
				clockwise = true;
			if (typeof clockwise === 'boolean') {
				to = Point.read(arguments, 0, 1);
				var middle = from.add(to).divide(2),
				through = middle.add(middle.subtract(from).rotate(
						clockwise ? -90 : 90));
			} else {
				through = Point.read(arguments, 0, 1);
				to = Point.read(arguments, 1, 1);
			}
			// Construct the two perpendicular middle lines to (from, through)
			// and (through, to), and intersect them to get the center
			var l1 = new Line(from.add(through).divide(2),
					through.subtract(from).rotate(90)),
			 	l2 = new Line(through.add(to).divide(2),
					to.subtract(through).rotate(90)),
				center = l1.intersect(l2),
				line = new Line(from, to, true),
				throughSide = line.getSide(through);
			if (!center) {
				// If the two lines are colinear, there cannot be an arc as the
				// circle is infinitely big and has no center point. If side is
				// 0, the connecting arc line of this huge circle is a line
				// between the two points, so we can use #lineTo instead.
				// Otherwise we bail out:
				if (!throughSide)
					return this.lineTo(to);
				throw new Error("Cannot put an arc through the given points: "
					+ [from, through, to]);
			}
			var vector = from.subtract(center),
				radius = vector.getLength(),
				extent = vector.getDirectedAngle(to.subtract(center)),
				centerSide = line.getSide(center);
			if (centerSide == 0) {
				// If the center is lying on the line, we might have gotten the
				// wrong sign for extent above. Use the sign of the side of the
				// through point.
				extent = throughSide * Math.abs(extent);
			} else if (throughSide == centerSide) {
				// If the center is on the same side of the line (from, to) as
				// the through point, we're extending bellow 180 degrees and
				// need to adapt extent.
				extent -= 360 * (extent < 0 ? -1 : 1);
			}
			var ext = Math.abs(extent),
				count =  ext >= 360 ? 4 : Math.ceil(ext / 90),
				inc = extent / count,
				half = inc * Math.PI / 360,
				z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half)),
				segments = [];
			for (var i = 0; i <= count; i++) {
				// Explicitely use to point for last segment, since depending
				// on values the calculation adds imprecision:
				var pt = i < count ? center.add(vector) : to;
				var out = i < count ? vector.rotate(90).multiply(z) : null;
				if (i == 0) {
					// Modify startSegment
					current.setHandleOut(out);
				} else {
					// Add new Segment
					segments.push(
						new Segment(pt, vector.rotate(-90).multiply(z), out));
				}
				vector = vector.rotate(inc);
			}
			// Add all segments at once at the end for higher performance
			this._add(segments);
		},

		lineBy: function(vector) {
			vector = Point.read(arguments);
			var current = getCurrentSegment(this);
			this.lineTo(current._point.add(vector));
		},

		curveBy: function(throughVector, toVector, parameter) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.curveTo(current.add(throughVector), current.add(toVector),
					parameter);
		},

		arcBy: function(throughVector, toVector) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.arcBy(current.add(throughVector), current.add(toVector));
		},

		closePath: function() {
			this.setClosed(true);
		}
	};
}, new function() { // A dedicated scope for the tricky bounds calculations
	/**
	 * Returns the bounding rectangle of the item excluding stroke width.
	 */
	function getBounds(matrix, strokePadding) {
		// Code ported and further optimised from:
		// http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
		var segments = this._segments,
			first = segments[0];
		if (!first)
			return null;
		var coords = new Array(6),
			prevCoords = new Array(6);
		// Make coordinates for first segment available in prevCoords.
		first._transformCoordinates(matrix, prevCoords, false);
		var min = prevCoords.slice(0, 2),
			max = min.slice(0), // clone
			// Add some tolerance for good roots, as t = 0 / 1 are added
			// seperately anyhow, and we don't want joins to be added with
			// radiuses in getStrokeBounds()
			tMin = Numerical.TOLERANCE,
			tMax = 1 - tMin;
		function processSegment(segment) {
			segment._transformCoordinates(matrix, coords, false);

			for (var i = 0; i < 2; i++) {
				var v0 = prevCoords[i], // prev.point
					v1 = prevCoords[i + 4], // prev.handleOut
					v2 = coords[i + 2], // segment.handleIn
					v3 = coords[i]; // segment.point

				function add(value, t) {
					var padding = 0;
					if (value == null) {
						// Calculate bezier polynomial at t
						var u = 1 - t;
						value = u * u * u * v0
								+ 3 * u * u * t * v1
								+ 3 * u * t * t * v2
								+ t * t * t * v3;
						// Only add strokeWidth to bounds for points which lie
						// within 0 < t < 1. The corner cases for cap and join
						// are handled in getStrokeBounds()
						padding = strokePadding ? strokePadding[i] : 0;
					}
					var left = value - padding,
						right = value + padding;
					if (left < min[i])
						min[i] = left;
					if (right > max[i])
						max[i] = right;

				}
				add(v3, null);

				// Calculate derivative of our bezier polynomial, divided by 3.
				// Dividing by 3 allows for simpler calculations of a, b, c and
				// leads to the same quadratic roots below.
				var a = 3 * (v1 - v2) - v0 + v3,
					b = 2 * (v0 + v2) - 4 * v1,
					c = v1 - v0;

				// Solve for derivative for quadratic roots. Each good root
				// (meaning a solution 0 < t < 1) is an extrema in the cubic
				// polynomial and thus a potential point defining the bounds
				// TODO: Use tolerance here, just like Numerical.solveQuadratic
				if (a == 0) {
					if (b == 0)
					    continue;
					var t = -c / b;
					// Test for good root and add to bounds if good (same below)
					if (tMin < t && t < tMax)
						add(null, t);
					continue;
				}

				var q = b * b - 4 * a * c;
				if (q < 0)
					continue;
				// TODO: Match this with Numerical.solveQuadratic
				var sqrt = Math.sqrt(q),
					f = -0.5 / a,
				 	t1 = (b - sqrt) * f,
					t2 = (b + sqrt) * f;
				if (tMin < t1 && t1 < tMax)
					add(null, t1);
				if (tMin < t2 && t2 < tMax)
					add(null, t2);
			}
			// Swap coordinate buffers
			var tmp = prevCoords;
			prevCoords = coords;
			coords = tmp;
		}
		for (var i = 1, l = segments.length; i < l; i++)
			processSegment(segments[i]);
		if (this._closed)
			processSegment(first);
		return Rectangle.create(min[0], min[1],
					max[0] - min[0], max[1] - min[1]);
	}

	/**
	 * Returns the horizontal and vertical padding that a transformed round
	 * stroke adds to the bounding box, by calculating the dimensions of a
	 * rotated ellipse.
	 */
	function getPenPadding(radius, matrix) {
		if (!matrix)
			return [radius, radius];
		// If a matrix is provided, we need to rotate the stroke circle
		// and calculate the bounding box of the resulting rotated elipse:
		// Get rotated hor and ver vectors, and determine rotation angle
		// and elipse values from them:
		var mx = matrix.createShiftless(),
			hor = mx.transform(Point.create(radius, 0)),
			ver = mx.transform(Point.create(0, radius)),
			phi = hor.getAngleInRadians(),
			a = hor.getLength(),
			b = ver.getLength();
		// Formula for rotated ellipses:
		// x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
		// y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
		// Derivates (by Wolfram Alpha):
		// derivative of x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
		// dx/dt = a sin(t) cos(phi) + b cos(t) sin(phi) = 0
		// derivative of y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
		// dy/dt = b cos(t) cos(phi) - a sin(t) sin(phi) = 0
		// This can be simplified to:
		// tan(t) = -b * tan(phi) / a // x
		// tan(t) =  b * cot(phi) / a // y
		// Solving for t gives:
		// t = pi * n - arctan(b * tan(phi) / a) // x
		// t = pi * n + arctan(b * cot(phi) / a)
		//   = pi * n + arctan(b / tan(phi) / a) // y
		var sin = Math.sin(phi),
			cos = Math.cos(phi),
			tan = Math.tan(phi),
			tx = -Math.atan(b * tan / a),
			ty = Math.atan(b / (tan * a));
		// Due to symetry, we don't need to cycle through pi * n solutions:
		return [Math.abs(a * Math.cos(tx) * cos - b * Math.sin(tx) * sin),
				Math.abs(b * Math.sin(ty) * cos + a * Math.cos(ty) * sin)];
	}

	/**
	 * Returns the bounding rectangle of the item including stroke width.
	 */
	function getStrokeBounds(matrix) {
		// See #draw() for an explanation of why we can access _style
		// properties directly here:
		var style = this._style;
		// TODO: Find a way to reuse 'bounds' cache instead?
		if (!style._strokeColor || !style._strokeWidth)
			return getBounds.call(this, matrix);
		var width = style._strokeWidth,
			radius = width / 2,
			padding = getPenPadding(radius, matrix),
			join = style._strokeJoin,
			cap = style._strokeCap,
			// miter is relative to width. Divide it by 2 since we're
			// measuring half the distance below
			miter = style._miterLimit * width / 2,
			segments = this._segments,
			length = segments.length,
			bounds = getBounds.call(this, matrix, padding);
		// Create a rectangle of padding size, used for union with bounds
		// further down
		var joinBounds = new Rectangle(new Size(padding).multiply(2));

		function add(point) {
			bounds = bounds.include(matrix
				? matrix._transformPoint(point, point) : point);
		}

		function addBevelJoin(curve, t) {
			var point = curve.getPoint(t),
				normal = curve.getNormal(t).normalize(radius);
			add(point.add(normal));
			add(point.subtract(normal));
		}

		function addJoin(segment, join) {
			// When both handles are set in a segment, the join setting is
			// ignored and round is always used.
			if (join === 'round' || !segment._handleIn.isZero()
					&& !segment._handleOut.isZero()) {
				bounds = bounds.unite(joinBounds.setCenter(matrix
					? matrix._transformPoint(segment._point) : segment._point));
			} else if (join == 'bevel') {
				var curve = segment.getCurve();
				addBevelJoin(curve, 0);
				addBevelJoin(curve.getPrevious(), 1);
			} else if (join == 'miter') {
				var curve2 = segment.getCurve(),
					curve1 = curve2.getPrevious(),
					point = curve2.getPoint(0),
					normal1 = curve1.getNormal(1).normalize(radius),
					normal2 = curve2.getNormal(0).normalize(radius),
					// Intersect the two lines
					line1 = new Line(point.subtract(normal1),
							Point.create(-normal1.y, normal1.x)),
					line2 = new Line(point.subtract(normal2),
							Point.create(-normal2.y, normal2.x)),
					corner = line1.intersect(line2);
				// Now measure the distance from the segment to the
				// intersection, which his half of the miter distance
				if (!corner || point.getDistance(corner) > miter) {
					addJoin(segment, 'bevel');
				} else {
					add(corner);
				}
			}
		}

		function addCap(segment, cap, t) {
			switch (cap) {
			case 'round':
				return addJoin(segment, cap);
			case 'butt':
			case 'square':
				// Calculate the corner points of butt and square caps
				var curve = segment.getCurve(),
					point = curve.getPoint(t),
					normal = curve.getNormal(t).normalize(radius);
				// For square caps, we need to step away from point in the
				// direction of the tangent, which is the rotated normal
				if (cap === 'square')
					point = point.add(normal.rotate(t == 0 ? -90 : 90));
				add(point.add(normal));
				add(point.subtract(normal));
				break;
			}
		}

		for (var i = 1, l = length - (this._closed ? 0 : 1); i < l; i++) {
			addJoin(segments[i], join);
		}
		if (this._closed) {
			addJoin(segments[0], join);
		} else {
			addCap(segments[0], cap, 0);
			addCap(segments[length - 1], cap, 1);
		}
		return bounds;
	}

	/**
	 * Returns the bounding rectangle of the item including handles.
	 */
	function getHandleBounds(matrix, stroke, join) {
		var coords = new Array(6),
			x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		stroke = stroke / 2 || 0; // Stroke padding
		join = join / 2 || 0; // Join padding, for miterLimit
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var segment = this._segments[i];
			segment._transformCoordinates(matrix, coords, false);
			for (var j = 0; j < 6; j += 2) {
				// Use different padding for points or handles
				var padding = j == 0 ? join : stroke,
					x = coords[j],
					y = coords[j + 1],
					xn = x - padding,
					xx = x + padding,
					yn = y - padding,
					yx = y + padding;
				if (xn < x1) x1 = xn;
				if (xx > x2) x2 = xx;
				if (yn < y1) y1 = yn;
				if (yx > y2) y2 = yx;
			}
		}
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	}

	/**
	 * Returns the rough bounding rectangle of the item that is shure to include
	 * all of the drawing, including stroke width.
	 */
	function getRoughBounds(matrix) {
		// Delegate to handleBounds, but pass on radius values for stroke and
		// joins. Hanlde miter joins specially, by passing the largets radius
		// possible.
		var style = this._style,
			width = style._strokeWidth;
		return getHandleBounds.call(this, matrix, width,
				style._strokeJoin == 'miter'
					? width * style._miterLimit
					: width);
	}

	var get = {
		bounds: getBounds,
		strokeBounds: getStrokeBounds,
		handleBounds: getHandleBounds,
		roughBounds: getRoughBounds
	};

	return {
		_getBounds: function(type, matrix) {
			return get[type].call(this, matrix);
		}
	};
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

Path.inject({ statics: new function() {
	var kappa = 2 / 3 * (Math.sqrt(2) - 1);

	var ovalSegments = [
		new Segment([0, 0.5], [0, kappa ], [0, -kappa]),
		new Segment([0.5, 0], [-kappa, 0], [kappa, 0 ]),
		new Segment([1, 0.5], [0, -kappa], [0, kappa ]),
		new Segment([0.5, 1], [kappa, 0 ], [-kappa, 0])
	];

	return /** @lends Path */{
		/**
		 * {@grouptitle Shaped Paths}
		 *
		 * Creates a Path Item with two anchor points forming a line.
		 *
		 * @param {Point} pt1 the first anchor point of the path
		 * @param {Point} pt2 the second anchor point of the path
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var from = new Point(20, 20);
		 * var to = new Point(100, 100);
		 * var path = new Path.Line(from, to);
		 * path.strokeColor = 'black';
		 */
		Line: function() {
			var step = Math.floor(arguments.length / 2);
			return new Path(
				Segment.read(arguments, 0, step),
				Segment.read(arguments, step, step)
			);
		},

		/**
		 * Creates a rectangle shaped Path Item from the passed point and size.
		 *
		 * @name Path.Rectangle
		 * @param {Point} point
		 * @param {Size} size
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var point = new Point(100, 100);
		 * var size = new Size(100, 100);
		 * var rectangle = new Rectangle(point, size);
		 * var path = new Path.Rectangle(rectangle);
		 * path.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangle shaped Path Item from the passed points. These do not
		 * necessarily need to be the top left and bottom right corners, the
		 * constructor figures out how to fit a rectangle between them.
		 *
		 * @name Path.Rectangle
		 * @param {Point} point1 The first point defining the rectangle
		 * @param {Point} point2 The second point defining the rectangle
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var point = new Point(100, 100);
		 * var point2 = new Point(200, 300);
		 * var path = new Path.Rectangle(point, point2);
		 * path.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangle shaped Path Item from the passed abstract
		 * {@link Rectangle}.
		 *
		 * @param {Rectangle} rect
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var point = new Point(100, 100);
		 * var size = new Size(100, 100);
		 * var rectangle = new Rectangle(point, size);
		 * var path = new Path.Rectangle(rectangle);
		 * path.strokeColor = 'black';
		 */
		Rectangle: function(rect) {
			rect = Rectangle.read(arguments);
			var left = rect.x,
				top = rect.y,
				right = left + rect.width,
				bottom = top + rect.height,
				path = new Path();
			path._add([
				new Segment(Point.create(left, bottom)),
				new Segment(Point.create(left, top)),
				new Segment(Point.create(right, top)),
				new Segment(Point.create(right, bottom))
			]);
			path._closed = true;
			return path;
		},

		/**
	 	* Creates a rectangular Path Item with rounded corners.
		 *
		 * @param {Rectangle} rect
		 * @param {Size} size the size of the rounded corners
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var point = new Point(100, 100);
		 * var size = new Size(100, 100);
		 * var rectangle = new Rectangle(point, size);
		 * var cornerSize = new Size(30, 30);
		 * var path = new Path.RoundRectangle(rectangle, cornerSize);
		 */
		RoundRectangle: function(rect, size) {
			if (arguments.length == 2) {
				rect = Rectangle.read(arguments, 0, 1);
				size = Size.read(arguments, 1, 1);
			} else if (arguments.length == 6) {
				rect = Rectangle.read(arguments, 0, 4);
				size = Size.read(arguments, 4, 2);
			}
			size = Size.min(size, rect.getSize(true).divide(2));
			var path = new Path(),
				uSize = size.multiply(kappa * 2),
				bl = rect.getBottomLeft(true),
				tl = rect.getTopLeft(true),
				tr = rect.getTopRight(true),
				br = rect.getBottomRight(true);
			path._add([
				new Segment(bl.add(size.width, 0), null, [-uSize.width, 0]),
				new Segment(bl.subtract(0, size.height), [0, uSize.height], null),

				new Segment(tl.add(0, size.height), null, [0, -uSize.height]),
				new Segment(tl.add(size.width, 0), [-uSize.width, 0], null),

				new Segment(tr.subtract(size.width, 0), null, [uSize.width, 0]),
				new Segment(tr.add(0, size.height), [0, -uSize.height], null),

				new Segment(br.subtract(0, size.height), null, [0, uSize.height]),
				new Segment(br.subtract(size.width, 0), [uSize.width, 0], null)
			]);
			path._closed = true;
			return path;
		},

		/**
		* Creates an oval shaped Path Item.
		 *
		 * @param {Rectangle} rect
		 * @param {Boolean} [circumscribed=false] when set to {@code true} the
		 *        oval shaped path will be created so the rectangle fits into
		 *        it. When set to {@code false} the oval path will fit within
		 *        the rectangle.
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var topLeft = new Point(100, 100);
		 * var size = new Size(150, 100);
		 * var rectangle = new Rectangle(topLeft, size);
		 * var path = new Path.Oval(rectangle);
		 * path.fillColor = 'black';
		 */
		// TODO: Shall this be called Path.Ellipse instead?
		Oval: function(rect) {
			rect = Rectangle.read(arguments);
			var path = new Path(),
				point = rect.getPoint(true),
				size = rect.getSize(true),
				segments = new Array(4);
			for (var i = 0; i < 4; i++) {
				var segment = ovalSegments[i];
				segments[i] = new Segment(
					segment._point.multiply(size).add(point),
					segment._handleIn.multiply(size),
					segment._handleOut.multiply(size)
				);
			}
			path._add(segments);
			path._closed = true;
			return path;
		},

		/**
		 * Creates a circle shaped Path Item.
		 *
		 * @param {Point} center the center point of the circle
		 * @param {Number} radius the radius of the circle
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var path = new Path.Circle(new Point(100, 100), 50);
		 */
		Circle: function(center, radius) {
			if (arguments.length == 3) {
				center = Point.read(arguments, 0, 2);
				radius = arguments[2];
			} else {
				center = Point.read(arguments, 0, 1);
			}
			return Path.Oval(new Rectangle(center.subtract(radius),
					Size.create(radius * 2, radius * 2)));
		},

		/**
		 * Creates a circular arc shaped Path Item.
		 *
		 * @param {Point} from the starting point of the circular arc
		 * @param {Point} through the point the arc passes through
		 * @param {Point} to the end point of the arc
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var start = new Point(0, 0);
		 * var through = new Point(100, 100);
		 * var to = new Point(200, 150);
		 * var path = new Path.Arc(start, through, to);
		 * path.strokeColor = 'black';
		 */
		Arc: function(from, through, to) {
			var path = new Path();
			path.moveTo(from);
			path.arcTo(through, to);
			return path;
		},

		/**
		 * Creates a regular polygon shaped Path Item.
		 *
		 * @param {Point} center the center point of the polygon
		 * @param {Number} numSides the number of sides of the polygon
		 * @param {Number} radius the radius of the polygon
		 * @return {Path} the newly created path
		 *
		 * @example
		 * // Create a triangle shaped path
		 * var center = new Point(100, 100);
		 * var sides = 3;
		 * var radius = 50;
		 * var triangle = new Path.RegularPolygon(center, sides, radius);
		 * triangle.fillColor = 'black';
		 *
		 * @example
		 * // Create a decahedron shaped path
		 * var center = new Point(100, 100);
		 * var sides = 10;
		 * var radius = 50;
		 * var decahedron = new Path.RegularPolygon(center, sides, radius);
		 * decahedron.fillColor = 'black';
		 */
		RegularPolygon: function(center, numSides, radius) {
			center = Point.read(arguments, 0, 1);
			var path = new Path(),
				step = 360 / numSides,
				three = !(numSides % 3),
				vector = new Point(0, three ? -radius : radius),
				offset = three ? -1 : 0.5,
				segments = new Array(numSides);
			for (var i = 0; i < numSides; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate((i + offset) * step)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		},

		/**
		 * Creates a star shaped Path Item.
		 *
		 * The largest of {@code radius1} and {@code radius2} will be the outer
		 * radius of the star. The smallest of radius1 and radius2 will be the
		 * inner radius.
		 *
		 * @param {Point} center the center point of the star
		 * @param {Number} numPoints the number of points of the star
		 * @param {Number} radius1
		 * @param {Number} radius2
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var center = new Point(100, 100);
		 * var points = 6;
		 * var radius1 = 20;
		 * var radius2 = 50;
		 * var path = new Path.Star(center, points, radius1, radius2);
		 * path.fillColor = 'black';
		 */
		Star: function(center, numPoints, radius1, radius2) {
			center = Point.read(arguments, 0, 1);
			numPoints *= 2;
			var path = new Path(),
				step = 360 / numPoints,
				vector = new Point(0, -1),
				segments = new Array(numPoints);
			for (var i = 0; i < numPoints; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate(step * i).multiply(i % 2 ? radius2 : radius1)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		}
	};
}});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CompoundPath
 *
 * @class A compound path contains two or more paths, holes are drawn
 * where the paths overlap. All the paths in a compound path take on the
 * style of the backmost path and can be accessed through its
 * {@link Item#children} list.
 *
 * @extends PathItem
 */
var CompoundPath = this.CompoundPath = PathItem.extend(/** @lends CompoundPath# */{
	/**
	 * Creates a new compound path item and places it in the active layer.
	 *
	 * @param {Path[]} [paths] the paths to place within the compound path.
	 *
	 * @example {@paperscript}
	 * // Create a circle shaped path with a hole in it:
	 * var circle = new Path.Circle(new Point(50, 50), 30);
	 * var innerCircle = new Path.Circle(new Point(50, 50), 10);
	 * var compoundPath = new CompoundPath([circle, innerCircle]);
	 * compoundPath.fillColor = 'red';
	 *
	 * // Move the inner circle 5pt to the right:
	 * compoundPath.children[1].position.x += 5;
	 */
	initialize: function(paths) {
		this.base();
		// Allow CompoundPath to have children and named children.
		this._children = [];
		this._namedChildren = {};
		// Do not reassign to paths, since arguments would get modified, which
		// we potentially use as array, depending on what is passed.
		var items = !paths || !Array.isArray(paths)
				|| typeof paths[0] !== 'object' ? arguments : paths;
		this.addChildren(items);
	},

	insertChild: function(index, item) {
		this.base(index, item);
		// All children except for the bottom one (first one in list) are set
		// to anti-clockwise orientation, so that they appear as holes, but
		// only if their orientation was not already specified before
		// (= _clockwise is defined).
		if (item._clockwise === undefined)
			item.setClockwise(item._index == 0);
	},

	/**
	 * If this is a compound path with only one path inside,
	 * the path is moved outside and the compound path is erased.
	 * Otherwise, the compound path is returned unmodified.
	 *
	 * @return {CompoundPath|Path} the simplified compound path
	 */
	simplify: function() {
		if (this._children.length == 1) {
			var child = this._children[0];
			child.insertAbove(this);
			this.remove();
			return child;
		}
		return this;
	},

	smooth: function() {
		for (var i = 0, l = this._children.length; i < l; i++)
			this._children[i].smooth();
	},

	draw: function(ctx, param) {
		var children = this._children;
		// Return early if the compound path doesn't have any children:
		if (children.length == 0)
			return;
		var firstChild = children[0],
			style = firstChild._style;
		ctx.beginPath();
		param.compound = true;
		for (var i = 0, l = children.length; i < l; i++)
			Item.draw(children[i], ctx, param);
		firstChild._setStyles(ctx);
		if (style._fillColor)
			ctx.fill();
		if (style._strokeColor)
			ctx.stroke();
		param.compound = false;
	}
}, new function() { // Injection scope for PostScript-like drawing functions
	/**
	 * Helper method that returns the current path and checks if a moveTo()
	 * command is required first.
	 */
	function getCurrentPath(that) {
		if (!that._children.length)
			throw new Error('Use a moveTo() command first');
		return that._children[that._children.length - 1];
	}

	var fields = {
		// Note: Documentation for these methods is found in PathItem, as they
		// are considered abstract methods of PathItem and need to be defined in
		// all implementing classes.
		moveTo: function(point) {
			var path = new Path();
			this.addChild(path);
			path.moveTo.apply(path, arguments);
		},

		moveBy: function(point) {
			this.moveTo(getCurrentPath(this).getLastSegment()._point.add(
					Point.read(arguments)));
		},

		closePath: function() {
			getCurrentPath(this).setClosed(true);
		}
	};

	// Redirect all other drawing commands to the current path
	Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
			'arcTo', 'lineBy', 'curveBy', 'arcBy'], function(key) {
		fields[key] = function() {
			var path = getCurrentPath(this);
			path[key].apply(path, arguments);
		};
	});

	return fields;
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var PathFlattener = Base.extend({
	initialize: function(path) {
		this.curves = []; // The curve values as returned by getValues()
		this.parts = []; // The calculated, subdivided parts of the path
		this.length = 0; // The total length of the path
		// Keep a current index from the part where we last where in
		// getParameterAt(), to optimise for iterator-like usage of flattener.
		this.index = 0;

		// Instead of relying on path.curves, we only use segments here and
		// get the curve values from them.

		// Now walk through all curves and compute the parts for each of them,
		// by recursively calling _computeParts().
		var segments = path._segments,
			segment1 = segments[0],
			segment2,
			that = this;

		function addCurve(segment1, segment2) {
			var curve = Curve.getValues(segment1, segment2);
			that.curves.push(curve);
			that._computeParts(curve, segment1._index, 0, 1);
		}

		for (var i = 1, l = segments.length; i < l; i++) {
			segment2 = segments[i];
			addCurve(segment1, segment2);
			segment1 = segment2;
		}
		if (path._closed)
			addCurve(segment2, segments[0]);
	},

	_computeParts: function(curve, index, minT, maxT) {
		// Check if the t-span is big enough for subdivision.
		// We're not subdividing more than 32 times...
		if ((maxT - minT) > 1 / 32 && !Curve.isFlatEnough(curve)) {
			var curves = Curve.subdivide(curve);
			var halfT = (minT + maxT) / 2;
			// Recursively subdive and compute parts again.
			this._computeParts(curves[0], index, minT, halfT);
			this._computeParts(curves[1], index, halfT, maxT);
		} else {
			// Calculate distance between p1 and p2
			var x = curve[6] - curve[0],
				y = curve[7] - curve[1],
				dist = Math.sqrt(x * x + y * y);
			if (dist > Numerical.TOLERANCE) {
				this.length += dist;
				this.parts.push({
					offset: this.length,
					value: maxT,
					index: index
				});
			}
		}
	},

	getParameterAt: function(offset) {
		// Make sure we're not beyond the requested offset already. Search the
		// start position backwards from where to then process the loop below.
		var i, j = this.index;
		for (;;) {
			i = j;
			if (j == 0 || this.parts[--j].offset < offset)
				break;
		}
		// Find the part that succeeds the given offset, then interpolate
		// with the previous part
		for (var l = this.parts.length; i < l; i++) {
			var part = this.parts[i];
			if (part.offset >= offset) {
				// Found the right part, remember current position
				this.index = i;
				// Now get the previous part so we can linearly interpolate
				// the curve parameter
				var prev = this.parts[i - 1];
				// Make sure we only use the previous parameter value if its
				// for the same curve, by checking index. Use 0 otherwise.
				var prevVal = prev && prev.index == part.index ? prev.value : 0,
					prevLen = prev ? prev.offset : 0;
				return {
					// Interpolate
					value: prevVal + (part.value - prevVal)
						* (offset - prevLen) /  (part.offset - prevLen),
					index: part.index
				};
			}
		}
		// Return last one
		var part = this.parts[this.parts.length - 1];
		return {
			value: 1,
			index: part.index
		};
	},

	evaluate: function(offset, type) {
		var param = this.getParameterAt(offset);
		return Curve.evaluate(this.curves[param.index], param.value, type);
	},

	drawPart: function(ctx, from, to) {
		from = this.getParameterAt(from);
		to = this.getParameterAt(to);
		for (var i = from.index; i <= to.index; i++) {
			var curve = Curve.getPart(this.curves[i],
					i == from.index ? from.value : 0,
					i == to.index ? to.value : 1);
			if (i == from.index)
				ctx.moveTo(curve[0], curve[1]);
			ctx.bezierCurveTo.apply(ctx, curve.slice(2));
		}
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// An Algorithm for Automatically Fitting Digitized Curves
// by Philip J. Schneider
// from "Graphics Gems", Academic Press, 1990
// Modifications and optimisations of original algorithm by Juerg Lehni.

var PathFitter = Base.extend({
	initialize: function(path, error) {
		this.points = [];
		var segments = path._segments,
			prev;
		// Copy over points from path and filter out adjacent duplicates.
		for (var i = 0, l = segments.length; i < l; i++) {
			var point = segments[i].point.clone();
			if (!prev || !prev.equals(point)) {
				this.points.push(point);
				prev = point;
			}
		}
		this.error = error;
	},

	fit: function() {
		this.segments = [new Segment(this.points[0])];
		this.fitCubic(0, this.points.length - 1,
				// Left Tangent
				this.points[1].subtract(this.points[0]).normalize(),
				// Right Tangent
				this.points[this.points.length - 2].subtract(
					this.points[this.points.length - 1]).normalize());
		return this.segments;
	},

	// Fit a Bezier curve to a (sub)set of digitized points
	fitCubic: function(first, last, tan1, tan2) {
		//	Use heuristic if region only has two points in it
		if (last - first == 1) {
			var pt1 = this.points[first],
				pt2 = this.points[last],
				dist = pt1.getDistance(pt2) / 3;
			this.addCurve([pt1, pt1.add(tan1.normalize(dist)),
					pt2.add(tan2.normalize(dist)), pt2]);
			return;
		}
		// Parameterize points, and attempt to fit curve
		var uPrime = this.chordLengthParameterize(first, last),
			maxError = Math.max(this.error, this.error * this.error),
			error,
			split;
		// Try 4 iterations
		for (var i = 0; i <= 4; i++) {
			var curve = this.generateBezier(first, last, uPrime, tan1, tan2);
			//	Find max deviation of points to fitted curve
			var max = this.findMaxError(first, last, curve, uPrime);
			if (max.error < this.error) {
				this.addCurve(curve);
				return;
			}
			split = max.index;
			// If error not too large, try reparameterization and iteration
			if (max.error >= maxError)
				break;
			this.reparameterize(first, last, uPrime, curve);
			maxError = max.error;
		}
		// Fitting failed -- split at max error point and fit recursively
		var V1 = this.points[split - 1].subtract(this.points[split]),
			V2 = this.points[split].subtract(this.points[split + 1]),
			tanCenter = V1.add(V2).divide(2).normalize();
		this.fitCubic(first, split, tan1, tanCenter);
		this.fitCubic(split, last, tanCenter.negate(), tan2);
	},

	addCurve: function(curve) {
		var prev = this.segments[this.segments.length - 1];
		prev.setHandleOut(curve[1].subtract(curve[0]));
		this.segments.push(
				new Segment(curve[3], curve[2].subtract(curve[3])));
	},

	// Use least-squares method to find Bezier control points for region.
	generateBezier: function(first, last, uPrime, tan1, tan2) {
		var epsilon = Numerical.EPSILON,
			pt1 = this.points[first],
			pt2 = this.points[last],
			// Create the C and X matrices
		 	C = [[0, 0], [0, 0]],
			X = [0, 0];

		for (var i = 0, l = last - first + 1; i < l; i++) {
			var u = uPrime[i],
				t = 1 - u,
				b = 3 * u * t,
				b0 = t * t * t,
				b1 = b * t,
				b2 = b * u,
				b3 = u * u * u,
				a1 = tan1.normalize(b1),
				a2 = tan2.normalize(b2),
				tmp = this.points[first + i]
					.subtract(pt1.multiply(b0 + b1))
					.subtract(pt2.multiply(b2 + b3));
			C[0][0] += a1.dot(a1);
			C[0][1] += a1.dot(a2);
			// C[1][0] += a1.dot(a2);
			C[1][0] = C[0][1];
			C[1][1] += a2.dot(a2);
			X[0] += a1.dot(tmp);
			X[1] += a2.dot(tmp);
		}

		// Compute the determinants of C and X
		var detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1],
			alpha1, alpha2;
		if (Math.abs(detC0C1) > epsilon) {
			// Kramer's rule
			var detC0X  = C[0][0] * X[1]    - C[1][0] * X[0],
				detXC1  = X[0]    * C[1][1] - X[1]    * C[0][1];
			// Derive alpha values
			alpha1 = detXC1 / detC0C1;
			alpha2 = detC0X / detC0C1;
		} else {
			// Matrix is under-determined, try assuming alpha1 == alpha2
			var c0 = C[0][0] + C[0][1],
				c1 = C[1][0] + C[1][1];
			if (Math.abs(c0) > epsilon) {
				alpha1 = alpha2 = X[0] / c0;
			} else if (Math.abs(c1) > epsilon) {
				alpha1 = alpha2 = X[1] / c1;
			} else {
				// Handle below
				alpha1 = alpha2 = 0.;
			}
		}

		// If alpha negative, use the Wu/Barsky heuristic (see text)
		// (if alpha is 0, you get coincident control points that lead to
		// divide by zero in any subsequent NewtonRaphsonRootFind() call.
		var segLength = pt2.getDistance(pt1);
		epsilon *= segLength;
		if (alpha1 < epsilon || alpha2 < epsilon) {
			// fall back on standard (probably inaccurate) formula,
			// and subdivide further if needed.
			alpha1 = alpha2 = segLength / 3;
		}

		// First and last control points of the Bezier curve are
		// positioned exactly at the first and last data points
		// Control points 1 and 2 are positioned an alpha distance out
		// on the tangent vectors, left and right, respectively
		return [pt1, pt1.add(tan1.normalize(alpha1)),
				pt2.add(tan2.normalize(alpha2)), pt2];
	},

	// Given set of points and their parameterization, try to find
	// a better parameterization.
	reparameterize: function(first, last, u, curve) {
		for (var i = first; i <= last; i++) {
			u[i - first] = this.findRoot(curve, this.points[i], u[i - first]);
		}
	},

	// Use Newton-Raphson iteration to find better root.
	findRoot: function(curve, point, u) {
		var curve1 = [],
			curve2 = [];
		// Generate control vertices for Q'
		for (var i = 0; i <= 2; i++) {
			curve1[i] = curve[i + 1].subtract(curve[i]).multiply(3);
		}
		// Generate control vertices for Q''
		for (var i = 0; i <= 1; i++) {
			curve2[i] = curve1[i + 1].subtract(curve1[i]).multiply(2);
		}
		// Compute Q(u), Q'(u) and Q''(u)
		var pt = this.evaluate(3, curve, u),
		 	pt1 = this.evaluate(2, curve1, u),
		 	pt2 = this.evaluate(1, curve2, u),
		 	diff = pt.subtract(point),
			df = pt1.dot(pt1) + diff.dot(pt2);
		// Compute f(u) / f'(u)
		if (Math.abs(df) < Numerical.TOLERANCE)
			return u;
		// u = u - f(u) / f'(u)
		return u - diff.dot(pt1) / df;
	},

	// Evaluate a Bezier curve at a particular parameter value
	evaluate: function(degree, curve, t) {
		// Copy array
		var tmp = curve.slice();
		// Triangle computation
		for (var i = 1; i <= degree; i++) {
			for (var j = 0; j <= degree - i; j++) {
				tmp[j] = tmp[j].multiply(1 - t).add(tmp[j + 1].multiply(t));
			}
		}
		return tmp[0];
	},

	// Assign parameter values to digitized points
	// using relative distances between points.
	chordLengthParameterize: function(first, last) {
		var u = [0];
		for (var i = first + 1; i <= last; i++) {
			u[i - first] = u[i - first - 1]
					+ this.points[i].getDistance(this.points[i - 1]);
		}
		for (var i = 1, m = last - first; i <= m; i++) {
			u[i] /= u[m];
		}
		return u;
	},

	// Find the maximum squared distance of digitized points to fitted curve.
	findMaxError: function(first, last, curve, u) {
		var index = Math.floor((last - first + 1) / 2),
			maxDist = 0;
		for (var i = first + 1; i < last; i++) {
			var P = this.evaluate(3, curve, u[i - first]);
			var v = P.subtract(this.points[i]);
			var dist = v.x * v.x + v.y * v.y; // squared
			if (dist >= maxDist) {
				maxDist = dist;
				index = i;
			}
		}
		return {
			error: maxDist,
			index: index
		};
	}
});


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name TextItem
 *
 * @class The TextItem type allows you to create typography. Its
 * functionality is inherited by different text item types such as
 * {@link PointText}, and {@link AreaText} (coming soon). They each add a
 * layer of functionality that is unique to their type, but share the
 * underlying properties and functions that they inherit from TextItem.
 *
 * @extends Item
 */
var TextItem = this.TextItem = Item.extend(/** @lends TextItem# */{
	// TextItem doesn't make the distinction between the different bounds,
	// so use the same name for all of them
	_boundsType: 'bounds',

	initialize: function(pointOrMatrix) {
		// Note that internally #characterStyle is the same as #style, but
		// defined as an instance of CharacterStyle. We need to define it before
		// calling this.base(), to override the default PathStyle instance.
		this._style = CharacterStyle.create(this);
		this._paragraphStyle = ParagraphStyle.create(this);
		this.base(pointOrMatrix);
		// No need to call setStyle(), since base() handles this already.
		// Call with no parameter to initalize defaults now.
		this.setParagraphStyle();
		this._content = '';
		this._lines = [];
	},

	/**
	 * The text contents of the text item.
	 *
	 * @name TextItem#content
	 * @type String
	 *
	 * @example {@paperscript}
	 * // Setting the content of a PointText item:
	 *
	 * // Create a point-text item at {x: 30, y: 30}:
	 * var text = new PointText(new Point(30, 30));
	 * text.fillColor = 'black';
	 *
	 * // Set the content of the text item:
	 * text.content = 'Hello world';
	 *
	 * @example {@paperscript}
	 * // Interactive example, move your mouse over the view below:
	 *
	 * // Create a point-text item at {x: 30, y: 30}:
	 * var text = new PointText(new Point(30, 30));
	 * text.fillColor = 'black';
	 *
	 * text.content = 'Move your mouse over the view, to see its position';
	 *
	 * function onMouseMove(event) {
	 * 	// Each time the mouse is moved, set the content of
	 * 	// the point text to describe the position of the mouse:
	 * 	text.content = 'Your position is: ' + event.point.toString();
	 * }
	 */

	_clone: function(copy) {
		copy.setContent(this._content);
		copy.setParagraphStyle(this._paragraphStyle);
		return this.base(copy);
	},

	getContent: function() {
		return this._content;
	},

	setContent: function(content) {
		this._content = '' + content;
		this._lines = this._content.split(/\r\n|\n|\r/mg);
		this._changed(Change.CONTENT);
	},

	/**
	 * {@grouptitle Style Properties}
	 *
	 * The character style of the text item.
	 *
	 * @type CharacterStyle
	 * @bean
	 */

	// As explained in CharacterStyle, this is internally the same as #style.
	getCharacterStyle: function() {
		return this.getStyle();
	},

	setCharacterStyle: function(style) {
		this.setStyle(style);
	}

	/**
	 * The paragraph style of the text item.
	 *
	 * @name TextItem#getParagraphStyle
	 * @type ParagraphStyle
	 * @bean
	 */
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PointText
 *
 * @class A PointText item represents a piece of typography in your Paper.js
 * project which starts from a certain point and extends by the amount of
 * characters contained in it.
 *
 * @extends TextItem
 */
var PointText = this.PointText = TextItem.extend(/** @lends PointText# */{
	/**
	 * Creates a point text item
	 *
	 * @param {Point} point the position where the text will start
	 *
	 * @example
	 * var text = new PointText(new Point(50, 100));
	 * text.justification = 'center';
	 * text.fillColor = 'black';
	 * text.content = 'The contents of the point text';
	 */
	initialize: function(pointOrMatrix) {
		this.base(pointOrMatrix);
		this._point = this._matrix.getTranslation();
	},

	clone: function() {
		return this._clone(new PointText(this._matrix));
	},

	/**
	 * The PointText's anchor point
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		// Se Item#getPosition for an explanation why we create new LinkedPoint
		// objects each time.
		return LinkedPoint.create(this, 'setPoint',
				this._point.x, this._point.y);
	},

	setPoint: function(point) {
		this.translate(Point.read(arguments).subtract(this._point));
	},

	_transform: function(matrix) {
		// Transform _point:
		matrix._transformPoint(this._point, this._point);
	},

	draw: function(ctx) {
		if (!this._content)
			return;
		this._setStyles(ctx);
		var style = this._style,
			leading = this.getLeading(),
			lines = this._lines;
		ctx.font = style.getFontStyle();
		ctx.textAlign = this.getJustification();
		for (var i = 0, l = lines.length; i < l; i++) {
			var line = lines[i];
			if (style._fillColor)
				ctx.fillText(line, 0, 0);
			if (style._strokeColor)
				ctx.strokeText(line, 0, 0);
			ctx.translate(0, leading);
		}
	}
}, new function() {
	var context = null;

	return {
		_getBounds: function(type, matrix) {
			// Create an in-memory canvas on which to do the measuring
			if (!context)
				context = CanvasProvider.getCanvas(
						Size.create(1, 1)).getContext('2d');
			var justification = this.getJustification(),
				x = 0;
			// Measure the real width of the text. Unfortunately, there is no
			// sane way to measure text height with canvas
			context.font = this._style.getFontStyle();
			var width = 0;
			for (var i = 0, l = this._lines.length; i < l; i++)
				width = Math.max(width, context.measureText(
						this._lines[i]).width);
			// Adjust for different justifications
			if (justification !== 'left')
				x -= width / (justification === 'center' ? 2: 1);
			var leading = this.getLeading(),
				count = this._lines.length,
				// Until we don't have baseline measuring, assume leading / 4 as
				// a rough guess:
				bounds = Rectangle.create(x,
						count ? leading / 4 + (count - 1) * leading : 0,
						width, -count * leading);
			return matrix ? matrix._transformBounds(bounds, bounds) : bounds;
		}
	};
});


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Style
 *
 * @class Internal base-class for all style objects, e.g. PathStyle,
 * CharacterStyle, PargraphStyle.
 *
 * @private
 */
var Style = Item.extend({
	initialize: function(style) {
		// If the passed style object is also a Style, clone its clonable
		// fields rather than simply copying them.
		var clone = style instanceof Style;
		// Note: This relies on bean getters and setters that get implicetly
		// called when getting from style[key] and setting on this[key].
		return Base.each(this._defaults, function(value, key) {
			value = style && style[key] || value;
			this[key] = value && clone && value.clone
					? value.clone() : value;
		}, this);
	},

	statics: {
		create: function(item) {
			var style = new this(this.dont);
			style._item = item;
			return style;
		},

		extend: function(src) {
			// Inject style getters and setters into the 'owning' class, which
			// redirect calls to the linked style objects through their internal
			// property on the instances of that class, as defined by _style.
			var styleKey = '_' + src._style,
				stylePart = Base.capitalize(src._style),
				flags = src._flags || {},
				owner = {};

			// Define accessor on owner class for this style:
			owner['get' + stylePart] = function() {
				return this[styleKey];
			};

			owner['set' + stylePart] = function(style) {
				this[styleKey].initialize(style);
			};

			Base.each(src._defaults, function(value, key) {
				var isColor = !!key.match(/Color$/),
					part = Base.capitalize(key),
					set = 'set' + part,
					get = 'get' + part;
				// Simply extend src with these getters and setters, to be
				// injected into this class using this.base() further down.
				src[set] = function(value) {
					var children = this._item && this._item._children;
					value = isColor ? Color.read(arguments) : value;
					if (children) {
						for (var i = 0, l = children.length; i < l; i++)
							children[i][styleKey][set](value);
					} else {
						var old = this['_' + key];
						if (old != value && !(old && old.equals
									&& old.equals(value))) {
							this['_' + key] = value;
							if (isColor) {
								if (old)
									old._removeOwner(this._item);
								if (value)
									value._addOwner(this._item);
							}
							// Notify the item of the style change STYLE is
							// always set, additional flags come from _flags,
							// as used for STROKE:
							if (this._item)
								this._item._changed(flags[key] || Change.STYLE);
						}
					}
					return this;
				};
				src[get] = function() {
					var children = this._item && this._item._children,
						style;
					// If this item has children, walk through all of them and
					// see if they all have the same style.
					if (!children)
						return this['_' + key];
					for (var i = 0, l = children.length; i < l; i++) {
						var childStyle = children[i][styleKey][get]();
						if (!style) {
							style = childStyle;
						} else if (style != childStyle && !(style
								&& style.equals && style.equals(childStyle))) {
							// If there is another item with a different
							// style, the style is not defined:
							// PORT: Change this in Scriptographer
							// (currently returns null)
							return undefined;
						}
					}
					return style;
				};
				// Style-getters and setters for owner class:
				owner[set] = function(value) {
					this[styleKey][set](value);
					return this;
				};
				owner[get] = function() {
					return this[styleKey][get]();
				};
			});
			src._owner.inject(owner);
			// Pass on to base()
			return this.base.apply(this, arguments);
		}
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PathStyle
 *
 * @class PathStyle is used for changing the visual styles of items
 * contained within a Paper.js project and is returned by
 * {@link Item#style} and {@link Project#currentStyle}.
 *
 * All properties of PathStyle are also reflected directly in {@link Item},
 * i.e.: {@link Item#fillColor}.
 *
 * To set multiple style properties in one go, you can pass an object to
 * {@link Item#style}. This is a convenient way to define a style once and
 * apply it to a series of items:
 *
 * @classexample {@paperscript}
 * var circleStyle = {
 * 	fillColor: new RgbColor(1, 0, 0),
 * 	strokeColor: 'black',
 * 	strokeWidth: 5
 * };
 *
 * var path = new Path.Circle(new Point(80, 50), 30);
 * path.style = circleStyle;
 */
var PathStyle = this.PathStyle = Style.extend(/** @lends PathStyle# */{
	_owner: Item,
	_style: 'style',
	// windingRule / resolution / fillOverprint / strokeOverprint are currently
	// not supported.
	_defaults: {
		fillColor: undefined,
		strokeColor: undefined,
		strokeWidth: 1,
		strokeCap: 'butt',
		strokeJoin: 'miter',
		miterLimit: 10,
		dashOffset: 0,
		dashArray: []
	},
	_flags: {
		strokeWidth: Change.STROKE,
		strokeCap: Change.STROKE,
		strokeJoin: Change.STROKE,
		miterLimit: Change.STROKE
	}

	// DOCS: why isn't the example code showing up?
	/**
	 * PathStyle objects don't need to be created directly. Just pass an
	 * object to {@link Item#style} or {@link Project#currentStyle}, it will
	 * be converted to a PathStyle object internally.
	 *
	 * @name PathStyle#initialize
	 * @param {object} style
	 */

	/**
	 * {@grouptitle Stroke Style}
	 *
	 * The color of the stroke.
	 *
	 * @name PathStyle#strokeColor
	 * @property
	 * @type RgbColor|HsbColor|HslColor|GrayColor
	 *
	 * @example {@paperscript}
	 * // Setting the stroke color of a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set its stroke color to RGB red:
	 * circle.strokeColor = new RgbColor(1, 0, 0);
	 */

	/**
	 * The width of the stroke.
	 *
	 * @name PathStyle#strokeWidth
	 * @property
	 * @default 1
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Setting an item's stroke width:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set its stroke color to black:
	 * circle.strokeColor = 'black';
	 *
	 * // Set its stroke width to 10:
	 * circle.strokeWidth = 10;
	 */

	/**
	 * The shape to be used at the end of open {@link Path} items, when they
	 * have a stroke.
	 *
	 * @name PathStyle#strokeCap
	 * @property
	 * @default 'butt'
	 * @type String('round', 'square', 'butt')
	 *
	 * @example {@paperscript height=200}
	 * // A look at the different stroke caps:
	 *
	 * var line = new Path(new Point(80, 50), new Point(420, 50));
	 * line.strokeColor = 'black';
	 * line.strokeWidth = 20;
	 *
	 * // Select the path, so we can see where the stroke is formed:
	 * line.selected = true;
	 *
	 * // Set the stroke cap of the line to be round:
	 * line.strokeCap = 'round';
	 *
	 * // Copy the path and set its stroke cap to be square:
	 * var line2 = line.clone();
	 * line2.position.y += 50;
	 * line2.strokeCap = 'square';
	 *
	 * // Make another copy and set its stroke cap to be butt:
	 * var line2 = line.clone();
	 * line2.position.y += 100;
	 * line2.strokeCap = 'butt';
	 */

	/**
	 * The shape to be used at the corners of paths when they have a stroke.
	 *
	 * @name PathStyle#strokeJoin
	 * @property
	 * @default 'miter'
	 * @type String ('miter', 'round', 'bevel')
	 *
	 * @example {@paperscript height=120}
	 * // A look at the different stroke joins:
	 * var path = new Path();
	 * path.add(new Point(80, 100));
	 * path.add(new Point(120, 40));
	 * path.add(new Point(160, 100));
	 * path.strokeColor = 'black';
	 * path.strokeWidth = 20;
	 *
	 * // Select the path, so we can see where the stroke is formed:
	 * path.selected = true;
	 *
	 * var path2 = path.clone();
	 * path2.position.x += path2.bounds.width * 1.5;
	 * path2.strokeJoin = 'round';
	 *
	 * var path3 = path2.clone();
	 * path3.position.x += path3.bounds.width * 1.5;
	 * path3.strokeJoin = 'bevel';
	 */

	/**
	 * The dash offset of the stroke.
	 *
	 * @name PathStyle#dashOffset
	 * @property
	 * @default 0
	 * @type Number
	 */

	/**
	 * Specifies an array containing the dash and gap lengths of the stroke.
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle(new Point(80, 50), 40);
	 * path.strokeWidth = 2;
	 * path.strokeColor = 'black';
	 *
	 * // Set the dashed stroke to [10pt dash, 4pt gap]:
	 * path.dashArray = [10, 4];
	 *
	 * @name PathStyle#dashArray
	 * @property
	 * @default []
	 * @type Array
	 */

	/**
	 * The miter limit of the stroke.
	 * When two line segments meet at a sharp angle and miter joins have been
	 * specified for {@link #strokeJoin}, it is possible for the miter to extend
	 * far beyond the {@link #strokeWidth} of the path. The miterLimit imposes a
	 * limit on the ratio of the miter length to the {@link #strokeWidth}.
	 *
	 * @name PathStyle#miterLimit
	 * @property
	 * @default 10
	 * @type Number
	 */

	/**
	 * {@grouptitle Fill Style}
	 *
	 * The fill color.
	 *
	 * @name PathStyle#fillColor
	 * @property
	 * @type RgbColor|HsbColor|HslColor|GrayColor
	 *
	 * @example {@paperscript}
	 * // Setting the fill color of a path to red:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set the fill color of the circle to RGB red:
	 * circle.fillColor = new RgbColor(1, 0, 0);
	 */
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name ParagraphStyle
 *
 * @class The ParagraphStyle object represents the paragraph style of a text
 * item ({@link TextItem#paragraphStyle}).
 *
 * Currently, the ParagraphStyle object may seem a bit empty, with just the
 * {@link #justification} property. Yet, we have lots in store for Paper.js
 * when it comes to typography. Please stay tuned.
 *
 * @classexample
 * var text = new PointText(new Point(0,0));
 * text.fillColor = 'black';
 * text.content = 'Hello world.';
 * text.paragraphStyle.justification = 'center';
 */
var ParagraphStyle = this.ParagraphStyle = Style.extend(/** @lends ParagraphStyle# */{
	_owner: TextItem,
	_style: 'paragraphStyle',
	_defaults: {
		justification: 'left'
	},
	_flags: {
		justification: Change.GEOMETRY
	}

	/**
	 * ParagraphStyle objects don't need to be created directly. Just pass an
	 * object to {@link TextItem#paragraphStyle}, it will be converted to a
	 * ParagraphStyle object internally.
	 *
	 * @name ParagraphStyle#initialize
	 * @param {object} style
	 */

	/**
	 * The justification of the paragraph.
	 *
	 * @name ParagraphStyle#justification
	 * @default 'left'
	 * @type String('left', 'right', 'center')
	 */
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CharacterStyle
 *
 * @class The CharacterStyle object represents the character style of a text
 * item ({@link TextItem#characterStyle})
 *
 * @extends PathStyle
 *
 * @classexample
 * var text = new PointText(new Point(50, 50));
 * text.content = 'Hello world.';
 * text.characterStyle = {
 * 	fontSize: 50,
 * 	fillColor: 'black',
 * };
 */
// Note that CharacterStyle extends PathStyle and thus injects the same
// accessors into its _owner TextItem, overriding those previously defined by
// PathStyle for Item. It is also returned from TextItem#getStyle instead of
// PathStyle. TextItem#characterStyle is now simply a pointer to #style.
var CharacterStyle = this.CharacterStyle = PathStyle.extend(/** @lends CharacterStyle# */{
	_owner: TextItem,
	_style: 'style',
	_defaults: Base.merge(PathStyle.prototype._defaults, {
		// Override default fillColor of CharacterStyle
		fillColor: 'black',
		fontSize: 12,
		leading: null,
		font: 'sans-serif'
	}),
	_flags: {
		fontSize: Change.GEOMETRY,
		leading: Change.GEOMETRY,
		font: Change.GEOMETRY
	}

	/**
	 * CharacterStyle objects don't need to be created directly. Just pass an
	 * object to {@link TextItem#characterStyle}, it will be converted to a
	 * CharacterStyle object internally.
	 *
	 * @name CharacterStyle#initialize
	 * @param {object} style
	 */

	/**
	 * The font of the character style.
	 *
	 * @name CharacterStyle#font
	 * @default 'sans-serif'
	 * @type String
	 */

	/**
	 * The font size of the character style in points.
	 *
	 * @name CharacterStyle#fontSize
	 * @default 10
	 * @type Number
	 */
}, {
	getLeading: function() {
		// Override leading to return fontSize * 1.2 by default, when undefined
		var leading = this.base();
		return leading != null ? leading : this.getFontSize() * 1.2;
	},

	getFontStyle: function() {
		return this._fontSize + 'px ' + this._font;
	}
});


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Color
 *
 * @class All properties and functions that expect color values accept
 * instances of the different color classes such as {@link RgbColor},
 * {@link HsbColor} and {@link GrayColor}, and also accept named colors
 * and hex values as strings which are then converted to instances of
 * {@link RgbColor} internally.
 *
 * @classexample {@paperscript}
 * // Named color values:
 *
 * // Create a circle shaped path at {x: 80, y: 50}
 * // with a radius of 30.
 * var circle = new Path.Circle(new Point(80, 50), 30);
 *
 * // Pass a color name to the fillColor property, which is internally
 * // converted to an RgbColor.
 * circle.fillColor = 'green';
 *
 * @classexample {@paperscript}
 * // Hex color values:
 *
 * // Create a circle shaped path at {x: 80, y: 50}
 * // with a radius of 30.
 * var circle = new Path.Circle(new Point(80, 50), 30);
 *
 * // Pass a hex string to the fillColor property, which is internally
 * // converted to an RgbColor.
 * circle.fillColor = '#ff0000';
 */
var Color = this.Color = Base.extend(new function() {

	var components = {
		gray: ['gray'],
		rgb: ['red', 'green', 'blue'],
		hsb: ['hue', 'saturation', 'brightness'],
		hsl: ['hue', 'saturation', 'lightness']
	};

	var colorCache = {},
		colorContext;

	function nameToRgbColor(name) {
		var color = colorCache[name];
		if (color)
			return color.clone();
		// Use a canvas to draw to with the given name and then retrieve rgb
		// values from. Build a cache for all the used colors.
		if (!colorContext) {
			var canvas = CanvasProvider.getCanvas(Size.create(1, 1));
			colorContext = canvas.getContext('2d');
			colorContext.globalCompositeOperation = 'copy';
		}
		// Set the current fillStyle to transparent, so that it will be
		// transparent instead of the previously set color in case the new color
		// can not be interpreted.
		colorContext.fillStyle = 'rgba(0,0,0,0)';
		// Set the fillStyle of the context to the passed name and fill the
		// canvas with it, then retrieve the data for the drawn pixel:
		colorContext.fillStyle = name;
		colorContext.fillRect(0, 0, 1, 1);
		var data = colorContext.getImageData(0, 0, 1, 1).data,
			rgb = [data[0] / 255, data[1] / 255, data[2] / 255];
		return (colorCache[name] = RgbColor.read(rgb)).clone();
	}

	function hexToRgbColor(string) {
		var hex = string.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		if (hex.length >= 4) {
			var rgb = new Array(3);
			for (var i = 0; i < 3; i++) {
				var channel = hex[i + 1];
				rgb[i] = parseInt(channel.length == 1
						? channel + channel : channel, 16) / 255;
			}
			return RgbColor.read(rgb);
		}
	}

	// For hsb-rgb conversion, used to lookup the right parameters in the
	// values array.
	var hsbIndices = [
		[0, 3, 1], // 0
		[2, 0, 1], // 1
		[1, 0, 3], // 2
		[1, 2, 0], // 3
		[3, 1, 0], // 4
		[0, 1, 2]  // 5
	];

	var converters = {
		'rgb-hsb': function(color) {
			var r = color._red,
				g = color._green,
				b = color._blue,
				max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				h = delta == 0 ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60, // max == b
				s = max == 0 ? 0 : delta / max,
				v = max; // = brightness, also called value
			return new HsbColor(h, s, v, color._alpha);
		},

		'hsb-rgb': function(color) {
			var h = (color._hue / 60) % 6, // Scale to 0..6
				s = color._saturation,
				b = color._brightness,
				i = Math.floor(h), // 0..5
				f = h - i,
				i = hsbIndices[i],
				v = [
					b,						// b, index 0
					b * (1 - s),			// p, index 1
					b * (1 - s * f),		// q, index 2
					b * (1 - s * (1 - f))	// t, index 3
				];
			return new RgbColor(v[i[0]], v[i[1]], v[i[2]], color._alpha);
		},

		// HSL code is based on:
		// http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
		'rgb-hsl': function(color) {
			var r = color._red,
				g = color._green,
				b = color._blue,
				max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				achromatic = delta == 0,
				h = achromatic ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60, // max == b
				l = (max + min) / 2,
				s = achromatic ? 0 : l < 0.5
						? delta / (max + min)
						: delta / (2 - max - min);
			return new HslColor(h, s, l, color._alpha);
		},

		'hsl-rgb': function(color) {
			var s = color._saturation,
				h = color._hue / 360,
				l = color._lightness,
				t1, t2, c;
			if (s == 0)
				return new RgbColor(l, l, l, color._alpha);
			var t3s = [ h + 1 / 3, h, h - 1 / 3 ],
				t2 = l < 0.5 ? l * (1 + s) : l + s - l * s,
				t1 = 2 * l - t2,
				c = [];
			for (var i = 0; i < 3; i++) {
				var t3 = t3s[i];
				if (t3 < 0) t3 += 1;
				if (t3 > 1) t3 -= 1;
				c[i] = 6 * t3 < 1
					? t1 + (t2 - t1) * 6 * t3
					: 2 * t3 < 1
						? t2
						: 3 * t3 < 2
							? t1 + (t2 - t1) * ((2 / 3) - t3) * 6
							: t1;
			}
			return new RgbColor(c[0], c[1], c[2], color._alpha);
		},

		'rgb-gray': function(color) {
			// Using the standard NTSC conversion formula that is used for
			// calculating the effective luminance of an RGB color:
			// http://www.mathworks.com/support/solutions/en/data/1-1ASCU/index.html?solution=1-1ASCU
			return new GrayColor(1 - (color._red * 0.2989 + color._green * 0.587
					+ color._blue * 0.114), color._alpha);
		},

		'gray-rgb': function(color) {
			var comp = 1 - color._gray;
			return new RgbColor(comp, comp, comp, color._alpha);
		},

		'gray-hsb': function(color) {
			return new HsbColor(0, 0, 1 - color._gray, color._alpha);
		},

		'gray-hsl': function(color) {
			return new HslColor(0, 0, 1 - color._gray, color._alpha);
		}
	};

	var fields = /** @lends Color# */{
		_readNull: true,

		initialize: function(arg) {
			var isArray = Array.isArray(arg),
				type = this._colorType;
			if (typeof arg === 'object' && !isArray) {
				if (!type) {
					// Called on the abstract Color class. Guess color type
					// from arg
					return arg.red !== undefined
						? new RgbColor(arg.red, arg.green, arg.blue, arg.alpha)
						: arg.gray !== undefined
						? new GrayColor(arg.gray, arg.alpha)
						: arg.lightness !== undefined
						? new HslColor(arg.hue, arg.saturation, arg.lightness,
								arg.alpha)
						: arg.hue !== undefined
						? new HsbColor(arg.hue, arg.saturation, arg.brightness,
								arg.alpha)
						: new RgbColor(); // Fallback
				} else {
					// Called on a subclass instance. Return the converted
					// color.
					return Color.read(arguments).convert(type);
				}
			} else if (typeof arg === 'string') {
				var rgbColor = arg.match(/^#[0-9a-f]{3,6}$/i)
						? hexToRgbColor(arg)
						: nameToRgbColor(arg);
				return type
						? rgbColor.convert(type)
						: rgbColor;
			} else {
				var components = isArray ? arg
						: Array.prototype.slice.call(arguments);
				if (!type) {
					// Called on the abstract Color class. Guess color type
					// from arg
					//if (components.length >= 4)
					//	return new CmykColor(components);
					if (components.length >= 3)
						return new RgbColor(components);
					return new GrayColor(components);
				} else {
					// Called on a subclass instance. Just copy over
					// components.
					Base.each(this._components,
						function(name, i) {
							var value = components[i];
							// Set internal propery directly
							this['_' + name] = value !== undefined
									? value : null;
						},
					this);
				}
			}
		},

		/**
		 * @return {RgbColor|GrayColor|HsbColor} a copy of the color object
		 */
		clone: function() {
			var ctor = this.constructor,
				copy = new ctor(ctor.dont),
				components = this._components;
			for (var i = 0, l = components.length; i < l; i++) {
				var key = '_' + components[i];
				copy[key] = this[key];
			}
			return copy;
		},

		convert: function(type) {
			var converter;
			return this._colorType == type
					? this.clone()
					: (converter = converters[this._colorType + '-' + type])
						? converter(this)
						: converters['rgb-' + type](
								converters[this._colorType + '-rgb'](this));
		},

		statics: /** @lends Color */{
			/**
			 * Override Color.extend() to produce getters and setters based
			 * on the component types defined in _components.
			 *
			 * @ignore
			 */
			extend: function(src) {
				if (src._colorType) {
					var comps = components[src._colorType];
					// Automatically produce the _components field, adding alpha
					src._components = comps.concat(['alpha']);
					Base.each(comps, function(name) {
						var isHue = name === 'hue',
							part = Base.capitalize(name),
							name = '_' + name;
						this['get' + part] = function() {
							return this[name];
						};
						this['set' + part] = function(value) {
							this[name] = isHue
								// Keep negative values within modulo 360 too:
								? ((value % 360) + 360) % 360
								// All other values are 0..1
								: Math.min(Math.max(value, 0), 1);
							this._changed();
							return this;
						};
					}, src);
				}
				return this.base(src);
			}
		}
	};

	// Produce conversion methods for the various color components known by the
	// possible color types. Requesting any of these components on any color
	// internally converts the color to the required type and then returns its
	// component, using bean access.
	Base.each(components, function(comps, type) {
		Base.each(comps, function(component) {
			var part = Base.capitalize(component);
			fields['get' + part] = function() {
				return this.convert(type)[component];
			};
			fields['set' + part] = function(value) {
				var color = this.convert(type);
				color[component] = value;
				color = color.convert(this._colorType);
				for (var i = 0, l = this._components.length; i < l; i++) {
					var key = this._components[i];
					this[key] = color[key];
				}
			};
		});
	});

	return fields;
}, /** @lends Color# */{

	/**
	 * Called by various setters whenever a color value changes
	 */
	_changed: function() {
		this._cssString = null;
		// Loop through the items that use this color and notify them about
		// the style change, so they can redraw.
		for (var i = 0, l = this._owners && this._owners.length; i < l; i++)
			this._owners[i]._changed(Change.STYLE);
	},

	/**
	 * Called by PathStyle whenever this color is used to define an item's style
	 * This is required to pass on _changed() notifications to the _owners.
	 */
	_addOwner: function(item) {
		if (!this._owners)
			this._owners = [];
		this._owners.push(item);
	},

	/**
	 * Called by PathStyle whenever this color stops being used to define an
	 * item's style.
	 * TODO: Should we remove owners that are not used anymore for good, e.g.
	 * in an Item#destroy() method?
	 */
	_removeOwner: function(item) {
		var index = this._owners ? this._owners.indexOf(item) : -1;
		if (index != -1) {
			this._owners.splice(index, 1);
			if (this._owners.length == 0)
				delete this._owners;
		}
	},

	/**
	 * Returns the type of the color as a string.
	 *
	 * @type String('rgb', 'hsb', 'gray')
	 * @bean
	 *
	 * @example
	 * var color = new RgbColor(1, 0, 0);
	 * console.log(color.type); // 'rgb'
	 */
	getType: function() {
		return this._colorType;
	},

	getComponents: function() {
		var length = this._components.length;
		var comps = new Array(length);
		for (var i = 0; i < length; i++)
			comps[i] = this['_' + this._components[i]];
		return comps;
	},

	/**
	 * The color's alpha value as a number between {@code 0} and {@code 1}. All
	 * colors of the different subclasses support alpha values.
	 *
	 * @type Number
	 * @bean
	 *
	 * @example {@paperscript}
	 * // A filled path with a half transparent stroke:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // Fill the circle with red and give it a 20pt green stroke:
	 * circle.style = {
	 * 	fillColor: 'red',
	 * 	strokeColor: 'green',
	 * 	strokeWidth: 20
	 * };
	 *
	 * // Make the stroke half transparent:
	 * circle.strokeColor.alpha = 0.5;
	 */
	getAlpha: function() {
		return this._alpha != null ? this._alpha : 1;
	},

	setAlpha: function(alpha) {
		this._alpha = alpha == null ? null : Math.min(Math.max(alpha, 0), 1);
		this._changed();
		return this;
	},

	/**
	 * Checks if the color has an alpha value.
	 *
	 * @return {Boolean} {@true if the color has an alpha value}
	 */
	hasAlpha: function() {
		return this._alpha != null;
	},

	/**
	 * Checks if the component color values of the color are the
	 * same as those of the supplied one.
	 *
	 * @param {Color} color the color to compare with
	 * @return {Boolean} {@true if the colors are the same}
	 */
	equals: function(color) {
		if (color && color._colorType === this._colorType) {
			for (var i = 0, l = this._components.length; i < l; i++) {
				var component = '_' + this._components[i];
				if (this[component] !== color[component])
					return false;
			}
			return true;
		}
		return false;
	},

	/**
	 * {@grouptitle String Representations}
	 * @return {String} A string representation of the color.
	 */
	toString: function() {
		var parts = [],
			format = Base.formatNumber;
		for (var i = 0, l = this._components.length; i < l; i++) {
			var component = this._components[i],
				value = this['_' + component];
			if (component === 'alpha' && value == null)
				value = 1;
			parts.push(component + ': ' + format(value));
		}
		return '{ ' + parts.join(', ') + ' }';
	},

	/**
	 * @return {String} A css string representation of the color.
	 */
	toCssString: function() {
		if (!this._cssString) {
			var color = this.convert('rgb'),
				alpha = color.getAlpha(),
				components = [
					Math.round(color._red * 255),
					Math.round(color._green * 255),
					Math.round(color._blue * 255),
					alpha != null ? alpha : 1
				];
			this._cssString = 'rgba(' + components.join(', ') + ')';
		}
		return this._cssString;
	},

	getCanvasStyle: function() {
		return this.toCssString();
	}

	/**
	 * {@grouptitle RGB Components}
	 *
	 * The amount of red in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name Color#red
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of red in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'blue';
	 *
	 * // Blue + red = purple:
	 * circle.fillColor.red = 1;
	 */

	/**
	 * The amount of green in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name Color#green
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of green in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // First we set the fill color to red:
	 * circle.fillColor = 'red';
	 *
	 * // Red + green = yellow:
	 * circle.fillColor.green = 1;
	 */

	/**
	 * The amount of blue in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name Color#blue
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of blue in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // First we set the fill color to red:
	 * circle.fillColor = 'red';
	 *
	 * // Red + blue = purple:
	 * circle.fillColor.blue = 1;
	 */

	/**
	 * {@grouptitle Gray Components}
	 *
	 * The amount of gray in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name Color#gray
	 * @property
	 * @type Number
	 */

	/**
	 * {@grouptitle HSB Components}
	 *
	 * The hue of the color as a value in degrees between {@code 0} and
	 * {@code 360}.
	 *
	 * @name Color#hue
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the hue of a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'red';
	 * circle.fillColor.hue += 30;
	 *
	 * @example {@paperscript}
	 * // Hue cycling:
	 *
	 * // Create a rectangle shaped path, using the dimensions
	 * // of the view:
	 * var path = new Path.Rectangle(view.bounds);
	 * path.fillColor = 'red';
	 *
	 * function onFrame(event) {
	 * 	path.fillColor.hue += 0.5;
	 * }
	 */

	/**
	 * The saturation of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name Color#saturation
	 * @property
	 * @type Number
	 */

	/**
	 * The brightness of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name Color#brightness
	 * @property
	 * @type Number
	 */

	/**
	 * {@grouptitle HSL Components}
	 *
	 * The lightness of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name Color#lightness
	 * @property
	 * @type Number
	 */
});

/**
 * @name GrayColor
 * @class A GrayColor object is used to represent any gray color value.
 * @extends Color
 */
var GrayColor = this.GrayColor = Color.extend(/** @lends GrayColor# */{
	/**
	 * Creates a GrayColor object
	 *
	 * @name GrayColor#initialize
	 * @param {Number} gray the amount of gray in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 *
	 * @example {@paperscript}
	 * // Creating a GrayColor:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // Create a GrayColor with 50% gray:
	 * circle.fillColor = new GrayColor(0.5);
	 */

	/**
	 * The amount of gray in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name GrayColor#gray
	 * @property
	 * @type Number
	 */

	_colorType: 'gray'
});

/**
 * @name RgbColor
 * @class An RgbColor object is used to represent any RGB color value.
 * @extends Color
 */
// RGBColor references RgbColor inside PaperScopes for backward compatibility
var RgbColor = this.RgbColor = this.RGBColor = Color.extend(/** @lends RgbColor# */{
	/**
	 * Creates an RgbColor object
	 *
	 * @name RgbColor#initialize
	 * @param {Number} red the amount of red in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} green the amount of green in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} blue the amount of blue in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 *
	 * @example {@paperscript}
	 * // Creating an RgbColor:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // 100% red, 0% blue, 50% blue:
	 * circle.fillColor = new RgbColor(1, 0, 0.5);
	 */

	/**
	 * The amount of red in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name RgbColor#red
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of red in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'blue';
	 *
	 * // Blue + red = purple:
	 * circle.fillColor.red = 1;
	 */

	/**
	 * The amount of green in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name RgbColor#green
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of green in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // First we set the fill color to red:
	 * circle.fillColor = 'red';
	 *
	 * // Red + green = yellow:
	 * circle.fillColor.green = 1;
	 */

	/**
	 * The amount of blue in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name RgbColor#blue
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of blue in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // First we set the fill color to red:
	 * circle.fillColor = 'red';
	 *
	 * // Red + blue = purple:
	 * circle.fillColor.blue = 1;
	 */

	_colorType: 'rgb'
});

/**
 * @name HsbColor
 * @class An HsbColor object is used to represent any HSB color value.
 * @extends Color
 */
// HSBColor references HsbColor inside PaperScopes for backward compatibility
var HsbColor = this.HsbColor = this.HSBColor = Color.extend(/** @lends HsbColor# */{
	/**
	 * Creates an HsbColor object
	 *
	 * @name HsbColor#initialize
	 * @param {Number} hue the hue of the color as a value in degrees between
	 * {@code 0} and {@code 360}.
	 * @param {Number} saturation the saturation of the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} brightness the brightness of the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 *
	 * @example {@paperscript}
	 * // Creating an HsbColor:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // Create an HsbColor with a hue of 90 degrees, a saturation
	 * // 100% and a brightness of 100%:
	 * circle.fillColor = new HsbColor(90, 1, 1);
	 */

	/**
	 * The hue of the color as a value in degrees between {@code 0} and
	 * {@code 360}.
	 *
	 * @name HsbColor#hue
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the hue of a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'red';
	 * circle.fillColor.hue += 30;
	 *
	 * @example {@paperscript}
	 * // Hue cycling:
	 *
	 * // Create a rectangle shaped path, using the dimensions
	 * // of the view:
	 * var path = new Path.Rectangle(view.bounds);
	 * path.fillColor = 'red';
	 *
	 * function onFrame(event) {
	 * 	path.fillColor.hue += 0.5;
	 * }
	 */

	/**
	 * The saturation of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name HsbColor#saturation
	 * @property
	 * @type Number
	 */

	/**
	 * The brightness of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name HsbColor#brightness
	 * @property
	 * @type Number
	 */

	_colorType: 'hsb'
});


/**
 * @name HslColor
 * @class An HslColor object is used to represent any HSL color value.
 * @extends Color
 */
// HSLColor references HslColor inside PaperScopes for backward compatibility
var HslColor = this.HslColor = this.HSLColor = Color.extend(/** @lends HslColor# */{
	/**
	 * Creates an HslColor object
	 *
	 * @name HslColor#initialize
	 * @param {Number} hue the hue of the color as a value in degrees between
	 * {@code 0} and {@code 360}.
	 * @param {Number} saturation the saturation of the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} lightness the lightness of the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 *
	 * @example {@paperscript}
	 * // Creating an HslColor:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // Create an HslColor with a hue of 90 degrees, a saturation
	 * // 100% and a lightness of 50%:
	 * circle.fillColor = new HslColor(90, 1, 0.5);
	 */

	/**
	 * The hue of the color as a value in degrees between {@code 0} and
	 * {@code 360}.
	 *
	 * @name HslColor#hue
	 * @property
	 * @type Number
	 */

	/**
	 * The saturation of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name HslColor#saturation
	 * @property
	 * @type Number
	 */

	/**
	 * The lightness of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name HslColor#lightness
	 * @property
	 * @type Number
	 */

	_colorType: 'hsl'
});
/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name GradientColor
 *
 * @class The GradientColor object.
 */
var GradientColor = this.GradientColor = Color.extend(/** @lends GradientColor# */{

	/**
	 * Creates a gradient color object.
	 *
	 * @param {Gradient} gradient
	 * @param {Point} origin
	 * @param {Point} destination
	 * @param {Point} [hilite]
	 *
	 * @example {@paperscript height=200}
	 * // Applying a linear gradient color containing evenly distributed
	 * // color stops:
	 *
	 * // Define two points which we will be using to construct
	 * // the path and to position the gradient color:
	 * var topLeft = view.center - [80, 80];
	 * var bottomRight = view.center + [80, 80];
	 *
	 * // Create a rectangle shaped path between
	 * // the topLeft and bottomRight points:
	 * var path = new Path.Rectangle(topLeft, bottomRight);
	 *
	 * // Create the gradient, passing it an array of colors to be converted
	 * // to evenly distributed color stops:
	 * var gradient = new Gradient(['yellow', 'red', 'blue']);
	 *
	 * // Have the gradient color run between the topLeft and
	 * // bottomRight points we defined earlier:
	 * var gradientColor = new GradientColor(gradient, topLeft, bottomRight);
	 *
	 * // Set the fill color of the path to the gradient color:
	 * path.fillColor = gradientColor;
	 *
	 * @example {@paperscript height=200}
	 * // Applying a radial gradient color containing unevenly distributed
	 * // color stops:
	 *
	 * // Create a circle shaped path at the center of the view
	 * // with a radius of 80:
	 * var path = new Path.Circle(view.center, 80);
	 *
	 * // The stops array: yellow mixes with red between 0 and 15%,
	 * // 15% to 30% is pure red, red mixes with black between 30% to 100%:
	 * var stops = [['yellow', 0], ['red', 0.15], ['red', 0.3], ['black', 0.9]];
	 *
	 * // Create a radial gradient using the color stops array:
	 * var gradient = new Gradient(stops, 'radial');
	 *
	 * // We will use the center point of the circle shaped path as
	 * // the origin point for our gradient color
	 * var from = path.position;
	 *
	 * // The destination point of the gradient color will be the
	 * // center point of the path + 80pt in horizontal direction:
	 * var to = path.position + [80, 0];
	 *
	 * // Create the gradient color:
	 * var gradientColor = new GradientColor(gradient, from, to);
	 *
	 * // Set the fill color of the path to the gradient color:
	 * path.fillColor = gradientColor;
	 */
	initialize: function(gradient, origin, destination, hilite) {
		this.gradient = gradient || new Gradient();
		this.gradient._addOwner(this);
		this.setOrigin(origin);
		this.setDestination(destination);
		if (hilite)
			this.setHilite(hilite);
	},

	/**
	 * @return {GradientColor} a copy of the gradient color
	 */
	clone: function() {
		return new GradientColor(this.gradient, this._origin, this._destination,
				this._hilite);
	},

	/**
	 * The origin point of the gradient.
	 *
	 * @type Point
	 * @bean
	 *
	 * @example {@paperscript height=200}
	 * // Move the origin point of the gradient, by moving your mouse over
	 * // the view below:
	 *
	 * // Create a rectangle shaped path with the same dimensions as
	 * // that of the view and fill it with a gradient color:
	 * var path = new Path.Rectangle(view.bounds);
	 * var gradient = new Gradient(['yellow', 'red', 'blue']);
	 *
	 * // Have the gradient color run from the top left point of the view,
	 * // to the bottom right point of the view:
	 * var from = view.bounds.topLeft;
	 * var to = view.bounds.bottomRight;
	 * var gradientColor = new GradientColor(gradient, from, to);
	 * path.fillColor = gradientColor;
	 *
	 * function onMouseMove(event) {
	 * 	// Set the origin point of the path's gradient color
	 * 	// to the position of the mouse:
	 * 	path.fillColor.origin = event.point;
	 * }
	 *
	 */
	getOrigin: function() {
		return this._origin;
	},

	setOrigin: function(origin) {
		// PORT: Add clone to Scriptographer
		origin = Point.read(arguments).clone();
		this._origin = origin;
		if (this._destination)
			this._radius = this._destination.getDistance(this._origin);
		this._changed();
		return this;
	},

	/**
	 * The destination point of the gradient.
	 *
	 * @type Point
	 * @bean
	 *
	 * @example {@paperscript height=300}
	 * // Move the destination point of the gradient, by moving your mouse over
	 * // the view below:
	 *
	 * // Create a circle shaped path at the center of the view,
	 * // using 40% of the height of the view as its radius
	 * // and fill it with a radial gradient color:
	 * var path = new Path.Circle(view.center, view.bounds.height * 0.4);
	 *
	 * var gradient = new Gradient(['yellow', 'red', 'black'], 'radial');
	 * var from = view.center;
	 * var to = view.bounds.bottomRight;
	 * var gradientColor = new GradientColor(gradient, from, to);
	 * path.fillColor = gradientColor;
	 *
	 * function onMouseMove(event) {
	 * 	// Set the origin point of the path's gradient color
	 * 	// to the position of the mouse:
	 * 	path.fillColor.destination = event.point;
	 * }
	 */
	getDestination: function() {
		return this._destination;
	},

	setDestination: function(destination) {
		// PORT: Add clone to Scriptographer
		destination = Point.read(arguments).clone();
		this._destination = destination;
		this._radius = this._destination.getDistance(this._origin);
		this._changed();
		return this;
	},

	/**
	 * The hilite point of the gradient.
	 *
	 * @type Point
	 * @bean
	 *
	 * @example {@paperscript height=300}
	 * // Move the hilite point of the gradient, by moving your mouse over
	 * // the view below:
	 *
	 * // Create a circle shaped path at the center of the view,
	 * // using 40% of the height of the view as its radius
	 * // and fill it with a radial gradient color:
	 * var path = new Path.Circle(view.center, view.bounds.height * 0.4);
	 * var gradient = new Gradient(['yellow', 'red', 'black'], 'radial');
	 * var from = path.position;
	 * var to = path.bounds.rightCenter;
	 * var gradientColor = new GradientColor(gradient, from, to);
	 * path.fillColor = gradientColor;
	 *
	 * function onMouseMove(event) {
	 * 	// Set the origin hilite of the path's gradient color
	 * 	// to the position of the mouse:
	 * 	path.fillColor.hilite = event.point;
	 * }
	 */
	getHilite: function() {
		return this._hilite;
	},

	setHilite: function(hilite) {
		// PORT: Add clone to Scriptographer
		hilite = Point.read(arguments).clone();
		var vector = hilite.subtract(this._origin);
		if (vector.getLength() > this._radius) {
			this._hilite = this._origin.add(
					vector.normalize(this._radius - 0.1));
		} else {
			this._hilite = hilite;
		}
		this._changed();
		return this;
	},

	getCanvasStyle: function(ctx) {
		var gradient;
		if (this.gradient.type === 'linear') {
			gradient = ctx.createLinearGradient(this._origin.x, this._origin.y,
					this._destination.x, this._destination.y);
		} else {
			var origin = this._hilite || this._origin;
			gradient = ctx.createRadialGradient(origin.x, origin.y,
					0, this._origin.x, this._origin.y, this._radius);
		}
		for (var i = 0, l = this.gradient._stops.length; i < l; i++) {
			var stop = this.gradient._stops[i];
			gradient.addColorStop(stop._rampPoint, stop._color.toCssString());
		}
		return gradient;
	},

	/**
	 * Checks if the gradient color has the same properties as that of the
	 * supplied one.
	 *
	 * @param {GradientColor} color
	 * @return {@true the GradientColor is the same}
	 */
	equals: function(color) {
		return color == this || color && color._colorType === this._colorType
				&& this.gradient.equals(color.gradient)
				&& this._origin.equals(color._origin)
				&& this._destination.equals(color._destination);
	},

	/**
	 * Transform the gradient color by the specified matrix.
	 *
	 * @param {Matrix} matrix the matrix to transform the gradient color by
	 */
	transform: function(matrix) {
		matrix._transformPoint(this._origin, this._origin, true);
		matrix._transformPoint(this._destination, this._destination, true);
		if (this._hilite)
			matrix._transformPoint(this._hilite, this._hilite, true);
		this._radius = this._destination.getDistance(this._origin);
	}
});


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Gradient
 *
 * @class The Gradient object.
 */
var Gradient = this.Gradient = Base.extend(/** @lends Gradient# */{
	// TODO: Should type here be called 'radial' and have it receive a
	// boolean value?
	/**
	 * Creates a gradient object
	 *
	 * @param {GradientStop[]} stops
	 * @param {String} [type='linear'] 'linear' or 'radial'
	 */
	initialize: function(stops, type) {
		this.setStops(stops || ['white', 'black']);
		this.type = type || 'linear';
	},

	/**
	 * Called by various setters whenever a gradient value changes
	 */
	_changed: function() {
		// Loop through the gradient-colors that use this gradient and notify
		// them, so they can notify the items they belong to.
		for (var i = 0, l = this._owners && this._owners.length; i < l; i++)
			this._owners[i]._changed();
	},

	/**
	 * Called by GradientColor#initialize
	 * This is required to pass on _changed() notifications to the _owners.
	 */
	_addOwner: function(color) {
		if (!this._owners)
			this._owners = [];
		this._owners.push(color);
	},

	// TODO: Where and when should this be called:
	/**
	 * Called by GradientColor whenever this gradient stops being used.
	 */
	_removeOwner: function(color) {
		var index = this._owners ? this._owners.indexOf(color) : -1;
		if (index != -1) {
			this._owners.splice(index, 1);
			if (this._owners.length == 0)
				delete this._owners;
		}
	},

	/**
	 * @return {Gradient} a copy of the gradient
	 */
	clone: function() {
		var stops = [];
		for (var i = 0, l = this._stops.length; i < l; i++)
			stops[i] = this._stops[i].clone();
		return new Gradient(stops, this.type);
	},

	/**
	 * The gradient stops on the gradient ramp.
	 *
	 * @type GradientStop[]
	 * @bean
	 */
	getStops: function() {
		return this._stops;
	},

	setStops: function(stops) {
		// If this gradient already contains stops, first remove
		// this gradient as their owner.
		if (this.stops) {
			for (var i = 0, l = this._stops.length; i < l; i++) {
				this._stops[i]._removeOwner(this);
			}
		}
		if (stops.length < 2)
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		this._stops = GradientStop.readAll(stops);
		// Now reassign ramp points if they were not specified.
		for (var i = 0, l = this._stops.length; i < l; i++) {
			var stop = this._stops[i];
			stop._addOwner(this);
			if (stop._defaultRamp)
				stop.setRampPoint(i / (l - 1));
		}
		this._changed();
	},

	/**
	 * Checks whether the gradient is equal to the supplied gradient.
	 *
	 * @param {Gradient} gradient
	 * @return {Boolean} {@true they are equal}
	 */
	equals: function(gradient) {
		if (gradient.type != this.type)
			return false;
		if (this._stops.length == gradient._stops.length) {
			for (var i = 0, l = this._stops.length; i < l; i++) {
				if (!this._stops[i].equals(gradient._stops[i]))
					return false;
			}
			return true;
		}
		return false;
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// TODO: Support midPoint? (initial tests didn't look nice)
/**
 * @name GradientStop
 *
 * @class The GradientStop object.
 */
var GradientStop = this.GradientStop = Base.extend(/** @lends GradientStop# */{
	/**
	 * Creates a GradientStop object.
	 *
	 * @param {Color} [color=new RgbColor(0, 0, 0)] the color of the stop
	 * @param {Number} [rampPoint=0] the position of the stop on the gradient
	 *                               ramp {@default 0}
	 */
	initialize: function(arg0, arg1) {
		if (arg1 === undefined && Array.isArray(arg0)) {
			// [color, rampPoint]
			this.setColor(arg0[0]);
			this.setRampPoint(arg0[1]);
		} else if (arg0.color) {
			// stop
			this.setColor(arg0.color);
			this.setRampPoint(arg0.rampPoint);
		} else {
			// color [, rampPoint]
			this.setColor(arg0);
			this.setRampPoint(arg1);
		}
	},

	// TODO: Do we really need to also clone the color here?
	/**
	 * @return {GradientColor} a copy of the gradient-stop
	 */
	clone: function() {
		return new GradientStop(this._color.clone(), this._rampPoint);
	},

	/**
	 * Called by various setters whenever a value changes
	 */
	_changed: function() {
		// Loop through the gradients that use this stop and notify them about
		// the change, so they can notify their gradient colors, which in turn
		// will notify the items they are used in:
		for (var i = 0, l = this._owners && this._owners.length; i < l; i++)
			this._owners[i]._changed(Change.STYLE);
	},

	/**
	 * Called by Gradient whenever this stop is used. This is required to pass 
	 * on _changed() notifications to the _owners.
	 */
	_addOwner: function(gradient) {
		if (!this._owners)
			this._owners = [];
		this._owners.push(gradient);
	},

	/**
	 * Called by Gradient whenever this GradientStop is no longer used by it.
	 */
	_removeOwner: function(gradient) {
		var index = this._owners ? this._owners.indexOf(gradient) : -1;
		if (index != -1) {
			this._owners.splice(index, 1);
			if (this._owners.length == 0)
				delete this._owners;
		}
	},


	/**
	 * The ramp-point of the gradient stop as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @type Number
	 * @bean
	 *
	 * @example {@paperscript height=300}
	 * // Animating a gradient's ramp points:
	 *
	 * // Create a circle shaped path at the center of the view,
	 * // using 40% of the height of the view as its radius
	 * // and fill it with a radial gradient color:
	 * var path = new Path.Circle(view.center, view.bounds.height * 0.4);
	 *
	 * // Prepare the gradient color and apply it to the path:
	 * var colors = [['yellow', 0.05], ['red', 0.2], ['black', 1]];
	 * var gradient = new Gradient(colors, 'radial');
	 * var from = path.position;
	 * var to = path.bounds.rightCenter;
	 * var gradientColor = new GradientColor(gradient, from, to);
	 * path.fillColor = gradientColor;
	 *
	 * // This function is called each frame of the animation:
	 * function onFrame(event) {
	 * 	var blackStop = gradient.stops[2];
	 * 	// Animate the rampPoint between 0.7 and 0.9:
	 * 	blackStop.rampPoint = Math.sin(event.time * 5) * 0.1 + 0.8;
	 *
	 * 	// Animate the rampPoint between 0.2 and 0.4
	 * 	var redStop = gradient.stops[1];
	 * 	redStop.rampPoint = Math.sin(event.time * 3) * 0.1 + 0.3;
	 * }
	 */
	getRampPoint: function() {
		return this._rampPoint;
	},

	setRampPoint: function(rampPoint) {
		this._defaultRamp = rampPoint == null;
		this._rampPoint = rampPoint || 0;
		this._changed();
	},

	/**
	 * The color of the gradient stop.
	 *
	 * @type Color
	 * @bean
	 *
	 * @example {@paperscript height=300}
	 * // Animating a gradient's ramp points:
	 *
	 * // Create a circle shaped path at the center of the view,
	 * // using 40% of the height of the view as its radius
	 * // and fill it with a radial gradient color:
	 * var path = new Path.Circle(view.center, view.bounds.height * 0.4);
	 *
	 * // Create a radial gradient that mixes red and black evenly:
	 * var gradient = new Gradient(['red', 'black'], 'radial');
	 *
	 * // Fill the path with a gradient color that runs from its center,
	 * // to the right center of its bounding rectangle:
	 * var from = path.position;
	 * var to = path.bounds.rightCenter;
	 * var gradientColor = new GradientColor(gradient, from, to);
	 * path.fillColor = gradientColor;
	 *
	 * // This function is called each frame of the animation:
	 * function onFrame(event) {
	 * 	// Change the hue of the first stop's color:
	 * 	gradient.stops[0].color.hue += 1;
	 * }
	 */
	getColor: function() {
		return this._color;
	},

	setColor: function(color) {
		// If the stop already contained a color,
		// remove it as an owner:
		if (this._color)
			this._color._removeOwner(this);
		this._color = Color.read(arguments);
		this._color._addOwner(this);
		this._changed();
	},

	equals: function(stop) {
		return stop == this || stop instanceof GradientStop
				&& this._color.equals(stop._color)
				&& this._rampPoint == stop._rampPoint;
	}
});


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name DomElement
 * @namespace
 * @private
 */
var DomElement = {
	getBounds: function(el, viewport) {
		var rect = el.getBoundingClientRect(),
			doc = el.ownerDocument,
			body = doc.body,
			docEl = doc.documentElement,
			x = rect.left - (docEl.clientLeft || body.clientLeft || 0),
			y = rect.top - (docEl.clientTop  || body.clientTop  || 0);
		if (!viewport) {
			var win = DomElement.getViewport(doc);
			x += win.pageXOffset || docEl.scrollLeft || body.scrollLeft;
			y += win.pageYOffset || docEl.scrollTop || body.scrollTop;
		}
		return new Rectangle(x, y, rect.width, rect.height);
	},

	getOffset: function(el, viewport) {
		return this.getBounds(el, viewport).getPoint();
	},

	getSize: function(el) {
		return this.getBounds(el, true).getSize();
	},

	/**
	 * Checks if element is invisibile (display: none, ...)
	 */
	isInvisible: function(el) {
		return this.getSize(el).equals([0, 0]);
	},

	/**
	 * Checks if element is visibile in current viewport
	 */
	isVisible: function(el) {
		// See if the viewport bounds intersect with the windows rectangle
		// which always starts at 0, 0
		return !this.isInvisible(el) && this.getViewportBounds(el).intersects(
				this.getBounds(el, true));
	},

	getViewport: function(doc) {
		return doc.defaultView || doc.parentWindow;
	},

	getViewportBounds: function(el) {
		var doc = el.ownerDocument,
			view = this.getViewport(doc),
			body = doc.getElementsByTagName(
				doc.compatMode === 'CSS1Compat' ? 'html' : 'body')[0];
		return Rectangle.create(0, 0, 
			view.innerWidth || body.clientWidth,
			view.innerHeight || body.clientHeight
		);
	},

	getComputedStyle: function(el, name) {
		if (el.currentStyle)
			return el.currentStyle[Base.camelize(name)];
		var style = this.getViewport(el.ownerDocument)
				.getComputedStyle(el, null);
		return style ? style.getPropertyValue(Base.hyphenate(name)) : null;
	}
};

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name DomEvent
 * @namespace
 * @private
 */
var DomEvent = {
	add: function(el, events) {
		for (var type in events) {
			var func = events[type];
			if (el.addEventListener) {
				el.addEventListener(type, func, false);
			} else if (el.attachEvent) {
				// Make a bound closure that calls on the right object and
				// passes on the global event object as a parameter.
				el.attachEvent('on' + type, func.bound = function() {
					func.call(el, window.event);
				});
			}
		}
	},

	remove: function(el, events) {
		for (var type in events) {
			var func = events[type];
			if (el.removeEventListener) {
				el.removeEventListener(type, func, false);
			} else if (el.detachEvent) {
				// Remove the bound closure instead of func itself
				el.detachEvent('on' + type, func.bound);
			}
		}
	},

	getPoint: function(event) {
		var pos = event.targetTouches
				? event.targetTouches.length
					? event.targetTouches[0]
					: event.changedTouches[0]
				: event;
		return Point.create(
			pos.pageX || pos.clientX + document.documentElement.scrollLeft,
			pos.pageY || pos.clientY + document.documentElement.scrollTop
		);
	},

	getTarget: function(event) {
		return event.target || event.srcElement;
	},

	getOffset: function(event, target) {
		// Remove target offsets from page coordinates
		return DomEvent.getPoint(event).subtract(DomElement.getOffset(
				target || DomEvent.getTarget(event)));
	},

	preventDefault: function(event) {
		if (event.preventDefault) {
			event.preventDefault();
		} else {
			// IE
			event.returnValue = false;
		}
	},

	stopPropagation: function(event) {
		if (event.stopPropagation) {
			event.stopPropagation();
		} else {
			event.cancelBubble = true;
		}
	},

	stop: function(event) {
		DomEvent.stopPropagation(event);
		DomEvent.preventDefault(event);
	}
};

DomEvent.requestAnimationFrame = new function() {
	var part = 'equestAnimationFrame',
		request = window['r' + part] || window['webkitR' + part]
			|| window['mozR' + part] || window['oR' + part]
			|| window['msR' + part];
	if (request) {
		// Chrome shipped without the time arg in m10. We need to check if time
		// is defined in callbacks, and if not, clear request again so we won't
		// use the faulty method.
		request(function(time) {
			if (time == undefined)
				request = null;
		});
	}

	// So we need to fake it. Define helper functions first:
	var callbacks = [],
		focused = true,
		timer;

	DomEvent.add(window, {
		focus: function() {
			focused = true;
		},
		blur: function() {
			focused = false;
		}
	});

	return function(callback, element) {
		// See if we can handle natively first
		if (request)
			return request(callback, element);
		// If not, do the callback handling ourself:
		callbacks.push([callback, element]);
		// We're done if there's already a timer installed
		if (timer)
			return;
		// Installs interval timer that checks all callbacks. This results
		// in faster animations than repeatedly installing timout timers.
		timer = window.setInterval(function() {
			// Checks all installed callbacks for element visibility and
			// execute if needed.
			for (var i = callbacks.length - 1; i >= 0; i--) {
				var entry = callbacks[i],
					func = entry[0],
					el = entry[1];
				if (!el || (PaperScript.getAttribute(el, 'keepalive') == 'true'
						|| focused) && DomElement.isVisible(el)) {
					// Handle callback and remove it from callbacks list.
					callbacks.splice(i, 1);
					func(Date.now());
				}
			}
		}, 1000 / 60);
	};
};


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name View
 *
 * @class The View object wraps an html element and handles drawing and user
 * interaction through mouse and keyboard for it. It offer means to scroll the
 * view, find the currently visible bounds in project coordinates, or the
 * center, both useful for constructing artwork that should appear centered on
 * screen.
 */
var View = this.View = Base.extend(Callback, /** @lends View# */{
	_events: {
		onFrame: {
			install: function() {
				var that = this,
					requested = false,
					before,
					time = 0,
					count = 0;
				this._onFrameCallback = function(param, dontRequest) {
					requested = false;
					// See if we need to stop due to a call to uninstall()
					if (!that._onFrameCallback)
						return;
					// Set the global paper object to the current scope
					paper = that._scope;
					if (!dontRequest) {
						// Request next frame already
						requested = true;
						DomEvent.requestAnimationFrame(that._onFrameCallback,
								that._element);
					}
					var now = Date.now() / 1000,
					 	delta = before ? now - before : 0;
					// delta: Time elapsed since last redraw in seconds
					// time: Time since first call of frame() in seconds
					// Use Base.merge to convert into a Base object,
					// for #toString()
					that.fire('frame', Base.merge({
						delta: delta,
						time: time += delta,
						count: count++
					}));
					before = now;
					// Update framerate stats
					if (that._stats)
						that._stats.update();
					// Automatically draw view on each frame.
					that.draw(true);
				};
				// Call the onFrame handler straight away, initializing the
				// sequence of onFrame calls.
				if (!requested)
					this._onFrameCallback();
			},

			uninstall: function() {
				delete this._onFrameCallback;
			}
		},

		onResize: {}
	},

	initialize: function(element) {
		// Store reference to the currently active global paper scope, and the
		// active project, which will be represented by this view
		this._scope = paper;
		this._project = paper.project;
		this._element = element;
		var size;
		// Generate an id for this view / element if it does not have one
		this._id = element.getAttribute('id');
		if (this._id == null)
			element.setAttribute('id', this._id = 'view-' + View._id++);
		// Install event handlers
		DomEvent.add(element, this._handlers);
		// If the element has the resize attribute, resize the it to fill the
		// window and resize it again whenever the user resizes the window.
		if (PaperScript.hasAttribute(element, 'resize')) {
			// Subtract element' viewport offset from the total size, to
			// stretch it in
			var offset = DomElement.getOffset(element, true),
				that = this;
			size = DomElement.getViewportBounds(element)
					.getSize().subtract(offset);
			element.width = size.width;
			element.height = size.height;
			DomEvent.add(window, {
				resize: function(event) {
					// Only update element offset if it's not invisible, as
					// otherwise the offset would be wrong.
					if (!DomElement.isInvisible(element))
						offset = DomElement.getOffset(element, true);
					// Set the size now, which internally calls onResize
					// and redraws the view
					that.setViewSize(DomElement.getViewportBounds(element)
							.getSize().subtract(offset));
				}
			});
		} else {
			// If the element is invisible, we cannot directly access
			// element.width / height, because they would appear 0. Reading
			// the attributes still works though:
			size = DomElement.isInvisible(element)
				? Size.create(parseInt(element.getAttribute('width')),
						parseInt(element.getAttribute('height')))
				: DomElement.getSize(element);
		}
		// TODO: Test this on IE:
		if (PaperScript.hasAttribute(element, 'stats')) {
			this._stats = new Stats();
			// Align top-left to the element
			var stats = this._stats.domElement,
				style = stats.style,
				offset = DomElement.getOffset(element);
			style.position = 'absolute';
			style.left = offset.x + 'px';
			style.top = offset.y + 'px';
			document.body.appendChild(stats);
		}
		// Keep track of views internally
		View._views.push(this);
		// Link this id to our view
		View._viewsById[this._id] = this;
		this._viewSize = LinkedSize.create(this, 'setViewSize',
				size.width, size.height);
		this._matrix = new Matrix();
		this._zoom = 1;
		// Make sure the first view is focused for keyboard input straight away
		if (!View._focused)
			View._focused = this;
	},

	/**
	 * Removes this view from and frees the associated element.
	 */
	remove: function() {
		if (!this._project)
			return false;
		// Clear focus if removed view had it
		if (View._focused == this)
			View._focused = null;
		// Remove view from internal structures
		View._views.splice(View._views.indexOf(this), 1);
		delete View._viewsById[this._id];
		// Unlink from project
		if (this._project.view == this)
			this._project.view = null;
		// Uninstall event handlers again for this view.
		DomEvent.remove(this._element, this._handlers);
		this._element = this._project = null;
		// Removing all onFrame handlers makes the _onFrameCallback handler stop
		// automatically through its uninstall method.
		this.detach('frame');
		return true;
	},

	_redraw: function() {
		this._redrawNeeded = true;
		if (this._onFrameCallback) {
			// If there's a _onFrameCallback, call it staight away,
			// but without requesting another animation frame.
			this._onFrameCallback(0, true);
		} else {
			// Otherwise simply redraw the view now
			this.draw();
		}
	},

	_transform: function(matrix) {
		this._matrix.preConcatenate(matrix);
		// Force recalculation of these values next time they are requested.
		this._bounds = null;
		this._inverse = null;
		this._redraw();
	},

	/**
	 * The underlying native element.
	 *
	 * @type HTMLCanvasElement
	 * @bean
	 */
	getElement: function() {
		return this._element;
	},

	/**
	 * The size of the view. Changing the view's size will resize it's
	 * underlying element.
	 *
	 * @type Size
	 * @bean
	 */
	getViewSize: function() {
		return this._viewSize;
	},

	setViewSize: function(size) {
		size = Size.read(arguments);
		var delta = size.subtract(this._viewSize);
		if (delta.isZero())
			return;
		this._element.width = size.width;
		this._element.height = size.height;
		// Update _viewSize but don't notify of change.
		this._viewSize.set(size.width, size.height, true);
		// Force recalculation
		this._bounds = null;
		this._redrawNeeded = true;
		// Call onResize handler on any size change
		this.fire('resize', {
			size: size,
			delta: delta
		});
		this._redraw();
	},

	/**
	 * The bounds of the currently visible area in project coordinates.
	 *
	 * @type Rectangle
	 * @bean
	 */
	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._getInverse()._transformBounds(
					new Rectangle(new Point(), this._viewSize));
		return this._bounds;
	},

	/**
	 * The size of the visible area in project coordinates.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function() {
		return this.getBounds().getSize();
	},

	/**
	 * The center of the visible area in project coordinates.
	 *
	 * @type Point
	 * @bean
	 */
	getCenter: function() {
		return this.getBounds().getCenter();
	},

	setCenter: function(center) {
		this.scrollBy((
			this._matrix.transform(Point.read(arguments).subtract(this.getCenter()))
		).subtract(
			this._matrix.transform([0, 0])
		));
	},

	/**
	 * The zoom factor by which the project coordinates are magnified.
	 *
	 * @type Number
	 * @bean
	 */
	getZoom: function() {
		return this._zoom;
	},

	setZoom: function(zoom) {
		// TODO: Clamp the view between 1/32 and 64, just like Illustrator?
		this._transform(new Matrix().scale(zoom / this._zoom,
			this._matrix.transform(this.getCenter())));
		this._zoom = zoom;
	},

	/**
	 * Checks whether the view is currently visible within the current browser
	 * viewport.
	 *
	 * @return {Boolean} Whether the view is visible.
	 */
	isVisible: function() {
		return DomElement.isVisible(this._element);
	},

	/**
	 * Scrolls the view by the given vector.
	 *
	 * @param {Point} point
	 */
	scrollBy: function(point) {
		this._transform(new Matrix().translate(Point.read(arguments).negate()));
	},

	/**
	 * Draws the view.
	 *
	 * @name View#draw
	 * @function
	 */
	/*
	draw: function(checkRedraw) {
	},
	*/

	// TODO: getInvalidBounds
	// TODO: invalidate(rect)
	// TODO: style: artwork / preview / raster / opaque / ink
	// TODO: getShowGrid
	// TODO: getMousePoint
	// TODO: projectToView(rect)

	projectToView: function(point) {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	viewToProject: function(point) {
		return this._getInverse()._transformPoint(Point.read(arguments));
	},

	_getInverse: function() {
		if (!this._inverse)
			this._inverse = this._matrix.createInverse();
		return this._inverse;
	}

	/**
	 * {@grouptitle Event Handlers}
	 * Handler function to be called on each frame of an animation.
	 * The function receives an event object which contains information about
	 * the frame event:
	 *
	 * <b>{@code event.count}</b>: the number of times the frame event was
	 * fired.
	 * <b>{@code event.time}</b>: the total amount of time passed since the
	 * first frame event in seconds.
	 * <b>{@code event.delta}</b>: the time passed in seconds since the last
	 * frame event.
	 *
	 * @example {@paperscript}
	 * // Creating an animation:
	 *
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * function onFrame(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	path.rotate(3);
	 * }
	 *
	 * @name View#onFrame
	 * @property
	 * @type Function
	 */

	/**
	 * Handler function that is called whenever a view is resized.
	 *
	 * @example
	 * // Repositioning items when a view is resized:
	 *
	 * // Create a circle shaped path in the center of the view:
	 * var path = new Path.Circle(view.bounds.center, 30);
	 * path.fillColor = 'red';
	 *
	 * function onResize(event) {
	 * 	// Whenever the view is resized, move the path to its center:
	 * 	path.position = view.center;
	 * }
	 *
	 * @name View#onResize
	 * @property
	 * @type Function
	 */
	/**
	 * {@grouptitle Event Handling}
	 * 
	 * Attach an event handler to the view.
	 *
	 * @name View#attach
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 */
	/**
	 * Attach one or more event handlers to the view.
	 *
	 * @name View#attach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code frame, resize}.
	 */

	/**
	 * Detach an event handler from the view.
	 *
	 * @name View#detach
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Function} function The function to be detached
	 */
	/**
	 * Detach one or more event handlers from the view.
	 *
	 * @name View#detach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code frame, resize}
	 */

	/**
	 * Fire an event on the view.
	 *
	 * @name View#fire
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Object} event An object literal containing properties describing
	 * the event.
	 */

	/**
	 * Check if the view has one or more event handlers of the specified type.
	 *
	 * @name View#responds
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @return {Boolean} {@true if the view has one or more event handlers of
	 * the specified type}
	 */
}, {
	statics: {
		_views: [],
		_viewsById: {},
		_id: 0,

		create: function(element) {
			if (typeof element === 'string')
				element = document.getElementById(element);
			// Factory to provide the right View subclass for a given element.
			// Produces only Canvas-Views for now:
			return new CanvasView(element);
		}
	}
}, new function() {
	// Injection scope for mouse events on the browser
	var tool,
		curPoint,
		tempFocus,
		dragging = false;

	function getView(event) {
		// Get the view from the current event target.
		return View._viewsById[DomEvent.getTarget(event).getAttribute('id')];
	}

	function viewToProject(view, event) {
		return view.viewToProject(DomEvent.getOffset(event, view._element));
	}

	function updateFocus() {
		if (!View._focused || !View._focused.isVisible()) {
			// Find the first visible view
			for (var i = 0, l = View._views.length; i < l; i++) {
				var view = View._views[i];
				if (view && view.isVisible()) {
					View._focused = tempFocus = view;
					break;
				}
			}
		}
	}

	function mousedown(event) {
		// Get the view from the event, and store a reference to the view that
		// should receive keyboard input.
		var view = View._focused = getView(event);
		curPoint = viewToProject(view, event);
		dragging = true;
		// Always first call the view's mouse handlers, as required by
		// CanvasView, and then handle the active tool, if any.
		if (view._onMouseDown)
			view._onMouseDown(event, curPoint);
		if (tool = view._scope.tool)
			tool._onHandleEvent('mousedown', curPoint, event);
		// In the end we always call draw(), but pass checkRedraw = true, so we
		// only redraw the view if anything has changed in the above calls.
		view.draw(true);
	}

	function mousemove(event) {
		var view;
		if (!dragging) {
			// See if we can get the view from the current event target, and
			// handle the mouse move over it.
			view = getView(event);
			if (view) {
				// Temporarily focus this view without making it sticky, so
				// Key events are handled too during the mouse over
				View._focused = tempFocus = view;
			} else if (tempFocus && tempFocus == View._focused) {
				// Clear temporary focus again and update it.
				View._focused = null;
				updateFocus();
			}
		}
		if (!(view = view || View._focused))
			return;
		var point = event && viewToProject(view, event);
		if (view._onMouseMove)
			view._onMouseMove(event, point);
		if (tool = view._scope.tool) {
			var onlyMove = !!(!tool.onMouseDrag && tool.onMouseMove);
			if (dragging && !onlyMove) {
				if ((curPoint = point || curPoint) 
						&& tool._onHandleEvent('mousedrag', curPoint, event))
					DomEvent.stop(event);
			// PORT: If there is only an onMouseMove handler, also call it when
			// the user is dragging:
			} else if ((!dragging || onlyMove)
					&& tool._onHandleEvent('mousemove', point, event)) {
				DomEvent.stop(event);
			}
		}
		view.draw(true);
	}

	function mouseup(event) {
		var view = View._focused;
		if (!view || !dragging)
			return;
		var point = viewToProject(view, event);
		curPoint = null;
		dragging = false;
		if (view._onMouseUp)
			view._onMouseUp(event, point);
		// Cancel DOM-event if it was handled by our tool
		if (tool && tool._onHandleEvent('mouseup', point, event))
			DomEvent.stop(event);
		view.draw(true);
	}

	function selectstart(event) {
		// Only stop this even if we're dragging already, since otherwise no
		// text whatsoever can be selected on the page.
		if (dragging)
			DomEvent.stop(event);
	}

	// mousemove and mouseup events need to be installed on document, not the
	// view element, since we want to catch the end of drag events even outside
	// our view. Only the mousedown events are installed on the view, as handled
	// by _createHandlers below.

	DomEvent.add(document, {
		mousemove: mousemove,
		mouseup: mouseup,
		touchmove: mousemove,
		touchend: mouseup,
		selectstart: selectstart,
		scroll: updateFocus
	});

	DomEvent.add(window, {
		load: updateFocus
	});

	return {
		_handlers: {
			mousedown: mousedown,
			touchstart: mousedown,
			selectstart: selectstart
		},

		statics: {
			/**
			 * Loops through all views and sets the focus on the first
			 * active one.
			 */
			updateFocus: updateFocus
		}
	};
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CanvasView
 *
 * @private
 */
var CanvasView = View.extend(/** @lends CanvasView# */{
	/**
	 * Creates a view object that wraps a canvas element.
	 * 
	 * @param {HTMLCanvasElement} canvas The canvas object that this view should
	 * wrap
	 */
	initialize: function(canvas) {
		// Handle canvas argument
		if (!(canvas instanceof HTMLCanvasElement)) {
			// 2nd argument onwards could be view size, otherwise use default:
			var size = Size.read(arguments, 1);
			if (size.isZero())
				size = Size.create(1024, 768);
			canvas = CanvasProvider.getCanvas(size);
		}
		this._context = canvas.getContext('2d');
		// Have Item count installed mouse events.
		this._eventCounters = {};
		this.base(canvas);
	},

	/**
	 * Draws the view.
	 *
	 * @name View#draw
	 * @function
	 */
	draw: function(checkRedraw) {
		if (checkRedraw && !this._redrawNeeded)
			return false;
		// Initial tests conclude that clearing the canvas using clearRect
		// is always faster than setting canvas.width = canvas.width
		// http://jsperf.com/clearrect-vs-setting-width/7
		var ctx = this._context,
			size = this._viewSize;
		ctx.clearRect(0, 0, size._width + 1, size._height + 1);
		this._project.draw(ctx, this._matrix);
		this._redrawNeeded = false;
		return true;
	}
}, new function() { // Item based mouse handling:

	var hitOptions = {
		fill: true,
		stroke: true,
		tolerance: 0
	};

	var downPoint,
		lastPoint,
		overPoint,
		downItem,
		overItem,
		hasDrag,
		doubleClick,
		clickTime;

	function callEvent(type, event, point, target, lastPoint, bubble) {
		var item = target,
			mouseEvent,
			called = false;
		while (item) {
			if (item.responds(type)) {
				// Create an reuse the event object if we're bubbling
				if (!mouseEvent)
					mouseEvent = new MouseEvent(type, event, point, target,
							// Calculate delta if lastPoint was passed
							lastPoint ? point.subtract(lastPoint) : null);
				called = item.fire(type, mouseEvent) || called;
				if (called && (!bubble || mouseEvent._stopped))
					break;
			}
			item = item.getParent();
		}
		return called;
	}

	function handleEvent(view, type, event, point, lastPoint) {
		if (view._eventCounters[type]) {
			var hit = view._project.hitTest(point, hitOptions),
				item = hit && hit.item;
			if (item) {
				// If this is a mousemove event and we change the overItem,
				// reset lastPoint to point so delta is (0, 0)
				if (type == 'mousemove' && item != overItem)
					lastPoint = point;
				// If we have a downItem with a mousedrag event, do not send
				// mousemove events to any item while we're dragging.
				// TODO: Do we also need to lock mousenter / mouseleave in the
				// same way?
				if (type != 'mousemove' || !hasDrag)
					callEvent(type, event, point, item, lastPoint);
				return item;
			}
		}
	}

	return {
		_onMouseDown: function(event, point) {
			var item = handleEvent(this, 'mousedown', event, point);
			// See if we're clicking again on the same item, within the
			// double-click time. Firefox uses 300ms as the max time difference:
			doubleClick = downItem == item && Date.now() - clickTime < 300;
			downItem = item;
			downPoint = lastPoint = overPoint = point;
			hasDrag = downItem && downItem.responds('mousedrag');
		},

		_onMouseUp: function(event, point) {
			// TODO: Check 
			var item = handleEvent(this, 'mouseup', event, point);
			if (hasDrag) {
				// If the point has changed since the last mousedrag event, send
				// another one
				if (lastPoint && !lastPoint.equals(point))
					callEvent('mousedrag', event, point, downItem, lastPoint);
				// If we had a mousedrag event locking mousemove events and are
				// over another item, send it a mousemove event now.
				// Use point as overPoint, so delta is (0, 0) since this will
				// be the first mousemove event for this item.
				if (item != downItem) {
					overPoint = point;
					callEvent('mousemove', event, point, item, overPoint);
				}
			}
			if (item == downItem) {
				clickTime = Date.now();
				callEvent(doubleClick ? 'doubleclick' : 'click', event,
						downPoint, overItem);
				doubleClick = false;
			}
			downItem = null;
			hasDrag = false;
		},

		_onMouseMove: function(event, point) {
			// Call the mousedrag event first if an item was clicked earlier
			if (downItem)
				callEvent('mousedrag', event, point, downItem, lastPoint);
			var item = handleEvent(this, 'mousemove', event, point, overPoint);
			lastPoint = overPoint = point;
			if (item != overItem) {
				callEvent('mouseleave', event, point, overItem);
				overItem = item;
				callEvent('mouseenter', event, point, item);
			}
		}
	};
});



/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Event
 * @class
 */
var Event = this.Event = Base.extend(/** @lends Event# */{
	initialize: function(event) {
		this.event = event;
	},

	// PORT: Add to Scriptographer
	preventDefault: function() {
		this._prevented = true;
		DomEvent.preventDefault(this.event);
		return this;
	},

	stopPropagation: function() {
		this._stopped = true;
		DomEvent.stopPropagation(this.event);
		return this;
	},

	stop: function() {
		return this.stopPropagation().preventDefault();
	},

	// DOCS: Document Event#modifiers
	/**
	 * @type object
	 * @bean
	 */
	getModifiers: function() {
		return Key.modifiers;
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name KeyEvent
 *
 * @class KeyEvent The KeyEvent object is received by the {@link Tool}'s
 * keyboard handlers {@link Tool#onKeyDown}, {@link Tool#onKeyUp},
 * The KeyEvent object is the only parameter passed to these functions
 * and contains information about the keyboard event.
 *
 * @extends Event
 */
var KeyEvent = this.KeyEvent = Event.extend(/** @lends KeyEvent# */{
	initialize: function(down, key, character, event) {
		this.base(event);
		this.type = down ? 'keydown' : 'keyup';
		this.key = key;
		this.character = character;
	},

	/**
	 * The type of key event.
	 *
	 * @name KeyEvent#type
	 * @type String('keydown', 'keyup')
	 */

	/**
	 * The string character of the key that caused this key event.
	 *
	 * @name KeyEvent#character
	 * @type String
	 */

	/**
	 * The key that caused this key event.
	 *
	 * @name KeyEvent#key
	 * @type String
	 */

	/**
	 * @return {String} A string representation of the key event.
	 */
	toString: function() {
		return '{ type: ' + this.type
				+ ', key: ' + this.key
				+ ', character: ' + this.character
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Key
 * @namespace
 */
var Key = this.Key = new function() {
	// TODO: Make sure the keys are called the same as in Scriptographer
	// Missing: tab, cancel, clear, page-down, page-up, comma, minus, period,
	// slash, etc etc etc.

	var keys = {
		8: 'backspace',
		13: 'enter',
		16: 'shift',
		17: 'control',
		18: 'option',
		19: 'pause',
		20: 'caps-lock',
		27: 'escape',
		32: 'space',
		35: 'end',
		36: 'home',
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		46: 'delete',
		91: 'command',
		93: 'command', // WebKit right command button
		224: 'command'  // Gecko command button
	},

	// Use Base.merge to convert into a Base object, for #toString()
	modifiers = Base.merge({
		shift: false,
		control: false,
		option: false,
		command: false,
		capsLock: false
	}),

	// Since only keypress gets proper keyCodes that are actually representing
	// characters, we need to perform a little trickery here to use these codes
	// in onKeyDown/Up: keydown is used to store the downCode and handle
	// modifiers and special keys such as arrows, space, etc, keypress fires the
	// actual onKeyDown event and maps the keydown keyCode to the keypress
	// charCode so keyup can do the right thing too.
	charCodeMap = {}, // keyCode -> charCode mappings for pressed keys
	keyMap = {}, // Map for currently pressed keys
	downCode; // The last keyCode from keydown

	function handleKey(down, keyCode, charCode, event) {
		var character = String.fromCharCode(charCode),
			key = keys[keyCode] || character.toLowerCase(),
			type = down ? 'keydown' : 'keyup',
			view = View._focused,
			scope = view && view.isVisible() && view._scope,
			tool = scope && scope.tool;
		keyMap[key] = down;
		if (tool && tool.responds(type)) {
			// Call the onKeyDown or onKeyUp handler if present
			tool.fire(type, new KeyEvent(down, key, character, event));
			if (view)
				view.draw(true);
		}
	}

	DomEvent.add(document, {
		keydown: function(event) {
			var code = event.which || event.keyCode;
			// If the keyCode is in keys, it needs to be handled by keydown and
			// not in keypress after (arrows for example wont be triggering
			// a keypress, but space would).
			var key = keys[code], name;
			if (key) {
				// Detect modifiers and mark them as pressed
				if ((name = Base.camelize(key)) in modifiers)
					modifiers[name] = true;
				// No char code for special keys, but mark as pressed
				charCodeMap[code] = 0;
				handleKey(true, code, null, event);
				// Do not set downCode as we handled it already. Space would
				// be handled twice otherwise, once here, once in keypress.
			} else {
				downCode = code;
			}
		},

		keypress: function(event) {
			if (downCode != null) {
				var code = event.which || event.keyCode;
				// Link the downCode from keydown with the code form keypress,
				// so keyup can retrieve that code again.
				charCodeMap[downCode] = code;
				handleKey(true, downCode, code, event);
				downCode = null;
			}
		},

		keyup: function(event) {
			var code = event.which || event.keyCode,
				key = keys[code], name;
			// Detect modifiers and mark them as released
			if (key && (name = Base.camelize(key)) in modifiers)
				modifiers[name] = false;
			if (charCodeMap[code] != null) {
				handleKey(false, code, charCodeMap[code], event);
				delete charCodeMap[code];
			}
		}
	});

	return /** @lends Key */{
		modifiers: modifiers,

		/**
		 * Checks whether the specified key is pressed.
		 *
		 * @param {String} key One of: 'backspace', 'enter', 'shift', 'control',
		 * 'option', 'pause', 'caps-lock', 'escape', 'space', 'end', 'home',
		 * 'left', 'up', 'right', 'down', 'delete', 'command'
		 * @return {Boolean} {@true if the key is pressed}
		 *
		 * @example
		 * // Whenever the user clicks, create a circle shaped path. If the
		 * // 'a' key is pressed, fill it with red, otherwise fill it with blue:
		 * function onMouseDown(event) {
		 * 	var path = new Path.Circle(event.point, 10);
		 * 	if (Key.isDown('a')) {
		 * 		path.fillColor = 'red';
		 * 	} else {
		 * 		path.fillColor = 'blue';
		 * 	}
		 * }
		 */
		isDown: function(key) {
			return !!keyMap[key];
		}
	};
};
/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name MouseEvent
 *
 * @class MouseEvent The MouseEvent object is received by the {@link Item}'s
 * mouse event handlers {@link Item#onMouseDown}, {@link Item#onMouseDrag},
 * {@link Item#onMouseMove}, {@link Item#onMouseUp}, {@link Item#onClick},
 * {@link Item#onDoubleClick}, {@link Item#onMouseEnter} and
 * {@link Item#onMouseLeave}. The MouseEvent object is the only parameter passed
 * to these functions and contains information about the mouse event.
 *
 * @extends Event
 */
var MouseEvent = this.MouseEvent = Event.extend(/** @lends MouseEvent# */{
	initialize: function(type, event, point, target, delta) {
		this.base(event);
		this.type = type;
		this.point = point;
		this.target = target;
		this.delta = delta;
	},

	/**
	 * The type of mouse event.
	 *
	 * @name MouseEvent#type
	 * @type String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')
	 */

	/**
	 * The position of the mouse in project coordinates when the event was
	 * fired.
	 *
	 * @name MouseEvent#point
	 * @type Point
	 */

	// DOCS: document MouseEvent#target
	/**
	 * @name MouseEvent#target
	 * @type Item
	 */

	// DOCS: document MouseEvent#delta
	/**
	 * @name MouseEvent#delta
	 * @type Point
	 */

	/**
	 * @return {String} A string representation of the mouse event.
	 */
	toString: function() {
		return '{ type: ' + this.type
				+ ', point: ' + this.point
				+ ', target: ' + this.target
				+ (this.delta ? ', delta: ' + this.delta : '')
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name ToolEvent
 *
 * @class ToolEvent The ToolEvent object is received by the {@link Tool}'s mouse
 * event handlers {@link Tool#onMouseDown}, {@link Tool#onMouseDrag},
 * {@link Tool#onMouseMove} and {@link Tool#onMouseUp}. The ToolEvent
 * object is the only parameter passed to these functions and contains
 * information about the mouse event.
 *
 * @extends Event
 */
var ToolEvent = this.ToolEvent = Event.extend(/** @lends ToolEvent# */{
	initialize: function(tool, type, event) {
		this.tool = tool;
		this.type = type;
		this.event = event;
	},

	/**
	 * Convenience method to allow local overrides of point values.
	 * See application below.
	 */
	_choosePoint: function(point, toolPoint) {
		return point ? point : toolPoint ? toolPoint.clone() : null;
	},

	/**
	 * The type of tool event.
	 *
	 * @name ToolEvent#type
	 * @type String('mousedown', 'mouseup', 'mousemove', 'mousedrag')
	 */

	/**
	 * The position of the mouse in project coordinates when the event was
	 * fired.
	 *
	 * @example
	 * function onMouseDrag(event) {
	 * 	// the position of the mouse when it is dragged
	 * 	console.log(event.point);
	 * }
	 *
	 * function onMouseUp(event) {
	 * 	// the position of the mouse when it is released
	 * 	console.log(event.point);
	 * }
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		return this._choosePoint(this._point, this.tool._point);
	},

	setPoint: function(point) {
		this._point = point;
	},

	/**
	 * The position of the mouse in project coordinates when the previous
	 * event was fired.
	 *
	 * @type Point
	 * @bean
	 */
	getLastPoint: function() {
		return this._choosePoint(this._lastPoint, this.tool._lastPoint);
	},

	setLastPoint: function(lastPoint) {
		this._lastPoint = lastPoint;
	},

	/**
	 * The position of the mouse in project coordinates when the mouse button
	 * was last clicked.
	 *
	 * @type Point
	 * @bean
	 */
	getDownPoint: function() {
		return this._choosePoint(this._downPoint, this.tool._downPoint);
	},

	setDownPoint: function(downPoint) {
		this._downPoint = downPoint;
	},

	/**
	 * The point in the middle between {@link #lastPoint} and
	 * {@link #point}. This is a useful position to use when creating
	 * artwork based on the moving direction of the mouse, as returned by
	 * {@link #delta}.
	 *
	 * @type Point
	 * @bean
	 */
	getMiddlePoint: function() {
		// For explanations, see getDelta()
		if (!this._middlePoint && this.tool._lastPoint) {
			// (point + lastPoint) / 2
			return this.tool._point.add(this.tool._lastPoint).divide(2);
		}
		return this.middlePoint;
	},

	setMiddlePoint: function(middlePoint) {
		this._middlePoint = middlePoint;
	},

	/**
	 * The difference between the current position and the last position of the
	 * mouse when the event was fired. In case of the mouseup event, the
	 * difference to the mousedown position is returned.
	 *
	 * @type Point
	 * @bean
	 */
	getDelta: function() {
		// Do not put the calculated delta into delta, since this only reserved
		// for overriding event.delta.
		// Instead, keep calculating the delta each time, so the result can be
		// directly modified by the script without changing the internal values.
		// We could cache this and use clone, but this is almost as fast...
		return !this._delta && this.tool._lastPoint
		 		? this.tool._point.subtract(this.tool._lastPoint)
				: this._delta;
	},

	setDelta: function(delta) {
		this._delta = delta;
	},

	/**
	 * The number of times the mouse event was fired.
	 *
	 * @type Number
	 * @bean
	 */
	getCount: function() {
		// Return downCount for both mouse down and up, since
		// the count is the same.
		return /^mouse(down|up)$/.test(this.type)
				? this.tool._downCount
				: this.tool._count;
	},

	setCount: function(count) {
		this.tool[/^mouse(down|up)$/.test(this.type) ? 'downCount' : 'count']
			= count;
	},

	/**
	 * The item at the position of the mouse (if any).
	 * 
	 * If the item is contained within one or more {@link Group} or
	 * {@link CompoundPath} items, the most top level group or compound path
	 * that it is contained within is returned.
	 *
	 * @type Item
	 * @bean
	 */
	getItem: function() {
		if (!this._item) {
			var result = this.tool._scope.project.hitTest(this.getPoint());
			if (result) {
				var item = result.item,
					// Find group parent
					parent = item._parent;
				while ((parent instanceof Group && !(parent instanceof Layer))
						|| parent instanceof CompoundPath) {
					item = parent;
					parent = parent._parent;
				}
				this._item = item;
			}
		}
		return this._item;
	},
	
	setItem: function(item) {
		this._item = item;
	},

	/**
	 * @return {String} A string representation of the tool event.
	 */
	toString: function() {
		return '{ type: ' + this.type
				+ ', point: ' + this.getPoint()
				+ ', count: ' + this.getCount()
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Tool
 *
 * @class The Tool object refers to a script that the user can interact with
 * by using the mouse and keyboard and can be accessed through the global
 * {@code tool} variable. All its properties are also available in the paper
 * scope.
 *
 * The global {@code tool} variable only exists in scripts that contain mouse
 * handler functions ({@link #onMouseMove}, {@link #onMouseDown},
 * {@link #onMouseDrag}, {@link #onMouseUp}) or a keyboard handler
 * function ({@link #onKeyDown}, {@link #onKeyUp}).
 *
 * @classexample
 * var path;
 *
 * // Only execute onMouseDrag when the mouse
 * // has moved at least 10 points:
 * tool.distanceThreshold = 10;
 *
 * function onMouseDown(event) {
 * 	// Create a new path every time the mouse is clicked
 * 	path = new Path();
 * 	path.add(event.point);
 * 	path.strokeColor = 'black';
 * }
 *
 * function onMouseDrag(event) {
 * 	// Add a point to the path every time the mouse is dragged
 * 	path.add(event.point);
 * }
 */
var Tool = this.Tool = PaperScopeItem.extend(Callback, /** @lends Tool# */{
	_list: 'tools',
	_reference: '_tool', // PaperScope has accessor for #tool
	_events: [ 'onEditOptions', 'onSelect', 'onDeselect', 'onReselect',
			'onMouseDown', 'onMouseUp', 'onMouseDrag', 'onMouseMove',
			'onKeyDown', 'onKeyUp' ],

	// DOCS: rewrite Tool constructor explanation
	initialize: function() {
		this.base();
		this._firstMove = true;
		this._count = 0;
		this._downCount = 0;
	},

	/**
	 * Activates this tool, meaning {@link PaperScope#tool} will
	 * point to it and it will be the one that recieves mouse events.
	 *
	 * @name Tool#activate
	 * @function
	 */

	/**
	 * Removes this tool from the {@link PaperScope#tools} list.
	 *
	 * @name Tool#remove
	 * @function
	 */

	/**
	 * The minimum distance the mouse has to drag before firing the onMouseDrag
	 * event, since the last onMouseDrag event.
	 *
	 * @type Number
	 * @bean
	 */
	getMinDistance: function() {
		return this._minDistance;
	},

	setMinDistance: function(minDistance) {
		this._minDistance = minDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._minDistance > this._maxDistance) {
			this._maxDistance = this._minDistance;
		}
	},

	/**
	 * The maximum distance the mouse has to drag before firing the onMouseDrag
	 * event, since the last onMouseDrag event.
	 *
	 * @type Number
	 * @bean
	 */
	getMaxDistance: function() {
		return this._maxDistance;
	},

	setMaxDistance: function(maxDistance) {
		this._maxDistance = maxDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._maxDistance < this._minDistance) {
			this._minDistance = maxDistance;
		}
	},

	// DOCS: document Tool#fixedDistance
	/**
	 * @type Number
	 * @bean
	 */
	getFixedDistance: function() {
		return this._minDistance == this._maxDistance
			? this._minDistance : null;
	},

	setFixedDistance: function(distance) {
		this._minDistance = distance;
		this._maxDistance = distance;
	},

	/**
	 * {@grouptitle Mouse Event Handlers}
	 *
	 * The function to be called when the mouse button is pushed down. The
	 * function receives a {@link ToolEvent} object which contains information
	 * about the mouse event.
	 *
	 * @name Tool#onMouseDown
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Creating circle shaped paths where the user presses the mouse button:
	 * function onMouseDown(event) {
	 * 	// Create a new circle shaped path with a radius of 10
	 * 	// at the position of the mouse (event.point):
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 * }
	 */

	/**
	 * The function to be called when the mouse position changes while the mouse
	 * is being dragged. The function receives a {@link ToolEvent} object which
	 * contains information about the mouse event.
	 *
	 * @name Tool#onMouseDrag
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Draw a line by adding a segment to a path on every mouse drag event:
	 *
	 * // Create an empty path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * function onMouseDrag(event) {
	 * 	// Add a segment to the path at the position of the mouse:
	 * 	path.add(event.point);
	 * }
	 */

	/**
	 * The function to be called the mouse moves within the project view. The
	 * function receives a {@link ToolEvent} object which contains information
	 * about the mouse event.
	 *
	 * @name Tool#onMouseMove
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Moving a path to the position of the mouse:
	 *
	 * // Create a circle shaped path with a radius of 10 at {x: 0, y: 0}:
	 * var path = new Path.Circle([0, 0], 10);
	 * path.fillColor = 'black';
	 *
	 * function onMouseMove(event) {
	 * 	// Whenever the user moves the mouse, move the path
	 * 	// to that position:
	 * 	path.position = event.point;
	 * }
	 */

	/**
	 * The function to be called when the mouse button is released. The function
	 * receives a {@link ToolEvent} object which contains information about the
	 * mouse event.
	 *
	 * @name Tool#onMouseUp
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Creating circle shaped paths where the user releases the mouse:
	 * function onMouseUp(event) {
	 * 	// Create a new circle shaped path with a radius of 10
	 * 	// at the position of the mouse (event.point):
	 * 	var path = new Path.Circle(event.point, 10);
	 * 	path.fillColor = 'black';
	 * }
	 */

	/**
	 * {@grouptitle Keyboard Event Handlers}
	 *
	 * The function to be called when the user presses a key on the keyboard.
	 * The function receives a {@link KeyEvent} object which contains
	 * information about the keyboard event.
	 * If the function returns {@code false}, the keyboard event will be
	 * prevented from bubbling up. This can be used for example to stop the
	 * window from scrolling, when you need the user to interact with arrow
	 * keys.
	 *
	 * @name Tool#onKeyDown
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Scaling a path whenever the user presses the space bar:
	 *
	 * // Create a circle shaped path:
	 * var path = new Path.Circle(new Point(50, 50), 30);
	 * path.fillColor = 'red';
	 *
	 * function onKeyDown(event) {
	 * 	if (event.key == 'space') {
	 * 		// Scale the path by 110%:
	 * 		path.scale(1.1);
	 *
	 * 		// Prevent the key event from bubbling
	 * 		return false;
	 * 	}
	 * }
	 */

	/**
	 * The function to be called when the user releases a key on the keyboard.
	 * The function receives a {@link KeyEvent} object which contains
	 * information about the keyboard event.
	 * If the function returns {@code false}, the keyboard event will be
	 * prevented from bubbling up. This can be used for example to stop the
	 * window from scrolling, when you need the user to interact with arrow
	 * keys.
	 *
	 * @name Tool#onKeyUp
	 * @property
	 * @type Function
	 *
	 * @example
	 * function onKeyUp(event) {
	 * 	if (event.key == 'space') {
	 * 		console.log('The spacebar was released!');
	 * 	}
	 * }
	 */

	_updateEvent: function(type, pt, minDistance, maxDistance, start,
			needsChange, matchMaxDistance) {
		if (!start) {
			if (minDistance != null || maxDistance != null) {
				var minDist = minDistance != null ? minDistance : 0;
				var vector = pt.subtract(this._point);
				var distance = vector.getLength();
				if (distance < minDist)
					return false;
				// Produce a new point on the way to pt if pt is further away
				// than maxDistance
				var maxDist = maxDistance != null ? maxDistance : 0;
				if (maxDist != 0) {
					if (distance > maxDist) {
						pt = this._point.add(vector.normalize(maxDist));
					} else if (matchMaxDistance) {
						return false;
					}
				}
			}
			if (needsChange && pt.equals(this._point))
				return false;
		}
		// Make sure mousemove events have lastPoint set even for the first move
		// so event.delta is always defined for them.
		// TODO: Decide wether mousedown also should always have delta set.
		this._lastPoint = start && type == 'mousemove' ? pt : this._point;
		this._point = pt;
		switch (type) {
		case 'mousedown':
			this._lastPoint = this._downPoint;
			this._downPoint = this._point;
			this._downCount++;
			break;
		case 'mouseup':
			// Mouse up events return the down point for last point, so delta is
			// spanning over the whole drag.
			this._lastPoint = this._downPoint;
			break;
		}
		this._count = start ? 0 : this._count + 1;
		return true;
	},

	_onHandleEvent: function(type, pt, event) {
		// Update global reference to this scope.
		paper = this._scope;
		// Handle removeOn* calls first
		var sets = Tool._removeSets;
		if (sets) {
			// Always clear the drag set on mouseup
			if (type === 'mouseup')
				sets.mousedrag = null;
			var set = sets[type];
			if (set) {
				for (var id in set) {
					var item = set[id];
					for (var key in sets) {
						var other = sets[key];
						if (other && other != set && other[item._id])
							delete other[item._id];
					}
					item.remove();
				}
				sets[type] = null;
			}
		}
		// Now handle event callbacks
		var called = false;
		switch (type) {
		case 'mousedown':
			this._updateEvent(type, pt, null, null, true, false, false);
			if (this.responds(type))
				called = this.fire(type, new ToolEvent(this, type, event));
			break;
		case 'mousedrag':
			// In order for idleInterval drag events to work, we need to not
			// check the first call for a change of position. Subsequent calls
			// required by min/maxDistance functionality will require it,
			// otherwise this might loop endlessly.
			var needsChange = false,
			// If the mouse is moving faster than maxDistance, do not produce
			// events for what is left after the first event is generated in
			// case it is shorter than maxDistance, as this would produce weird
			// results. matchMaxDistance controls this.
				matchMaxDistance = false;
			while (this._updateEvent(type, pt, this.minDistance,
					this.maxDistance, false, needsChange, matchMaxDistance)) {
				if (this.responds(type))
					called = this.fire(type, new ToolEvent(this, type, event));
				needsChange = true;
				matchMaxDistance = true;
			}
			break;
		case 'mouseup':
			// If the last mouse drag happened in a different place, call mouse
			// drag first, then mouse up.
			if ((this._point.x != pt.x || this._point.y != pt.y)
					&& this._updateEvent('mousedrag', pt, this.minDistance,
							this.maxDistance, false, false, false)) {
				if (this.responds('mousedrag'))
					called = this.fire('mousedrag',
							new ToolEvent(this, type, event));
			}
			this._updateEvent(type, pt, null, this.maxDistance, false,
					false, false);
			if (this.responds(type))
				called = this.fire(type, new ToolEvent(this, type, event));
			// Start with new values for 'mousemove'
			this._updateEvent(type, pt, null, null, true, false, false);
			this._firstMove = true;
			break;
		case 'mousemove':
			while (this._updateEvent(type, pt, this.minDistance,
					this.maxDistance, this._firstMove, true, false)) {
				if (this.responds(type))
					called = this.fire(type, new ToolEvent(this, type, event));
				this._firstMove = false;
			}
			break;
		}
		// Return if a callback was called or not.
		return called;
	}
	/**
	 * {@grouptitle Event Handling}
	 * 
	 * Attach an event handler to the tool.
	 *
	 * @name Tool#attach
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 */
	/**
	 * Attach one or more event handlers to the tool.
	 *
	 * @name Tool#attach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, mousemove,
	 * keydown, keyup}.
	 */

	/**
	 * Detach an event handler from the tool.
	 *
	 * @name Tool#detach
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @param {Function} function The function to be detached
	 */
	/**
	 * Detach one or more event handlers from the tool.
	 *
	 * @name Tool#detach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, mousemove,
	 * keydown, keyup}
	 */

	/**
	 * Fire an event on the tool.
	 *
	 * @name Tool#fire
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @param {Object} event An object literal containing properties describing
	 * the event.
	 */

	/**
	 * Check if the tool has one or more event handlers of the specified type.
	 *
	 * @name Tool#responds
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @return {Boolean} {@true if the tool has one or more event handlers of
	 * the specified type}
	 */
});


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// TODO: It might be better to make a ContextProvider class, since you
// can always find the canvas through context.canvas. This saves code and
// speed by not having to do canvas.getContext('2d')
// TODO: Run through the canvas array to find a canvas with the requested
// width / height, so we don't need to resize it?
var CanvasProvider = {
	canvases: [],
	getCanvas: function(size) {
		if (this.canvases.length) {
			var canvas = this.canvases.pop();
			// If they are not the same size, we don't need to clear them
			// using clearRect and visa versa.
			if ((canvas.width != size.width)
					|| (canvas.height != size.height)) {
				canvas.width = size.width;
				canvas.height = size.height;
			} else {
				// +1 is needed on some browsers to really clear the borders
				canvas.getContext('2d').clearRect(0, 0,
						size.width + 1, size.height + 1);
			}
			return canvas;
		} else {
			var canvas = document.createElement('canvas');
			canvas.width = size.width;
			canvas.height = size.height;
			return canvas;
		}
	},

	returnCanvas: function(canvas) {
		this.canvases.push(canvas);
	}
};

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var Numerical = new function() {

	// Lookup tables for abscissas and weights with values for n = 2 .. 16.
	// As values are symetric, only store half of them and addapt algorithm
	// to factor in symetry.
	var abscissas = [
		[  0.5773502691896257645091488],
		[0,0.7745966692414833770358531],
		[  0.3399810435848562648026658,0.8611363115940525752239465],
		[0,0.5384693101056830910363144,0.9061798459386639927976269],
		[  0.2386191860831969086305017,0.6612093864662645136613996,0.9324695142031520278123016],
		[0,0.4058451513773971669066064,0.7415311855993944398638648,0.9491079123427585245261897],
		[  0.1834346424956498049394761,0.5255324099163289858177390,0.7966664774136267395915539,0.9602898564975362316835609],
		[0,0.3242534234038089290385380,0.6133714327005903973087020,0.8360311073266357942994298,0.9681602395076260898355762],
		[  0.1488743389816312108848260,0.4333953941292471907992659,0.6794095682990244062343274,0.8650633666889845107320967,0.9739065285171717200779640],
		[0,0.2695431559523449723315320,0.5190961292068118159257257,0.7301520055740493240934163,0.8870625997680952990751578,0.9782286581460569928039380],
		[  0.1252334085114689154724414,0.3678314989981801937526915,0.5873179542866174472967024,0.7699026741943046870368938,0.9041172563704748566784659,0.9815606342467192506905491],
		[0,0.2304583159551347940655281,0.4484927510364468528779129,0.6423493394403402206439846,0.8015780907333099127942065,0.9175983992229779652065478,0.9841830547185881494728294],
		[  0.1080549487073436620662447,0.3191123689278897604356718,0.5152486363581540919652907,0.6872929048116854701480198,0.8272013150697649931897947,0.9284348836635735173363911,0.9862838086968123388415973],
		[0,0.2011940939974345223006283,0.3941513470775633698972074,0.5709721726085388475372267,0.7244177313601700474161861,0.8482065834104272162006483,0.9372733924007059043077589,0.9879925180204854284895657],
		[  0.0950125098376374401853193,0.2816035507792589132304605,0.4580167776572273863424194,0.6178762444026437484466718,0.7554044083550030338951012,0.8656312023878317438804679,0.9445750230732325760779884,0.9894009349916499325961542]
	];

	var weights = [
		[1],
		[0.8888888888888888888888889,0.5555555555555555555555556],
		[0.6521451548625461426269361,0.3478548451374538573730639],
		[0.5688888888888888888888889,0.4786286704993664680412915,0.2369268850561890875142640],
		[0.4679139345726910473898703,0.3607615730481386075698335,0.1713244923791703450402961],
		[0.4179591836734693877551020,0.3818300505051189449503698,0.2797053914892766679014678,0.1294849661688696932706114],
		[0.3626837833783619829651504,0.3137066458778872873379622,0.2223810344533744705443560,0.1012285362903762591525314],
		[0.3302393550012597631645251,0.3123470770400028400686304,0.2606106964029354623187429,0.1806481606948574040584720,0.0812743883615744119718922],
		[0.2955242247147528701738930,0.2692667193099963550912269,0.2190863625159820439955349,0.1494513491505805931457763,0.0666713443086881375935688],
		[0.2729250867779006307144835,0.2628045445102466621806889,0.2331937645919904799185237,0.1862902109277342514260976,0.1255803694649046246346943,0.0556685671161736664827537],
		[0.2491470458134027850005624,0.2334925365383548087608499,0.2031674267230659217490645,0.1600783285433462263346525,0.1069393259953184309602547,0.0471753363865118271946160],
		[0.2325515532308739101945895,0.2262831802628972384120902,0.2078160475368885023125232,0.1781459807619457382800467,0.1388735102197872384636018,0.0921214998377284479144218,0.0404840047653158795200216],
		[0.2152638534631577901958764,0.2051984637212956039659241,0.1855383974779378137417166,0.1572031671581935345696019,0.1215185706879031846894148,0.0801580871597602098056333,0.0351194603317518630318329],
		[0.2025782419255612728806202,0.1984314853271115764561183,0.1861610000155622110268006,0.1662692058169939335532009,0.1395706779261543144478048,0.1071592204671719350118695,0.0703660474881081247092674,0.0307532419961172683546284],
		[0.1894506104550684962853967,0.1826034150449235888667637,0.1691565193950025381893121,0.1495959888165767320815017,0.1246289712555338720524763,0.0951585116824927848099251,0.0622535239386478928628438,0.0271524594117540948517806]
	];

	// Math short-cuts for often used methods and values
	var abs = Math.abs,
		sqrt = Math.sqrt,
		cos = Math.cos,
		PI = Math.PI;

	return {
		TOLERANCE: 10e-6,
		// Precision when comparing against 0
		// TODO: Find a good value
		EPSILON: 10e-12,

		/**
		 * Gauss-Legendre Numerical Integration
		 */
		integrate: function(f, a, b, n) {
			var x = abscissas[n - 2],
				w = weights[n - 2],
				A = 0.5 * (b - a),
				B = A + a,
				i = 0,
				m = (n + 1) >> 1,
				sum = n & 1 ? w[i++] * f(B) : 0; // Handle odd n
			while (i < m) {
				var Ax = A * x[i];
				sum += w[i++] * (f(B + Ax) + f(B - Ax));
			}
			return A * sum;
		},

		/**
		 * Root finding using Newton-Raphson Method combined with Bisection.
		 */
		findRoot: function(f, df, x, a, b, n, tolerance) {
			for (var i = 0; i < n; i++) {
				var fx = f(x),
					dx = fx / df(x);
				// See if we can trust the Newton-Raphson result. If not we use
				// bisection to find another candiate for Newton's method.
				if (abs(dx) < tolerance)
					return x;
				// Generate a candidate for Newton's method.
				var nx = x - dx;
				// Update the root-bounding interval and test for containment of
				// the candidate. If candidate is outside the root-bounding
				// interval, use bisection instead.
				// There is no need to compare to lower / upper because the
				// tangent line has positive slope, guaranteeing that the x-axis
				// intercept is larger than lower / smaller than upper.
				if (fx > 0) {
					b = x;
					x = nx <= a ? 0.5 * (a + b) : nx;
				} else {
					a = x;
					x = nx >= b ? 0.5 * (a + b) : nx;
				}
			}
		},

		/**
		 * Solves the quadratic polynomial with coefficients a, b, c for roots
		 * (zero crossings) and and returns the solutions in an array.
		 *
		 * a*x^2 + b*x + c = 0
		 */
		solveQuadratic: function(a, b, c, roots, tolerance) {
			// After Numerical Recipes in C, 2nd edition, Press et al.,
			// 5.6, Quadratic and Cubic Equations
			// If problem is actually linear, return 0 or 1 easy roots
			if (abs(a) < tolerance) {
				if (abs(b) >= tolerance) {
					roots[0] = -c / b;
					return 1;
				}
				// If all the coefficients are 0, infinite values are
				// possible!
				if (abs(c) < tolerance)
					return -1; // Infinite solutions
				return 0; // 0 solutions
			}
			var q = b * b - 4 * a * c;
			if (q < 0)
				return 0; // 0 solutions
			q = sqrt(q);
			if (b < 0)
				q = -q;
			q = (b + q) * -0.5;
			var n = 0;
			if (abs(q) >= tolerance)
				roots[n++] = c / q;
			if (abs(a) >= tolerance)
				roots[n++] = q / a;
			return n; // 0, 1 or 2 solutions
		},

		/**
		 * Solves the cubic polynomial with coefficients a, b, c, d for roots
		 * (zero crossings) and and returns the solutions in an array.
		 *
		 * a*x^3 + b*x^2 + c*x + d = 0
		 */
		solveCubic: function(a, b, c, d, roots, tolerance) {
			// After Numerical Recipes in C, 2nd edition, Press et al.,
			// 5.6, Quadratic and Cubic Equations
			if (abs(a) < tolerance)
				return Numerical.solveQuadratic(b, c, d, roots, tolerance);
			// Normalize
			b /= a;
			c /= a;
			d /= a;
			// Compute discriminants
			var Q = (b * b - 3 * c) / 9,
				R = (2 * b * b * b - 9 * b * c + 27 * d) / 54,
				Q3 = Q * Q * Q,
				R2 = R * R;
			b /= 3; // Divide by 3 as that's required below
			if (R2 < Q3) { // Three real roots
				// This sqrt and division is safe, since R2 >= 0, so Q3 > R2,
				// so Q3 > 0.  The acos is also safe, since R2/Q3 < 1, and
				// thus R/sqrt(Q3) < 1.
				var theta = Math.acos(R / sqrt(Q3)),
					// This sqrt is safe, since Q3 >= 0, and thus Q >= 0
					q = -2 * sqrt(Q);
				roots[0] = q * cos(theta / 3) - b;
				roots[1] = q * cos((theta + 2 * PI) / 3) - b;
				roots[2] = q * cos((theta - 2 * PI) / 3) - b;
				return 3;
			} else { // One real root
				var A = -Math.pow(abs(R) + sqrt(R2 - Q3), 1 / 3);
				if (R < 0) A = -A;
				var B = (abs(A) < tolerance) ? 0 : Q / A;
				roots[0] = (A + B) - b;
				return 1;
			}
			return 0;
		}
	};
};

/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var BlendMode = {
	process: function(blendMode, srcContext, dstContext, alpha, offset) {
		var srcCanvas = srcContext.canvas,
			dstData = dstContext.getImageData(offset.x, offset.y,
					srcCanvas.width, srcCanvas.height),
			dst  = dstData.data,
			src  = srcContext.getImageData(0, 0,
					srcCanvas.width, srcCanvas.height).data,
			min = Math.min,
			max = Math.max,
			abs = Math.abs,
			sr, sg, sb, sa, // source
			br, bg, bb, ba, // backdrop
			dr, dg, db;     // destination

		// Conversion methods for HSL modes, as described by
		// http://www.aiim.org/documents/standards/pdf/blend_modes.pdf
		// The setters modify the variables dr, dg, db directly.

		function getLum(r, g, b) {
			return 0.2989 * r + 0.587 * g + 0.114 * b;
		}

		function setLum(r, g, b, l) {
			var d = l - getLum(r, g, b);
			dr = r + d;
			dg = g + d;
			db = b + d;
			var l = getLum(dr, dg, db),
				mn = min(dr, dg, db),
				mx = max(dr, dg, db);
			if (mn < 0) {
				var lmn = l - mn;
				dr = l + (dr - l) * l / lmn;
				dg = l + (dg - l) * l / lmn;
				db = l + (db - l) * l / lmn;
			}
			if (mx > 255) {
				var ln = 255 - l, mxl = mx - l;
				dr = l + (dr - l) * ln / mxl;
				dg = l + (dg - l) * ln / mxl;
				db = l + (db - l) * ln / mxl;
			}
		}

		function getSat(r, g, b) {
			return max(r, g, b) - min(r, g, b);
		}

		function setSat(r, g, b, s) {
			var col = [r, g, b],
				mx = max(r, g, b), // max
				mn = min(r, g, b), // min
				md; // mid
			// Determine indices for min and max in col:
			mn = mn == r ? 0 : mn == g ? 1 : 2;
			mx = mx == r ? 0 : mx == g ? 1 : 2;
			// Determine the index in col that is not used yet by min and max,
			// and assign it to mid:
			md = min(mn, mx) == 0 ? max(mn, mx) == 1 ? 2 : 1 : 0;
			// Now perform the actual algorithm
			if (col[mx] > col[mn]) {
				col[md] = (col[md] - col[mn]) * s / (col[mx] - col[mn]);
				col[mx] = s;
			} else {
				col[md] = col[mx] = 0;
			}
			col[mn] = 0;
			// Finally write out the values
			dr = col[0];
			dg = col[1];
			db = col[2];
		}

		var modes = {
			multiply: function() {
				dr = br * sr / 255;
				dg = bg * sg / 255;
				db = bb * sb / 255;
			},

			screen: function() {
				dr = 255 - (255 - br) * (255 - sr) / 255;
				dg = 255 - (255 - bg) * (255 - sg) / 255;
				db = 255 - (255 - bb) * (255 - sb) / 255;
			},

			overlay: function() {
				dr = br < 128 ? 2 * br * sr / 255 : 255 - 2 * (255 - br) * (255 - sr) / 255;
				dg = bg < 128 ? 2 * bg * sg / 255 : 255 - 2 * (255 - bg) * (255 - sg) / 255;
				db = bb < 128 ? 2 * bb * sb / 255 : 255 - 2 * (255 - bb) * (255 - sb) / 255;
			},

			'soft-light': function() {
				var t = sr * br / 255;
				dr = t + br * (255 - (255 - br) * (255 - sr) / 255 - t) / 255;
				t = sg * bg / 255;
				dg = t + bg * (255 - (255 - bg) * (255 - sg) / 255 - t) / 255;
				t = sb * bb / 255;
				db = t + bb * (255 - (255 - bb) * (255 - sb) / 255 - t) / 255;
			},

			'hard-light': function() {
				// = Reverse of overlay
				dr = sr < 128 ? 2 * sr * br / 255 : 255 - 2 * (255 - sr) * (255 - br) / 255;
				dg = sg < 128 ? 2 * sg * bg / 255 : 255 - 2 * (255 - sg) * (255 - bg) / 255;
				db = sb < 128 ? 2 * sb * bb / 255 : 255 - 2 * (255 - sb) * (255 - bb) / 255;
			},

			'color-dodge': function() {
				dr = sr == 255 ? sr : min(255, br * 255 / (255 - sr));
				dg = sg == 255 ? sg : min(255, bg * 255 / (255 - sg));
				db = sb == 255 ? sb : min(255, bb * 255 / (255 - sb));
			},

			'color-burn': function() {
				dr = sr == 0 ? 0 : max(255 - ((255 - br) * 255) / sr, 0);
				dg = sg == 0 ? 0 : max(255 - ((255 - bg) * 255) / sg, 0);
				db = sb == 0 ? 0 : max(255 - ((255 - bb) * 255) / sb, 0);
			},

			darken: function() {
				dr = br < sr ? br : sr;
				dg = bg < sg ? bg : sg;
				db = bb < sb ? bb : sb;
			},

			lighten: function() {
				dr = br > sr ? br : sr;
				dg = bg > sg ? bg : sg;
				db = bb > sb ? bb : sb;
			},

			difference: function() {
				dr = br - sr;
				if (dr < 0)
					dr = -dr;
				dg = bg - sg;
				if (dg < 0)
					dg = -dg;
				db = bb - sb;
				if (db < 0)
					db = -db;
			},

			exclusion: function() {
				dr = br + sr * (255 - br - br) / 255;
				dg = bg + sg * (255 - bg - bg) / 255;
				db = bb + sb * (255 - bb - bb) / 255;
			},

			// HSL Modes:
			hue: function() {
				setSat(sr, sg, sb, getSat(br, bg, bb));
				setLum(dr, dg, db, getLum(br, bg, bb));
			},

			saturation: function() {
				setSat(br, bg, bb, getSat(sr, sg, sb));
				setLum(dr, dg, db, getLum(br, bg, bb));
			},

			luminosity: function() {
				setLum(br, bg, bb, getLum(sr, sg, sb));
			},

			color: function() {
				setLum(sr, sg, sb, getLum(br, bg, bb));
			},

			// TODO: Not in Illustrator:
			add: function() {
				dr = min(br + sr, 255);
				dg = min(bg + sg, 255);
				db = min(bb + sb, 255);
			},

			subtract: function() {
				dr = max(br - sr, 0);
				dg = max(bg - sg, 0);
				db = max(bb - sb, 0);
			},

			average: function() {
				dr = (br + sr) / 2;
				dg = (bg + sg) / 2;
				db = (bb + sb) / 2;
			},

			negation: function() {
				dr = 255 - abs(255 - sr - br);
				dg = 255 - abs(255 - sg - bg);
				db = 255 - abs(255 - sb - bb);
			}
		};

		var process = modes[blendMode];
		if (!process)
			return;

		for (var i = 0, l = dst.length; i < l; i += 4) {
			sr = src[i];
			br = dst[i];
			sg = src[i + 1];
			bg = dst[i + 1];
			sb = src[i + 2];
			bb = dst[i + 2];
			sa = src[i + 3];
			ba = dst[i + 3];
			process();
			var a1 = sa * alpha / 255,
				a2 = 1 - a1;
			dst[i] = a1 * dr + a2 * br;
			dst[i + 1] = a1 * dg + a2 * bg;
			dst[i + 2] = a1 * db + a2 * bb;
			dst[i + 3] = sa * alpha + a2 * ba;
		}
		dstContext.putImageData(dstData, offset.x, offset.y);
	}
};


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PaperScript
 * @namespace
 */
var PaperScript = this.PaperScript = new function() {
/**
 * A JavaScript tokenizer / parser / generator, originally written in Lisp.
 * Copyright (c) Marijn Haverbeke <marijnh@gmail.com>
 * http://marijn.haverbeke.nl/parse-js/
 *
 * Ported by to JavaScript by Mihai Bazon
 * Copyright (c) 2010, Mihai Bazon <mihai.bazon@gmail.com>
 * http://mihai.bazon.net/blog/
 *
 * Modifications and adaptions to browser (c) 2011, Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the BSD license.
 */var parse_js=new function(){function W(a,b,c){var d=[];for(var e=0;e<a.length;++e)d.push(b.call(c,a[e],e));return d}function V(c){return/^[a-z_$][a-z0-9_$]*$/i.test(c)&&c!="this"&&!M(d,c)&&!M(b,c)&&!M(a,c)}function U(a,b){var c={};a===!0&&(a={});for(var d in b)M(b,d)&&(c[d]=a&&M(a,d)?a[d]:b[d]);return c}function T(a,b){return b<1?"":Array(b+1).join(a)}function S(a,b){function z(a){var b=a[0],c=r[b];if(!c)throw new Error("Can't find generator for \""+b+'"');y.push(a);var d=c.apply(b,a.slice(1));y.pop();return d}function x(a){var b=a[0],c=a[1];c!=null&&(b=k([g(b),"=",m(c,"seq")]));return b}function w(a){return a?a.length==0?"{}":"{"+e+j(function(){return u(a).join(e)})+e+h("}"):";"}function v(a){var b=a.length;return b==0?"{}":"{"+e+W(a,function(a,d){var f=a[1].length>0,g=j(function(){return h(a[0]?k(["case",z(a[0])+":"]):"default:")},.5)+(f?e+j(function(){return u(a[1]).join(e)}):"");!c&&f&&d<b-1&&(g+=";");return g}).join(e)+e+h("}")}function u(a,b){for(var d=[],e=a.length-1,f=0;f<=e;++f){var g=a[f],i=z(g);i!=";"&&(!c&&f==e&&(g[0]=="while"&&O(g[2])||L(g[0],["for","for-in"])&&O(g[4])||g[0]=="if"&&O(g[2])&&!g[3]||g[0]=="if"&&g[3]&&O(g[3])?i=i.replace(/;*\s*$/,";"):i=i.replace(/;+\s*$/,"")),d.push(i))}return b?d:W(d,h)}function t(a,b,c,d){var e=d||"function";a&&(e+=" "+g(a)),e+="("+l(W(b,g))+")";return k([e,w(c)])}function s(a){if(a[0]=="do")return z(["block",[a]]);var b=a;for(;;){var c=b[0];if(c=="if"){if(!b[3])return z(["block",[a]]);b=b[3]}else if(c=="while"||c=="do")b=b[2];else if(c=="for"||c=="for-in")b=b[4];else break}return z(a)}function q(a){var b=a.toString(10),c=[b.replace(/^0\./,".")],d;Math.floor(a)===a?(c.push("0x"+a.toString(16).toLowerCase(),"0"+a.toString(8)),(d=/^(.*?)(0+)$/.exec(a))&&c.push(d[1]+"e"+d[2].length)):(d=/^0?\.(0+)(.*)$/.exec(a))&&c.push(d[2]+"e-"+(d[1].length+d[2].length),b.substr(b.indexOf(".")));return n(c)}function o(a){if(a[0]=="function"||a[0]=="object"){var b=J(y),c=b.pop(),d=b.pop();while(d){if(d[0]=="stat")return!0;if((d[0]=="seq"||d[0]=="call"||d[0]=="dot"||d[0]=="sub"||d[0]=="conditional")&&d[1]===c||(d[0]=="binary"||d[0]=="assign"||d[0]=="unary-postfix")&&d[2]===c)c=d,d=b.pop();else return!1}}return!M(P,a[0])}function n(a){if(a.length==1)return a[0];if(a.length==2){var b=a[1];a=a[0];return a.length<=b.length?a:b}return n([a[0],n(a.slice(1))])}function m(a){var b=z(a);for(var c=1;c<arguments.length;++c){var d=arguments[c];if(d instanceof Function&&d(a)||a[0]==d)return"("+b+")"}return b}function l(a){return a.join(","+f)}function k(a){if(c)return a.join(" ");var b=[];for(var d=0;d<a.length;++d){var e=a[d+1];b.push(a[d]),e&&(/[a-z0-9_\x24]$/i.test(a[d].toString())&&/^[a-z0-9_\x24]/i.test(e.toString())||/[\+\-]$/.test(a[d].toString())&&/^[\+\-]/.test(e.toString()))&&b.push(" ")}return b.join("")}function j(a,b){b==null&&(b=1),d+=b;try{return a.apply(null,J(arguments,1))}finally{d-=b}}function h(a){a==null&&(a=""),c&&(a=T(" ",b.indent_start+d*b.indent_level)+a);return a}function g(a){return a.toString()}b=U(b,{indent_start:0,indent_level:4,quote_keys:!1,space_colon:!1,beautify:!1});var c=!!b.beautify,d=0,e=c?"\n":"",f=c?" ":"",r={string:Q,num:q,name:g,toplevel:function(a){return u(a).join(e)},splice:function(a){var b=y[y.length-2][0];return M(R,b)?w.apply(this,arguments):W(u(a,!0),function(a,b){return b>0?h(a):a}).join(e)},block:w,"var":function(a){return"var "+l(W(a,x))+";"},"const":function(a){return"const "+l(W(a,x))+";"},"try":function(a,b,c){var d=["try",w(a)];b&&d.push("catch","("+b[0]+")",w(b[1])),c&&d.push("finally",w(c));return k(d)},"throw":function(a){return k(["throw",z(a)])+";"},"new":function(a,b){b=b.length>0?"("+l(W(b,z))+")":"";return k(["new",m(a,"seq","binary","conditional","assign",function(a){var b=N(),c={};try{b.with_walkers({call:function(){throw c},"function":function(){return this}},function(){b.walk(a)})}catch(d){if(d===c)return!0;throw d}})+b])},"switch":function(a,b){return k(["switch","("+z(a)+")",v(b)])},"break":function(a){var b="break";a!=null&&(b+=" "+g(a));return b+";"},"continue":function(a){var b="continue";a!=null&&(b+=" "+g(a));return b+";"},conditional:function(a,b,c){return k([m(a,"assign","seq","conditional"),"?",m(b,"seq"),":",m(c,"seq")])},assign:function(a,b,c){a&&a!==!0?a+="=":a="=";return k([z(b),a,m(c,"seq")])},dot:function(a){var b=z(a),c=1;a[0]=="num"?/\./.test(a[1])||(b+="."):o(a)&&(b="("+b+")");while(c<arguments.length)b+="."+g(arguments[c++]);return b},call:function(a,b){var c=z(a);o(a)&&(c="("+c+")");return c+"("+l(W(b,function(a){return m(a,"seq")}))+")"},"function":t,defun:t,"if":function(a,b,c){var d=["if","("+z(a)+")",c?s(b):z(b)];c&&d.push("else",z(c));return k(d)},"for":function(a,b,c,d){var e=["for"];a=(a!=null?z(a):"").replace(/;*\s*$/,";"+f),b=(b!=null?z(b):"").replace(/;*\s*$/,";"+f),c=(c!=null?z(c):"").replace(/;*\s*$/,"");var g=a+b+c;g=="; ; "&&(g=";;"),e.push("("+g+")",z(d));return k(e)},"for-in":function(a,b,c,d){return k(["for","("+(a?z(a).replace(/;+$/,""):z(b)),"in",z(c)+")",z(d)])},"while":function(a,b){return k(["while","("+z(a)+")",z(b)])},"do":function(a,b){return k(["do",z(b),"while","("+z(a)+")"])+";"},"return":function(a){var b=["return"];a!=null&&b.push(z(a));return k(b)+";"},binary:function(a,b,c){var d=z(b),e=z(c);if(L(b[0],["assign","conditional","seq"])||b[0]=="binary"&&B[a]>B[b[1]])d="("+d+")";if(L(c[0],["assign","conditional","seq"])||c[0]=="binary"&&B[a]>=B[c[1]]&&(c[1]!=a||!L(a,["&&","||","*"])))e="("+e+")";return k([d,a,e])},"unary-prefix":function(a,b){var c=z(b);b[0]=="num"||b[0]=="unary-prefix"&&!M(i,a+b[1])||!o(b)||(c="("+c+")");return a+(p(a.charAt(0))?" ":"")+c},"unary-postfix":function(a,b){var c=z(b);b[0]=="num"||b[0]=="unary-postfix"&&!M(i,a+b[1])||!o(b)||(c="("+c+")");return c+a},sub:function(a,b){var c=z(a);o(a)&&(c="("+c+")");return c+"["+z(b)+"]"},object:function(a){return a.length==0?"{}":"{"+e+j(function(){return W(a,function(a){if(a.length==3)return h(t(a[0],a[1][2],a[1][3],a[2]));var d=a[0],e=z(a[1]);b.quote_keys?d=Q(d):(typeof d=="number"||!c&&+d+""==d)&&parseFloat(d)>=0?d=q(+d):V(d)||(d=Q(d));return h(k(c&&b.space_colon?[d,":",e]:[d+":",e]))}).join(","+e)})+e+h("}")},regexp:function(a,b){return"/"+a+"/"+b},array:function(a){return a.length==0?"[]":k(["[",l(W(a,function(a){return!c&&a[0]=="atom"&&a[1]=="undefined"?"":m(a,"seq")})),"]"])},stat:function(a){return z(a).replace(/;*\s*$/,";")},seq:function(){return l(W(J(arguments),z))},label:function(a,b){return k([g(a),":",z(b)])},"with":function(a,b){return k(["with","("+z(a)+")",z(b)])},atom:function(a){return g(a)}},y=[];return z(a)}function Q(a){var b=0,c=0;a=a.replace(/[\\\b\f\n\r\t\x22\x27]/g,function(a){switch(a){case"\\":return"\\\\";case"\b":return"\\b";case"\f":return"\\f";case"\n":return"\\n";case"\r":return"\\r";case"\t":return"\\t";case'"':++b;return'"';case"'":++c;return"'"}return a});return b>c?"'"+a.replace(/\x27/g,"\\'")+"'":'"'+a.replace(/\x22/g,'\\"')+'"'}function O(a){return!a||a[0]=="block"&&(!a[1]||a[1].length==0)}function N(){function g(a,b){var c={},e;for(e in a)M(a,e)&&(c[e]=d[e],d[e]=a[e]);var f=b();for(e in c)M(c,e)&&(c[e]?d[e]=c[e]:delete d[e]);return f}function f(a){if(a==null)return null;try{e.push(a);var b=a[0],f=d[b];if(f){var g=f.apply(a,a.slice(1));if(g!=null)return g}f=c[b];return f.apply(a,a.slice(1))}finally{e.pop()}}function b(a){var b=[this[0]];a!=null&&b.push(W(a,f));return b}function a(a){return[this[0],W(a,function(a){var b=[a[0]];a.length>1&&(b[1]=f(a[1]));return b})]}var c={string:function(a){return[this[0],a]},num:function(a){return[this[0],a]},name:function(a){return[this[0],a]},toplevel:function(a){return[this[0],W(a,f)]},block:b,splice:b,"var":a,"const":a,"try":function(a,b,c){return[this[0],W(a,f),b!=null?[b[0],W(b[1],f)]:null,c!=null?W(c,f):null]},"throw":function(a){return[this[0],f(a)]},"new":function(a,b){return[this[0],f(a),W(b,f)]},"switch":function(a,b){return[this[0],f(a),W(b,function(a){return[a[0]?f(a[0]):null,W(a[1],f)]})]},"break":function(a){return[this[0],a]},"continue":function(a){return[this[0],a]},conditional:function(a,b,c){return[this[0],f(a),f(b),f(c)]},assign:function(a,b,c){return[this[0],a,f(b),f(c)]},dot:function(a){return[this[0],f(a)].concat(J(arguments,1))},call:function(a,b){return[this[0],f(a),W(b,f)]},"function":function(a,b,c){return[this[0],a,b.slice(),W(c,f)]},defun:function(a,b,c){return[this[0],a,b.slice(),W(c,f)]},"if":function(a,b,c){return[this[0],f(a),f(b),f(c)]},"for":function(a,b,c,d){return[this[0],f(a),f(b),f(c),f(d)]},"for-in":function(a,b,c,d){return[this[0],f(a),f(b),f(c),f(d)]},"while":function(a,b){return[this[0],f(a),f(b)]},"do":function(a,b){return[this[0],f(a),f(b)]},"return":function(a){return[this[0],f(a)]},binary:function(a,b,c){return[this[0],a,f(b),f(c)]},"unary-prefix":function(a,b){return[this[0],a,f(b)]},"unary-postfix":function(a,b){return[this[0],a,f(b)]},sub:function(a,b){return[this[0],f(a),f(b)]},object:function(a){return[this[0],W(a,function(a){return a.length==2?[a[0],f(a[1])]:[a[0],f(a[1]),a[2]]})]},regexp:function(a,b){return[this[0],a,b]},array:function(a){return[this[0],W(a,f)]},stat:function(a){return[this[0],f(a)]},seq:function(){return[this[0]].concat(W(J(arguments),f))},label:function(a,b){return[this[0],a,f(b)]},"with":function(a,b){return[this[0],f(a),f(b)]},atom:function(a){return[this[0],a]}},d={},e=[];return{walk:f,with_walkers:g,parent:function(){return e[e.length-2]},stack:function(){return e}}}function M(a,b){return Object.prototype.hasOwnProperty.call(a,b)}function L(a,b){for(var c=b.length;--c>=0;)if(b[c]===a)return!0;return!1}function K(a){return a.split("")}function J(a,b){return Array.prototype.slice.call(a,b||0)}function I(a){var b={};for(var c=0;c<a.length;++c)b[a[c]]=!0;return b}function H(a){a instanceof Function&&(a=a());for(var b=1,c=arguments.length;--c>0;++b)arguments[b]();return a}function G(a){var b=J(arguments,1);return function(){return a.apply(this,b.concat(J(arguments)))}}function F(a,b,c){function bk(a){try{++d.in_loop;return a()}finally{--d.in_loop}}function bi(a){var b=bg(a),c=d.token.value;if(e("operator")&&M(A,c)){if(bh(b)){g();return p("assign",A[c],b,bi(a))}i("Invalid assignment")}return b}function bh(a){if(!b)return!0;switch(a[0]){case"dot":case"sub":case"new":case"call":return!0;case"name":return a[1]!="this"}}function bg(a){var b=bf(a);if(e("operator","?")){g();var c=bj(!1);m(":");return p("conditional",b,c,bj(!1,a))}return b}function bf(a){return be(Y(!0),0,a)}function be(a,b,c){var f=e("operator")?d.token.value:null;f&&f=="in"&&c&&(f=null);var h=f!=null?B[f]:null;if(h!=null&&h>b){g();var i=be(Y(!0),h,c);return be(p("binary",f,a,i),b,c)}return a}function bd(a,b,c){(b=="++"||b=="--")&&!bh(c)&&i("Invalid use of "+b+" operator");return p(a,b,c)}function bc(a,b){if(e("punc",".")){g();return bc(p("dot",a,bb()),b)}if(e("punc","[")){g();return bc(p("sub",a,H(bj,G(m,"]"))),b)}if(b&&e("punc","(")){g();return bc(p("call",a,Z(")")),!0)}return b&&e("operator")&&M(z,d.token.value)?H(G(bd,"unary-postfix",d.token.value,a),g):a}function bb(){switch(d.token.type){case"name":case"operator":case"keyword":case"atom":return H(d.token.value,g);default:k()}}function ba(){switch(d.token.type){case"num":case"string":return H(d.token.value,g)}return bb()}function _(){var a=!0,c=[];while(!e("punc","}")){a?a=!1:m(",");if(!b&&e("punc","}"))break;var f=d.token.type,h=ba();f!="name"||h!="get"&&h!="set"||!!e("punc",":")?(m(":"),c.push([h,bj(!1)])):c.push([bb(),P(!1),h])}g();return p("object",c)}function $(){return p("array",Z("]",!b,!0))}function Z(a,b,c){var d=!0,f=[];while(!e("punc",a)){d?d=!1:m(",");if(b&&e("punc",a))break;e("punc",",")&&c?f.push(["atom","undefined"]):f.push(bj(!1))}g();return f}function X(){var a=Y(!1),b;e("punc","(")?(g(),b=Z(")")):b=[];return bc(p("new",a,b),!0)}function W(){return p("const",U())}function V(a){return p("var",U(a))}function U(a){var b=[];for(;;){e("name")||k();var c=d.token.value;g(),e("operator","=")?(g(),b.push([c,bj(!1,a)])):b.push([c]);if(!e("punc",","))break;g()}return b}function T(){var a=R(),b,c;if(e("keyword","catch")){g(),m("("),e("name")||i("Name expected");var f=d.token.value;g(),m(")"),b=[f,R()]}e("keyword","finally")&&(g(),c=R()),!b&&!c&&i("Missing catch/finally blocks");return p("try",a,b,c)}function R(){m("{");var a=[];while(!e("punc","}"))e("eof")&&k(),a.push(t());g();return a}function Q(){var a=q(),b=t(),c;e("keyword","else")&&(g(),c=t());return p("if",a,b,c)}function O(a){var b=a[0]=="var"?p("name",a[1][0]):a;g();var c=bj();m(")");return p("for-in",a,b,c,bk(t))}function N(a){m(";");var b=e("punc",";")?null:bj();m(";");var c=e("punc",")")?null:bj();m(")");return p("for",a,b,c,bk(t))}function K(){m("(");var a=null;if(!e("punc",";")){a=e("keyword","var")?(g(),V(!0)):bj(!0,!0);if(e("operator","in"))return O(a)}return N(a)}function I(a){var b;n()||(b=e("name")?d.token.value:null),b!=null?(g(),L(b,d.labels)||i("Label "+b+" without matching loop or statement")):d.in_loop==0&&i(a+" not inside a loop or switch"),o();return p(a,b)}function F(){return p("stat",H(bj,o))}function w(a){d.labels.push(a);var c=d.token,e=t();b&&!M(C,e[0])&&k(c),d.labels.pop();return p("label",a,e)}function s(a){return c?function(){var b=d.token,c=a.apply(this,arguments);c[0]=r(c[0],b,h());return c}:a}function r(a,b,c){return a instanceof E?a:new E(a,b,c)}function q(){m("(");var a=bj();m(")");return a}function p(){return J(arguments)}function o(){e("punc",";")?g():n()||k()}function n(){return!b&&(d.token.nlb||e("eof")||e("punc","}"))}function m(a){return l("punc",a)}function l(a,b){if(e(a,b))return g();j(d.token,"Unexpected token "+d.token.type+", expected "+a)}function k(a){a==null&&(a=d.token),j(a,"Unexpected token: "+a.type+" ("+a.value+")")}function j(a,b){i(b,a.line,a.col)}function i(a,b,c,e){var f=d.input.context();u(a,b!=null?b:f.tokline,c!=null?c:f.tokcol,e!=null?e:f.tokpos)}function h(){return d.prev}function g(){d.prev=d.token,d.peeked?(d.token=d.peeked,d.peeked=null):d.token=d.input();return d.token}function f(){return d.peeked||(d.peeked=d.input())}function e(a,b){return v(d.token,a,b)}var d={input:typeof a=="string"?x(a,!0):a,token:null,prev:null,peeked:null,in_function:0,in_loop:0,labels:[]};d.token=g();var t=s(function(){e("operator","/")&&(d.peeked=null,d.token=d.input(!0));switch(d.token.type){case"num":case"string":case"regexp":case"operator":case"atom":return F();case"name":return v(f(),"punc",":")?w(H(d.token.value,g,g)):F();case"punc":switch(d.token.value){case"{":return p("block",R());case"[":case"(":return F();case";":g();return p("block");default:k()};case"keyword":switch(H(d.token.value,g)){case"break":return I("break");case"continue":return I("continue");case"debugger":o();return p("debugger");case"do":return function(a){l("keyword","while");return p("do",H(q,o),a)}(bk(t));case"for":return K();case"function":return P(!0);case"if":return Q();case"return":d.in_function==0&&i("'return' outside of function");return p("return",e("punc",";")?(g(),null):n()?null:H(bj,o));case"switch":return p("switch",q(),S());case"throw":return p("throw",H(bj,o));case"try":return T();case"var":return H(V,o);case"const":return H(W,o);case"while":return p("while",q(),bk(t));case"with":return p("with",q(),t());default:k()}}}),P=s(function(a){var b=e("name")?H(d.token.value,g):null;a&&!b&&k(),m("(");return p(a?"defun":"function",b,function(a,b){while(!e("punc",")"))a?a=!1:m(","),e("name")||k(),b.push(d.token.value),g();g();return b}(!0,[]),function(){++d.in_function;var a=d.in_loop;d.in_loop=0;var b=R();--d.in_function,d.in_loop=a;return b}())}),S=G(bk,function(){m("{");var a=[],b=null;while(!e("punc","}"))e("eof")&&k(),e("keyword","case")?(g(),b=[],a.push([bj(),b]),m(":")):e("keyword","default")?(g(),m(":"),b=[],a.push([null,b])):(b||k(),b.push(t()));g();return a}),Y=s(function(a){if(e("operator","new")){g();return X()}if(e("operator")&&M(y,d.token.value))return bd("unary-prefix",H(d.token.value,g),Y(a));if(e("punc")){switch(d.token.value){case"(":g();return bc(H(bj,G(m,")")),a);case"[":g();return bc($(),a);case"{":g();return bc(_(),a)}k()}if(e("keyword","function")){g();return bc(P(!1),a)}if(M(D,d.token.type)){var b=d.token.type=="regexp"?p("regexp",d.token.value[0],d.token.value[1]):p(d.token.type,d.token.value);return bc(H(b,g),a)}k()}),bj=s(function(a,b){arguments.length==0&&(a=!0);var c=bi(b);if(a&&e("punc",",")){g();return p("seq",c,bj(!0,b))}return c});return p("toplevel",function(a){while(!e("eof"))a.push(t());return a}([]))}function E(a,b,c){this.name=a,this.start=b,this.end=c}function x(b){function P(a){if(a)return I();y(),v();var b=g();if(!b)return x("eof");if(o(b))return C();if(b=='"'||b=="'")return F();if(M(l,b))return x("punc",h());if(b==".")return L();if(b=="/")return K();if(M(e,b))return J();if(b=="\\"||q(b))return N();B("Unexpected character '"+b+"'")}function O(a,b){try{return b()}catch(c){if(c===w)B(a);else throw c}}function N(){var b=A(r);return M(a,b)?M(i,b)?x("operator",b):M(d,b)?x("atom",b):x("keyword",b):x("name",b)}function L(){h();return o(g())?C("."):x("punc",".")}function K(){h();var a=f.regex_allowed;switch(g()){case"/":f.comments_before.push(G()),f.regex_allowed=a;return P();case"*":f.comments_before.push(H()),f.regex_allowed=a;return P()}return f.regex_allowed?I():J("/")}function J(a){function b(a){if(!g())return a;var c=a+g();if(M(i,c)){h();return b(c)}return a}return x("operator",b(a||h()))}function I(){return O("Unterminated regular expression",function(){var a=!1,b="",c,d=!1;while(c=h(!0))if(a)b+="\\"+c,a=!1;else if(c=="[")d=!0,b+=c;else if(c=="]"&&d)d=!1,b+=c;else{if(c=="/"&&!d)break;c=="\\"?a=!0:b+=c}var e=A(function(a){return M(m,a)});return x("regexp",[b,e])})}function H(){h();return O("Unterminated multiline comment",function(){var a=t("*/",!0),b=f.text.substring(f.pos,a),c=x("comment2",b,!0);f.pos=a+2,f.line+=b.split("\n").length-1,f.newline_before=b.indexOf("\n")>=0;return c})}function G(){h();var a=t("\n"),b;a==-1?(b=f.text.substr(f.pos),f.pos=f.text.length):(b=f.text.substring(f.pos,a),f.pos=a);return x("comment1",b,!0)}function F(){return O("Unterminated string constant",function(){var a=h(),b="";for(;;){var c=h(!0);if(c=="\\")c=D();else if(c==a)break;b+=c}return x("string",b)})}function E(a){var b=0;for(;a>0;--a){var c=parseInt(h(!0),16);isNaN(c)&&B("Invalid hex-character pattern in string"),b=b<<4|c}return b}function D(){var a=h(!0);switch(a){case"n":return"\n";case"r":return"\r";case"t":return"\t";case"b":return"\b";case"v":return"";case"f":return"\f";case"0":return" ";case"x":return String.fromCharCode(E(2));case"u":return String.fromCharCode(E(4));case"\n":return"";default:return a}}function C(a){var b=!1,c=!1,d=!1,e=a==".",f=A(function(f,g){if(f=="x"||f=="X")return d?!1:d=!0;if(!d&&(f=="E"||f=="e"))return b?!1:b=c=!0;if(f=="-")return c||g==0&&!a?!0:!1;if(f=="+")return c;c=!1;if(f==".")return!e&&!d?e=!0:!1;return p(f)});a&&(f=a+f);var g=s(f);if(!isNaN(g))return x("num",g);B("Invalid syntax: "+f)}function B(a){u(a,f.tokline,f.tokcol,f.tokpos)}function A(a){var b="",c=g(),d=0;while(c&&a(c,d++))b+=h(),c=g();return b}function y(){while(M(j,g()))h()}function x(a,b,d){f.regex_allowed=a=="operator"&&!M(z,b)||a=="keyword"&&M(c,b)||a=="punc"&&M(k,b);var e={type:a,value:b,line:f.tokline,col:f.tokcol,pos:f.tokpos,nlb:f.newline_before};d||(e.comments_before=f.comments_before,f.comments_before=[]),f.newline_before=!1;return e}function v(){f.tokline=f.line,f.tokcol=f.col,f.tokpos=f.pos}function t(a,b){var c=f.text.indexOf(a,f.pos);if(b&&c==-1)throw w;return c}function n(){return!f.peek()}function h(a){var b=f.text.charAt(f.pos++);if(a&&!b)throw w;b=="\n"?(f.newline_before=!0,++f.line,f.col=0):++f.col;return b}function g(){return f.text.charAt(f.pos)}var f={text:b.replace(/\r\n?|[\n\u2028\u2029]/g,"\n").replace(/^\uFEFF/,""),pos:0,tokpos:0,line:0,tokline:0,col:0,tokcol:0,newline_before:!1,regex_allowed:!1,comments_before:[]};P.context=function(a){a&&(f=a);return f};return P}function v(a,b,c){return a.type==b&&(c==null||a.value==c)}function u(a,b,c,d){throw new t(a,b,c,d)}function t(a,b,c,d){this.message=a,this.line=b,this.col=c,this.pos=d}function s(a){if(f.test(a))return parseInt(a.substr(2),16);if(g.test(a))return parseInt(a.substr(1),8);if(h.test(a))return parseFloat(a)}function r(a){return q(a)||o(a)}function q(a){return a=="$"||a=="_"||n(a)}function p(a){return o(a)||n(a)}function o(a){a=a.charCodeAt(0);return a>=48&&a<=57}function n(a){a=a.charCodeAt(0);return a>=65&&a<=90||a>=97&&a<=122}var a=I(["break","case","catch","const","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","throw","try","typeof","var","void","while","with"]),b=I(["abstract","boolean","byte","char","class","debugger","double","enum","export","extends","final","float","goto","implements","import","int","interface","long","native","package","private","protected","public","short","static","super","synchronized","throws","transient","volatile"]),c=I(["return","new","delete","throw","else","case"]),d=I(["false","null","true","undefined"]),e=I(K("+-*&%=<>!?|~^")),f=/^0x[0-9a-f]+$/i,g=/^0[0-7]+$/,h=/^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i,i=I(["in","instanceof","typeof","new","void","delete","++","--","+","-","!","~","&","|","^","*","/","%",">>","<<",">>>","<",">","<=",">=","==","===","!=","!==","?","=","+=","-=","/=","*=","%=",">>=","<<=",">>>=","|=","^=","&=","&&","||"]),j=I(K(" \n\r\t")),k=I(K("[{}(,.;:")),l=I(K("[]{}(),;:")),m=I(K("gmsiy"));t.prototype.toString=function(){return this.message+" (line: "+this.line+", col: "+this.col+", pos: "+this.pos+")"};var w={},y=I(["typeof","void","delete","--","++","!","~","-","+"]),z=I(["--","++"]),A=function(a,b,c){while(c<a.length)b[a[c]]=a[c].substr(0,a[c].length-1),c++;return b}(["+=","-=","/=","*=","%=",">>=","<<=",">>>=","|=","^=","&="],{"=":!0},0),B=function(a,b){for(var c=0,d=1;c<a.length;++c,++d){var e=a[c];for(var f=0;f<e.length;++f)b[e[f]]=d}return b}([["||"],["&&"],["|"],["^"],["&"],["==","===","!=","!=="],["<",">","<=",">=","in","instanceof"],[">>","<<",">>>"],["+","-"],["*","/","%"]],{}),C=I(["for","do","while","switch"]),D=I(["atom","num","string","regexp","name"]);E.prototype.toString=function(){return this.name};var P=I(["name","array","object","string","dot","sub","call","regexp"]),R=I(["if","while","do","for","for-in","with"]);return{parse:F,gen_code:S,tokenizer:x,ast_walker:N}}

	// Math Operators

	var operators = {
		'+': 'add',
		'-': 'subtract',
		'*': 'multiply',
		'/': 'divide',
		'%': 'modulo',
		'==': 'equals',
		'!=': 'equals'
	};

	function $eval(left, operator, right) {
		var handler = operators[operator];
		if (left && left[handler]) {
			var res = left[handler](right);
			return operator == '!=' ? !res : res;
		}
		switch (operator) {
		case '+': return left + right;
		case '-': return left - right;
		case '*': return left * right;
		case '/': return left / right;
		case '%': return left % right;
		case '==': return left == right;
		case '!=': return left != right;
		default:
			throw new Error('Implement Operator: ' + operator);
		}
	};

	// Sign Operators

	var signOperators = {
		'-': 'negate'
	};

	function $sign(operator, value) {
		var handler = signOperators[operator];
		if (value && value[handler]) {
			return value[handler]();
		}
		switch (operator) {
		case '+': return +value;
		case '-': return -value;
		default:
			throw new Error('Implement Sign Operator: ' + operator);
		}
	}

	// AST Helpers

	function isDynamic(exp) {
		var type = exp[0];
		return type != 'num' && type != 'string';
	}

	function handleOperator(operator, left, right) {
		// Only replace operators with calls to $operator if the left hand side
		// is potentially an object.
		if (operators[operator] && isDynamic(left)) {
			// Replace with call to $operator(left, operator, right):
			return ['call', ['name', '$eval'],
					[left, ['string', operator], right]];
		}
	}

	/**
	 * Compiles PaperScript code into JavaScript code.
	 *
	 * @name PaperScript.compile
	 * @function
	 * @param {String} code The PaperScript code.
	 * @return {String} The compiled PaperScript as JavaScript code.
	 */
	function compile(code) {
		// Use parse-js to translate the code into a AST structure which is then
		// walked and parsed for operators to overload. The resulting AST is
		// translated back to code and evaluated.
		var ast = parse_js.parse(code),
			walker = parse_js.ast_walker(),
			walk = walker.walk;

		ast = walker.with_walkers({
			'binary': function(operator, left, right) {
				// Handle simple mathematical operators here:
				return handleOperator(operator, left = walk(left),
						right = walk(right))
						// Always return something since we're walking left and
						// right for the handleOperator() call already.
						|| [this[0], operator, left, right];
			},

			'assign': function(operator, left, right) {
				// Handle assignments like +=, -=, etc:
				// Check if the assignment operator needs to be handled by paper
				// if so, convert the assignment to a simple = and use result of
				// of handleOperator on the right hand side.
				var res = handleOperator(operator, left = walk(left),
						right = walk(right));
				if (res)
					return [this[0], true, left, res];
				// Always return something for the same reason as in binary
				return [this[0], operator, left, right];
			},

			'unary-prefix': function(operator, exp) {
				if (signOperators[operator] && isDynamic(exp)) {
					return ['call', ['name', '$sign'],
							[['string', operator], walk(exp)]];
				}
			}
		}, function() {
			return walk(ast);
		});

		return parse_js.gen_code(ast, {
			beautify: true
		});
	}

	/**
	 * Evaluates parsed PaperScript code in the passed {@link PaperScope}
	 * object. It also installs handlers automatically for us.
	 *
	 * @name PaperScript.evaluate
	 * @function
	 * @param {String} code The PaperScript code.
	 * @param {PaperScript} scope The scope in which the code is executed.
	 * @return {Object} The result of the code evaluation.
	 */
	function evaluate(code, scope) {
		// Set currently active scope.
		paper = scope;
		var view = scope.project.view,
			res;
		// Define variables for potential handlers, so eval() calls below to
		// fetch their values do not require try-catch around them.
		// Use with(){} in order to make the scope the current 'global' scope
		// instead of window.
		with (scope) {
			// Within this, use a function scope, so local variables to not try
			// and set themselves on the scope object.
			(function() {
				var onEditOptions, onSelect, onDeselect, onReselect,
					onMouseDown, onMouseUp, onMouseDrag, onMouseMove,
					onKeyDown, onKeyUp, onFrame, onResize;
				res = eval(compile(code));
				// Only look for tool handlers if something resembling their
				// name is contained in the code.
				if (/on(?:Key|Mouse)(?:Up|Down|Move|Drag)/.test(code)) {
					Base.each(Tool.prototype._events, function(key) {
						var value = eval(key);
						if (value) {
							// Use the getTool accessor that handles auto tool
							// creation for us:
							scope.getTool()[key] = value;
						}
					});
				}
				if (view) {
					view.setOnResize(onResize);
					// Fire resize event directly, so any user
					// defined resize handlers are called.
					view.fire('resize', {
						size: view.size,
						delta: new Point()
					});
					view.setOnFrame(onFrame);
					// Automatically draw view at the end.
					view.draw();
				}
			}).call(scope);
		}
		return res;
	}

	// Code borrowed from Coffee Script:
	function request(url, scope) {
		var xhr = new (window.ActiveXObject || XMLHttpRequest)(
				'Microsoft.XMLHTTP');
		xhr.open('GET', url, true);
		if (xhr.overrideMimeType) {
			xhr.overrideMimeType('text/plain');
		}
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				return evaluate(xhr.responseText, scope);
			}
		};
		return xhr.send(null);
	}

	function load() {
		var scripts = document.getElementsByTagName('script');
		for (var i = 0, l = scripts.length; i < l; i++) {
			var script = scripts[i];
			// Only load this script if it not loaded already.
			// Support both text/paperscript and text/x-paperscript:
			if (/^text\/(?:x-|)paperscript$/.test(script.type)
					&& !script.getAttribute('data-paper-loaded')) {
				// Produce a new PaperScope for this script now. Scopes are
				// cheap so let's not worry about the initial one that was
				// already created.
				// Define an id for each PaperScript, so its scope can be
				// retrieved through PaperScope.get().
				// If a canvas id is provided, pass it on to the PaperScope
				// so a project is created for it now.
				var scope = new PaperScope(script);
				scope.setup(PaperScript.getAttribute(script, 'canvas'));
				if (script.src) {
					// If we're loading from a source, request that first and then
					// run later.
					request(script.src, scope);
				} else {
					// We can simply get the code form the script tag.
					evaluate(script.innerHTML, scope);
				}
				// Mark script as loaded now.
				script.setAttribute('data-paper-loaded', true);
			}
		}
	}

	DomEvent.add(window, { load: load });

	// Produces helpers to e.g. check for both 'canvas' and 'data-paper-canvas'
	// attributes:
	function handleAttribute(name) {
		name += 'Attribute';
		return function(el, attr) {
			return el[name](attr) || el[name]('data-paper-' + attr);
		};
	}

	return {
		compile: compile,
		evaluate: evaluate,
		load: load,
		getAttribute: handleAttribute('get'),
		hasAttribute: handleAttribute('has')
	};

};

// Export load directly:
this.load = PaperScript.load;


/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// Iterate over all produced Base classes and set the _name property of their
// constructors to the key under which they are stored. This is a simple hack
// that allow us to use their names.
// Setting Function#name is not possible, as that is read-only.
Base.each(this, function(val, key) {
	if (val && val.prototype instanceof Base) {
		val._name = key;
	}
});



// Finally inject the classes set on 'this' into the PaperScope class and create
// the first PaperScope and return it, all in one statement.
// The version for 'dev' of this happens in core/initialize.js, since it depends
// on sequentiality of include() loading.
// Mark this object as enumerable, so all the injected classes can be enumerated
// again in PaperScope#install().
this.enumerable = true;
return new (PaperScope.inject(this));
};
