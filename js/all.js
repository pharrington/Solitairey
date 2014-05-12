YUI.add("breakout", function (Y) {
	function clamp (value, min, max) {
		return Math.max(Math.min(value, max), min);
	}

	/*
	 * @attribute rows
	 * @description The number of rows to split the host into. If columns is specified but this isnt, the host is split into squares. Default: 6
	 * @type Integer
	 */

	/*
	 * @attribute columns
	 * @description The number of columns to split the host into. If rows is specified but this isnt, the host is split into squares. Default: 6
	 * @type Integer
	 */

	function Breakout(config) {
		var rows = config.rows,
		    columns = config.columns;

		this._host = config.host;
		this._container = Y.Node.create("<div style='position: absolute'>");
		this._nodes = [];

		if (!(rows || columns)) {
			rows = 8;
		}

		this._rows = rows;
		this._columns = columns;

		Breakout.superclass.constructor.apply(this, arguments);
	}

	Breakout.NS = "breakout";
	Breakout.Name = "Breakout";

	Y.extend(Breakout, Y.Plugin.Base, {
		_splitNode: function () {
			var r, c,
			    x, y,
			    width = Math.round(this._blockWidth),
			    height = Math.round(this._blockHeight),
			    rows = this._rows,
			    columns = this._columns,

			    origin = this._host.getXY(),

			    host,
			    container = this._container,
			    nodes = this._nodes = [],
			    row,
			    
			    mask = Y.Node.create(
				'<div style="width: ' + width + 'px; height: ' + height + 'px; position: absolute; overflow: hidden">'
				);

			container.setXY(origin);

			for (r = 0; r < rows; r++) {
				nodes[r] = row = [];
				y = r * height;

				for (c = 0; c < columns; c++) {
					x = c * width;
					host = this._host.cloneNode(true);

					row[c] = mask.cloneNode()
						.setXY([x, y])
						.append(host.setXY([-x, -y]));
					container.append(row[c]);
				}
			}

			this._swapIn();
		},

		_swapIn: function () {
			this._host.get("parentNode").append(this._container);
			this._host.setStyle("visibility", "hidden");
		},

		_setup: function () {
			if (this._nodes.length) { return; }

			var node = this._host,
			    width = parseFloat(node.getComputedStyle("width")),
			    height = parseFloat(node.getComputedStyle("height")),

			    blockWidth,
			    blockHeight,

			    rows = this._rows,
			    columns = this._columns;

			if (rows) { blockHeight = height / rows; }
			if (columns) { blockWidth = width / columns; }

			if (!rows) {
				blockHeight = blockWidth;
				rows = height / blockHeight;
			}
			
			if (!columns) {
				blockWidth = blockHeight;
				columns = width / blockWidth;
			}

			this._container.setStyles({width: width, height: height});

			this._width = width;
			this._height = height;

			this._blockWidth = blockWidth;
			this._blockHeight = blockHeight;

			this._rows = rows;
			this._columns = columns;

			this._splitNode();
		},

		_forEach: function (effect, options) {
			this._setup();
			this._swapIn();

			var r, c,
			    rows = this._rows,
			    columns = this._columns,
 
			    options = options || {},
			    randomization = Math.abs(options.random || 0),
			    running = 0,
			    anim,
			    piece,
			    delay,
			    
			    container = this._container,
			    that = this;

			options.crop && container.setStyle("overflow", "hidden");

			for (r = 0; r < rows; r++) {
				for (c = 0; c < columns; c++) {
					running++;

					piece = this._nodes[r][c];
					anim = effect.call(this, piece, r, c, rows, columns);
					
					delay = r + c;
					if (options.reverse) {
						delay = rows + columns - delay;
					}

					anim.animation.on("end", function () {
						running--;

						if (!running) {
							that._container.remove();
							
							options.unhide && that._host.setStyle("visibility", "visible");
							options.crop && container.setStyle("overflow", "visible");

							that.fire("end");
						}
					});

					(function (a) {
				    		var random = 1 - (Math.random() * randomization),
						    opacity;

						if (options.fade) {
							opacity = options.unhide ? 0 : 1;
							Y.mix(a.animation.get("from"), {opacity: opacity});
							Y.mix(a.animation.get("to"), {opacity: 1 - opacity});
						} else {
							piece.setStyle("opacity", 1);
						}

						setTimeout(function () {
							a.animation.run();
						}, a.interval * delay * random);
					})(anim);
				}
			}
		},

		explode: function (options) {
			options = options || {};
			if (!("fade" in options)) { options.fade = true; }

			var randomization = Math.abs(options.random || 0);

			this._forEach(function (node, row, column, rows, columns) {
				var distance = (options.distance || 1.5) * 2,
				    duration = options.duration || 1000,
				    easing = options.easing || Y.Easing.easeOutStrong,

				    random = 1 - (Math.random() * randomization),

				    center = {x: (columns - 1) / 2, y: (rows - 1) / 2},
				    delta = {x: column - center.x, y: row - center.y},

				    to;

				distance *= random;

				to  = {left: (delta.x * distance + center.x) * this._blockWidth,
					  top: (delta.y * distance + center.y) * this._blockHeight};

				if (options.unhide) {
					node.setStyles(to);
					to = {left: column * this._blockWidth, top: row * this._blockHeight};
				}
				
				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: 0};
			}, options);
		},

		sheer: function (options) {
			options = options || {};


			var distance = options.distance || 1,
			    duration = options.duration || 1000,
			    interval = options.interval || 0,
			    easing = options.easing || Y.Easing.easeIn;
			    
			this._forEach(function (node, row, column, rows, columns) {
				var evenCol = !(column % 2),
				    evenRow = !(row % 2),

				    width = this._width,
				    height = this._height,

				    from = {left: column * this._blockWidth,
					    top: row * this._blockHeight},
				    to = {};

				if (columns === 1) { evenCol = evenRow; }
				if (rows === 1) { evenRow = !evenCol; }

				if (evenCol) {
					if (evenRow) { // go left
						to.left = from.left - distance * width;
					} else { // go down
						to.top = from.top + distance * height;
					}
				} else {
					if (evenRow) { // go up
						to.top = from.top - distance * height;
					} else { // go right
						to.left = from.left + distance * width;
					}
				}

				if (options.unhide) {
					to = from;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		pinwheel: function (options) {
			options = options || {};

			var distance = options.distance || 1,
			    duration = options.duration || 1000,
			    easing = options.easing || Y.Easing.easeOut;
			    
			this._forEach(function (node, row, column, rows, columns) {
				var evenCol = !(column % 2),
				    evenRow = !(row % 2),

				    interval = 0,

				    width = this._blockWidth,
				    height = this._blockHeight,

				    from = {left: column * width,
					    top: row * height,
					    width: width,
					    height: height},
				    to = {};

				if (evenCol) {
					if (evenRow) { // go down
						to.top = from.top + distance * height;
					} else { // go right
						to.left = from.left + distance * width;
					}
				}

				if (evenCol === evenRow) { // shrink height
					to.height = height * (1 - distance);
				} else { //shrink width
					to.width = width * (1 - distance);
				}

				if (options.unhide) {
					to = from;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		disintegrate: function (options) {
			options = options || {};
			options.reverse = true;

			this._forEach(function (node, row, column, rows, columns) {
				var distance = (options.distance || 1.5) * this._height,
				    duration = options.duration || 1000,
				    easing = options.easing || Y.Easing.easeBoth,

				    interval = duration / (rows + columns) * 2,

				    y = row * this._blockHeight,
				    anim;
				    
				if (distance < 0) { row = rows - row - 1}

				if (options.unhide) {
					node.setStyle("top", y - distance);
				} else {
					y += distance;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: { top: y },
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		fadeOut: function (options) {
			options = options || {};
			options.fade = true;

			this._forEach(function (node, row, column, rows, columns) {
				var duration = options.duration || 700,
				    startOpacity = options.unhide ? 0 : 1,
				    easing = options.easing,
				    interval,
				    anim;

				if (!easing) {
					easing = options.unhide ? Y.Easing.easeOut : Y.Easing.easeInStrong;
				}

				interval = duration / (rows + columns) * 2;

				anim = new Y.Anim({
					node: node,
					easing: easing,
					from: {}, to: {},
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		_inverse: function (effect, options) {
			options = options || {};
			options.unhide = true;
			effect.call(this, options);
		},

		unsheer: function (options) {
			this._inverse(this.sheer, options);
		},

		unpinwheel: function (options) {
			this._inverse(this.pinwheel, options);
		},

		converge: function (options) {
			this._inverse(this.explode, options);
		},

		fadeIn: function (options) {
			this._inverse(this.fadeOut, options);
		},

		build: function (options) {
			this._inverse(this.disintegrate, options);
		}
	});

	Y.Breakout = Breakout;
}, "1.0", {requires: ["plugin", "anim"]});
YUI.add("save-manager", function (Y) {

var Solitaire = Y.Solitaire;
	SaveManager = Y.namespace("Solitaire.SaveManager");
    
Y.mix(SaveManager, {
	nameKey: "current-game",
	serializedKey: "saved-game",

	save: function (name, data, serializedKey) {
		data = data || "";
		name = name || "";
		localStorage[this.nameKey] = name;
		localStorage[serializedKey || this.serializedKey] = data;
	},

	clear: function (serializedKey)  {
		localStorage[this.serializedKey || serializedKey] = "";
	},

	getSavedGame: function (serializedKey) {
		var name = localStorage[this.nameKey],
			serialized = localStorage[serializedKey || this.serializedKey],
			removeCookies = false;

		if (!name) {
			name = Y.Cookie.get("options");
			removeCookies = true;
		}

		if (!serialized) {
			serialized = Y.Cookie.get("saved-game") || Y.Cookie.get("initial-game");
			removeCookies = true;
		}

		if (removeCookies) {
			this.save(name, serialized);
			this.removeCookies();
		}

		return {name: name || "", serialized: serialized || ""};
	},

	removeCookies: function () {
		Y.Cookie.remove("options");
		Y.Cookie.remove("saved-game");
		Y.Cookie.remove("initial-game");
	}
});
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("analytics", function (Y) {

var Solitaire = Y.Solitaire,
    Analytics = Y.namespace("Solitaire.Analytics"),
    /* minimum number of moves for a new game to be considered started */
    minMoves = 5,
    totalMoves = 0,
    previousGame,
    start = 0;

Y.on("beforeSetup", function () {
	var end = start;

	start = new Date().getTime();

	if (end) {
		Analytics.track("Games", "Played", previousGame, start - end);
	}

	totalMoves = 0;
	previousGame = Solitaire.game.name();
});

Y.on("win", function () {
	var now = new Date().getTime();

	Analytics.track("Games", "Won", Solitaire.game.name(), now - start, true);
	Analytics.track("Games", "Played", Solitaire.game.name(), now - start, true);

	start = 0;
});

Y.on("endTurn", function () {
	totalMoves++;

	if (totalMoves === minMoves) {
		Analytics.track("Games", "New", Solitaire.game.name());
	}
});

Y.on("popup", function (popup) {
	Analytics.track("Menus", "Show", popup);
});

Y.mix(Analytics, {
	/* TODO this interface is copped from GA
	 * think harder
	 */
	track: function (category, event, name, value, nointeract) {
		if (typeof _gaq === "undefined") { return; }
		_gaq.push(["_trackEvent", category, event, name, value, nointeract]);
	}
});

}, "1.0.0", {requires: ["solitaire"]});
YUI.add("ads", function (Y) {

function writer(adContainer) {
	var buffer = "",
	    container = document.createElement("div");

	return function (str) {
		var last,
		    element,
		    content;

		buffer += str;
		last = str[str.length - 1];

		if (last !== "\n" && last !== ">") { return; }

		container.innerHTML = buffer;
		element = container.childNodes[0];

		if (!element) {
			return;
		}

		if (element.nodeName === "SCRIPT") {
			if (element.src !== "") {
				loadScript(element.src, adContainer);
			} else {
				content = element.childNodes[0].nodeValue;
				content = content.match(/[^<!\-\/]+/)[0];
				eval(content);
			}
		} else {
			adContainer.appendChild(element);
		}

		buffer = "";
	};
};

function loadScript(url, container, callback) {
	var script = document.createElement("script");

	script.onload = function () {
		if (typeof callback === "function") { callback(); }
	};

	script.src = url;
	container.appendChild(script);
}

function loadAd(container, callback) {
	var url = "http://ads.adbrite.com/mb/text_group.php?sid=2093964&zs=3136305f363030&ifr="+AdBrite_Iframe+"&ref="+AdBrite_Referrer;

	loadScript(url, container, callback);
}

function configLeftSkyscraper() {
	AdBrite_Title_Color = '0000FF';
	AdBrite_Text_Color = '000000';
	AdBrite_Background_Color = 'FFFFFF';
	AdBrite_Border_Color = 'CCCCCC';
	AdBrite_URL_Color = '008000';
	try {
		AdBrite_Iframe=window.top!=window.self?2:1;
		AdBrite_Referrer=document.referrer==''?document.location:document.referrer;
		AdBrite_Referrer=encodeURIComponent(AdBrite_Referrer);
	} catch (e) {
		AdBrite_Iframe='';
		AdBrite_Referrer='';
	}
}

function loadLeft() {
	var left = document.getElementById("adleft");

	if (!left) { return; }

	left.innerHTML = "";
	configLeftSkyscraper();
	loadAd(left);
	document.write = document.writeln = writer(left);
};

function loadLigit() {
	var url = "liji.html";

	document.getElementById("adleftbody").src = url;
}

Y.on("newGame", loadLigit);
Y.on("loadGame", loadLigit);

}, "1.0.0", {requires: ["solitaire"]});
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(elt /*, from*/)  {  
    var len = this.length >>> 0;  
  
    var from = Number(arguments[1]) || 0;  
    from = (from < 0)  
         ? Math.ceil(from)  
         : Math.floor(from);  
    if (from < 0)  
      from += len;  
  
    for (; from < len; from++) {  
      if (from in this &&  
          this[from] === elt)  
        return from;  
    }  
    return -1;  
  };  
}

Array.prototype.flatten = function () {
	var result = [],
	    i,
	    len,
	    item,
	    proto = Array.prototype;

	for (i = 0, len = this.length; i < len; i++) {
		item = this[i];
		if (Object.prototype.toString.call(item) === "[object Array]") {
			proto.push.apply(result, proto.flatten.call(item));
		} else {
			result.push(item);
		}
	}
	return result;
};

function argsArray(args) {
	return Array.prototype.slice.call(args);
}

Array.prototype.last = function () {
	return this[this.length - 1];
};

Array.prototype.deleteItem = function (item) {
	var i = this.indexOf(item);

	i !== -1 && this.splice(i, 1);
};

Array.prototype.shuffle = function () {
	var i = this.length,
	    r,
	    item,
	    temp;

	while (--i) {
		r = ~~(Math.random() * i);
		item = this[i];
		temp = this[r];
		this[r] = item;
		this[i] = temp;
	}
};

Function.prototype.bind = function (o) {
	var f = this;

	return function () {
		var args = argsArray(arguments);

		return f.apply(o, args);
	};
};

Function.prototype.partial = function () {
	var f = this, captured = argsArray(arguments);

	return function () {
		var i, len, args = [].concat(captured);

		for (i = 0, len = arguments.length; i < len; i++) {
			args.push(arguments[i]);
		}

		return f.apply(this, args);
	};
};

function instance(proto, attrs) {
	var maker = new Function(),
	    o,
	    p;

	maker.prototype = proto;
	o = new maker;
	if (typeof attrs === "object") {
		for (p in attrs) {
			if (attrs.hasOwnProperty(p)) {
				o[p] = attrs[p];
			}
		}
	}

	return o;
}

function normalize(valOrFunction) {
	var val = typeof valOrFunction === "function" ? valOrFunction() : valOrFunction;

	return isNaN(val) ? undefined : val;
}

Object.prototype.mapToFloat = function () {
	var p;

	for (p in this) {
		if (this.hasOwnProperty(p)) {
			this[p] = parseFloat(this[p]);
		}
	}

	return this;
}

Object.prototype.mapAppend = function (str) {
	var p;

	for (p in this) {
		if (this.hasOwnProperty(p)) {
			this[p] += str;
		}
	}

	return this;
}

var Game;

YUI.add("solitaire", function (Y) {

var Solitaire = Y.namespace("Solitaire");

function CardDelegate(cfg) {
	CardDelegate.superclass.constructor.call(this, cfg);
}

Y.extend(CardDelegate, Y.DD.Delegate, {
	getCard: function () {
		return this.get("currentNode").getData("target");
	}
});

Y.mix(Solitaire, {
	activeCard: null,
	moves: null,
	selector: "body",
	offset: {left: 50, top: 70},
	padding: {x: 50, y: 50},
	widthScale: 0,

	noop: function () {},

	name: function () {
		var p;

		for (p in Solitaire) {
			if (Solitaire.hasOwnProperty(p) && Solitaire[p] === Game) { return p; }
		}
	},

	container: function () {
		return Y.one(Solitaire.selector);
	},

	width: function () { return this.Card.base.width * this.widthScale; },
	height: function () { return this.Card.base.height * 4.2; },
	maxStackHeight: function () {
		return Solitaire.Application.windowHeight - 
			normalize(this.Tableau.stackConfig.layout.top) -
			normalize(Game.offset.top);
	},

	undo: function () {
		Y.fire("undo");
	},

	pushUndoStack: function () {
		Solitaire.moves.length && Undo.push(Solitaire.moves);
		Solitaire.moves = [];
	},

	pushMove: function (move) {
		var moves = Solitaire.moves;
		moves && moves.push(move);
	},

	serialize: function () {
		var serialized = [],
		    lengths = [],
		    data,
		    stacks,
		    i, len;

		Y.Array.each(this.fields, function (field) {
			stacks = this[field.toLowerCase()].stacks;

			for (i = 0, len = stacks.length; i < len; i++) {
				data = stacks[i].serialize();
				serialized.push(data);
				lengths.push(String.fromCharCode(data.length));
			}
		}, this);

		return [String.fromCharCode(serialized.length)].concat(lengths, serialized).join("");
	},

	stationary: function (callback) {
		var updatePosition = Game.Card.updatePosition;

		Game.Card.updatePosition = Solitaire.noop;
		callback.call(this);
		Game.Card.updatePosition = updatePosition;
	},

	unanimated: function (callback) {
		var anim = Y.Solitaire.Animation,
		    animate = anim.animate;

		anim.animate = false;
		callback.call(this);
		anim.animate = animate;
	},

	withoutFlip: function (callback) {
		var anim = Solitaire.Animation,
		    card = Solitaire.Card,
		    flip = anim.flip,
		    setImageSrc = card.setImageSrc;

		if (!anim.animate) {
			callback.call(this);
			return;
		}

		anim.flip = card.setImageSrc = Solitaire.noop;

		callback.call(this);

		anim.flip = flip;
		card.setImageSrc = setImageSrc;
	},

	unserialize: function (serialized) {
		this.unanimated(function () {
			var numStacks = serialized.charCodeAt(0),
			    lengths = serialized.substr(1, numStacks),
			    offset = numStacks + 1,
			    data,
			    fields = this.fields, fieldIndex = -1,
			    stacks = [], stackIndex,
			    stack,
			    i,
			    length;

			for (i = 0, stackIndex = 0; i < numStacks; i++, stackIndex++, offset += length) {
				length = lengths.charCodeAt(i);
				data = serialized.substr(offset, length);

				if (stackIndex === stacks.length) {
					fieldIndex++;
					stacks = this[fields[fieldIndex].toLowerCase()].stacks;
					stackIndex = 0;
				}

				stack = stacks[stackIndex];
				stack.unserialize(data);
				stack.updateCardsPosition();
			}
		});
	},

	save: function (newGame) {
		var key;

		if (newGame) {
			key = "initial-game";
		}

		Y.Solitaire.SaveManager.save(this.name(), this.serialize(), key);
	},

	loadGame: function (data) {
		this.unanimated(function () {
			this.setup(function () {
				this.unserialize(data);
			});
		});

		Y.fire("loadGame");

		this.save();
	},

	newGame: function () {
		Y.Solitaire.SaveManager.clear();
		this.withoutFlip(function () {
			this.setup(this.deal);
		});

		Y.fire("newGame");
		this.save(true);
	},

	cleanup: function () {
		Y.Event.purgeElement(this.container());

		//remove custom events
		Y.detach("solitaire|*");

		this.eachStack(function (stack) {
			stack.cleanup();
		});
	},

	setup: function (callback) {
		Game = Solitaire.game = this;

		Y.fire("beforeSetup");

		Solitaire.moves = null;
		Undo.clear();

		this.stationary(function () {
			this.init();
			Y.Solitaire.Animation.initQueue();
			this.createStacks();
			this.createEvents();
			this.createDraggables();

			callback.call(this);

		});

		Solitaire.moves = [];
		Y.fire("afterSetup");

		Y.Solitaire.Animation.dealing = true;

		Game.eachStack(function (s) {
			s.updateCardsStyle();
			s.updateCardsPosition();
		});

		Y.Solitaire.Animation.dealing = false;
	},

	createEvents: function () {
		var container = Y.one(Solitaire.selector);

		container.delegate("dblclick", Game.autoPlay, ".card");
		container.delegate("contextmenu", Game.autoPlay, ".card");

		container.delegate("click", Game.Events.click, ".card");
		container.delegate("touchend", Game.Events.click, ".card");

		Y.after("solitaire|endTurn", Game.Events.endTurn);
		Y.on("solitaire|undo", Game.Events.undo);
	},


	createDraggables: function () {
		var del = new CardDelegate({
			dragConfig: {
				dragMode: "intersect",
				groups: ["open"],
				clickPixelThresh: 0
			},
			container: Solitaire.selector,
			nodes: ".card"
		});
		
		del.dd.plug(Y.Plugin.DDProxy, {
			borderStyle: "none",
			moveOnEnd: false
		});

		del.on("drag:drag", Game.Events.drag);
		del.on("drag:mouseDown", Game.Events.dragCheck);
		del.on("drag:start", Game.Events.dragStart);
		del.on("drag:dropmiss", Game.Events.dragMiss);
		del.on("drag:drophit", Game.Events.drop);
		del.on("drag:end", Game.Events.dragEnd);
	},

	createField: function (field) {
		if (!field) { return; }

		var f = instance(field),
		    stackLayout,
		    stack,
		    stacks,
		    i, len;

		if (field.stackConfig) {
			stackLayout = field.stackConfig.layout;
			stacks = new Array(field.stackConfig.total);
			field.Stack.field = field.field;

			for (i = 0, len = stacks.length; i < len; i++) {

				stack = instance(field.Stack);
				stack.configLayout = stackLayout;

				stack.layout(Y.merge(stackLayout, {
					hoffset: i * stackLayout.hspacing || 0,
					voffset: i * stackLayout.vspacing || 0}), i);

				stacks[i] = stack;
			};
		}


		f.stacks = stacks;

		typeof f.init === "function" && f.init();

		return f;
	},

	createStacks: function () {
		this.eachStack(function (stack) {
			stack.cards = [];
			stack.createNode();
		});
	},

	eachStack: function (callback, fieldName) {
		Game && Y.Array.each(Game.fields, function (name) {
			var currentName = name.toLowerCase(),
			    field = Game[currentName],
			    fname = fieldName || currentName;

			fname === currentName && field.stacks && Y.Array.each(field.stacks, callback);
		});
	},

	resize: function (scale, width, height) {
		this.scale(scale);

		this.unanimated(function () {
			this.eachStack(function (stack, i) {
				var cards = stack.cards,
				    layout = stack.configLayout;

				stack.adjustRankHeight();
				stack.cards = [];
				stack.layout(Y.merge(layout, {
					hoffset: i * layout.hspacing || 0,
					voffset: i * layout.vspacing || 0}), i);

				stack.setImageSrc();
				stack.updateStyle();

				stack.setCards(cards.length, function (i) {
					var card = cards[i];

					if (card) {
						card.setImageSrc();
						card.updateStyle();
					}

					return card;
				});	

				stack.update();
			});
		});
	},

	scale: function (scale) {
		var Card = Y.Solitaire.Card,
		    base = Card.base,
		    prop;

		Card.scale = scale;

		for (prop in base) {
			if (base.hasOwnProperty(prop)) {
				Card[prop] = base[prop] * scale;
			}
		};
	},

	init: function () {
		var cancel = Solitaire.preventDefault,
		    minX, maxX,
		    fields;

		Y.on("selectstart", cancel, document);
		Y.on("contextmenu", function (e) {
			var target = e.target;

			if (target.hasClass("stack") || target.hasClass("card")) {
				e.preventDefault();
			}
		}, document);

		this.scale(1);

		fields = Y.Array.map(Game.fields, function (field) {
			return Game[field.toLowerCase()] = Game.createField(Game[field]);
		});

		// TODO: refactor this conditional into the above iteration
		if (Game.fields.indexOf("Deck" === -1)) {
			Game.deck = Game.createField(Game.Deck);
		}

		// find the game/card width ratio
		minX = Math.min.apply(Math, Y.Array.map(fields, function (f) {
			return Y.Array.map(f.stacks, function (s) { return s.left; });
		}).flatten());

		/*
		 * assume the leftmost point is the leftmost field
		 * if it isn't, you should override Solitaire.width
		 */
		maxX = Math.max.apply(Math, Y.Array.map(fields, function (f) {
			return Y.Array.map(f.stacks, function (s) { return s.left; });
		}).flatten()) + this.Card.width;

		this.widthScale = (maxX - minX) / this.Card.base.width;
	},

	preventDefault: function (e) {
		e.preventDefault();
	},

	autoPlay: function () {
		var card = typeof this.getCard === "function"
			? this.getCard()
			: this.getData("target");

		card.autoPlay();
	},

	isWon: function () {
		var foundations = this.foundation.stacks,
		    deck = this.deck,
		    total,
		    placed = 0,
		    i, len;

		total = deck.suits.length * 13 * deck.count;
		for (i = 0, len = foundations.length; i < len; i++) {
			placed += foundations[i].cards.length;
		}

		return placed === total;
	},

	win: function () {
		Y.fire("win");
		Y.Solitaire.SaveManager.save(this.name());
	},

	endTurn: function () {
		Y.fire("endTurn");
	}
});

Y.Solitaire.Events = {
		click: function (e) {
			var card = e.target.getData("target");

			if (card.dragging) { return; }

			card.dragging = false;
			card.turnOver(e);
			Solitaire.moves.reverse();
			Game.endTurn();
			e.preventDefault();
		},

		clickEmptyDeck: function () {
			Game.redeal();
			Solitaire.moves.reverse();
			Game.endTurn();
		},

		drag: function () {
			this.getCard().dragging = true;
		},

		dragCheck: function () {
			var card = this.getCard(),
			    stack = card.createProxyStack();

			if (!stack) { return; }

			Solitaire.activeCard = card;

			Game.eachStack(function (stack) {
				stack.updateDragGroups();
			});
		},

		dragStart: function () {
			var card = this.getCard(),
			    node = this.get("dragNode"),
			    proxy = card.createProxyNode();

			if (proxy) {
				node.setContent(proxy);
				!card.proxyStack && Y.one(".yui3-dd-shim").setStyle("cursor", "not-allowed");
			}
		},

		dragMiss: function () {
			var card = this.getCard();

			Game.unanimated(function () {
				card.updatePosition();
			});
		},

		dragEnd: function () {
			var target = this.getCard(),
			    root = Solitaire.container(),
			    fragment = new Y.Node(document.createDocumentFragment()),
			    dragNode,
			    node,

			    dragXY = this.dd.realXY,
			    containerXY = root.getXY(),

			    cards,
			    
			    stack,
			    proxyStack = target.proxyStack;

			target.dragging = false;
			dragNode = this.get("dragNode");
			node = dragNode.get("firstChild");

			node && node.remove();

			if (!proxyStack) { return; }

			cards = proxyStack.cards;
			stack = target.stack;

			proxyStack.left = dragXY[0] - containerXY[0];
			proxyStack.top = dragXY[1] - containerXY[1];

			Game.unanimated(function() {
				proxyStack.updateCardsPosition();
			});

			Y.Array.each(cards, function (card) {
				if (!card) { return; }

				card.proxyStack = null;
				fragment.append(card.node);
			});

			root.append(fragment);

			stack.updateCardsPosition();
		},

		drop: function (e) {
			if (!Solitaire.activeCard) { return; }

			var stack = Solitaire.activeCard.proxyStack,
			    target,
			    first;
		       
			if (stack) {
				first = stack.first();

				target = e.drop.get("node").getData("target");

				target = target.stack || target;

				if ((stack.cards.length === 1 && first.validTarget(target)) ||
				    stack.validTarget(target)) {

					target.pushStack(stack);
				}
			}

			Game.endTurn();
		},

		endTurn: function () {
			Solitaire.pushUndoStack();
			Solitaire.activeCard = null;
			Game.eachStack(function (s) {
				s.updateCardsStyle();
			});

			if (Game.isWon()) {
				Game.win();
			} else {
				Game.save();
			}
		},

		undo: function () {
			var args = argsArray(arguments);

			args.unshift("endTurn");
			Undo.undo();
			Y.fire.apply(Y, args);
		}
};

Y.Solitaire.Deck = {
		count: 1,
		suits: ["c", "d", "h", "s"],

		init: function (seed) {
			var suits = this.suits,
			    suit, s,
			    rank,
			    count,
			    Card = Game.Card;

			this.cards = [];

			for (count = 0; count < this.count; count++) {
				for (rank = 1; rank <= 13; rank++ ) {
					for (s = 0; suit = suits[s]; s++) {
						this.cards.push(Card.create(rank, suit).faceDown());
					}
				}
			}

			if (seed === undefined) {
				this.cards.shuffle();
			} else {
				this.msSeededShuffle(seed);
			}
		},

		// shuffle the deck using the "Microsoft Number"
		msSeededShuffle: function (seed) {
			var cards = this.cards,
			    maxInt = Math.pow(2, 31),
			    rand,
			    temp,
			    i;

			for (i = cards.length; i > 1; i--) {
				// simulate x86 integer overflow
				seed = ((214013 * seed) % maxInt + 2531011) % maxInt;
				rand = (seed >> 16) & 0x7fff;

				item = cards[i - 1];
				temp = cards[rand % i];
				cards[i - 1] = temp;
				cards[rand % i] = item;
			}
		},

		createStack: function () {
			var i;

			for (i = this.cards.length - 1; i >= 0; i--) {
				this.stacks[0].push(this.cards[i]);
			}
		},

		last: function () {
			return this.cards.last();
		},

		pop: function () {
			return this.cards.pop();
		}
	};

Y.Solitaire.Card = {
		zIndex: 1,
		index: -1,
		width: null,
		height: null,
		rankHeight: null,
		hiddenRankHeight: null,
		isFaceDown: false,
		positioned: false,
		scale: 1,
		stack: null,
		proxyStack: null,
		ghost: true,
		dragging: false,
		node: null,
		callback: null,
		left: 0,
		top: 0,

		base: {
		},

		origin: {
			left: function () {
				var offset = Solitaire.container().getX();
				
				return -offset - Y.Solitaire.Card.width;
			},
			top: function () {
				var offset = Solitaire.container().getY();

				return -offset - Y.Solitaire.Card.height;
			}
		},

		animSpeeds: {slow: 0.5, mid: 0.2, fast: 0.1},

		create: function (rank, suit) {
			var colors = {c: 0, s: 0, h: 1, d: 1};

			return instance(this, {rank: rank, suit: suit, color: colors[suit]});
		},

		truncatePosition: function () {
			this.left = Math.floor(this.left);
			this.top = Math.floor(this.top);
		},

		faceDown: function (undo) {
			this.isFaceDown = true;
			this.setRankHeight();
			Solitaire.Animation.flip(this);

			undo || Solitaire.pushMove({card: this, faceDown: true});

			return this;
		},

		faceUp: function (undo) {
			this.isFaceDown = false;
			this.setRankHeight();
			Solitaire.Animation.flip(this);

			undo || Solitaire.pushMove({card: this, faceDown: false});

			return this;
		},

		setRankHeight: function () {
			var stack = this.stack,
			    rh, hh;

			if (stack && stack.rankHeight) {
				rh = stack.rankHeight;
				hh = stack.hiddenRankHeight;
			} else {
				rh = Solitaire.Card.rankHeight;
				hh = Solitaire.Card.hiddenRankHeight;
			}

			this.rankHeight = this.isFaceDown ? hh : rh;
		},

		imageSrc: function () {
			var src = this.base.theme + "/";

			src += this.isFaceDown ?
				"facedown" :
				this.suit + this.rank;

			src += ".png";
			
			return src;
		},

		setImageSrc: function () {
			var n = this.node;

			n && n.setAttribute("src", this.imageSrc());
		},

		wrapperStyle: function () {
			return {
				left: this.left,
				top: this.top,
				width: Math.floor(this.width),
				height: Math.floor(this.height)
			};
		},

		updateStyle: function () {
			var n = this.node;

			n && n.setStyles(this.wrapperStyle());
			this.setRankHeight();
		},

		turnOver: function (e) {
			if (!this.isFaceDown) { return; }

			var stack = this.stack;

			if (stack.field === "deck") {
				Game.turnOver();
			} else if (this.isFree()) {
				this.faceUp();
			}

			e.stopPropagation();
		},

		autoPlay: function (simulate) {
			var origin = this.stack,
			    last = origin.last(),
			    stacks,
			    foundation,
			    i, len;

			if (this.isFaceDown || origin.field === "foundation") { return; }

			stacks = Game.foundation.stacks;
			for (i = 0, len = stacks.length; i < len; i++) {
				foundation = stacks[i];
				if (this.isFree() && this.validTarget(foundation)) {
					if (!simulate) {
						this.moveTo(foundation);
						origin.updateCardsPosition();
						origin.update();
						Game.endTurn();
					}

					return true;
				}
			}

			return false;
		},

		ensureDOM: function () {
			!this.node && this.createNode();
		},

		isFree: function () {
			return this === this.stack.last();
		},

		playable: function () {
			return this.stack.field === "deck" || (this.isFree() && (this.stack.field !== "foundation"));
		},

		createNode: function () {
			var node;

			node = this.node = Y.Node.create("<img class='card'>")
				.setData("target", this)
				.setAttribute("src", this.imageSrc())
				.plug(Y.Plugin.Drop);

			node.setStyles({left: -this.width, top: -this.height});
			this.setRankHeight();

			Solitaire.container().append(node);
		},
		
		destroyNode: function () {
			var n = this.node;

			n && n.clearData().destroy(true);
		},

		createProxyStack: function () {
			if (this.isFaceDown || this.stack.field === "foundation") {
				this.proxyStack = null;
				return null;
			}

			var stack = instance(this.stack, {
				proxy: true,
				stack: this.stack
			    }),
			    cards = stack.cards,
			    card,
			    i, len;

			stack.cards = [];
			stack.push(this, true);

			for (i = cards.indexOf(this) + 1, len = cards.length; i < len; i++) {
				card = cards[i];
				if (stack.validProxy(card)) {
					stack.push(card, true);
				} else {
					break;
				}
			}

			this.proxyStack = i === len ? stack : null;

			return this.proxyStack;
		},

		proxyCards: function () {
			return this.proxyStack.cards;
		},

		createProxyNode: function () {
			var node = Y.Node.create("<div>"),
			    stack = this.proxyStack;

			// if the card isn't playable, create ghost copy
			if (!stack) {
				if (!this.ghost) { return null; }

				node.setStyles({
					opacity: 0.6,
					top: -this.top,
					left: -this.left
				}).append(this.node.cloneNode(true));
			} else {
				node.setStyles({opacity: 1, top: -this.top, left: -this.left});

				Y.Array.each(this.proxyCards(), function (c) {
					c.proxyStack = stack;
					node.append(c.node);
				});
			}

			return node;
		},

		updatePosition: function (fields) {
			if (!this.node) { return; }

			var to = {left: Math.floor(this.left) + "px", top: Math.floor(this.top) + "px", zIndex: this.zIndex},
			    origin = this.origin;

			if (!this.positioned) {
				this.node.setStyles({left: normalize(origin.left), top: normalize(origin.top)});
			}

			Y.Solitaire.Animation.init(this, to, fields);
		},

		pushPosition: function () {
			var index = this.index >= 0 ?
				this.index :
				this.stack.cards.indexOf(this);

			Solitaire.pushMove({
				card: this,
				index: index,
				from: this.stack
			});
		},

		moveTo: function (stack) {
			var origin = this.stack;

			this.pushPosition();
			origin.deleteItem(this);
			stack.push(this);

			Y.fire(origin.field + ":afterPop", origin);

			return this;
		},

		flipPostMove: function (delay) {
			var anim = Solitaire.Animation;

			if (delay === undefined) {
				delay = anim.interval * 20;
			}

			this.after(function () {
				anim.flip(this, delay);
			});
		},

		after: function (callback) {
			this.callback = callback;
		},

		runCallback: function () {
			if (this.callback) {
				this.callback.call(this);
				this.callback = null;
			}
		}
	};

Y.Solitaire.Stack = {
		cards: null,
		node: null,
		images: {
			tableau: "freeslot.png",
			deck: "freeslot.png",
			reserve: "freeslot.png",
			foundation: "freeslot.png"
		},

		serialize: function () {
			var i, len,
			    cards = this.cards,
			    card,
			    suits = Game.deck.suits,
			    bite,
			    serialized = [];

			for (i = 0, len = cards.length; i < len; i++) {
				card = cards[i];
				if (card) {
					bite = suits.indexOf(card.suit) |
						card.rank << 2 |
						card.isFaceDown << 6; // type coersion!
				} else {
					bite = 128;
				}
				serialized.push(String.fromCharCode(bite));
			}

			return serialized.join("");
		},

		eachCard: function (callback) {
			var i, len,
			    cards = this.cards;

			for (i = 0, len = cards.length; i < len; i++) {
				if (cards[i]) {
					if (callback.call(this, cards[i], i) === false) { return false; }
				}
			}

			return true;
		},

		setCards: function (count, cardGen) {
			var i, len,
			    card, cards,
			    empty = instance(Game.Card, {
				updatePosition: Solitaire.noop,
				ensureDOM: Solitaire.noop
			    });

			cards = this.cards = [];

			for (i = 0; i < count; i++) {
				card = cardGen.call(this, i) || empty;
				this.push(card);
			}

			for (i = 0; i < count; i++) {
				if (cards[i] === empty) {
					cards[i] = null;
				}
			}
		},

		updateCardsPosition: function () {
			var cards = this.cards;

			Game.stationary(function () {
				this.proxy || this.adjustRankHeight();
				this.setCards(cards.length, function (i) {
					var card = cards[i];

					if (card) {
						card.stack = this;
						card.setRankHeight();
					}

					return card;
				});
			}.bind(this));

			this.eachCard(function (c) {
				c.updatePosition();
			});
		},

		updateCardsStyle: function () {
			var field = this.field;

			field === "foundation" || this.eachCard(function (c) {
				if (c.playable()) {
					c.node.addClass("playable");
				} else {
					c.node.removeClass("playable");
				}
			});
		},

		unserialize: function (serialized) {
			var deck = Game.deck,
			    Card = Game.Card;

			this.setCards(serialized.length, function (i) {
				var value,
				    card;

				value = serialized.charCodeAt(i);

				if (value === 128) {
					card = null;
				} else {
					card = Card.create(
						(value >> 2) & 15, // rank
						deck.suits[value & 3] // suit
					);

					value & 64 ? card.faceDown(true) : card.faceUp(true);
				}

				return card;
			});

			this.update();
		},

		imageSrc: function () {
			var basename = this.images[this.field];

			return basename ? Solitaire.Card.base.theme + "/" + basename : "trans.gif";
		},

		layout: function (layout) {
			var hoffset = layout.hoffset * Y.Solitaire.Card.width,
			    voffset = layout.voffset * Y.Solitaire.Card.height,
			    gameOffset = Game.offset,
			    self = this;

			Y.Array.each(["top", "left"], function (p) {
				self[p] = normalize(layout[p]);
			});

			this.left += hoffset + normalize(gameOffset.left);
			this.top += voffset + normalize(gameOffset.top);
		},

		deleteItem: function (card) {
			this.cards.deleteItem(card);
		},

		push: function (card, temp) {
			var last = this.last(),
			    to = this.field,
			    from = card.stack ? card.stack.field : "deck";

			if (last) { card.zIndex = last.zIndex + 1; }
			else if (to === "deck" || to === "foundation") { card.zIndex = 200; }
			else if (from === "deck") { card.zIndex = Game.Card.zIndex; }

			if (!temp) {
				card.stack = this;
				this.setCardPosition(card);
				card.truncatePosition();
				card.ensureDOM();
			}

			this.cards.push(card);
			temp || card.updatePosition({from: from, to: to});
		},

		pushStack: function (proxy) {
			var origin = Solitaire.activeCard.stack,
			    stack = this;

			/* save the card's index in the stack so we can properly undo this move */
			origin.eachCard(function (card, i) {
				card.index = i;
			});

			Game.stationary(function () {
				proxy.eachCard(function (card) {
					card.moveTo(stack);
					card.index = -1;
				});
				origin.eachCard(function (card) {
					card.index = -1;
				});
			});

			origin.updateCardsPosition();
			origin.update();

			Y.fire(stack.field + ":afterPush", stack);
		},

		// Allow maximum stack height to be set on a per-stack basis
		maxStackHeight: function () {
			return Game.maxStackHeight();
		},

		adjustRankHeight: function () {
			var cards = this.cards,
				card,
				last = this.last(),
				max = this.maxStackHeight(),

				sumHidden = 0,
				sumVisible = 0,
				sumHiddenRankHeight = 0,
				sumVisibleRankHeight = 0,
				maxRankHeights,
				totalHeight = 0,

				Card = Solitaire.Card,
				countHidden = 0, countVisible = 0,
				i, len;

			if (cards.length <= 1) { return; }

			for (i = 0, len = cards.length - 1; i < len; i++) {
				// if gaps in the stack are allowed, the stack's laid out horizontally
				if (!cards[i]) { return; }

				if (cards[i].isFaceDown) {
					countHidden++;
					sumHiddenRankHeight += Card.hiddenRankHeight;
				} else {
					countVisible++;
					sumVisibleRankHeight += Card.rankHeight;
				}
			}

			if (last) {
				totalHeight = sumHiddenRankHeight + sumVisibleRankHeight + last.height;
				maxRankHeights = max - last.height;
			}

			// A stack rank height of 0 means no override of the card rank height.
			if (totalHeight <= max) {
				this.rankHeight = 0;
				this.hiddenRankHeight = 0;
				return;
			}

			// Scale back the stack rank height override
			sumHiddenRankHeight = maxRankHeights * sumHiddenRankHeight /
				(sumHiddenRankHeight + sumVisibleRankHeight);
			sumVisibleRankHeight = maxRankHeights * sumVisibleRankHeight /
				(sumHiddenRankHeight + sumVisibleRankHeight);

			this.hiddenRankHeight = countHidden ? Math.floor(sumHiddenRankHeight / countHidden) : 0;
			this.rankHeight = countVisible ? Math.floor(sumVisibleRankHeight / countVisible) : 0;
		},

		first: function () { 
			return this.cards[0];
		},

		last: function () {
			return this.cards.last();
		},

		length: function () {
			return this.cards.length;
		},

		index: function () {
			return Game[this.field].stacks.indexOf(this);
		},

		next: function () {
			return Game[this.field].stacks[this.index() + 1];
		},

		setCardPosition: function (card) {
			card.top = this.top;
			card.left = isNaN(this.left) ? null : this.left;
		},

		wrapperStyle: function () {
			return {
				left: Math.floor(this.left),
				top: Math.floor(this.top),
				width: Math.floor(Y.Solitaire.Card.width),
				height: Math.floor(Y.Solitaire.Card.height)
			};
		},

		updateStyle: function () {
			var n = this.node;

			n && n.setStyles(this.wrapperStyle());
		},

		setImageSrc: function () {
			if (this.node) {
				this.node.setAttribute("src", this.imageSrc());
			}
		},

		createNode: function () {
			var node = this.node;

			node = this.node = Y.Node.create("<img class='stack'>")
				.set("draggable", false)
				.setData("target", this)
				.plug(Y.Plugin.Drop);

			this.setImageSrc();
			this.updateStyle();

			Solitaire.container().append(node);
		},

		cleanup: function () {
			var n = this.node;

			n && n.clearData().destroy(true);

			this.eachCard(function (c) {
				c.destroyNode();
			});
		},

		updateDragGroups: function () {
			var active = Solitaire.activeCard,
			    cards = this.cards,
			    last = this.last(),
			    drop,
			    i = cards.length - 1;

			this.eachCard(function (c) {
				c.node.drop.removeFromGroup("open");
			});

			if (active.validTarget(this)) {
				if (last) {
					last.node.drop.addToGroup("open");
				}
				this.node.drop.addToGroup("open");
			} else {
				this.node.drop.removeFromGroup("open");
			}
		},

		validCard: function () { return true; },

		validProxy: function (card) {
			return card && card.validTarget(this) && this.validCard(card);
		},

		update: function () {}
	};

Y.Solitaire.Animation = {
		animate: true,
		dealing: false,
		duration: 0.5, // seconds
		flipDuration: 0.1, // seconds
		interval: 20, // milliseconds
		queue: new Y.AsyncQueue(),

		initQueue: function () {
			var q = this.queue;

			q.defaults.timeout = this.interval;
		},

		init: function (card, to, fields) {
			if (!this.animate) {
				card.node.setStyles(to);
				card.positioned = true;
				setTimeout(function () {
					card.runCallback();
				}, 0);
				return;
			}

			var node = card.node,
			    q = this.queue,
			    speeds = card.animSpeeds,
			    from = {top: node.getStyle("top"), left: node.getStyle("left")}.mapToFloat().mapAppend("px"),
			    zIndex = to.zIndex,
			    duration,
			    $this = this;
		       
			if (from.top === to.top && from.left === to.left) { return; }

			if (this.dealing) {
				duration = speeds.slow;
			} else if (!fields ||
			    fields.from === fields.to ||
			    fields.to === "waste" ||
			    fields.to === "foundation") {
				duration = speeds.fast;
			} else if (fields.from === "deck") {
				duration = speeds.slow;
			} else {
				duration = speeds.mid;
			}

			node.setStyle("zIndex", 500 + zIndex);
			delete to.zIndex;

			q.add(this.animFunction.bind(this).partial({
				left: to.left,
				top: to.top,
				easing: "ease-out",
				duration: duration,
			}, card, function () {
				card.positioned = true;
				node.setStyle("zIndex", card.zIndex);
			}));

			q.run();
		},

		animFunction: function () {},

		doTransition: function (properties, card, callback) {
			var node = card.node,
			    $this = this;

			node.transition(properties, function () {
				callback();
				$this.clearTransition(node);
				card.runCallback();
			});
		},

		doAnim: function (properties, card, callback) {
			var node = card.node,
			    duration = properties.duration,
			    map = {
				linear: "linear",
				"ease-out": "easeOut",
				"ease-in": "easeIn"
			    },
			    easing = Y.Easing[map[properties.easing]],
			    anim;

			delete properties.duration;
			delete properties.easing;

			anim = new Y.Anim({
				node: node,
				to: properties,
				duration: duration,
				easing: easing
			});

			anim.on("end", function () {
				callback();
				card.runCallback();
			});

			anim.run();
		},
	
		flip: function(card, delay) {
			if (!(this.animate && card.node)) {
				card.setImageSrc();
				return;
			}

			var $this = this;
			/* the CSS left style doesn't animate unless I dump this onto the event loop.
			 * I don't know why.
			 */
			setTimeout(function () {
				var node = card.node,
				    duration = $this.flipDuration,
				    easing = "linear",
				    left = Math.floor(card.left),
				    width = Math.floor(card.width);

				$this.animFunction({
					left: Math.floor(left + width / 2) + "px",
					width: 0,
					easing: easing,
					duration: duration
				}, card, function () {
					card.setImageSrc();
					$this.animFunction({
						left: left + "px",
						width: width + "px",
						easing: easing,
						duration: duration
					}, card, function () {
						card.updateStyle();
					});

				});
			}, delay || 0);
		},

		/*
		 * cleanup messy Transition CSS declarations left by YUI
		 */
		clearTransition: function (node) {
			var style = node._node.style;

			Y.Array.each(["Webkit", "Moz", "O", "MS"], function (prefix) {
				var property = prefix + "Transition";

				if (property in style) {
					style[property] = null;
				}
			});
		}
	};

Solitaire.Animation.animFunction = Solitaire.Animation.doAnim;

var Undo = {
	stack: null,

	clear: function () {
		this.stack = [];
	},

	push: function (moves) {
		this.stack.push(moves);
	},

	pop: function () {
		return this.stack.pop() || [];
	},

	undo: function () {
		var stacks;

		stacks = Y.Array.unique(Y.Array.map(this.pop(), this.act).flatten());

		Y.Array.each(stacks, function (stack) {
			if (stack) {
				stack.updateCardsPosition();
				stack.update(true);
			}
		});
	},

	act: function (move) {
		if (typeof move === "function") {
			move();
			return [];
		}

		var from = move.from,
		    card = move.card,
		    to = card.stack,
		    cards = to.cards;

		if (from) {
			if (from === card.stack) {
				cards[cards.indexOf(card)] = null;
			} else {
				cards.deleteItem(card);
			}

			from.cards[move.index] = card;

			card.stack = from;

			Solitaire.container().append(card.node);
		}

		if ("faceDown" in move) {
			move.faceDown ? card.faceUp(true) : card.faceDown(true);
		}

		return [to, from];
	}
};

}, "0.0.1", {requires: ["save-manager", "dd", "dd-plugin", "dd-delegate", "anim", "transition", "async-queue", "cookie", "array-extras"]});
YUI.add("analytics", function (Y) {

var Solitaire = Y.Solitaire,
    Analytics = Y.namespace("Solitaire.Analytics"),
    /* minimum number of moves for a new game to be considered started */
    minMoves = 5,
    totalMoves = 0,
    previousGame,
    start = 0;

Y.on("beforeSetup", function () {
	var end = start;

	start = new Date().getTime();

	if (end) {
		Analytics.track("Games", "Played", previousGame, start - end);
	}

	totalMoves = 0;
	previousGame = Solitaire.game.name();
});

Y.on("win", function () {
	var now = new Date().getTime();

	Analytics.track("Games", "Won", Solitaire.game.name(), now - start, true);
	Analytics.track("Games", "Played", Solitaire.game.name(), now - start, true);

	start = 0;
});

Y.on("endTurn", function () {
	totalMoves++;

	if (totalMoves === minMoves) {
		Analytics.track("Games", "New", Solitaire.game.name());
	}
});

Y.on("popup", function (popup) {
	Analytics.track("Menus", "Show", popup);
});

Y.mix(Analytics, {
	/* TODO this interface is copped from GA
	 * think harder
	 */
	track: function (category, event, name, value, nointeract) {
		if (typeof _gaq === "undefined") { return; }
		_gaq.push(["_trackEvent", category, event, name, value, nointeract]);
	}
});

}, "1.0.0", {requires: ["solitaire"]});
YUI.add("util", function (Y) {

var Solitaire = Y.Solitaire;
    Util = Y.namespace("Solitaire.Util");
    
Y.mix(Util, {
	flipStacks: function (afterCard, delay, interval) {
		var game = Solitaire.game;

		if (delay === undefined) {
			delay = 200;
		}

		if (interval === undefined) {
			interval = 150;
		}

		afterCard.after(function () {
			game.eachStack(function (stack) {
				setTimeout(function () {
					stack.eachCard(function (c) {
						if (!c.isFaceDown) {
							Solitaire.Animation.flip(c);
						}
					});
				}, delay);

				delay += interval;
			}, "tableau");
		});
	},

	moveWasteToDeck: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0];

		while (waste.cards.length) {
			waste.last().faceDown().moveTo(deck);
		}
	},

	hasFreeTableaus: function () {
		return Y.Array.some(Solitaire.game.tableau.stacks, function (stack) {
			return !stack.cards.length;
		});
	},

	freeTableaus: function () {
		return Y.Array.filter(Solitaire.game.tableau.stacks, function (stack) {
			return stack.cards.length === 0;
		});
	},

	seedRank: function () {
		var seed = Game.foundation.stacks[0].first();

		return seed ? seed.rank : 0;
	},

	cacheNode: function (selector) {
		var node;

		return function () {
			if (!node) {
				node = Y.one(selector);
			}

			return node;
		}
	},

	mapRank: function (rank) {
		var map = {1: "Ace", 11: "Jack", 12: "Queen", 13: "King"},
		    mappedRank = map[rank];

		return mappedRank ? mappedRank : rank;
	}
});
}, "0.0.1", {requires: ["solitaire", "array-extras"]});
/*
 * Reward the player when they win
 */
YUI.add("win-display", function (Y) {
	var loaded,
	    won,
	    enabled = true,
	    Solitaire = Y.Solitaire,
	    Statistics = Solitaire.Statistics,
	    WinDisplay = Y.namespace("Solitaire.WinDisplay"),
	    winDisplayTimer,
	    isAttached = false,
	    cacheNode = Solitaire.Util.cacheNode,
	    
	    winScreens = [],

	    bodyNode = cacheNode("body"),
	    winDisplayNode = cacheNode("#win-display"),
	    winDisplayGame = cacheNode("#win-display-game"),
	    winDisplayStreak = cacheNode("#win-display-streak"),
	    winDisplayWins = cacheNode("#win-display-wins"),
	    winDisplayLoses = cacheNode("#win-display-loses");

	Y.on("newGame", function () {
		won = false;
	});

	Y.on("loadGame", function () {
		won = false;
	});

	Y.on("win", function () {
		if (won || !enabled) { return; }

		won = true;

		winScreens[~~(Math.random() * winScreens.length)]();
	});

	Y.on("beforeSetup", function () {
		WinDisplay.cancel();
		WinDisplay.enable();
		Bouncer.clear();
	});

	Y.on("fieldResize", function () {
		Bouncer.resize();
	});

	var requestAnimationFrame = (function () {
		var rate = 16;

		return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function (callback) {
				setTimeout(callback, rate);
			}
	})();

	var Bouncer = {
		width: 0,
		height: 0,
		angle: 2 * Math.PI,
		velocity: 1000,
		minYVelocity: 200,
		gravity: 15,
		dampening: 0.5,
		canvas: null,
		context: null,
		actors: [],

		bounce: function (card, angleRandomFactor, velocityRandomFactor) {
			var node = card.node,
				xy = node.getXY(),
				vector = {},
				angle, angleMin, angleDelta,
				velocity, velocityMin, velocityDelta,
				now = new Date().getTime(),
				start;


			angleMin = this.angle * (1 - angleRandomFactor);
			angleDelta = this.angle - angleMin;
			angle = Math.random() * angleDelta + angleMin;

			velocityMin = this.velocity * (1 - velocityRandomFactor);
			velocityDelta = this.velocity - velocityMin;
			velocity = Math.random() * velocityDelta + velocityMin;

			vector.x = Math.cos(angle) * velocity;
			vector.y = Math.sin(angle) * velocity;

			node.remove();

			start = this.actors.length === 0;

			if (xy) {
				this.actors.push({
					node: node._node,
					velocity: vector,
					boundingbox: {x: xy[0], y: xy[1], width: ~~card.width, height: ~~card.height},
					lastUpdate: now,
					lastSmear: now
				});
			}

			if (start) {
				this.bounceCallback(now);
			}
		},

		bounceCallback: function (lastUpdate) {
			var now = new Date().getTime(),
				dt,
				actors = this.actors,
				actor,
				i;

			dt = now - lastUpdate;

			i = 0;
			while (actor = actors[i]) {
				if (this.bounceStep(actor.node, actor.velocity, actor.boundingbox, dt)) {
					actors.splice(i, 1);
				} else {
					i++;
				}
				
			}

			if (actors.length > 0) {
				requestAnimationFrame(function () {
					this.bounceCallback(now);
				}.bind(this));
			}
		},

		bounceStep: function (image, velocity, boundingbox, dt) {
			dt /= 1000;

			boundingbox.x += velocity.x * dt;
			boundingbox.y += velocity.y * dt;

			velocity.y += this.gravity;

			if (boundingbox.x > this.width || boundingbox.x + boundingbox.width < 0 ||
				boundingbox.y + boundingbox.height < 0) {
				return true;
			}

			if (boundingbox.y + boundingbox.height >= this.height) {
				boundingbox.y -= velocity.y * dt;
				velocity.y *= -this.dampening;
				velocity.y = Math.min(velocity.y, -this.minYVelocity);
			}

			this.context.drawImage(image, ~~boundingbox.x, ~~boundingbox.y, boundingbox.width, boundingbox.height);
		},

		createSmearNode: function () {
			var node;

			if (!this.canvas) {
				var node = document.createElement("canvas");
				node.style.zIndex = -1;
				node.style.position = "absolute";
				node.style.top = "0px";
				node.style.left = "0px";
				node.width = this.width;
				node.height = this.height;

				this.canvas = node;
				this.context = node.getContext("2d");
				bodyNode().appendChild(this.canvas);
			}

			this.canvas.className = "";
		},

		resize: function () {
			this.width = bodyNode().get("winWidth");
			this.height = bodyNode().get("winHeight");

			if (this.canvas) {
				this.canvas.width = this.width;
				this.canvas.height = this.height;
			}
		},

		init: function () {
			this.resize();
			this.createSmearNode();
		},

		clear: function () {
			if (!this.context) { return; }

			this.context.clearRect(0, 0, this.width, this.height);
			this.canvas.className = "hidden";

			this.actors = [];
		}
	};

	function attachEvents() {
		if (isAttached) { return; }

		var Application = Solitaire.Application,
		    activeGame = Solitaire.game.name();

		Y.on("click", function () {
			WinDisplay.cancel();
			setTimeout(function () {
				Application.newGame();
			}, 0);
		}, Y.one("#win-display .new_deal"));

		Y.on("click", function () {
			Application.GameChooser.show(true);
		}, Y.one("#win-display .choose_game"));

		isAttached = true;
	}

	function windows3() {
		var delay = 300,
			winDisplayDelay = 1000,
			interval = 1000;

		Bouncer.init();

		Game.eachStack(function (stack) {
			var length = stack.length();

			stack.eachCard(function (card, index) {
				card.node.setStyle("zIndex", index - length);
				setTimeout(function () {
					Bouncer.bounce(card, 0.8, 0.2);
				}, ~~(interval * (stack.cards.length - 1 - index) + Math.random() * interval + delay));
			});
		}, "foundation");

		WinDisplay.winDisplay(winDisplayDelay);
	}

	function explodeFoundations() {
		var delay = 500,
		    duration = 900,
		    interval = 900;

		Game.eachStack(function (stack) {
			stack.eachCard(function (card) {
				if (!card) { return; }

				var node = card.node;
				if (card !== stack.last()) {
					setTimeout(function (node) {
						node.addClass("hidden");
					}.partial(node), delay);

					return;
				}

				node.plug(Y.Breakout, {columns: 5});
				(function (node) {
					setTimeout(function () {
						node.breakout.explode({random: 0.65, duration: duration});
					}, delay);
				})(node);

				delay += interval;
			});
		}, "foundation");

		WinDisplay.winDisplay(delay + 200);
	}

	Y.mix(WinDisplay, {
		winDisplay: function (delay) {
			winDisplayTimer = setTimeout(function () {
				var gameName = Solitaire.game.name(),
					stats = Statistics.getRecord(gameName);

				attachEvents();

				winDisplayGame().set("text", Solitaire.Application.nameMap[gameName]);
				winDisplayStreak().set("text", stats.streaks().last().length);
				winDisplayWins().set("text", stats.wins().length);
				winDisplayLoses().set("text", stats.loses().length);
				winDisplayNode().removeClass("hidden");
			}, delay);
		},

		cancel: function () {
			winDisplayNode().addClass("hidden");
			clearTimeout(winDisplayTimer);
		},

		enable: function () {
			enabled = true;
		},

		disable: function () {
			enabled = false;
		}
	});

	winScreens.push(explodeFoundations);
	if (window.HTMLCanvasElement) {
		winScreens.push(windows3);
	}
}, "0.0.1", {requires: ["solitaire", "statistics", "util", "array-extras", "breakout"]});
YUI.add("solitaire-ios", function (Y) {
	return; // mobile code needs to be reworked
	if (!Y.UA.ios) { return; }

	var Solitaire = Y.Solitaire,
	    _scale = Solitaire.scale,

	    LANDSCAPE = 0,
	    PORTRAIT = 1,

	    BARE_LAYOUT = {
	    	hspacing: 0,
		vspacing: 0,
		left: 0,
		top: 0,
	    },

	    DEFAULTS = {
	    	scale: 1,
		offset: 60,
		maxStackHeight: 155
	    },

	    OPTIONS = {
		Agnes: {offset: [null, 5], maxStackHeight: 260},
		FlowerGarden: {offset: [-60, 5], maxStackHeight: 235},
		Freecell: {scale: [1, 0.93], offset: [35, 5]},
		Golf: {scale: [1.1, 1], offset: [45, 8]},
		GClock: {scale: 0.93, offset: 5, maxStackHeight: 130},
		Klondike: {offset: [null, 5], maxStackHeight: [null, 340]},
		MonteCarlo: {scale: [0.88, 1], offset: [80, 15]},
		Pyramid: {offset: 20},
		Scorpion: {offset: 5, maxStackHeight: [235, 380]},
		Spider: {scale: [1.13, 0.79], offset: [5, 2], maxStackHeight: [160, 340]},
	    	TriTowers: {scale: 0.90, offset: 10},
		Yukon: {scale: [0.95, 1], offset: [50, 5], maxStackHeight: [235, 390]}
	    },

	    gameOverrides = {
		Agnes: function () {
			var hspacing = {hspacing: 1.13};

			fieldLayout(this, "Reserve", Y.merge(hspacing, {
				top: 60
			}));

			fieldLayout(this, "Tableau", Y.merge(hspacing, {
				top: 145
			}));

			fieldLayout(this, "Foundation", Y.merge(hspacing, {
				left: 135
			}));
		},

		FlowerGarden: [
			function () {
				this.Card.rankHeight = 15;

				fieldLayout(this, "Reserve", {
					top: 0,
					left: 70
				});

				fieldLayout(this, "Foundation", {
					top: 0,
					left: 470,
					hspacing: 0,
					vspacing: 1.1
				});

				fieldLayout(this, "Tableau", {
					top: 0,
					left: 140
				});

				Y.mix(this.Reserve.Stack, {
					setCardPosition: function (card) {
						var last = this.cards.last(),
						    top = last ? last.top + 11 : this.top,
						    left = this.left;

						card.left = left;
						card.top = top;
					},

					update: Solitaire.noop
				}, true);
			},

			function () {
				var setCardPosition = Solitaire.FlowerGarden.Reserve.Stack.setCardPosition;

				return function () {
					fieldLayout(this, "Tableau", {
						left: 10,
						top: 120
					});

					fieldLayout(this, "Reserve", {
						left: 17,
						top: 60
					});

					fieldLayout(this, "Foundation", {
						left: 55,
						top: 0,
						hspacing: 1.5,
						vspacing: 0
					});

					Y.mix(this.Reserve.Stack, {
						setCardPosition: setCardPosition,
						update: Solitaire.noop
					}, true);
				};
			}()
		],

		Freecell: [
			originalLayout("Freecell", ["Foundation", "Reserve", "Tableau"]),

			function () {
				var hspacing = {hspacing: 1.05};

				fieldLayout(this, "Tableau", hspacing);

				fieldLayout(this, "Reserve", hspacing);

				fieldLayout(this, "Foundation", Y.merge(hspacing, {
					left: 157
				}));
			}
		],

                Golf: [
                        originalLayout("Golf", ["Tableau", "Foundation"]),

                        function () {
                                fieldLayout(this, "Tableau", {hspacing: 1.1});
                                fieldLayout(this, "Foundation", {left: 132});
                        }
                ],

		GClock: function () {
			fieldLayout(this, "Foundation", {
				left: 143,
			});

			fieldLayout(this, "Tableau", {
				left: 0,
				top: 250,
				hspacing: 1.05
			});
		},

		Klondike: [
			function () {
				originalLayout("Klondike", "Foundation").call(this);
				originalLayout("Klondike", "Tableau").call(this);
			},

			function () {
				Y.mix(this.Foundation.stackConfig.layout, {left: 135, hspacing: 1.13}, true);
				Y.mix(this.Tableau.stackConfig.layout, {hspacing: 1.13}, true);
			}
		],

		MonteCarlo: function () {
			fieldLayout(this, "Tableau", {
				cardGap: 1.1,
				vspacing: 1.05
			});
		},

		Pyramid: [
			function () {
				var deck = originalLayout("Pyramid", "Deck");
				var waste = originalLayout("Pyramid", "Waste");

				return function () {
					deck.call(this);
					waste.call(this);

					Y.mix(this.Tableau.stackConfig.layout, {
						left: 190,
						cardGap: 1.1,
						hspacing: -0.55
					}, true);
				}
			}(),

			function () {
				Y.mix(this.Deck.stackConfig.layout, {
					left: -10,
					top: 300,
				}, true);

				Y.mix(this.Waste.stackConfig.layout, {
					top: 300,
				}, true);

				Y.mix(this.Tableau.stackConfig.layout, {
					left: 120,
					cardGap: 1.1,
					hspacing: -0.55
				}, true);
			}
		],

		Scorpion: [
			function () {
				fieldLayout(this, "Deck", {top: 0, left: 0});
				fieldLayout(this, "Foundation", {
					top: 0,
					left: 420,
					hspacing: 0,
					vspacing: 1.1
				});
				fieldLayout(this, "Tableau", {
					left: 60,
					top: 0,
					hspacing: 1.13
				});
			},

			function () {
				fieldLayout(this, "Deck", {left: 10, top: 0});

				fieldLayout(this, "Foundation", {
					left: 75,
					top: 0,
					hspacing: 1.5,
					vspacing: 0
				});

				fieldLayout(this, "Tableau", {
					left: 0,
					top: 60,
					hspacing: 1.13
				});
			}
		],

		Spider: [
			function () {
				fieldLayout(this, "Foundation", {
					left: 94,
					hspacing: 1.05
				});

				fieldLayout(this, "Tableau", {
					top: 65,
					hspacing: 1.05
				});
			},
			function () {
				fieldLayout(this, "Foundation", {
					left: 62,
					hspacing: 1
				});

				fieldLayout(this, "Tableau", {
					hspacing: 1
				});
			}
		],

		TriTowers: function () {
			Y.mix(this.Tableau.stackConfig.layout, {
				hspacing: -0.5,
				rowGaps: [3, 2, 1, 0],
				cardGap: 1
			}, true);
		},

		RussianSolitaire: [
			originalLayout("RussianSolitaire", ["Tableau", "Foundation"]),

			function () {
				fieldLayout(this, "Tableau", {
					top: 55,
					hspacing: 1.13
				});

				fieldLayout(this, "Foundation", {
					left: 46,
					top: 0,
					hspacing: 1.5,
					vspacing: 0
				});
			}
		],

		Yukon: [
			originalLayout("Yukon", ["Tableau", "Foundation"]),

			function () {
				fieldLayout(this, "Tableau", {
					top: 55,
					hspacing: 1.13
				});

				fieldLayout(this, "Foundation", {
					left: 46,
					top: 0,
					hspacing: 1.5,
					vspacing: 0
				});
			}
		]
	    };

	/*
		mobile: {
			sizes: [40],
			40: {
				hiddenRankHeight: 3,
				rankHeight: 15,
				dimensions: [40, 50]
			}
		},
		*/
	OPTIONS.FortyThieves = OPTIONS.Spider1S = OPTIONS.Spider2S = OPTIONS.Spider;
	gameOverrides.FortyThieves = gameOverrides.Spider1S = gameOverrides.Spider2S = gameOverrides.Spider;

	OPTIONS.WillOTheWisp = OPTIONS.Spiderette = OPTIONS.Klondike1T = OPTIONS.Klondike;
	gameOverrides.WillOTheWisp = gameOverrides.Spiderette = gameOverrides.Klondike1T = gameOverrides.Klondike;

        OPTIONS.RussianSolitaire = OPTIONS.Yukon;

	Y.mix(Y.DD.DDM, {
		useHash: false, // :\
		_pg_activate: Solitaire.noop,
		_pg_size: function () {
			/*
			if (this.activeDrag) {
				this._pg.setStyles({width: "100%", height: "100%"});
			}
			*/
		}
	}, true);

	Y.DD.DDM.set("throttleTime", 40);
	Y.mix(Y.DD.Drop.prototype, {
		_activateShim: function () {
			var DDM = Y.DD.DDM;

			if (!DDM.activeDrag) { return false; }
			if (this.get("node") === DDM.activeDrag.get("node")) { return false; }
			if (this.get("lock")) { return false; }

			if (this.inGroup(DDM.activeDrag.get("groups"))) {
				DDM._addValid(this);
				this.overTarget = false;
				if (!this.get("useShim")) {
					this.shim = this.get("node");
				}
				this.sizeShim();
			} else {
				DDM._removeValid(this);
			}
		},

		_deactivateShim: function () {
			this.overTarget = false;
		}
	}, true);

	Solitaire.Statistics.winDisplay = function () {
		alert("You win!");
	};

	Solitaire.scale = Solitaire.noop;
	Solitaire.Card.ghost = false;
	Solitaire.Animation.animate = false;

	/*
	Solitaire.Card.base = {
		theme: "mobile",
		hiddenRankHeight: 3,
		rankHeight: 15,
		width: 40,
		height: 50
	};
	*/

	function fieldLayout(game, field, layout) {
		Y.mix(game[field].stackConfig.layout, layout, true);
	}

	function originalLayout(game, fields) {
		var layouts,
		    normalizeLayout = function (field) {
			return [field, Y.merge(BARE_LAYOUT, Solitaire[game][field].stackConfig.layout)];
		    };

		layouts = Y.Array.map(Y.Array(fields), normalizeLayout);

		return function () {
			var that = this;

			Y.each(layouts, function (layout) {
				Y.mix(that[layout[0]].stackConfig.layout, layout[1], true);
			});
		};
	}

	function runOverrides() {
		var game = Solitaire.name(),
		    override;

		if (gameOverrides.hasOwnProperty(game)) {
			override = optionWithOrientation(gameOverrides[game]);
			override.call(Solitaire.game);
		}
	}

	function optionWithOrientation(option) {
		var orientation = window.innerWidth === 480 ? LANDSCAPE : PORTRAIT,
		    o;

		if (!option.length) { return option; }

		o = option[orientation];
		return o ? o : option[LANDSCAPE];
			
	}

	function getOption(name) {
		var game = Solitaire.name(),
		    options = OPTIONS[game],
		    dfault = DEFAULTS[name],
		    option = options ? options[name] : dfault; 

		return optionWithOrientation(option ? option : dfault) || dfault;
	}
	
	function scale() {
		_scale.call(Solitaire.game, getOption("scale"));
	}

	function offsetLeft() {
		return getOption("offset");
	}

	function maxStackHeight() {
		return getOption("maxStackHeight");
	}

	function disableScroll(e) {
		var target = e.target;

		if (target.hasClass("stack") || target.hasClass("card")) { return; }
		e.preventDefault();
	}

	function disableStyles() {
		function stylesheet(index) {
			return {
				deleteSelector: function (selector) {
					var ss = document.styleSheets[index],
					    rules,
					    idx;

					if (!ss) { return; }

					rules = Array.prototype.splice.call(ss.rules, 0);
					idx = rules.indexOf(rules.filter(function (rule) {
						return rule.selectorText === selector;
					})[0]);

					if (idx !== -1) { ss.deleteRule(idx); }
				}
			};
		}

		stylesheet(0).deleteSelector("#menu li:hover");
	}

	function cancelIfBody(e) {
		if (e.target.test("#descriptions *")) { return; }
		e.preventDefault();
	}

	function setupUI() {
		var undo,
		    cancel,
		    showMenu,
		    menu,
		    body,
		    nav,
                    fb,
		    closeMenu = function () { menu.removeClass("show"); };

		disableStyles();

		menu = Y.one("#menu");
		body = Y.one("body");
		undo = Y.one("#undo");
                fb = Y.one("#social");
		nav = Y.Node.create("<nav id=navbar>");
		showMenu = Y.Node.create("<a id=show_menu class='button'>New Game</a>");
		cancel = Y.Node.create("<li class=cancel><a id='cancel'>Cancel</a></li>");

		undo.get("parentNode").remove();

		showMenu.on("click", function () {
			menu.addClass("show");
		});

		menu.append(cancel);

		nav.append(showMenu);
		if (fb) {
			navigator.onLine ? nav.append(fb) : fb.remove();
		}

		nav.append(undo.addClass("button"));

		body.append(nav);
		Y.on("click", closeMenu, ["#cancel", "#new_deal", "#restart"]);

		// GameChooser customizations
		Solitaire.Application.GameChooser.draggable = false;

		Y.one("#game-chooser .titlebar").append(document.createTextNode("Games"));
		Y.one("#game-chooser .close").append(document.createTextNode("Back"));

		Y.delegate("touchstart", function (e) {
			e.target.ancestor("li", true).addClass("hover");
		}, "#descriptions", "li");

		Y.delegate("touchend", function (e) {
			e.target.ancestor("li", true).removeClass("hover");
		}, "#descriptions", "li");

		Y.on("gamechooser:select", function (chooser) {
			chooser.choose();
			closeMenu();
		});

		Y.on("gamechooser:hide", function () {
			scrollToTop();
		});

		if (navigator.standalone) {
			body.addClass("fullscreen");
		}

		// set resize event to orientationchange to more flexibly customize the layout
		Solitaire.Application.resizeEvent = "orientationchange";
	}

	function setStyles(landscape) {
		var body = Y.one("body"),
		    from, to;

		if (landscape) {
			from = "portrait";
			to = "landscape";
		} else {
			from = "landscape";
			to = "portrait";
		}

		body.removeClass(from).addClass(to);
	}

	function setLayout() {
		var game = Solitaire.name(),
		    landscape = window.innerWidth === 480,
		    msh = maxStackHeight();

		setStyles(landscape);

		runOverrides();

		Solitaire.offset = {left: offsetLeft(), top: 10};
		Solitaire.maxStackHeight = function () { return msh; };
		scale();
	}

	function scrollToTop() {
		setTimeout(function () {scrollTo(0, 0);}, 10);
	}

	Y.on("beforeSetup", setLayout);
	Y.on("beforeResize", setLayout);
	Y.on("afterResize", scrollToTop);
        Y.on("load", scrollToTop);

	Y.on("touchstart", function (e) {
		if (e.target._node === document.body) { e.preventDefault(); }
	}, document);

	Y.on("touchmove", cancelIfBody, document);

	Y.on("domready", setupUI);
	Solitaire.padding = {x: 5, y: 5};
	Solitaire.offset = {left: 5, top: 5};
}, "0.0.1", {requires: ["solitaire", "statistics"]});
/*
 * Stack extension class to automatically move complete stacks/runs to the foundation
 */
YUI.add("auto-stack-clear", function (Y) {
	var Solitaire = Y.Solitaire;

	Y.namespace("Solitaire.AutoStackClear");

	Solitaire.AutoStackClear.register = function () {
		Y.on("solitaire|tableau:afterPush", function (stack) {
			isComplete(stack, clearComplete);
		});
	}

	function isComplete(stack, callback) {
		var cards = stack.cards,
		    rank,
		    suit,
		    card,
		    complete,
		    i;

		if (!cards.length) { return false; }

		for (i = cards.length - 1, rank = 1, suit = cards[i].suit; i >= 0 && rank < 14; i--, rank++) {
			card = cards[i];

			if (card.isFaceDown || card.rank !== rank || card.suit !== suit) {
				return false;
			}
		}

		complete = rank === 14;
		complete && typeof callback === "function" && callback(stack, i + 1);
		return complete;
	}

	function clearComplete(stack, startIndex) {
		var foundation,
		    cards = stack.cards,
		    count = cards.length - startIndex;

		Solitaire.pushUndoStack();
		// find the first empty foundation
		foundation = Y.Array.find(Solitaire.game.foundation.stacks, function (stack) {
			return !stack.cards.length;
		});

		Solitaire.stationary(function () {
			while (count) {
				cards.last().moveTo(foundation);
				count--;
			}

		});

		stack.updateCardsPosition();
	}
}, "0.0.1", {requires: ["solitaire"]});
/*
 * automatically turn over the first open faceup card in a stack
 */
YUI.add("auto-turnover", function (Y) {
	Y.namespace("Solitaire.AutoTurnover");

	var Turnover = Y.Solitaire.AutoTurnover,
	    enabled = true;

	Y.on("tableau:afterPop", function (stack) {
		if (!enabled) { return; }

		Y.Array.each(stack.cards, function (card) {
			if (card && card.isFaceDown && card.isFree()) {
				card.faceUp();
			}
		});
	});

	Y.mix(Turnover, {
		enable: function () {
			enabled = true;
		},

		disable: function () {
			enabled = false;
		},

		isEnabled: function () {
			return enabled;
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("solitaire-autoplay", function (Y) {
	Y.namespace("Solitaire.Autoplay");

	var Solitaire = Y.Solitaire,
	    Autoplay = Solitaire.Autoplay,
	    whenWon = true,
	    autoPlayInterval = null,
	    autoPlayable = ["Klondike", "Klondike1T", "FortyThieves", "GClock", "Freecell", "FlowerGarden", "Yukon", "BakersGame", "BakersDozen", "Eightoff", "LaBelleLucie", "TheFan", "Alternations", "DoubleKlondike", "KingAlbert"];

	Y.on("endTurn", function () {
		if (!whenWon || autoPlayable.indexOf(Solitaire.game.name()) === -1) { return; }

		if (autoPlayInterval === null && isEffectivelyWon()) {
			Y.fire("autoPlay");
		}
	});

	Y.on("win", function () {
		clearInterval(autoPlayInterval);
		autoPlayInterval = null;
	});

	Y.on("autoPlay", function () {
		autoPlayInterval = setInterval(autoPlay, 130);
	});

	function autoPlay() {
		var played = false;

		Solitaire.game.eachStack(function (stack) {
			var field = stack.field;

			if (played || field === "foundation" || field === "deck") { return; }

			played = !stack.eachCard(function (card) {
				return !card.autoPlay();
			});
		});
	}

	function isEffectivelyWon() {
		var stop = false;

		Solitaire.game.eachStack(function (stack) {
			var field = stack.field,
			    prevRank = 14,
			    decending;

			if (stop || field !== "tableau" && field !== "waste") { return; }

			decending = stack.eachCard(function (card) {
				if (card.rank > prevRank || card.isFaceDown) {
					stop = true;
					return false;
				} else {
					prevRank = card.rank;
				}
			});
		});

		return !stop;
	}

	Y.mix(Autoplay, {
		enable: function () {
			whenWon = true;
		},

		disable: function () {
			whenWon = false;
		},

		isEnabled: function () {
			return whenWon;
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("solitaire-background-fix", function (Y) {
	var _body;

	Y.on("load", resize);
	Y.on("resize", resize);

	function resize() {
		var width = body().get("winWidth"),
		    height = body().get("winHeight"),
		    style = document.body.style;

		if (!Y.UA.mobile) {
			body().setStyles({width: width, height: height});
		}

		/*
		 * if we don't support the background-size property, use the tiled background instead
		 */

		if (style.backgroundSize === undefined && style.MozBackgroundSize === undefined) {
			body().setStyles({
				backgroundImage: "url(greentiled.jpg)",
				backgroundRepeat: "repeat"
			});
		}
	}

	function body() {
		if (!_body) {
			_body = new Y.Node(document.body);
		}

		return _body;
	}
}, "0.0.1", {requires: ["solitaire"]});
/*
 * record win/lose records, streaks, etc
 */
YUI.add("statistics", function (Y) {
	var loaded,
	    won,
	    enabled = true,
	    localStorage = window.localStorage,
	    Solitaire = Y.Solitaire,
	    Statistics = Y.namespace("Solitaire.Statistics"),
	    isAttached = false,
	    cacheNode = Solitaire.Util.cacheNode,
	    selectedGame,

	    populateGamesList = (function () {
		var isPopulated = false;

		return function () {
			if (isPopulated) {
				statsGamesList().addClass("hidden");
				return;
			}

			var namesArray = [],
				nameMap = Solitaire.Application.nameMap,
				listNode = new Y.Node(document.createDocumentFragment()),
				p, v;

			for (p in nameMap) {
				if (!nameMap.hasOwnProperty(p)) { continue; }

				namesArray.push([p, nameMap[p]]);
			}

			namesArray.sort(function (a, b) { return a[1].localeCompare(b[1]); });
			Y.Array.each(namesArray, function (game) {
				var node = Y.Node.create("<li class=stats-gameli>" + game[1] + "</li>");

				node.setData("game", game[0]);
				listNode.appendChild(node);
			});

			statsGamesList().appendChild(listNode);
			isPopulated = true;
		}
	    })(),

	    statsNode = cacheNode("#stats-popup"),
	    statsTitle = cacheNode(".stats-title"),
	    statsGame = cacheNode("#stats-game"),
	    statsGamesList = cacheNode("#stats-popup .popup-title-content"),
	    statsWinPercentage = cacheNode("#stats-winpercentage"),
	    statsWins = cacheNode("#stats-wins"),
	    statsLoses = cacheNode("#stats-loses"),
	    statsCurrentStreak = cacheNode("#stats-currentstreak"),
	    statsBestStreak = cacheNode("#stats-beststreak"),
	    statsGamesPlayed = cacheNode("#stats-gamesplayed");

	if (!localStorage) { return; }

	Y.on("newGame", function () {
		if (loaded) { recordLose(loaded); }

		won = false;
		loaded = null;
	});

	Y.on("loadGame", function () {
		loaded = Solitaire.game.name();
		won = false;
	});

	Y.on("endTurn", function () {
		if (!loaded) {
			loaded = Solitaire.game.name();
		}
	});

	Y.on("win", function () {
		if (won || !enabled) { return; }

		recordWin(loaded);

		loaded = null;
		won = true;
	});

	function attachEvents() {
		if (isAttached) { return; }

		var Application = Solitaire.Application;

		Y.on("click", function () {
			statsGamesList().toggleClass("hidden");
		}, statsTitle());

		Y.on("click", function () {
			if (!selectedGame) {
				selectedGame = Solitaire.game.name();
			}

			Application.Confirmation.show("Are you sure you want to reset all " + Solitaire.Application.nameMap[selectedGame] + " stats?", function () {
				resetRecord(selectedGame);
				Statistics.statsDisplay(selectedGame);
			});
		}, Y.one("#stats-reset"));

		Y.delegate("click", function (e) {
			selectedGame = e.target.getData("game");
			Statistics.statsDisplay(selectedGame);
		}, statsGamesList(), ".stats-gameli");

		isAttached = true;
	}

	function record(value, game) {
		var key, record;

		game = game || Solitaire.game.name();
		key = getRecordName(game);
		record = localStorage[key] || "";

		record += new Date().getTime() + "_" + value + "|";

		localStorage[key] = record;
	}

	function recordLose(game) {
		record(0, game);
	}

	function recordWin(game) {
		record(1, game);
	}

	function resetRecord(game) {
		localStorage[getRecordName(game)] = "";
	}

	function getRecordName(game) {
		return game + "record";
	}

	function getRecord(game) {
		var raw = localStorage[getRecordName(game)];

		function parse() {
			if (!raw || raw === "") {
				return [];
			}

			var entries = raw.split("|");

			entries.splice(entries.length - 1);

			return Y.Array.map(entries, function (entry) {
				entry = entry.split("_");

				return {date: new Date(entry[0]), won: !!parseInt(entry[1], 10)};
			});
		}

		function won(entry) {
			return entry.won;
		}

		var record = parse();

		return {
			streaks: function () {
				var streaks = [],
				    streak = null;

				Y.Array.each(record, function (entry) {
					if (!entry.won) {
						streak && streaks.push(streak);
						streak = null;
					} else {
						if (!streak) { streak = []; }
						streak.push(entry);
					}
				});

				streak && streaks.push(streak);

				return streaks;
			},

			wins: function () {
				return Y.Array.filter(record, won);
			},

			loses: function () {
				return Y.Array.reject(record, won);
			},

			all: function () { return record; }
		};
	}

	Y.mix(Statistics, {
		statsDisplay: function (name) {
			var gameName = typeof name === "string" ? name : Solitaire.game.name(),
			    stats = getRecord(gameName),
			    streaks = stats.streaks(),
			    all = stats.all(),
			    wins = stats.wins(),
			    winpercent = all.length ? wins.length / all.length * 100: 0,
			    lastRecord,
			    currentStreak = 0,
			    bestStreak = 0;

			if (!streaks.length) {
				bestStreak = currentStreak = 0;
			} else {
				lastRecord = stats.all().last();
				if (lastRecord && lastRecord.won) {
					currentStreak = streaks.last().length;
				}

				bestStreak = streaks.sort(function (a, b) {
					return a.length - b.length;
				}).last().length;
			}

			attachEvents();

			statsGamesPlayed().set("text", all.length);
			statsGame().set("text", Solitaire.Application.nameMap[gameName]);
			statsWinPercentage().set("text", Math.floor(winpercent) + "%");
			statsWins().set("text", wins.length);
			statsLoses().set("text", stats.loses().length);
			statsCurrentStreak().set("text", currentStreak);
			statsBestStreak().set("text", bestStreak);

			populateGamesList();

			Y.fire("popup", "Stats");
		},

		getRecord: function (name) {
			return getRecord(name);
		},

		enable: function () {
			enabled = true;
		},

		disable: function () {
			enabled = false;
		}
	});

}, "0.0.1", {requires: ["solitaire", "util", "array-extras", "breakout"]});
/*
 * Display the foundation seed rank
 */
YUI.add("display-seed-value", function (Y) {
	var Solitaire = Y.Solitaire,
	    Util = Solitaire.Util,
	    supportedGames = ["Agnes", "Canfield"],
	    rankContainer = Util.cacheNode("#seed-value-bar"),
	    rankNode = Util.cacheNode("#seed-value");

	Y.namespace("Solitaire.DisplaySeedValue");

	Y.on("afterSetup", function () {
		if (Game && supportedGames.indexOf(Game.name()) !== -1) {
			rankNode().setContent(Util.mapRank(Util.seedRank()));
			rankContainer().removeClass("hidden");
		} else {
			rankContainer().addClass("hidden");
		}
	});

	Y.on("fieldResize", function (scale, width, height) {
		if (width <= 1185) {
			rankContainer().addClass("bottom");
		} else {
			rankContainer().removeClass("bottom");
		}
	});

}, "0.0.1", {requires: ["solitaire", "util"]});
/*
 * Automatically solve a game of Freecell
 */
YUI.add("solver-freecell", function (Y) {
	Y.namespace("Solitaire.Solver.Freecell");

	Y.mix(Y.Solitaire.Solver.Freecell, {
		enable: Y.Solitaire.noop,
		disable: Y.Solitaire.noop,
		isEnabled: function () { return false; }
	});

	// only let this work with web workers and typed arrays

	if (!(window.Worker && window.ArrayBuffer && window.Uint8Array)) { return; }

	var Solitaire = Y.Solitaire,
	    FreecellSolver = Solitaire.Solver.Freecell,
	    suitTable = {
		s: 0,
		h: 1,
		c: 2,
		d: 3
	    },
	    enabled = true;

	function cardToValue(card) {
		return card ? card.rank << 2 | suitTable[card.suit] : 0;
	}

	function cardRank(val) {
		return val >> 2;
	}

	function cardSuit(val) {
		return ["s", "h", "c", "d"][val & 3];
	}

	function compareStack(a, b) {
		return b[0] - a[0];
	}

	function sortedStacks(field) {
		return Y.Array.map(field.stacks, function (s) { return s; }).
			sort(function (s1, s2) {
				var c1 = s1.first(),
				    c2 = s2.first();

				return cardToValue(c1) - cardToValue(c2);
			});
	}

	function gameToState(game) {
		var reserve, foundation, tableau;

		tableau = Y.Array.map(sortedStacks(game.tableau), function (s) {
			var buffer = [];

			s.eachCard(function (c, i) {
				buffer[i] = cardToValue(c);
			});

			return [buffer, s.cards.length];
		});

		reserve = [];
		Y.Array.forEach(sortedStacks(game.reserve), function (s, i) {
			reserve[i] = cardToValue(s.last());
		});

		foundation = [];
		Y.Array.forEach(sortedStacks(game.foundation), function (s, i) {
			foundation[i] = cardToValue(s.last());
		});

		return {reserve: reserve, foundation: foundation, tableau: tableau};
	}


	function moveToCardAndStack(game, move) {
		var source = move.source,
		    dest = move.dest,
		    value,
		    ret = {};

		value = source[1];
		game.eachStack(function (stack) {
			if (ret.card) { return; }

			var card = stack.last();
			if (!card) { return; }

			if (card.rank === cardRank(value) &&
			    card.suit === cardSuit(value)) {
				ret.card = card;
			}
		}, source[0]);

		value = dest[1];
		game.eachStack(function (stack) {
			if (ret.stack) { return; }

			var card = stack.last();

			if (!(card || value)) { ret.stack = stack; }

			if (card &&
			    (card.rank === cardRank(value) &&
			    card.suit === cardSuit(value))) {
				ret.stack = stack;
			}
		}, dest[0]);

		return ret;
	}

	function withSelector(selector, callback) {
		var node = Y.one(selector);

		if (node) {
			callback(node);
		}
	}

	var Animation = {
		interval: 500,
		timer: null,
		remainingMoves: null,

		init: function (moves) {
			var current = moves;

			while (current) {
				if (current.next) {
					current.next.prev = current;
				}
				current = current.next;
			}

			this.remainingMoves = moves;
		},

		pause: function () {
			Solitaire.Autoplay.enable();

			window.clearTimeout(this.timer);
			this.timer = null;

			withSelector("#solver-bar .pause", function (node) {
				node.removeClass("pause");
				node.addClass("play");
			});
		},

		playCurrent: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			move = moveToCardAndStack(game, this.remainingMoves);
			card = move.card;

			if (!card) { return; }

			origin = card.stack;

			card.after(function () {
				origin.updateCardsPosition();
				move.stack.updateCardsPosition();
			});
			card.moveTo(move.stack);
		},

		prev: function (game) {
			var prev = this.remainingMoves.prev;

			if (prev) {
				Y.fire("undo", true);
				this.remainingMoves = prev;
			}
		},

		next: function (game) {
			var current = this.remainingMoves,
			    next = this.remainingMoves.next;

			Solitaire.Statistics.disable();
			Solitaire.WinDisplay.disable();

			this.playCurrent(game);

			if (next) {
				this.remainingMoves = next;
			}

			Y.fire("endTurn", true);
		},

		play: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			Solitaire.Autoplay.disable();

			withSelector("#solver-bar .play", function (node) {
				node.removeClass("play");
				node.addClass("pause");
			});

			this.next(game);
			this.timer = window.setTimeout(function () {
				this.play(game);
			}.bind(this), this.interval);
		}
	};

	var Status = {
		bar: null,
		indicator: null,
		indicatorTimer: null,
		indicatorInterval: 750,
		delay: 400,

		updateIndicator: function (ticks) {
			var indicator = this.indicator,
			    i,
			    text;

			if (!indicator) { return; }

			ticks = ((ticks || 0) % 4);
			text = "Solving";
			for (i = 0; i < ticks; i++) {
				text += ".";
			}

			indicator.set("text", text);

			this.indicatorTimer = window.setTimeout(this.updateIndicator.partial(ticks + 1).bind(this), this.indicatorInterval);
		},

		stopIndicator: function (solved) {
			var indicator = this.indicator;

			window.clearTimeout(this.indicatorTimer);
			if (!indicator) { return; }

			if (solved) {
				indicator.set("text", "Solution found");
				withSelector("#solver-bar .controls", function (node) {
					node.removeClass("hidden");
				});

			} else {
				indicator.set("text", "Unable to find solution");
			}

			this.indicatorTimer = null;
		},

		show: function () {
			if (Y.one("#solver-bar")) { return; }

			var bar = Y.Node.create("<div id=solver-bar></div>"),
			    indicator = Y.Node.create("<span class=indicator>"),
			    next = Y.Node.create("<div class=fastforward>"),
			    prev = Y.Node.create("<div class=rewind>"),
			    playPause = Y.Node.create("<div class=play>"),
			    controls = Y.Node.create("<div class='controls hidden'>"),
			    playCallback;

			next.on("click", function () {
				Animation.next(Game);
			});
			prev.on("click", function () {
				Animation.prev(Game);
			});
			playPause.on("click", function () {
				/*
				 * Here I tie up state with the DOM
				 * Maybe thats alright, as its interface state being stored in the interface
				 */

				if (this.hasClass("play")) {
					Animation.play(Game);
				} else if (this.hasClass("pause")) {
					Animation.pause();
				}
			});

			controls.append(prev);
			controls.append(playPause);
			controls.append(next);

			bar.append(indicator);
			bar.append(controls);
			Y.one("body").append(bar);

			this.indicator = indicator;

			this.bar = bar;
		},

		hide: function () {
			if (this.bar) {
				this.bar.remove();
			}
		}
	};

	Y.mix(FreecellSolver, {
		currentSolution: null,
		worker: null,
		attached: false,
		supportedGames: ["Freecell"],

		isSupported: function () {
			return Game && this.supportedGames.indexOf(Game.name()) !== -1;
		},

		enable: function () {
			enabled = true;
			this.resume();
		},

		disable: function () {
			enabled = false;
			this.suspend();
		},

		resume: function (dontSolve) {
			if (!(enabled && this.isSupported())) { return; }

			this.createUI();
			this.attachEvents();

			if (!dontSolve) { this.solve(); }
		},

		suspend: function () {
			if (this.worker) {
				this.worker.terminate();
			}

			Status.hide();
		},

		isEnabled: function () {
			return enabled;
		},

		attachEvents: function () {
			if (this.attached) { return; }

			var pause = Animation.pause.bind(Animation);

			// start the solver if the current game supports it
			Y.on("afterSetup", function () {
				if (this.isSupported()) {
					this.solve();
				} else {
					this.suspend();
				}
			}.bind(this));

			// if a solution isn't currently being played, find a new solution on every new turn
			Y.on("endTurn", function (dontResolve) {
				if (dontResolve || !this.isSupported()) { return; }
				this.solve();
			}.bind(this));

			Y.on("autoPlay", function () {
				FreecellSolver.suspend();
			});

			Y.on("win", function () {
				FreecellSolver.suspend();
			});

			// human interaction stops playing the current solution
			document.documentElement.addEventListener("mousedown", function (e) {
				if (e.target.className.match(/\bpause\b/)) { return; }
				pause();
			}, true);

			this.attached = true;
		},

		createUI: function () {
			Status.show();
		},

		stop: function () {
			if (this.worker) {
				this.worker.terminate();
			}
		},

		solve: function () {
			if (!enabled) { return; }

			this.stop();

			withSelector("#solver-bar .controls", function (node) {
				node.addClass("hidden");
			});

			this.currentSolution = null;
			this.worker = new Worker("js/solver-freecell-worker.js");
			this.worker.onmessage = function (e) {
				var solution = this.currentSolution = e.data.solution;

				Animation.init(solution);
				if (solution) {
					Status.stopIndicator(true);
				} else {
					Status.stopIndicator(false);
				}
			}.bind(this);

			this.worker.postMessage({action: "solve", param: gameToState(Game)});

			window.clearTimeout(Status.indicatorTimer);
			Status.indicatorTimer = window.setTimeout(Status.updateIndicator.bind(Status), Status.delay);
		}
	}, true);

	Y.on("beforeSetup", function () {
		FreecellSolver.resume(true);
	});
}, "0.0.1", {requires: ["solitaire", "statistics", "win-display"]});
YUI.add("agnes", function (Y) {
	function inSeries(first, second) {
		return (first + 1) % 13 === second % 13;
	}

	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    seedRank = Solitaire.Util.seedRank,
	    Agnes = Solitaire.Agnes = instance(Klondike, {
		fields: ["Foundation", "Deck", "Waste", "Tableau", "Reserve"],

		height: function () { return this.Card.base.height * 5.6; },
		maxStackHeight: function () { return this.Card.height * 2.75; },

		deal: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0],
			    card;

			Klondike.deal.call(this);

			card = deck.last();
			card.moveTo(foundation);
			card.faceUp();
			card.flipPostMove();

			this.turnOver();
		},

		redeal: Solitaire.noop,

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    reserves = this.reserve.stacks,
			    waste = this.waste.stacks,
			    count,
			    target,
			    card,
			    moved = [],
			    i;

			if (deck.cards.length < 7) {
				count = 2;
				target = waste;
			} else {
				count = 7;
				target = reserves;
			}

			this.withoutFlip(function () {
				for (i = 0; i < count; i++) {
					card = deck.last();
					card.moveTo(target[i]);
					card.faceUp();
					moved.push(card);

					if (i === count - 1) {
						card.after(function () {
							Y.Array.forEach(moved, function (c) {
								Solitaire.Animation.flip(c);
							});
						});
					}
				}
			});

		},

		Waste: instance(Klondike.Waste, {
			stackConfig: {
				total: 2,
				layout: {
					hspacing: 1.5,
					top: 0,
					left: 0
				}
			},

			Stack: instance(Solitaire.Stack, {
				setCardPosition: function (card) {
					var last = this.last(),
					    top = this.top,
					    left = last ? last.left + Solitaire.Card.width * 1.5 : this.left;

					card.top = top;
					card.left = left;
				}
			})
		}),

		Reserve: {
			field: "reserve",
			stackConfig: {
				total: 7,
				layout: {
					hspacing: 1.25,
					left: 0,
					top: function () { return Solitaire.Card.height * 4.4; }
				}
			},

			Stack: instance(Klondike.Stack, {
				images: {},
				
				setCardPosition: function (card) {
					var last = this.last(),
					    top = last ? last.top + last.rankHeight : this.top,
					    left = this.left;
					    
					card.top = top;
					card.left = left;
				}
			})
		},

	        Card: instance(Klondike.Card, {
			playable: function () {
				if (this.stack.field === "reserve") {
					return this.isFree();
				} else {
					return Klondike.Card.playable.call(this);
				}
			},

			validTarget: function (stack) {
				var target = stack.last();

				switch (stack.field) {
				case "tableau":
					if (!target) {
						return this.validFreeTableauTarget();
					} else {
						return !target.isFaceDown && target.color !== this.color && inSeries(this.rank, target.rank);
					}
				case "foundation":
					return this.validFoundationTarget(target);
				default:
					return false;
				}
			},

			validFreeTableauTarget: function () {
				return inSeries(this.rank, seedRank());
			},

			validFoundationTarget: function (target) {
				if (!target) {
					return this.rank === seedRank();
				} else {
					return this.suit === target.suit &&
					       this.rank % 13 === (target.rank + 1) % 13;
				}
			}
		})
	    });
}, "0.0.1", {requires: ["klondike", "util"]});
YUI.add("golf", function (Y) {
	var Solitaire = Y.Solitaire,
	Golf = Y.Solitaire.Golf = instance(Solitaire, {
		fields: ["Deck", "Foundation", "Tableau"],

		deal: function () {
			var card,
			    stack,
			    stacks = this.tableau.stacks,
			    deck = this.deck,
			    foundation = this.foundation.stacks[0],
			    row;


			for (row = 0; row < 5; row++) {
				for (stack = 0; stack < 7; stack++) {
					card = deck.pop();
					stacks[stack].push(card);
					card.faceUp().flipPostMove(Solitaire.Animation.interval * 40);
				}
			}

			card = deck.pop();
			foundation.push(card);
			card.faceUp().flipPostMove(Solitaire.Animation.interval * 100);

			deck.createStack();
		},

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0],
			    last = deck.last();

			if (last) {
				this.withoutFlip(function () {
					last.faceUp().moveTo(foundation);
					last.after(function () {
						Solitaire.Animation.flip(last);
					});
				});
			}
		},

		isWon: function () {
			var won = true;

			this.eachStack(function (stack) {
				stack.eachCard(function (card) {
					if (card) { won = false; }

					return won;
				});
			}, "tableau");

			return won;
		},

		height: function () { return this.Card.base.height * 4; },

		Deck: instance(Solitaire.Deck, {
			field: "deck",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 3; },
					left: 0
				}
			},

			createStack: function () {
				var i, len;

				for (i = 0, len = this.cards.length; i < len; i++) {
					this.stacks[0].push(this.cards[i]);
				}
			}
		}),

		Tableau: {
			field: "tableau",
			stackConfig: {
				total: 7,
				layout: {
					hspacing: 1.25,
					top: 0,
					left: 0
				}
			}
		},

		Foundation: {
			field: "foundation",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 3; },
					left: function () { return Solitaire.Card.width * 3.75; }
				}
			}
		},

		Events: instance(Solitaire.Events, {
			dragCheck: function (e) {
				this.getCard().autoPlay();

				/* workaround because YUI retains stale drag information if we halt the event :\ */
				this._afterDragEnd();
				e.halt();
			}
		}),

		Card: instance(Solitaire.Card, {
			playable: function () {
				switch (this.stack.field) {
				case "tableau":
					return this.autoPlay(true);
				case "deck":
					return this === this.stack.last();
				case "foundation":
					return false;
				}
			},

			/*
			 * return true if the target is 1 rank away from the this card
			 */
			validTarget: function (stack) {
				if (stack.field !== "foundation") { return false; }

				var target = stack.last(),
				    diff = Math.abs(this.rank - target.rank);

				return diff === 1;
			},

			isFree: function () {
				return !this.isFaceDown && this === this.stack.last();
			},
		}),
		     
		Stack: instance(Solitaire.Stack, {
			images: {}
		})
	}, true);

	Y.Array.each(Golf.fields, function (field) {
		Golf[field].Stack = instance(Golf.Stack);
	});

	Y.mix(Golf.Tableau.Stack, {

		setCardPosition: function (card) {
			var last = this.cards.last(),
			    top = last ? last.top + last.rankHeight : this.top,
			    left = this.left;

			card.left = left;
			card.top = top;
		}
	}, true);

	Y.mix(Golf.Deck.Stack, {
		setCardPosition: function (card) {
			var last = this.last(),
			    top,
			    left,
			    zIndex;

			top = this.top;
			if (last) {
				left = last.left + card.width * 0.1;
				zIndex = last.zIndex + 1;
			} else {
				left = this.left;
				zIndex = 0;
			}

			card.top = top;
			card.left = left;
			card.zIndex = zIndex;
		}
	}, true);
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("klondike", function (Y) {

var Solitaire = Y.Solitaire,
    Klondike = Y.Solitaire.Klondike = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],
	cardsPerTurnOver: 3,

	deal: function () {
		var card,
		    stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks,
		    piles = stacks.length - 1,
		    anim = Solitaire.Animation;

		while (piles >= 0) {
			card = deck.pop();
			card.flipPostMove();

			stacks[(stacks.length - 1) - piles].push(card);
			card.faceUp();

			for (stack = stacks.length - piles; stack < stacks.length; stack++) {
				card = deck.pop();
				stacks[stack].push(card);			
			}

			piles--;
		}

		deck.createStack();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0],
		    updatePosition = Klondike.Card.updatePosition,
		    Card = Solitaire.game.Card,
		    card,
		    moved = [],
		    i, stop;

		Card.updatePosition = Solitaire.noop;

		this.withoutFlip(function () {
			for (i = deck.cards.length, stop = i - this.cardsPerTurnOver; i > stop && i; i--) {
				card = deck.last();
				moved.push(card);
				card.faceUp();

				if (i === stop + 1 || i === 1) {
					card.after(function () {
						Y.Array.forEach(moved, function (c) {
							Solitaire.Animation.flip(c);
						});
					});
				}

				card.moveTo(waste);
			}
		});

		Card.updatePosition = updatePosition;

		waste.eachCard(function (c) {
			c.updatePosition();
		});
	},

	redeal: Solitaire.Util.moveWasteToDeck,

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
		field: "foundation",
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck"
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.5; }
			}
		},
		field: "waste",
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {

			switch (this.stack.field) {
			case "tableau":
				return !this.isFaceDown;
			case "foundation":
				return false;
			case "waste":
				return this.isFree();
			case "deck":
				return true;
			}
		},

		validFoundationTarget: function (target) {
			if (!target) {
				return this.rank === 1;
			} else {
				return target.suit === this.suit && target.rank === this.rank - 1;
			}
		},

		validTarget: function (cardOrStack) {
			var target, stack;

			if (cardOrStack.field) {
				target = cardOrStack.last();
				stack = cardOrStack;
			} else {
				target = cardOrStack;
				stack = cardOrStack.stack;
			}

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return this.rank === 13;
				} else {
					return !target.isFaceDown && target.color !== this.color && target.rank === this.rank + 1;
				}
			case "foundation":
				return this.validFoundationTarget(target);
			default:
				return false;
			}
		}
	})
});

Y.Array.each(Klondike.fields, function (field) {
	Klondike[field].Stack = instance(Klondike.Stack);
});

Y.mix(Klondike.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	}
}, true);

Y.mix(Klondike.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(Klondike.Waste.Stack, {
	// always display only the last three cards
	setCardPosition: function (card) {
		var cards = this.cards,
		    last = cards.last(),
		    stack = this;

		Y.Array.each(cards.slice(-2), function (card, i) {
			card.left = stack.left;
			card.top = stack.top;
		});

		if (!cards.length) {
			card.left = stack.left;
		}

		if (cards.length === 1) {
			card.left = stack.left + 0.2 * card.width;
		} else if (cards.length > 1) {
			last.left = stack.left + 0.2 * card.width;
			last.top = stack.top;
			card.left = stack.left + 0.4 * card.width;
		}

		card.top = stack.top;
	}
}, true);

Y.mix(Klondike.Deck.Stack, {
	createNode: function () {
		Solitaire.Stack.createNode.call(this);
		this.node.on("click", Solitaire.Events.clickEmptyDeck);
		this.node.addClass("playable");
	}
}, true);


}, "0.0.1", {requires: ["util"]});
YUI.add("klondike1t", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Klondike1T = Solitaire.Klondike1T = instance(Klondike, {
		cardsPerTurnOver: 1,

		redeal: Solitaire.noop,

		Waste: instance(Klondike.Waste, {
			Stack: instance(Solitaire.Stack)
		}),

	    	Deck: instance(Klondike.Deck, {
			Stack: instance(Klondike.Deck.Stack, {
				createNode: function () {
					Klondike.Deck.Stack.createNode.call(this);
					this.node.removeClass("playable");
				}
			})
		})
	    });
}, "0.0.1", {requires: ["klondike"]});
YUI.add("flower-garden", function (Y) {

var availableMoves = 0,
    Solitaire = Y.Solitaire,
    Util = Solitaire.Util,
    FlowerGarden = Y.Solitaire.FlowerGarden = instance(Solitaire, {
	offset: {left: function () { return Solitaire.Card.base.width * 1.5; }, top: 70},
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    deck = this.deck,
		    reserve = this.reserve.stacks[0],
		    stack = 0,
		    i,
		    stacks = this.tableau.stacks;

		for (i = 0; i < 36; i++) {
			card = deck.pop();
			card.origin = {
				left: card.width * 1.25 * (i % 6),
				top: -card.height
			};
			stacks[stack].push(card);			
			card.faceUp();
			card.flipPostMove(0);

			stack++;
			if (stack === 6) { stack = 0; }
		}

		card.after(function () {
			Solitaire.Animation.flip(this);

			setTimeout(function () {
				reserve.eachCard(function (c) {
					Solitaire.Animation.flip(c);
				});
			}, Solitaire.Animation.interval * 20);
		});

		while (card = deck.pop()) {
			reserve.push(card);
			card.faceUp();
		}
	},

	height: function () { return this.Card.base.height * 5.5; },
	maxStackHeight: function () { return this.Card.height * 3.1; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 4.5; },
				left: function () { return Solitaire.Card.width * 0.2; }
			}
		},
		field: "reserve",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 6,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.25; },
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "foundation": return false;
			case "tableau": return this.createProxyStack();
			case "reserve": return true;
			}
		},

		createProxyStack: function () {
			var stack;

			switch (this.stack.field) {
			case "foundation":
				this.proxyStack = null;
				break;
			case "tableau":
				availableMoves = Util.freeTableaus().length;

				return Solitaire.Card.createProxyStack.call(this);
			case "reserve":
				stack = instance(this.stack);
				stack.cards = [this];
				this.proxyStack = stack;
				break;
			}

			return this.proxyStack;
		},

		moveTo: function (stack) {
			var cards = this.stack.cards,
			    index = cards.indexOf(this),
			    i, len;

			/*
			 * TODO: fix this hack
			 * if moveTo.call is called after the other card's positions have been saved, the card move is animated twice on undo
			 * the insertion of null is to preserve indexes and prevent this card from getting deleted on undo
			 */

			Solitaire.Card.moveTo.call(this, stack);

			cards.splice(index, 0, null);
			for (i = index + 1, len = cards.length; i < len; i++) {
				cards[i].pushPosition();
			}
			cards.splice(index, 1);
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return availableMoves > 0;
				} else {
					return target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
				break;
			}
		},

		isFree: function () {
			if (this.stack.field === "reserve") { return true; }
			else { return Solitaire.Card.isFree.call(this); }
		}
	})
}, true);

