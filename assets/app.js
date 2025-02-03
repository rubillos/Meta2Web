var yearsReady = false;
var entryCount = 0;
var navOffsets = [0];
var yearOffsets = [0];

const showMemories = new URLSearchParams(window.location.search).has('memories');
const currentDate = new Date();
const monthDayID = `d${(currentDate.getMonth() + 1) * 100 + currentDate.getDate()}`;

function interpolate(inputValues, outputValues) {
	return function(value) {
		if (value <= inputValues[0]) return outputValues[0];
		if (value >= inputValues[inputValues.length - 1]) return outputValues[outputValues.length - 1];

		for (let i = 0; i < inputValues.length - 1; i++) {
			if (value >= inputValues[i] && value <= inputValues[i + 1]) {
				const t = (value - inputValues[i]) / (inputValues[i + 1] - inputValues[i]);
				return outputValues[i] + t * (outputValues[i + 1] - outputValues[i]);
			}
		}
	};
}

function isYearMark(element) {
	return element.classList.contains('year-mark');
}

function visibleElements(classes = '.year-mark, ._a6-g') {
	const elements = document.querySelectorAll(classes);
	var visList = [];
	for (let i = 0; i < elements.length; i++) {
		if (elements[i].style.display != "none") {
			visList.push(elements[i]);
		}
	}
	return visList;
}

function hideShowMemories(containerDiv) {
	if (showMemories) {
		for (const element of containerDiv.children) {
			const classes = element.classList;
			if (!classes.contains('year-mark') && !classes.contains(monthDayID)) {
				element.style.display = "none";
			}
		}

		const visList = visibleElements();
		for (let i = visList.length - 3; i >= 0; i--) {
			if (isYearMark(visList[i]) && isYearMark(visList[i + 1]) && !isYearMark(visList[i + 2])) {
				var index = (i == 0) ? 1 : i;
				visList[index].style.display = "none";
				visList.splice(index, 1);
			}
		}
	}
}

function initialMemoriesSetup() {
	if (showMemories) {
		const yearElements = visibleElements('.year-mark');
		if (yearElements.length > 0) {
			const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
			const month = monthNames[currentDate.getMonth()];
			const day = currentDate.getDate();
			yearElements[0].textContent = `Memories - ${month} ${day}`;
		}
	}
}

function finalMemoriesCleanup() {
	if (showMemories) {
		const visList = visibleElements();
		for (let i = visList.length - 2; i >= 0; i--) {
			if (isYearMark(visList[i]) && isYearMark(visList[i + 1])) {
				var index = (i == 0) ? 1 : i;
				visList[index].style.display = "none";
				visList.splice(index, 1);
			}
		}
	}
}

const getOffsetForNav = interpolate(navOffsets, yearOffsets);
const getNavForOffset = interpolate(yearOffsets, navOffsets);

function updateYearBackground(durationMS) {
	if (yearsReady) {
		const background = document.getElementById('year-background');
		const numEntries = parseInt(window.numEntries);
		background.style.transition = `height ${(durationMS / 1000.0)}s linear`;
		background.style.height = (entryCount/numEntries*100) + '%';
	}
}

async function loadAndInsertDivsSequentially(filePaths, domDone) {
	var activeTask = null;
	var index = 1;
	var checkDom = true;
	var startTime = Date.now();

	for (const filePath of filePaths) {
		const parseTask = async (htmlText, priorTask, index) => {
			const parser = new DOMParser();
			const doc = parser.parseFromString(htmlText, 'text/html');
			var entriesDiv = doc.querySelector('div');

			if (checkDom) {
				await domDone;
				checkDom = false;
			}

			const targetDiv = document.querySelector('._a706');

			if (index == 1 && showMemories) {
				initialMemoriesSetup();
				hideShowMemories(targetDiv);
			}

			if (priorTask !== null) {
				await priorTask;
			}
			
			hideShowMemories(entriesDiv);
			targetDiv.appendChild(entriesDiv);
			entryCount += entriesDiv.children.length;
			var curTime = Date.now();
			updateYearBackground((index<filePaths.length) ? (curTime - startTime) * 0.8 : 0.2);
			startTime = curTime;
		};

		const response = await fetch(filePath);
		const text = await response.text();

		activeTask = parseTask(text, activeTask, index);
		index += 1;
	}

	await activeTask;

	yearBack = document.getElementById('year-background');
	yearBackTop = document.getElementById('year-back-top');
	yearBackBottom = document.getElementById('year-back-bottom');
	
	yearBack.style.transition = 'background-image 0.3s';
	yearBackTop.style.transition = 'background-image 0.3s';
	yearBackBottom.style.transition = 'display 0.3s';

	yearBack.style.setProperty('--bar-display', 'none');
	yearBack.classList.remove('back-blue');
	yearBack.classList.add('back-gray');
	yearBackTop.classList.remove('back-blue');
	yearBackTop.classList.add('back-gray');
	yearBackBottom.style.display = "block";

	finalMemoriesCleanup();

	const yearElements = document.querySelectorAll('.year-mark');
	yearElements.forEach((mark, index) => {
		if (index > 0) {
			yearOffsets.push(mark.offsetTop);
		}
	});
	yearOffsets.push(document.body.scrollHeight);

	indicator.style.display = "flex";
	updateIndicatorPosition();
	setupEntryEvents();
}

