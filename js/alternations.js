YUI.add("alternations", function (Y) {

var Solitaire = Y.Solitaire,
    Alternations = Solitaire.Alternations = instance(Solitaire, {
	fields: ["Deck", "Foundation", "Tableau", "Waste"],

	deal: function () {
		var deck = this.deck,
		    tableau = this.tableau.stacks,
		    stack = 0,
		    row = 0,
		    card,
		    i;

		for (i = 0; i < tableau.length * 7; i++) {
			card = deck.pop();

			if (!(row % 2)) {
				card.faceUp();
			}
			tableau[stack++].push(card);

			if (!((i + 1) % 7)) {
				stack = 0;
				row++;
			}
		}

		deck.createStack();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0],
		    card;

		this.withoutFlip(function () {
			card = deck.last();
			if (card) {
				card.flipPostMove();
		       		card.faceUp().moveTo(waste);
			}
		});
	},

    	Deck: instance(Solitaire.Deck, {
		count: 2,

		stackConfig: {
			total: 1,
			layout: {
				top: function () { return Y.Solitaire.Card.height * 1.5 },
				left: 0
			}
		},

		field: "deck"
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				top: function () { return Y.Solitaire.Card.height * 2.75 },
				left: 0
			}
		},
		field: "waste"
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: function () { return Y.Solitaire.Card.height * 1.5 },
				left: function () { return Y.Solitaire.Card.width * 2.3; }
			}
		},
		field: "tableau"
	},

	Foundation: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.4,
				top: 0,
				left: 0
			}
		},
		field: "foundation"
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "deck":
			case "waste":
				return true;
			case "tableau":
				return this.createProxyStack();
			case "foundation": 
				return false;
			}
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return !target.isFaceDown && target.rank === this.rank + 1;
				}
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return this.suit === target.suit && this.rank === target.rank + 1;
				}
			default:
				return false;
			}
		}
	}),

	Stack: instance(Solitaire.Stack, {
		images: {
			foundation: "freeslot.png",
			tableau: "freeslot.png"
		},

		validTarget: function (stack) {
			return stack.field === "tableau" &&
			    this.first().validTarget(stack);
		}
	})
    });

Y.Array.each(Alternations.fields, function (field) {
	Alternations[field].Stack = instance(Alternations.Stack);
});

Y.mix(Alternations.Tableau.Stack, {
	setCardPosition: function (card) {
		var rankHeight,
		    last = this.cards.last(),
		    top,
		    left = this.left;

		if (last) {
			rankHeight = last.isFaceDown ? last.rankHeight * 2 : last.rankHeight;
			top = last.top + rankHeight;
		} else {
			top = this.top;
		}

		card.left = left;
		card.top = top;
	}
}, true);
}, "0.0.1", {requires: ["solitaire"]});