Y.Array.each(FlowerGarden.fields, function (field) {
	FlowerGarden[field].Stack = instance(FlowerGarden.Stack);
}, true);

Y.mix(FlowerGarden.Stack, {
	images: { foundation: "freeslot.png",
		  tableau: "freeslot.png" },

	validTarget: function (stack) {
		return stack.field === "tableau" && this.first().validTarget(stack);
	},

	validCard: function () {
		return availableMoves-- > 0;
	}
}, true);

Y.mix(FlowerGarden.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + card.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(FlowerGarden.Reserve.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    left = last ? last.left + card.width * 0.4 : this.left,
		    top = this.top;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "util"]});
YUI.add("forty-thieves", function (Y) {

var Solitaire = Y.Solitaire,
    FortyThieves = Y.Solitaire.FortyThieves = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],

	deal: function () {
		var card,
		    stack,
		    row,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (row = 0; row < 4; row++) {
			for (stack = 0; stack < 10; stack++) {
				card = deck.pop();
				stacks[stack].push(card);
				card.faceUp();
			}
		}

		Solitaire.Util.flipStacks(card);
		deck.createStack();
	},

	redeal: Solitaire.noop,

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0],
		    card;

		card = deck.last();
		if (card) {
			this.withoutFlip(function () {
				card.moveTo(waste);
				card.faceUp();
				card.after(function () {
					Solitaire.Animation.flip(card);
				})
			});
		}
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 2.5; }
			}
		},
		field: "foundation"
	},

	Deck: instance(Solitaire.Deck, {
		count: 2,

		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck"
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "waste"
	},

	Tableau: {
		stackConfig: {
			total: 10,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		origin: {
			left: function () {
				return Solitaire.game.deck.stacks[0].left;
			},

			top: function () {
				return Solitaire.game.deck.stacks[0].top;
			}
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return !target.isFaceDown && target.suit === this.suit && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(FortyThieves.fields, function (field) {
	FortyThieves[field].Stack = instance(FortyThieves.Stack);
});


Y.mix(FortyThieves.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(FortyThieves.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(FortyThieves.Deck.Stack, {
	images: {deck: null}
}, true);


}, "0.0.1", {requires: ["solitaire", "util"]});
YUI.add("freecell", function (Y) {

var Solitaire = Y.Solitaire,
    Freecell = Y.Solitaire.Freecell =  instance(Solitaire, {
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    stack = 0,
		    stacks = this.tableau.stacks,
		    delay = Solitaire.Animation.interval * 50;

		while (card = this.deck.pop()) {
			stacks[stack].push(card);			
			card.faceUp();
			card.flipPostMove(delay);
			stack++;
			if (stack === stacks.length) { stack = 0; }
		}
	},

	openSlots: function (exclude) {
		var total = 1,
		    freeTableaus = 0,
		    i,
		    stack,
		    rStacks = this.reserve.stacks,
		    tStacks = this.tableau.stacks;

		for (i = 0; i < rStacks.length; i++) {
			stack = rStacks[i];
			!stack.last() && total++;
		}

		for (i = 0; i < tStacks.length; i++) {
			stack = tStacks[i];
			exclude !== stack && !tStacks[i].last() && freeTableaus++;
		}

		total *= Math.pow(2, freeTableaus);

		return total;
	},

	Stack: instance(Solitaire.Stack),

	height: function () { return this.Card.base.height * 5; },

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 6; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "reserve",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "reserve":
				return true;
			case "tableau":
				return this.createProxyStack();
			case "foundation": 
				return false;
			}
		},

		createProxyStack: function () {
			var stack = Solitaire.Card.createProxyStack.call(this);

			this.proxyStack = stack && stack.cards.length <= Solitaire.game.openSlots(stack) ? stack : null;
			return this.proxyStack;
		},

		validTableauTarget: function (card) {
			return card.color !== this.color && card.rank === this.rank + 1;
		},

		validTarget: function (cardOrStack) {
			var stack, target;

			if (cardOrStack.field) {
				stack = cardOrStack;
				target = stack.last();
			} else {
				target = cardOrStack;
				stack = target.stack;
			}

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return this.validTableauTarget(target);
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			case "reserve":
				return !target;
				break;
			}
		}
	})
});