function setupEntryEvents() {
	document.querySelectorAll('._a6-g').forEach(element => {
		element.onmouseenter = showEIndex;
	});
	document.querySelectorAll('img._a6_o').forEach(element => {
		element.onclick = showImage;
	});

	const imgUrls = [];
	document.querySelectorAll('img:not([src*="static"])').forEach(img => {
		imgUrls.push(img.getAttribute('src'));
	});
	sessionStorage.setItem('img_urls', imgUrls);;

	document.addEventListener('keydown', function(event) {
		if (event.key === 'Enter' || event.key === 'ArrowRight') {
			const images = document.querySelectorAll('img._a6_o');
			const middleY = window.innerHeight / 2;
			let closestImage = null;
			let closestDistance = Infinity;

			images.forEach(img => {
				const rect = img.getBoundingClientRect();
				const imgMiddleY = rect.top + rect.height / 2;
				const distance = Math.abs(imgMiddleY - middleY);

				if (distance < closestDistance) {
					closestDistance = distance;
					closestImage = img;
				}
			});

			if (closestImage) {
				showImage({ currentTarget: closestImage });
			}
		}
	});
}

function showEIndex(event) {
	if (event.altKey) {
		const element = event.currentTarget;
		const eindex = element.getAttribute('eix');
		const tooltip = document.createElement('div');
		tooltip.className = 'tooltip';
		tooltip.textContent = eindex;
		element.appendChild(tooltip);

		element.onmouseleave = () => {
			element.removeChild(tooltip);
			element.onmouseleave = null;
		};
	}
}

function showImage(event) {
	const element = event.currentTarget;
	const src = element.getAttribute('src');
	window.open(`assets/img-load.html?src=${encodeURIComponent(src)}`, '_blank');
}

var mouseIsDown = false;

function domReady() {
	return new Promise(resolve => {
		if (document.readyState === "complete") {
			resolve();
		} else {
			document.addEventListener("DOMContentLoaded", () => resolve());
		}
	});
}

function supportsTouchEvents() {
	return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}
  
