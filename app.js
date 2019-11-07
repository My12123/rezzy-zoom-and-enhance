window.onresize = doLayout;
var isLoading = false;

onload = function() {
	var webview = document.querySelector('webview');
	doLayout();

	window._webview = webview;
	console.log("To debug the webview, use:\n  _webview.openDevTools();");

	document.querySelector('#back').onclick = function() {
		webview.goBack();
	};

	document.querySelector('#forward').onclick = function() {
		webview.goForward();
	};

	document.querySelector('#home').onclick = function() {
		navigateTo('https://duckduckgo.com/?q=what+r+some+good+comics');
	};

	document.querySelector('#reload').onclick = function() {
		if (isLoading) {
			webview.stop();
		} else {
			webview.reload();
		}
	};
	document.querySelector('#reload').addEventListener(
		'webkitAnimationIteration',
		function() {
			if (!isLoading) {
				document.body.classList.remove('loading');
			}
		});

	document.querySelector('#location-form').onsubmit = function(e) {
		e.preventDefault();
		navigateTo(document.querySelector('#location').value);
	};

	webview.addEventListener('close', handleExit);
	webview.addEventListener('did-start-loading', handleLoadStart);
	webview.addEventListener('did-stop-loading', handleLoadStop);
	webview.addEventListener('did-fail-load', handleLoadAbort);
	webview.addEventListener('did-get-redirect-request', handleLoadRedirect);
	webview.addEventListener('did-finish-load', handleLoadCommit);

	var findMatchCase = false;
	function findInPage(text, options) {
		if (text.length) {
			webview.findInPage(text, options);
		} else {
			webview.stopFindInPage('clearSelection');
		}
	}

	document.querySelector('#zoom').onclick = function() {
		if(document.querySelector('#zoom-box').style.display == '-webkit-flex') {
			closeZoomBox();
		} else {
			openZoomBox();
		}
	};

	document.querySelector('#zoom-form').onsubmit = function(e) {
		e.preventDefault();
		var zoomText = document.forms['zoom-form']['zoom-text'];
		var zoomFactor = Number(zoomText.value);
		if (zoomFactor > 5) {
			zoomText.value = "5";
			zoomFactor = 5;
		} else if (zoomFactor < 0.25) {
			zoomText.value = "0.25";
			zoomFactor = 0.25;
		}
		webview.setZoomFactor(zoomFactor);
	}

	document.querySelector('#zoom-in').onclick = function(e) {
		e.preventDefault();
		increaseZoom();
	}

	document.querySelector('#zoom-out').onclick = function(e) {
		e.preventDefault();
		decreaseZoom();
	}

	document.querySelector('#find').onclick = function() {
		if(document.querySelector('#find-box').style.display == 'block') {
			document.querySelector('webview').stopFindInPage('keepSelection');
			closeFindBox();
		} else {
			openFindBox();
		}
	};

	document.querySelector('#find-text').oninput = function(e) {
		findInPage(document.forms['find-form']['find-text'].value,
			{matchCase: findMatchCase});
	}

	document.querySelector('#find-text').onkeydown = function(e) {
		if (event.ctrlKey && event.keyCode == 13) {
			e.preventDefault();
			webview.stopFindInPage('activate');
			closeFindBox();
		}
	}

	document.querySelector('#match-case').onclick = function(e) {
		e.preventDefault();
		findMatchCase = !findMatchCase;
		var matchCase = document.querySelector('#match-case');
		if (findMatchCase) {
			matchCase.style.color = "blue";
			matchCase.style['font-weight'] = "bold";
		} else {
			matchCase.style.color = "black";
			matchCase.style['font-weight'] = "";
		}
		findInPage(document.forms['find-form']['find-text'].value,
			{matchCase: findMatchCase});
	}

	document.querySelector('#find-backward').onclick = function(e) {
		e.preventDefault();
		findInPage(document.forms['find-form']['find-text'].value,
			{backward: true, matchCase: findMatchCase});
	}

	document.querySelector('#find-form').onsubmit = function(e) {
		e.preventDefault();
		findInPage(document.forms['find-form']['find-text'].value,
			{matchCase: findMatchCase});
	}

	webview.addEventListener('findupdate', handleFindUpdate);
	window.addEventListener('keydown', handleKeyDown);
};

function navigateTo(url) {
	resetExitedState();
	document.querySelector('webview').src = url;
}

function doLayout() {
	var webview = document.querySelector('webview');
	var controls = document.querySelector('#controls');
	var controlsHeight = controls.offsetHeight;
	var windowWidth = document.documentElement.clientWidth;
	var windowHeight = document.documentElement.clientHeight;
	var webviewWidth = windowWidth;
	var webviewHeight = windowHeight - controlsHeight;

	webview.style.width = webviewWidth + 'px';
	webview.style.height = webviewHeight + 'px';

	var sadWebview = document.querySelector('#sad-webview');
	sadWebview.style.width = webviewWidth + 'px';
	sadWebview.style.height = webviewHeight * 2/3 + 'px';
	sadWebview.style.paddingTop = webviewHeight/3 + 'px';
}

function handleExit(event) {
	console.log(event.type);
	document.body.classList.add('exited');
	if (event.type == 'abnormal') {
		document.body.classList.add('crashed');
	} else if (event.type == 'killed') {
		document.body.classList.add('killed');
	}
}

function resetExitedState() {
	document.body.classList.remove('exited');
	document.body.classList.remove('crashed');
	document.body.classList.remove('killed');
}