Y.Array.each(Freecell.fields, function (field) {
	Freecell[field].Stack = instance(Freecell.Stack);
}, true);

Y.mix(Freecell.Stack, {
	validTarget: function (stack) {
		if (stack.field !== "tableau" ||
		    !this.first().validTarget(stack)) { return false; }

		return this.cards.length <= Solitaire.game.openSlots(stack, this.last());
	}
}, true);

Y.mix(Freecell.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("grandfathers-clock", function (Y) {

function wrap(array, index) {
	var len = array.length;

	index %= len;
	if (index < 0) { index += len; }

	return array[index];
}

function inRange(low, high, value) {
	if (low <= high) {
		return low <= value && value <= high;
	} else {
		return low <= value || value <= high;
	}
}

Y.namespace("Solitaire.GClock");

var Solitaire = Y.Solitaire,
    GClock = Y.Solitaire.GClock = instance(Solitaire, {
	fields: ["Foundation", "Tableau"],

	deal: function () {
		var card,
		    deck = this.deck,
		    cards = deck.cards,
		    clock = [],
		    suits = ["d", "c", "h", "s"],
		    found,
		    stack = 0,
		    i = 51, rank,
		    foundations = this.foundation.stacks,
		    stacks = this.tableau.stacks,
		    last;

		while (i >= 0) {
			card = cards[i];
			found = false;

			for (rank = 2; rank <= 13; rank++) {
				if (card.rank === rank && card.suit === wrap(suits, rank)) {
					found = true;
					cards.splice(i, 1);
					clock[rank - 2] = card;
					break;
				}
			}

			if (!found) {
				stacks[stack].push(card);
				stack = (stack + 1) % 8;
				card.faceUp();
				last = card;
			}
			i--;
		}

		for (i = 0; i < 12; i++) {
			foundations[(i + 2) % 12].push(clock[i]);
			clock[i].faceUp();
			clock[i].flipPostMove(Solitaire.Animation.interval);
		}

		Solitaire.Util.flipStacks(last);
	},

	height: function () { return this.Card.base.height * 5.75; },
	maxStackHeight: function () { return this.Card.height * 3; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 12,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 3; },
				left: function () { return Solitaire.Card.width * 3.25; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Tableau: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 7.25; }
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		origin: {
			left: function () {
				return Solitaire.game.foundation.stacks[9].left;
			},

			top: function () {
				return Solitaire.game.foundation.stacks[0].top;
			}
		},

		createProxyStack: function () {
			var stack;

			switch (this.stack.field) {
			case "foundation":
				this.proxyStack = null;
				break;
			case "tableau":
				return Solitaire.Card.createProxyStack.call(this);
			}

			return this.proxyStack;
		},

		validTarget: function (stack) {
			var target = stack.last(),
			    rank,
			    hour;

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				hour = (stack.index() + 3) % 12;
				rank = target.rank;

				return  target.suit === this.suit &&
					(target.rank + 1) % 13 === this.rank % 13 &&
					inRange(stack.first().rank, hour, this.rank);
				break;
			default:
				return false;
				break;
			}
		}
	})
});

