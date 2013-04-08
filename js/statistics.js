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
	    selectedGame,

	    populateGamesList = (function () {
		var isPopulated = false;

		return function () {
			if (isPopulated) {
				statsGamesList().addClass("hidden");
				return;
			}

			var namesArray = [],
				nameMap = Solitaire.Application.nameMap,
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

	    statsNode = cacheNode("#stats-popup"),
	    statsTitle = cacheNode(".stats-title"),
	    statsGame = cacheNode("#stats-game"),
	    statsGamesList = cacheNode("#stats-popup .popup-title-content"),
	    statsWinPercentage = cacheNode("#stats-winpercentage"),
	    statsWins = cacheNode("#stats-wins"),
	    statsLoses = cacheNode("#stats-loses"),
	    statsCurrentStreak = cacheNode("#stats-currentstreak"),
	    statsBestStreak = cacheNode("#stats-beststreak"),
	    statsGamesPlayed = cacheNode("#stats-gamesplayed");

	if (!localStorage) { return; }

	Y.on("newGame", function () {
		if (loaded) { recordLose(loaded); }

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

		recordWin(loaded);

		loaded = null;
		won = true;
	});

	function attachEvents() {
		if (isAttached) { return; }

		var Application = Solitaire.Application;

		Y.on("click", function () {
			statsGamesList().toggleClass("hidden");
		}, statsTitle());

		Y.on("click", function () {
			if (!selectedGame) {
				selectedGame = Solitaire.game.name();
			}

			Application.Confirmation.show("Are you sure you want to reset all " + Solitaire.Application.nameMap[selectedGame] + " stats?", function () {
				resetRecord(selectedGame);
				Statistics.statsDisplay(selectedGame);
			});
		}, Y.one("#stats-reset"));

		Y.delegate("click", function (e) {
			selectedGame = e.target.getData("game");
			Statistics.statsDisplay(selectedGame);
		}, statsGamesList(), ".stats-gameli");

		isAttached = true;
	}

	function record(value, game) {
		var key, record;

		game = game || Solitaire.game.name();
		key = getRecordName(game);
		record = localStorage[key] || "";

		record += new Date().getTime() + "_" + value + "|";

		localStorage[key] = record;
	}

	function recordLose(game) {
		record(0, game);
	}

	function recordWin(game) {
		record(1, game);
	}

	function resetRecord(game) {
		localStorage[getRecordName(game)] = "";
	}

	function getRecordName(game) {
		return game + "record";
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
		statsDisplay: function (name) {
			var gameName = typeof name === "string" ? name : Solitaire.game.name(),
			    stats = getRecord(gameName),
			    streaks = stats.streaks(),
			    all = stats.all(),
			    wins = stats.wins(),
			    winpercent = all.length ? wins.length / all.length * 100: 0,
			    lastRecord,
			    currentStreak = 0,
			    bestStreak = 0;

			if (!streaks.length) {
				bestStreak = currentStreak = 0;
			} else {
				lastRecord = stats.all().last();
				if (lastRecord && lastRecord.won) {
					currentStreak = streaks.last().length;
				}

				bestStreak = streaks.sort(function (a, b) {
					return a.length - b.length;
				}).last().length;
			}

			attachEvents();

			statsGamesPlayed().set("text", all.length);
			statsGame().set("text", Solitaire.Application.nameMap[gameName]);
			statsWinPercentage().set("text", Math.floor(winpercent) + "%");
			statsWins().set("text", wins.length);
			statsLoses().set("text", stats.loses().length);
			statsCurrentStreak().set("text", currentStreak);
			statsBestStreak().set("text", bestStreak);

			populateGamesList();

			Y.fire("popup", "Stats");
		},

		getRecord: function (name) {
			return getRecord(name);
		},

		enable: function () {
			enabled = true;
		},

		disable: function () {
			enabled = false;
		}
	});

}, "0.0.1", {requires: ["solitaire", "util", "array-extras", "breakout"]});
