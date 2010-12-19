YUI.add("spider1s", function (Y) {
	var Spider = Y.Solitaire.Spider1S = instance(Y.Solitaire.Spider);

	Spider.Deck = instance(Y.Solitaire.Spider.Deck, {
		suits: ["s"],
		count: 8
	});
}, "0.0.1", {requires: ["spider"]});