Y.Array.each(GClock.fields, function (field) {
	GClock[field].Stack = instance(GClock.Stack);
}, true);

Y.mix(GClock.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" && this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(GClock.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	},

	layout: function (layout, i) {
		Solitaire.Stack.layout.call(this, layout, i);
		if (i > 3) {
			this.top = normalize(layout.top) + Solitaire.Card.height * 3.75;
			this.left -= Solitaire.Card.width * 5;
		}
	}
}, true);

Y.mix(GClock.Foundation.Stack, {
	index: function () {
		return GClock.foundation.stacks.indexOf(this);
	},

	layout: function (layout, i) {
		var top = Math.sin(Math.PI * i / 6) * Solitaire.Card.height * 2.25,
		    left = Math.cos(Math.PI * i / 6) * Solitaire.Card.width * 3;

		this.top = top + normalize(layout.top);
		this.left = left + normalize(layout.left);
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "util"]});
YUI.add("monte-carlo", function (Y) {

var Solitaire = Y.Solitaire,
    MonteCarlo = Y.Solitaire.MonteCarlo = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.createEvents.call(this);

		Y.delegate("click", Solitaire.Events.clickEmptyDeck, Solitaire.selector, ".stack");

		Y.on("solitaire|endTurn", this.deckPlayable);
		Y.on("solitaire|afterSetup", this.deckPlayable);
	},

	deckPlayable: function () {
		var gap = false,
		    node = Game.deck.stacks[0].node;

		Game.eachStack(function (s) {
			if (!gap && Y.Array.indexOf(s.cards, null) !== -1) {
				gap = true;
			}
		}, "tableau");

		if (gap) {
			node.addClass("playable");
		} else {
			node.removeClass("playable");
		}
	},

	deal: function () {
		var card,
		    stack,
		    i,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (stack = 0; stack < 5; stack++) {
			for (i = 0; i < 5; i++) {
				card = deck.pop();
				stacks[stack].push(card);
				card.faceUp();
			}
		}

		card.after(function () {
			var x = 2,
			    y = 2,
			    xinc = 1,
			    yinc = 0,
			    xdir = 1,
			    ydir = -1,
			    spiralLength = -1,
			    factor = 1,
			    run = 0,
			    delay = 50, interval = 70,
			    card;

			for (i = 0; i < 25; i++) {
				if (i === (spiralLength + 1) * factor) {
					spiralLength++;
					factor++;
				}

				card = stacks[y].cards[x];

				setTimeout(function (c) {
					Solitaire.Animation.flip(c);
				}.partial(card), delay);

				delay += interval;

				x += xinc;
				y += yinc;

				if (run++ === spiralLength) {
					run = 0;
					if (xinc === 1) {
						xdir = -1;
					} else if (xinc === -1) {
						xdir = 1;
					}

					if (yinc === 1) {
						ydir = -1;
					} else if (yinc === -1) {
						ydir = 1;
					}

					xinc += xdir;
					yinc += ydir;
				}
			}
		});

		deck.createStack();
	},

	/*
	 * 1) gather all tableau cards into an array
	 * 2) clear every tableau row/stack, then redeal the cards from the previous step onto the tableau
	 * 3) deal cards from the deck to fill the remaining free rows
	 */
	redeal: function () {
		var stacks = this.tableau.stacks,
		    deck = this.deck.stacks[0],
		    cards = Y.Array.reduce(stacks, [], function (compact, stack) {
			return compact.concat(stack.compact());
			}),
		    len = cards.length,
		    card,
		    s, i;

		Y.Array.each(stacks, function (stack) {
			stack.node.remove();
			stack.cards = [];
			stack.createNode();
		});

		for (i = s = 0; i < len; i++) {
			if (i && !(i % 5)) { s++; }
			stacks[s].push(cards[i]);
		}

		this.withoutFlip(function () {
			while (i < 25 && deck.cards.length) {
				if (!(i % 5)) { s++; }
				card = deck.last();
				card.moveTo(stacks[s]);
				card.faceUp();
				card.node.setStyle("zIndex", 100 - i);
				i++;
				card.flipPostMove(Solitaire.Animation.interval * 5);
			}
		});

	},

	height: function () { return this.Card.base.height * 6; },

	Stack: instance(Solitaire.Stack, {
		images: { deck: "freeslot.png" },

		updateDragGroups: function () {
			var active = Solitaire.activeCard;

			Y.Array.each(this.cards, function (c) {
				if (!c) { return; }

				if (active.validTarget(c)) {
					c.node.drop.addToGroup("open");
				} else
					c.node.drop.removeFromGroup("open");
			});
		},

		index: function () { return 0; }
	}),

	Events: instance(Solitaire.Events, {
		drop: function (e) {
			var active = Solitaire.activeCard,
			    foundation = Solitaire.game.foundation.stacks[0],
			    target = e.drop.get("node").getData("target");

			if (!active) { return; }

			Solitaire.stationary(function () {
				target.moveTo(foundation);
				active.moveTo(foundation);
			});

			Solitaire.endTurn();
		}
	}),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 10.5; }
			}
		},
		field: "foundation"
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 2}
			}
		},
		field: "deck",

		createStack: function () {
			var i, len;

			for (i = 0, len = this.cards.length; i < len; i++) {
				this.stacks[0].push(this.cards[i]);
			}
		}
	}),

	Tableau: {
		stackConfig: {
			total: 5,
			layout: {
				cardGap: 1.25,
				vspacing: 1.25,
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.5; }
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		row: function () {
			return this.stack.index();
		},

		column: function () {
			return this.stack.cards.indexOf(this);
		},

		/*
		 * return true if:
		 * 1) the target card is free
		 * 2) both cards are the same rank
		 * 3) both cards are adjacent vertically, horizontally, or diagonally
		 */

		validTarget: function (card) {
			if (this === card || !(this.rank === card.rank && card.isFree())) { return false; }

			return Math.abs(card.row() - this.row()) <= 1 &&
				Math.abs(card.column() - this.column()) <= 1;
		},

		createProxyStack: function () {
			var stack = null;

			if (this.isFree()) {
				stack = instance(this.stack);
				stack.cards = this.proxyCards();
			}

			this.proxyStack = stack;

			return this.proxyStack;
		},

		proxyCards: function () {
			return [this];
		},

		isFree: function () {
			return this.stack.field === "tableau";
		},

		turnOver: function () {
			this.stack.field === "deck" && Solitaire.game.redeal();
		}
	})
});

