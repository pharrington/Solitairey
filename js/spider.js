YUI.add("spider", function (Y) {

var availableMoves = 0,
    Solitaire = Y.Solitaire,
    Util = Solitaire.Util,
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
		    card,
		    row,
		    anim = Solitaire.Animation,
		    delay = anim.interval * stacks.length * 4;

		for (row = 0; row < 5; row++) {
			for (stack = 0; stack < 10; stack++) {
				if (stack < 4 || row < 4) {
					stacks[stack].push(deck.pop());			
				}
			}
		}

		for (stack = 0; stack < 10; stack++) {
			card = deck.pop();
			card.flipPostMove(delay);
			stacks[stack].push(card);
			card.faceUp();
		}

		deck.createStack();
	},

	redeal: Solitaire.noop,

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    anim = Solitaire.Animation,
		    i, len;

		if (Util.hasFreeTableaus()) {
			return;
		}

		this.withoutFlip(function () {
			this.eachStack(function (stack) {
				var card = deck.last();

				if (card) {
					card.faceUp().moveTo(stack).after(function () {
						this.stack.updateCardsPosition();
						anim.flip(this);
					});
				}
			}, "tableau");
		});

		setTimeout(function () {
			Game.eachStack(function (stack) {
				Y.fire("tableau:afterPush", stack);
				Game.endTurn();
			}, "tableau");
		}, 0);
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
			switch (this.stack.field) {
			case "tableau":
				return this.createProxyStack();
			case "deck": 
				return !Util.hasFreeTableaus();
			case "foundation":
				return false;
			}
		},

		createProxyStack: function () {
			availableMoves = Util.freeTableaus().length;

			return Solitaire.Card.createProxyStack.call(this);
		},

		validTarget: function (stack) {
			if (stack.field !== "tableau") { return false; }

			var target = stack.last();

			return !target ? availableMoves > 0 : !target.isFaceDown && target.rank === this.rank + 1;
		}
	})
});

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
}, "0.0.1", {requires: ["auto-stack-clear", "util"]});
