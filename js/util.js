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
						Solitaire.Animation.flip(c);
					});
				}, delay);

				delay += interval;
			}, "tableau");
		});
	},
});
}, "0.0.1", {requires: ["solitaire"]});