Y.Array.each(MonteCarlo.fields, function (field) {
	MonteCarlo[field].Stack = instance(MonteCarlo.Stack);
});

// Each tableau row is treated as a "stack"
Y.mix(MonteCarlo.Tableau.Stack, {
	deleteItem: function (card) {
		var cards = this.cards,
		    i = cards.indexOf(card);

		if (i !== -1) { cards[i] = null; }
	},

	setCardPosition: function (card) {
		var last = this.cards.last(),
		    layout = MonteCarlo.Tableau.stackConfig.layout,
		    top = this.top,
		    left = last ? last.left + card.width * layout.cardGap : this.left;

		card.left = left;
		card.top = top;
	},

	compact: function () {
		var cards = this.cards,
		    card,
		    compact = [],
		    i, len;

		for (i = 0, len = cards.length; i < len; i++) {
			card = cards[i];
			if (card) {
				compact.push(card);
				card.pushPosition();
			}
		}

		return compact;
	},

	index: function () {
		return Solitaire.game.tableau.stacks.indexOf(this);
	}
}, true);

Y.mix(MonteCarlo.Deck.Stack, {
	updateDragGroups: function () {
		var active = Solitaire.activeCard,
		    card = this.last();

		if (!card) { return; }

		if (active.validTarget(card)) {
			card.node.drop.addToGroup("open");
		} else {
			card.node.drop.removeFromGroup("open");
		}
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "array-extras"]});
YUI.add("pyramid", function (Y) {

var Solitaire = Y.Solitaire,
    Pyramid = Y.Solitaire.Pyramid = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],
	width: function () { return Solitaire.Card.base.width * 10; },

	deal: function () {
		var card,
		    stack,
		    i,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (stack = 0; stack < 7; stack++) {
			for (i = 0; i <= stack; i++) {
				card = deck.pop();
				stacks[stack].push(card);
				card.faceUp();
			}
		}

		card.after(function () {
			var center = Math.floor(stacks.length / 2),
			    length = stacks.length,
			    left, right,
			    row,
			    cards,
			    i = 0,
			    delay = 0, interval = 200;

			left = right = center;

			while (left >= 0) {
				row = length - 1;
				cards = [];

				do {
					cards = Y.Array.unique(
						cards.concat(stacks[row].cards[left],
						stacks[row].cards[right]));

					row--;
					right--;
				} while (right >= left);

				Y.Array.each(cards, function (c) {
					setTimeout(function () {
						Solitaire.Animation.flip(c);
					}, delay);
				});

				i++;
				left = center - i;
				right = center + i;
				delay += interval;
			}

			setTimeout(function () {
				Solitaire.Animation.flip(deck.last());
			}, delay);
		});

		deck.createStack();
		card = deck.last();
		card.faceUp();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0];

		if (deck.cards.length === 1) { return; }
		deck.last().moveTo(waste);
	},

	height: function () { return this.Card.base.height * 4.85; },

	Stack: instance(Solitaire.Stack, {
		images: {},

		updateDragGroups: function () {
			var active = Solitaire.activeCard;

			Y.Array.each(this.cards, function (c) {
				if (!c) { return; }

				if (active.validTarget(c)) {
					c.node.drop.addToGroup("open");
				} else {
					c.node.drop.removeFromGroup("open");
				}
			});
		}
	}),

	Events: instance(Solitaire.Events, {
		dragCheck: function (e) {
			if (!Solitaire.game.autoPlay.call(this)) {
				Solitaire.Events.dragCheck.call(this);
			}
		},

		drop: function (e) {
			var active = Solitaire.activeCard,
			    foundation = Solitaire.game.foundation.stacks[0],
			    target = e.drop.get("node").getData("target");

			if (!active) { return; }

			Solitaire.stationary(function () {
				target.moveTo(foundation);
				active.moveTo(foundation);
			});

			Solitaire.endTurn();
		}
	}),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 8; }
			}
		},
		field: "foundation"
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck",

		createStack: function () {
			var i, len;

			for (i = 0, len = this.cards.length; i < len; i++) {
				this.stacks[0].push(this.cards[i]);
			}
		}
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.5; }
			}
		},
		field: "waste"
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				vspacing: 0.6,
				hspacing: -0.625,
				cardGap: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 5; }
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		validTarget: function (card) {
			if (card.field === "foundation") { // "card" is actually a stack :/
				return this.isFree() && this.rank === 13;
			}

			if (card.isFree()) {
				return this.rank + card.rank === 13;
			}

			return false;
		},

		createProxyNode: function () {
			return this.rank === 13 ?
				"" :
				Solitaire.Card.createProxyNode.call(this);
		},

		createProxyStack: function () {
			var stack = null;

			if (this.isFree()) {
				stack = instance(this.stack);
				stack.cards = this.proxyCards();
			}

			this.proxyStack = stack;

			return this.proxyStack;
		},

		proxyCards: function () {
			return [this];
		},

		isFree: function () {
			var stack = this.stack,
			    stackIndex = stack.index(),
			    index = stack.cards.indexOf(this),
			    game = Solitaire.game,
			    next = stack.next();

			if (stack.field === "deck" || stack.field === "waste") {
				return !this.isFaceDown && this === this.stack.last();
			} else {
				return !(this.stack.field === "foundation" ||
					next &&
					(next.cards[index] || next.cards[index + 1]));
			}
		},

		turnOver: function () {
			this.stack.field === "deck" && !this.isFaceDown && Solitaire.game.turnOver();
		}
	})
});

Y.Array.each(Pyramid.fields, function (field) {
	Pyramid[field].Stack = instance(Pyramid.Stack);
});

Y.mix(Pyramid.Tableau.Stack, {
	deleteItem: function (card) {
		var cards = this.cards,
		    i = cards.indexOf(card);

		if (i !== -1) { cards[i] = null; }
	},

	setCardPosition: function (card) {
		var layout = Pyramid.Tableau.stackConfig.layout,
		    last = this.cards.last(),
		    top = this.top,
		    left = last ? last.left + card.width * layout.cardGap : this.left;

		card.left = left;
		card.top = top;
		card.zIndex = this.index() * 10;
	}
}, true);

Y.mix(Pyramid.Deck.Stack, {
	deleteItem: function (card) {
		Pyramid.Stack.deleteItem.call(this, card);
		this.update();
	},

	update: function (undo) {
		var last = this.last();

		last && last.faceUp(undo);
	},


	updateDragGroups: function () {
		var active = Solitaire.activeCard,
		    card = this.last();

		if (!card) { return; }

		if (active.validTarget(card)) {
			card.node.drop.addToGroup("open");
		} else {
			card.node.drop.removeFromGroup("open");
		}
	}
}, true);

