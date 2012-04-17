YUI.add("ads", function (Y) {

function writer(adContainer) {
	var buffer = "",
	    container = document.createElement("div");

	return function (str) {
		var last,
		    element,
		    content;

		buffer += str;
		last = str[str.length - 1];

		if (last !== "\n" && last !== ">") { return; }

		container.innerHTML = buffer;
		element = container.childNodes[0];

		if (!element) {
			return;
		}

		if (element.nodeName === "SCRIPT") {
			if (element.src !== "") {
				loadScript(element.src, adContainer);
			} else {
				content = element.childNodes[0].nodeValue;
				content = content.match(/[^<!\-\/]+/)[0];
				eval(content);
			}
		} else {
			adContainer.appendChild(element);
		}

		buffer = "";
	};
};

function loadScript(url, container, callback) {
	var script = document.createElement("script");

	script.onload = function () {
		if (typeof callback === "function") { callback(); }
	};

	script.src = url;
	container.appendChild(script);
}

function loadAd(container, callback) {
	var url = "http://ads.adbrite.com/mb/text_group.php?sid=2093964&zs=3136305f363030&ifr="+AdBrite_Iframe+"&ref="+AdBrite_Referrer;

	loadScript(url, container, callback);
}

function configLeftSkyscraper() {
	AdBrite_Title_Color = '0000FF';
	AdBrite_Text_Color = '000000';
	AdBrite_Background_Color = 'FFFFFF';
	AdBrite_Border_Color = 'CCCCCC';
	AdBrite_URL_Color = '008000';
	try {
		AdBrite_Iframe=window.top!=window.self?2:1;
		AdBrite_Referrer=document.referrer==''?document.location:document.referrer;
		AdBrite_Referrer=encodeURIComponent(AdBrite_Referrer);
	} catch (e) {
		AdBrite_Iframe='';
		AdBrite_Referrer='';
	}
}

function loadLeft() {
	var left = document.getElementById("adleft");

	if (!left) { return; }

	left.innerHTML = "";
	configLeftSkyscraper();
	loadAd(left);
	document.write = document.writeln = writer(left);
};

function loadLigit() {
	var url = "liji.html";

	document.getElementById("adleftbody").src = url;
}

Y.on("newGame", loadLigit);
Y.on("loadGame", loadLigit);

}, "1.0.0", {requires: ["solitaire"]});
