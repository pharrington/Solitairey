YUI.add("util", function (Y) {

var Solitaire = Y.Solitaire;
    Util = Y.namespace("Solitaire.Util");
    
Y.mix(Util, {
	flipStacks: function (afterCard, delay, interval) {
		var game = Solitaire.game;

		if (delay === undefined) {
			delay = 200;
		}

		if (interval === undefined) {
			interval = 150;
		}

		afterCard.after(function () {
			game.eachStack(function (stack) {
				setTimeout(function () {
					stack.eachCard(function (c) {
						if (!c.isFaceDown) {
							Solitaire.Animation.flip(c);
						}
					});
				}, delay);

				delay += interval;
			}, "tableau");
		});
	},

	moveWasteToDeck: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0];

		while (waste.cards.length) {
			waste.last().faceDown().moveTo(deck);
		}
	},

	hasFreeTableaus: function () {
		return Y.Array.some(Solitaire.game.tableau.stacks, function (stack) {
			return !stack.cards.length;
		});
	},

	freeTableaus: function (card) {
		return Y.Array.filter(Solitaire.game.tableau.stacks, function (stack) {
			return !stack.cards.length;
		});
	}
});
}, "0.0.1", {requires: ["solitaire", "array-extras"]});
