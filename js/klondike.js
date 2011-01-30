YUI.add("klondike", function (Y) {

var Solitaire = Y.Solitaire,
    Klondike = Y.Solitaire.Klondike = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],

	deal: function () {
		var card,
		    piles = 6,
		    stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		while (piles >= 0) {
			card = deck.pop().faceUp();
			stacks[6 - piles].push(card);

			for (stack = 7 - piles; stack < 7; stack++) {
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
		    last,
		    i, stop;

		Klondike.Card.updatePosition = Solitaire.noop;

		for (i = deck.cards.length, stop = i - 3; i > stop && i; i--) {
			deck.last().faceUp().moveTo(waste);
		}

		Klondike.Card.updatePosition = updatePosition;
		waste.update();
	},

	redeal: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0];

		while (waste.cards.length) {
			waste.last().faceDown().moveTo(deck);
		}
	},

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
		validFoundationTarget: function (target) {
			if (!target) {
				return this.rank === 1;
			} else {
				return target.suit === this.suit && target.rank === this.rank - 1;
			}
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
	update: function () {
		var cards = this.cards,
		    stack = this;

		Y.Array.each(cards.slice(-6, -3), function (card, i) {
			card.left = stack.left;
			card.updatePosition();
		});

		Y.Array.each(cards.slice(-3), function (card, i) {
			card.left = stack.left + i * 0.2 * card.width;
			card.updatePosition();
		});
	}
}, true);

Y.mix(Klondike.Deck.Stack, {
	createNode: function () {
		Solitaire.Stack.createNode.call(this);
		this.node.on("click", Solitaire.Events.clickEmptyDeck);
	}
}, true);


}, "0.0.1", {requires: ["solitaire"]});
