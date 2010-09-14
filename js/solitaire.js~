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
}

Array.prototype.deleteItem = function (item) {
	var i = this.indexOf(item);

	i != -1 && this.splice(i, 1);
}

Function.prototype.bind = function (o) {
	var f = this;

	return function () {
		var args = argsArray(arguments);

		return f.apply(o, args);
	};
}

Function.prototype.partial = function () {
	var f = this, args = argsArray(arguments);

	return function () {
		var i, len;

		for (i = 0, len = arguments.length; i < len; i++) {
			args.push(arguments[i]);
		}

		return f.apply(this, args);
	};
}

function instance(proto, attrs) {
	var maker = function () {},
	    o;

	maker.prototype = proto;
	o = new maker;
	typeof attrs === "object" && $.extend(o, attrs);

	return o;
}

function normalize(valOrFunction) {
	var val = typeof valOrFunction === "function" ? valOrFunction() : valOrFunction;

	return isNaN(val) ? undefined : val;
}

/* The card that's currently being dragged
 * Before, each card set .data("card") on its respective dom element,
 * and droppables checked ui.draggable.data("card") to see what card was dropped on it
 * however, jquery ui tends to keep old, invalid data in its ddmanager, making the documented and recommend approach broken.
 */
var Solitaire = {
	activeCard: null,

	createField: function (field) {
		var f = instance(field),
		    stackLayout = field.stackConfig.layout,
		    stacks = new Array(field.stackConfig.total);

		field.Stack.field = field.field;
		f.stacks = $.map(stacks, function (_, i) {
			var stack;

			stack = instance(field.Stack);
			stack.layout($.extend({}, stackLayout, {offset: i * stackLayout.spacing}));
			stack.createDOMElement();
			return stack;
		});

		return f;
	},

	init: function () {
		this.foundation = this.createField(this.Foundation);
		this.tableau = this.createField(this.Tableau);
		this.reserve = this.createField(this.Reserve);
		this.deck = new Solitaire.Deck(this);
		Solitaire.game = this;
	},

	autoPlay: function (card) {
		$.each(Solitaire.game.foundation.stacks, function () {
			if (card.stack.last() === card && card.validTarget(this)) {
				card.moveTo(this);
				return;
			}
		});
	},

	Deck: function (game) {
		var suits = ["c", "s", "h", "d"],
		    colors = {c: 0, s: 0, h: 1, d: 1},
		    suit, s,
		    rank;

		this.cards = [];

		for (rank = 1; rank <= 13; rank++ ) {
			for (s = 0; suit = suits[s]; s++) {
				this.cards.push(instance(game.Card, {rank: rank, suit: suit, color: colors[suit]}));
			}
		}
	},

	Events: {
		dragStart: function (card, event) {
			if (!card.dragStack) {
				$(this).css("zIndex", null);
				return false;
			}
			Solitaire.activeCard = card;
		},

		dragStop: function (card) {
			var body = $("body");

			$.each(card.dragStack.cards, function () {
				this.dragStack = null;
				body.append(this.domElement);
			});
			Solitaire.activeCard = null;
		},

		drop: function (target, event, ui) {
			var stack = Solitaire.activeCard.dragStack,
			    target = target.stack || target;

			if ((stack.cards.length === 1 && stack.first().validTarget(target)) ||
			    stack.validTarget(target)) {
				$(Solitaire.activeCard.domElement).draggable("option", "revert", false);
				$.each(stack.cards, function () {
					this.moveTo(target);
				});
			}
		}
	},

	Card: {
		zIndex: 0,
		width: 72,
		height: 96,
		rankHeight: 18,

		createDOMElement: function () {
			this.domElement =
				$("<div class='card'>")
				.addClass(this.suit + this.rank)
				/* if position is not set here, jquery ui draggable will set position: relative */
				.css({left: this.left, top: this.top, position: "absolute"})
				.dblclick(Solitaire.autoPlay.partial(this))
				.draggable({
					revert: true,
					revertDuration: 100,
					zIndex: 100,
					helper: this.stackHelper.bind(this),
					start: Solitaire.Events.dragStart.partial(this),
					stop: Solitaire.Events.dragStop.partial(this)
				})
				.droppable({
					tolerance: "pointer",
					drop: Solitaire.Events.drop.partial(this)
				});
			$("body").append(this.domElement);

			return this.domElement;
		},
		
		createStack: function () {
			var stack = instance(this.stack),
			    cards = stack.cards,
			    card,
			    i, len;

			stack.cards = [];
			stack.push(this, true);

			for (i = cards.indexOf(this) + 1, len = cards.length; i < len; i++) {
				card = cards[i];
				if (card.validTarget(stack)) {
					stack.push(card, true);
				} else {
					break;
				}
			}

			this.dragStack = i === len ? stack : null;
			return this.dragStack;
		},

		stackHelper: function () {
			var stack = this.createStack(),
			    domElement,
			    top = this.top,
			    left = this.left;
			
			if (!stack) { return this.domElement; }
			domElement = $("<div class='stack'>").css({left: -left, top: -top});

			$.each(stack.cards, function () {
				this.dragStack = stack;
				domElement.append(this.domElement);
			});

			$("body").append(domElement);
			return domElement;
		},

		updatePosition: function () {
			this.domElement && this.domElement.css({
				left: this.left,
				right: this.right,
				top: this.top,
				zIndex: this.zIndex
			});
		},

		moveTo: function (stack) {
			this.stack.deleteItem(this);
			stack.push(this);
			this.updatePosition();
		}
	},

	Stack: {
		layout: function (layout) {
			var offset = normalize(layout.offset) * Solitaire.Card.width,
			    self = this;

			$.each(["top", "right", "left"], function () {
				self[this] = normalize(layout[this]);
			});

			if (!isNaN(this.left)) { this.left += offset; }
			if (!isNaN(this.right)) { this.right += offset; }
			this.width = Solitaire.Card.width;
			this.height = Solitaire.Card.height;

			this.cards = [];
		},

		deleteItem: function (card) {
			this.cards.deleteItem(card);
		},

		push: function (card, temp) {
			var last = this.last();

			if (!temp) {
				this.setCardPosition(card);
				card.stack = this;
			}

			if (last) { card.zIndex = last.zIndex + 1; }

			this.cards.push(card);
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
			card.right = isNaN(this.right) ? null : this.right;
		},

		createDOMElement: function () {
			this.domElement = $("<div class='stack freestack'>")
					.css({left: this.left, top: this.top, right: this.right})
					.droppable({
						tolerance: "pointer",
						drop: Solitaire.Events.drop.partial(this)
					});
			$("body").append(this.domElement);
			$.each(this.cards, Solitaire.Card.createDOMElement);

			return this.domElement;
		}

	}
};

$.extend(Solitaire.Deck.prototype, {
	pop: function () {
		var cards = this.cards,
		    i = ~~(Math.random() * cards.length),
		    card;
		
		card = cards.splice(i, 1)[0];
		return card;
	}
});
