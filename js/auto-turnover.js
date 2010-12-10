/*
 * mixin to automatically turn over the first open faceup card in a stack
 */
YUI.add("auto-turnover", function (Y) {
	Y.Solitaire.AutoTurnover = {
		update: function () {
			var card = this.cards.last();

			card && card.isFaceDown && card.faceUp();
		}
	};
}, "0.0.1", {requires: ["solitaire"]});
