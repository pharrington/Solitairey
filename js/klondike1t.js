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
