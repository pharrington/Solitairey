YUI.add("spider", function (Y) {

var availableMoves = 0,
    Solitaire = Y.Solitaire,
    Spider = Solitaire.Spider = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.AutoStackClear.register();
		Solitaire.createEvents.call(this);
	},

	deal: function () {
		var stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks,
		    row;

		for (row = 0; row < 5; row++) {
			for (stack = 0; stack < 10; stack++) {
				if (stack < 4 || row < 4) {
					stacks[stack].push(deck.pop());			
				}
			}
		}

		for (stack = 0; stack < 10; stack++) {
			stacks[stack].push(deck.pop().faceUp());
		}

		deck.createStack();
	},

	redeal: function () {},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    i, len;

		if (hasFreeTableaus()) {
			return;
		}

		this.eachStack(function (stack) {
			var card = deck.last();

			if (card) {
				card.faceUp().moveTo(stack).after(function () {
					this.stack.updateCardsPosition();
				});
			}
		}, "tableau");
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
		field: "foundation",
		draggable: false
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

	Tableau: {
		stackConfig: {
			total: 10,
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
			var previous = this.stack[this.index - 1];

			switch (this.stack.field) {
			case "tableau":
				return this.createProxyStack();
			case "deck": 
				return !hasFreeTableaus();
			case "foundation":
				return false;
			}
		},

		createProxyStack: function () {
			var stacks,
			    stacks = Game.tableau.stacks,
			    freeslots = 0;

			availableMoves = 0;
			for (i = 0; i < stacks.length; i++) {
				stack = stacks[i];
				!stack.last() && freeslots++;
			}

			availableMoves = freeslots;

			return Solitaire.Card.createProxyStack.call(this);
		},

		validTarget: function (stack) {
			if (stack.field !== "tableau") { return false; }

			var target = stack.last();

			return !target ? availableMoves > 0 : !target.isFaceDown && target.rank === this.rank + 1;
		}
	})
});

function hasFreeTableaus() {
	return Y.Array.some(Game.tableau.stacks, function (stack) {
		return !stack.cards.length;
	});
}

Y.Array.each(Spider.fields, function (field) {
	Spider[field].Stack = instance(Spider.Stack);
});


Y.mix(Spider.Stack, {
	validCard: function (card) {
		if (card.suit === this.cards.last().suit) {
			return true;
		} else {
			return availableMoves-- > 0;
		}
	},

	validTarget: function (stack) {
		switch (stack.field) {
		case "tableau":
			return this.first().validTarget(stack);
			break;
		case "foundation":
			return this.cards.length === 13;
			break;
		}
	}
}, true);

Y.mix(Spider.Deck.Stack, {
	setCardPosition: function (card) {
		var numCards = this.cards.length,
		    numTableaus = Solitaire.game.tableau.stacks.length;

		card.top = this.top;
		card.left = this.left + Math.floor(numCards / numTableaus) * card.width * 0.2;
	}
}, true);

Y.mix(Spider.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);
}, "0.0.1", {requires: ["auto-stack-clear"]});
