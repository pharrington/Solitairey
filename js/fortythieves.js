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
