YUI.add("klondike1t", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Klondike1T = Solitaire.Klondike1T = instance(Klondike, {
		cardsPerTurnOver: 1,

		redeal: Solitaire.noop,

		Waste: instance(Klondike.Waste, {
			Stack: instance(Solitaire.Stack)
		}),

	    	Deck: instance(Klondike.Deck, {
			Stack: instance(Klondike.Deck.Stack, {
				createNode: function () {
					Klondike.Deck.Stack.createNode.call(this);
					this.node.removeClass("playable");
				}
			})
		})
	    });
}, "0.0.1", {requires: ["klondike"]});