Pyramid.Waste.Stack.updateDragGroups = Pyramid.Deck.Stack.updateDragGroups;

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("russian-solitaire", function (Y) {

  var Solitaire = Y.Solitaire,
    Yukon = Solitaire.Yukon,
    RussianSolitaire = Solitaire.RussianSolitaire = instance(Yukon, {
      Card: instance(Yukon.Card)
    });

  RussianSolitaire.Card.validTarget = function (stack) {
    var target = stack.last();

    switch (stack.field) {
    case "tableau":
      if (!target) {
         return this.rank === 13;
       } else {
         return !target.isFaceDown && target.suit === this.suit && target.rank === this.rank + 1;
       }
    case "foundation":
      if (!target) {
        return this.rank === 1;
      } else {
        return target.suit === this.suit && target.rank === this.rank - 1;
      }
    default:
      return false;
    }
  };
}, "0.0.1", {requires: ["yukon"]});
YUI.add("scorpion", function (Y) {

var Solitaire = Y.Solitaire,
    Scorpion = Solitaire.Scorpion = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.AutoStackClear.register();
		Solitaire.createEvents.call(this);
	},

	deal: function () {
		var card,
		    stack,
		    row,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (row = 0; row < 7; row++) {
			for (stack = 0; stack < 7; stack++) {
				card = deck.pop();

				stacks[stack].push(card);
				if (!(row < 3 && stack < 4)) { card.faceUp(); }
			}
		}

		Solitaire.Util.flipStacks(card);
		deck.createStack();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    stacks = this.tableau.stacks,
		    card,
		    i, len;

		this.withoutFlip(function () {
			for (i = 0; i < 3; i++) {
				card = deck.last().faceUp();
				card.flipPostMove(0);
				card.moveTo(stacks[i]);
			}
		});

		setTimeout(function () {
			Game.eachStack(function (stack) {
				Y.fire("tableau:afterPush", stack);
				Game.endTurn();
			}, "tableau");
		}, 0);
	},

	height: function () { return this.Card.base.height * 5.6; },

	Stack: instance(Solitaire.Stack),

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				top: 0,
				left: function () { return Solitaire.Card.width * 9; }
			},
		},
		field: "deck",

		createStack: function () {
			var i, len;

			for (i = this.cards.length - 1; i >= 0; i--) {
				this.stacks[0].push(this.cards[i]);
			}
		},
	}),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				top: function () { return Solitaire.Card.height * 1.1; },
				left: function () { return Solitaire.Card.width * 9; },
				vspacing: 1.1,
			}
		},
		field: "foundation"
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			var field = this.stack.field;

			return field === "deck" || field === "tableau" && !this.isFaceDown;
		},

		validTarget: function (stack) {
			var target = stack.last();

			if (stack.field !== "tableau") { return false; }

			if (!target) {
				return this.rank === 13;
			} else {
				return !target.isFaceDown && target.suit === this.suit && target.rank === this.rank + 1;
			}
		}
	})
});

Y.Array.each(Scorpion.fields, function (field) {
	Scorpion[field].Stack = instance(Scorpion.Stack);
});


Y.mix(Scorpion.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validProxy: function (card) {
		return true;
	},

	validTarget: function (stack) {
		var rank,
		    cards = this.cards,
		    i;

		switch (stack.field) {
		case "tableau":
			return this.first().validTarget(stack);
			break;
		case "foundation":
			rank = this.last.rank;
			if (cards.length !== 13) { return false; }

			for (i = 0; i < 13; i++) {
				if (cards[i].rank !== rank) { return false; }
			}

			return true;
			break;
		}
	}
}, true);

Y.mix(Scorpion.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["auto-stack-clear", "util"]});
YUI.add("spider", function (Y) {

var availableMoves = 0,
    Solitaire = Y.Solitaire,
    Util = Solitaire.Util,
    Spider = Solitaire.Spider = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.AutoStackClear.register();
		Solitaire.createEvents.call(this);
	},

	deal: function () {
		var stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks,
		    card,
		    row,
		    anim = Solitaire.Animation,
		    delay = anim.interval * stacks.length * 4;

		for (row = 0; row < 5; row++) {
			for (stack = 0; stack < 10; stack++) {
				if (stack < 4 || row < 4) {
					stacks[stack].push(deck.pop());			
				}
			}
		}

		for (stack = 0; stack < 10; stack++) {
			card = deck.pop();
			card.flipPostMove(delay);
			stacks[stack].push(card);
			card.faceUp();
		}

		deck.createStack();
	},

	redeal: Solitaire.noop,

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    anim = Solitaire.Animation,
		    i, len;

		if (Util.hasFreeTableaus()) {
			return;
		}

		this.withoutFlip(function () {
			this.eachStack(function (stack) {
				var card = deck.last();

				if (card) {
					card.faceUp().moveTo(stack).after(function () {
						this.stack.updateCardsPosition();
						anim.flip(this);
					});
				}
			}, "tableau");
		});

		setTimeout(function () {
			Game.eachStack(function (stack) {
				Y.fire("tableau:afterPush", stack);
				Game.endTurn();
			}, "tableau");
		}, 0);
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 2.5; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Deck: instance(Solitaire.Deck, {
		count: 2,

		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck"
	}),

	Tableau: {
		stackConfig: {
			total: 10,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "tableau":
				return this.createProxyStack();
			case "deck": 
				return !Util.hasFreeTableaus();
			case "foundation":
				return false;
			}
		},

		createProxyStack: function () {
			availableMoves = Util.freeTableaus().length;

			return Solitaire.Card.createProxyStack.call(this);
		},

		validTarget: function (stack) {
			if (stack.field !== "tableau") { return false; }

			var target = stack.last();

			return !target ? availableMoves > 0 : !target.isFaceDown && target.rank === this.rank + 1;
		}
	})
});

Y.Array.each(Spider.fields, function (field) {
	Spider[field].Stack = instance(Spider.Stack);
});


Y.mix(Spider.Stack, {
	validCard: function (card) {
		if (card.suit === this.cards.last().suit) {
			return true;
		} else {
			return availableMoves-- > 0;
		}
	},

	validTarget: function (stack) {
		switch (stack.field) {
		case "tableau":
			return this.first().validTarget(stack);
			break;
		case "foundation":
			return this.cards.length === 13;
			break;
		}
	}
}, true);

Y.mix(Spider.Deck.Stack, {
	setCardPosition: function (card) {
		var numCards = this.cards.length,
		    numTableaus = Solitaire.game.tableau.stacks.length;

		card.top = this.top;
		card.left = this.left + Math.floor(numCards / numTableaus) * card.width * 0.2;
	}
}, true);

Y.mix(Spider.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);
}, "0.0.1", {requires: ["auto-stack-clear", "util"]});
YUI.add("spider1s", function (Y) {
	var Spider = Y.Solitaire.Spider1S = instance(Y.Solitaire.Spider);

	Spider.Deck = instance(Y.Solitaire.Spider.Deck, {
		suits: ["s"],
		count: 8
	});
}, "0.0.1", {requires: ["spider"]});
YUI.add("spider2s", function (Y) {
	var Spider = Y.Solitaire.Spider2S = instance(Y.Solitaire.Spider);

	Spider.Deck = instance(Y.Solitaire.Spider.Deck, {
		suits: ["s", "h"],
		count: 4
	});
}, "0.0.1", {requires: ["spider"]});
YUI.add("spiderette", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Spider = Solitaire.Spider,
	    Spiderette = Y.Solitaire.Spiderette = instance(Spider, {
		height: Klondike.height,
		deal: Klondike.deal,

		Tableau: instance(Spider.Tableau, {
			stackConfig: Klondike.Tableau.stackConfig
		}),
		Foundation: instance(Spider.Foundation, {
			stackConfig: Klondike.Foundation.stackConfig
		}),

		Deck: instance(Spider.Deck, {
			count: 1
		})
	    });
}, "0.0.1", {requires: ["klondike", "spider"]});
YUI.add("tri-towers", function (Y) {
	var Solitaire = Y.Solitaire,
	TriTowers = Y.Solitaire.TriTowers = instance(Solitaire, {
		fields: ["Deck", "Foundation", "Tableau"],

		width: function () { return this.Card.base.width * 15; },
		height: function () { return this.Card.base.height * 5; },
		createEvents: function () {
			Y.on("solitaire|endTurn", function () {
				var tableaus = Solitaire.game.tableau.stacks,
				    i;

				for (i = 0; i < 3; i++) {
					Y.fire("tableau:afterPop", tableaus[i]);
				}
			});

			Solitaire.createEvents.call(this);
		},

		deal: function () {
			var card,
			    stack,
			    stacks = this.tableau.stacks,
			    deck = this.deck,
			    foundation = this.foundation.stacks[0],

			    i, stackLength;

			for (stack = 0; stack < 4; stack++) {
				stackLength = (stack + 1) * 3;

				for (i = 0; i < stackLength; i++) {
					card = deck.pop();
					stacks[stack].push(card);
					if (stack === 3) {
						card.faceUp();
					}
				}
			}

			card.after(function () {
				Solitaire.Animation.flip(foundation.last());
				stacks[3].eachCard(function (c) {
					Solitaire.Animation.flip(c);
				});
			});

			card = deck.pop();
			foundation.push(card);
			card.faceUp();

			deck.createStack();
		},

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0],
			    last = deck.last();

			last && last.faceUp().moveTo(foundation);
		},

		isWon: function () {
			var won = true;

			this.eachStack(function (stack) {
				stack.eachCard(function (card) {
					if (card) { won = false; }

					return won;
				});
			}, "tableau");

			return won;
		},

		Deck: instance(Solitaire.Deck, {
			field: "deck",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 4; },
					left: 0
				}
			},

			createStack: function () {
				var i, len;

				for (i = 0, len = this.cards.length; i < len; i++) {
					this.stacks[0].push(this.cards[i]);
				}
			}
		}),

		Tableau: {
			field: "tableau",
			stackConfig: {
				total: 4,
				layout: {
					rowGaps: [3.75, 2.5, 1.25, 0],
					cardGap: 1.25,
					vspacing: 0.6,
					hspacing: -0.625,
					top: 0,
					left: function () { return Solitaire.Card.width * 1.875; }
				}
			}
		},

		Foundation: {
			field: "foundation",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 4; },
					left: function () { return Solitaire.Card.width * 4; }
				}
			}
		},

		Events: instance(Solitaire.Events, {
			dragCheck: function (e) {
				this.getCard().autoPlay();

				/* workaround because YUI retains stale drag information if we halt the event :\ */
				this._afterDragEnd();
				e.halt();
			}
		}),

		Card: instance(Solitaire.Card, {
			/*
			 * return true if the target is 1 rank away from the this card
			 * Aces and Kings are valid targets for each other
			 */
			validTarget: function (stack) {
				if (stack.field !== "foundation") { return false; }

				var card = stack.last(),
				    diff = Math.abs(this.rank - card.rank);

				return diff === 1 || diff === 12;
			},

			playable: function () {
				var stack = this.stack;

				switch (stack.field) {
				case "deck":
					return this === stack.last();
				case "tableau":
					return this.autoPlay(true);
				default:
					return false;
				}
			},

			isFree: function () {
				var stack = this.stack,
				    next = stack.next(),
				    tower = this.tower(),
				    index = stack.cards.indexOf(this),
				    i;

				if (stack.field !== "tableau") { return false; }

				if (!next) { return true; }

				for (i = 0; i < 2; i++) {
					if (next.cards[index + tower + i]) { return false; }
				}

				return true;
			},

			tower: function () {
				var stack = this.stack,
				    index = stack.cards.indexOf(this),
				    stackIndex = stack.index() + 1;

				return Math.floor(index / stackIndex);
			}
		}),
		     
		Stack: instance(Solitaire.Stack, {
			images: {}
		})
	}, true);

	Y.Array.each(TriTowers.fields, function (field) {
		TriTowers[field].Stack = instance(TriTowers.Stack);
	});

	Y.mix(TriTowers.Tableau.Stack, {
		deleteItem: function (card) {
			var cards = this.cards,
			    i = cards.indexOf(card);

			if (i !== -1) { cards[i] = null; }
		},

		setCardPosition: function (card) {
			var last = this.last(),
			    top = this.top,
			    left,
			    index,
			    stackIndex,

			    layout = TriTowers.Tableau.stackConfig.layout,
			    rowGaps = layout.rowGaps,
			    cardGap = layout.cardGap;

			if (last) {
				left = last.left + card.width * cardGap;
				index = this.cards.length;
				stackIndex = this.index() + 1;

				if (!(index % stackIndex)) { left += rowGaps[stackIndex - 1] * card.width; }
			} else {
				left = this.left;
			}

			card.top = top;
			card.left = left;
			card.zIndex = this.index() * 10;
		}
	}, true);

	Y.mix(TriTowers.Deck.Stack, {
		setCardPosition: function (card) {
			var last = this.last(),
			    top,
			    left,
			    zIndex;

			top = this.top;
			if (last) {
				left = last.left + card.width * 0.1;
				zIndex = last.zIndex + 1;
			} else {
				left = this.left;
				zIndex = 0;
			}

			card.top = top;
			card.left = left;
			card.zIndex = zIndex;
		}
	}, true);
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("will-o-the-wisp", function (Y) {

	var Solitaire = Y.Solitaire,
	    WillOTheWisp = Y.Solitaire.WillOTheWisp = instance(Solitaire.Spiderette, {
		deal: function () {
			var deck = this.deck,
			    row;

			for (row = 0; row < 3; row++) {
				this.eachStack(function (stack) {
					var card = deck.pop();

					stack.push(card);
					if (row === 2) {
						card.faceUp();
						card.flipPostMove();
					}
				}, "tableau");
			}

			deck.createStack();
		}
	    });
}, "0.0.1", {requires: ["spiderette"]});
YUI.add("yukon", function (Y) {

var Solitaire = Y.Solitaire,
    Yukon = Solitaire.Yukon = instance(Solitaire, {
	fields: ["Foundation", "Tableau"],

	deal: function () {
		var card,
		    piles = 6,
		    stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks,
		    delay = Solitaire.Animation.interval * 50;

		while (piles >= 0) {
			card = deck.pop();
			stacks[6 - piles].push(card);
			card.faceUp();
			card.flipPostMove(delay);

			for (stack = 7 - piles; stack < 7; stack++) {
				card = deck.pop();
				stacks[stack].push(card);			
			}
			piles--;
		}

		stack = 1;
		while (deck.cards.length) {
			card = deck.pop();
			stacks[stack].push(card);
			card.faceUp();
			card.flipPostMove(delay);

			stack = (stack % 6) + 1;
		}
	},

	height: function () { return this.Card.base.height * 4.8; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				vspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 9; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			return this.stack.field === "tableau" && !this.isFaceDown;
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return this.rank === 13;
				} else {
					return !target.isFaceDown && target.color !== this.color && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(Yukon.fields, function (field) {
	Yukon[field].Stack = instance(Yukon.Stack);
});


Y.mix(Yukon.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validProxy: function (card) {
		return true;
	}
}, true);

Y.mix(Yukon.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("simple-simon", function (Y) {
	var Solitaire = Y.Solitaire,
	    SimpleSimon = Solitaire.SimpleSimon = instance(Solitaire.Spider, {
		fields: ["Foundation", "Tableau"],

		deal: function () {
			var card,
			    stack = 0,
			    stacks = this.tableau.stacks,
			    last = stacks.length,
			    delay = Solitaire.Animation.interval * 10;

			while (card = this.deck.pop()) {
				stacks[stack].push(card);
				card.faceUp();
				card.flipPostMove(delay);
				stack++;
				if (stack === last) {
					stack = 0;
					last--;
				}
			}
		},

		turnOver: Solitaire.noop,
		Deck: instance(Solitaire.Deck),
		Foundation: instance(Solitaire.Spider.Foundation),

		Card: instance(Solitaire.Spider.Card, {
			origin: {
				left: function () {
					return Solitaire.Card.width * 6;
				},
				top: function () {
					return Solitaire.container().get("winHeight") - Solitaire.Card.height * 1.25;
				}
			}
		})
	});

	SimpleSimon.Foundation.stackConfig = {
		total: 4,
		layout: {
			hspacing: 1.25,
			top: 0,
			left: function () { return Solitaire.Card.width * 3.75; }
		}
	};
}, "0.0.1", {requires: ["spider"]});
YUI.add("bakersdozen", function (Y) {

var Solitaire = Y.Solitaire,
    BakersDozen = Y.Solitaire.BakersDozen = instance(Solitaire, {
	fields: ["Foundation", "Tableau"],

	deal: function () {
		var card,
		    last,
		    cards,
		    stack = 0,
		    stacks = this.tableau.stacks,
		    delay = 200,
		    interval = 150,
		    game = this,
    		    i;

		for (stack = 0; stack < 13; stack++) {
			for (i = 0; i < 4; i++) {
				card = this.deck.pop();
				stacks[stack].push(card);
				card.faceUp();
			}

			cards = stacks[stack].cards;

			for (i = 1; i < 4; i++) {
				if (cards[i].rank === 13) {
	    				card = cards.splice(i, 1)[0];
					cards.unshift(card);
	    			}
			}
		}

		last = stacks[stacks.length - 1].last();
		Solitaire.Util.flipStacks(last);
	},

	height: function () { return this.Card.base.height * 5; },
	maxStackHeight: function () { return Solitaire.Card.height * 2.5; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				vspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 10.5; }
			}
		},
		field: "foundation",
	},

	Tableau: {
		stackConfig: {
			total: 13,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "tableau",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			return this.stack.field === "tableau" && this === this.stack.last();
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return false
				} else {
					return target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(BakersDozen.fields, function (field) {
	BakersDozen[field].Stack = instance(BakersDozen.Stack);
});


Y.mix(BakersDozen.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(BakersDozen.Tableau.Stack, {
	images: {},

	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	},

	layout: function (layout, i) {
		Solitaire.Stack.layout.call(this, layout, i);

		if (i > 6) {
			this.top += Solitaire.Card.height * 2.75;
			this.left -= Solitaire.Card.width * 8.1;
		}
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "util"]});
YUI.add("eightoff", function (Y) {

var Solitaire = Y.Solitaire,
    Eightoff = Y.Solitaire.Eightoff =  instance(Solitaire, {
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    stack,
		    tableau = this.tableau.stacks,
		    reserve = this.reserve.stacks,
    		    i;

		for (i = 0, stack = 0; i < 48; i++) {
			card = this.deck.pop();
			tableau[stack].push(card);			
			card.faceUp();
			card.flipPostMove(0);
			stack++;
			if (stack === 8) { stack = 0; }
		}

		for (i = 0, stack = 0; i < 4; i++) {
			card = this.deck.pop();
			reserve[stack].push(card);
			card.faceUp();
			card.flipPostMove(0);
			stack++;
		}
	},

	openSlots: function (exclude) {
		var total = 1,
		    i,
		    rStacks = this.reserve.stacks;

		for (i = 0; i < rStacks.length; i++) {
			if (!rStacks[i].last()) {
				total++;
			}
		}

		return total;
	},

	Stack: instance(Solitaire.Stack),

	height: function () { return this.Card.base.height * 5; },

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				vspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 10.5; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "reserve",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.25; },
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		origin: {
			left: function () {
				return Solitaire.Card.width * 5;
			},

			top: function () {
				return Solitaire.container().get("winHeight") - Solitaire.Card.height * 1.2;
			}
		},

		playable: function () {
			switch (this.stack.field) {
			case "reserve":
				return true;
			case "tableau":
				return this.createProxyStack();
			case "foundation": 
				return false;
			}
		},

		createProxyStack: function () {
			var stack = Solitaire.Card.createProxyStack.call(this);

			this.proxyStack = stack && stack.cards.length <= Eightoff.openSlots(stack) ? stack : null;
			return this.proxyStack;
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return this.rank === 13;
				} else {
					return target.suit === this.suit && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			case "reserve":
				return !target;
				break;
			}
		}
	})
});

Y.Array.each(Eightoff.fields, function (field) {
	Eightoff[field].Stack = instance(Eightoff.Stack);
}, true);

Y.mix(Eightoff.Stack, {
	validTarget: function (stack) {
		if (stack.field !== "tableau" ||
		    !this.first().validTarget(stack)) { return false; }

		return this.cards.length <= Eightoff.openSlots(stack, this.last());
	}
}, true);

Y.mix(Eightoff.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("acesup", function (Y) {

var Solitaire = Y.Solitaire,
    AcesUp = Y.Solitaire.AcesUp = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	deal: function () {
		var card,
		    stack,
		    deck = this.deck,
		    stacks = this.tableau.stacks,
		    moved = [];

		for (stack = 0; stack < stacks.length; stack++) {
			card = deck.pop();
			moved.push(card);

			if (stack === stacks.length - 1) {
				card.after(function () {
					Y.Array.forEach(moved, function (c) {
						Solitaire.Animation.flip(c);
					});
				});
			}

			stacks[stack].push(card);
			card.faceUp();
		}

		deck.createStack();
	},

	turnOver: function () {
		var stack,
		    stacks = this.tableau.stacks,
		    deck = this.deck.stacks[0],
		    card,
		    moved = [];

		this.withoutFlip(function () {
			for (stack = 0; stack < stacks.length; stack++) {
				if (!deck.last()) { break; }

				card = deck.last();
				card.moveTo(stacks[stack]);
				card.faceUp();
				moved.push(card);
			}
		});

		card.after(function () {
			Y.Array.forEach(moved, function (c) {
				Solitaire.Animation.flip(c);
			});
		});
	},

	isWon: function () {
		return this.foundation.stacks[0].cards.length === 48;
	},

	height: function () { return this.Card.base.height * 3; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 7; }
			}
		},
		field: "foundation"
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck"
	}),

	Tableau: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.6; }
			}
		},
		field: "tableau"
	},

	Events: instance(Solitaire.Events, {
		dragCheck: function (e) {
			if (!Solitaire.game.autoPlay.call(this)) {
				Solitaire.Events.dragCheck.call(this);
			}
		},
	}),

	Card: instance(Solitaire.Card, {
		validTarget: function (stack) {
			if (stack.field === "tableau") {
				return !stack.last();
			}

			if (stack.field !== "foundation" || this.rank === 1) { return false; }

			var valid = false;

			Game.eachStack(function (stack) {
				if (valid) { return; }
				var last = stack.last();

				if (last && last.suit === this.suit && (last.rank > this.rank || last.rank === 1)) {
					valid = true;
				}
			}.bind(this), "tableau");

			return valid;
		},

		playable: function () {
			return this.stack.field === "deck" ||
				(this.isFree() &&
				(this.validTarget(Game.foundation.stacks[0]) || hasFreeTableaus()));
		}
	})
});

function hasFreeTableaus() {
	return Y.Array.some(Game.tableau.stacks, function (stack) {
		return !stack.cards.length;
	});
}

Y.Array.each(AcesUp.fields, function (field) {
	AcesUp[field].Stack = instance(AcesUp.Stack);
});

Y.mix(AcesUp.Deck.Stack, {
	images: {}
}, true);

Y.mix(AcesUp.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left,
		    zIndex = last ? last.zIndex + 1 : 1;

		card.zIndex = zIndex;
		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "array-extras"]});
YUI.add("alternations", function (Y) {

var Solitaire = Y.Solitaire,
    Alternations = Solitaire.Alternations = instance(Solitaire, {
	fields: ["Deck", "Foundation", "Tableau", "Waste"],

	deal: function () {
		var deck = this.deck,
		    tableau = this.tableau.stacks,
		    stack = 0,
		    row = 0,
		    card,
		    i;

		for (i = 0; i < tableau.length * 7; i++) {
			card = deck.pop();

			tableau[stack++].push(card);

			if (!(row % 2)) {
				card.faceUp();
			}

			if (!((i + 1) % 7)) {
				stack = 0;
				row++;
			}
		}

		card.after(function () {
			var rows = 7,
			    columns = tableau.length,
			    diag = columns + Math.floor(rows / 2),
			    x = 0,
			    row, col,
			    cards,
			    delay = 0, interval = 200;

			for (x = 0; x < diag; x++) {
				cards = [];
				col = x;
				row = 0;

				while (row < rows && col >= 0)  {
					stack = tableau[col];

					if (stack && stack.cards[row]) {
						cards.push(stack.cards[row]);
					}

					row += 2;
					col--;
				}

				Y.Array.each(cards, function (c) {
					setTimeout(function () {
						Solitaire.Animation.flip(c);
					}, delay);
				});

				delay += interval;
			}
		});

		deck.createStack();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0],
		    card;

		this.withoutFlip(function () {
			card = deck.last();
			if (card) {
				card.flipPostMove(0);
		       		card.faceUp().moveTo(waste);
			}
		});
	},

    	Deck: instance(Solitaire.Deck, {
		count: 2,

		stackConfig: {
			total: 1,
			layout: {
				top: function () { return Y.Solitaire.Card.height * 1.5 },
				left: 0
			}
		},

		field: "deck"
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				top: function () { return Y.Solitaire.Card.height * 2.75 },
				left: 0
			}
		},
		field: "waste"
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: function () { return Y.Solitaire.Card.height * 1.5 },
				left: function () { return Y.Solitaire.Card.width * 2.3; }
			}
		},
		field: "tableau"
	},

	Foundation: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.4,
				top: 0,
				left: 0
			}
		},
		field: "foundation"
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "deck":
			case "waste":
				return true;
			case "tableau":
				return this.createProxyStack();
			case "foundation": 
				return false;
			}
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return !target.isFaceDown && target.rank === this.rank + 1;
				}
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return this.suit === target.suit && this.rank === target.rank + 1;
				}
			default:
				return false;
			}
		}
	}),

	Stack: instance(Solitaire.Stack, {
		images: {
			foundation: "freeslot.png",
			tableau: "freeslot.png"
		},

		validTarget: function (stack) {
			return stack.field === "tableau" &&
			    this.first().validTarget(stack);
		}
	})
    });

Y.Array.each(Alternations.fields, function (field) {
	Alternations[field].Stack = instance(Alternations.Stack);
});

