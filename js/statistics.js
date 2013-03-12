/*
 * record win/lose records, streaks, etc
 */
YUI.add("statistics", function (Y) {
	var loaded,
	    won,
	    enabled = true,
	    localStorage = window.localStorage,
	    Solitaire = Y.Solitaire,
	    Statistics = Y.namespace("Solitaire.Statistics"),
	    isAttached = false,
	    cacheNode = Solitaire.Util.cacheNode,

	    populateGamesList = (function () {
		var isPopulated = false;

		return function () {
			if (isPopulated) {
				statsGamesList().addClass("hidden");
				return;
			}

			var namesArray = [],
			    listNode = new Y.Node(document.createDocumentFragment()),
			    p, v;

			for (p in nameMap) {
				if (!nameMap.hasOwnProperty(p)) { continue; }

				namesArray.push([p, nameMap[p]]);
			}

			namesArray.sort(function (a, b) { return a[1].localeCompare(b[1]); });
			Y.Array.each(namesArray, function (game) {
				var node = Y.Node.create("<li class=stats-gameli>" + game[1] + "</li>");

				node.setData("game", game[0]);
				listNode.appendChild(node);
			});

			statsGamesList().appendChild(listNode);
			isPopulated = true;
		}
	    })(),

	    winDisplayNode = cacheNode("#win-display"),
	    winDisplayGame = cacheNode("#win-display-game"),
	    winDisplayStreak = cacheNode("#win-display-streak"),
	    winDisplayWins = cacheNode("#win-display-wins"),
	    winDisplayLoses = cacheNode("#win-display-loses"),

	    statsNode = cacheNode("#stats-popup"),
	    statsTitle = cacheNode(".stats-title"),
	    statsGame = cacheNode("#stats-game"),
	    statsGamesList = cacheNode("#stats-popup .popup-title-content"),
	    statsWinPercentage = cacheNode("#stats-winpercentage"),
	    statsWins = cacheNode("#stats-wins"),
	    statsLoses = cacheNode("#stats-loses"),
	    statsCurrentStreak = cacheNode("#stats-currentstreak"),
	    statsBestStreak = cacheNode("#stats-beststreak"),
	    statsGamesPlayed = cacheNode("#stats-gamesplayed"),

	    nameMap = {
			Accordion: "Accordion",
			AcesUp: "Aces Up",
			Agnes: "Agnes",
			Alternations: "Alternations",
			BakersDozen: "Baker's Dozen",
			BakersGame: "Baker's Game",
			Baroness: "Baroness",
			Calculation: "Calculation",
			Canfield: "Canfield",
			DoubleKlondike: "Double Klondike",
			Eightoff: "Eight Off",
			Klondike: "Klondike",
			Klondike1T: "Klondike (Vegas style)",
			TheFan: "The Fan",
			FlowerGarden: "Flower Garden",
			FortyThieves: "Forty Thieves",
			Freecell: "Freecell",
                        Golf: "Golf",
			GClock: "Grandfather's Clock",
			LaBelleLucie: "La Belle Lucie",
			MonteCarlo: "Monte Carlo",
			Pyramid: "Pyramid",
			RussianSolitaire: "Russian Solitaire",
			Scorpion: "Scorpion",
			SimpleSimon: "Simple Simon",
			Spider: "Spider",
			Spider1S: "Spider (1 Suit)",
			Spider2S: "Spider (2 Suit)",
                        Spiderette: "Spiderette",
                        WillOTheWisp: "Will O' The Wisp",
			TriTowers: "Tri Towers",
			Yukon: "Yukon"
	    };

	if (!localStorage) { return; }

	Y.on("newGame", function () {
		if (loaded) { recordLose(); }

		won = false;
		loaded = null;
	});

	Y.on("loadGame", function () {
		loaded = Solitaire.game.name();
		won = false;
	});

	Y.on("endTurn", function () {
		if (!loaded) {
			loaded = Solitaire.game.name();
		}
	});

	Y.on("win", function () {
		if (won || !enabled) { return; }

		var winDisplayDelay = 1000;
		loaded = null;
		won = true;

		recordWin();

		explodeFoundations();
	});

	Y.on("beforeSetup", function () {
		winDisplayNode().addClass("hidden");
		Statistics.enable();
	});

	function attachEvents() {
		if (isAttached) { return; }

		var Application = Solitaire.Application;

		Y.on("click", function () {
			Application.newGame();
		}, Y.one("#win-display .new_deal"));

		Y.on("click", function () {
			Application.GameChooser.show(true);
		}, Y.one("#win-display .choose_game"));

		Y.on("click", function () {
			statsGamesList().toggleClass("hidden");
		}, statsTitle());

		Y.delegate("click", function (e) {
			Statistics.statsDisplay(e.target.getData("game"));
		}, statsGamesList(), ".stats-gameli");

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
			Statistics.winDisplay();
		}, delay + 200);
	}

	function record(value) {
		var key = getRecordName(Solitaire.game.name()),
		    record = localStorage[key] || "";

		record += new Date().getTime() + "_" + value + "|";

		localStorage[key] = record;
	}

	function recordLose() {
		record(0);
	}

	function recordWin() {
		record(1);
	}

	function getRecordName(game) {
		return game + "record";
	}

	function getCurrentGameRecord() {
		return getRecord(Solitaire.game.name());
	}

	function getRecord(game) {
		var raw = localStorage[getRecordName(game)];

		function parse() {
			if (!raw || raw === "") {
				return [];
			}

			var entries = raw.split("|");

			entries.splice(entries.length - 1);

			return Y.Array.map(entries, function (entry) {
				entry = entry.split("_");

				return {date: new Date(entry[0]), won: !!parseInt(entry[1], 10)};
			});
		}

		function won(entry) {
			return entry.won;
		}

		var record = parse();

		return {
			streaks: function () {
				var streaks = [],
				    streak = null;

				Y.Array.each(record, function (entry) {
					if (!entry.won) {
						streak && streaks.push(streak);
						streak = null;
					} else {
						if (!streak) { streak = []; }
						streak.push(entry);
					}
				});

				streak && streaks.push(streak);

				return streaks;
			},

			wins: function () {
				return Y.Array.filter(record, won);
			},

			loses: function () {
				return Y.Array.reject(record, won);
			},

			all: function () { return record; }
		};
	}

	Y.mix(Statistics, {
		winDisplay: function () {
			var gameName = Solitaire.game.name(),
			    stats = getCurrentGameRecord();

			attachEvents();

			winDisplayGame().setContent(nameMap[gameName]);
			winDisplayStreak().setContent(stats.streaks().last().length);
			winDisplayWins().setContent(stats.wins().length);
			winDisplayLoses().setContent(stats.loses().length);
			winDisplayNode().removeClass("hidden");
		},

		statsDisplay: function (name) {
			var gameName = typeof name === "string" ? name : Solitaire.game.name(),
			    stats = getRecord(gameName),
			    streaks = stats.streaks(),
			    all = stats.all(),
			    wins = stats.wins(),
			    winpercent = all.length ? wins.length / all.length * 100: 0,
			    currentStreak,
			    bestStreak;

			if (!streaks.length) {
				bestStreak = currentStreak = 0;
			} else {
				currentStreak = streaks.last().length;
				bestStreak = streaks.sort(function (a, b) {
					return a.length - b.length;
				}).last().length;
			}

			attachEvents();

			statsGamesPlayed().setContent(all.length);
			statsGame().setContent(nameMap[gameName]);
			statsWinPercentage().setContent(Math.floor(winpercent) + "%");
			statsWins().setContent(wins.length);
			statsLoses().setContent(stats.loses().length);
			statsCurrentStreak().setContent(currentStreak);
			statsBestStreak().setContent(bestStreak);

			populateGamesList();

			Y.fire("popup", "Stats");
		},

		enable: function () {
			enabled = true;
		},

		disable: function () {
			enabled = false;
		}
	});

}, "0.0.1", {requires: ["solitaire", "util", "array-extras", "breakout"]});
