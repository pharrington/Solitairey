/*
 * automatically turn over the first open faceup card in a stack
 */
YUI.add("auto-turnover", function (Y) {
	Y.namespace("Solitaire.AutoTurnover");

	var Turnover = Y.Solitaire.AutoTurnover,
	    enabled = true;

	Y.on("tableau:afterPop", function (stack) {
		if (!enabled) { return; }

		Y.Array.each(stack.cards, function (card) {
			if (card && card.isFaceDown && card.isFree()) {
				card.faceUp();
			}
		});
	});

	Y.mix(Turnover, {
		enable: function () {
			enabled = true;
		},

		disable: function () {
			enabled = false;
		},

		isEnabled: function () {
			return enabled;
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
