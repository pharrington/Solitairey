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
