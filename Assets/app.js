console.log("Load remaining entries");

var yearsReady = false;
var entryCount = 0;
var navOffsets = [0];
var yearOffsets = [0];

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

const getOffsetForNav = interpolate(navOffsets, yearOffsets);
const getNavForOffset = interpolate(yearOffsets, navOffsets);

function updateYearBackground() {
	if (yearsReady) {
		const background = document.getElementById('year-background');
		const numEntries = parseInt(window.numEntries);
		background.style.height = (entryCount/numEntries*100) + '%';
	}
}

async function loadAndInsertDivsSequentially(filePaths, domDone) {
	var activeTask = null;
	var index = 1;
	var checkDom = true;

	for (const filePath of filePaths) {
		const parseTask = async (htmlText, priorTask, index) => {
			const parser = new DOMParser();
			const doc = parser.parseFromString(htmlText, 'text/html');
			const entriesDiv = doc.querySelector('div');
			const targetDiv = document.querySelector('._a706');

			if (priorTask !== null) {
				await priorTask;
			}
			
			if (checkDom) {
				await domDone;
				checkDom = false;
			}

			targetDiv.appendChild(entriesDiv);
			entryCount += entriesDiv.children.length;
			updateYearBackground();

			console.log(index, "Add complete");
		};

		const response = await fetch(filePath);
		const text = await response.text();

		activeTask = parseTask(text, activeTask, index);
		index += 1;
	}

	await activeTask;

	document.getElementById('year-back-bottom').style.display = "block";

	const yearElements = document.querySelectorAll('.year-mark');

	yearElements.forEach((mark, index) => {
		if (index > 0) {
			yearOffsets.push(mark.offsetTop);
		}
	});
	yearOffsets.push(document.body.scrollHeight);

	indicator.style.display = "flex";
	updateIndicatorPosition();
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
				document.getElementById("navigator").onmousedown = dragMouseDown;
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

		const background = document.getElementById('year-background');
		background.style.width = yearColumn.offsetWidth * 2.0 + 'px';

		yearsReady = true;
		entryCount += document.querySelector('._a706').children.length;
		updateYearBackground();
	}

	var lastMouseY = 0;
  
	function dragMouseDown(e) {
		e = e || window.event;
		e.preventDefault();
		lastMouseY = e.clientY;
		document.onmouseup = endDrag;
		document.onmousemove = elementDrag;
		mouseIsDown = true;
	}
  
	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		var deltaY = lastMouseY - e.clientY;
		lastMouseY = e.clientY;
		var newTop = parseInt(indicator.style.top, 10) - deltaY;
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
  
	function endDrag() {
		document.onmouseup = null;
		document.onmousemove = null;
		mouseIsDown = false;
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

document.addEventListener("DOMContentLoaded", setupContent);

var filePaths = [];
for (var i = 1; i <= window.numSrcFiles; i++) {
	filePaths.push('entries/entries' + i + '.html');
}
loadAndInsertDivsSequentially(filePaths, domReady());
