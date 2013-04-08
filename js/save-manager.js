YUI.add("save-manager", function (Y) {

var Solitaire = Y.Solitaire;
	SaveManager = Y.namespace("Solitaire.SaveManager");
    
Y.mix(SaveManager, {
	nameKey: "current-game",
	serializedKey: "saved-game",

	save: function (name, data, serializedKey) {
		data = data || "";
		name = name || "";
		localStorage[this.nameKey] = name;
		localStorage[serializedKey || this.serializedKey] = data;
	},

	clear: function (serializedKey)  {
		localStorage[this.serializedKey || serializedKey] = "";
	},

	getSavedGame: function (serializedKey) {
		var name = localStorage[this.nameKey],
			serialized = localStorage[serializedKey || this.serializedKey],
			removeCookies = false;

		if (!name) {
			name = Y.Cookie.get("options");
			removeCookies = true;
		}

		if (!serialized) {
			serialized = Y.Cookie.get("saved-game") || Y.Cookie.get("initial-game");
			removeCookies = true;
		}

		if (removeCookies) {
			this.save(name, serialized);
			this.removeCookies();
		}

		return {name: name || "", serialized: serialized || ""};
	},

	removeCookies: function () {
		Y.Cookie.remove("options");
		Y.Cookie.remove("saved-game");
		Y.Cookie.remove("initial-game");
	}
});
}, "0.0.1", {requires: ["solitaire"]});
