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
		},

		Waste: instance(Klondike.Waste, {
			Stack: instance(Solitaire.Stack)
		})
	    });
}, "0.0.1", {requires: ["klondike"]});
