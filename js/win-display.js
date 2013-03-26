/*
 * Reward the player when they win
 */
YUI.add("win-display", function (Y) {
	var loaded,
	    won,
	    enabled = true,
	    Solitaire = Y.Solitaire,
	    Statistics = Solitaire.Statistics,
	    WinDisplay = Y.namespace("Solitaire.WinDisplay"),
	    isAttached = false,
	    cacheNode = Solitaire.Util.cacheNode,

	    winDisplayNode = cacheNode("#win-display"),
	    winDisplayGame = cacheNode("#win-display-game"),
	    winDisplayStreak = cacheNode("#win-display-streak"),
	    winDisplayWins = cacheNode("#win-display-wins"),
	    winDisplayLoses = cacheNode("#win-display-loses");

	Y.on("newGame", function () {
		won = false;
	});

	Y.on("loadGame", function () {
		won = false;
	});

	Y.on("win", function () {
		if (won || !enabled) { return; }

		won = true;

		explodeFoundations();
	});

	Y.on("beforeSetup", function () {
		winDisplayNode().addClass("hidden");
		WinDisplay.enable();
	});

	function attachEvents() {
		if (isAttached) { return; }

		var Application = Solitaire.Application,
		    activeGame = Solitaire.game.name();

		Y.on("click", function () {
			Application.newGame();
		}, Y.one("#win-display .new_deal"));

		Y.on("click", function () {
			Application.GameChooser.show(true);
		}, Y.one("#win-display .choose_game"));

		isAttached = true;
	}

	function explodeFoundations() {
		var delay = 500,
		    duration = 900,
		    interval = 900;

		Game.eachStack(function (stack) {
			stack.eachCard(function (card) {
				if (!card) { return; }

				var node = card.node;
				if (card !== stack.last()) {
					setTimeout(function (node) {
						node.addClass("hidden");
					}.partial(node), delay);

					return;
				}

				node.plug(Y.Breakout, {columns: 5});
				(function (node) {
					setTimeout(function () {
						node.breakout.explode({random: 0.65, duration: duration});
					}, delay);
				})(node);

				delay += interval;
			});
		}, "foundation");

		setTimeout(function () {
			WinDisplay.winDisplay();
		}, delay + 200);
	}

	Y.mix(WinDisplay, {
		winDisplay: function () {
			var gameName = Solitaire.game.name(),
			    stats = Statistics.getRecord(gameName);

			attachEvents();

			winDisplayGame().set("text", Solitaire.Application.nameMap[gameName]);
			winDisplayStreak().set("text", stats.streaks().last().length);
			winDisplayWins().set("text", stats.wins().length);
			winDisplayLoses().set("text", stats.loses().length);
			winDisplayNode().removeClass("hidden");
		},

		enable: function () {
			enabled = true;
		},

		disable: function () {
			enabled = false;
		}
	});
}, "0.0.1", {requires: ["solitaire", "statistics", "util", "array-extras", "breakout"]});
