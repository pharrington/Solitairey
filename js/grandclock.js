YUI.add("grandfathers-clock", function (Y) {

function wrap(array, index) {
	var len = array.length;

	index %= len;
	if (index < 0) { index += len; }

	return array[index];
}

function inRange(low, high, value) {
	if (low <= high) {
		return low <= value && value <= high;
	} else {
		return low <= value || value <= high;
	}
}

Y.namespace("Solitaire.GClock");

var Solitaire = Y.Solitaire,
    GClock = Y.Solitaire.GClock = instance(Solitaire, {
	fields: ["Foundation", "Tableau"],

	deal: function () {
		var card,
		    deck = this.deck,
		    cards = deck.cards,
		    clock = [],
		    suits = ["d", "c", "h", "s"],
		    found,
		    stack = 0,
		    i = 51, rank,
		    foundations = this.foundation.stacks,
		    stacks = this.tableau.stacks,
		    last;

		while (i >= 0) {
			card = cards[i];
			found = false;

			for (rank = 2; rank <= 13; rank++) {
				if (card.rank === rank && card.suit === wrap(suits, rank)) {
					found = true;
					cards.splice(i, 1);
					clock[rank - 2] = card;
					break;
				}
			}

			if (!found) {
				stacks[stack].push(card);
				stack = (stack + 1) % 8;
				card.faceUp();
				last = card;
			}
			i--;
		}

		for (i = 0; i < 12; i++) {
			foundations[(i + 2) % 12].push(clock[i]);
			clock[i].faceUp();
			clock[i].flipPostMove(Solitaire.Animation.interval);
		}

		Solitaire.Util.flipStacks(last);
	},

	height: function () { return this.Card.base.height * 5.75; },
	maxStackHeight: function () { return this.Card.height * 3; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 12,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 3; },
				left: function () { return Solitaire.Card.width * 3.25; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Tableau: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 7.25; }
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		origin: {
			left: function () {
				return Solitaire.game.foundation.stacks[9].left;
			},

			top: function () {
				return Solitaire.game.foundation.stacks[0].top;
			}
		},

		createProxyStack: function () {
			var stack;

			switch (this.stack.field) {
			case "foundation":
				this.proxyStack = null;
				break;
			case "tableau":
				return Solitaire.Card.createProxyStack.call(this);
			}

			return this.proxyStack;
		},

		validTarget: function (stack) {
			var target = stack.last(),
			    rank,
			    hour;

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				hour = (stack.index() + 3) % 12;
				rank = target.rank;

				return  target.suit === this.suit &&
					(target.rank + 1) % 13 === this.rank % 13 &&
					inRange(stack.first().rank, hour, this.rank);
				break;
			default:
				return false;
				break;
			}
		}
	})
});

Y.Array.each(GClock.fields, function (field) {
	GClock[field].Stack = instance(GClock.Stack);
}, true);

Y.mix(GClock.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" && this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(GClock.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	},

	layout: function (layout, i) {
		Solitaire.Stack.layout.call(this, layout, i);
		if (i > 3) {
			this.top = normalize(layout.top) + Solitaire.Card.height * 3.75;
			this.left -= Solitaire.Card.width * 5;
		}
	}
}, true);

Y.mix(GClock.Foundation.Stack, {
	index: function () {
		return GClock.foundation.stacks.indexOf(this);
	},

	layout: function (layout, i) {
		var top = Math.sin(Math.PI * i / 6) * Solitaire.Card.height * 2.25,
		    left = Math.cos(Math.PI * i / 6) * Solitaire.Card.width * 3;

		this.top = top + normalize(layout.top);
		this.left = left + normalize(layout.left);
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "util"]});
