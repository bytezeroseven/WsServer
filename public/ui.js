

function isHidden(ele) {
	return ele.getBoundingClientRect().height == 0;
}

function showEle(ele) {
	ele.style.display = "block";
}

function hideEle(ele) {
	ele.style.display = "none";
}

function toggleEle(ele) {
	if (isHidden(ele)) showEle(ele);
	else hideEle(ele);
}