function setupContent() {
	fetch('assets/extra.html')
		.then(response => response.text())
		.then(data => {
			const parser = new DOMParser();
			const doc = parser.parseFromString(data, 'text/html');
			const content = doc.getElementById('content');
			if (content) {
				const fragment = document.createDocumentFragment();
				while (content.lastChild) {
					fragment.insertBefore(content.lastChild, fragment.firstChild);
				}
				document.body.insertBefore(fragment, document.body.firstChild);
				setupYears();
				window.addEventListener('scroll', updateIndicatorPosition);

				const nav = document.getElementById('navigator');

				if (supportsTouchEvents()) {
					nav.ontouchstart = touchStart;
					nav.ontouchmove = touchMove;
					nav.ontouchend = touchEnd;
				}
				else {
					nav.onmousedown = navMouseDown;

					document.getElementById('indicator').onmousedown = indMouseDown;
					document.onmouseup = endDrag;		
				}
			}
		})
	.catch(error => console.error('Error loading extra.html:', error));

	function setupYears() {
		const yearColumn = document.getElementById('year-column');
		const years = window.allYears.reverse();
		const yearCount = window.yearCounts.length;
	
		years.forEach((year, index) => {
			const yearDiv = document.createElement('div');
			yearDiv.className = 'year-div';

			const innerDiv = document.createElement('div');
			innerDiv.className = 'year-text';
			innerDiv.textContent = year;

			yearDiv.appendChild(innerDiv);
			yearDiv.style.setProperty('--pos', `${(index + 0.5) / yearCount}`);
			yearColumn.appendChild(yearDiv);
		});	

		for (let i = 1; i <= yearCount; i++) {
			navOffsets.push(i / yearCount);
		}

		document.getElementById('year-background').style.width = yearColumn.offsetWidth * 2.0 + 'px';
		document.querySelector('._a705').style.setProperty('padding-left', yearColumn.offsetWidth * 2.0 + 'px');

		yearsReady = true;
		entryCount += document.querySelector('._a706').children.length;
		updateYearBackground();
	}

	var lastMouseY = 0;

	function indMouseDown(e) {
		e.preventDefault();
		lastMouseY = e.clientY;
		mouseIsDown = true;
		document.body.onmousemove = elementDrag;
	}
  
	function navMouseDown(e) {
		if (!e.defaultPrevented) {
			e.preventDefault();
			lastMouseY = e.clientY;
			mouseIsDown = true;

			indicator.style.top = (lastMouseY - (indicator.offsetHeight / 2) - 10) + "px";

			var scrollPosition = getOffsetForNav((indicator.offsetTop+indicator.offsetHeight/2) / indicator.parentElement.offsetHeight);
			window.scrollTo(0, scrollPosition);

			updateIndicatorVar();

			document.body.onmousemove = elementDrag;
		}
	}
  
	function elementDrag(e) {
		e.preventDefault();
		var curY = e.clientY;
		var deltaY = curY - lastMouseY;
		lastMouseY = curY;
		var newTop = parseInt(indicator.style.top, 10) + deltaY;
		var minTop = 0 - (indicator.offsetHeight / 2);
		var maxTop = indicator.parentElement.offsetHeight - (indicator.offsetHeight / 2);

		if (newTop < minTop) {
			newTop = minTop;
		} else if (newTop > maxTop) {
			newTop = maxTop;
		}

		indicator.style.top = newTop + "px";

		var scrollPosition = getOffsetForNav((indicator.offsetTop+indicator.offsetHeight/2) / indicator.parentElement.offsetHeight);
		window.scrollTo(0, scrollPosition);

		updateIndicatorVar();
	}
  
	function endDrag(e) {
		e.preventDefault();
		document.body.onmousemove = null;
		mouseIsDown = false;
	}

	var scrollY;
	var nextScrollY;
	var scrollID = null;

	function performScrollToY(y) {
		var newTop = y - (indicator.offsetHeight / 2) - 10;
		var minTop = 0 - (indicator.offsetHeight / 2);
		var maxTop = indicator.parentElement.offsetHeight - (indicator.offsetHeight / 2);

		if (newTop >= minTop && newTop <= maxTop) {
			indicator.style.top = newTop + "px";

			var scrollPos = getOffsetForNav((indicator.offsetTop+indicator.offsetHeight/2) / indicator.parentElement.offsetHeight);
			window.scrollTo(0, scrollPos);	
			updateIndicatorVar();
			scrollY = y;
		}
	}

	function scrollTimer() {
		scrollID = null;
		if (scrollY != nextScrollY) {
			performScrollToY(nextScrollY);
		}
	}

	function startTimerForY(y) {
		performScrollToY(y);
		nextScrollY = scrollY;
		scrollID = setInterval(scrollTimer, 700);
	}
	
	function touchStart(e) {
		e.preventDefault();
		startTimerForY(e.touches[0].clientY);
		mouseIsDown = true;
	}
  
	function touchMove(e) {
		e.preventDefault();
		var newY = e.touches[0].clientY;
		if (newY != scrollY) {
			if (scrollID) {
				nextScrollY = newY;
			}
			else {
				startTimerForY(newY);
			}
		}
	}
  
	function touchEnd(e) {
		e.preventDefault();
		mouseIsDown = false;
		if (scrollID) {
			clearInterval(scrollID);
		}
	}
}

function updateIndicatorVar() {
	const yearColumn = document.getElementById('year-column');
	const position = (parseInt(indicator.style.top) + (indicator.offsetHeight / 2)) / indicator.parentElement.offsetHeight;
	yearColumn.style.setProperty('--indicator', position);
}

function updateIndicatorPosition() {
	if (!mouseIsDown) {
		var newTop = getNavForOffset(window.scrollY) * indicator.parentElement.offsetHeight - indicator.offsetHeight/2;
		indicator.style.top = newTop + "px";
		updateIndicatorVar();
	}
}

if (window.numSrcFiles !== undefined) {
	document.addEventListener("DOMContentLoaded", setupContent);

	var filePaths = [];
	for (var i = 1; i <= window.numSrcFiles; i++) {
		filePaths.push('entries/entries' + i + '.html');
	}
	loadAndInsertDivsSequentially(filePaths, domReady());
}
else {
	document.addEventListener("DOMContentLoaded", setupEntryEvents);
}
