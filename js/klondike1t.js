YUI.add("klondike1t", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Klondike1T = Solitaire.Klondike1T = instance(Klondike, {
		redeal: Solitaire.noop,

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    waste = this.waste.stacks[0],
			    card = deck.last();

			card && card.faceUp().moveTo(waste);
		}
	    });

	Klondike1T.Waste.Stack = instance(Klondike.Waste.Stack, {
		update: Solitaire.noop
	});
}, "0.0.1", {requires: ["klondike"]});
