YUI.add("klondike1t", function (Y) {
	var Solitaire = Y.Solitiare,
	    Klondike = Solitaire.Klondike,
	    Klondike1T = instance(Klondike, {
		redeal: Solitaire.noop,

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    waste = this.waste.stacks[0],
			    card = deck.last();

			card && card.moveTo(waste);
		}
	    }
}, "0.0.1", {requires: ["klondike"]});
