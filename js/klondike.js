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
