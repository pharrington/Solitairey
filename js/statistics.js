/*
 * record win/lose records, streaks, etc
 */
YUI.add("statistics", function (Y) {
	var loaded,
	    localStorage = window.localStorage;
	    Solitaire = Y.Solitaire;

	Y.on("newGame", function () {
		if (loaded) { recordLose(); }

		loaded = null;
	});

	Y.on("loadGame", function () {
		loaded = Solitaire.game.name();
		saveProgress();
	});

	Y.on("endTurn", function () {
		if (!loaded) {
			loaded = Solitaire.game.name();
			saveProgress();
		}
	});

	Y.on("win", function () {
		var winDisplayDelay = 1000;
		loaded = null;

		recordWin();

		setTimeout(function () {
			Y.one("body").append(winDisplay());
		}, winDisplayDelay);
	});

	Y.on("beforeSetup", function () {
		var winDisplay = Y.one("#win_display");

		winDisplay && winDisplay.remove();
	});

	/*
	 * TODO: a templating system might make this less grody
	 */
	function winDisplay() {
		var nameMap = {
			Klondike: "Klondike",
			FlowerGarden: "Flower Garden",
			FortyThieves: "Forty Thieves",
			Freecell: "Freecell",
			GClock: "Grandfather's Clock",
			MonteCarlo: "Monte Carlo",
			Pyramid: "Pyramid",
			Scorpion: "Scorpion",
			Spider: "Spider",
			Spider1S: "Spider (1 Suit)",
			Spider2S: "Spider (2 Suit)",
			Yukon: "Yukon"},
		    
		    stats = Record(localStorage[Solitaire.game.name() + "record"]),

		    streakCount, winCount, loseCount,

		    output = "<div id='win_display'>";

		streakCount = stats.streaks().last().length;
		winCount = stats.wins().length;
		loseCount = stats.loses().length;


		output += "<p>You win! You're awesome.</p>";
		output += "<h2>" + nameMap[Solitaire.game.name()] + " stats:</h2>";
		output += "<ul>";
		output += "<li>Current win streak: <span class='streak'>" + streakCount + "</li>";
		output += "<li>Total wins: <span class='wins'>" + winCount + "</li>";
		output += "<li>Total loses: <span class='loses'>" + loseCount + "</li>";

		output += "</ul></div>";

		return output;
	}

	function record(value) {
		var key = localStorage["currentGame"] + "record",
		    record = localStorage[key] || "";

		record += new Date().getTime() + "_" + value + "|";

		localStorage[key] = record;
	}

	function recordLose() {
		record(0);

		clearProgress();
	}

	function recordWin() {
		record(1);

		clearProgress();
	}

	function clearProgress() {
		localStorage.removeItem("currentGame");
	}

	function saveProgress() {
		localStorage["currentGame"] = Solitaire.game.name();
	}

	function Record(raw) {
		function parse() {
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
			}
		};
	}

}, "0.0.1", {requires: ["solitaire", "array-extras"]});
