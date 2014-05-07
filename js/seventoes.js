YUI.add("seven-toes", function (Y) {

function getInterval(stack) {
	var i, rank, card;
	card = stack.cards.last();
	rank = card.rank;

	for (i = stack.cards.length - 2; i >= 0; i--) {
		card = stack.cards[i];
		if (card.isFaceDown || card.rank == 13) {
			break;
		}

		rank = card.rank;
	}

	return rank;
}

function getFullStackRank(stack) {
	var i, suit;

	// Only stacks of 13 may qualify
	if (stack.cards.length !== 13) {
		return 0;
	}

	// Stacks must be on a king
	if (stack.cards[0].rank != 13) {
		return 0;
	}

	// Everything must be visible
	if (stack.cards[0].isFaceDown) {
		return 0;
	}

	// Everything must be same suit
	suit = stack.cards[0].suit;
	for (i = 1; i < 13; i++) {
		if (stack.cards[i].suit !== suit) {
			return 0;
		}
	}

	// OK, stack looks good. Return the rank of the 2nd card (on top of the base king)
	return stack.cards[1].rank;
}

var Solitaire = Y.Solitaire,
    Klondike = Solitaire.Klondike,
    SevenToes = Y.Solitaire.SevenToes = instance(Solitaire, {
	fields: ["Foundation", "Tableau", "Deck", "Waste"],
	
	deal: function () {
		var deck,
			foundation,
			card,
			i;

		deck = this.deck;
		for (i = 0; i < this.foundation.stacks.length; i++)
		{
			card = this.deck.pop();
			foundation = this.foundation.stacks[i];
			foundation.push(card);
			card.faceUp();
			card.flipPostMove(Solitaire.Animation.interval * 5);
		}

		deck = this.deck.stacks[0];
		foundation = this.foundation.stacks[0];
		Klondike.deal.call(this);
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
			waste = this.waste.stacks[0],
			updatePosition = Klondike.Card.updatePosition,
			Card = Solitaire.game.Card,
			card,
			moved = [],
			i, stop;

		Card.updatePosition = Solitaire.noop;

		this.withoutFlip(function () {
				card = deck.last();
				moved.push(card);
				card.faceUp();
				card.moveTo(waste);
				card.flipPostMove(Solitaire.Animation.interval * 5);
		});

		Card.updatePosition = updatePosition;
		waste.updateCardsPosition();
	},

	redeal: Solitaire.noop,

	height: function () { return this.Card.base.height * 5; },

	autoPlay: function (simulate) { return false; },

	maxStackHeight: function () { return Solitaire.Card.height * 2.4; },

	Stack: instance(Solitaire.Stack, {
		images: {
			deck: null,
			waste: null,
			tableau: "freeslot.png",
			foundation: "freeslot.png"
		}
	}),

	Foundation: {
		stackConfig: {
			total: 6,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
		field: "foundation"
	},

	Tableau: instance(Klondike.Tableau, {
		stackConfig : {
			total : 7,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 2.5; },
				left: function () { return Solitaire.Card.width * 2.5; }
			}
		}	
	}),

 	Deck: instance(Klondike.Deck, {
		suits: ["s", "h", "c", "d", "s", "h"],
		field : "deck"
	}),

	isWon: function () {
		// Build a bitwise combination of all the complete stacks on the foundation
		var completed = 0,
		i, stack, stackRank;
		for (i = 0; i < this.foundation.stacks.length; i++) {
			stack = this.foundation.stacks[i];
			stackRank = getFullStackRank(stack);
			if (stackRank > 0) {
				completed = completed | (0x1 << (stackRank - 1));
			}
		}

		switch (completed) {
			case 0x111111:
			case 0x111111000000:
				return true;
			default:
				return false;
		}
	},

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "waste",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "deck":
			case "waste":
				return this.isFree();
			case "tableau":
			case "foundation":
				return this.isFree() || this.isBaseKing();
			}
		},

		isFree: function () {
			return this === this.stack.last();
		},

		isBaseKing: function () {
			return (this === this.stack.cards[0] && this.rank === 13 && !this.isFaceDown);
		},

		createProxyStack: function () {
			if (this.isFaceDown) {
				this.proxyStack = null;
				return null;
			}

			var stack = instance(this.stack, {
					proxy: true,
					stack: this.stack
				 	}),
				cards = stack.cards,
				card,
				i, start, len;

			stack.cards = [];
			stack.push(this, true);
			start = cards.indexOf(this);
			len = cards.length;
			if (start === 0 && len > 1 && this.rank !== 13)
			{
				return null;
			}

			for (i = start + 1; i < len; i++) {
				card = cards[i];
				if (stack.validProxy(card)) {
					stack.push(card, true);
				} else {
					break;
				}
			}

			this.proxyStack = i === len ? stack : null;

			return this.proxyStack;
		},

		validTarget: function (cardOrStack) {
			var target, stack;

			if (cardOrStack.field) {
				target = cardOrStack.last();
				stack = cardOrStack;
			} else {
				target = cardOrStack;
				stack = cardOrStack.stack;
			}

			if (!target) {
				return this.rank === 13;
				}

			if (target.isFaceDown) {
				return false;
			}

			switch (stack.field) {
			case "tableau":
			case "foundation":
				if (target.rank === 13) {
					return this.rank !== 13;
				}

				interval = getInterval(stack);

				// King at base of target stack
				if (interval === 13) {
					return this.rank !== 13;
				}

				// Only allow the modulus card.
				return (this.rank % 13) === (target.rank + interval) % 13;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(SevenToes.fields, function (field) {
	SevenToes[field].Stack = instance(SevenToes.Stack);
}, true);

Y.mix(SevenToes.Stack, {
	updateCardsStyle: function () {
	var field = this.field;

	this.eachCard(function (c) {
		if (c.playable()) {
			c.node.addClass("playable");
		} else {
			c.node.removeClass("playable");
		}
		});
	},

}, true);

Y.mix(SevenToes.Stack, {
	validTarget: function (stack) {

		switch (stack.field) {
			case "tableau":
			case "foundation":
				if (stack.cards && stack.cards.last())
				{
					return stack.cards.length < 13 && stack.cards.last().rank === 13;
				}
				else
				{
					return this.first().rank === 13;
				}
			default:
				return false;
			}
	}
}, true);

Y.mix(SevenToes.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
			top = last ? last.top + last.rankHeight : this.top,
			left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(SevenToes.Foundation.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
			top = last ? last.top + last.rankHeight : this.top,
			left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(SevenToes.Waste.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
			top = last ? last.top + last.rankHeight : this.top,
			left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(SevenToes.Waste.Stack, {
	maxStackHeight: function () {
		return Solitaire.Card.height * 4.8;
	}
}, true);

Y.mix(SevenToes.Deck.Stack, {
	createNode: function () {
		Solitaire.Stack.createNode.call(this);
		this.node.on("click", Solitaire.Events.clickEmptyDeck);
		this.node.addClass("playable");
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "klondike"]});
