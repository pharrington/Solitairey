YUI.add("freecell", function (Y) {

var Solitaire = Y.Solitaire,
    Freecell = Y.Solitaire.Freecell =  instance(Solitaire, {
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    stack = 0,
		    stacks = this.tableau.stacks,
		    delay = Solitaire.Animation.interval * 50;

		while (card = this.deck.pop()) {
			stacks[stack].push(card);			
			card.faceUp();
			card.flipPostMove(delay);
			stack++;
			if (stack === stacks.length) { stack = 0; }
		}
	},

	openSlots: function (exclude) {
		var total = 1,
		    freeTableaus = 0,
		    i,
		    stack,
		    rStacks = this.reserve.stacks,
		    tStacks = this.tableau.stacks;

		for (i = 0; i < rStacks.length; i++) {
			stack = rStacks[i];
			!stack.last() && total++;
		}

		for (i = 0; i < tStacks.length; i++) {
			stack = tStacks[i];
			exclude !== stack && !tStacks[i].last() && freeTableaus++;
		}

		total *= Math.pow(2, freeTableaus);

		return total;
	},

	Stack: instance(Solitaire.Stack),

	height: function () { return this.Card.base.height * 5; },

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
		playable: function () {
			switch (this.stack.field) {
			case "reserve":
				return true;
			case "tableau":
				return this.createProxyStack();
			case "foundation": 
				return false;
			}
		},

		createProxyStack: function () {
			var stack = Solitaire.Card.createProxyStack.call(this);

			this.proxyStack = stack && stack.cards.length <= Solitaire.game.openSlots(stack) ? stack : null;
			return this.proxyStack;
		},

		validTableauTarget: function (card) {
			return card.color !== this.color && card.rank === this.rank + 1;
		},

		validTarget: function (cardOrStack) {
			var stack, target;

			if (cardOrStack.field) {
				stack = cardOrStack;
				target = stack.last();
			} else {
				target = cardOrStack;
				stack = target.stack;
			}

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return this.validTableauTarget(target);
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

		return this.cards.length <= Solitaire.game.openSlots(stack, this.last());
	}
}, true);

Y.mix(Freecell.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
