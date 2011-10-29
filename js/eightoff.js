YUI.add("eightoff", function (Y) {

var Solitaire = Y.Solitaire,
    Eightoff = Y.Solitaire.Eightoff =  instance(Solitaire, {
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    stack,
		    tableau = this.tableau.stacks,
		    reserve = this.reserve.stacks,
    		    i;

		for (i = 0, stack = 0; i < 48; i++) {
			card = this.deck.pop();
			tableau[stack].push(card);			
			card.faceUp();
			card.flipPostMove(0);
			stack++;
			if (stack === 8) { stack = 0; }
		}

		for (i = 0, stack = 0; i < 4; i++) {
			card = this.deck.pop();
			reserve[stack].push(card);
			card.faceUp();
			card.flipPostMove(0);
			stack++;
		}
	},

	openSlots: function (exclude) {
		var total = 1,
		    i,
		    rStacks = this.reserve.stacks;

		for (i = 0; i < rStacks.length; i++) {
			if (!rStacks[i].last()) {
				total++;
			}
		}

		return total;
	},

	Stack: instance(Solitaire.Stack),

	height: function () { return this.Card.base.height * 5; },

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
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 8,
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
				top: function () { return Solitaire.Card.height * 1.25; },
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		origin: {
			left: function () {
				return Solitaire.Card.width * 5;
			},

			top: function () {
				return Solitaire.container().get("winHeight") - Solitaire.Card.height * 1.2;
			}
		},

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

			this.proxyStack = stack && stack.cards.length <= Eightoff.openSlots(stack) ? stack : null;
			return this.proxyStack;
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return this.rank === 13;
				} else {
					return target.suit === this.suit && target.rank === this.rank + 1;
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

Y.Array.each(Eightoff.fields, function (field) {
	Eightoff[field].Stack = instance(Eightoff.Stack);
}, true);

Y.mix(Eightoff.Stack, {
	validTarget: function (stack) {
		if (stack.field !== "tableau" ||
		    !this.first().validTarget(stack)) { return false; }

		return this.cards.length <= Eightoff.openSlots(stack, this.last());
	}
}, true);

Y.mix(Eightoff.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
