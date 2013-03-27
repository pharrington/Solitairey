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
			foundation[i].push(card);
			card.faceUp();
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
					return this.rank === 13;
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

	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(Bisley.Foundation.Stack, {
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
