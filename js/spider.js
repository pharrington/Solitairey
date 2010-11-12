YUI.add("spider", function (Y) {

var Solitaire = Y.Solitaire,
    ns = Y.namespace("Spider"),
    Spider = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

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
		    stacks = this.tableau.stacks,
		    i, len;

		if (Y.Array.some(stacks, function (stack) {
			return !stack.cards.length;
			})) {
			return;
		}

		for (i = 0, len = stacks.length; i < len && deck.cards.length; i++) {
			deck.last().faceUp().moveTo(stacks[i]);
		}
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 11.25; }
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
		validTarget: function (stack) {
			if (stack.field !== "tableau") { return false; }

			var target = stack.last();

			return !target || !target.isFaceDown && target.rank === this.rank + 1;
		}
	})
});

Y.Array.each(Spider.fields, function (field) {
	Spider[field].Stack = instance(Spider.Stack);
});


Y.mix(Spider.Stack, {
	cssClass: "freestack",

	validCard: function (card) {
		return card.suit === this.cards.last().suit;
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

Y.mix(Spider.Tableau.Stack, {
	isComplete: function (callback) {
		var cards = this.cards,
		    rank,
		    card,
		    complete,
		    i;

		if (!cards.length) { return false; }

		for (i = cards.length - 1, rank = 1; i >= 0 && rank < 14; i--, rank++) {
			card = cards[i];

			if (card.isFaceDown || card.rank !== rank) {
				return false;
			}
		}

		complete = rank === 14;
		complete && typeof callback === "function" && callback.call(this, i + 1);
		return complete;
	},

	clearComplete: function (startIndex) {
		var foundation = Solitaire.game.foundation.stacks[0],
		    cards = this.cards,
		    count = cards.length - startIndex;


		while (count) {
			cards.last().moveTo(foundation);
			count --;
		}
	},

	afterPush: function () {
		return !this.isComplete(this.clearComplete);
	},

	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Spider.Foundation.Stack.cssClass = "freefoundation";
Spider.Deck.Stack.cssClass = "";

ns.game = Spider;

}, {requires: ["solitaire"]});