function handleFindUpdate(event) {
	var findResults = document.querySelector('#find-results');
	if (event.searchText == "") {
		findResults.innerText = "";
	} else {
		findResults.innerText =
			event.activeMatchOrdinal + " of " + event.numberOfMatches;
	}

	// Ensure that the find box does not obscure the active match.
	if (event.finalUpdate && !event.canceled) {
		var findBox = document.querySelector('#find-box');
		findBox.style.left = "";
		findBox.style.opacity = "";
		var findBoxRect = findBox.getBoundingClientRect();
		if (findBoxObscuresActiveMatch(findBoxRect, event.selectionRect)) {
			// Move the find box out of the way if there is room on the screen, or
			// make it semi-transparent otherwise.
			var potentialLeft = event.selectionRect.left - findBoxRect.width - 10;
			if (potentialLeft >= 5) {
				findBox.style.left = potentialLeft + "px";
			} else {
				findBox.style.opacity = "0.5";
			}
		}
	}
}

function findBoxObscuresActiveMatch(findBoxRect, matchRect) {
	return (
		findBoxRect.left < matchRect.left + matchRect.width &&
		findBoxRect.right > matchRect.left &&
		findBoxRect.top < matchRect.top + matchRect.height &&
		findBoxRect.bottom > matchRect.top
	);
}

function handleKeyDown(event) {
	if (event.ctrlKey) {
		switch (event.keyCode) {
			// Ctrl+F.
			case 70:
				event.preventDefault();
				openFindBox();
				break;

			// Ctrl++.
			case 107:
			case 187:
				event.preventDefault();
				increaseZoom();
				break;

			// Ctrl+-.
			case 109:
			case 189:
				event.preventDefault();
				decreaseZoom();
		}
	}
}

function handleLoadCommit() {
	resetExitedState();
	var webview = document.querySelector('webview');
	document.querySelector('#location').value = webview.getURL();
	document.querySelector('#back').disabled = !webview.canGoBack();
	document.querySelector('#forward').disabled = !webview.canGoForward();
	closeBoxes();
}

function handleLoadStart(event) {
	document.body.classList.add('loading');
	isLoading = true;

	resetExitedState();
	if (!event.isTopLevel) {
		return;
	}

	document.querySelector('#location').value = event.url;
}

function handleLoadStop(event) {
	// We don't remove the loading class immediately, instead we let the animation
	// finish, so that the spinner doesn't jerkily reset back to the 0 position.
	isLoading = false;
}

function handleLoadAbort(event) {
	console.log('LoadAbort');
	console.log('  url: ' + event.url);
	console.log('  isTopLevel: ' + event.isTopLevel);
	console.log('  type: ' + event.type);
}

function handleLoadRedirect(event) {
	resetExitedState();
	document.querySelector('#location').value = event.newUrl;
}

function getNextPresetZoomFactor(currentZoomFactor, zoomingIn) {
	// console.log("getNextPresetZoomFactor", currentZoomFactor, zoomingIn);
	const presetZoomFactors = [
		0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5
	];
	let nearestZoomFactor = Infinity;
	let nearestDist = Infinity;
	for (const presetZoomFactor of presetZoomFactors) {
		const dist = Math.abs(presetZoomFactor - currentZoomFactor);
		if (dist < nearestDist) {
			nearestDist = dist;
			nearestZoomFactor = presetZoomFactor;
		}
	}
	const fromIndex = presetZoomFactors.indexOf(nearestZoomFactor);
	const toIndex = Math.min(presetZoomFactors.length - 1, Math.max(0, fromIndex + (zoomingIn ? +1 : -1)));
	// const oldZoomFactor = presetZoomFactors[fromIndex];
	const newZoomFactor = presetZoomFactors[toIndex];
	// console.log({fromIndex, toIndex, oldZoomFactor, newZoomFactor});
	return newZoomFactor;
}

function increaseZoom() {
	var webview = document.querySelector('webview');
	const zoomFactor = webview.getZoomFactor();
	var nextHigherZoom = getNextPresetZoomFactor(zoomFactor, true);
	webview.setZoomFactor(nextHigherZoom);
	document.forms['zoom-form']['zoom-text'].value = nextHigherZoom.toString();
}

function decreaseZoom() {
	var webview = document.querySelector('webview');
	const zoomFactor = webview.getZoomFactor();
	var nextLowerZoom = getNextPresetZoomFactor(zoomFactor, false);
	webview.setZoomFactor(nextLowerZoom);
	document.forms['zoom-form']['zoom-text'].value = nextLowerZoom.toString();
}

function openZoomBox() {
	const zoomFactor = document.querySelector('webview').getZoomFactor();
	var zoomText = document.forms['zoom-form']['zoom-text'];
	zoomText.value = Number(zoomFactor.toFixed(6)).toString();
	document.querySelector('#zoom-box').style.display = '-webkit-flex';
	zoomText.select();
}

function closeZoomBox() {
	document.querySelector('#zoom-box').style.display = 'none';
}

function openFindBox() {
	document.querySelector('#find-box').style.display = 'block';
	document.forms['find-form']['find-text'].select();
}

function closeFindBox() {
	var findBox = document.querySelector('#find-box');
	findBox.style.display = 'none';
	findBox.style.left = "";
	findBox.style.opacity = "";
	document.querySelector('#find-results').innerText= "";
}

function closeBoxes() {
	closeZoomBox();
	closeFindBox();
}