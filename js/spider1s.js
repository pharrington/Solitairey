YUI.add("spider1s", function (Y) {
	var Spider = Y.Solitaire.Spider1S = instance(Y.Solitaire.Spider);

	Spider.Deck.suits = ["s"];
	Spider.Deck.count = 8;
}, "0.0.1", {requires: ["spider"]});
