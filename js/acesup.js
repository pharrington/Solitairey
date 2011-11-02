YUI.add("acesup", function (Y) {

var Solitaire = Y.Solitaire,
    AcesUp = Y.Solitaire.AcesUp = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	deal: function () {
		var card,
		    stack,
		    deck = this.deck,
		    stacks = this.tableau.stacks,
		    moved = [];

		for (stack = 0; stack < stacks.length; stack++) {
			card = deck.pop();
			moved.push(card);

			if (stack === stacks.length - 1) {
				card.after(function () {
					Y.Array.forEach(moved, function (c) {
						Solitaire.Animation.flip(c);
					});
				});
			}

			stacks[stack].push(card);
			card.faceUp();
		}

		deck.createStack();
	},

	turnOver: function () {
		var stack,
		    stacks = this.tableau.stacks,
		    deck = this.deck.stacks[0],
		    card,
		    moved = [];

		this.withoutFlip(function () {
			for (stack = 0; stack < stacks.length; stack++) {
				if (!deck.last()) { break; }

				card = deck.last();
				card.moveTo(stacks[stack]);
				card.faceUp();
				moved.push(card);
			}
		});

		card.after(function () {
			Y.Array.forEach(moved, function (c) {
				Solitaire.Animation.flip(c);
			});
		});
	},

	isWon: function () {
		return this.foundation.stacks[0].cards.length === 48;
	},

	height: function () { return this.Card.base.height * 3; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 7; }
			}
		},
		field: "foundation"
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck"
	}),

	Tableau: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.6; }
			}
		},
		field: "tableau"
	},

	Events: instance(Solitaire.Events, {
		dragCheck: function (e) {
			if (!Solitaire.game.autoPlay.call(this)) {
				Solitaire.Events.dragCheck.call(this);
			}
		},
	}),

	Card: instance(Solitaire.Card, {
		validTarget: function (stack) {
			if (stack.field === "tableau") {
				return !stack.last();
			}

			if (stack.field !== "foundation" || this.rank === 1) { return false; }

			var valid = false;

			Game.eachStack(function (stack) {
				if (valid) { return; }
				var last = stack.last();

				if (last && last.suit === this.suit && (last.rank > this.rank || last.rank === 1)) {
					valid = true;
				}
			}.bind(this), "tableau");

			return valid;
		},

		playable: function () {
			return this.stack.field === "deck" ||
				(this.isFree() &&
				(this.validTarget(Game.foundation.stacks[0]) || hasFreeTableaus()));
		}
	})
});

function hasFreeTableaus() {
	return Y.Array.some(Game.tableau.stacks, function (stack) {
		return !stack.cards.length;
	});
}

Y.Array.each(AcesUp.fields, function (field) {
	AcesUp[field].Stack = instance(AcesUp.Stack);
});

Y.mix(AcesUp.Deck.Stack, {
	images: {}
}, true);

Y.mix(AcesUp.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left,
		    zIndex = last ? last.zIndex + 1 : 1;

		card.zIndex = zIndex;
		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "array-extras"]});
