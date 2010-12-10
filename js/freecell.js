YUI.add("freecell", function (Y) {

Y.namespace("freecell");

var Solitaire = Y.Solitaire,
    Freecell = Y.Solitaire.Freecell =  instance(Solitaire, {
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    stack = 0,
		    stacks = this.tableau.stacks;

		while (card = this.deck.pop()) {
			stacks[stack].push(card.faceUp());			
			stack++;
			if (stack === 8) { stack = 0; }
		}
	},

	openSlots: function (exclude) {
		var total = 0,
		    i,
		    stack,
		    rStacks = this.reserve.stacks,
		    tStacks = this.tableau.stacks;

		for (i = 0; i < 4; i++) {
			stack = rStacks[i];
			!stack.last() && total++;
		}

		for (i = 0; i < 8; i++) {
			stack = tStacks[i];
			exclude !== stack && !tStacks[i].last() && total++;
		}

		return total;
	},

	width: function () { return this.Card.base.width * 11; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 6; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "reserve",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		createProxyStack: function () {
			var stack = Solitaire.Card.createProxyStack.call(this);

			this.proxyStack = stack && stack.cards.length <= Freecell.openSlots(stack) + 1 ? stack : null;
			return this.proxyStack;
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
			case "reserve":
				return !target;
				break;
			}
		}
	})
});

Y.Array.each(Freecell.fields, function (field) {
	Freecell[field].Stack = instance(Freecell.Stack);
}, true);

Y.mix(Freecell.Stack, {
	validTarget: function (stack) {
		if (stack.field !== "tableau" ||
		    !this.first().validTarget(stack)) { return false; }

		return this.cards.length <= Freecell.openSlots(stack, this.last()) + 1;
	}
}, true);

Y.mix(Freecell.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + Solitaire.Card.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
