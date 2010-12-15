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
	var f = this, args = argsArray(arguments);

	return function () {
		var i, len;

		for (i = 0, len = arguments.length; i < len; i++) {
			args.push(arguments[i]);
		}

		return f.apply(this, args);
	};
};

function instance(proto, attrs) {
	var maker = new Function(),
	//var maker = function () {},
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

function mapToFloat(obj) {
	var p;

	for (p in obj) {
		if (obj.hasOwnProperty(p)) {
			obj[p] = parseFloat(obj[p]);
		}
	}

	return obj;
}

YUI.add("solitaire", function (Y) {

var Game,
    Solitaire = Y.namespace("Solitaire");

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
	selector: "#game",
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

	width: function () { return this.Card.base.width * 10; },
	height: function () { return this.Card.base.height * 6; },

	undo: function () {
		Undo.undo();
		Solitaire.endTurn();
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

				stacks[stackIndex].unserialize(data);
			}
		});
	},

	save: function () {
		var data = this.serialize(),
		    twoWeeks = 1206900000;

		Y.Cookie.set("saved-game", data, {expires: new Date(new Date().getTime() + twoWeeks)});
	},

	loadGame: function (data) {
		this.setup(function () {
			this.unserialize(data);
		});

		Y.fire("loadGame");
	},

	newGame: function () {
		Y.Cookie.remove("saved-game");
		this.setup(this.deal);

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
		Y.fire("beforeSetup");

		Solitaire.moves = null;
		Undo.clear();

		this.init();
		Y.Solitaire.Animation.initQueue();
		this.createStacks();
		this.createEvents();
		this.createDraggables();
		callback.call(this);

		Solitaire.moves = [];
	},

	createEvents: function () {
		var container = Y.one(Solitaire.selector);

		container.delegate("dblclick", Game.autoPlay, ".card");
		container.delegate("contextmenu", Game.autoPlay, ".card");

		container.delegate("click", function (e) {
			e.target.getData("target").turnOver(e);
			Solitaire.moves.reverse();
			Solitaire.endTurn();
		}, ".card");
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

	eachStack: function (callback) {
		Game && Y.Array.each(Game.fields, function (name) {
			var field = Game[name.toLowerCase()];
			field.stacks && Y.Array.each(field.stacks, callback);
		});
	},

	resize: function (scale) {
		this.scale(scale);

		this.unanimated(function () {
			this.eachStack(function (stack, i) {
				var cards = stack.cards,
				    layout = stack.configLayout;

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
		var cancel = Solitaire.preventDefault;

		Game = Solitaire.game = this;

		Y.on("selectstart", cancel, document);
		Y.on("mousedown", cancel, document);
		Y.on("contextmenu", cancel, document);

		Y.Array.each(Game.fields, function (field) {
			Game[field.toLowerCase()] = Game.createField(Game[field]);
		});

		// TODO: refactor this conditional into the above iteration
		if (Game.fields.indexOf("Deck" === -1)) {
			Game.deck = Game.createField(Game.Deck);
		}
	},

	preventDefault: function (e) {
		e.preventDefault();
	},

	autoPlay: function (e) {
		var card = typeof this.getCard === "function"
			? this.getCard()
			: this.getData("target"),
		    origin = card.stack,
		    last = origin.last(),
		    stacks,
		    foundation,
		    i, len;

		if (card.isFaceDown || card.stack.field === "foundation") { return; }

		stacks = Game.foundation.stacks;
		for (i = 0, len = stacks.length; i < len; i++) {
			foundation = stacks[i];
			if (card.isFree() && card.validTarget(foundation)) {
				card.moveTo(foundation);
				origin.update();

				Solitaire.endTurn();
				return true;
			}
		}
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

		Solitaire.moves.length && Undo.push(Solitaire.moves);
		Solitaire.moves = [];
		Solitaire.activeCard = null;
		if (Game.isWon()) {
			Game.win();
		} else {
			Game.save();
		}
	}
});

Y.Solitaire.Events = {
		clickEmptyDeck: function () {
			Game.redeal();
			Solitaire.moves.reverse();
			Solitaire.endTurn();
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
			    node = this.get("dragNode");

			node.setContent(card.createProxyNode());

			!card.proxyStack && Y.one(".yui3-dd-shim").setStyle("cursor", "not-allowed");
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
			    dragNode,
			    node,

			    dragXY = this.dd.realXY,
			    containerXY = root.getXY(),

			    cards,
			    
			    stack,
			    proxyStack = target.proxyStack;

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

				var node = card.node;

				card.proxyStack = null;
				root.append(node);
			});


			cards = stack.cards;
			stack.updateCardsPosition();
		},

		drop: function (e) {
			if (!Solitaire.activeCard) { return; }

			var card = Solitaire.activeCard,

			    stack = card.proxyStack,
			    origin = card.stack,
			    first = stack.first();

			    target = e.drop.get("node").getData("target");

			    target = target.stack || target;

			if ((stack.cards.length === 1 && first.validTarget(target)) ||
			    stack.validTarget(target)) {

				target.pushStack(stack);
			}

			Solitaire.endTurn();
		}
};

Y.Solitaire.Deck = {
		count: 1,
		suits: ["c", "s", "h", "d"],

		init: function () {
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

			this.cards.shuffle();
		},

		createStack: function () {
			var i, len;

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
		node: null,

		base: {
			hiddenRankHeight: 10,
			rankHeight: 32,
			width: 79,
			height: 123,
		},

		origin: {
			left: function () {
				var offset = Solitaire.container().getXY()[0];
				
				return -offset - Y.Solitaire.Card.width;
			},
			top: function () {
				var offset = Solitaire.container().getXY()[1];

				return -offset - Y.Solitaire.Card.height;
			},
		},

		animSpeeds: {slow: 0.5, mid: 0.2, fast: 0.1},

		create: function (rank, suit) {
			var colors = {c: 0, s: 0, h: 1, d: 1};

			return instance(this, {rank: rank, suit: suit, color: colors[suit]});
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
			this.rankHeight = this.isFaceDown ?
				Y.Solitaire.Card.hiddenRankHeight :
				Y.Solitaire.Card.rankHeight;
		},

		imageSrc: function () {
			var src = "dondorf/";

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
				width: this.width,
				height: this.height
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
			} else if (this === stack.last()) {
				this.faceUp();
			}

			e.stopPropagation();
		},

		ensureDOM: function () {
			!this.node && this.createNode();
		},

		isFree: function () {
			return this === this.stack.last();
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

			this.updateStyle();
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

			var stack = instance(this.stack),
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

		createProxyNode: (function () {
			var node = new Y.Node.create("<div>");

			return function () {
				var stack = this.proxyStack,
				    child;

				node.setContent("");
				// if the card isn't playable, create ghost copy
				if (!stack) {
					node.setStyles({
						opacity: 0.6,
						top: -this.top,
						left: -this.left
					}).append(this.node.cloneNode(true));
				} else {
					node.setStyles({opacity: "", top: -this.top, left: -this.left});

					Y.Array.each(this.proxyCards(), function (c) {
						c.proxyStack = stack;
						node.append(c.node);
					});
				}

				return node;
			};
		})(),

		updatePosition: function (fields) {
			if (!this.node) { return; }

			var to = {left: this.left, top: this.top},
			    origin = this.origin;

			this.node.setStyle("zIndex", this.zIndex);
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
		}
	};

Y.Solitaire.Stack = {
		cards: null,
		node: null,
		images: {
			tableau: "dondorf/freeslot.png",
			deck: "dondorf/freeslot.png",
			reserve: "dondorf/freeslot.png",
			foundation: "dondorf/freeslot.png"
		},

		serialize: function () {
			var i, len,
			    cards = this.cards,
			    card,
			    suits = Game.deck.suits,
			    byte,
			    serialized = [];

			for (i = 0, len = cards.length; i < len; i++) {
				card = cards[i];
				if (card) {
					byte = suits.indexOf(card.suit) |
						card.rank << 2 |
						card.isFaceDown << 6; // type coersion!
				} else {
					byte = 128;
				}
				serialized.push(String.fromCharCode(byte));
			}

			return serialized.join("");
		},

		eachCard: function (callback) {
			var i, len,
			    cards = this.cards;

			for (i = 0, len = cards.length; i < len; i++) {
				cards[i] && callback(cards[i]);
			}
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
				card = cardGen(i) || empty;
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

			this.setCards(cards.length, function (i) {
				return cards[i];
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
			return this.images[this.field] || "trans.gif";
		},

		layout: function (layout) {
			var hoffset = layout.hoffset * Y.Solitaire.Card.width,
			    voffset = layout.voffset * Y.Solitaire.Card.height,
			    self = this;

			Y.Array.each(["top", "left"], function (p) {
				self[p] = normalize(layout[p]);
			});

			this.left += hoffset;
			this.top += voffset;
		},

		deleteItem: function (card) {
			this.cards.deleteItem(card);
		},

		push: function (card, temp) {
			var last = this.last(),
			    to = this.field,
			    from = card.stack ? card.stack.field : "deck";

			if (last) { card.zIndex = last.zIndex + 1; }
			else if (to === "deck") { card.zIndex = 200; }
			else if (from === "deck") { card.zIndex = Game.Card.zIndex; }

			if (!temp) {
				card.stack = this;
				this.setCardPosition(card);
				card.ensureDOM();
			}

			this.cards.push(card);
			temp || card.updatePosition({from: from, to: to});
		},

		pushStack: function (proxy) {
			var origin = Solitaire.activeCard.stack,
			    cards = origin.cards,
			    stack = this;

			/* save the card's index in the stack so we can properly undo this move */
			Y.Array.each(cards, function (card, i) {
				card.index = i;
			});

			Game.stationary(function () {
				Y.Array.each(proxy.cards, function (card) {
					card.moveTo(stack);
					card.index = -1;
				});
				Y.Array.each(cards, function (card) {
					card.index = -1;
				});
			});

			origin.update();
			Y.fire(stack.field + ":afterPush", stack);
		},

		first: function () { 
			return this.cards[0];
		},

		last: function () {
			return this.cards.last();
		},

		setCardPosition: function (card) {
			card.top = this.top;
			card.left = isNaN(this.left) ? null : this.left;
		},

		wrapperStyle: function () {
			return {
				left: this.left,
				top: this.top,
				width: Y.Solitaire.Card.width,
				height: Y.Solitaire.Card.height
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
					useShim: false
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
			return card.validTarget(this) && this.validCard(card);
		},

		update: function () {}
	};

Y.Solitaire.Animation = {
		animate: true,
		duration: 0.5, // seconds
		interval: 20, // milliseconds
		queue: new Y.AsyncQueue(),

		init: function (card, to, fields) {
			if (!this.animate) {
				card.node.setStyles(to);
				card.positioned = true;
				return;
			}

			var node = card.node,
			    q = this.queue,
			    speeds = card.animSpeeds,
			    from = mapToFloat({top: node.getStyle("top"), left: node.getStyle("left")}),
			    duration,
			    callback,
			    anim;
		       
			if (from.top === to.top && from.left === to.left) { return; }

			if (!fields ||
			    fields.from === fields.to ||
			    fields.to === "waste" ||
			    fields.to === "foundation") {
				duration = speeds.fast;
			} else if (fields.from === "deck") {
				duration = speeds.slow;
			} else {
				duration = speeds.mid;
			}

			anim = new Y.Anim({
				node: node,
				from: from,
				to: to,
				easing: Y.Easing.easeOut,
				duration: duration
			    });

			anim.on("end", function () {
				card.positioned = true;
				card.animDuration = 0.2;
				fields && typeof fields.callback === "function" && fields.callback();
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
		var origins;

		origins = Y.Array.unique(Y.Array.map(this.pop(), this.act));

		Y.Array.each(origins, function (stack) {
			stack.updateCardsPosition();
			stack.update(true);
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

		return to;
	},
};

}, "0.0.1", {requires: ["dd", "dd-plugin", "dd-delegate", "anim", "async-queue", "cookie", "array-extras"]});
