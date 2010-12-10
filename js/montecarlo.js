YUI.add("monte-carlo", function (Y) {

var Solitaire = Y.Solitaire,
    MonteCarlo = Y.Solitaire.MonteCarlo = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.createEvents.call(this);

		Y.delegate("click", Solitaire.Events.clickEmptyDeck, Solitaire.selector, ".stack");
	},

	deal: function () {
		var card,
		    stack,
		    i,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (stack = 0; stack < 5; stack++) {
			for (i = 0; i < 5; i++) {
				card = deck.pop().faceUp();
				stacks[stack].push(card);
			}
		}

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

		while (i < 25 && deck.cards.length) {
			if (!(i % 5)) { s++; }
			card = deck.last().faceUp();
			card.moveTo(stacks[s]);
			card.node.setStyle("zIndex", 100 - i);
			i++;
		}

	},

	width: function () { return this.Card.base.width * 10.75; },
	height: function () { return this.Card.base.height * 7.5; },

	Stack: instance(Solitaire.Stack, {
		images: { deck: "dondorf/freeslot.png" },

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
			    foundation = Solitaire.game.foundation.stacks[0];
			    target = e.drop.get("node").getData("target");

			if (!active) { return; }

			Solitaire.stationary(function () {
				target.moveTo(foundation);
				active.moveTo(foundation);
			});
		}
	}),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 8.5; }
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
				vspacing: 1.25,
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.5; }
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
			if (!(this.rank === card.rank && card.isFree())) { return false; }

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

	layout: function (layout) {
		var hoffset = layout.hoffset * Solitaire.Card.width,
		    voffset = layout.voffset * Solitaire.Card.height,
		    self = this;

		Y.Array.each(["top", "left"], function (p) {
			self[p] = normalize(layout[p]);
		});

		this.left += hoffset;
		this.top += voffset;
	},

	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = this.top,
		    left = last ? last.left + card.width * 1.25 : this.left;

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
