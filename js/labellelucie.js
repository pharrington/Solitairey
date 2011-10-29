YUI.add("labellelucie", function (Y) {

var Solitaire = Y.Solitaire,
    LaBelleLucie = Y.Solitaire.LaBelleLucie = instance(Solitaire, {
	redeals: 0,
	redealSeed: 0,

	fields: ["Foundation", "Tableau", "Deck"],

	initRedeals: function () {
		this.redeals = 2;
		this.redealSeed = Math.random() * 0x7FFFFFFF >>> 0;
		this.deck.stacks[0].node.addClass("playable");
	},

	createEvents: function () {
		Solitaire.createEvents.call(this);
		Y.delegate("click", Solitaire.Events.clickEmptyDeck, Solitaire.selector, ".stack");

		Y.on("solitaire|newGame", this.initRedeals.bind(this));

		Y.on("solitaire|afterSetup", function () {
			if (Game.redeals) {
				Game.deck.stacks[0].node.addClass("playable");
			}
		});
	},

	serialize: function () {
		var seed = this.redealSeed,
		    seedString = String.fromCharCode(seed >> 24) +
				String.fromCharCode((seed >> 16) & 0xFF) +
				String.fromCharCode((seed >> 8) & 0xFF) +
				String.fromCharCode(seed & 0xFF);

		return String.fromCharCode(this.redeals) + seedString + Solitaire.serialize.call(this);
	},

	unserialize: function (serialized) {
		this.redeals = serialized.charCodeAt(0);
		this.redealSeed = serialized.charCodeAt(1) << 24 +
				serialized.charCodeAt(2) << 16 +
				serialized.charCodeAt(3) << 8 +
				serialized.charCodeAt(4);
		
		return Solitaire.unserialize.call(this, serialized.substr(5));
	},

	redeal: function () {
		if (!this.redeals) { return; }

		var deck = this.deck;
		deck.cards = [];

		Game.eachStack(function (stack) {
			stack.eachCard(function (card) {
				card.pushPosition();
			});

			var cards = stack.cards;

			stack.cards = [];
			deck.cards = deck.cards.concat(cards);
		}, "tableau");

		Game.pushMove(function () {
			Game.redeals++;
		});

		deck.msSeededShuffle(this.redealSeed);

		this.deal(true);
		this.redeals--;
		if (!this.redeals) {
			this.deck.stacks[0].node.removeClass("playable");
		}
	},

	deal: function (redeal) {
		var card,
		    deck = this.deck,
		    stack,
		    stacks = Game.tableau.stacks,
		    i;

		for (stack = 0; stack < 18; stack++) {
			for (i = 0; i < 3; i++) {
				card = deck.pop();

				if (!card) { break; }

				stacks[stack].push(card);
				if (!redeal) { card.faceUp(); }
			}
		}

		if (!redeal) {
			Solitaire.Util.flipStacks(stacks[stacks.length - 1].last());
			deck.createStack();
		}
	},

	width: function () { return this.Card.base.width * 12.5; },
	height: function () { return this.Card.base.height * 7; },
	maxStackHeight: function () { return Solitaire.Card.height * 2.5; },

	Stack: instance(Solitaire.Stack, {
		images: {
			deck: "freeslot.png",
			foundation: "freeslot.png",
			tableau: null
		},

		validTarget: function (stack) {
			return stack.field === "tableau" &&
			    this.first().validTarget(stack);
		},

		validCard: function () { return false; }
	}),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.5,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.5; }
			}
		},
		field: "foundation",
	},

	Tableau: {
		stackConfig: {
			total: 18,
			layout: {
				hspacing: 2.5,
				top: function () { return Solitaire.Card.width * 2; },
				left: 0
			}
		},
		field: "tableau",
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				top: 0,
				left: 0
			}
		},
		field: "deck",
	}),

	Card: instance(Solitaire.Card, {
		playable: function () {
			return this.stack.field === "tableau" && this === this.stack.last();
		},

		validTableauTarget: function (target) {
			if (!target) {
				return false;
			} else {
				return target.suit === this.suit && target.rank === this.rank + 1;
			}
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				return this.validTableauTarget(target);
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

Y.Array.each(LaBelleLucie.fields, function (field) {
	LaBelleLucie[field].Stack = instance(LaBelleLucie.Stack);
});


Y.mix(LaBelleLucie.Tableau.Stack, {
	setCardPosition: function (card) {
		var rankWidth = card.width / 4,
		    last = this.cards.last(),
		    top = this.top,
		    left = last ? last.left + rankWidth : this.left,
		    zIndex = last ? last.zIndex + 1 : 1;

		card.zIndex = zIndex;
		card.left = left;
		card.top = top;
	},

	layout: function (layout, i) {
		var row = Math.floor(i / 5);

		Solitaire.Stack.layout.call(this, layout, i);

		this.top += Solitaire.Card.height * 1.5 * row;
		this.left -= Solitaire.Card.width * 12.5 * row;
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "util"]});
