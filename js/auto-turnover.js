/*
 * automatically turn over the first open faceup card in a stack
 */
YUI.add("auto-turnover", function (Y) {
	Y.on("tableau:afterPop", function (stack) {
		var card = stack.cards.last();

		card && card.isFaceDown && card.faceUp();
	});
}, "0.0.1", {requires: ["solitaire"]});
