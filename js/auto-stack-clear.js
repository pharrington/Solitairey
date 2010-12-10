/*
 * Stack extension class to automatically move complete stacks/runs to the foundation
 */
YUI.add("auto-stack-clear", function (Y) {
	var Solitaire = Y.Solitaire;

	Solitaire.AutoStackClear = {
		isComplete: function (callback) {
			var cards = this.cards,
			    rank,
			    suit,
			    card,
			    complete,
			    i;

			if (!cards.length) { return false; }

			for (i = cards.length - 1, rank = 1, suit = cards[i].suit; i >= 0 && rank < 14; i--, rank++) {
				card = cards[i];

				if (card.isFaceDown || card.rank !== rank || card.suit !== suit) {
					return false;
				}
			}

			complete = rank === 14;
			complete && typeof callback === "function" && callback.call(this, i + 1);
			return complete;
		},

		clearComplete: function (startIndex) {
			var foundation,
			    cards = this.cards,
			    count = cards.length - startIndex;

			// find the first empty foundation
			foundation = Y.Array.find(Solitaire.game.foundation.stacks, function (stack) {
				return !stack.cards.length;
			});

			Solitaire.stationary(function () {
				while (count) {
					cards.last().moveTo(foundation);
					count--;
				}
			});
		},

		afterPush: function () {
			return !this.isComplete(this.clearComplete);
		}
	};
}, "0.0.1", {requires: ["solitaire"]});
