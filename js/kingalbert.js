YUI.add("king-albert", function (Y) {

var Solitaire = Y.Solitaire,
    Util = Solitaire.Util,
    KingAlbert = Y.Solitaire.KingAlbert = instance(Solitaire, {
	fields: ["Foundation", "Tableau", "Reserve"],

	height: function () { return this.Card.base.height * 5.3; },
	maxStackHeight: function () { return this.Card.height * 2.75; },

	deal: function () {
		var card,
			stack,
			row,
			deck = this.deck,
			cards = deck.cards,
			tableau = this.tableau.stacks,
			reserve = this.reserve.stacks;

		for (row = 0; row < 9; row++) {
			for (stack = row; stack < 9; stack++) {
				card = deck.pop();
				tableau[stack].push(card);
				card.faceUp();
			}
		}

		Util.flipStacks(card);

		for (stack = 0; stack < 7; stack++) {
			card = deck.pop();
			reserve[stack].push(card);
			card.faceUp();
			card.flipPostMove(2000);
		}
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 6.25; }
			}
		},
		field: "foundation"
	},

	Tableau: {
		stackConfig: {
			total: 9,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau"
	},

	Reserve: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 0.4,
				top: function () { return Solitaire.Card.height * 4.4; },
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "reserve"
	},

	Card: instance(Solitaire.Card, { 
		playable: function () {
			switch (this.stack.field) {
			case "tableau":
				return this.createProxyStack();
			case "reserve":
				return true;
			default:
				return false;
			}
		},

		createProxyStack: function () {
			return Solitaire.Card.createProxyStack.call(this);
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.color !== this.color && target.rank === this.rank + 1;
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

Y.Array.each(KingAlbert.fields, function (field) {
	KingAlbert[field].Stack = instance(KingAlbert.Stack);
});


Y.mix(KingAlbert.Stack, {
	images: {foundation: "freeslot.png", tableau: "freeslot.png" },

	validCard: function (card) {
		return this.cards.length < Math.pow(2, Util.freeTableaus().length);
	},

	validTarget: function (stack) {
		if (stack.field != "tableau") { return false; }

		var freeTableaus = Util.freeTableaus().length;

		if (!stack.first()) {
			freeTableaus--;
		}

		return this.cards.length <= Math.pow(2, freeTableaus);
	}

}, true);

Y.mix(KingAlbert.Reserve.Stack, {
	setCardPosition: function (card) {
		Solitaire.Stack.setCardPosition.call(this, card);
		card.zIndex = this.index();
	}
}, true);

Y.mix(KingAlbert.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
			top = last ? last.top + last.rankHeight : this.top,
			left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);


}, "0.0.1", {requires: ["solitaire", "util"]});
