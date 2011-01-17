YUI.add("solitaire-autoplay", function (Y) {
	var Solitaire = Y.Solitaire,
	    autoPlayInterval = null,
	    autoPlayable = ["Klondike", "Klondike1T", "FortyThieves", "GClock", "Freecell", "FlowerGarden", "Yukon"];

	Y.on("endTurn", function () {
		if (autoPlayable.indexOf(Solitaire.game.name()) === -1) { return; }

		if (autoPlayInterval === null && isWon()) {
			autoPlayInterval = setInterval(autoPlay, 300);
		}
	});

	Y.on("win", function () {
		clearInterval(autoPlayInterval);
		autoPlayInterval = null;
	});

	function autoPlay() {
		var played = false;

		Solitaire.game.eachStack(function (stack) {
			var field = stack.field;

			if (played || field === "foundation" || field === "deck") { return; }

			played = !stack.eachCard(function (card) {
				return !card.autoPlay();
			});
		});
	}

	function isWon() {
		var stop = false;

		Solitaire.game.eachStack(function (stack) {
			var field = stack.field,
			    prevRank = 14,
			    decending;

			if (stop || field !== "tableau" && field !== "waste") { return; }

			decending = stack.eachCard(function (card) {
				if (card.rank >= prevRank || card.isFaceDown) {
					stop = true;
					return false;
				} else {
					prevRank = card.rank;
				}
			});
		});

		return !stop;
	}
}, "0.0.1", {requires: ["solitaire"]});
