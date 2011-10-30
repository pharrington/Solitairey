YUI.add("flower-garden", function (Y) {

var availableMoves = 0,
    Solitaire = Y.Solitaire,
    Util = Solitaire.Util,
    FlowerGarden = Y.Solitaire.FlowerGarden = instance(Solitaire, {
	offset: {left: function () { return Solitaire.Card.base.width * 1.5; }, top: 70},
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    deck = this.deck,
		    reserve = this.reserve.stacks[0],
		    stack = 0,
		    i,
		    stacks = this.tableau.stacks;

		for (i = 0; i < 36; i++) {
			card = deck.pop();
			card.origin = {
				left: card.width * 1.25 * (i % 6),
				top: -card.height
			};
			stacks[stack].push(card);			
			card.faceUp();
			card.flipPostMove(0);

			stack++;
			if (stack === 6) { stack = 0; }
		}

		card.after(function () {
			Solitaire.Animation.flip(this);

			setTimeout(function () {
				reserve.eachCard(function (c) {
					Solitaire.Animation.flip(c);
				});
			}, Solitaire.Animation.interval * 20);
		});

		while (card = deck.pop()) {
			reserve.push(card);
			card.faceUp();
		}
	},

	height: function () { return this.Card.base.height * 5.5; },
	maxStackHeight: function () { return this.Card.height * 3.1; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 4.5; },
				left: function () { return Solitaire.Card.width * 0.2; }
			}
		},
		field: "reserve",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 6,
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
		playable: function () {
			switch (this.stack.field) {
			case "foundation": return false;
			case "tableau": return this.createProxyStack();
			case "reserve": return true;
			}
		},

		createProxyStack: function () {
			var stack;

			switch (this.stack.field) {
			case "foundation":
				this.proxyStack = null;
				break;
			case "tableau":
				availableMoves = Util.freeTableaus().length;

				return Solitaire.Card.createProxyStack.call(this);
			case "reserve":
				stack = instance(this.stack);
				stack.cards = [this];
				this.proxyStack = stack;
				break;
			}

			return this.proxyStack;
		},

		moveTo: function (stack) {
			var cards = this.stack.cards,
			    index = cards.indexOf(this),
			    i, len;

			/*
			 * TODO: fix this hack
			 * if moveTo.call is called after the other card's positions have been saved, the card move is animated twice on undo
			 * the insertion of null is to preserve indexes and prevent this card from getting deleted on undo
			 */

			Solitaire.Card.moveTo.call(this, stack);

			cards.splice(index, 0, null);
			for (i = index + 1, len = cards.length; i < len; i++) {
				cards[i].pushPosition();
			}
			cards.splice(index, 1);
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return availableMoves > 0;
				} else {
					return target.rank === this.rank + 1;
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
				break;
			}
		},

		isFree: function () {
			if (this.stack.field === "reserve") { return true; }
			else { return Solitaire.Card.isFree.call(this); }
		}
	})
}, true);

Y.Array.each(FlowerGarden.fields, function (field) {
	FlowerGarden[field].Stack = instance(FlowerGarden.Stack);
}, true);

Y.mix(FlowerGarden.Stack, {
	images: { foundation: "freeslot.png",
		  tableau: "freeslot.png" },

	validTarget: function (stack) {
		return stack.field === "tableau" && this.first().validTarget(stack);
	},

	validCard: function () {
		return availableMoves-- > 0;
	}
}, true);

Y.mix(FlowerGarden.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + card.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(FlowerGarden.Reserve.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    left = last ? last.left + card.width * 0.4 : this.left,
		    top = this.top;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "util"]});
