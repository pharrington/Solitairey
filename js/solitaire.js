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
			Solitaire.offset.top;
	},

	undo: function () {
		Y.fire("undo");
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

	save: function (name) {
		var data = this.serialize(),
		    name = name || "saved-game",
		    twoWeeks = 1206900000;

		Y.Cookie.set(name, data, {expires: new Date(new Date().getTime() + twoWeeks)});
	},

	loadGame: function (data) {
		this.unanimated(function () {
			this.setup(function () {
				this.unserialize(data);
			});
		});

		Y.fire("loadGame");
	},

	newGame: function () {
		Y.Cookie.remove("saved-game");
		this.setup(this.deal);

		Game.save("initial-game");

		Y.fire("newGame");
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

		Y.on("solitaire|endTurn", Game.Events.endTurn);
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

	resize: function (scale) {
		Y.fire("beforeResize");

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

				stack.updateStyle();

				stack.setCards(cards.length, function (i) {
					var card = cards[i];

					card && card.updateStyle();
					return card;
				});	

				stack.update();
			});
		});

		Y.fire("afterResize");
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
		Y.on("mousedown", cancel, document.body);
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
		Y.Cookie.remove("saved-game");
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
			Solitaire.endTurn();
			e.preventDefault();
		},

		clickEmptyDeck: function () {
			Game.redeal();
			Solitaire.moves.reverse();
			Solitaire.endTurn();
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

			var card = Solitaire.activeCard,

			    stack = card.proxyStack,
			    origin = card.stack,
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

			Solitaire.endTurn();
		},

		endTurn: function () {
			Solitaire.moves.length && Undo.push(Solitaire.moves);
			Solitaire.moves = [];
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
				var offset = Solitaire.container().getXY()[0];
				
				return -offset - Y.Solitaire.Card.width;
			},
			top: function () {
				var offset = Solitaire.container().getXY()[1];

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
			this.setImageSrc();

			undo || Solitaire.pushMove({card: this, faceDown: true});

			return this;
		},

		faceUp: function (undo) {
			this.isFaceDown = false;
			this.setRankHeight();
			this.setImageSrc();

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

		autoPlay: function () {
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
					this.moveTo(foundation);
					origin.updateCardsPosition();
					origin.update();

					Solitaire.endTurn();
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
			var groups,
			    node,
			    card = this;

			node = this.node = Y.Node.create("<img class='card'>")
				.setData("target", this)
				.setAttribute("src", this.imageSrc())
				.plug(Y.Plugin.Drop, {
					useShim: false
				});

			node.setStyles({left: -this.width, top: -this.height});
			//this.updateStyle();
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

			var to = {left: this.left + "px", top: this.top + "px", zIndex: this.zIndex},
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
			    gameOffset = Solitaire.offset,
			    self = this;

			Y.Array.each(["top", "left"], function (p) {
				self[p] = normalize(layout[p]);
			});

			this.left += hoffset + gameOffset.left;
			this.top += voffset + gameOffset.top;
		},

		deleteItem: function (card) {
			this.cards.deleteItem(card);
		},

		push: function (card, temp) {
			var last = this.last(),
			    to = this.field,
			    from = card.stack ? card.stack.field : "deck";

			/*
			 * TODO: should zIndex setting up in setCardPosition?
			 */

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

		adjustRankHeight: function () {
			var cards = this.cards,
			    card,
			    last = this.last(),
			    max = Game.maxStackHeight(),

			    sumHidden = 0,
			    sumVisible = 0,
			    sumRankHeights,

			    height = 0,
			    Card = Solitaire.Card,
			    countHidden = 0, countVisible = 0,
			    rhHidden, rhVisible,
			    i, len;

			if (cards.length <= 1) { return; }

			for (i = 0, len = cards.length - 1; i < len; i++) {
				// if gaps in the stack are allowed, the stack's layed out horizontally
				if (!cards[i]) { return; }

				if (cards[i].isFaceDown) {
					sumHidden += Card.hiddenRankHeight;
					countHidden++;
					height += Card.hiddenRankHeight;
				} else {
					sumVisible += Card.rankHeight;
					countVisible++;
					height += Card.rankHeight;
				}
			}

			if (last) {
				height += last.height;
				sumRankHeights = max - last.height;
			}

			if (height <= max) {
				this.rankHeight = 0;
				this.hiddenRankHeight = 0;
				return;
			}

			rhHidden = sumRankHeights * (sumHidden / (sumHidden + sumVisible)) / countHidden;
			rhVisible = sumRankHeights * (sumVisible / (sumHidden + sumVisible)) / countVisible;

			this.hiddenRankHeight = Math.floor(rhHidden);
			this.rankHeight = Math.floor(rhVisible);
		},

		first: function () { 
			return this.cards[0];
		},

		last: function () {
			return this.cards.last();
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

		createNode: function () {
			var node = this.node;

			node = this.node = Y.Node.create("<img class='stack'>")
				.setAttribute("src", this.imageSrc())
				.setData("target", this)
				.plug(Y.Plugin.Drop, {
					useShim: true
				});

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
		interval: 20, // milliseconds
		queue: new Y.AsyncQueue(),

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
			    anim;
		       
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

			anim = new Y.Anim({
				node: node,
				from: from,
				to: to,
				easing: Y.Easing.easeOut,
				duration: duration
			});

			anim.on("end", function () {
				card.positioned = true;
				node.setStyle("zIndex", zIndex);
				card.runCallback();
			});

			q.add(function () { anim.run(); });
			q.run();
		},

		initQueue: function () {
			var q = this.queue;

			q.defaults.timeout = this.interval;
		}
	};

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

}, "0.0.1", {requires: ["dd", "dd-plugin", "dd-delegate", "anim", "async-queue", "cookie", "array-extras"]});
