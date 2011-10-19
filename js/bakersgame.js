YUI.add("bakersgame", function (Y) {
	var BakersGame = Y.Solitaire.BakersGame = instance(Y.Solitaire.Freecell, {
		Card: instance(Y.Solitaire.Freecell.Card, {
			validTableauTarget: function (card) {
				return card.suit === this.suit && card.rank === this.rank + 1;
			}
		})
	});
}, "1.0.0", {requires: ["freecell"]});