Y.mix(Alternations.Tableau.Stack, {
	setCardPosition: function (card) {
		var rankHeight,
		    last = this.cards.last(),
		    top,
		    left = this.left;

		if (last) {
			rankHeight = last.isFaceDown ? last.rankHeight * 2 : last.rankHeight;
			top = last.top + rankHeight;
		} else {
			top = this.top;
		}

		card.left = left;
		card.top = top;
	}
}, true);
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("bakersgame", function (Y) {
	var BakersGame = Y.Solitaire.BakersGame = instance(Y.Solitaire.Freecell, {
		Card: instance(Y.Solitaire.Freecell.Card, {
			validTableauTarget: function (card) {
				return card.suit === this.suit && card.rank === this.rank + 1;
			}
		})
	});
}, "1.0.0", {requires: ["freecell"]});
YUI.add("baroness", function (Y) {
	var Solitaire = Y.Solitaire,
	    AcesUp = Solitaire.AcesUp,
	    Baroness = Solitaire.Baroness = instance(AcesUp, {

		createEvents: function () {
			Solitaire.createEvents.call(this);
			Y.on("solitaire|endTurn", this.fillTableau.bind(this));
		},

		turnOver: function () {
			if (Y.Array.every(this.tableau.stacks, function (stack) {
				return stack.last();
			})) {
				AcesUp.turnOver.call(this);
			}
		},

		fillTableau: function () {
			var tableau = this.tableau.stacks,
			    deck = this.deck.stacks[0],
	    		    cardsToFill,
			    card,
			    moved = [],
			    totalCards = Y.Array.reduce(tableau, 0, function (total, stack) {
				return total + stack.cards.length;
			});

			if (totalCards >= tableau.length) { return; }

			cardsToFill = 5 - totalCards;

			this.withoutFlip(function () {
				this.eachStack(function (stack) {
					if (!(cardsToFill && deck.cards.length)) { return; }

					if (!stack.last()) {
						card = deck.last();
						card.moveTo(stack);
						card.faceUp();
						cardsToFill--;
						moved.push(card);
					}
				}, "tableau");
			});

			if (card) {
				card.after(function () {
					Y.Array.each(moved, function (c) {
						Solitaire.Animation.flip(c);
					});
				});
			}
		},

		isWon: Solitaire.isWon,

		Events: instance(Solitaire.Pyramid.Events, {
			drop: function (e) {
				var active = Solitaire.activeCard,
				    foundation = Solitaire.game.foundation.stacks[0],
				    target = e.drop.get("node").getData("target");

				if (!active) { return; }

				if (target.field) {
					if (!target.last()) {
						active.moveTo(target);
					} else {
						Solitaire.stationary(function () {
							target.last().moveTo(foundation);
							active.moveTo(foundation);
						});
					}
				} else {
					Solitaire.stationary(function () {
						target.moveTo(foundation);
						active.moveTo(foundation);
					});
				}

				Y.fire("endTurn");
			}
		}),

		Tableau: instance(AcesUp.Tableau, {
			stackConfig: instance(AcesUp.Tableau.stackConfig, {
				total: 5
			})
		}),

		Stack: instance(AcesUp.Stack, {
			updateDragGroups: Y.Solitaire.Pyramid.Stack.updateDragGroups
		}),

		Foundation: instance(AcesUp.Foundation, {
			stackConfig: {
				total: 1,
				layout: {
					spacing: 0,
					top: 0,
					left: function () { return Y.Solitaire.Card.width * 8.5; }
				}
			},
		}),

		Card: instance(AcesUp.Card, {
			playable: function () {
				return this.isFree();
			},

			validTarget: function (target) {
				var card = target.last();

				if (target.field === "foundation") {
					return this.isFree() && this.rank === 13;
				}

				if (!card) {
					return true;
				}

				return !card.isFaceDown && (this.rank + card.rank === 13);
			}
		})
	});
}, "1.0.0", {requires: ["acesup", "pyramid"]});
YUI.add("canfield", function (Y) {

var Solitaire = Y.Solitaire,
    Agnes = Solitaire.Agnes,
    Klondike = Solitaire.Klondike,
    Canfield = Solitaire.Canfield = instance(Agnes, {
	height: Solitaire.height,
	maxStackHeight: Solitaire.maxStackHeight,

	createEvents: function () {
		Solitaire.createEvents.call(this);
		Y.on("solitaire|endTurn", this.fillTableau.bind(this));
	},

	fillTableau: function () {
		var reserve = this.reserve.stacks[0],
		    card = reserve.last(),
		    empty;

		if (!card) { return; }

		empty = Y.Array.find(this.tableau.stacks, function (stack) {
			return !stack.last();
		});

		if (empty) {
			card.moveTo(empty);
		}

		card = reserve.last();
		
		if (card && card.isFaceDown) {
			card.faceUp();
		}
	},

	redeal: Klondike.redeal,
	turnOver: Klondike.turnOver,

	deal: function () {
		var card,
		    deck = this.deck,
		    tableau = this.tableau.stacks,
		    reserve = this.reserve.stacks[0],
		    reserveSize = 13,
		    i;

		for (i = 0; i < tableau.length; i++) {
			card = deck.pop();
			tableau[i].push(card);
			card.faceUp();
			card.flipPostMove(Solitaire.Animation.interval * 5);
		}

		for (i = 0; i < reserveSize; i++) {
			card = deck.pop();
			reserve.push(card);

			if (i === reserveSize - 1) {
				card.faceUp();
				card.flipPostMove(0);
			}
		}

		card = deck.pop();
		this.foundation.stacks[0].push(card);
		card.faceUp();
		card.flipPostMove(0);

		deck.createStack();
	},

	Tableau: instance(Agnes.Tableau, {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
	}),

	Reserve: instance(Agnes.Reserve, {
		stackConfig: {
			total: 1,
			layout: {
				left: function () { return Solitaire.Card.width * 1.5 },
				top: function () { return Solitaire.Card.height * 1.5; }
			}
		},
	}),

	Waste: Klondike.Waste,

	Card: instance(Agnes.Card, {
		validFreeTableauTarget: function () {
			return true;
		}
	})
});

}, "1.0.0", {requires: ["agnes"]});
YUI.add("doubleklondike", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    DoubleKlondike = Y.Solitaire.DoubleKlondike = instance(Klondike, {
		Foundation: instance(Klondike.Foundation, {
			stackConfig: {
				total: 8,
				layout: {
					hspacing: 1.25,
					top: 0,
					left: function () { return Solitaire.Card.width * 3.25; }
				}
			},
			field: "foundation",
		}),

		Tableau: instance(Klondike.Tableau, {
			stackConfig: {
				total: 9,
				layout: {
					hspacing: 1.25,
					top: function () { return Solitaire.Card.height * 1.5; },
					left: function () { return Solitaire.Card.width * 2; }
				}
			}
		}),

		Deck: instance(Klondike.Deck, {
			count: 2
		})
	});
}, "1.0.0", {requires: ["freecell"]});
YUI.add("thefan", function (Y) {
	var LaBelleLucie = Y.Solitaire.LaBelleLucie,
	    TheFan = Y.Solitaire.TheFan = instance(LaBelleLucie, {
		initRedeals: Y.Solitaire.noop,

		Tableau: instance(LaBelleLucie.Tableau, {
			Stack: instance(LaBelleLucie.Tableau.Stack, {
			       images: {tableau: "freeslot.png"}
			})
		}),

		Deck: instance(LaBelleLucie.Deck, {
			Stack: instance(LaBelleLucie.Deck.Stack, {
			       images: {}
			})
		}),

		Card: instance(LaBelleLucie.Card, {
			validTableauTarget: function (card) {
				if (!card) {
					return this.rank === 13;
				}

				return card.suit === this.suit && card.rank === this.rank + 1;
			}
		})
	});
}, "1.0.0", {requires: ["labellelucie"]});
YUI.add("labellelucie", function (Y) {

var Solitaire = Y.Solitaire,
    LaBelleLucie = Y.Solitaire.LaBelleLucie = instance(Solitaire, {
	redeals: 0,
	redealSeed: 0,

	fields: ["Foundation", "Tableau", "Deck"],

	initRedeals: function () {
		this.redeals = 2;
		this.redealSeed = Math.random() * 0x7FFFFFFF >>> 0;
		this.deck.stacks[0].node.addClass("playable");
	},

	createEvents: function () {
		Solitaire.createEvents.call(this);
		Y.delegate("click", Solitaire.Events.clickEmptyDeck, Solitaire.selector, ".stack");

		Y.on("solitaire|newGame", this.initRedeals.bind(this));

		Y.on("solitaire|afterSetup", function () {
			if (Game.redeals) {
				Game.deck.stacks[0].node.addClass("playable");
			}
		});
	},

	serialize: function () {
		var seed = this.redealSeed,
		    seedString = String.fromCharCode(seed >> 24) +
				String.fromCharCode((seed >> 16) & 0xFF) +
				String.fromCharCode((seed >> 8) & 0xFF) +
				String.fromCharCode(seed & 0xFF);

		return String.fromCharCode(this.redeals) + seedString + Solitaire.serialize.call(this);
	},

	unserialize: function (serialized) {
		this.redeals = serialized.charCodeAt(0);
		this.redealSeed = serialized.charCodeAt(1) << 24 +
				serialized.charCodeAt(2) << 16 +
				serialized.charCodeAt(3) << 8 +
				serialized.charCodeAt(4);
		
		return Solitaire.unserialize.call(this, serialized.substr(5));
	},

	redeal: function () {
		if (!this.redeals) { return; }

		var deck = this.deck;
		deck.cards = [];

		Game.eachStack(function (stack) {
			stack.eachCard(function (card) {
				card.pushPosition();
			});

			var cards = stack.cards;

			stack.cards = [];
			deck.cards = deck.cards.concat(cards);
		}, "tableau");

		Game.pushMove(function () {
			Game.redeals++;
		});

		deck.msSeededShuffle(this.redealSeed);

		this.deal(true);
		this.redeals--;
		if (!this.redeals) {
			this.deck.stacks[0].node.removeClass("playable");
		}
	},

	deal: function (redeal) {
		var card,
		    deck = this.deck,
		    stack,
		    stacks = Game.tableau.stacks,
		    i;

		for (stack = 0; stack < 18; stack++) {
			for (i = 0; i < 3; i++) {
				card = deck.pop();

				if (!card) { break; }

				stacks[stack].push(card);
				if (!redeal) { card.faceUp(); }
			}
		}

		if (!redeal) {
			Solitaire.Util.flipStacks(stacks[stacks.length - 1].last());
			deck.createStack();
		}
	},

	width: function () { return this.Card.base.width * 12.5; },
	height: function () { return this.Card.base.height * 7; },
	maxStackHeight: function () { return Solitaire.Card.height * 2.5; },

	Stack: instance(Solitaire.Stack, {
		images: {
			deck: "freeslot.png",
			foundation: "freeslot.png",
			tableau: null
		},

		validTarget: function (stack) {
			return stack.field === "tableau" &&
			    this.first().validTarget(stack);
		},

		validCard: function () { return false; }
	}),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.5,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.5; }
			}
		},
		field: "foundation",
	},

	Tableau: {
		stackConfig: {
			total: 18,
			layout: {
				hspacing: 2.5,
				top: function () { return Solitaire.Card.width * 2; },
				left: 0
			}
		},
		field: "tableau",
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				top: 0,
				left: 0
			}
		},
		field: "deck",
	}),

	Card: instance(Solitaire.Card, {
		playable: function () {
			return this.stack.field === "tableau" && this === this.stack.last();
		},

		validTableauTarget: function (target) {
			if (!target) {
				return false;
			} else {
				return target.suit === this.suit && target.rank === this.rank + 1;
			}
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				return this.validTableauTarget(target);
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(LaBelleLucie.fields, function (field) {
	LaBelleLucie[field].Stack = instance(LaBelleLucie.Stack);
});


Y.mix(LaBelleLucie.Tableau.Stack, {
	setCardPosition: function (card) {
		var rankWidth = card.width / 4,
		    last = this.cards.last(),
		    top = this.top,
		    left = last ? last.left + rankWidth : this.left,
		    zIndex = last ? last.zIndex + 1 : 1;

		card.zIndex = zIndex;
		card.left = left;
		card.top = top;
	},

	layout: function (layout, i) {
		var row = Math.floor(i / 5);

		Solitaire.Stack.layout.call(this, layout, i);

		this.top += Solitaire.Card.height * 1.5 * row;
		this.left -= Solitaire.Card.width * 12.5 * row;
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "util"]});
YUI.add("calculation", function (Y) {

function wrap(array, index) {
	var len = array.length;

	index %= len;
	if (index < 0) { index += len; }

	return array[index];
}

function inRange(low, high, value) {
	if (low <= high) {
		return low <= value && value <= high;
	} else {
		return low <= value || value <= high;
	}
}

var Solitaire = Y.Solitaire,
    Calculation = Y.Solitaire.Calculation = instance(Solitaire, {
	fields: ["Foundation", "Tableau", "Deck", "Waste"],

	deal: function () {
		var card,
		    deck = this.deck.cards,
		    start = [],
		    suits = ["s", "c", "d", "h"],
    		    rank,
		    found,
		    i = 51,
		    foundations = this.foundation.stacks;

		while (i >= 0) {
			card = deck[i];
			found = false;

			for (rank = 1; rank <= 4; rank++) {
				if (card.rank === rank && card.suit === suits[rank - 1]) {
					found = true;
					deck.splice(i, 1);
					start.push(card);
					break;
				}
			}

			i--;
		}

		start.sort(function (a, b) { return a.rank - b.rank; });

		for (i = 0; i < 4; i++) {
			card = start[i];
			foundations[i].push(card);
			card.faceUp();
		}

		card.after(function () {
			Y.Array.each(start, function (c) {
				Solitaire.Animation.flip(c);
			});
		});

		this.deck.createStack();
	},

	turnOver: function () {
		var last = this.deck.stacks[0].last(),
		    waste = this.waste.stacks[0];

		if (last && !waste.last()) {
			this.withoutFlip(function () {
				last.moveTo(waste);
				last.faceUp();
				last.flipPostMove(0);
			});
		}
	},

	redeal: Solitaire.noop,

	height: function () { return this.Card.base.height * 3; },

	Stack: instance(Solitaire.Stack, {
		images: {
			deck: null,
			waste: null,
			tableau: "freeslot.png",
			foundation: "freeslot.png"
		}
	}),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
		field: "foundation"
	},

	Tableau: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.25; },
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
		field: "tableau"
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck"
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "waste",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "waste":
				return this.isFree();
			case "tableau":
				return this.isFree() && this.autoPlay(true);
			case "foundation":
				return false;
			case "deck":
				return !Solitaire.game.waste.stacks[0].last();
			}
		},

		validTarget: function (stack) {
			var target = stack.last(),
			    interval;

			switch (stack.field) {
			case "tableau":
				if (this.stack.field === "tableau") { return false; }
				return true;
			case "foundation":
				interval = stack.index() + 1;

				return target.rank !== 13 && ((this.rank % 13) === (target.rank + interval) % 13);
			default:
				return false;
			}
		}
	})
});

Y.Array.each(Calculation.fields, function (field) {
	Calculation[field].Stack = instance(Calculation.Stack);
}, true);

Y.mix(Calculation.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("seven-toes", function (Y) {

function getInterval(stack) {
	var i, rank, card;
	card = stack.cards.last();
	rank = card.rank;

	for (i = stack.cards.length - 2; i >= 0; i--) {
		card = stack.cards[i];
		if (card.isFaceDown || card.rank == 13) {
			break;
		}

		rank = card.rank;
	}

	return rank;
}

function getFullStackRank(stack) {
	var i, suit;

	// Only stacks of 13 may qualify
	if (stack.cards.length !== 13) {
		return 0;
	}

	// Stacks must be on a king
	if (stack.cards[0].rank != 13) {
		return 0;
	}

	// Everything must be visible
	if (stack.cards[0].isFaceDown) {
		return 0;
	}

	// Everything must be same suit
	suit = stack.cards[0].suit;
	for (i = 1; i < 13; i++) {
		if (stack.cards[i].suit !== suit) {
			return 0;
		}
	}

	// OK, stack looks good. Return the rank of the 2nd card (on top of the base king)
	return stack.cards[1].rank;
}

var Solitaire = Y.Solitaire,
    Klondike = Solitaire.Klondike,
    SevenToes = Y.Solitaire.SevenToes = instance(Solitaire, {
	fields: ["Foundation", "Tableau", "Deck", "Waste"],
	
	deal: function () {
		var deck,
			foundation,
			card,
			i;

		deck = this.deck;
		for (i = 0; i < this.foundation.stacks.length; i++)
		{
			card = this.deck.pop();
			foundation = this.foundation.stacks[i];
			foundation.push(card);
			card.faceUp();
			card.flipPostMove(Solitaire.Animation.interval * 5);
		}

		deck = this.deck.stacks[0];
		foundation = this.foundation.stacks[0];
		Klondike.deal.call(this);
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
			waste = this.waste.stacks[0],
			updatePosition = Klondike.Card.updatePosition,
			Card = Solitaire.game.Card,
			card,
			moved = [],
			i, stop;

		Card.updatePosition = Solitaire.noop;

		this.withoutFlip(function () {
				card = deck.last();
				moved.push(card);
				card.faceUp();
				card.moveTo(waste);
				card.flipPostMove(Solitaire.Animation.interval * 5);
		});

		Card.updatePosition = updatePosition;
		waste.updateCardsPosition();
	},

	redeal: Solitaire.noop,

	height: function () { return this.Card.base.height * 5; },

	autoPlay: function (simulate) { return false; },

	maxStackHeight: function () { return Solitaire.Card.height * 2.4; },

	Stack: instance(Solitaire.Stack, {
		images: {
			deck: null,
			waste: null,
			tableau: "freeslot.png",
			foundation: "freeslot.png"
		}
	}),

	Foundation: {
		stackConfig: {
			total: 6,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
		field: "foundation"
	},

	Tableau: instance(Klondike.Tableau, {
		stackConfig : {
			total : 7,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 2.5; },
				left: function () { return Solitaire.Card.width * 2.5; }
			}
		}	
	}),

 	Deck: instance(Klondike.Deck, {
		suits: ["s", "h", "c", "d", "s", "h"],
		field : "deck"
	}),

	isWon: function () {
		// Build a bitwise combination of all the complete stacks on the foundation
		var completed = 0,
		i, stack, stackRank;
		for (i = 0; i < this.foundation.stacks.length; i++) {
			stack = this.foundation.stacks[i];
			stackRank = getFullStackRank(stack);
			if (stackRank > 0) {
				completed = completed | (0x1 << (stackRank - 1));
			}
			else {
				// Optimization: all 6 foundation stacks need to contribute for a win
				return false;
			}
		}

		if (completed === parseInt("111111", 2) || completed === parseInt("111111000000", 2)) {
			return true;
		}
		else {
			return false;
		}
	},

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "waste",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "deck":
			case "waste":
				return this.isFree();
			case "tableau":
			case "foundation":
				if (this.isFaceDown) {
					return false;
				}
				else if (this.isFree()) {
					return true;
				}
				else {
					return this.isMoveableSubStack();
				}
			}
		},

		isFree: function () {
			return this === this.stack.last();
		},

		isMoveableSubStack: function () {
			var cards = this.stack.cards;
			var start = cards.indexOf(this);
			var len = cards.length;

			// No multi-card moves from deep stacks.
			if (start > 1 && !cards[start - 2].isFaceDown) {
				return false;
			}

			// Full (but not overflowing) K based stacks can be moved.
			if (this.rank === 13) {
				return (len - start < 14);
			}

			// Only cards on a K or at the base can be dragged with a stack.
			var parentRank = 13;
			if (start > 0 && !cards[start - 1].isFaceDown) {
				parentRank = cards[start - 1].rank;
			}

			if (parentRank != 13) {
				return false;
			}

			// We're not a king, but we're a base card or a base on a king. 
			// (i.e. we are the interval-defining card.)  We can drag stacks
			// around with us, but only if they're "incomplete" missing at least one of the cards A-Q.
			return (len - start < 12);
		},

		createProxyStack: function () {
			if (this.isFaceDown) {
				this.proxyStack = null;
				return null;
			}

			if (!this.playable()) {
				return null;
			}

			var stack = instance(this.stack, {
					proxy: true,
					stack: this.stack
				 	}),
				cards = stack.cards,
				card,
				i, start, len;

			stack.cards = [];
			stack.push(this, true);
			start = cards.indexOf(this);
			len = cards.length;

			for (i = start + 1; i < len; i++) {
				card = cards[i];
				if (stack.validProxy(card)) {
					stack.push(card, true);
				} else {
					break;
				}
			}

			this.proxyStack = i === len ? stack : null;

			return this.proxyStack;
		},

		// See also the Stack.validTarget() override below.
		validTarget: function (cardOrStack) {
			var target, stack;

			if (cardOrStack.field) {
				target = cardOrStack.last();
				stack = cardOrStack;
			} else {
				target = cardOrStack;
				stack = cardOrStack.stack;
			}

			if (!target) {
				return this.rank === 13;
			}

			if (target.isFaceDown) {
				return false;
			}

			switch (stack.field) {
			case "tableau":
			case "foundation":
				if (target.rank === 13) {
					// K on top of target stack: anything goes, including a change of interval
					return this.rank !== 13;
				}
				else {
					// Only allow the modulus card.
					interval = getInterval(stack);
					return (this.rank % 13) === (target.rank + interval) % 13;
				}

			default:
				return false;
			}
		}
	})
});

Y.Array.each(SevenToes.fields, function (field) {
	SevenToes[field].Stack = instance(SevenToes.Stack);
}, true);

Y.mix(SevenToes.Stack, {
	updateCardsStyle: function () {
		var field = this.field;

		this.eachCard(function (c) {
			if (c.playable()) {
				c.node.addClass("playable");
			} else {
				c.node.removeClass("playable");
			}
		});
	},

}, true);

// See also the Card.validTarget() override above. There may be some DRY violation here, but for now it seems
// like I have to implement both for things to work properly.
Y.mix(SevenToes.Stack, {
	validTarget: function (stack) {

		switch (stack.field) {
			case "tableau":
			case "foundation":
				if (stack.cards && stack.cards.last()) {
					return stack.cards.last().rank === 13;
				}
				else {
					return this.first().rank === 13;
				}
			default:
				return false;
		}
	}
}, true);

