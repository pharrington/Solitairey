YUI.add("solitaire-background-fix", function (Y) {
	var _body;

	Y.on("load", resize);
	Y.on("resize", resize);

	function resize() {
		var width = body().get("winWidth"),
		    height = body().get("winHeight"),
		    style = document.body.style;

		/*
		 * with background-size 100% on the body element,
		 * Opera sizes the background to either the body's calculated size or the viewport size if the body's larger than the viewport.
		 * is there a way to detect this behaviour without sniffing the UA string?
		 */

		if (Y.UA.opera) {
			body().setStyles({width: width, height: height});
		}

		/*
		 * if we don't support the background-size property, create an image and scale it to the viewport size
		 */

		if (style.backgroundSize === undefined && style.MozBackgroundSize === undefined) {
			backgroundImage().setStyles({width: width, height: height});
		}
	}

	function backgroundImage() {
		var image,
		    domImage;

		if (!Y.one("#background-image")) {
			domImage = document.createElement("img");
			domImage.id = "background-image";
			domImage.src = Y.one("body").getStyle("backgroundImage").match(/"(.*)"/)[1];
			image = new Y.Node(domImage);
			body().append(image);
		}

		return image;
	}

	function body() {
		if (!_body) {
			_body = new Y.Node(document.body);
		}

		return _body;
	}
}, "0.0.1", {requires: ["solitaire"]});
