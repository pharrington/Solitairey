YUI.add("calculation", function (Y) {

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

var Solitaire = Y.Solitaire,
    Calculation = Y.Solitaire.Calculation = instance(Solitaire, {
	fields: ["Foundation", "Tableau", "Deck", "Waste"],

	deal: function () {
		var card,
		    deck = this.deck.cards,
		    start = [],
		    suits = ["s", "c", "d", "h"],
    		    rank,
		    found,
		    i = 51,
		    foundations = this.foundation.stacks;

		while (i >= 0) {
			card = deck[i];
			found = false;

			for (rank = 1; rank <= 4; rank++) {
				if (card.rank === rank && card.suit === suits[rank - 1]) {
					found = true;
					deck.splice(i, 1);
					start.push(card);
					break;
				}
			}

			i--;
		}

		start.sort(function (a, b) { return a.rank - b.rank; });

		for (i = 0; i < 4; i++) {
			card = start[i];
			foundations[i].push(card);
			card.faceUp();
		}

		card.after(function () {
			Y.Array.each(start, function (c) {
				Solitaire.Animation.flip(c);
			});
		});

		this.deck.createStack();
	},

	turnOver: function () {
		var last = this.deck.stacks[0].last(),
		    waste = this.waste.stacks[0];

		if (last && !waste.last()) {
			this.withoutFlip(function () {
				last.moveTo(waste);
				last.faceUp();
				last.flipPostMove(0);
			});
		}
	},

	redeal: Solitaire.noop,

	height: function () { return this.Card.base.height * 3; },

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
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
		field: "foundation"
	},

	Tableau: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.25; },
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
		field: "tableau"
	},

	Deck: instance(Solitaire.Deck, {
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
				return this.isFree();
			case "tableau":
				return this.isFree() && this.autoPlay(true);
			case "foundation":
				return false;
			case "deck":
				return !Solitaire.game.waste.stacks[0].last();
			}
		},

		validTarget: function (stack) {
			var target = stack.last(),
			    interval;

			switch (stack.field) {
			case "tableau":
				if (this.stack.field === "tableau") { return false; }
				return true;
			case "foundation":
				interval = stack.index() + 1;

				return target.rank !== 13 && ((this.rank % 13) === (target.rank + interval) % 13);
			default:
				return false;
			}
		}
	})
});

Y.Array.each(Calculation.fields, function (field) {
	Calculation[field].Stack = instance(Calculation.Stack);
}, true);

Y.mix(Calculation.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