Y.mix(SevenToes.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
			top = last ? last.top + last.rankHeight : this.top,
			left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(SevenToes.Foundation.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
			top = last ? last.top + last.rankHeight : this.top,
			left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(SevenToes.Waste.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
			top = last ? last.top + last.rankHeight : this.top,
			left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(SevenToes.Waste.Stack, {
	maxStackHeight: function () {
		return Solitaire.Card.height * 4.8;
	}
}, true);

Y.mix(SevenToes.Deck.Stack, {
	createNode: function () {
		Solitaire.Stack.createNode.call(this);
		this.node.on("click", Solitaire.Events.clickEmptyDeck);
		this.node.addClass("playable");
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "klondike"]});
YUI.add("bisley", function (Y) {

var Solitaire = Y.Solitaire,
    Bisley = Y.Solitaire.Bisley = instance(Solitaire, {
	fields: ["Foundation", "Tableau"],

	deal: function () {
		var card,
			stack,
			deck = this.deck,
			cards = deck.cards,
			stacks = this.tableau.stacks,
			foundation = this.foundation.stacks,
			aces = [],
			i = 0;

		while (aces.length < 4) {
			card = cards[i];

			if (card.rank === 1) {
				cards.splice(i, 1);
				aces.push(card);
			} else {
				i++;
			}
		}

		for (i = 0; i < 4; i++) {
			card = aces[i];
			card.faceUp();
			foundation[i].push(card);
			foundation[i + 4].suit = card.suit;
		}

		stack = 4;
		while (card = deck.pop()) {
			stacks[stack].push(card);
			card.faceUp();
			card.flipPostMove(0);
			if (++stack >= stacks.length) {
				stack = 0;
			}
		}

		deck.createStack();
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.25; },
				left: function () { return Solitaire.Card.width * 5.75; }
			}
		},
		field: "foundation"
	},

	Tableau: {
		stackConfig: {
			total: 13,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 2.75; },
				left: 0
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return false;
				} else {
					return target.suit === this.suit && Math.abs(target.rank - this.rank) === 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 13 && this.suit === stack.suit;
				} else {
					return target.suit === this.suit && Math.abs(target.rank - this.rank) === 1;
				}
				break;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(Bisley.fields, function (field) {
	Bisley[field].Stack = instance(Bisley.Stack);
});


Y.mix(Bisley.Stack, {
	images: { foundation: "freeslot.png" },

	validCard: function () { return false; }
}, true);

Y.mix(Bisley.Foundation.Stack, {
	suit: null,

	layout: function (layout, i) {
		Solitaire.Stack.layout.call(this, layout, i);

		if (i >= 4) {
			this.left -= Solitaire.Card.width * 5;
			this.top -= Solitaire.Card.height * 1.25;
		}
	}
}, true);

Y.mix(Bisley.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
			top = last ? last.top + last.rankHeight : this.top,
			left = this.left;

		card.left = left;
		card.top = top;
	},

	layout: function (layout, i) {
		Solitaire.Stack.layout.call(this, layout, i);

		if (i < 4) {
			this.top += Solitaire.Card.rankHeight;
		}
	}
}, true);

Y.mix(Bisley.Deck.Stack, {
	images: {deck: null}
}, true);


}, "0.0.1", {requires: ["solitaire", "util"]});
YUI.add("king-albert", function (Y) {

var Solitaire = Y.Solitaire,
    Util = Solitaire.Util,
    KingAlbert = Y.Solitaire.KingAlbert = instance(Solitaire, {
	fields: ["Foundation", "Tableau", "Reserve"],

	height: function () { return this.Card.base.height * 5.3; },
	maxStackHeight: function () { return this.Card.height * 2.75; },

	deal: function () {
		var card,
			stack,
			row,
			deck = this.deck,
			cards = deck.cards,
			tableau = this.tableau.stacks,
			reserve = this.reserve.stacks;

		for (row = 0; row < 9; row++) {
			for (stack = row; stack < 9; stack++) {
				card = deck.pop();
				tableau[stack].push(card);
				card.faceUp();
			}
		}

		Util.flipStacks(card);

		for (stack = 0; stack < 7; stack++) {
			card = deck.pop();
			reserve[stack].push(card);
			card.faceUp();
			card.flipPostMove(2000);
		}
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 6.25; }
			}
		},
		field: "foundation"
	},

	Tableau: {
		stackConfig: {
			total: 9,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau"
	},

	Reserve: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 0.4,
				top: function () { return Solitaire.Card.height * 4.4; },
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "reserve"
	},

	Card: instance(Solitaire.Card, { 
		playable: function () {
			switch (this.stack.field) {
			case "tableau":
				return this.createProxyStack();
			case "reserve":
				return true;
			default:
				return false;
			}
		},

		createProxyStack: function () {
			return Solitaire.Card.createProxyStack.call(this);
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.color !== this.color && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(KingAlbert.fields, function (field) {
	KingAlbert[field].Stack = instance(KingAlbert.Stack);
});


Y.mix(KingAlbert.Stack, {
	images: {foundation: "freeslot.png", tableau: "freeslot.png" },

	validCard: function (card) {
		return this.cards.length < Math.pow(2, Util.freeTableaus().length);
	},

	validTarget: function (stack) {
		if (stack.field != "tableau") { return false; }

		var freeTableaus = Util.freeTableaus().length;

		if (!stack.first()) {
			freeTableaus--;
		}

		return this.cards.length <= Math.pow(2, freeTableaus);
	}

}, true);

Y.mix(KingAlbert.Reserve.Stack, {
	setCardPosition: function (card) {
		Solitaire.Stack.setCardPosition.call(this, card);
		card.zIndex = this.index();
	}
}, true);

Y.mix(KingAlbert.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
			top = last ? last.top + last.rankHeight : this.top,
			left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);


}, "0.0.1", {requires: ["solitaire", "util"]});
(function () {
	function cacheNode(selector) {
		var node;

		return function () {
			if (!node) { 
				node = Y.one(selector);
			}
			return node;
		};
	}

	var active = {
		name: "Klondike",
		game: null
	    },
	    /* remove {fetchCSS: false, bootstrap: false} during development when additional YUI modules are needed
	     * TODO: generate this in the build script
	     */
	    yui = YUI({fetchCSS: false, bootstrap: false}), Y,
	    body = cacheNode("body"),
	    games = {
		"accordion": "Accordion",
		"acesup": "AcesUp",
		"agnes": "Agnes",
		"alternations": "Alternations",
		"bakersdozen": "BakersDozen",
		"bakersgame": "BakersGame",
		"baroness": "Baroness",
		"bisley": "Bisley",
		"doubleklondike": "DoubleKlondike",
		"calculation": "Calculation",
		"canfield": "Canfield",
		"eightoff": "Eightoff",
		"king-albert": "KingAlbert",
		"klondike": "Klondike",
		"klondike1t": "Klondike1T",
		"thefan": "TheFan",
		"flower-garden": "FlowerGarden",
		"forty-thieves": "FortyThieves",
		"freecell": "Freecell",
		"golf": "Golf",
		"grandfathers-clock": "GClock",
		"labellelucie": "LaBelleLucie",
		"monte-carlo": "MonteCarlo",
		"pyramid": "Pyramid",
		"russian-solitaire": "RussianSolitaire",
		"simple-simon": "SimpleSimon",
		"seven-toes" : "SevenToes",
		"scorpion": "Scorpion",
		"spider": "Spider",
		"spider1s": "Spider1S",
		"spider2s": "Spider2S",
                "spiderette": "Spiderette",
		"tri-towers": "TriTowers",
		"will-o-the-wisp": "WillOTheWisp",
		"yukon": "Yukon"},

	    extensions = [
		"json",
		"tabview",
		"util",
		"auto-turnover",
	        "statistics",
		"win-display",
		"solver-freecell",
		"solitaire-autoplay",
	        "solitaire-ios",
		"display-seed-value",
		"save-manager",
		"analytics"],

	nameMap = {
			Accordion: "Accordion",
			AcesUp: "Aces Up",
			Agnes: "Agnes",
			Alternations: "Alternations",
			BakersDozen: "Baker's Dozen",
			BakersGame: "Baker's Game",
			Baroness: "Baroness",
			Bisley: "Bisley",
			Calculation: "Calculation",
			Canfield: "Canfield",
			DoubleKlondike: "Double Klondike",
			Eightoff: "Eight Off",
			Klondike: "Klondike",
			Klondike1T: "Klondike (Vegas style)",
			TheFan: "The Fan",
			FlowerGarden: "Flower Garden",
			FortyThieves: "Forty Thieves",
			Freecell: "Freecell",
                        Golf: "Golf",
			GClock: "Grandfather's Clock",
			LaBelleLucie: "La Belle Lucie",
			KingAlbert: "King Albert",
			MonteCarlo: "Monte Carlo",
			Pyramid: "Pyramid",
			RussianSolitaire: "Russian Solitaire",
			Scorpion: "Scorpion",
			SevenToes: "Seven Toes",
			SimpleSimon: "Simple Simon",
			Spider: "Spider",
			Spider1S: "Spider (1 Suit)",
			Spider2S: "Spider (2 Suit)",
                        Spiderette: "Spiderette",
                        WillOTheWisp: "Will O' The Wisp",
			TriTowers: "Tri Towers",
			Yukon: "Yukon"
	},

	Fade = (function() {
		var el = null,
		    css = {
		    position: "absolute",
		    display: "none",
		    backgroundColor: "#000",
		    opacity: 0.7,
		    top: 0,
		    left: 0,
		    width: 0,
		    height: 0,
		    zIndex: 1000,
		},

		element = function() {
			if (el === null) {
				el = Y.Node.create("<div>");
				el.setStyles(css);
				body().append(el);
			}
			return el;
		};

		return {
			show: function() {
				var el = element();

				css.display = "block";
				css.width = el.get("winWidth");
				css.height = el.get("winHeight");

				el.setStyles(css);

			},

			hide: function() {
				css.display = "none";
				element().setStyles(css);
			},

			resize: function () {
				if (css.display === "block") { this.show(); }
			}
		};
	}()),

	Rules = (function () {
		var popupNode = cacheNode("#rules-popup"),
			description,
			rootNode,
			visible = false;

		function sourceNode() {
			var srcNode = Y.one("#" + active.name),
				activeGame;

			// HACK: active.name can be either of the form "MonteCarlo" or "monte-carlo" at this point, depending
			// on whether we've just switched games or not. Without this hack, you don't see rules unless you switch games.
			// A better fix would be to be more consistent with active.name.
			if (!srcNode) {
				for (m in games) {
					if (games[m] === active.name) {
						srcNode = Y.one("#" + m);
						break;
					}
				}
			}

			return srcNode;
		}

		return {
			show: function () {
				description = sourceNode().one(".description");
				popupNode().one("button").insert(description, "before");
				popupNode().removeClass("hidden");
				Fade.show();
				visible = true;
			},

			hide: function () {
				if (!(visible && description)) { return; }

				sourceNode().appendChild(description);
				popupNode().addClass("hidden");
				Fade.hide();
				visible = false;
			}
		};
	})(),

	GameChooser = {
		selected: null,
		fade: false,

		init: function () {
			this.refit();
		},

		node: cacheNode("#game-chooser"),

		refit: function () {
			var node = Y.one("#game-chooser"),
			    height = node.get("winHeight");

			node.setStyle("min-height", height);
		},

		show: function (fade) {
			if (!this.selected) {
				this.select(active.name);
			}

			if (fade) {
				Fade.show();
				this.fade = true;
			}

			this.node().addClass("show").append(Backgrounds.node());
			body().addClass("scrollable");
		},

		hide: function () {
			if (this.fade) {
				Fade.hide();
			}

			this.node().removeClass("show");
			Y.fire("gamechooser:hide", this);
			body().removeClass("scrollable").append(Backgrounds.node());
		},

		choose: function () {
			if (!this.selected) { return; }

			this.hide();
			playGame(this.selected);
		},

		select: function (game) {
			var node = Y.one("#" + game + "> div"),
			    previous = this.selected;
			
			if (previous !== game) {
				this.unSelect();
			}

			if (node) {
				this.selected = game;
				new Y.Node(document.getElementById(game)).addClass("selected");
			}

			if (previous && previous !== game) {
				Y.fire("gamechooser:select", this);
			}
		},

		unSelect: function () {
			if (!this.selected) { return; }

			new Y.Node(document.getElementById(this.selected)).removeClass("selected");
			this.selected = null;
		}
	},

	OptionsChooser = {
		selector: "#options-chooser",

		initInputs: function () {
			var option,
			    options = Options.properties,
			    value;

			for (option in options) {
				if (!options.hasOwnProperty(option)) { continue; }

				value = options[option].get();
				if (typeof value === "boolean") {
					document.getElementById(option + "-toggle").checked = value;
				}
			}
		},

		attachEvents: function () {
			Y.delegate("change", function (e) {
				var name = this.get("id").replace("-toggle", ""),
				    option = Options.properties[name];

				if (option) {
					option.set(this.get("checked"));
					Options.save();
				}
			}, this.selector, "input[type=checkbox]");

			Y.delegate("click", function () {
				Backgrounds.load(this.getData("item"));
				Options.save();
			}, "#background-options .backgrounds", ".background");

			Y.delegate("click", function (e) {
				Themes.load(this.getData("item"));
				Preloader.preload(false);
				Preloader.loaded(resize);
				Options.save();
			}, "#graphics-options .cards", ".card-preview");
		},

		element: (function () {
			var element;

			function createList(collection, selector, callback) {
				var item,
				    all = collection.all,
				    current = collection.current,
				    list = Y.one(selector),
				    node;

				for (item in all) {
					if (!all.hasOwnProperty(item)) { continue; }

					collection.current = item;
					node = callback(collection).setData("item", item);

					if (item === current) {
						node.addClass("selected");
					}

					list.append(node);
				}

				collection.current = current;
			}

			return function () {
				var tabview;

				if (!element) {
					element = Y.one(OptionsChooser.selector);
					tabview = new Y.TabView({
						srcNode: element.one(".tabview")
					});
					tabview.render();

					OptionsChooser.initInputs();
					OptionsChooser.attachEvents();

					createList(Themes, "#graphics-options .cards", function (collection) {
						return Y.Node.create(Y.Lang.sub(
							"<li class=card-preview><img src={base}/facedown.png><img src={base}/h12.png></li>", {
								base: collection.basePath(90)
							}));
					});

					createList(Backgrounds, "#background-options .backgrounds", function (collection) {
						return Y.Node.create("<li class=background></li>")
							.setStyle("backgroundImage", "url(" + collection.all[collection.current].image + ")");
					});
				}

				return element;
			}
		}()),

		show: function () {
			Fade.show();
			this.element().removeClass("hidden");
		},

		hide: function () {
			Fade.hide();
			this.element().addClass("hidden");
		}
	},

	Options = {
		properties: {
			cardTheme: {
				set: function (value) {
					Themes.load(value);
				},

				get: function () {
					return Themes.current || Themes.defaultTheme;
				}
			},

			autoplay: {
				set: function (value) {
					var autoplay = Y.Solitaire.Autoplay;

					value ? autoplay.enable() : autoplay.disable();
				},

				get: function () {
					return Y.Solitaire.Autoplay.isEnabled();
				}
			},

			animateCards: {
				set: function (value) {
					Y.Solitaire.Animation.animate = value;
				},

				get: function () {
					return Y.Solitaire.Animation.animate;
				}
			},

			autoFlip: {
				set: function (value) {
					var autoflip = Y.Solitaire.AutoTurnover;

					value ? autoflip.enable() : autoflip.disable();
				},

				get: function () {
					return Y.Solitaire.AutoTurnover.isEnabled();
				}
			},

			enableSolver: {
				set: function (value) {
					var solver = Y.Solitaire.Solver.Freecell;

					value ? solver.enable() : solver.disable();
				},

				get: function () {
					return Y.Solitaire.Solver.Freecell.isEnabled();
				}
			},

			background: {
				set: function (value) {
					Backgrounds.load(value);
				},

				get: function () {
					return Backgrounds.current || Backgrounds.defaultBackground;
				}
			}
		},

		load: function () {
			var options;

			options = localStorage["options"];

			if (!options) {
				options = Y.Cookie.get("full-options");
				Y.Cookie.remove("full-options");
			}

			try {
				Y.JSON.parse(options, this.set.bind(this));
			} catch (e) {
				// do nothing as we'll just use the default settings
			}

			if (!Themes.current) { Themes.load(); }
			if (!Backgrounds.current) { Backgrounds.load(); }
		},

		save: function () {
			localStorage["options"] = Y.JSON.stringify(mapObject(this.properties, function (key, value) {
				return value.get();
			}));
		},

		set: function (key, value) {
			var prop = this.properties[key];

			if (prop) {
				prop.set(value);
			}
		},
	},

	Themes = {
		all: {
			air: {
				sizes: [141],
				141: {
					hiddenRankHeight: 17,
					rankHeight: 55,
					dimensions: [141, 199]
				}
			},

			ancient_egyptians: {
				sizes: [148],
				148: {
					hiddenRankHeight: 17,
					rankHeight: 50,
					dimensions: [148, 200]
				}
			},

			dondorf: {
				sizes: [61, 79, 95, 122],
				61: {
					hiddenRankHeight: 7,
					rankHeight: 25,
					dimensions: [61, 95]
				},

				79: {
					hiddenRankHeight: 10,
					rankHeight: 32,
					dimensions: [79, 123]
				},

				95: {
					hiddenRankHeight: 12,
					rankHeight: 38,
					dimensions: [95, 148]
				},

				122: {
					hiddenRankHeight: 15,
					rankHeight: 48,
					dimensions: [122, 190]
				}
			},

			"jolly-royal": {
				sizes: [144],
				144: {
					hiddenRankHeight: 20,
					rankHeight: 52,
					dimensions: [144, 200]
				}
			},

			paris: {
				sizes: [131],
				131: {
					hiddenRankHeight: 18,
					rankHeight: 48,
					dimensions: [131, 204]
				}
			}
		},

		current: null,
		defaultTheme: "jolly-royal",

		/* theres no mechanism yet to load the appropriate deck depending on the scaled card width
		 * so we just load the largest cards and call it a day :/
		 */
		snapToSize: function (width) {
			var theme = this.all[this.current],
			    sizes = theme.sizes;

			width = clamp(width || 0, sizes[0], sizes[sizes.length - 1]) >>> 0;

			while (Y.Array.indexOf(sizes, width) === -1) {
				width++;
			}

			return width;
		},

		basePath: function (width) {
			return this.current + "/" + this.snapToSize(width);
		},

		load: function (name) {
			var Solitaire = Y.Solitaire,
			    base = Solitaire.Card.base,
			    sizes;

			if (!(name in this.all)) {
				name = this.defaultTheme;
			}

			this.current = name;

			sizes = this.all[name].sizes;
			this.set(sizes[sizes.length - 1]);
		},

		set: function (size) {
			var theme = this.all[this.current][size];

			Y.mix(Y.Solitaire.Card.base, {
				theme: this.basePath(size),
				hiddenRankHeight: theme.hiddenRankHeight,
				rankHeight: theme.rankHeight,
				width: theme.dimensions[0],
				height: theme.dimensions[1]
			}, true);
		}
	},
	
	Backgrounds = {
		all: {
			"green": {
				image:"green.jpg",
				size: "100%"
		     	}, 
			"vintage": {
				image:"backgrounds/grungy-vintage.jpg",
				repeat: true,
			},
			"circles": {
				image: "backgrounds/retro-circles-army-green.jpg",
				repeat: true,
			},
			"watercolor": {
				image: "backgrounds/watercolor-grunge-ripe-apricot.jpg",
				size: "cover",
			},
			"heart": {
				image: "backgrounds/grunge-hearts-maroon-copper.jpg",
				size: "cover"
			}
		},
		current: null,
		defaultBackground: "green",
		stylesheet: null,

		load: function (name) {
			if (!(name in this.all)) {
				name = this.defaultBackground;
			}

			this.current = name;
			this.set();
		},

		set: function () {
			var selected = this.all[this.current],
			    node;

			node = this.node();
			if (selected.repeat) {
				this.imageNode().hide();
				this.node().setStyle("backgroundImage", "url(" + selected.image + ")");
			} else {
				this.node().setStyle("backgroundImage", "none");
				this.imageNode().set("src", selected.image).show();
			}
		},

		resize: function () {
			var selected = this.all[this.current],
			    img = this.imageNode(),
			    width = img.get("width"),
			    height = img.get("height"),
			    winWidth = img.get("winWidth"),
			    winHeight = img.get("winHeight"),
			    ratioWidth, ratioHeight,
			    ratio;

			if (selected.repeat) { return; }

			if (selected.size === "cover") {
				ratioWidth = width / winWidth;
				ratioHeight = height / winHeight;
				ratio = ratioWidth < ratioHeight ? ratioWidth : ratioHeight;
				img.setAttrs({width: Math.ceil(width / ratio), height: Math.ceil(height / ratio)});
			} else if (selected.size === "100%") {
				img.setAttrs({width: winWidth, height: winHeight});
			}

			img.show();
		},

		imageNode: cacheNode("#background-image"),
		node: function () {
			var node = Y.one("#background"),
			    image;

			if (!node) {
				node = Y.Node.create("<div id=background>").appendTo(body());
				image = Y.Node.create("<img id=background-image>");
				image.set("draggable", false);
				image.on("load", this.resize.bind(this));
				node.append(image);
			}

			return node;
		}
	};

	function clamp(value, low, high) {
		return Math.max(Math.min(value, high), low);
	}

	function mapObject(source, mapper) {
		var mapped = {},
		    key;

		for (key in source) {
			if (!source.hasOwnProperty(key)) { continue; }

			mapped[key] = mapper.call(source, key, source[key]);
		}

		return mapped;
	}

	function modules() {
		var modules = extensions.slice(),
		    m;

		for (m in games) {
			if (games.hasOwnProperty(m)) {
				modules.unshift(m);
			}
		}

		return modules;
	}

	function main(YUI) {
		Y = YUI;

		exportAPI();
		Y.on("domready", load);
	}

	function showDescription() {
		GameChooser.select(this._node.id);
		GameChooser.choose();
	}

	var aboutPopup = cacheNode("#about-popup"),
	    statsPopup = cacheNode("#stats-popup"),
	    winPopup = cacheNode("#win-display");

	function showPopup(popup) {
		Y.fire("popup", popup);
	}

	var Confirmation = {
		promptNode: cacheNode("#confirmation-prompt"),
		node: cacheNode("#confirmation"),
		affirmButton: cacheNode("#confirmation-affirm"),
		denyButton: cacheNode("#confirmation-deny"),
		active: false,

		attachEvents: function(callback) {
			this.affirmButton().once("click", function () {
				callback();
				this.hide();
			}.bind(this));

			this.denyButton().once("click", function () {
				this.hide();
			}.bind(this));
		},

		resize: function() {
			if (!this.active) { return; }

			this.node().setStyles({
				width: this.node().get("winWidth") + "px",
				height: this.node().get("winHeight") + "px"
			});
		},

		hide: function () {
			this.active = false;
			this.node().addClass("hidden");
		},

		show: function (prompt, callback) {
			this.active = true;
			this.attachEvents(callback);
			this.promptNode().set("text", prompt);
			this.node().removeClass("hidden");
			this.resize();
		}
	};

	function attachEvents() {
		var hideMenus = function () {
			GameChooser.hide();
			OptionsChooser.hide();
			Rules.hide();
			statsPopup().addClass("hidden");
			aboutPopup().addClass("hidden");
			Fade.hide();
		    };

		Y.on("click", restart, Y.one("#restart"));
		Y.on("click", showPopup.partial("GameChooser"), Y.one("#choose-game"));
		Y.on("click", showPopup.partial("OptionsChooser"), Y.one("#choose-options"));
		Y.on("click", showPopup.partial("Rules"), Y.one("#rules"));
		Y.on("click", showPopup.partial("About"), Y.one("#about"));
		Y.on("click", function () { active.game.undo(); }, Y.one("#undo"));
		Y.on("click", newGame, Y.one("#new-deal"));
		Y.on("click", Y.Solitaire.Statistics.statsDisplay, Y.one("#stats"));
		Y.on("submit", function () {
			Y.Solitaire.Analytics.track("Donations", "Click", "Paypal button");
		}, Y.one("#donate"));


		Y.on("click", hideChromeStoreLink, Y.one(".chromestore"));

		Y.delegate("click", showDescription, "#descriptions", "li");

		Y.on("click", hideMenus, ".close-chooser");

		Y.one("document").on("keydown", function (e) {
			if (e.keyCode === 27) {
				hideMenus();
			}
		});

		Y.on("afterSetup", function() {
			active.game.stationary(function () {
				resize();
			});
		});

		Y.on("Application|popup", function (popup) {
			winPopup().addClass("hidden");

			switch (popup) {
			case "GameChooser":
				GameChooser.show(false);
				break;
			case "OptionsChooser":
				OptionsChooser.show();
				break;
			case "About":
				aboutPopup().removeClass("hidden");
				Fade.show();
				break;
			case "Rules":
				Rules.show();
				break;
			case "Stats":
				statsPopup().removeClass("hidden");
				Fade.show();
				break;
			}
		});

		Y.on("fieldResize", function (ratio, w, h) {
			active.game.resize(ratio);
		});

		attachResize();
	}

	function attachResize() {
		var timer,
		    delay = 250,
		    attachEvent;

		if (window.addEventListener) {
			attachEvent = "addEventListener";
		} else if (window.attachEvent) {
			attachEvent = "attachEvent";
		}

		window[attachEvent](Y.Solitaire.Application.resizeEvent, function () {
			clearTimeout(timer);
			timer = setTimeout(resize, delay);
		}, false);
	}

	function resize() {
		var game = active.game,
		    el = game.container(),
		    padding = game.padding,
		    offset = game.offset,
		    width = el.get("winWidth") - padding.x,
		    height = el.get("winHeight") - padding.y,
		    ratio = 1;

		Y.Solitaire.Application.windowHeight = height;
		ratio = Math.min((width - normalize(offset.left)) / game.width(), (height - normalize(offset.top)) / game.height());

		Y.fire("fieldResize", ratio, width, height);
		GameChooser.refit();
		Fade.resize();
		Backgrounds.resize();
		Confirmation.resize();
	}

	function playGame(name) {
		active.name = name;
		active.game = lookupGame(name);

		newGame();
	}

	function lookupGame(name) {
		return Y.Solitaire[games[name]] || Y.Solitaire[name];
	}

	function load() {
		var save = Y.Solitaire.SaveManager.getSavedGame();

		if (save.name !== "") {
			active.name = save.name;
		}

		attachEvents();
		Options.load();

		Preloader.preload();
		Preloader.loaded(function () {
			showChromeStoreLink();
			if (save.serialized !== "") {
				clearDOM();
				active.game = lookupGame(active.name);

				try {
					active.game.cleanup();
					active.game.loadGame(save.serialized);
				} catch (e) {
					playGame(active.name);
				}
			} else {
				playGame(active.name);
			}
		});

		GameChooser.init();
	}

	function clearDOM() {
		Y.all(".stack, .card").remove();
	}

	function restart() {
		var save = Y.Solitaire.SaveManager.getSavedGame("initial-game"),
		    game = active.game;

		clearDOM();
		game.cleanup();

		if (save.serialized !== "") {
			game.loadGame(save.serialized);
		} else {
			game.newGame();
		}
	}

	function newGame() {
		var game = active.game;

		clearDOM();
		game.cleanup();
		game.newGame();
	}

	function exportAPI() {
		Y.Solitaire.Application = {
			windowHeight: 0,
			resizeEvent: "resize",
			GameChooser: GameChooser,
			Confirmation: Confirmation,
			newGame: newGame,
			nameMap: nameMap,
			currentTheme: function () { return Themes.current; }
		};
	}

        function hideChromeStoreLink() {
		Y.one(".chromestore").addClass("hidden");
		localStorage["disable-chromestore-link"] = "true";
        }

	function showChromeStoreLink() {
		var key = "disable-chromestore-link";

		if (Y.UA.chrome && (localStorage[key] !== "true" || !Y.Cookie.get(key, Boolean))) {
			Y.one(".chromestore").removeClass("hidden");
		}
	}

	var Preloader = {
		loadingCount: 0,
		showFade: true,

		loaded: function (callback) {
			if (this.loadingCount) {
				setTimeout(function () {
					this.loaded(callback);
				}.bind(this), 100);
			} else {
				Y.one(".loading").addClass("hidden");
				callback();
				if (this.showFade) {
					Fade.hide();
				}
			}
		},
	
		load: function (path) {
			var image = new Image;

			image.onload = function () {
				--this.loadingCount;
			}.bind(this);

			// don't freeze the page if there's an error preloading an image
			image.onerror = function () {
				--this.loadingCount;
			}.bind(this);

			image.src = path;

			this.loadingCount++;
		},

		preload: function (fade) {
			    var rank,
			    icons = ["agnes",
			    	     "flower-garden",
				     "forty-thieves",
				     "freecell",
				     "gclock",
				     "golf",
				     "klondike1t",
				     "klondike",
				     "montecarlo",
				     "pyramid",
				     "scorpion",
				     "spider1s",
				     "spider2s",
				     "spiderette",
				     "spider",
				     "tritowers",
				     "will-o-the-wisp",
				     "yukon"];

			Y.Array.each(["s", "h", "c", "d"], function (suit) {
				for (rank = 1; rank <= 13; rank++) {
					this.load(Y.Solitaire.Card.base.theme + "/" + suit + rank + ".png");
				}
			}, this);

			this.load(Y.Solitaire.Card.base.theme + "/facedown.png");
			this.load(Y.Solitaire.Card.base.theme + "/freeslot.png");

			Y.Array.each(icons, function (image) {
				this.load("layouts/mini/" + image + ".png");
			}, this);

			this.showFade = fade !== false;
			if (this.showFade) {
				Fade.show();
			}

			Y.one(".loading").removeClass("hidden");
		}
	};

	yui.use.apply(yui, modules().concat(main));
}());
