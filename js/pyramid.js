YUI.add("pyramid", function (Y) {

var Solitaire = Y.Solitaire,
    ns = Y.namespace("Pyramid"),
    Pyramid = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],

	deal: function () {
		var card,
		    stack,
		    i,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (stack = 0; stack < 7; stack++) {
			for (i = 0; i <= stack; i++) {
				card = deck.pop().faceUp();
				stacks[stack].push(card);
			}
		}

		deck.createStack();
		deck.last().faceUp();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0];

		if (deck.cards.length === 1) { return; }
		console.log("!");
		deck.last().moveTo(waste);
	},

	Stack: instance(Solitaire.Stack, {
		cssClass: "",

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
		dragCheck: function (card, e) {
			if (!Solitaire.game.autoPlay(card, e)) {
				Solitaire.Events.dragCheck(card, e);
			}
		},

		drop: function (e) {
			var active = Solitaire.activeCard,
			    foundation = Solitaire.game.foundation.stacks[0];
			    target = e.drop.get("node").getData("target");

			if (!active) { return; }
			target.moveTo(foundation);
			active.moveTo(foundation);
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
				top: 0,
				left: function () { return Solitaire.Card.width * 5; }
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		validTarget: function (card) {
			if (card.field === "foundation") {
				return this.isFree() && this.rank === 13;
			}

			if (card.isFree()) {
				return this.rank + card.rank === 13;
			}

			return false;
		},

		createProxyStack: function () {
			this.proxyStack = this.isFree() ? this.stack : null;

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
			    next = game.tableau.stacks[stackIndex + 1];

			if (stack.field === "deck" || stack.field === "waste" && !this.isFaceDown) {
				return true;
			} else {
				return !(this.stack.field === "foundation" ||
					next &&
					(next.cards[index] || next.cards[index + 1]));
			}
		},

		turnOver: function () {
			this.stack.field === "deck" && !this.isFaceDown && Solitaire.game.turnOver();
		},

		createStack: function () {},

		createNode: function () {
			Solitaire.Card.createNode.call(this);
			this.node.on("mousedown", Solitaire.game.autoPlay.partial(this));
		},

		stackHelper: function () {
			this.dragStack = {cards: []};
			return this.node;
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
		var last = this.cards.last(),
		    top = this.top,
		    left = last ? last.left + card.width * 1.25 : this.left;

		card.left = left;
		card.top = top;
	},

	push: function (card, temp) {
		Pyramid.Card.zIndex = this.index();
		Pyramid.Stack.push.call(this, card, temp);
	},

	index: function () {
		return Solitaire.game.tableau.stacks.indexOf(this);
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

ns.game = Pyramid;

}, "0.0.1", {requires: ["solitaire"]});
