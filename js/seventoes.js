YUI.add("seven-toes", function (Y) {

function getInterval(stack) {
	var i, rank, card;
	card = stack.cards.last();
	rank = card.rank;

	for (i = stack.cards.length - 2; i >= 0; i--) {
		card = stack.cards[i];
		if (!card.faceUp || card.rank == 13) {
			break;
		}

		rank = card.rank;
	}

	return rank;
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
			for (i = deck.cards.length, stop = i - 3; i > stop && i; i--) {
				card = deck.last();
				moved.push(card);
				card.faceUp();

				if (i === stop + 1 || i === 1) {
					card.after(function () {
						Y.Array.forEach(moved, function (c) {
							Solitaire.Animation.flip(c);
						});
					});
				}

				card.moveTo(waste);
			}
		});

		Card.updatePosition = updatePosition;

		waste.eachCard(function (c) {
			c.updatePosition();
		});
	},

	redeal: Solitaire.noop,

	height: function () { return this.Card.base.height * 3; },

	maxStackHeight: function () { return Solitaire.Card.height * 1.9; },

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
				top: function () { return Solitaire.Card.height * 2.0; },
				left: function () { return Solitaire.Card.width * 2.5; }
			}
		}	
	}),

 	Deck: instance(Klondike.Deck, {
		suits: ["s", "s", "h", "h", "c", "d"],
		field : "deck"
	}),
	
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
			case "waste":
				return true;
			case "tableau":
				return this.isFree();
			case "foundation":
				return false;
			case "deck":
				return !Solitaire.game.waste.stacks[0].last();
			}
		},

		isFree: function () {
			return this === this.stack.last();
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

// TODO Roll this back? Is it single flip or 3-flip?
Y.mix(SevenToes.Waste.Stack, {
	// always display only the last three cards
	setCardPosition: function (card) {
		var cards = this.cards,
		    last = cards.last(),
		    stack = this;

		Y.Array.each(cards.slice(-2), function (card, i) {
			card.left = stack.left;
			card.top = stack.top;
		});

		if (!cards.length) {
			card.left = stack.left;
		}

		if (cards.length === 1) {
			card.left = stack.left + 0.2 * card.width;
		} else if (cards.length > 1) {
			last.left = stack.left + 0.2 * card.width;
			last.top = stack.top;
			card.left = stack.left + 0.4 * card.width;
		}

		card.top = stack.top;
	}
}, true);

Y.mix(SevenToes.Deck.Stack, {
	createNode: function () {
		Solitaire.Stack.createNode.call(this);
		this.node.on("click", Solitaire.Events.clickEmptyDeck);
		this.node.addClass("playable");
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

}, "0.0.1", {requires: ["solitaire", "klondike"]});
